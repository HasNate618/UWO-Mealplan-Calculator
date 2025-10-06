// Content script that runs automatically on the UWO meal plan history page
console.log("UWO Mealplan Calculator: Content script loaded");

// Wait for the page to be fully loaded
function waitForPageLoad() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve();
    } else {
      window.addEventListener('load', resolve);
    }
  });
}

// Function to detect tender types from the transaction table
function detectTenderTypes() {
  const tableRows = document.querySelectorAll("table tr");
  const tenderTypes = new Set();
  
  // Skip header rows and scan for tender types
  for (let i = 2; i < tableRows.length; i++) {
    const rowHtml = tableRows[i].innerHTML;
    const rowSplit = rowHtml.split("\n");
    
    // Check if this is a transaction row (not a date group)
    if (rowSplit.length >= 5 && !rowSplit[0].includes('colspan')) {
      const tenderCell = rowSplit[4];
      if (tenderCell && tenderCell.includes('<td>')) {
        const tender = tenderCell.replace('<td>', '').replace('</td>', '').trim();
        if (tender && tender !== 'Tender') {
          tenderTypes.add(tender);
        }
      }
    }
  }
  
  console.log("Detected tender types:", Array.from(tenderTypes));
  return Array.from(tenderTypes);
}

// Function to inject the calculator form
function injectCalculatorForm() {
  console.log("Injecting calculator form...");
  
  // Check if form already exists
  const existingCalculator = document.getElementById('mealplan-calculator');
  if (existingCalculator) {
    console.log("Calculator form already exists");
    return;
  }

  // Detect tender types from the table
  const tenderTypes = detectTenderTypes();
  if (tenderTypes.length === 0) {
    console.error("No tender types detected in the transaction table");
    return;
  }

  // Get default values from Chrome storage - include dynamic tender keys
  const storageKeys = ['startDate', 'endDate', 'timePeriodToggle'];
  tenderTypes.forEach(tender => {
    storageKeys.push(`${tender.toLowerCase()}Balance`);
  });
  
  chrome.storage.local.get(storageKeys, (result) => {
    const startDate = result.startDate || '2025-09-01';
    const endDate = result.endDate || '2026-04-30';
    const timePeriodToggle = result.timePeriodToggle !== undefined ? result.timePeriodToggle : true;
    
    // Create tender input fields dynamically
    let tenderInputsHTML = '';
    const tenderInputs = [];
    
    tenderTypes.forEach(tender => {
      const balanceKey = `${tender.toLowerCase()}Balance`;
      // Set default values for ResDlrs and Flex
      let defaultBalance = '0';
      if (tender === 'ResDlrs') {
        defaultBalance = '2750';
      } else if (tender === 'Flex') {
        defaultBalance = '550';
      }
      const savedBalance = result[balanceKey] || defaultBalance;
      const tenderId = `injected-${tender.toLowerCase()}Balance`;
      
      tenderInputs.push(tenderId);
      
      tenderInputsHTML += `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <label style="font-size: 14px; margin-right: 5px;">Starting ${tender} Balance:</label>
          <input type="number" id="${tenderId}" value="${savedBalance}" min="0" step="0.01" style="
            font-size: 14px; padding: 5px; width: 140px; border: 1px solid #ccc;
            border-radius: 3px; text-align: center; font-family: Arial, sans-serif;
          ">
        </div>
      `;
    });
    
    // Calculate grid columns based on number of inputs (dates + tenders)
    const totalInputs = 2 + tenderTypes.length; // 2 date inputs + tender inputs
    const gridCols = totalInputs <= 4 ? '1fr 1fr' : totalInputs <= 6 ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr';
    
    // Create the calculator form HTML with collapsible configuration
    const calculatorHTML = `
      <div id="mealplan-calculator" style="
        margin: 20px 0;
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        border: 2px solid #4f2683;
        width: 100%;
        font-family: Arial, sans-serif;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; ">
          <h2 style="
            color: #4f2683;
            font-size: 20px;
            font-weight: bold;
            margin: 0;
          ">UWO Mealplan Calculator</h2>
          <button id="config-toggle" style="
            padding: 8px 16px;
            background-color: #4f2683;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            color: white;
            font-weight: 500;
            font-size: 14px;
          ">Settings</button>
        </div>
        
        <div id="config-panel" style="display: none; margin-top: 15px; margin-bottom: 15px;">
          <div style="display: grid; grid-template-columns: ${gridCols}; gap: 15px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 14px; margin-right: 5px;">Year Start Date:</label>
              <input type="date" id="injected-startDate" value="${startDate}" style="
                font-size: 14px; padding: 5px; width: 140px; border: 1px solid #ccc;
                border-radius: 3px; text-align: center; font-family: Arial, sans-serif;
              ">
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <label style="font-size: 14px; margin-right: 5px;">Year End Date:</label>
              <input type="date" id="injected-endDate" value="${endDate}" style="
                font-size: 14px; padding: 5px; width: 140px; border: 1px solid #ccc;
                border-radius: 3px; text-align: center; font-family: Arial, sans-serif;
              ">
            </div>
            
            ${tenderInputsHTML}
          </div>
          
          <div style="display: flex; align-items: center; justify-content: center; margin: 15px 0;">
            <label style="font-size: 14px; margin-right: 10px;">Past Month/All Time:</label>
            <label style="position: relative; display: inline-block; width: 40px; height: 20px;">
              <input type="checkbox" id="injected-timePeriodToggle" ${timePeriodToggle ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span class="slider" style="
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: ${timePeriodToggle ? '#4caf50' : '#ccc'}; transition: 0.4s; border-radius: 20px;
              ">
                <span class="knob" style="
                  position: absolute; content: ''; height: 16px; width: 16px; border-radius: 50%;
                  left: ${timePeriodToggle ? '22px' : '2px'}; bottom: 2px; background-color: white; transition: 0.4s;
                "></span>
              </span>
            </label>
          </div>
          
          <p style="margin: 10px 0; font-size: 12px; color: #6d6d6d; text-align: center;">
            *Changes are saved automatically and will recalculate the analysis.
          </p>
        </div>
        
        <div id="tender-data" data-tenders='${JSON.stringify(tenderTypes)}' style="display: none;"></div>
      </div>
    `;

    // Find the insertion point (before the "History for [Name]" header)
    const contentHeader = document.getElementById('contentHeader');
    if (contentHeader) {
      contentHeader.insertAdjacentHTML('beforebegin', calculatorHTML);
      setupEventListeners();
      console.log("Calculator form injected successfully");
    } else {
      console.error("Could not find contentHeader element to inject calculator");
    }
  });
}

// Function to set up event listeners for the injected form
function setupEventListeners() {
  const configToggle = document.getElementById('config-toggle');
  const configPanel = document.getElementById('config-panel');
  const toggle = document.getElementById('injected-timePeriodToggle');
  
  // Get tender types from the hidden data element
  const tenderDataElement = document.getElementById('tender-data');
  const tenderTypes = tenderDataElement ? JSON.parse(tenderDataElement.dataset.tenders) : [];
  
  // Toggle configuration panel
  if (configToggle && configPanel) {
    configToggle.addEventListener('click', () => {
      if (configPanel.style.display === 'none') {
        configPanel.style.display = 'block';
        configToggle.textContent = 'Hide Settings';
      } else {
        configPanel.style.display = 'none';
        configToggle.textContent = 'Settings';
      }
    });
  }
  
  // Function to recalculate analysis
  function recalculateAnalysis() {
    const pastMonthBased = !document.getElementById('injected-timePeriodToggle').checked;
    const startDate = document.getElementById('injected-startDate').value;
    const endDate = document.getElementById('injected-endDate').value;
    
    // Get tender balances dynamically
    const tenderBalances = {};
    tenderTypes.forEach(tender => {
      const inputId = `injected-${tender.toLowerCase()}Balance`;
      const element = document.getElementById(inputId);
      if (element) {
        tenderBalances[tender] = parseFloat(element.value) || 0;
      }
    });
    
    // Run calculation and save values
    saveFormValues();
    runAnalysis(pastMonthBased, tenderBalances, startDate, endDate, tenderTypes);
  }
  
  // Save values and recalculate when inputs change
  const inputs = ['injected-startDate', 'injected-endDate'];
  tenderTypes.forEach(tender => {
    inputs.push(`injected-${tender.toLowerCase()}Balance`);
  });
  
  inputs.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      // For number inputs (tender balances), recalculate on both input and change
      if (element.type === 'number') {
        element.addEventListener('input', recalculateAnalysis);
      }
      element.addEventListener('change', recalculateAnalysis);
    }
  });
  
  if (toggle) {
    toggle.addEventListener('change', (e) => {
      const slider = e.target.nextElementSibling;
      const knob = slider.querySelector('.knob');
      if (e.target.checked) {
        slider.style.backgroundColor = '#4caf50';
        knob.style.left = '22px';
      } else {
        slider.style.backgroundColor = '#ccc';
        knob.style.left = '2px';
      }
      recalculateAnalysis();
    });
  }
}

// Function to save form values to storage
function saveFormValues() {
  const values = {
    startDate: document.getElementById('injected-startDate')?.value,
    endDate: document.getElementById('injected-endDate')?.value,
    timePeriodToggle: document.getElementById('injected-timePeriodToggle')?.checked
  };
  
  // Save tender balances dynamically
  const tenderDataElement = document.getElementById('tender-data');
  if (tenderDataElement) {
    const tenderTypes = JSON.parse(tenderDataElement.dataset.tenders);
    tenderTypes.forEach(tender => {
      const inputId = `injected-${tender.toLowerCase()}Balance`;
      const element = document.getElementById(inputId);
      if (element) {
        values[`${tender.toLowerCase()}Balance`] = element.value;
      }
    });
  }
  
  chrome.storage.local.set(values);
}

// Function to run the analysis calculation
function runAnalysis(pastMonthBased, tenderBalances, startDate, endDate, tenderTypes) {
  console.log("Starting analysis...");
  console.log("Parameters:", { pastMonthBased, tenderBalances, startDate, endDate, tenderTypes });
  
  // Select all table rows on the page
  const tableRows = document.querySelectorAll("table tr");
  console.log("Found table rows:", tableRows.length);
  
  if (tableRows.length === 0) {
    console.error("No table rows found on the page.");
    alert("No transaction table found! Please make sure you're on the UWO meal plan history page.");
    return;
  }

  function elementToNum(element) {
    return parseFloat(element.trim().replace("<td>$","").replace('<td class="mobile_hide">$',"").replace("</td>",""));
  }

  // Get balances for each tender type
  const tenderData = {};
  
  // Initialize tender data structure
  tenderTypes.forEach(tender => {
    tenderData[tender] = {
      oldestBalance: 0,
      newestBalance: 0,
      beginningBalance: tenderBalances[tender] || 0,
      dailySpending: 0,
      projectedBalance: 0,
      targetSpending: 0
    };
  });

  // Find newest balances (from most recent transaction)
  for (let i = 2; i < tableRows.length; i++) {
    const rowHtml = tableRows[i].innerHTML;
    const rowSplit = rowHtml.split("\n");
    
    // Skip date group rows
    if (rowSplit.length >= 5 && !rowSplit[0].includes('colspan')) {
      const tenderCell = rowSplit[4];
      if (tenderCell && tenderCell.includes('<td>')) {
        const tender = tenderCell.replace('<td>', '').replace('</td>', '').trim();
        
        if (tenderData[tender] && tenderData[tender].newestBalance === 0) {
          // Get the balance from the mobile_hide column (index 3)
          tenderData[tender].newestBalance = elementToNum(rowSplit[3]);
          console.log(`Found newest ${tender} balance: ${tenderData[tender].newestBalance}`);
        }
      }
    }
  }

  // Find oldest balances (if past month based)
  if (pastMonthBased) {
    // Start from the end and work backwards to find oldest balances
    for (let i = tableRows.length - 1; i >= 2; i--) {
      const rowHtml = tableRows[i].innerHTML;
      const rowSplit = rowHtml.split("\n");
      
      // Skip date group rows
      if (rowSplit.length >= 5 && !rowSplit[0].includes('colspan')) {
        const tenderCell = rowSplit[4];
        if (tenderCell && tenderCell.includes('<td>')) {
          const tender = tenderCell.replace('<td>', '').replace('</td>', '').trim();
          
          if (tenderData[tender]) {
            // Calculate oldest balance (current balance + transaction amount)
            const transactionAmount = elementToNum(rowSplit[2]);
            const currentBalance = elementToNum(rowSplit[3]);
            tenderData[tender].oldestBalance = currentBalance + transactionAmount;
            console.log(`Calculated oldest ${tender} balance: ${tenderData[tender].oldestBalance}`);
          }
        }
      }
    }
  }

  // Calculate timings
  const currentDate = new Date();
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);

  const msPerDay = 86400000;
  const daysPassed = (currentDate.getTime() - startDateObj.getTime()) / msPerDay;
  const daysLeft = (endDateObj.getTime() - currentDate.getTime()) / msPerDay;
  const daysInYear = (endDateObj.getTime() - startDateObj.getTime()) / msPerDay;

  // Perform calculations for each tender
  tenderTypes.forEach(tender => {
    const data = tenderData[tender];
    
    if (pastMonthBased) {
      // Daily spending based on past month
      const monthlySpending = data.oldestBalance - data.newestBalance;
      data.dailySpending = monthlySpending / 30;
      
      // Projected balance
      data.projectedBalance = data.newestBalance - data.dailySpending * daysLeft;
      
      // Target spending
      data.targetSpending = data.newestBalance / daysLeft;
    } else {
      // Daily spending based on all time
      data.dailySpending = (data.beginningBalance - data.newestBalance) / daysPassed;
      
      // Projected balance
      data.projectedBalance = data.beginningBalance - data.dailySpending * daysInYear;
      
      // Target spending
      data.targetSpending = data.newestBalance / daysLeft;
    }
    
    console.log(`${tender} calculations:`, data);
  });

  function numToDollar(number) {
    const dollar = (Math.sign(number) >= 0 ? "" : "-") + "$" + Math.abs(number).toFixed(2)
    return dollar.localeCompare("-$NaN")?dollar:"N/A";
  }

  // Remove existing analysis if present
  const existingAnalysis = document.getElementById('mealplan-analysis');
  if (existingAnalysis) {
    existingAnalysis.remove();
  }

  // Generate table rows for each tender
  let tenderRowsHTML = '';
  let totalDailySpending = 0;
  let totalProjectedBalance = 0;
  let totalTargetSpending = 0;
  
  tenderTypes.forEach((tender, index) => {
    const data = tenderData[tender];
    totalDailySpending += data.dailySpending;
    totalProjectedBalance += data.projectedBalance;
    totalTargetSpending += data.targetSpending;
    
    const rowStyle = index % 2 === 0 ? 'background-color: #f9f9f9;' : '';
    
    tenderRowsHTML += `
      <tr style="${rowStyle}">
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;">${tender}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;">${numToDollar(data.dailySpending)}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;">${numToDollar(data.projectedBalance)}</td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;">${numToDollar(data.targetSpending)}</td>
      </tr>
    `;
  });
  
  // Add total row if there are multiple tenders
  let totalRowHTML = '';
  if (tenderTypes.length > 1) {
    const totalRowStyle = tenderTypes.length % 2 === 0 ? 'background-color: #f9f9f9;' : '';
    totalRowHTML = `
      <tr style="${totalRowStyle}">
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;"><strong>Total</strong></td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;"><strong>${numToDollar(totalDailySpending)}</strong></td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;"><strong>${numToDollar(totalProjectedBalance)}</strong></td>
        <td style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd; font-weight: 500;"><strong>${numToDollar(totalTargetSpending)}</strong></td>
      </tr>
    `;
  }

  // Create analysis HTML to inject into the page
  const analysisHTML = `
    <div id="mealplan-analysis" style="
      margin: 20px 0;
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      border: 2px solid #4f2683;
    ">
      <h2 style="
        text-align: center;
        color: #4f2683;
        font-size: 24px;
        margin-bottom: 20px;
        font-family: Arial, sans-serif;
      ">Spending Analysis</h2>
      <table style="
        width: 100%;
        border-collapse: collapse;
        font-family: Arial, sans-serif;
      ">
        <thead>
          <tr style="background-color: #4f2683; color: white;">
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Tender</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Daily Spending</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Projected Remainder by Year End</th>
            <th style="padding: 12px; text-align: center; border-bottom: 1px solid #ddd;">Daily Budget to Finish on Target</th>
          </tr>
        </thead>
        <tbody>
          ${tenderRowsHTML}
          ${totalRowHTML}
        </tbody>
      </table>
    </div>
  `;

  // Find the insertion point (after the calculator form)
  const calculatorForm = document.getElementById('mealplan-calculator');
  if (calculatorForm) {
    // Insert the analysis after the calculator form
    calculatorForm.insertAdjacentHTML('afterend', analysisHTML);
  }

  console.log("Analysis completed successfully");
}

// Initialize when page loads
waitForPageLoad().then(() => {
  // Small delay to ensure page is fully rendered
  setTimeout(() => {
    injectCalculatorForm();
    // Automatically run analysis on page load
    setTimeout(runInitialAnalysis, 200);
  }, 100);
});

// Function to run initial analysis automatically
function runInitialAnalysis() {
  const tenderDataElement = document.getElementById('tender-data');
  if (!tenderDataElement) return;
  
  const tenderTypes = JSON.parse(tenderDataElement.dataset.tenders);
  const toggle = document.getElementById('injected-timePeriodToggle');
  const pastMonthBased = toggle ? !toggle.checked : false;
  const startDate = document.getElementById('injected-startDate')?.value || '2025-09-01';
  const endDate = document.getElementById('injected-endDate')?.value || '2026-04-30';
  
  // Get tender balances
  const tenderBalances = {};
  tenderTypes.forEach(tender => {
    const inputId = `injected-${tender.toLowerCase()}Balance`;
    const element = document.getElementById(inputId);
    if (element) {
      tenderBalances[tender] = parseFloat(element.value) || 0;
    }
  });
  
  runAnalysis(pastMonthBased, tenderBalances, startDate, endDate, tenderTypes);
}