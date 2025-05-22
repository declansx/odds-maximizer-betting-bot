// websocket.js
// Module for connecting to SX Bet API websocket channels (order_book)

import * as ably from 'ably';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, 'websocket_logs.txt');

// USDC token address
const BASE_TOKEN = '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B';

// Ably client instance
let realtime = null;
let activeChannel = null;
let isSubscribed = false;

/**
 * Creates a token request for Ably authentication
 * @returns {Promise<Object>} Token request data
 */
async function createTokenRequest() {
  try {
    const response = await axios.get("https://api.sx.bet/user/token", {
      headers: {
        "X-Api-Key": process.env.SX_BET_API_KEY,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error creating token request:', error.message);
    throw error;
  }
}

/**
 * Initializes the Ably client
 * @returns {Promise<void>}
 */
async function initialize() {
  try {
    realtime = new ably.Realtime({
      authCallback: async (tokenParams, callback) => {
        try {
          const tokenRequest = await createTokenRequest();
          callback(null, tokenRequest);
        } catch (error) {
          callback(error, null);
        }
      },
    });
    
    await new Promise((resolve, reject) => {
      realtime.connection.once('connected', () => {
        console.log('Connected to Ably successfully');
        resolve();
      });
      
      realtime.connection.once('failed', (err) => {
        reject(new Error(`Connection failed: ${err.message}`));
      });
    });
  } catch (error) {
    console.error('Failed to initialize Ably client:', error.message);
    throw error;
  }
}

/**
 * Logs message to file
 * @param {Object} message Message to log
 */
function logMessageToFile(message) {
  const timestamp = new Date().toISOString();
  const logData = `[${timestamp}] ${JSON.stringify(message)}\n`;
  
  fs.appendFile(logPath, logData, (err) => {
    if (err) {
      console.error('Error writing to log file:', err.message);
    }
  });
}

/**
 * Subscribe to order book channel for a specific market
 * @param {string} marketHash The market hash to subscribe to
 * @returns {Promise<boolean>} Success status
 */
async function subscribeToOrderBook(marketHash) {
  if (!realtime) {
    await initialize();
  }
  
  // Unsubscribe from any existing channel
  if (activeChannel) {
    await unsubscribeFromOrderBook();
  }
  
  try {
    const channelName = `order_book:${BASE_TOKEN}:${marketHash}`;
    activeChannel = realtime.channels.get(channelName);
    
    activeChannel.subscribe((message) => {
      logMessageToFile(message.data);
    });
    
    isSubscribed = true;
    console.log(`Subscribed to order book channel for market: ${marketHash}`);
    return true;
  } catch (error) {
    console.error('Error subscribing to order book channel:', error.message);
    return false;
  }
}

/**
 * Unsubscribe from the current order book channel
 * @returns {Promise<boolean>} Success status
 */
async function unsubscribeFromOrderBook() {
  if (!activeChannel) {
    console.log('No active subscription to unsubscribe from');
    return false;
  }
  
  try {
    await activeChannel.unsubscribe();
    console.log('Unsubscribed from order book channel');
    activeChannel = null;
    isSubscribed = false;
    return true;
  } catch (error) {
    console.error('Error unsubscribing from order book channel:', error.message);
    return false;
  }
}

/**
 * Check if currently subscribed to an order book channel
 * @returns {boolean} Subscription status
 */
function isSubscribedToChannel() {
  return isSubscribed;
}

/**
 * Close the connection
 */
async function closeConnection() {
  if (realtime) {
    await realtime.close();
    realtime = null;
    activeChannel = null;
    isSubscribed = false;
    console.log('Connection closed');
  }
}

export {
  initialize,
  subscribeToOrderBook,
  unsubscribeFromOrderBook,
  isSubscribedToChannel,
  closeConnection
};