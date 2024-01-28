export async function handler(event, context) {
  // Your retrieving logic goes here
  console.log("Retrieving count...");
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Count retrieved" }),
  };
}
