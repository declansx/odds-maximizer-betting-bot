// src/api/orderFetcher.js - Module for fetching orders from SX Bet API
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { TOKENS, API } from '../config/constants.js';

/**
 * Fetches active orders for specified market(s)
 * @param {string|string[]} marketHashes - Single market hash or array of market hashes 
 * @returns {Promise<Array>} - Promise resolving to the active orders data
 */
export async function fetchOrders(marketHashes) {
  // Handle single market hash or array
  const marketHashesParam = Array.isArray(marketHashes) 
    ? marketHashes.join(',') 
    : marketHashes;
  
  // Construct API URL with query parameters
  const url = new URL(`${API.BASE_URL}${API.ENDPOINTS.ORDERS}`);
  url.searchParams.append('marketHashes', marketHashesParam);
  url.searchParams.append('baseToken', TOKENS.USDC.ADDRESS);
  
  try {
    logger.info(`Fetching orders for markets: ${marketHashesParam}`);
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`API Error: ${data.status}`);
    }
    
    logger.info(`Fetched ${data.data.length} orders for markets: ${marketHashesParam}`);
    return data.data;
  } catch (error) {
    logger.error(`Error fetching orders for markets ${marketHashesParam}:`, error);
    throw error;
  }
}

/**
 * Groups orders by outcome (1 or 2) based on what the maker is betting on
 * @param {Array} orders - Orders array from API
 * @returns {Object} - Orders grouped by outcome
 */
export function groupOrdersByOutcome(orders) {
  return orders.reduce((grouped, order) => {
    // If isMakerBettingOutcomeOne is true, maker is betting on outcome 1
    // If isMakerBettingOutcomeOne is false, maker is betting on outcome 2
    const outcome = order.isMakerBettingOutcomeOne ? 1 : 2;
    
    if (!grouped[outcome]) {
      grouped[outcome] = [];
    }
    grouped[outcome].push(order);
    return grouped;
  }, {});
}

/**
 * Fetches orders with retry logic
 * @param {string|string[]} marketHashes - Single market hash or array of market hashes
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} retryDelay - Delay between retries in milliseconds
 * @returns {Promise<Array>} - Promise resolving to the active orders data
 */
export async function fetchOrdersWithRetry(marketHashes, maxRetries = 3, retryDelay = 1000) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchOrders(marketHashes);
    } catch (error) {
      lastError = error;
      logger.warn(`Attempt ${attempt}/${maxRetries} failed fetching orders: ${error.message}`);
      
      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }
  
  // All retries failed
  throw lastError;
}