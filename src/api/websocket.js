// src/api/websocket.js - WebSocket connection management
import * as ably from 'ably';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { TOKENS, WS, API } from '../config/constants.js';

// Ably client instance
let realtime = null;
const subscriptions = new Map();
let isConnecting = false;

/**
 * Creates a token request for Ably authentication
 * @returns {Promise<Object>} Token request data
 */
async function createTokenRequest() {
  try {
    const response = await axios.get(API.BASE_URL + API.ENDPOINTS.USER_TOKEN, {
      headers: {
        "X-Api-Key": process.env.SX_BET_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    logger.error('Error creating token request:', error);
    throw error;
  }
}

/**
 * Initializes the Ably client
 * @returns {Promise<void>}
 */
export async function initialize() {
  if (realtime && realtime.connection.state === 'connected') {
    logger.info('WebSocket connection already initialized');
    return;
  }
  
  if (isConnecting) {
    logger.info('WebSocket connection already being initialized');
    // Wait for current connection attempt to complete
    await new Promise(resolve => {
      const checkInterval = setInterval(() => {
        if (!isConnecting) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });
    return;
  }
  
  isConnecting = true;
  
  try {
    logger.info('Initializing WebSocket connection...');
    
    realtime = new ably.Realtime({
      authCallback: async (tokenParams, callback) => {
        try {
          const tokenRequest = await createTokenRequest();
          callback(null, tokenRequest);
        } catch (error) {
          callback(error, null);
        }
      },
      log: { level: 0 }, // Disable verbose Ably logs
    });
    
    await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Connection timeout after 20 seconds'));
      }, 20000);
      
      realtime.connection.once('connected', () => {
        clearTimeout(timeoutId);
        logger.info('Connected to Ably successfully');
        resolve();
      });
      
      realtime.connection.once('failed', (err) => {
        clearTimeout(timeoutId);
        reject(new Error(`Connection failed: ${err.message}`));
      });
    });
    
    // Setup reconnection handling
    realtime.connection.on('disconnected', () => {
      logger.warn('WebSocket disconnected, attempting to reconnect...');
    });
    
    realtime.connection.on('suspended', () => {
      logger.error('WebSocket connection suspended');
    });
    
    realtime.connection.on('error', (err) => {
      logger.error(`WebSocket connection error: ${err.message}`, { error: err });
    });
    
  } catch (error) {
    logger.error('Failed to initialize Ably client:', error);
    throw error;
  } finally {
    isConnecting = false;
  }
}

/**
 * Simplified polling-based approach for getting orderbook data
 * @param {string} marketHash - The market hash to fetch data for
 * @param {Function} callback - Callback function for received data
 * @returns {Promise<Object>} - Interval ID for the polling
 */
async function setupPollingFallback(marketHash, callback) {
  const { fetchOrders } = await import('../api/orderFetcher.js');
  
  logger.info(`Setting up polling fallback for market: ${marketHash}`);
  
  // Immediately fetch initial data
  try {
    const initialOrders = await fetchOrders(marketHash);
    if (initialOrders && Array.isArray(initialOrders)) {
      // Transform orders to expected format
      const updates = initialOrders.map(order => [
        order.orderHash,
        "ACTIVE",
        order.fillAmount || "0",
        order.maker,
        order.totalBetSize,
        order.percentageOdds,
        order.expiry,
        order.apiExpiry,
        order.salt || "",
        order.isMakerBettingOutcomeOne,
        order.signature,
        Date.now().toString(),
        "SXR",
        order.sportXEventId || ""
      ]);
      
      callback(marketHash, updates);
    }
  } catch (error) {
    logger.error(`Error fetching initial orders for polling: ${error.message}`);
  }
  
  // Set up interval for polling
  const intervalId = setInterval(async () => {
    try {
      const orders = await fetchOrders(marketHash);
      if (orders && Array.isArray(orders)) {
        // Transform orders to expected format
        const updates = orders.map(order => [
          order.orderHash,
          "ACTIVE",
          order.fillAmount || "0",
          order.maker,
          order.totalBetSize,
          order.percentageOdds,
          order.expiry,
          order.apiExpiry,
          order.salt || "",
          order.isMakerBettingOutcomeOne,
          order.signature,
          Date.now().toString(),
          "SXR",
          order.sportXEventId || ""
        ]);
        
        callback(marketHash, updates);
      }
    } catch (error) {
      logger.error(`Error polling orders: ${error.message}`);
    }
  }, 10000); // Poll every 10 seconds
  
  return { pollingId: intervalId };
}

/**
 * Subscribe to order book channel for a specific market
 * @param {string} marketHash - The market hash to subscribe to
 * @param {Function} callback - Callback function for order book updates
 * @returns {Promise<boolean>} - Success status
 */
export async function subscribeToOrderBook(marketHash, callback) {
  if (!realtime) {
    try {
      await initialize();
    } catch (error) {
      logger.error(`Failed to initialize WebSocket, using polling fallback: ${error.message}`);
      const pollingData = await setupPollingFallback(marketHash, callback);
      subscriptions.set(marketHash, { pollingId: pollingData.pollingId, callback, isPolling: true });
      return true;
    }
  }
  
  if (subscriptions.has(marketHash)) {
    logger.info(`Already subscribed to order book for market: ${marketHash}`);
    return true;
  }
  
  // First try WebSocket subscription
  try {
    const channelName = `order_book:${TOKENS.USDC.ADDRESS}:${marketHash}`;
    logger.info(`Creating subscription to channel: ${channelName}`);
    
    const channel = realtime.channels.get(channelName);
    
    // Simply subscribe and assume it works
    channel.subscribe(message => {
      if (typeof callback === 'function' && message && message.data) {
        callback(marketHash, message.data);
      }
    });
    
    // Wait a bit to see if any immediate errors occur
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Store subscription
    subscriptions.set(marketHash, { channel, callback, isPolling: false });
    logger.info(`Subscribed to order book channel for market: ${marketHash}`);
    return true;
  } catch (error) {
    logger.error(`WebSocket subscription failed, using polling fallback: ${error.message}`);
    const pollingData = await setupPollingFallback(marketHash, callback);
    subscriptions.set(marketHash, { pollingId: pollingData.pollingId, callback, isPolling: true });
    return true;
  }
}

/**
 * Unsubscribe from the order book channel for a specific market
 * @param {string} marketHash - The market hash to unsubscribe from
 * @returns {Promise<boolean>} - Success status
 */
export async function unsubscribeFromOrderBook(marketHash) {
  if (!subscriptions.has(marketHash)) {
    logger.warn(`No active subscription for market: ${marketHash}`);
    return false;
  }
  
  try {
    const subscription = subscriptions.get(marketHash);
    
    if (subscription.isPolling && subscription.pollingId) {
      // Clear polling interval
      clearInterval(subscription.pollingId);
      logger.info(`Stopped polling for market: ${marketHash}`);
    } else if (subscription.channel) {
      // Unsubscribe from WebSocket channel
      subscription.channel.unsubscribe();
      logger.info(`Unsubscribed from WebSocket for market: ${marketHash}`);
    }
    
    subscriptions.delete(marketHash);
    return true;
  } catch (error) {
    logger.error(`Error unsubscribing from market ${marketHash}:`, error);
    return false;
  }
}

/**
 * Check if currently subscribed to an order book channel
 * @param {string} marketHash - The market hash to check
 * @returns {boolean} - Subscription status
 */
export function isSubscribedToOrderBook(marketHash) {
  return subscriptions.has(marketHash);
}

/**
 * Close all subscriptions and the WebSocket connection
 * @returns {Promise<void>}
 */
export async function closeConnection() {
  try {
    // Unsubscribe from all channels first
    for (const marketHash of subscriptions.keys()) {
      await unsubscribeFromOrderBook(marketHash);
    }
    
    // Close the connection if it exists
    if (realtime) {
      await realtime.close();
      realtime = null;
      logger.info('WebSocket connection closed');
    }
  } catch (error) {
    logger.error('Error closing WebSocket connection:', error);
    throw error;
  }
}