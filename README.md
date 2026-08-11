# UWO Mealplan Calculator

A Chrome extension that helps Western University students track and manage their meal plan spending.

## Overview

This extension calculates your daily meal spending and provides projections for your remaining balance at the end of the academic year. See how to better manage your spending and get insights before topping up.

## Key Features

- **Dynamic Tender Detection**: Automatically detects all tender types from your transaction history (Residence Dollars, Flex Dollars, Campus Dollars, etc.)
- **Real-time Analysis**: Spending analysis is generated automatically when you visit your meal plan history page
- **Daily Spending Tracking**: See your average daily spending for each tender type
- **Projected Balance**: View your projected remaining balance by the end of the academic year
- **Target Spending Recommendations**: Get daily spending targets to help you finish on budget
- **Visual Chart**: Interactive 30-day spending chart shows your daily spending patterns
- **Persistent Settings**: Your starting balances and preferences are saved automatically
- **Smart Defaults**: ResDlrs starts at $3,550 and Flex at $550 by default
- **Flexible Time Periods**: Calculate based on past month data or all-time spending
- **Easy to Use**: Designed specifically for Western University students with a clean, intuitive interface

## Installation

1. **From Chrome Web Store**  
   [UWO Mealplan Calc on Chrome Web Store](https://chromewebstore.google.com/detail/uwo-mealplan-calc/ligfhpfnfnmkmoloelfpcjpeajifkmpo)  
   - Click "Add to Chrome" and follow the prompts.

2. **Manual Installation (for development)**  
   - Download or clone this repository.
   - Open Chrome and go to `chrome://extensions/`.
   - Enable "Developer mode" (top right).
   - Click "Load unpacked" and select the extension directory.

## How to Use

1. Navigate to your UWO meal plan history page: `https://mealplan.uwo.ca/topup/history`
2. The calculator will automatically inject into the page and run an analysis
3. Click the **Settings** button to:
   - Adjust your starting balances for each tender
   - Change the academic year start/end dates
   - Toggle between past month or all-time calculations
4. View your spending analysis including:
   - Daily spending average
   - Projected remainder by year end
   - Daily budget needed to finish on target
5. Check the 30-day spending chart to visualize your spending patterns

## How It Works

The extension:

1. Scans your transaction table to detect all tender types
2. Calculates your current balance and spending patterns
3. Projects your balance at the end of the academic year
4. Provides recommendations for daily spending targets
5. Displays a visual chart of your last 30 days of spending

## Settings

- **Year Start Date**: Default is September 1, 2026
- **Year End Date**: Default is April 30, 2027
- **Starting Balances**: Set your initial balance for each tender type
- **Past Month/All Time Toggle**: Choose whether to calculate based on the last 30 days or since the start of the year

## Privacy

This extension:

- Only runs on `mealplan.uwo.ca` pages
- Does not collect or transmit any personal data
- Stores settings locally in your browser using Chrome's storage API
- All calculations are performed locally on your device

## Technical Details

- **Manifest Version**: 3
- **Permissions**: Storage (for saving preferences)
- **Content Script**: Automatically injected on meal plan history pages
- **Storage**: Uses Chrome's local storage API for persistence

## Contributing

Feel free to open issues or submit pull requests if you have suggestions for improvements!

## License

See [LICENSE](LICENSE) file for details.

## Disclaimer

This is an unofficial tool created by students for students. It is not affiliated with or endorsed by Western University or Aramark.

---

**Made for Western University students by Western University students** 💜💛
