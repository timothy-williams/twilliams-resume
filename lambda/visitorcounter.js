import { DynamoDB } from ("aws-sdk");

exports.handler = async function(event) {
  const dynamo = new DynamoDB();
  console.log("Request:", JSON.stringify(event, undefined, 2));

  // Increment VisitorCount by 1
  const eventData = await dynamo.updateItem({
    TableName: process.env.TABLE_NAME,
    Key: { path: { N: "VisitorCount" } },
    UpdateExpression: 'ADD Hits :incr',
    ExpressionAttributeValues: { ':incr': { N: '1' } },
    ReturnValues: UPDATED_NEW,
  }).promise();

  console.log("Event data:", JSON.stringify(eventData, undefined, 2));

  // Return the updated value back to the site
  return eventData.Attributes.Hits.N;
};
