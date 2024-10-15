// Dynamically insert the values into the page using query parameters
const urlParams = new URLSearchParams(window.location.search);

// Set the values from the query parameters into the appropriate elements
document.getElementById('dailyResSpending').textContent = "Daily ResDlrs Spending: " + urlParams.get('dailyResSpending');
document.getElementById('dailyFlexSpending').textContent = "Daily Flex Spending: " + urlParams.get('dailyFlexSpending');
document.getElementById('projectedResBalance').textContent = "Projected ResDlrs Balance: " + urlParams.get('projectedResBalance');
document.getElementById('projectedFlexBalance').textContent = "Projected Flex Balance: " + urlParams.get('projectedFlexBalance');
document.getElementById('projectedTotalBalance').textContent = "Projected Total Balance: " + urlParams.get('projectedTotalBalance');
document.getElementById('targetResSpending').textContent = "Recommended Daily ResDlrs Spending: " + urlParams.get('targetResSpending');
document.getElementById('targetFlexSpending').textContent = "Recommended Daily Flex Spending: " + urlParams.get('targetFlexSpending');
