import { DynamoDBClient } from "aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async () => {
  const command = new GetCommand({
    TableName: "ResumeTable",
    Key: { SiteStatistics: { VisitorCount: 0 } },
  });

  const response = await docClient.send(command);
  console.log(response);
  return command.Item.VisitorCount;
};