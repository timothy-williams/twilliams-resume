import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: { SiteData: "VisitorCount" },
    UpdateExpression: "ADD Hits :incr",
    ExpressionAttributeValues: { ":incr": 1 },
    ReturnValues: "ALL_NEW",
  });

  const response = await docClient.send(command);
  console.log(response);

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "OPTIONS,GET,PUT,POST,DELETE",
  };

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(response),
  };
};
