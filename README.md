# SX Bet Odds Maximizer Bot

An automated sports betting bot for the SX Bet peer-to-peer betting exchange, built entirely using AI. The bot posts your odds by posting maker orders at a configurable premium above market, dynamically managing risk, and providing a CLI for position management.

---

## Table of Contents
- [Overview](#overview)
- [How the Bot Was Built](#how-the-bot-was-built)
- [Features](#features)
- [Setup & Installation](#setup--installation)
- [Configuration](#configuration)
- [Usage Guide & User Flow](#usage-guide--user-flow)
  - [Bot Startup](#bot-startup)
  - [Creating a Position](#creating-a-position)
  - [Market Monitoring & Order Management](#market-monitoring--order-management)
  - [Viewing and Managing Positions](#viewing-and-managing-positions)
  - [Exiting the Bot](#exiting-the-bot)
- [Sample Calculations & Scenarios](#sample-calculations--scenarios)
- [Logging](#logging)
- [File Structure](#file-structure)
- [Dependencies](#dependencies)
- [Context & Documentation](#context--documentation)

---

## Overview

Odds Maximizer Bot Demo on Youtube ⬇️

[Watch the SX Network Overview on YouTube](https://www.youtube.com/watch?v=LbiLBoE51xQ&ab_channel=SXNetwork)

The SX Bet Odds Maximizer Bot is a CLI-driven tool that automates the process of posting and managing maker orders on SX Bet. It:
- Finds the best available taker odds for your chosen outcome.
- Applies a configurable premium (e.g., 10% better than best available odds) and posts a limit order.
- Monitors the orderbook in real time, updating your limit order as the odds change to keep your order aligned with the premium, and cancelling orders if risk thresholds (vig, minimum liquidity) are exceeded.
- Provides an interactive CLI for creating, editing, and closing positions.

---

## How the Bot Was Built

This bot was coded entirely using AI. I've included the prompt, standalone modules for API calls, and supporting context files used to build the bot in this repository (see `context/prompt.md`).

Disclaimer: This is for educational purposes only. Use the bot at your own risk.

---

## Features
- **Real-time market monitoring** (WebSocket + polling fallback)
- **Premium-based order posting** (configurable % above market)
- **Dynamic order management** (auto-cancel/repost on odds change)
- **Risk controls** (vig and liquidity thresholds)
- **Concurrency-safe** (per-position operation queues)
- **Position tracking** (fill %, order status, logs)
- **Interactive CLI** (create, view, edit, close positions)
- **Detailed logging** (per-position log files, no CLI interference)

---

## Setup & Installation

### Prerequisites
- Node.js v18+
- An Ethereum wallet private key (for posting/cancelling orders)
- SX Bet API key

### Installation
1. **Clone the repository:**
   ```sh
   git clone <your-repo-url>
   cd odds-maximizer-bot
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   PRIVATE_KEY=your_ethereum_private_key
   SX_BET_API_KEY=your_sx_bet_api_key
   ```

---

## Configuration
- All core settings (odds ladder, retry logic, timeouts, default CLI values) are in `src/config/constants.js`.
- You can adjust CLI defaults (premium, vig, liquidity, min bet sizes) in the `CLI` section of that file.

---

## Usage Guide & User Flow

### Bot Startup
Start the bot with:
```sh
npm start
```
- The bot loads your config, validates keys, and connects to SX Bet's WebSocket.
- All logs are written to files in `logs/` (no console noise).
- The CLI menu appears:
  1. Create a new position
  2. View active positions
  3. Exit

### Creating a Position
1. **Select sport, league, fixture, and market:**
   - The CLI guides you through each step, only showing fixtures in the next 48 hours.
2. **Choose your outcome** (e.g., "Lakers -9.5").
3. **Configure position settings:**
   - Max fill ( bet size in USDC units)
   - Premium % (e.g., 10)
   - Max vig threshold (e.g., 5%)
   - Min liquidity threshold (e.g., 500 USDC)
   - Min bet size to consider for odds/vig calculations
4. **Position is created:**
   - The bot fetches the orderbook, calculates best taker odds, checks risk conditions (vig + liquidity), and posts your order at the correct premium.
   - All actions are logged to a dedicated file (e.g., `logs/position_<id>.log`).

### Market Monitoring & Order Management
- The bot maintains an in-memory orderbook for each position, updating via WebSocket (or polling fallback).
- **If best taker odds change:**
  - The bot cancels your order and reposts at the new premium odds.
- **If risk thresholds are breached (vig/liquidity):**
  - The bot cancels your order and pauses posting until safe.
- **If your order is filled:**
  - The bot updates your fill %, logs the event, and posts a new order for the remaining amount (if not fully filled).
- **All actions are concurrency-safe** (no race conditions, no duplicate orders).

### Viewing and Managing Positions
- Select "View active positions" from the CLI.
- See all open positions, with:
  - Market, outcome, bet size, fill %, current odds, risk status, and settings.
- For each position:
  - **Edit:** Change bet size, premium, or risk settings. The bot will update/cancel/repost orders as needed.
  - **Close:** Cancels all orders, stops monitoring, and removes the position.

### Exiting the Bot
- Select "Exit" from the CLI.
- The bot cancels all active orders, unsubscribes from all markets, closes the WebSocket, and exits cleanly.

---

## Sample Calculations & Scenarios

All calculations are shown using percentage odds format to align with the SX Bet API. 

### Odds & Premium Example
- **Best taker odds:** 0.40 (implied, i.e., 40%)
- **Premium:** 10%
- **Order odds posted:** Best Taker Odds × (1 - (1 / Premium)) = 0.40 × (1 - 0.10) = 0.36 (36%)
- **Odds ladder rounding:** All odds are rounded to the nearest 0.25 step ladder before posting to align with the SX Bet API requirements.

### Vig Calculation
- **Best taker odds outcome 1:** 0.55
- **Best taker odds outcome 2:** 0.52
- **Vig:** (0.55 + 0.52) - 1 = 0.07 (7%)

### Liquidity Calculation
- **Sum all available USDC for each outcome** (ignoring your own orders and those below min bet size).

---

## Logging
- All logs are written to `logs/`.
- Each position has its own log file: `logs/position_<id>.log`.
- General logs: `logs/combined.log`, errors: `logs/error.log`.
- No logs interfere with the CLI (all user feedback is via unobtrusive CLI messages).

---

## File Structure

```
project-root/
│
├── src/
│   ├── index.js                # Main entrypoint: loads config, starts CLI, handles shutdown
│   ├── cli/
│   │   ├── index.js            # CLI menu and navigation
│   │   ├── createPosition.js   # CLI flow for creating new positions
│   │   ├── viewPositions.js    # CLI flow for viewing/editing/closing positions
│   │   └── utils.js            # CLI display utilities (formatting, spinners, etc.)
│   ├── core/
│   │   ├── positionManager.js  # In-memory position state, concurrency, and order logic
│   │   ├── orderManager.js     # Posting/cancelling orders with retry and validation
│   │   ├── marketMonitor.js    # Real-time orderbook monitoring, risk checks, alerts
│   │   └── riskManager.js      # (Placeholder for advanced risk logic)
│   ├── api/
│   │   ├── fetchSports.js      # API calls for sports, leagues, fixtures, markets
│   │   ├── orderFetcher.js     # Fetches and groups maker orders
│   │   ├── orderPoster.js      # Posts new maker orders (with signing)
│   │   ├── orderCanceller.js   # Cancels maker orders (with signing)
│   │   └── websocket.js        # WebSocket connection and orderbook subscriptions
│   ├── utils/
│   │   ├── logger.js           # Logging utilities (per-position, CLI, general)
│   │   ├── oddsUtils.js        # Odds conversions, rounding, formatting
│   │   ├── orderUtils.js       # Bet size conversions, taker odds, liquidity
│   │   ├── dateUtils.js        # Date/time formatting and helpers
│   │   └── telegramNotifier.js # (Optional) Telegram fill notifications
│   └── config/
│       ├── constants.js        # All core constants and CLI defaults
│       └── settings.js         # (Placeholder for user overrides)
│
├── context/
│   ├── prompt.md               # The AI prompt used to generate this bot
│   ├── sx-bet-dev-manual-revised.md # SX Bet API docs
│   ├── sx_bet_full_sections.md # Additional SX Bet API details
│   └── standalone/           # Standalone API modules and utilities
│       ├── fetchSports.js      # Fetches sports data from the API
│       ├── oddsUtils.js        # Odds conversion and utility functions
│       ├── orderCanceller.js    # Cancels orders via the API
│       ├── orderFetcher.js      # Fetches orders from the API
│       ├── orderPoster.js       # Posts new orders to the API
│       ├── utils.js            # General utility functions
│       └── websocket.js        # WebSocket connection and handlers
│
├── logs/                       # All log files (per-position, combined, error)
├── .env                        # Your API keys and private key (not committed)
├── package.json                # Dependencies and scripts
└──  README.md                   # (Old README, see README_NEW.md for latest)
```

---

## Dependencies
- See `package.json` for full list. Key dependencies:
  - `ethers` (signing, BigInt math)
  - `ably` (WebSocket)
  - `inquirer` (CLI)
  - `chalk` (CLI colors)
  - `winston` (logging)
  - `node-fetch`, `axios` (API calls)
  - `@metamask/eth-sig-util` (EIP-712 signing)

---

## Context & Documentation
- The `context/` folder contains the original AI prompt, all SX Bet API docs, and a set of standalone API modules in `context/standalone/` for interacting with the SX Bet API.
- See `context/prompt.md` for a full breakdown of requirements, user flows, and sample calculations.
- All code is modular and well-commented for easy extension.

---

## License
MIT 