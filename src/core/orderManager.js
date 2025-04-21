// src/core/orderManager.js - Manages order creation and cancellation
import { postOrder } from '../api/orderPoster.js';
import { cancelOrders as apiCancelOrders } from '../api/orderCanceller.js';
import { logger } from '../utils/logger.js';
import { roundToNearestStep, checkOddsLadderValid } from '../utils/oddsUtils.js';
import { ORDER } from '../config/constants.js';
import { ethers } from 'ethers';

/**
 * Posts a maker order with retry logic
 * @param {Object} orderParams - Order parameters
 * @param {string} orderParams.marketHash - Market hash
 * @param {boolean} orderParams.isMakerBettingOutcomeOne - True if betting on outcome one
 * @param {number} orderParams.betSizeUSDC - Bet size in USDC
 * @param {number} orderParams.impliedOdds - Implied odds (0-1)
 * @returns {Promise<Object>} - Order result with orderHash
 */
export async function postMakerOrder(orderParams) {
  const { marketHash, isMakerBettingOutcomeOne, betSizeUSDC, impliedOdds } = orderParams;
  
  // Validate odds are on the ladder
  if (!checkOddsLadderValid(ethers.parseUnits(impliedOdds.toString(), 20))) {
    // Round to the nearest step if not valid
    const roundedOdds = roundToNearestStep(impliedOdds);
    logger.warn(`Odds ${impliedOdds} not on ladder, rounding to ${roundedOdds}`);
    orderParams.impliedOdds = roundedOdds;
  }
  
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < ORDER.MAX_RETRY_COUNT) {
    try {
      logger.info('Posting order', { 
        marketHash, 
        isMakerBettingOutcomeOne, 
        betSizeUSDC, 
        impliedOdds: orderParams.impliedOdds 
      });
      
      const result = await postOrder(
        marketHash,
        isMakerBettingOutcomeOne,
        betSizeUSDC,
        orderParams.impliedOdds
      );
      
      if (result.status !== 'success' || !result.data || !result.data.orders || !result.data.orders[0]) {
        throw new Error(`API error: ${JSON.stringify(result)}`);
      }
      
      const orderHash = result.data.orders[0];
      
      logger.info('Order posted successfully', { orderHash });
      
      return { orderHash, status: 'success' };
    } catch (error) {
      lastError = error;
      logger.error(`Error posting order (attempt ${retryCount + 1}/${ORDER.MAX_RETRY_COUNT}): ${error.message}`, { error });
      
      // Exponential backoff for retries
      const delay = ORDER.RETRY_DELAY_MS * Math.pow(ORDER.BACKOFF_FACTOR, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }
  
  logger.error(`Failed to post order after ${ORDER.MAX_RETRY_COUNT} attempts`, { lastError });
  throw lastError;
}

/**
 * Cancels a single order with retry logic
 * @param {string} orderHash - Order hash to cancel
 * @returns {Promise<Object>} - Cancellation result
 */
export async function cancelOrder(orderHash) {
  return cancelOrders([orderHash]);
}

/**
 * Cancels multiple orders with retry logic
 * @param {string[]} orderHashes - Array of order hashes to cancel
 * @returns {Promise<Object>} - Cancellation result
 */
export async function cancelOrders(orderHashes) {
  if (!orderHashes || !orderHashes.length) {
    logger.warn('No orders to cancel');
    return { cancelledCount: 0 };
  }
  
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < ORDER.MAX_RETRY_COUNT) {
    try {
      logger.info('Cancelling orders', { orderHashes });
      
      const result = await apiCancelOrders(orderHashes);
      
      if (result.status !== 'success') {
        throw new Error(`API error: ${JSON.stringify(result)}`);
      }
      
      logger.info('Orders cancelled successfully', { 
        cancelledCount: result.data.cancelledCount 
      });
      
      return result.data;
    } catch (error) {
      lastError = error;
      logger.error(`Error cancelling orders (attempt ${retryCount + 1}/${ORDER.MAX_RETRY_COUNT}): ${error.message}`, { error });
      
      // Exponential backoff for retries
      const delay = ORDER.RETRY_DELAY_MS * Math.pow(ORDER.BACKOFF_FACTOR, retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }
  
  logger.error(`Failed to cancel orders after ${ORDER.MAX_RETRY_COUNT} attempts`, { lastError });
  throw lastError;
}

/**
 * Cancels all active orders for all positions
 * @returns {Promise<void>}
 */
export async function cancelAllActiveOrders() {
  try {
    // This is a bit hacky but avoids circular dependencies
    const { cancelAllPositionOrders } = await import('./positionManager.js');
    
    logger.info('Cancelling all active position orders...');
    await cancelAllPositionOrders();
    logger.info('All active position orders cancelled');
  } catch (error) {
    logger.error(`Error cancelling all active orders: ${error.message}`, { error });
    throw error;
  }
}