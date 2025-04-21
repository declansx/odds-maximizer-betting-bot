# SX Bet Odds Maximizer Bot

A sophisticated betting bot designed to maximize profits by strategically placing and managing bets on the SX.bet platform. The bot monitors betting markets in real-time, identifies favorable odds, and automatically places orders based on user-defined parameters.

## Features

- **Real-time market monitoring** via WebSocket connection with automatic fallback to polling
- **Smart order management** that adjusts to changing market conditions
- **Risk management** with configurable thresholds for vig and liquidity
- **Position tracking** with fill status updates and order adjustments
- **Interactive CLI** for creating and managing betting positions
- **Sports betting support** across multiple leagues and markets (moneyline, spread, totals)
- **Configurable premium settings** to optimize bet placement
- **Automatic order cancellation** when risk thresholds are exceeded

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
   - Select a fixture
   - Select a market
   - Select an outcome
   - Configure position settings (max bet size, premium percentage, etc.)

### Managing Positions

Select "View active positions" from the main menu to:
- View current position status
- Pause/resume positions
- Update position settings
- Close positions

## Architecture

- **api/** - API integration with SX.bet (orders, sports data, WebSocket)
- **cli/** - Command-line interface components
- **config/** - Application constants and settings
- **core/** - Core business logic (market monitoring, position management, order handling)
- **utils/** - Utility functions for odds calculations, logging, etc.

## Risk Management

The bot includes sophisticated risk management features:
- Configurable maximum vig tolerance
- Minimum liquidity thresholds
- Dynamic order adjustment based on market conditions
- Automatic order cancellation when risk parameters are exceeded

## License

MIT 