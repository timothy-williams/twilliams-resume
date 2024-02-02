fetch("https://qlfbi8bsz9.execute-api.us-east-1.amazonaws.com/", {
  method: "GET",
  headers: {
    'Content-Type': 'application/json',
  },
  // mode: "no-cors",
})
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
