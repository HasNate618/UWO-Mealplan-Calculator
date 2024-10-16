// Dynamically insert the values into the page using query parameters
const urlParams = new URLSearchParams(window.location.search);

// Set the values from the query parameters into the appropriate elements
document.getElementById('dailyResSpending').innerText = urlParams.get('dailyResSpending');
document.getElementById('dailyFlexSpending').innerText = urlParams.get('dailyFlexSpending');
document.getElementById('dailyTotalSpending').innerText = urlParams.get('dailyTotalSpending');
document.getElementById('projectedResBalance').innerText = urlParams.get('projectedResBalance');
document.getElementById('projectedFlexBalance').innerText = urlParams.get('projectedFlexBalance');
document.getElementById('projectedTotalBalance').innerText = urlParams.get('projectedTotalBalance');
document.getElementById('targetResSpending').innerText = urlParams.get('targetResSpending');
document.getElementById('targetFlexSpending').innerText = urlParams.get('targetFlexSpending');
document.getElementById('targetTotalSpending').innerText = urlParams.get('targetTotalSpending');