import * as cdk from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as secretsManager from "aws-sdk/clients/secretsmanager";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as apigateway from "aws-cdk-lib/aws-apigateway";



// Function to retrieve ACM certificate ARN
interface ResumeStackProps extends cdk.StackProps {
  ACMSecret: string;
}

async function retrieveCertificateArn(
  secretName: string
): Promise<string | undefined> {
  const SMClient = new secretsManager();

  try {
    const ACMSecretValue = await SMClient.getSecretValue({
      SecretId: secretName,
    }).promise();

    if (ACMSecretValue.SecretString) {
      const secretObject = JSON.parse(ACMSecretValue.SecretString);
      const certificateArn = secretObject.acmCertificateArn;

      return certificateArn;
    } else {
      return undefined;
    }
  } catch (error) {
    console.error("Error retrieving secret:", error);
    return undefined;
  }
}

export class ResumeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ResumeStackProps) {
    super(scope, id, props);

    // S3 bucket
    const resumeBucket = new s3.Bucket(this, "twilliamsresume.com", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.RETAIN,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
    });

    // S3 bucket deployments with static assets
    new s3deploy.BucketDeployment(this, "DeployResumeBucket", {
      sources: [s3deploy.Source.asset("./assets")],
      destinationBucket: resumeBucket,
    });

    // Retrieve certificate ARN
    let certificate: string | undefined;

    retrieveCertificateArn(props.ACMSecret)
      .then((certificateArn) => {
        certificate = certificateArn;
        console.log("Certificate ARN:", certificate);
      })
      .catch((error) => {
        console.error("Error retrieving certificate:", error);
      });

    // Cloudfront distribution
    const distribution = new cloudfront.CloudFrontWebDistribution(
      this,
      "ResumeDistribution",
      {
        originConfigs: [
          {
            s3OriginSource: {
              s3BucketSource: resumeBucket,
            },
            behaviors: [
              { isDefaultBehavior: true },
              {
                pathPattern: "www/*",
                defaultTtl: cdk.Duration.seconds(0),
                maxTtl: cdk.Duration.seconds(0),
                minTtl: cdk.Duration.seconds(0),
                viewerProtocolPolicy:
                  cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
              },
            ],
          },
        ],
        viewerCertificate: {
          aliases: ["twilliamsresume.com", "www.twilliamsresume.com"],
          props: {
            acmCertificateArn: certificate,
          },
        },
        errorConfigurations: [
          {
            errorCode: 403,
            responseCode: 404,
            responsePagePath: "/error.html",
            errorCachingMinTtl: 0,
          },
          {
            errorCode: 404,
            responseCode: 404,
            responsePagePath: "/error.html",
            errorCachingMinTtl: 0,
          },
        ],
      }
    );

    new cdk.CfnOutput(this, "ResumeDomainName", {
      value: distribution.distributionDomainName,
      description: "CloudFront distribution domain name",
    });

    // Create DynamoDB table that stores visitor count
    const table = new dynamodb.TableV2(this, "ResumeTable", {
      partitionKey: {
        name: "SiteStatistics",
        type: dynamodb.AttributeType.STRING,
      },
      billing: dynamodb.Billing.onDemand(),
    });

    // Lambda function to create VisitorCount table item during initialization
    const initLambda = new lambda.Function(this, "InitLambda", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "init.handler",
      code: lambda.Code.fromAsset("./lambda"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(initLambda);

    // Event rule that triggers initLambda on stack creation
    const eventRule = new events.Rule(this, "InitEventRule", {
      eventPattern: {
        source: ["aws.cloudformation"],
        detailType: ["AWS API Call via CloudWatch"],
        detail: {
          eventSource: ["cloudformation.amazonaws.com"],
          eventName: ["CreateStack"],
        },
        resources: [
          `arn:aws:cloudformation:${this.region}:${this.account}:${this.stackName}/*`,
        ],
      },
    });
    eventRule.addTarget(new targets.LambdaFunction(initLambda));

    // Lambda function to increment VisitorCount by 1
    const incrementLambdaFunc = new lambda.Function(
      this,
      "ResumeIncrementVisitorCount",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "increment.handler",
        code: lambda.Code.fromAsset("./lambda"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadWriteData(incrementLambdaFunc);

    // Lambda function to retrieve VisitorCount after increment has occurred
    const retrieveLambdaFunc = new lambda.Function(
      this,
      "ResumeRetrieveVisitorCount",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "retrieve.handler",
        code: lambda.Code.fromAsset("./lambda"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadData(retrieveLambdaFunc);

    // API Gateway
    const api = new apigateway.RestApi(this, "ResumeVistorCounterAPI");

    // Connect API to Lambda increment function
    const incrementIntegration = new apigateway.LambdaIntegration(
      incrementLambdaFunc
    );
    const incrementResource = api.root.addResource("increment");
    incrementResource.addMethod("POST", incrementIntegration);

    // Connect API to Lambda retrieve function
    const retrieveIntegration = new apigateway.LambdaIntegration(
      retrieveLambdaFunc
    );
    const retrieveResource = api.root.addResource("retrieve");
    retrieveResource.addMethod("GET", retrieveIntegration);

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: table.tableName,
      description: "DynamoDB table name for visitor count",
    });

    new cdk.CfnOutput(this, "APIGatewayURL", {
      value: api.url,
      description:
        "API Gateway URL for accessing increment and retrieve endpoints",
    });
  }
}
