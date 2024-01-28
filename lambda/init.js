import { DynamoDB } from "aws-sdk";

export async function handler(event) {
  const dynamoDB = new DynamoDB.DocumentClient();
  const tableName = process.env.TABLE_NAME;
  const pageId = "pk";
  const visitorCount = 0;

  try {
    // Will return null if VisitorCount does not exist
    const existingItem = await dynamoDB
      .get({
        TableName: tableName,
        Key: { PageID: pageId, VisitorCount: visitorCount },
      })
      .promise();

    if (existingItem.Item) {
      console.log(
        "DynamoDB item VisitorCount already exists. No action needed."
      );
    } else {
      // Initialize VisitorCount with a value of 0
      await dynamoDB
        .put({
          TableName: tableName,
          Item: { PageID: pageId, VisitorCount: visitorCount },
        })
        .promise();

      console.log("DynamoDB item VisitorCount created successfully.");
    }

    return { statusCode: 200, body: "Success" };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, body: "Error" };
  }
}
