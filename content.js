// Content script that runs automatically on the UWO meal plan history page
const CURRENT_VERSION = '2026.1';

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

// Check for updates and show notification
function checkForUpdates() {
  chrome.storage.local.get(['lastSeenVersion'], (result) => {
    const lastSeenVersion = result.lastSeenVersion;
    
    if (lastSeenVersion !== CURRENT_VERSION) {
      showUpdateNotification();
      chrome.storage.local.set({ lastSeenVersion: CURRENT_VERSION });
    }
  });
}

// Show update notification
function showUpdateNotification() {
  const notification = document.createElement('div');
  notification.id = 'update-notification';
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      max-width: 400px;
      background: linear-gradient(135deg, #4f2683 0%, #663399 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      animation: slideIn 0.3s ease-out;
    ">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 18px; font-weight: bold;">🎉 Update v${CURRENT_VERSION}</h3>
        <button id="close-update-notification" style="
          background: transparent;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          width: 24px;
          height: 24px;
        ">×</button>
      </div>
      <div style="font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 10px 0; font-weight: 500;">What's New:</p>
        <ul style="margin: 0; padding-left: 20px;">
          <li><strong>2026-27 Academic Year:</strong> Default dates updated to Sept 1, 2026 – April 30, 2027</li>
          <li><strong>Updated Starting Balances:</strong> Defaults now reflect the 2026-27 meal plan (ResDlrs $3,550, Flex $550)</li>
        </ul>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from {
          transform: translateX(420px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(420px);
          opacity: 0;
        }
      }
    </style>
  `;
  
  document.body.appendChild(notification);
  
  // Close button handler
  const closeBtn = document.getElementById('close-update-notification');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    });
  }
  
  // Removed auto-dismiss. Notification stays until closed by user.
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
  
  return Array.from(tenderTypes);
}

// Function to inject the calculator form
function injectCalculatorForm() {
  // Check if form already exists
  const existingCalculator = document.getElementById('mealplan-calculator');
  if (existingCalculator) {
    return;
  }

  // Detect tender types from the table
  const tenderTypes = detectTenderTypes();
  if (tenderTypes.length === 0) {
    console.error("No tender types detected in the transaction table");
    return;
  }

  // Get default values from Chrome storage - include dynamic tender keys
  const storageKeys = ['startDate', 'endDate', 'timePeriodToggle', 'excludedRanges'];
  tenderTypes.forEach(tender => {
    storageKeys.push(`${tender.toLowerCase()}Balance`);
  });
  
  chrome.storage.local.get(storageKeys, (result) => {
    // Default to the 2026-27 academic year. If saved dates still match the previous
    // year's defaults, migrate them forward so returning users don't get stale
    // projections. Dates the user customized are left untouched.
    let startDate, endDate;
    if (result.startDate === '2025-09-01' && result.endDate === '2026-04-30') {
      startDate = '2026-09-01';
      endDate = '2027-04-30';
      chrome.storage.local.set({ startDate, endDate });
    } else {
      startDate = result.startDate || '2026-09-01';
      endDate = result.endDate || '2027-04-30';
    }
    const timePeriodToggle = result.timePeriodToggle !== undefined ? result.timePeriodToggle : true;
    const excludedRanges = result.excludedRanges || [];
    
    // Create tender input fields dynamically
    let tenderInputsHTML = '';
    const tenderInputs = [];
    
    tenderTypes.forEach(tender => {
      const balanceKey = `${tender.toLowerCase()}Balance`;
      // Set default values for ResDlrs and Flex
      let defaultBalance = '0';
      if (tender === 'ResDlrs') {
        defaultBalance = '3550';
      } else if (tender === 'Flex') {
        defaultBalance = '550';
      }
      const savedBalance = result[balanceKey] || defaultBalance;
      const tenderId = `injected-${tender.toLowerCase()}Balance`;
      
      tenderInputs.push(tenderId);
      
      tenderInputsHTML += `
        <div style="display: flex; flex-direction: column;">
          <label style="font-size: 13px; font-weight: 500; margin-bottom: 5px; color: #333;">${tender} Balance:</label>
          <input type="number" id="${tenderId}" value="${savedBalance}" min="0" step="0.01" style="
            font-size: 14px; padding: 8px 10px; border: 1px solid #ccc;
            border-radius: 5px; font-family: Arial, sans-serif; transition: border-color 0.2s;
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
        
        <div id="config-panel" style="display: none; margin-top: 20px; padding: 20px; background: #f9f9f9; border-radius: 8px; border: 1px solid #e0e0e0;">
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #4f2683; font-weight: 600; border-bottom: 2px solid #4f2683; padding-bottom: 8px;">Academic Year Dates</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="display: flex; flex-direction: column;">
              <label style="font-size: 13px; font-weight: 500; margin-bottom: 5px; color: #333;">Year Start Date:</label>
              <input type="date" id="injected-startDate" value="${startDate}" style="
                font-size: 14px; padding: 8px 10px; border: 1px solid #ccc;
                border-radius: 5px; font-family: Arial, sans-serif; transition: border-color 0.2s;
              ">
            </div>
            
            <div style="display: flex; flex-direction: column;">
              <label style="font-size: 13px; font-weight: 500; margin-bottom: 5px; color: #333;">Year End Date:</label>
              <input type="date" id="injected-endDate" value="${endDate}" style="
                font-size: 14px; padding: 8px 10px; border: 1px solid #ccc;
                border-radius: 5px; font-family: Arial, sans-serif; transition: border-color 0.2s;
              ">
            </div>
          </div>
          
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #4f2683; font-weight: 600; border-bottom: 2px solid #4f2683; padding-bottom: 8px;">Starting Balances</h3>
          <div style="display: grid; grid-template-columns: ${gridCols}; gap: 15px; margin-bottom: 20px;">
            ${tenderInputsHTML}
          </div>
          
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #4f2683; font-weight: 600; border-bottom: 2px solid #4f2683; padding-bottom: 8px;">Excluded Days</h3>
          <div style="margin-bottom: 20px;">
            <p style="font-size: 13px; color: #666; margin: 0 0 10px 0;">Exclude date ranges when you won't be using your meal plan (e.g., breaks, travel). This improves projection accuracy.</p>
            <div id="excluded-ranges-list" style="margin-bottom: 10px;">
              ${excludedRanges.map((range, index) => `
                <div class="excluded-range-item" data-index="${index}" style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 5px; border: 1px solid #e0e0e0; margin-bottom: 8px;">
                  <span style="flex: 1; font-size: 13px; color: #333;">${range.start} to ${range.end}</span>
                  <button class="remove-range-btn" data-index="${index}" style="padding: 4px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">Remove</button>
                </div>
              `).join('')}
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr auto; gap: 10px; align-items: end;">
              <div style="display: flex; flex-direction: column;">
                <label style="font-size: 13px; font-weight: 500; margin-bottom: 5px; color: #333;">Start Date:</label>
                <input type="date" id="new-exclude-start" min="${startDate}" max="${endDate}" style="font-size: 14px; padding: 8px 10px; border: 1px solid #ccc; border-radius: 5px; font-family: Arial, sans-serif;">
              </div>
              <div style="display: flex; flex-direction: column;">
                <label style="font-size: 13px; font-weight: 500; margin-bottom: 5px; color: #333;">End Date:</label>
                <input type="date" id="new-exclude-end" min="${startDate}" max="${endDate}" style="font-size: 14px; padding: 8px 10px; border: 1px solid #ccc; border-radius: 5px; font-family: Arial, sans-serif;">
              </div>
              <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                <button id="add-exclude-range-btn" style="padding: 8px 16px; background-color: #4f2683; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: 500; font-size: 14px;">Add Range</button>
              </div>
            </div>
          </div>
          
          <h3 style="margin: 0 0 15px 0; font-size: 16px; color: #4f2683; font-weight: 600; border-bottom: 2px solid #4f2683; padding-bottom: 8px;">Calculation Method</h3>
          <div style="display: flex; align-items: center; justify-content: center; padding: 15px; background: white; border-radius: 5px; border: 1px solid #e0e0e0;">
            <label style="font-size: 14px; font-weight: 500; margin-right: 15px; color: #333;">Past Month</label>
            <label style="position: relative; display: inline-block; width: 50px; height: 26px;">
              <input type="checkbox" id="injected-timePeriodToggle" ${timePeriodToggle ? 'checked' : ''} style="opacity: 0; width: 0; height: 0;">
              <span class="slider" style="
                position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
                background-color: ${timePeriodToggle ? '#4caf50' : '#ccc'}; transition: 0.3s; border-radius: 26px;
              ">
                <span class="knob" style="
                  position: absolute; content: ''; height: 20px; width: 20px; border-radius: 50%;
                  left: ${timePeriodToggle ? '27px' : '3px'}; bottom: 3px; background-color: white; transition: 0.3s;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                "></span>
              </span>
            </label>
            <label style="font-size: 14px; font-weight: 500; margin-left: 15px; color: #333;">All Time</label>
          </div>
          
          <p style="margin: 15px 0 0 0; font-size: 12px; color: #666; text-align: center; font-style: italic;">
            Changes are saved automatically and will update the analysis in real-time
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
  
  // Excluded ranges functionality
  const addExcludeRangeBtn = document.getElementById('add-exclude-range-btn');
  if (addExcludeRangeBtn) {
    addExcludeRangeBtn.addEventListener('click', () => {
      const startInput = document.getElementById('new-exclude-start');
      const endInput = document.getElementById('new-exclude-end');
      
      if (!startInput.value || !endInput.value) {
        alert('Please enter both start and end dates');
        return;
      }
      
      const startDate = new Date(startInput.value);
      const endDate = new Date(endInput.value);
      
      if (endDate < startDate) {
        alert('End date must be after start date');
        return;
      }
      
      // Get current excluded ranges
      chrome.storage.local.get(['excludedRanges'], (result) => {
        const excludedRanges = result.excludedRanges || [];
        excludedRanges.push({
          start: startInput.value,
          end: endInput.value
        });
        
        // Save and update UI
        chrome.storage.local.set({ excludedRanges }, () => {
          // Refresh the excluded ranges list
          updateExcludedRangesList(excludedRanges);
          
          // Clear inputs
          startInput.value = '';
          endInput.value = '';
          
          // Recalculate
          recalculateAnalysis();
        });
      });
    });
  }
  
  // Function to update excluded ranges list
  function updateExcludedRangesList(excludedRanges) {
    const listContainer = document.getElementById('excluded-ranges-list');
    if (!listContainer) return;
    
    listContainer.innerHTML = excludedRanges.map((range, index) => `
      <div class="excluded-range-item" data-index="${index}" style="display: flex; align-items: center; gap: 10px; padding: 8px; background: white; border-radius: 5px; border: 1px solid #e0e0e0; margin-bottom: 8px;">
        <span style="flex: 1; font-size: 13px; color: #333;">${range.start} to ${range.end}</span>
        <button class="remove-range-btn" data-index="${index}" style="padding: 4px 12px; background-color: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">Remove</button>
      </div>
    `).join('');
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-range-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        removeExcludedRange(index);
      });
    });
  }
  
  // Function to remove an excluded range
  function removeExcludedRange(index) {
    chrome.storage.local.get(['excludedRanges'], (result) => {
      const excludedRanges = result.excludedRanges || [];
      excludedRanges.splice(index, 1);
      
      chrome.storage.local.set({ excludedRanges }, () => {
        updateExcludedRangesList(excludedRanges);
        recalculateAnalysis();
      });
    });
  }
  
  // Initialize remove buttons for existing ranges
  document.querySelectorAll('.remove-range-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      removeExcludedRange(index);
    });
  });
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
  // Select all table rows on the page
  const tableRows = document.querySelectorAll("table tr");
  
  if (tableRows.length === 0) {
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
          }
        }
      }
    }
  }

  // Helper function to count excluded days within a date range
  function countExcludedDays(rangeStart, rangeEnd, excludedRanges) {
    let excludedDays = 0;
    const msPerDay = 86400000;
    
    excludedRanges.forEach(excluded => {
      const excludeStart = new Date(excluded.start);
      const excludeEnd = new Date(excluded.end);
      
      // Find overlap between the range and excluded range
      const overlapStart = new Date(Math.max(rangeStart.getTime(), excludeStart.getTime()));
      const overlapEnd = new Date(Math.min(rangeEnd.getTime(), excludeEnd.getTime()));
      
      if (overlapStart <= overlapEnd) {
        // Add 1 to include both start and end days
        const daysInOverlap = Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / msPerDay) + 1;
        excludedDays += daysInOverlap;
      }
    });
    
    return excludedDays;
  }

  // Get excluded ranges from storage
  let excludedDaysInPast = 0;
  let excludedDaysInFuture = 0;
  let excludedDaysTotal = 0;
  
  // This will be populated from storage
  chrome.storage.local.get(['excludedRanges'], (storageResult) => {
    const excludedRanges = storageResult.excludedRanges || [];
    
    // Calculate timings
    const currentDate = new Date();
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const msPerDay = 86400000;
    const totalDaysPassed = (currentDate.getTime() - startDateObj.getTime()) / msPerDay;
    const totalDaysLeft = (endDateObj.getTime() - currentDate.getTime()) / msPerDay;
    const totalDaysInYear = (endDateObj.getTime() - startDateObj.getTime()) / msPerDay;
    
    // Calculate excluded days
    excludedDaysInPast = countExcludedDays(startDateObj, currentDate, excludedRanges);
    excludedDaysInFuture = countExcludedDays(currentDate, endDateObj, excludedRanges);
    excludedDaysTotal = countExcludedDays(startDateObj, endDateObj, excludedRanges);
    
    // Adjust for excluded days
    const daysPassed = totalDaysPassed - excludedDaysInPast;
    const daysLeft = totalDaysLeft - excludedDaysInFuture;
    const daysInYear = totalDaysInYear - excludedDaysTotal;
    
    continueAnalysis(daysPassed, daysLeft, daysInYear);
  });
  
  function continueAnalysis(daysPassed, daysLeft, daysInYear) {

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
  });

  function numToDollar(number) {
    const dollar = (Math.sign(number) >= 0 ? "" : "-") + "$" + Math.abs(number).toFixed(2)
    return dollar.localeCompare("-$NaN")?dollar:"N/A";
  }

  // Calculate daily spending for the last 30 days
  function calculateDailySpending() {
    const dailySpending = {};
    const today = new Date();
    
    // Initialize last 30 days with 0 spending
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailySpending[dateKey] = 0;
    }
    
    // Scan through transactions and sum spending per day
    let currentDate = null;
    for (let i = 0; i < tableRows.length; i++) {
      const row = tableRows[i];
      const cells = row.querySelectorAll('td');
      
      // Check if this is a date group row (has colspan attribute)
      if (cells.length === 1 && cells[0].hasAttribute('colspan')) {
        // Parse date from format like "Wed. September 24th, 2025"
        const dateText = cells[0].textContent.trim();
        const dateMatch = dateText.match(/(\w+\.\s+)?(\w+)\s+(\d+)(?:st|nd|rd|th)?,\s+(\d+)/);
        if (dateMatch) {
          const monthName = dateMatch[2];
          const day = dateMatch[3];
          const year = dateMatch[4];
          currentDate = new Date(`${monthName} ${day}, ${year}`);
        }
      } else if (cells.length >= 5 && currentDate) {
        // This is a transaction row: Location, Amount, Balance, Tender, Transaction
        const amountText = cells[1].textContent.trim(); // Amount column
        const amount = parseFloat(amountText.replace('$', ''));
        const transactionType = cells[4].textContent.trim(); // Transaction type
        
        const dateKey = currentDate.toISOString().split('T')[0];
        
        if (Object.hasOwn(dailySpending, dateKey) && transactionType === 'Sale') {
          // Count all Sale transactions (positive amounts = spending)
          if (amount > 0) {
            dailySpending[dateKey] += amount;
          }
        }
      }
    }
    
    return dailySpending;
  }
  
  const dailySpendingData = calculateDailySpending();

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
      margin: 20px 0 40px 0;
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
        font-weight: bold;
      ">Spending Analysis</h2>
      
      <div style="margin-bottom: 30px;">
        <h3 style="
          text-align: center;
          color: #4f2683;
          font-size: 18px;
          font-family: Arial, sans-serif;
        ">Daily Spending - Last 30 Days</h3>
        <div style="display: flex; justify-content: center;">
          <canvas id="spending-chart" width="1600" height="600" style="max-width: 100%; width: 800px; height: 300px;"></canvas>
        </div>
      </div>
      
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
    
    // Draw the spending chart
    drawSpendingChart(dailySpendingData);
  }
  } // End of continueAnalysis function
}

// Function to draw the spending chart
function drawSpendingChart(dailySpendingData) {
  const canvas = document.getElementById('spending-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 120; // Doubled for higher resolution
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Get data points
  const dates = Object.keys(dailySpendingData).sort();
  const values = dates.map(date => dailySpendingData[date]);
  const maxValue = Math.max(...values, 10); // Minimum scale of $10
  
  // Draw pure white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  
  // Draw grid lines with alternating subtle backgrounds
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const y = padding + (chartHeight / ySteps) * i;
    const value = maxValue - (maxValue / ySteps) * i;
    
    // Alternating background stripes for better readability
    if (i % 2 === 0 && i < ySteps) {
      ctx.fillStyle = 'rgba(79, 38, 131, 0.02)';
      const nextY = padding + (chartHeight / ySteps) * (i + 1);
      ctx.fillRect(padding, y, chartWidth, nextY - y);
    }
    
    // Grid line
    ctx.strokeStyle = i === ySteps ? '#4f2683' : '#e8e8e8';
    ctx.lineWidth = i === ySteps ? 4 : 2; // Scaled for higher resolution
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    // Y-axis label with better styling
    ctx.fillStyle = '#555';
    ctx.font = 'bold 22px Arial'; // Scaled for higher resolution
    ctx.textAlign = 'right';
    ctx.fillText('$' + value.toFixed(2), padding - 20, y + 8);
  }
  
  // Draw X-axis labels (show every 5 days) with improved styling
  ctx.font = '22px Arial'; // Scaled for higher resolution
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  for (let i = 0; i < dates.length; i += 5) {
    const x = padding + (chartWidth / (dates.length - 1)) * i;
    const date = new Date(dates[i]);
    const label = (date.getMonth() + 1) + '/' + date.getDate();
    ctx.fillText(label, x, height - padding + 40);
  }
  
  // Draw gradient fill under the line
  if (values.length > 0) {
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, 'rgba(79, 38, 131, 0.2)');
    gradient.addColorStop(0.5, 'rgba(79, 38, 131, 0.1)');
    gradient.addColorStop(1, 'rgba(79, 38, 131, 0.02)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    
    for (let i = 0; i < values.length; i++) {
      const x = padding + (chartWidth / (values.length - 1)) * i;
      const y = padding + chartHeight - (values[i] / maxValue) * chartHeight;
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.closePath();
    ctx.fill();
  }
  
  // Draw the line chart without shadow
  ctx.strokeStyle = '#4f2683';
  ctx.lineWidth = 6; // Scaled for higher resolution
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  
  for (let i = 0; i < values.length; i++) {
    const x = padding + (chartWidth / (values.length - 1)) * i;
    const y = padding + chartHeight - (values[i] / maxValue) * chartHeight;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  
  // Reset shadow for data points
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  
  // Draw data points with gradient and hover effect
  for (let i = 0; i < values.length; i++) {
    const x = padding + (chartWidth / (values.length - 1)) * i;
    const y = padding + chartHeight - (values[i] / maxValue) * chartHeight;
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI); // Scaled for higher resolution
    ctx.fillStyle = 'rgba(79, 38, 131, 0.2)';
    ctx.fill();
    
    // Inner dot with gradient
    const dotGradient = ctx.createRadialGradient(x, y, 0, x, y, 7);
    dotGradient.addColorStop(0, '#663399');
    dotGradient.addColorStop(1, '#4f2683');
    
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI); // Scaled for higher resolution
    ctx.fillStyle = dotGradient;
    ctx.fill();
    
    // White center highlight
    ctx.beginPath();
    ctx.arc(x - 1, y - 1, 2, 0, 2 * Math.PI); // Scaled for higher resolution
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fill();
  }
  
  // Draw axis labels with better styling
  ctx.fillStyle = '#333';
  ctx.font = 'bold 26px Arial'; // Scaled for higher resolution
  ctx.textAlign = 'center';
  ctx.fillText('Date', width / 2, height - 20);
  
  ctx.save();
  ctx.translate(30, height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = 'bold 26px Arial'; // Scaled for higher resolution
  ctx.fillText('Spending ($)', 0, 0);
  ctx.restore();
  
  // Draw border around chart area
  ctx.strokeStyle = '#d0d0d0';
  ctx.lineWidth = 2; // Scaled for higher resolution
  ctx.strokeRect(padding, padding, chartWidth, chartHeight);
}

// Initialize when page loads
waitForPageLoad().then(() => {
  // Small delay to ensure page is fully rendered
  setTimeout(() => {
    injectCalculatorForm();
    checkForUpdates();
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
  const startDate = document.getElementById('injected-startDate')?.value || '2026-09-01';
  const endDate = document.getElementById('injected-endDate')?.value || '2027-04-30';
  
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