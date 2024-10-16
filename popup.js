document.getElementById('calculateButton').addEventListener('click', () => {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Inject and execute the script in the active tab
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: calculateData
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

  function calculateData() {
    // Select all table rows on the page
    const tableRows = document.querySelectorAll("table tr");
    let rowsHtml = "";

    function elementToNum(element) {
      return parseFloat(element.trim().replace("<td>$","").replace('<td class="mobile_hide">$',"").replace("</td>",""));
    }


    // Get the oldest balances for both tenders
    const oldestTransaction = tableRows[tableRows.length - 1].innerHTML.split("\n");
    let oldestResBalance = 0;
    let oldestFlexBalance = 0;

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
      oldestFlexBalance = 'N/A';
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
      oldestResBalance = 'N/A';
    }


    // Get newest balances for both tenders
    const newestTransaction = tableRows[2].innerHTML.split("\n");
    let newestResBalance = 0;
    let newestFlexBalance = 0;

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
      newestFlexBalance = 'N/A';
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
      newestResBalance = 'N/A';
    }

    
    // Calculate daily and monthly spendings
    const monthlyResSpending = oldestResBalance - newestResBalance;
    const dailyResSpending = monthlyResSpending/30;
    const monthlyFlexSpending = oldestFlexBalance - newestFlexBalance;
    const dailyFlexSpending = monthlyFlexSpending/30;

    // Calculate projected remaining balances
    const startDate = new Date("09/01/2024");
    const currentDate = new Date();
    const endDate = new Date("04/30/2025");
    const daysLeft = Math.round((endDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24));
    const projectedResBalance = newestResBalance - dailyResSpending*daysLeft;
    const projectedFlexBalance = newestFlexBalance - dailyFlexSpending*daysLeft;

    // Calculate recommended daily spending ($/day to use up balance by end of year)
    const targetResSpending = newestResBalance/daysLeft;
    const targetFlexSpending = newestFlexBalance/daysLeft;

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
