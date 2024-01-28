fetch(
  "https://4exd22esdg.execute-api.us-east-1.amazonaws.com/visitorcount-api-post"
)
  .then((response) => {
    if (response.ok) {
      console.log("Fetch successful.");
    } else {
      console.log("Fetch unsuccessful.");
    }
    return response.json();
  })
  .then((data) => {
    console.log(data);
    document.getElementById("count").innerHTML = data;
  });
