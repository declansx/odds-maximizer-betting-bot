// orderFetcher.js - Module for fetching orders from SX Bet API
import fetch from 'node-fetch';

// USDC token address as specified in requirements
const USDC_ADDRESS = '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B';

/**
 * Fetches active orders for specified market(s)
 * @param {string|string[]} marketHashes - Single market hash or array of market hashes 
 * @returns {Promise<Object>} - Promise resolving to the active orders data
 */
export async function fetchOrders(marketHashes) {
  // Handle single market hash or array
  const marketHashesParam = Array.isArray(marketHashes) 
    ? marketHashes.join(',') 
    : marketHashes;
  
  // Construct API URL with query parameters
  const url = new URL('https://api.sx.bet/orders');
  url.searchParams.append('marketHashes', marketHashesParam);
  url.searchParams.append('baseToken', USDC_ADDRESS);
  
  try {
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`API Error: ${data.status}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

/**
 * Groups orders by outcome (1 or 2)
 * @param {Array} orders - Orders array from API
 * @returns {Object} - Orders grouped by outcome
 */
export function groupOrdersByOutcome(orders) {
  return orders.reduce((grouped, order) => {
    const outcome = order.isMakerBettingOutcomeOne ? 2 : 1;
    if (!grouped[outcome]) {
      grouped[outcome] = [];
    }
    grouped[outcome].push(order);
    return grouped;
  }, {});
}