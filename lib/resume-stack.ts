import * as cdk from "aws-cdk-lib";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as s3 from "aws-cdk-lib/aws-s3";
import { RemovalPolicy } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront_origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export class ResumeStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "twilliamsresume.com";
    const subDomain = "www";
    const siteDomain = subDomain + "." + domainName;
    const zone = route53.HostedZone.fromLookup(this, "Zone", {
      domainName: domainName,
    });
    const cloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      "cloudfront-OAI"
    );

    new cdk.CfnOutput(this, "Site", { value: "https://" + siteDomain });

    // S3 bucket
    const resumeBucket = new s3.Bucket(this, "ResumeBucket", {
      bucketName: siteDomain,
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "error.html",
    });

    // Grant access to CloudFront
    resumeBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [resumeBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    new cdk.CfnOutput(this, "Bucket", { value: resumeBucket.bucketName });

    // Import existing TLS certificate
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "ImportedCertificate",
      "arn:aws:acm:us-east-1:247158676068:certificate/a50f357d-ad00-40b4-b09d-cf86f5ee0868"
    );

    new cdk.CfnOutput(this, "Certificate", {
      value: certificate.certificateArn,
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(
      this,
      "ResumeDistribution",
      {
        certificate: certificate,
        defaultRootObject: "index.html",
        domainNames: [siteDomain],
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 403,
            responsePagePath: "/error.html",
            ttl: cdk.Duration.minutes(30),
          },
        ],
        defaultBehavior: {
          origin: new cloudfront_origins.S3Origin(resumeBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      }
    );

    new cdk.CfnOutput(this, "DistributionId", {
      value: distribution.distributionId,
    });

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, "SiteAliasRecord", {
      recordName: siteDomain,
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
      zone,
    });

    // S3 bucket deployments with static assets
    new s3deploy.BucketDeployment(this, "DeployResumeBucket", {
      sources: [s3deploy.Source.asset("./assets")],
      destinationBucket: resumeBucket,
      distribution,
      distributionPaths: ["/*"],
    });

    // Create DynamoDB table that stores visitor count
    const table = new dynamodb.TableV2(this, "ResumeTable", {
      partitionKey: {
        name: "SiteData",
        type: dynamodb.AttributeType.STRING,
      },
      billing: dynamodb.Billing.onDemand(),
    });

    // Lambda function to increment VisitorCount by 1 and return new value
    const visitorCounter = new lambda.Function(
      this,
      "ResumeIncrementVisitorCount",
      {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "visitorcounter.handler",
        code: lambda.Code.fromAsset("./lambda"),
        environment: {
          TABLE_NAME: table.tableName,
        },
      }
    );
    table.grantReadWriteData(visitorCounter);

    // Rest API with visitorCounter Lambda integration
    const api = new apigateway.LambdaRestApi(this, "ResumeVistorCounterAPI", {
      handler: visitorCounter,
    });

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: table.tableName,
      description: "DynamoDB table name for visitor count",
    });

    new cdk.CfnOutput(this, "APIGatewayURL", {
      value: api.url,
      description: "API Gateway URL for visitor counter",
    });
  }
}
