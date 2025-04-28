// src/core/positionManager.js - Manages position state and operations
import { v4 as uuidv4 } from 'uuid';
import { createPositionLogger } from '../utils/logger.js';
import { TOKENS, FILL_COMPLETION_THRESHOLD } from '../config/constants.js';
import { subscribeToOrderBook, unsubscribeFromOrderBook } from '../api/websocket.js';
import { cancelOrder, cancelOrders } from './orderManager.js';
import { postMakerOrder } from './orderManager.js';
import { roundToNearestStep } from '../utils/oddsUtils.js';
import { ethers } from 'ethers';
import { trackCancelledOrder } from './marketMonitor.js';

// In-memory store for all active positions
const positions = new Map();

// Queue for position operations to prevent race conditions
const operationQueues = new Map();

// Track the last order update time per position
const lastOrderUpdateTime = new Map();
const MIN_ORDER_UPDATE_INTERVAL = 2500; // 2.5 seconds minimum between order updates

/**
 * Creates a new position
 * @param {Object} positionData - Data for the new position
 * @returns {Promise<Object>} - The created position
 */
export async function createNewPosition(positionData) {
  const positionId = uuidv4();
  const logger = createPositionLogger(positionId);
  
  const position = {
    id: positionId,
    createdAt: new Date().toISOString(),
    status: 'INITIALIZING',
    orderStatus: 'NONE',
    activeOrderHash: null,
    pastOrderHashes: [],
    fillAmount: 0,
    fillPercentage: 0,
    logger,
    currentVig: null,
    currentLiquidity: {
      outcome1: null,
      outcome2: null
    },
    bestTakerOdds: null,
    lastOrderOdds: null,
    operations: {
      isPaused: false,
      isRiskThresholdBreached: false,
      pendingOrderOperation: false
    },
    ...positionData
  };
  
  // Initialize operation queue for this position
  operationQueues.set(positionId, []);
  
  logger.info('Position created', { position: { ...position, logger: '[Object]' } });
  
  // Store the position
  positions.set(positionId, position);
  
  return position;
}

/**
 * Retrieves all active positions
 * @returns {Array<Object>} - Array of active positions
 */
export function getAllPositions() {
  return Array.from(positions.values());
}

/**
 * Gets a position by ID
 * @param {string} positionId - Position ID
 * @returns {Object|null} - The position or null if not found
 */
export function getPosition(positionId) {
  return positions.get(positionId) || null;
}

/**
 * Updates a position's settings
 * @param {string} positionId - Position ID
 * @param {Object} updatedSettings - New settings for the position
 * @returns {Promise<Object>} - Updated position
 */
export async function updatePosition(positionId, updatedSettings) {
  const position = positions.get(positionId);
  
  if (!position) {
    throw new Error(`Position ${positionId} not found`);
  }
  
  // Queue this operation
  return await enqueueOperation(positionId, async () => {
    const updatedPosition = {
      ...position,
      ...updatedSettings
    };
    
    position.logger.info('Position updated', { 
      oldSettings: position,
      newSettings: updatedSettings 
    });
    
    // Update the position in the store
    positions.set(positionId, updatedPosition);
    
    // Check if we need to update the active order based on new settings
    await checkAndUpdateOrder(positionId);
    
    return updatedPosition;
  });
}

/**
 * Closes a position permanently
 * @param {string} positionId - Position ID
 * @returns {Promise<boolean>} - True if successful
 */
export async function closePosition(positionId) {
  const position = positions.get(positionId);
  
  if (!position) {
    return false;
  }
  
  // Queue this operation
  return await enqueueOperation(positionId, async () => {
    try {
      position.logger.info('Closing position');
      
      // If there's an active order, cancel it
      if (position.activeOrderHash) {
        position.logger.info(`Cancelling active order ${position.activeOrderHash}`);
        // Track order for potential fills before cancellation
        trackCancelledOrder(position.activeOrderHash, positionId);
        await cancelOrder(position.activeOrderHash);
      }
      
      // Clear order tracking
      position.activeOrderHash = null;
      position.pastOrderHashes = [];
      position.orderStatus = 'CANCELLED_CLOSE';
      
      // Unsubscribe from WebSocket
      position.logger.info(`Unsubscribing from order book for market: ${position.marketHash}`);
      await unsubscribeFromOrderBook(position.marketHash);
      
      // Mark position as closed
      position.status = 'CLOSED';
      position.logger.info('Position closed successfully');
      
      // Remove from active positions
      positions.delete(positionId);
      
      // Clean up operation queue
      operationQueues.delete(positionId);
      
      return true;
    } catch (error) {
      position.logger.error(`Error closing position: ${error.message}`, { error });
      return false;
    }
  });
}

/**
 * Updates the market data for a position
 * @param {string} positionId - Position ID
 * @param {Object} marketData - Updated market data
 * @returns {Promise<void>}
 */
export async function updateMarketData(positionId, marketData) {
  const position = positions.get(positionId);
  
  if (!position) {
    return;
  }
  
  // Queue this operation
  return await enqueueOperation(positionId, async () => {
    try {
      const { bestTakerOdds, vig, liquidity } = marketData;
      
      // Update position market data
      position.bestTakerOdds = bestTakerOdds;
      position.currentVig = vig;
      position.currentLiquidity = liquidity;
      
      position.logger.info('Market data updated', { 
        bestTakerOdds,
        vig,
        liquidity
      });
      
      // Check if risk thresholds are exceeded
      const isRiskThresholdBreached = checkRiskThresholds(position);
      
      // Handle risk threshold changes
      if (isRiskThresholdBreached !== position.operations.isRiskThresholdBreached) {
        position.operations.isRiskThresholdBreached = isRiskThresholdBreached;
        
        if (isRiskThresholdBreached) {
          position.logger.warn('Risk thresholds exceeded, cancelling active orders');
          await handleRiskThresholdBreach(position);
        } else {
          position.logger.info('Risk thresholds now OK, can resume order posting');
          await handleRiskThresholdResolution(position);
        }
        // Always return early after risk threshold state changes
        return;
      }
      
      // If odds changed and we have an active order, check if we should update it
      if (!isRiskThresholdBreached && position.activeOrderHash && 
          position.bestTakerOdds !== position.lastOrderOdds) {
          
        // Implement rate limiting for order updates
        const now = Date.now();
        const lastUpdate = lastOrderUpdateTime.get(positionId) || 0;
        
        if (now - lastUpdate < MIN_ORDER_UPDATE_INTERVAL) {
          position.logger.info(`Skipping order update due to rate limiting (last update was ${now - lastUpdate}ms ago)`);
          return;
        }
            
        position.logger.info('Best taker odds changed, updating order', {
          previous: position.lastOrderOdds,
          new: position.bestTakerOdds
        });
        
        // Update timestamp before we start the update operation
        lastOrderUpdateTime.set(positionId, now);
        
        await updateOrderForPosition(position);
      }
    } catch (error) {
      position.logger.error(`Error updating market data: ${error.message}`, { error });
    }
  });
}

/**
 * Updates the order fill status for a position
 * @param {string} positionId - Position ID
 * @param {string} fillAmount - Amount filled in base units
 * @returns {Promise<void>}
 */
export async function updateFillStatus(positionId, fillAmount) {
  const position = positions.get(positionId);
  
  if (!position) {
    return;
  }
  
  // Queue this operation
  return await enqueueOperation(positionId, async () => {
    try {
      // Convert fill amount to USDC
      const fillAmountUSDC = Number(ethers.formatUnits(fillAmount, TOKENS.USDC.DECIMALS));
      
      // Update position fill data
      position.fillAmount = fillAmountUSDC;
      position.fillPercentage = (fillAmountUSDC / position.maxFillAmount) * 100;
      
      position.logger.info('Fill status updated', { 
        fillAmount: fillAmountUSDC,
        fillPercentage: position.fillPercentage
      });
      
      // Check if position is complete
      if (position.fillPercentage >= FILL_COMPLETION_THRESHOLD * 100) {
        position.logger.info('Position is >99% filled, marking as complete');
        position.status = 'COMPLETED';
        
        // If there's an active order, cancel it
        if (position.activeOrderHash) {
          position.logger.info('Cancelling remaining order for completed position');
          await cancelOrder(position.activeOrderHash);
          position.activeOrderHash = null;
          // Reset past order hashes since position is complete
          position.pastOrderHashes = [];
          position.orderStatus = 'CANCELLED';
        }
        
        return;
      }
      
      // If there's an existing order and odds changed, update it
      if (position.activeOrderHash && 
          !position.operations.isRiskThresholdBreached) {
        position.logger.info('Order partially filled, updating for remaining amount');
        await updateOrderForPosition(position);
      }
    } catch (error) {
      position.logger.error(`Error updating fill status: ${error.message}`, { error });
    }
  });
}

/**
 * Posts the initial order for a position
 * @param {string} positionId - Position ID
 * @returns {Promise<void>}
 */
export async function postInitialOrder(positionId) {
  const position = positions.get(positionId);
  
  if (!position) {
    throw new Error(`Position ${positionId} not found`);
  }
  
  // Queue this operation
  return await enqueueOperation(positionId, async () => {
    try {
      // Check if there's already an active order
      if (position.activeOrderHash) {
        position.logger.warn(`Position already has an active order: ${position.activeOrderHash}. Skipping.`);
        return;
      }
      
      position.logger.info('Posting initial order');
      
      // Make sure risk thresholds are not exceeded
      if (checkRiskThresholds(position)) {
        position.operations.isRiskThresholdBreached = true;
        position.logger.warn('Cannot post initial order, risk thresholds exceeded');
        return;
      }
      
      // Calculate odds with premium
      const oddsWithPremium = applyPremium(position.bestTakerOdds, position.premium);
      
      // Round to nearest step on odds ladder
      const roundedOdds = roundToNearestStep(oddsWithPremium);
      
      // Calculate remaining amount to fill
      const remainingToFill = position.maxFillAmount - position.fillAmount;
      
      // Post the order
      const result = await postMakerOrder({
        marketHash: position.marketHash,
        isMakerBettingOutcomeOne: position.outcomeIndex === 1,
        betSizeUSDC: remainingToFill,
        impliedOdds: roundedOdds
      });
      
      // Update position with new order info
      position.activeOrderHash = result.orderHash;
      position.lastOrderOdds = position.bestTakerOdds;
      position.orderStatus = 'ACTIVE';
      position.status = 'ACTIVE';
      
      position.logger.info('Initial order posted successfully', {
        orderHash: result.orderHash,
        impliedOdds: roundedOdds,
        betSize: remainingToFill
      });
    } catch (error) {
      position.logger.error(`Error posting initial order: ${error.message}`, { error });
      position.status = 'ERROR';
      throw error;
    }
  });
}

/**
 * Handles a risk threshold breach for a position
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function handleRiskThresholdBreach(position) {
  try {
    // If there's an active order, cancel it
    if (position.activeOrderHash) {
      position.logger.warn(`Cancelling order ${position.activeOrderHash} due to risk threshold breach`);
      // Track this order for potential fills
      trackCancelledOrder(position.activeOrderHash, position.id);
      await cancelOrder(position.activeOrderHash);
      position.activeOrderHash = null;
      position.orderStatus = 'CANCELLED_RISK';
    }
    
    // Update status
    position.status = 'RISK_PAUSED';
  } catch (error) {
    position.logger.error(`Error handling risk threshold breach: ${error.message}`, { error });
  }
}

/**
 * Handles the resolution of a risk threshold breach
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function handleRiskThresholdResolution(position) {
  try {
    if (position.status === 'RISK_PAUSED') {
      position.logger.info('Risk thresholds resolved, resuming position');
      position.status = 'ACTIVE';
      
      // Post a new order with current market conditions
      await updateOrderForPosition(position);
    }
  } catch (error) {
    position.logger.error(`Error handling risk threshold resolution: ${error.message}`, { error });
  }
}

/**
 * Updates the order for a position
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function updateOrderForPosition(position) {
  try {
    // If there's an active order, cancel it first
    if (position.activeOrderHash) {
      position.logger.info(`Cancelling order ${position.activeOrderHash} to update odds`);
      
      // Track this order for potential fills
      trackCancelledOrder(position.activeOrderHash, position.id);
      
      // Important: Wait for the cancel to complete before posting a new order
      try {
        const cancelResult = await cancelOrder(position.activeOrderHash);
        
        // Check if the order was actually cancelled
        if (cancelResult.cancelledCount === 0) {
          position.logger.warn('Order could not be cancelled - it may already be filled or cancelled. Checking fill status before proceeding.');
          
          // Add a small delay to allow any pending fill updates to process
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // If the position is completed, don't post a new order
          if (position.status === 'COMPLETED') {
            position.logger.info('Position is now completed, not posting new order');
            position.activeOrderHash = null;
            position.orderStatus = 'COMPLETED';
            return;
          }
          
          // If we get here, the order was likely cancelled but not filled
          position.activeOrderHash = null;
          position.orderStatus = 'CANCELLED_UPDATE';
        } else {
          position.activeOrderHash = null;
          position.orderStatus = 'CANCELLED_UPDATE';
        }
      } catch (cancelError) {
        position.logger.error(`Error cancelling order: ${cancelError.message}`, { error: cancelError });
        // If cancel fails, do not continue with posting a new order
        return;
      }
    }
    
    // Skip if risk thresholds are breached
    if (position.operations.isRiskThresholdBreached) {
      position.logger.warn('Cannot update order, risk thresholds exceeded');
      return;
    }
    
    // Calculate odds with premium
    const oddsWithPremium = applyPremium(position.bestTakerOdds, position.premium);
    
    // Round to nearest step on odds ladder
    const roundedOdds = roundToNearestStep(oddsWithPremium);
    
    // Calculate remaining amount to fill
    const remainingToFill = position.maxFillAmount - position.fillAmount;
    
    // Skip if position is fully filled
    if (remainingToFill <= 0) {
      position.logger.info('Position is fully filled, no need to update order');
      position.status = 'COMPLETED';
      return;
    }
    
    // Add a small delay to ensure the cancel has propagated to the exchange
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Post the updated order
    const result = await postMakerOrder({
      marketHash: position.marketHash,
      isMakerBettingOutcomeOne: position.outcomeIndex === 1,
      betSizeUSDC: remainingToFill,
      impliedOdds: roundedOdds
    });
    
    // Update position with new order info
    position.activeOrderHash = result.orderHash;
    position.lastOrderOdds = position.bestTakerOdds;
    position.orderStatus = 'ACTIVE';
    
    position.logger.info('Order updated successfully', {
      orderHash: result.orderHash,
      impliedOdds: roundedOdds,
      betSize: remainingToFill
    });
  } catch (error) {
    position.logger.error(`Error updating order: ${error.message}`, { error });
    position.orderStatus = 'ERROR';
  }
}

/**
 * Checks if a position's current market conditions exceed risk thresholds
 * @param {Object} position - Position object
 * @returns {boolean} - True if thresholds are exceeded
 */
function checkRiskThresholds(position) {
  // Check if vig exceeds threshold
  if (position.currentVig !== null && position.currentVig > position.maxVig) {
    position.logger.warn(`Vig exceeds threshold: ${position.currentVig}% > ${position.maxVig}%`);
    return true;
  }
  
  // Check if liquidity is below threshold for either outcome
  if (position.currentLiquidity.outcome1 !== null && 
      position.currentLiquidity.outcome1 < position.minLiquidity) {
    position.logger.warn(`Liquidity for outcome 1 below threshold: ${position.currentLiquidity.outcome1} < ${position.minLiquidity}`);
    return true;
  }
  
  if (position.currentLiquidity.outcome2 !== null && 
      position.currentLiquidity.outcome2 < position.minLiquidity) {
    position.logger.warn(`Liquidity for outcome 2 below threshold: ${position.currentLiquidity.outcome2} < ${position.minLiquidity}`);
    return true;
  }
  
  return false;
}

/**
 * Applies premium to implied odds
 * @param {number} impliedOdds - Implied odds (0-1)
 * @param {number} premium - Premium percentage
 * @returns {number} - Implied odds with premium applied
 */
function applyPremium(impliedOdds, premium) {
  // Convert premium percentage to decimal (e.g., 10% -> 0.1)
  const premiumDecimal = premium / 100;
  
  // Apply premium: multiply base odds by (1 - premium)
  return impliedOdds * (1 - premiumDecimal);
}

/**
 * Helper function to check and update an order if needed based on new settings
 * @param {string} positionId - Position ID
 * @returns {Promise<void>}
 */
async function checkAndUpdateOrder(positionId) {
  const position = positions.get(positionId);
  
  if (!position || position.status !== 'ACTIVE' || !position.activeOrderHash) {
    return;
  }
  
  // If risk thresholds are breached, don't update the order
  if (checkRiskThresholds(position)) {
    position.operations.isRiskThresholdBreached = true;
    position.logger.warn('Risk thresholds exceeded after settings update, cancelling orders');
    await handleRiskThresholdBreach(position);
    return;
  }
  
  // If not breached but previously was, handle resolution
  if (position.operations.isRiskThresholdBreached) {
    position.operations.isRiskThresholdBreached = false;
    position.logger.info('Risk thresholds now OK after settings update');
    await handleRiskThresholdResolution(position);
    return;
  }
  
  // Otherwise, update the order with new settings
  position.logger.info('Settings changed, updating order');
  await updateOrderForPosition(position);
}

/**
 * Enqueues an operation for a position to prevent race conditions
 * @param {string} positionId - Position ID
 * @param {Function} operation - Async function to execute
 * @returns {Promise<any>} - Result of the operation
 */
async function enqueueOperation(positionId, operation) {
  const queue = operationQueues.get(positionId);
  
  if (!queue) {
    throw new Error(`No operation queue for position ${positionId}`);
  }
  
  return new Promise((resolve, reject) => {
    // Add the operation to the queue
    queue.push(async () => {
      try {
        const result = await operation();
        resolve(result);
        return result; // This ensures the result is passed along for the next operation
      } catch (error) {
        reject(error);
        throw error; // Re-throw to maintain error chain
      } finally {
        // Process the next operation in the queue
        setTimeout(() => {
          if (queue.length > 0) {
            // Remove current operation (already completed)
            queue.shift();
            // Execute the next operation if any
            if (queue.length > 0) {
              queue[0]().catch(err => {
                console.error(`Error in queued operation for position ${positionId}:`, err);
              });
            }
          }
        }, 0);
      }
    });
    
    // If this is the only operation in the queue, execute it immediately
    if (queue.length === 1) {
      queue[0]().catch(err => {
        console.error(`Error in first queued operation for position ${positionId}:`, err);
      });
    }
  });
}

/**
 * Cancels all active orders for all positions
 * @returns {Promise<Array>} - Array of results
 */
export async function cancelAllPositionOrders() {
  const orderHashes = [];
  
  // Collect all active order hashes
  for (const position of positions.values()) {
    if (position.activeOrderHash) {
      orderHashes.push(position.activeOrderHash);
      position.logger.info(`Queuing order ${position.activeOrderHash} for cancellation`);
    }
  }
  
  // If no orders to cancel, return early
  if (orderHashes.length === 0) {
    return [];
  }
  
  try {
    // Cancel all orders in a batch
    const results = await cancelOrders(orderHashes);
    
    // Update position states
    for (const position of positions.values()) {
      if (position.activeOrderHash && orderHashes.includes(position.activeOrderHash)) {
        position.activeOrderHash = null;
        position.orderStatus = 'CANCELLED';
        position.logger.info('Order cancelled in batch operation');
      }
    }
    
    return results;
  } catch (error) {
    logger.error('Error cancelling all position orders:', error);
    throw error;
  }
}