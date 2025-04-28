// src/core/marketMonitor.js - Monitors market conditions
import { fetchOrders, groupOrdersByOutcome } from '../api/orderFetcher.js';
import { subscribeToOrderBook, unsubscribeFromOrderBook } from '../api/websocket.js';
import { updateMarketData, updateFillStatus, getPosition } from './positionManager.js';
import { logger } from '../utils/logger.js';
import { toImpliedOdds, calculateTakerImpliedOdds, toNominalAmount } from '../utils/orderUtils.js';
import { ADDRESSES, WS } from '../config/constants.js';

// In-memory store of taker orderbooks by market hash
const orderbooks = new Map();
const pollingIntervals = new Map();

// Track recently cancelled orders for fill detection
// Map of orderHash -> {positionId, timestamp}
const recentlyCancelledOrders = new Map();
const RECENT_ORDER_TRACKING_TIME = 60000; // 1 minute

/**
 * Initializes monitoring for a market
 * @param {Object} position - Position object
 * @returns {Promise<boolean>} - Success status
 */
export async function initializeMarketMonitoring(position) {
  const { marketHash, id: positionId } = position;
  
  try {
    position.logger.info(`Initializing market monitoring for ${marketHash}`);
    
    // Fetch current orders snapshot
    let retryCount = 0;
    let ordersSnapshot = [];
    
    // Retry fetching orders up to 3 times
    while (retryCount < 3) {
      try {
        ordersSnapshot = await fetchOrders(marketHash);
        break;
      } catch (error) {
        retryCount++;
        position.logger.warn(`Attempt ${retryCount} failed to fetch orders: ${error.message}`);
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        } else {
          position.logger.error('Failed to fetch initial orders after 3 attempts');
          // Continue with empty orders - we'll fill it from WebSocket or polling
          ordersSnapshot = [];
        }
      }
    }
    
    // Initialize orderbook with snapshot
    await initializeOrderbook(marketHash, ordersSnapshot, position);
    
    // Set up monitoring (prefer WebSocket, fallback to polling)
    let monitoringSuccess = false;
    
    try {
      // Try WebSocket first
      position.logger.info('Attempting to set up WebSocket monitoring');
      const subscribed = await subscribeToOrderBook(marketHash, 
        (mktHash, updates) => handleOrderbookUpdate(mktHash, updates));
      
      if (subscribed) {
        position.logger.info('WebSocket monitoring set up successfully');
        monitoringSuccess = true;
      } else {
        position.logger.warn('WebSocket subscription failed, will try polling instead');
      }
    } catch (wsError) {
      position.logger.error(`WebSocket error: ${wsError.message}`, { error: wsError });
    }
    
    // If WebSocket failed, set up polling
    if (!monitoringSuccess) {
      position.logger.info('Setting up polling-based monitoring');
      const pollingInterval = setInterval(async () => {
        try {
          const latestOrders = await fetchOrders(marketHash);
          position.logger.debug(`Polling: fetched ${latestOrders.length} orders`);
          
          // Update orderbook with latest orders
          updateOrderbookFromSnapshot(marketHash, latestOrders);
          
          // Recalculate metrics
          const orderbook = orderbooks.get(marketHash);
          if (orderbook) {
            // Get a position to use for threshold settings
            const positionId = Array.from(orderbook.positions)[0];
            const positionForMetrics = getPosition(positionId);
            
            if (positionForMetrics) {
              calculateOrderbookMetrics(orderbook, positionForMetrics);
              
              // Update all positions associated with this market
              for (const posId of orderbook.positions) {
                const pos = getPosition(posId);
                if (pos) {
                  await updateMarketData(posId, {
                    bestTakerOdds: orderbook.metrics.bestTakerOdds[pos.outcomeIndex],
                    vig: orderbook.metrics.vig,
                    liquidity: {
                      outcome1: orderbook.metrics.liquidity[1],
                      outcome2: orderbook.metrics.liquidity[2]
                    }
                  });
                }
              }
            }
          }
        } catch (pollingError) {
          position.logger.error(`Polling error: ${pollingError.message}`, { error: pollingError });
        }
      }, WS.POLLING_INTERVAL);
      
      // Store polling interval for cleanup
      pollingIntervals.set(marketHash, pollingInterval);
      position.logger.info('Polling-based monitoring set up successfully');
      monitoringSuccess = true;
    }
    
    position.logger.info('Market monitoring initialized successfully');
    return monitoringSuccess;
  } catch (error) {
    position.logger.error(`Error initializing market monitoring: ${error.message}`, { error });
    return false;
  }
}

/**
 * Updates orderbook from a new snapshot of orders
 * @param {string} marketHash - Market hash
 * @param {Array} orders - New orders snapshot
 */
function updateOrderbookFromSnapshot(marketHash, orders) {
  const orderbook = orderbooks.get(marketHash);
  if (!orderbook) return;
  
  // Group orders by outcome
  const groupedOrders = groupOrdersByOutcome(orders);
  
  // Reset orders
  orderbook.orders = {
    1: [],
    2: []
  };
  
  // Process and store orders in orderbook
  for (const outcome of [1, 2]) {
    if (groupedOrders[outcome]) {
      orderbook.orders[outcome] = processOrders(groupedOrders[outcome], outcome);
    }
  }
}

/**
 * Initializes an in-memory orderbook from a snapshot
 * @param {string} marketHash - Market hash
 * @param {Array} ordersSnapshot - Snapshot of orders from API
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function initializeOrderbook(marketHash, ordersSnapshot, position) {
  try {
    // Group orders by outcome
    const groupedOrders = groupOrdersByOutcome(ordersSnapshot);
    
    // Initialize orderbook structure
    const orderbook = {
      marketHash,
      positions: new Set([position.id]),
      orders: {
        1: [],
        2: []
      },
      metrics: {
        bestTakerOdds: {
          1: null,
          2: null
        },
        liquidity: {
          1: 0,
          2: 0
        },
        vig: null
      }
    };
    
    // Process and store orders in orderbook
    for (const outcome of [1, 2]) {
      if (groupedOrders[outcome]) {
        orderbook.orders[outcome] = processOrders(groupedOrders[outcome], outcome);
      }
    }
    
    // Calculate initial metrics
    calculateOrderbookMetrics(orderbook, position);
    
    // Store the orderbook
    orderbooks.set(marketHash, orderbook);
    
    position.logger.info('Orderbook initialized', {
      marketHash,
      ordersCount: {
        outcome1: orderbook.orders[1].length,
        outcome2: orderbook.orders[2].length
      },
      metrics: orderbook.metrics
    });
    
    // Update position with initial market data
    await updateMarketData(position.id, {
      bestTakerOdds: orderbook.metrics.bestTakerOdds[position.outcomeIndex],
      vig: orderbook.metrics.vig,
      liquidity: {
        outcome1: orderbook.metrics.liquidity[1],
        outcome2: orderbook.metrics.liquidity[2]
      }
    });
  } catch (error) {
    position.logger.error(`Error initializing orderbook: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Processes raw orders into a consistent format and ensures proper outcome assignment
 * @param {Array} orders - Raw orders from API
 * @param {number} outcome - Outcome (1 or 2)
 * @returns {Array} - Processed orders
 */
function processOrders(orders, outcome) {
  return orders
    .filter(order => {
      // Filter out orders from our own maker address
      return order.maker !== ADDRESSES.MAKER;
    })
    .map(order => {
      // Determine if this order is correctly assigned to the right outcome
      // We store orders based on which outcome the maker is betting on
      // isMakerBettingOutcomeOne = true means maker is betting on outcome 1
      const correctOutcome = order.isMakerBettingOutcomeOne ? 1 : 2;
      
      // Skip orders assigned to the wrong outcome array (should never happen)
      if (outcome !== correctOutcome) {
        logger.warn(`Order ${order.orderHash} has incorrect outcome assignment. ` +
                   `Should be ${correctOutcome}, but assigned to ${outcome}.`);
      }
      
      // Process order into consistent format
      return {
        orderHash: order.orderHash,
        marketHash: order.marketHash,
        maker: order.maker,
        totalBetSize: order.totalBetSize,
        fillAmount: order.fillAmount || "0",
        percentageOdds: order.percentageOdds,
        impliedOdds: toImpliedOdds(order.percentageOdds),
        takerImpliedOdds: calculateTakerImpliedOdds(order.percentageOdds),
        nominalBetSize: toNominalAmount(order.totalBetSize),
        nominalFillAmount: toNominalAmount(order.fillAmount || "0"),
        remainingSize: toNominalAmount(
          (BigInt(order.totalBetSize) - BigInt(order.fillAmount || "0")).toString()
        ),
        isMakerBettingOutcomeOne: order.isMakerBettingOutcomeOne,
        outcome: correctOutcome
      };
    });
}

/**
 * Calculates metrics for an orderbook
 * @param {Object} orderbook - Orderbook object
 * @param {Object} position - Position object for thresholds
 * @returns {void}
 */
function calculateOrderbookMetrics(orderbook, position) {
  const { minBetSizeOdds, minBetSizeVig } = position;
  
  // Calculate best taker odds for each outcome
  for (const outcome of [1, 2]) {
    // For outcome 1, we need maker orders where isMakerBettingOutcomeOne = false (they're betting on outcome 2)
    // For outcome 2, we need maker orders where isMakerBettingOutcomeOne = true (they're betting on outcome 1)
    const eligibleOrders = [];
    
    for (const order of orderbook.orders[1].concat(orderbook.orders[2])) {
      // Check if this order is for the right outcome and meets minimum size
      if ((outcome === 1 && !order.isMakerBettingOutcomeOne) || 
          (outcome === 2 && order.isMakerBettingOutcomeOne)) {
        if (order.remainingSize >= minBetSizeOdds) {
          eligibleOrders.push(order);
        }
      }
    }
    
    if (eligibleOrders.length > 0) {
      // Sort by highest maker implied odds (which gives lowest taker odds)
      eligibleOrders.sort((a, b) => b.impliedOdds - a.impliedOdds);
      
      // Best taker odds come from the highest maker implied odds
      const bestMakerImpliedOdds = eligibleOrders[0].impliedOdds;
      orderbook.metrics.bestTakerOdds[outcome] = 1 - bestMakerImpliedOdds;
      
      position.logger.debug(`Best taker odds for outcome ${outcome}: ${orderbook.metrics.bestTakerOdds[outcome]} ` +
                          `(from maker odds: ${bestMakerImpliedOdds})`);
    } else {
      orderbook.metrics.bestTakerOdds[outcome] = null;
      position.logger.debug(`No eligible orders for outcome ${outcome}`);
    }
  }
  
  // Calculate liquidity for each outcome
  for (const outcome of [1, 2]) {
    const totalLiquidity = orderbook.orders[outcome].reduce(
      (sum, order) => sum + order.remainingSize,
      0
    );
    
    orderbook.metrics.liquidity[outcome] = totalLiquidity;
  }
  
  // Calculate vig using best taker odds from both outcomes
  const { bestTakerOdds } = orderbook.metrics;
  
  if (bestTakerOdds[1] !== null && bestTakerOdds[2] !== null) {
    // Vig = (best taker odds 1 + best taker odds 2) - 1
    orderbook.metrics.vig = (bestTakerOdds[1] + bestTakerOdds[2] - 1) * 100;
  } else {
    orderbook.metrics.vig = null;
  }
}

// Function to add an order to recently cancelled tracking
export function trackCancelledOrder(orderHash, positionId) {
  if (!orderHash || !positionId) return;
  
  recentlyCancelledOrders.set(orderHash, {
    positionId,
    timestamp: Date.now()
  });
  
  // Set up cleanup to remove the tracking after timeout
  setTimeout(() => {
    recentlyCancelledOrders.delete(orderHash);
  }, RECENT_ORDER_TRACKING_TIME);
}

// Periodically clean up expired entries
setInterval(() => {
  const now = Date.now();
  for (const [hash, data] of recentlyCancelledOrders.entries()) {
    if (now - data.timestamp > RECENT_ORDER_TRACKING_TIME) {
      recentlyCancelledOrders.delete(hash);
    }
  }
}, 60000); // Cleanup every minute

/**
 * Handles WebSocket updates to the orderbook
 * @param {string} marketHash - Market hash
 * @param {Array} updates - Array of order updates
 * @returns {Promise<void>}
 */
export async function handleOrderbookUpdate(marketHash, updates) {
  const orderbook = orderbooks.get(marketHash);
  
  if (!orderbook) {
    logger.warn(`Received update for untracked market: ${marketHash}`);
    return;
  }
  
  try {
    let orderbookChanged = false;
    
    // Process each update
    for (const update of updates) {
      if (!Array.isArray(update) || update.length < 10) {
        logger.warn(`Received malformed update: ${JSON.stringify(update)}`);
        continue;
      }
      
      const [
        orderHash,
        status,
        fillAmount,
        maker,
        totalBetSize,
        percentageOdds,
        expiry,
        apiExpiry,
        salt,
        isMakerBettingOutcomeOne
      ] = update;
      
      // Skip if any required fields are missing
      if (!orderHash || !maker || !totalBetSize || !percentageOdds) {
        continue;
      }
      
      // Determine outcome for the taker (opposite of maker's outcome)
      const takerOutcome = isMakerBettingOutcomeOne ? 2 : 1;
      
      // Check if this is for one of our positions (case-insensitive comparison)
      if (maker.toLowerCase() === ADDRESSES.MAKER.toLowerCase()) {
        // Check for fills
        const hasFill = BigInt(fillAmount || '0') > 0;
        
        if (hasFill) {
          let foundPosition = false;
          
          // First check all positions for this market
          for (const positionId of orderbook.positions) {
            try {
              const position = getPosition(positionId);
              if (!position) continue;
              
              // Check if this matches the active order
              if (position.activeOrderHash === orderHash) {
                logger.info(`Fill detected for active order ${orderHash}, amount: ${fillAmount}`);
                await updateFillStatus(positionId, fillAmount);
                foundPosition = true;
                break;
              }
            } catch (error) {
              logger.error(`Error processing fill for position ${positionId}: ${error.message}`);
            }
          }
          
          // If no position found with this active order, check recently cancelled orders
          if (!foundPosition && recentlyCancelledOrders.has(orderHash)) {
            const { positionId } = recentlyCancelledOrders.get(orderHash);
            try {
              const position = getPosition(positionId);
              if (position) {
                logger.info(`Fill detected for recently cancelled order ${orderHash}, amount: ${fillAmount}`);
                await updateFillStatus(positionId, fillAmount);
              }
            } catch (error) {
              logger.error(`Error processing fill for recently cancelled order: ${error.message}`);
            }
          }
        }
        
        // Skip further processing for our own orders
        continue;
      }
      
      // Handle order update based on status
      if (status === 'ACTIVE') {
        // Get the outcome this maker is betting on (not the taker outcome)
        const makerOutcome = isMakerBettingOutcomeOne ? 1 : 2;
        
        // Check if this is a new order or an update
        const existingOrderIndex = orderbook.orders[makerOutcome].findIndex(
          order => order.orderHash === orderHash
        );
        
        if (existingOrderIndex >= 0) {
          // Update existing order
          const updatedFillAmount = fillAmount || '0';
          orderbook.orders[makerOutcome][existingOrderIndex].fillAmount = updatedFillAmount;
          orderbook.orders[makerOutcome][existingOrderIndex].nominalFillAmount = 
            toNominalAmount(updatedFillAmount);
          orderbook.orders[makerOutcome][existingOrderIndex].remainingSize = 
            toNominalAmount((BigInt(totalBetSize) - BigInt(updatedFillAmount)).toString());
        } else {
          // Add new order
          const newOrder = {
            orderHash,
            marketHash,
            maker,
            totalBetSize,
            fillAmount: fillAmount || '0',
            percentageOdds,
            impliedOdds: toImpliedOdds(percentageOdds),
            takerImpliedOdds: calculateTakerImpliedOdds(percentageOdds),
            nominalBetSize: toNominalAmount(totalBetSize),
            nominalFillAmount: toNominalAmount(fillAmount || '0'),
            remainingSize: toNominalAmount(
              (BigInt(totalBetSize) - BigInt(fillAmount || '0')).toString()
            ),
            isMakerBettingOutcomeOne: isMakerBettingOutcomeOne === true,
            outcome: makerOutcome
          };
          
          orderbook.orders[makerOutcome].push(newOrder);
        }
        
        orderbookChanged = true;
      } else if (status === 'INACTIVE') {
        // We need to determine which outcome array contains this order
        // For each outcome, try to find and remove the order
        for (const outcome of [1, 2]) {
          const orderIndex = orderbook.orders[outcome].findIndex(
            order => order.orderHash === orderHash
          );
          
          if (orderIndex >= 0) {
            orderbook.orders[outcome].splice(orderIndex, 1);
            orderbookChanged = true;
            break;
          }
        }
      }
    }
    
    // If orderbook changed, recalculate metrics and update positions
    if (orderbookChanged) {
      // Get a position to use for threshold settings
      const positionId = Array.from(orderbook.positions)[0];
      const position = getPosition(positionId);
      
      if (position) {
        // Recalculate metrics
        calculateOrderbookMetrics(orderbook, position);
        
        // Update all positions associated with this market
        for (const posId of orderbook.positions) {
          const pos = getPosition(posId);
          if (pos) {
            await updateMarketData(posId, {
              bestTakerOdds: orderbook.metrics.bestTakerOdds[pos.outcomeIndex],
              vig: orderbook.metrics.vig,
              liquidity: {
                outcome1: orderbook.metrics.liquidity[1],
                outcome2: orderbook.metrics.liquidity[2]
              }
            });
          }
        }
      }
    }
  } catch (error) {
    logger.error(`Error handling orderbook update: ${error.message}`, { error });
  }
}

/**
 * Adds a position to be monitored for a market
 * @param {string} marketHash - Market hash
 * @param {string} positionId - Position ID
 * @returns {void}
 */
export function addPositionToMarket(marketHash, positionId) {
  const orderbook = orderbooks.get(marketHash);
  
  if (orderbook) {
    orderbook.positions.add(positionId);
    logger.info(`Added position ${positionId} to market ${marketHash}`);
  }
}

/**
 * Removes a position from being monitored for a market
 * @param {string} marketHash - Market hash
 * @param {string} positionId - Position ID
 * @returns {void}
 */
export function removePositionFromMarket(marketHash, positionId) {
  const orderbook = orderbooks.get(marketHash);
  
  if (orderbook) {
    orderbook.positions.delete(positionId);
    logger.info(`Removed position ${positionId} from market ${marketHash}`);
    
    // If no positions left, we can clean up the orderbook
    if (orderbook.positions.size === 0) {
      orderbooks.delete(marketHash);
      
      // Also clean up any polling interval
      if (pollingIntervals.has(marketHash)) {
        clearInterval(pollingIntervals.get(marketHash));
        pollingIntervals.delete(marketHash);
      }
      
      logger.info(`Removed orderbook for market ${marketHash}`);
    }
  }
}