import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function handler(event, context) {
  const command = new GetCommand({
    TableName: "ResumeTable",
    Key: { VisitorCount: 1 },
    ExpressionAttributeValues: {":incr": 1},
    UpdateExpression: "set VisitorCount = VisitorCount + :incr",
    ReturnValues: "ALL_NEW",
  });

  const response = await docClient.send(command);
  console.log(response);
  return response;
}
