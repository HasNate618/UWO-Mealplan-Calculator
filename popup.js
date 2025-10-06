// This popup is now minimal since all functionality is handled by the content script
// The extension automatically injects the calculator into the UWO meal plan page

document.addEventListener('DOMContentLoaded', () => {
  // Simple message to inform users that the extension works automatically
  const messageDiv = document.createElement('div');
  messageDiv.innerHTML = `
    <div style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
      <h3 style="color: #4f2683; margin-bottom: 15px;">UWO Mealplan Calculator</h3>
      <p style="margin-bottom: 10px;">The calculator automatically appears on the meal plan history page.</p>
      <p style="font-size: 14px; color: #666;">
        Visit: <a href="https://mealplan.uwo.ca/topup/history" target="_blank" style="color: #4f2683;">
          mealplan.uwo.ca/topup/history
        </a>
      </p>
    </div>
  `;
  document.body.appendChild(messageDiv);
});
