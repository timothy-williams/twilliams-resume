import { DynamoDBClient } from "aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, GetCommand, PutCommand } from "aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  // Will return null if VisitorCount does not exist
  const command = new GetCommand({
    TableName: "ResumeTable",
    Key: { SiteStatistics: { VisitorCount: 0 } },
  });

  if (command.Item) {
    const response = await docClient.send(command);
    console.log(response);
    return response;
  } else {
    // Initialize VisitorCount with a value of 0
    new PutCommand({
      TableName: "ResumeTable",
      Item: { VisitorCount: 0 },
    });

    const response = await docClient.send(command);
    console.log(response);
    return response;
  }
};