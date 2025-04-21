# SX Bet Odds Maximizer Bot

A sophisticated betting bot designed for the SX.bet platform, a peer-to-peer betting exchange. The bot automatically maximizes profits by monitoring real-time market conditions, strategically placing maker orders at favorable odds, and dynamically managing positions based on market changes.

## Features

- **Real-time market monitoring** via WebSocket connection with automatic fallback to polling
- **Intelligent order management** that dynamically adjusts to changing market conditions
- **Premium-based betting strategy** that places orders at configurable percentages above market rates
- **Comprehensive risk management** with configurable thresholds for vigorish (vig) and liquidity
- **Concurrent operation handling** with proper queue implementation to prevent race conditions
- **Position tracking** with fill status updates and automatic order adjustments
- **Interactive CLI** for creating and managing betting positions
- **Sports betting support** across multiple leagues and markets (moneyline, spread, totals)
- **Robust error handling** with sensible retry logic for API operations

## How It Works

The bot operates on a simple yet powerful principle:

1. It fetches the best available taker odds for your desired outcome
2. Applies your specified premium (e.g., 10% premium means posting at 10% lower implied odds)
3. Posts maker orders at these premium-adjusted odds
4. Continuously monitors the orderbook for:
   - Changes to best taker odds (cancels and reposts orders to maintain your premium)
   - Risk threshold violations (vig and liquidity)
   - Order fills (tracking your position status)

## Technical Details

### Odds Calculation

- **Best Taker Odds**: For outcome 1, finds the maker with highest implied odds betting on outcome 2. For outcome 2, finds the maker with highest implied odds betting on outcome 1.
- **Premium Application**: Multiplies the best taker odds by (1 - premium/100). Example: If best taker odds are 0.4 and premium is 10%, the bot posts at 0.4 * 0.9 = 0.36.
- **Odds Rounding**: All odds are rounded to the nearest 0.25% step on the odds ladder before posting.

### Market Metrics

- **Vigorish (Vig)**: Calculated as (lowest taker odds outcome 1 + lowest taker odds outcome 2) - 1. Example: If lowest taker odds are 0.55 for outcome 1 and 0.52 for outcome 2, vig is (0.55 + 0.52 - 1) = 0.07 or 7%.
- **Market Liquidity**: Calculated by summing the amount of USDC a taker can fill for each order on an outcome.
- **Minimum Bet Size Thresholds**: Separate configurable thresholds for considering orders in odds and vig calculations.

### Concurrency Control

- Implements operation queues for each position to prevent race conditions
- Ensures market updates and order operations are processed sequentially
- Prevents duplicate order operations with proper state tracking

## Requirements

- Node.js (v14+)
- Ethereum wallet private key
- SX.bet API key

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/declansx/odds-maximizer-betting-bot.git
   cd odds-maximizer-betting-bot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PRIVATE_KEY=your_ethereum_private_key
   SX_BET_API_KEY=your_sx_bet_api_key
   ```

## Usage

Start the bot with:
```
node src/index.js
```

### Creating a Position

1. Select "Create a new position" from the main menu
2. Follow the interactive prompts to:
   - Select a sport
   - Select a league
   - Select a fixture (events in the next 48 hours)
   - Select a market (moneyline, spread, or totals)
   - Select an outcome to bet on
   - Configure position settings:
     - Maximum bet size in USDC
     - Premium percentage (how much above market to post orders)
     - Maximum vig tolerance
     - Minimum liquidity tolerance
     - Minimum bet size for odds calculation
     - Minimum bet size for vig calculation

### Managing Positions

Select "View active positions" from the main menu to:
- View detailed position information:
  - Market details (team names)
  - Selected outcome
  - Bet size and current odds
  - Fill percentage
  - Current best taker odds
  - Market status (risk metrics)
- Modify positions:
  - Close positions (cancels orders and stops monitoring)
  - Edit position settings (automatically updates orders as needed)

## Architecture

- **api/** - API integration with SX.bet (orders, sports data, WebSocket)
- **cli/** - Command-line interface components
- **config/** - Application constants and settings
- **core/** - Core business logic (market monitoring, position management, order handling)
- **utils/** - Utility functions for odds calculations, logging, etc.

## Risk Management

The bot includes sophisticated risk management features:
- Configurable maximum vig tolerance
- Minimum liquidity thresholds for each outcome
- Dynamic order adjustment based on market conditions
- Automatic order cancellation when risk parameters are exceeded
- Pausing and resuming order placement based on risk status

## Logging

- Separate logging files for each position
- Detailed logs including position creation, orderbook events, market metrics, and API operations
- Clean CLI display with unobtrusive success/fail responses

## Context Files

The `context` directory contains the original prompt and supporting documentation used to create this bot:

- **prompt.md**: The original prompt detailing the requirements and specifications for the odds maximizer bot.
- **sx-bet-dev-manual-revised.md**: Supplementary information for SX Bet API, including response structures and implementation guidelines.
- **sx_bet_full_sections.md**: Additional detailed documentation on the SX Bet API functionality.

These files are included for transparency and to provide context on the bot's design and implementation decisions. They may also serve as helpful reference material for anyone looking to understand or modify the codebase.

## License

MIT 