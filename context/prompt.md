# Objective
You're an expert JavaScript developer. Thoroughly review the attached API docs and standalone modules/sample code for the core API operations, as well as each of the example flows/processes. Your task is to create a sports betting bot for the SX Bet API according to the specifications below. Provide the complete file structure and production-ready code for every file needed.

# Coding Guidelines
- Simple and robust: your task is to create a robust implementation of all features with the least amount of code possible.
- Whenever possible, reuse code from the attached standalone modules.
- BigInt Usage: Use BigInt explicitly for monetary values (e.g., USDC stakes) and odds calculations. Convert API numeric strings to BigInt with BigInt(value).
- Stick to a simple project structure.
- Only deliver production-ready code. Do not leave any functions or pathways undefined or incomplete. Ensure there is no circular logic.
- Error handling: gracefully handle errors with sensible retry logic
- Use a consistent import/export structure with ES Modules.
- Module modifications: you may change, add, or edit modules as needed. Write the code for every file that needs to be created.

# General Bot Description
The Odds Maximizer Bot operates on SX Bet, a peer-to-peer betting exchange,
The bot:
- Fetches the best available taker odds for my desired outcome.
- Applies a premium (e.g. 10% premium means post at 10% lower implied odds, multiplying the lowest available taker odds on my desired outcome by 90% or (1 - premium %)) and posts the order
- Monitors the orderbook for changes to the lowest (best) taker odds, cancels and reposts my orders when changes occur to keep my orders at the correct premium
- Monitors the orderbook for risk violations, cancels orders when violated and awaits reposting until conditions are met.
Note: "Top odds" or "best odds" refer to the lowest implied odds (smaller odds number = higher payout).

# CLI
On startup the bot should display an easy-to-navigate CLI menu allowing the user to 1) create a new position, 2) view positions 3) exit
- Create a new position: this details an outcome that a user wants to build a stake on by placing maker orders at above market odds that other users can fill as a taker. If the user chooses to create a new position, the CLI will guide the user through selecting a sport, league, fixture, and finally a market (use the fetchSports flow, passing the ID to the next function as the user filters through the menu, make sure to display only fixtures beginning in the next 48 hours, and all the available markets after selecting a fixture).
- Then, they should enter their position settings including: desired bet maximum fill in USDC, the premium (% above market to post the orders at), the max vig tolerance for the position, the minimum liquidity tolerance for the position, and the minimum bet size to consider when calculating best odds and market vig (different values for each).
- View active positions - this details the current positions that have not yet been filled or closed. If the user chooses to view positions, the CLI should display the market (team names), outcome (outcome name), bet size (USDC), odds (for any active orders), fill %, current best taker odds, all the settings, the market status (risk wise), and my active order if there is one. They should have the option to A) close the position permanently, cancelling any active orders for the positions and stopping monitoring B) edit the position (bet size or any settings)
- Exit - if the user chooses to exit the bot, the program should cancel all active orders for the user.

Analyze all the code you write and any reused code from the standalone modules to ensure that nothing is printed to the console that will interfere with the CLI. Use Inquirer.

# Market Monitoring
To avoid making repeated API calls, the bot should create an in-memory 'taker orderbook' object for each active position (get current orders with one api call, and update the in-memory orderbook by subscribing to websocket channels). Calling the /orders endpoint returns MAKER orders only, we will need to derive what is available for the taker. Takers receive the inverse odds of the maker, like so:

Calculation for best (lowest) available taker odds on my desired outcome: You can derive the (lowest) best taker odds as: [1 - highest implied maker odds for any order of the OPPOSITE outcome]. If my position is created for a bet on outcome 1 and there are active maker orders for implied odds of 0.4, 0.5, and 0.6 on outcome 2, the best (lowest) available taker odds on outcome 1 (my desired outcome) are derived with 1 - 0.6 = 0.4.

When changes to the orderbook occur that require action (new lowest/best taker odds on my position outcome, vig exceeded, liquidity below threshold, my order has been filled), alerts should be sent to other modules.

When a position is created, the odds monitoring module should first initialize the in-memory taker orderbook by fetching a snapshot of the active maker orders on the market. It should then derive the lowest (best) available taker odds on my selected outcome for the position:

Once the best taker odds on my outcome are derived, the position management module should be alerted to post the initial order on that outcome. It will need to provide the top odds available for a taker on my desired outcome so the position management module can apply my premium and post my order at the correct odds.

After initializing the in-memory taker orderbook with a snapshot of the active orders, the program should update the in-memory taker orderbook as messages arrive from the order_book websocket channel, which will send immediate updates for cancelled maker orders, fills, or new maker orders posted.

This module needs to monitor and send immediate alerts for changes to three key metrics on the orderbook: best available taker odds on my desired outcome, market vig, and market liquidity. *Important: only consider orders for > than the minimum calculation bet size set in the positions settings when deriving the vig and best available taker odds. Each has a separate setting for minimum bet size to consider in each calculation, respectively. IGNORE ORDERS FROM MY MAKER ADDRESS WHEN CALCULATING THESE METRICS.

Market vig: you can derive the vigorish on a market by adding lowest available taker odds (implied format) on outcome 1 and outcome 2 and subtracting 1. For example, if the lowest (best) available taker odds outcome 1 = 0.55 and outcome 2 = 0.52, vigorish is calculated as (lowest taker odds outcome 1 + best taker odds outcome 2) - 1)), or (0.55 + 0.52 - 1) = 0.07 or 7%.

Market liquidity: you can derive the liquidity on each outcome of a market by summing the amount of USDC a taker can fill each order for on an outcome.

If the market liquidity drops below the minimum liquidity threshold or the vig exceeds the maximum vig threshold for the specific position, the bot should alert the position management module that risk thresholds have been exceeded so that it can cancel my orders. It should also pause posting new orders so that the program does not attempt to post or update orders while risk thresholds are breached. If either threshold is later met again, the module should alert that risk thresholds are no longer exceeded and it is safe to repost orders.

If the lowest (best) available taker odds (implied format) for the desired outcome of the specific position change, the bot should immediately alert the position management module with the new best available taker odds.

Additionally, this module needs to alert the position management module any time one of my orders is filled with the amount it has been filled for. Any fill made to my orders' order hash will come through the websocket channel, listen here for fills.

# Active position management
After the initial order has been posted, the bot will need to dynamically manage and update my orders as market conditions change.

Posting the initial order: when the module receives an alert that a new position is created, it should it should calculate the odds to post the order at and trigger posting the first order.

Updating order odds: when the program receives an alert that the lowest (best) taker odds on my desired have changed, it should immediately trigger cancelling of the existing order, calculate the odds that the new order should be posted with, round the odds to the nearest 0.25% step ladder, and trigger posting of the new order on my desired outcome.

Canceling orders: when the program receives an alert that market vig has exceeded the threshold or liquidity has dropped below the threshold for the position, the program should immediately trigger cancellation of any active orders on the market and await an additional alert that risk thresholds are no longer exceeded. Once the alert that risk thresholds are now OK is received, the module can trigger posting a new order.

Fill updates: when the program receives an alert that my active order has been filled (partially or fully), it should update the fill amount for my position, such that if the odds or risk conditions change in the future, the bot will only post an order for the remaining USDC bet size needed to reach my max fill for the position. If the order is >99% filled, we consider it complete.

Calculating Odds with Premium: take the best available taker odds for the desired outcome and multiply by (1 - premium / 100), where the premium is the percentage from the premium schedule. For example, if the best taker odds are 0.4 and the premium is 5%, the odds to post are 0.4 * (1 - 0.05) = 0.4 * 0.95 = 0.38. *Always ignore my orders (orders where my address is the maker) when calculating the best taker odds.

IMPORTANT: Implement proper concurrency control and state management to prevent race conditions:
- The bot must process market updates and order operations sequentially for each position. Implement a queue or locking mechanism to ensure operations for a single position cannot overlap.
- Add proper state tracking to prevent duplicate order operations. Before attempting to cancel an order, verify that it exists. Before posting a new order, ensure there isn't already an operation in progress.
- The bot must not under any circumstances create multiple simultaneous orders for the same position or attempt to post new orders while existing operations are still in progress.

Editing positions: if a position is edited through the CLI, the bot should evaluate whether the current order is posted correctly given the updates. If not, it should cancel the active order, and repost at updated odds/bet size.

# Logging
- Create separate log files for each position and record detailed logs including: position created, orderbook initialized, updates, to best taker odds, vig, liquidity for the orderbook, and all API calls + their response.
- Show unobtrusive success/fail responses to the following actions made in the terminal and clear them from the console after a few seconds: new position created or position closed. Do not print any other logs to the terminal as they will interfere with the CLI

Odds and Bet size formats, calculations and conversions
- odds from the API are specified as their implied probability in 10^20 format, e.g. 8391352143642350000. All calculations and monitoring for the bot should be done in readable implied format. To convert to a readable implied odds, divide by 10^20. 8391352143642350000 for example is 0.0839 or 8.39%.
- Bet sizes from the API are denoted in 10^6 units. All calculations for the bot should be done based on readable units for USDC, e.g 10000000 from API / 10^6 = 10 USDC.

# Standalone modules
The following modules have sample working code snippets for all the API calls and some conversions/calculations that can be reused/repurposed

## From fetchSports.js:
- fetchSports() - Fetching the available sports from the API
- fetchActiveLeaguesForSport() -fetching the leagues for a specific sport ID
- fetchFixturesForLeague() - fetching the fixtures for a specific league ID
- fetchMarketsForEvent() - For the active markets for a specific fixture (event ID)

## From orderFetcher.js:
- fetchOrders() - get a snapshot of the current MAKER orders on a market
- groupOrdersByOutcome() - To organize orders for analysis

## From orderPoster.js:
- postOrder() - To create and post new maker orders

## From orderCanceller.js:
- cancelOrders() - To cancel maker orders

## From oddsUtils.js:
- roundToNearestStep() - To round odds to the 0.25% ladder before posting
- checkOddsLadderValid() - To validate odds before posting
- apiOddsToReadable() - For calculations/conversions of odds

## From utils.js:
- toNominalAmount() - Converting between token units
- toImpliedOdds() - Odds conversion
- calculateTakerImpliedOdds() - For calculating taker odds based on maker odds
- calculateRemainingTakerSpace() - For tracking how much of my order has been filled or how much liquidity is available for a taker

## From websocket.js:
- initialize() - Set up websocket connection
- subscribeToOrderBook() - Monitor specific markets
- unsubscribeFromOrderBook() - Clean up when done
- isSubscribedToChannel() - Check status
- closeConnection() - Proper cleanup

Example Flow of Actions/Processes for the Odds Maximizer Bot

# Bot Initialization
### Action: The bot starts and initializes its dependencies.
### Process:
- Loads configuration (API keys, WebSocket endpoints, etc.).
- Establishes a WebSocket connection using initialize() from websocket.js.
- Sets up in-memory storage for positions and taker orderbooks.
- Initializes logging with separate log files for each position (to be created later).
- Ensures no console logs interfere with the CLI by redirecting all logs to files.
### Outcome: Bot is ready to display the CLI menu.

# CLI Menu Display
### Action: The bot displays the main CLI menu using Inquirer.
### Process:
- Options presented: 1) Create a new position, 2) View active positions, 3) Exit.
- User input is awaited.
### Outcome: User selects an option, e.g., "Create a new position."

# Creating a New Position
### Action: User selects "Create a new position" from the CLI.
### Process:
### Step 1: Fetch Sports:
- Calls fetchSports() from fetchSports.js to retrieve available sports.
- Displays sports in the CLI (e.g., Football, Basketball).
- User selects a sport (e.g., Football), storing the sport ID.
### Step 2: Fetch Leagues:
- Calls fetchActiveLeaguesForSport(sportId) with the selected sport ID.
- Displays active leagues (e.g., NFL, NCAAF).
- User selects a league (e.g., NFL), storing the league ID.
### Step 3: Fetch Fixtures:
- Calls fetchFixturesForLeague(leagueId) to get fixtures.
- Filters fixtures to only those starting within the next 48 hours.
- Displays fixtures (e.g., "Patriots vs. Jets - 2025-04-16").
- User selects a fixture, storing the event ID.
### Step 4: Fetch Markets:
- Calls fetchMarketsForEvent(eventId) to retrieve available markets (e.g., Moneyline, Spread, Over/Under).
- Displays markets and outcomes (e.g., "Patriots to Win", "Jets to Win").
- User selects an outcome (e.g., "Patriots to Win").
### Step 5: Enter Position Settings:
- Prompts user for:
  - Desired bet maximum fill (e.g., 100 USDC).
  - Premium percentage (e.g., 10%).
  - Max vig tolerance (e.g., 5%).
  - Minimum liquidity tolerance (e.g., 500 USDC).
  - Minimum bet size for odds calculation (e.g., 10 USDC).
  - Minimum bet size for vig calculation (e.g., 20 USDC).
- Validates inputs (e.g., positive numbers, valid percentages).
### Step 6: Store Position:
- Creates a new position object with the selected outcome, market ID, and settings.
- Assigns a unique position ID and initializes an empty taker orderbook for the market.
- Logs the position creation to a dedicated log file (e.g., position_.log).
### Outcome: Position is created and stored in memory.

# Initializing Market Monitoring
### Action: The bot initializes monitoring for the new position's market.
### Process:
### Step 1: Fetch Orderbook Snapshot:
- Calls fetchOrders(marketId) from orderFetcher.js to get current maker orders.
- Uses groupOrdersByOutcome() to organize orders by outcome (e.g., Outcome 1: Patriots, Outcome 2: Jets).
- Converts API odds to readable implied odds using apiOddsToReadable() from oddsUtils.js (e.g., 8391352143642350000 / 10^20 = 0.0839).
- Converts bet sizes to readable USDC using toNominalAmount() from utils.js (e.g., 10000000 / 10^6 = 10 USDC).
### Step 2: Calculate Best Taker Odds:
- Identifies orders for the opposite outcome (e.g., Jets) with bet size > minimum bet size for odds calculation (10 USDC).
- Finds the highest implied maker odds for the opposite outcome (e.g., 0.6 for Jets).
- Calculates best taker odds for the desired outcome (Patriots) as 1 - 0.6 = 0.4 using calculateTakerImpliedOdds() from utils.js.
- Ignores orders from the bot's maker address.
### Step 3: Calculate Market Vig:
- Calculates best taker odds for both outcomes (e.g., Patriots: 0.4, Jets: 0.65).
- Computes vig as (0.4 + 0.65) - 1 = 0.05 (negative vig indicates no valid orders; retry logic triggers a new snapshot fetch if needed).
- Only considers orders > minimum bet size for vig calculation (20 USDC).
### Step 4: Calculate Market Liquidity:
- Sums USDC available for each outcome using calculateRemainingTakerSpace() from utils.js.
- Example: Patriots outcome has orders totaling 600 USDC.
### Step 5: Subscribe to WebSocket:
- Calls subscribeToOrderBook(marketId) from websocket.js to receive real-time updates.
- Updates the in-memory taker orderbook as WebSocket messages arrive (new orders, cancellations, fills).
### Step 6: Risk Check:
- Verifies vig (e.g., -0.15) is below max vig tolerance (5% or 0.05). If not, logs an error and pauses order posting.
- Verifies liquidity (600 USDC) exceeds minimum liquidity tolerance (500 USDC).
### Step 7: Alert Position Management:
- If risk thresholds are met, sends an alert to the position management module with the best taker odds (0.4).
### Outcome: Taker orderbook is initialized, WebSocket is subscribed, and position management is alerted to post the first order.

# Posting the Initial Order
### Action: Position management module processes the alert to post the first order.
### Process:
### Step 1: Calculate Order Odds:
- Receives best taker odds (0.4).
- Applies premium (10%): 0.4 * (1 - 0.1) = 0.4 * 0.9 = 0.36.
- Rounds to nearest 0.25% step using roundToNearestStep() from oddsUtils.js (e.g., 0.36 → 0.3625).
- Validates odds using checkOddsLadderValid() from oddsUtils.js.
### Step 2: Determine Bet Size:
- Uses the desired bet maximum fill (100 USDC) since no prior fills exist.
- Converts to API format: 100 * 10^6 = 100000000.
### Step 3: Concurrency Control:
- Acquires a lock for the position to prevent overlapping operations.
- Verifies no active order exists for the position.
### Step 4: Post Order:
- Calls postOrder(marketId, outcome, odds, amount) from orderPoster.js with:
  - Outcome: Patriots.
  - Odds: 0.3625 * 10^20 = 3625000000000000000.
  - Amount: 100 * 10^6 = 100000000.
- Awaits API response and logs success/failure to the position's log file.
- Displays a temporary CLI message: "Order posted at 0.3625 odds for 100 USDC" (clears after 3 seconds).
### Step 5: Error Handling:
- If the API call fails (e.g., network issue), retries up to 3 times with exponential backoff.
- If still unsuccessful, logs the error and pauses order posting for the position.
### Step 6: Store Order:
- Saves the order ID and details (odds, amount) in the position's state.
- Releases the lock.
### Outcome: Order is posted at 0.3625 odds for 100 USDC.

# Monitoring Market Changes
### Action: The bot monitors the market via WebSocket updates.
### Process:
### Scenario 1a: Best Taker Odds Change:
- WebSocket reports a new maker order for the opposite outcome (Jets) at implied odds of 0.65 (bet size > 10 USDC).
- Updates in-memory taker orderbook.
- Recalculates best taker odds for Patriots: 1 - 0.65 = 0.35.
- Sends alert to position management with new best taker odds (0.35).
### Scenario 1b: Best Taker Odds Change:
- WebSocket reports a maker order cancelled for the opposite outcome (Jets) at implied odds of 0.5 (bet size > 10 USDC).
- Updates in-memory taker orderbook. Highest implied odds maker order on Jets is now 0.6.
- Recalculates best taker odds for Patriots: 1 - 0.6 = 0.4.
- Sends alert to position management with new best taker odds (0.4).
### Scenario 2: Vig Exceeds Threshold:
- New orders update taker odds to Patriots: 0.4, Jets: 0.65.
- Recalculates vig: (0.4 + 0.65) - 1 = 0.05 (equals max vig tolerance).
- If vig exceeds 0.05 (e.g., new Jets order makes it 0.06), sends alert to cancel orders and pause posting.
### Scenario 3: Liquidity Drops Below Threshold:
- Order cancellations reduce Patriots outcome liquidity to 400 USDC.
- Compares against minimum liquidity tolerance (500 USDC).
- Sends alert to cancel orders and pause posting.
### Scenario 4: Order Fill:
- WebSocket reports a partial fill of the bot's order (e.g., 50 USDC filled).
- Updates position state: 50 USDC remaining to fill.
- Sends alert to position management with fill amount (50 USDC).
Error Handling:
- If WebSocket disconnects, attempts to reconnect using initialize() and resubscribe.
- Logs all updates to the position's log file.
### Outcome: Alerts trigger appropriate position management actions.

Updating an Order (Odds Change)
### Action: Position management receives an alert that best taker odds changed to 0.45.
### Process:
### Step 1: Cancel Existing Order:
- Acquires a lock for the position.
- Verifies the active order exists (using stored order ID).
- Calls cancelOrders(orderId) from orderCanceller.js.
- Awaits API confirmation and logs success/failure.
- Displays temporary CLI message: "Order canceled" (clears after 3 seconds).
### Step 2: Calculate New Odds:
- Applies premium: 0.45 * (1 - 0.1) = 0.45 * 0.9 = 0.405.
- Rounds to nearest 0.25% step: 0.405 → 0.4.
- Validates odds.
### Step 3: Post New Order:
- Uses remaining bet size (100 USDC, assuming no prior fills).
- Calls postOrder() with odds 0.4 * 10^20 and amount 100 * 10^6.
- Logs and displays temporary CLI message: "New order posted at 0.4 odds for 100 USDC".
### Step 4: Error Handling:
- If cancellation fails, retries up to 3 times.
- If posting fails, pauses order updates and logs the error.
### Step 5: Update State:
- Stores new order ID and details.
- Releases the lock.
### Outcome: Order is updated to 0.4 odds.

# Handling Risk Threshold Violation
### Action: Market monitoring alerts that vig exceeds 0.05.
### Process:
### Step 1: Cancel Order:
- Acquires a lock.
- Calls cancelOrders(orderId).
- Logs cancellation and displays CLI message: "Order canceled due to high vig".
### Step 2: Pause Posting:
- Sets position state to "paused".
- Stops order posting until an alert confirms vig is below 0.05.
### Step 3: Resume on Clear Alert:
- Receives alert that vig is now 0.04.
- Recalculates best taker odds and posts a new order (as in step 5).
### Outcome: Orders are canceled, and posting resumes when conditions are met.

# Handling a Fill
### Action: Market monitoring alerts that 50 USDC of the order was filled.
### Process:
### Step 1: Update Position:
- Updates position state: filled = 50 USDC, remaining = 50 USDC.
- Logs fill event.
- Displays CLI message: "Order filled for 50 USDC".
### Step 2: Check Completion:
- Fill is 50% (<99%), so position remains active.
- If fill reaches >99% (e.g., 99.5 USDC), marks position as complete and stops monitoring.
### Step 3: Post New Order:
- If position is still active, posts a new order for the remaining 50 USDC at current odds (after recalculating).
### Outcome: Position is updated, and a new order is posted if needed.

# Viewing Active Positions
### Action: User selects "View active positions" from the CLI.
### Process:
- Retrieves all active positions from memory.
- Displays for each position:
  - Market: "Patriots vs. Jets".
  - Outcome: "Patriots to Win".
  - Bet size: 100 USDC.
  - Active order odds: 0.4 (if any).
  - Fill %: 50% (50/100 USDC).
  - Best taker odds: 0.45.
  - Settings: Premium (10%), max vig (5%), min liquidity (500 USDC), etc.
  - Market status: "OK" (or "High vig" if thresholds breached).
- Options: A) Close position, B) Edit position.
Sub-action: Close Position:
- If selected, cancels active orders using cancelOrders().
- Stops WebSocket monitoring with unsubscribeFromOrderBook().
- Removes position from memory.
- Logs closure.
Sub-action: Edit Position:
- Prompts user to update bet size, premium, or thresholds.
- Updates position state and recalculates/post new order if needed.
### Outcome: User views and manages positions.

# Exiting the Bot
### Action: User selects "Exit" from the CLI.
### Process:
- Cancels all active orders across all positions using cancelOrders().
- Unsubscribes from all WebSocket channels using unsubscribeFromOrderBook().
- Closes WebSocket connection with closeConnection() from websocket.js.
- Saves final position states to logs.
- Displays CLI message: "Bot shutting down".
- Exits the process.
### Outcome: Bot terminates cleanly.