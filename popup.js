document.getElementById('calculateButton').addEventListener('click', () => {
  // Query the active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      // Gather user input values
      const pastMonthBased = !document.getElementById('timePeriodToggle').checked;
      const beginningResBalance = parseFloat(document.getElementById('resBalance').value) || 0;
      const beginningFlexBalance = parseFloat(document.getElementById('flexBalance').value) || 0;
      const startDate = document.getElementById('startDate').value; // Keep as a string for injection
      const endDate = document.getElementById('endDate').value; // Keep as a string for injection

      // Inject and execute the script in the active tab with parameters
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: calculateData,
        args: [pastMonthBased, beginningResBalance, beginningFlexBalance, startDate, endDate]
      }, (result) => {
        if (chrome.runtime.lastError) {
          console.error("Script injection failed: ", chrome.runtime.lastError);
        } else {
          console.log("Script executed successfully", result);
        }
      });
    } else {
      console.error("No active tab found");
    }
  });
});

function calculateData(pastMonthBased, beginningResBalance, beginningFlexBalance, startDate, endDate) {
  console.log('Past Month toggle:', pastMonthBased);
  console.log('Residence Balance:', beginningResBalance);
  console.log('Flex Balance:', beginningFlexBalance);
  console.log('Start Date:', startDate);
  console.log('End Date:', endDate);
  
  // Select all table rows on the page
  const tableRows = document.querySelectorAll("table tr");
  let rowsHtml = "";

  function elementToNum(element) {
    return parseFloat(element.trim().replace("<td>$","").replace('<td class="mobile_hide">$',"").replace("</td>",""));
  }


  // Get oldest balances (if past month based)
  let oldestResBalance = -1;
  let oldestFlexBalance = -1;

  if (pastMonthBased) {
    // Get the oldest balances for both tenders
    const oldestTransaction = tableRows[tableRows.length - 1].innerHTML.split("\n");

    if (oldestTransaction[4].includes("ResDlrs")) {
      // Oldest ResDlrs given, calculate Res balance
      oldestResBalance = elementToNum(oldestTransaction[2]) + elementToNum(oldestTransaction[3]);

      // Find oldest Flex
      for (let i = tableRows.length - 1; i > 0; i--) {
        const rowHtml = tableRows[i].innerHTML;
        if (rowHtml.includes("Flex")) {
          const rowSplit = rowHtml.split("\n");
          oldestFlexBalance = elementToNum(rowSplit[2]) + elementToNum(rowSplit[3]);
          break; // Stop once Flex balance is found
        }
      }
      if (oldestFlexBalance == -1) oldestFlexBalance = 'N/A';
    } else {
      // Oldest Flex given, calculate Flex balance
      oldestFlexBalance = elementToNum(oldestTransaction[2]) + elementToNum(oldestTransaction[3]);

      // Find oldest ResDlrs
      for (let i = tableRows.length - 1; i > 0; i--) {
        const rowHtml = tableRows[i].innerHTML;
        if (rowHtml.includes("ResDlrs")) {
          const rowSplit = rowHtml.split("\n");
          oldestResBalance = elementToNum(rowSplit[2]) + elementToNum(rowSplit[3]);
          break; // Stop once ResDlrs balance is found
        }
      }
      if (oldestResBalance == -1) oldestResBalance = 'N/A';
    }
  }


  // Get newest balances for both tenders
  const newestTransaction = tableRows[2].innerHTML.split("\n");
  let newestResBalance = -1;
  let newestFlexBalance = -1;

  if (newestTransaction[4].includes("ResDlrs")) {
    // Newest ResDlrs given, calculate Res balance
    newestResBalance = elementToNum(newestTransaction[2]) + elementToNum(newestTransaction[3]);

    // Find newest Flex
    for (let i = 3; i < tableRows.length; i++) {
      const rowHtml = tableRows[i].innerHTML;
      if (rowHtml.includes("Flex")) {
        const rowSplit = rowHtml.split("\n");
        newestFlexBalance = elementToNum(rowSplit[3]);
        break;
      }
    }
    if (newestFlexBalance == -1) newestFlexBalance = 'N/A';
  } else {
    // Newest Flex given, calculate Flex balance
    newestFlexBalance = elementToNum(newestTransaction[2]) + elementToNum(newestTransaction[3]);

    // Find newest ResDlrs
    for (let i = 3; i < tableRows.length; i++) {
      const rowHtml = tableRows[i].innerHTML;
      if (rowHtml.includes("ResDlrs")) {
        const rowSplit = rowHtml.split("\n");
        newestResBalance = elementToNum(rowSplit[3]);
        break;
      }
    }
    if (newestResBalance == -1) newestResBalance = 'N/A';
  }


  // Calculate timings
  const currentDate = new Date();
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  const msPerDay = 86400000;
  const daysPassed = (currentDate.getTime() - startDateObj.getTime()) / msPerDay;
  const daysLeft = (endDateObj.getTime() - currentDate.getTime()) / msPerDay;
  const daysInYear = (endDateObj.getTime() - startDateObj.getTime()) / msPerDay;


  // Data variables
  let dailyResSpending, dailyFlexSpending, projectedResBalance, 
  projectedFlexBalance, targetResSpending, targetFlexSpending = 0;  

  // Calculations
  if (pastMonthBased){
    // Daily spending
    const monthlyResSpending = oldestResBalance - newestResBalance;
    dailyResSpending = monthlyResSpending/30;
    const monthlyFlexSpending = oldestFlexBalance - newestFlexBalance;
    dailyFlexSpending = monthlyFlexSpending/30;

    // Projected balances
    projectedResBalance = newestResBalance - dailyResSpending*daysLeft;
    projectedFlexBalance = newestFlexBalance - dailyFlexSpending*daysLeft;

    // Recommended daily spendings
    targetResSpending = newestResBalance/daysLeft;
    targetFlexSpending = newestFlexBalance/daysLeft;
  } else {
    // Daily spending
    dailyResSpending = (beginningResBalance - newestResBalance)/daysPassed;
    dailyFlexSpending = (beginningFlexBalance - newestFlexBalance)/daysPassed;

    // Projected balances
    projectedResBalance = beginningResBalance - dailyResSpending*daysInYear;
    projectedFlexBalance = beginningFlexBalance - dailyFlexSpending*daysLeft;

    // Recommended daily spendins
    targetResSpending = newestResBalance/daysLeft;
    targetFlexSpending = newestFlexBalance/daysLeft;
  }


  function numToDollar(number) {
    const dollar = (Math.sign(number) >= 0 ? "" : "-") + "$" + Math.abs(number).toFixed(2)
    return dollar.localeCompare("-$NaN")?dollar:"N/A";
  }

  // Open analysis window with params
  const queryString 
  = `?dailyResSpending=${encodeURIComponent(numToDollar(dailyResSpending))}`
  + `&dailyFlexSpending=${encodeURIComponent(numToDollar(dailyFlexSpending))}`
  + `&dailyTotalSpending=${encodeURIComponent(numToDollar(dailyResSpending + dailyFlexSpending))}`
  + `&projectedResBalance=${encodeURIComponent(numToDollar(projectedResBalance))}`
  + `&projectedFlexBalance=${encodeURIComponent(numToDollar(projectedFlexBalance))}`
  + `&projectedTotalBalance=${encodeURIComponent(numToDollar(projectedResBalance + projectedFlexBalance))}`
  + `&targetResSpending=${encodeURIComponent(numToDollar(targetResSpending))}`
  + `&targetFlexSpending=${encodeURIComponent(numToDollar(targetFlexSpending))}`
  + `&targetTotalSpending=${encodeURIComponent(numToDollar(targetResSpending + targetFlexSpending))}`;

  const analysisHtmlUrl = chrome.runtime.getURL('analysis.html');
  window.open(analysisHtmlUrl + queryString, '_blank', 'width=710,height=375');
}
