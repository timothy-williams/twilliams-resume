fetch(
  "placeholder url"
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
