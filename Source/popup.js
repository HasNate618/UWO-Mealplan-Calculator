document.getElementById('printHtml').addEventListener('click', () => {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        // Inject and execute the script in the active tab
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: printTableRows
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
  
  function printTableRows() {
    // Select all table rows on the page
    const tableRows = document.querySelectorAll("table tr");
    let rowsHtml = "";
    let sum = 0.00;
  
    // Loop through each row and log its outerHTML
    tableRows.forEach((row, index) => {
      const rowHtml = row.innerHTML.split("\n");
      //rowsHtml += `Row ${index}:\n [${rowHtml.length}] \n${row.innerHTML}\n\n`;
    
      //get first 4 chars then match with switch case
      if (rowHtml[2].includes("$")) {
        //rowsHtml += rowHtml[2];
        sum += parseFloat(rowHtml[2].trim().replace("<td>$","").replace("</td>",""));
      }
    });
    /*const rowHtml = tableRows[5].outerHTML.split("\n");
    rowHtml.forEach(element => {
      rowsHtml += element.toString();
    });*/
    //console.log(sum + parseFloat("     $3.90     ".trim().replace("$","")));
  
    // Check if rowsHtml has content, if not, show a warning
    if (rowsHtml.trim() === "") {
      rowsHtml = "No table rows found.";
    }
  
    // Open a new window and display the content inside <pre> tags for formatting
    const newWindow = window.open("", "_blank", "width=600,height=600");
    newWindow.document.write("<html><head><title>Table Rows</title></head><body><pre>" + sum + "</pre></body></html>");
    newWindow.document.close(); // Ensure the window content gets rendered
  }