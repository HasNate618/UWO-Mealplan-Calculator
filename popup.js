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

    function round2Dp(amount) {
      return Math.round(100*amount)/100
    }

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
    }

    console.log(oldestResBalance);
    console.log(oldestFlexBalance);


    // Get newest balances for both tenders
    const newestTransaction = tableRows[2].innerHTML.split("\n");
    //const newestBalance = elementToNum(newestTransaction[3]);

    let newestResBalance = 0;
    let newestFlexBalance = 0;

    if (newestTransaction[4].includes("ResDlrs")) {
      // Newest ResDlrs given, calculate Res balance
      newestResBalance = elementToNum(newestTransaction[2]) + elementToNum(newestTransaction[3]);

      // Find newest Flex
      for (let i = 3; i < tableRows.length - 1; i++) {
        const rowHtml = tableRows[i].innerHTML;
        if (rowHtml.includes("Flex")) {
          const rowSplit = rowHtml.split("\n");
          newestFlexBalance = elementToNum(rowSplit[3]);
          break; // Stop once Flex balance is found
        }
      }
    } else {
      // Newest Flex given, calculate Flex balance
      newestFlexBalance = elementToNum(newestTransaction[2]) + elementToNum(newestTransaction[3]);

      // Find newest ResDlrs
      for (let i = 3; i < tableRows.length - 1; i++) {
        const rowHtml = tableRows[i].innerHTML;
        if (rowHtml.includes("ResDlrs")) {
          const rowSplit = rowHtml.split("\n");
          newestResBalance = elementToNum(rowSplit[3]);
          break; // Stop once ResDlrs balance is found
        }
      }
    }
    
    console.log(newestResBalance);
    console.log(newestFlexBalance);

    const monthlyResSpending = round2Dp(oldestResBalance - newestResBalance);
    const dailyResSpending = round2Dp(monthlyResSpending/30);
    const monthlyFlexSpending = round2Dp(oldestFlexBalance - newestFlexBalance);
    const dailyFlexSpending = round2Dp(monthlyFlexSpending/30);
  
    // Open a new window and display the content inside <pre> tags for formatting
    const newWindow = window.open("", "_blank", "width=500,height=80");
    newWindow.document.write("<html><head><title>Spending Analysis</title></head><body><pre>" 
      + "\nDaily ResDlrs Spending: $" + dailyResSpending 
      + "\nDaily Flex Spending: $" + dailyFlexSpending
      + "\n\n*Values shown only include data from past month"
      + "</pre></body></html>");
    newWindow.document.close(); // Ensure the window content gets rendered
  }
