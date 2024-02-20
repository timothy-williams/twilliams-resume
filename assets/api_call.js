fetch("https://qlfbi8bsz9.execute-api.us-east-1.amazonaws.com/prod")
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
    document.getElementById("count").innerHTML = data.Attributes.Hits;
  });

function saveHTMLasPDF() {
  var element = document.getElementById("pdf");
  html2pdf(element);
}
