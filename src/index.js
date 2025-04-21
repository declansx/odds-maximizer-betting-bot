// src/index.js - Main entry point for the SX Bet Odds Maximizer Bot
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import { startCLI } from './cli/index.js';
import { initialize as initializeWebsocket } from './api/websocket.js';
import { cancelAllActiveOrders } from './core/orderManager.js';
import { logger } from './utils/logger.js';
import { ADDRESSES } from './config/constants.js';

// Load environment variables
dotenv.config();

/**
 * Validates required environment variables and formats
 * @returns {boolean} - True if all required env vars are set and valid
 */
function validateEnvironment() {
  const requiredEnvVars = ['PRIVATE_KEY', 'SX_BET_API_KEY'];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      logger.error(`Missing required environment variable: ${envVar}`);
      return false;
    }
  }
  
  // Validate API key is reasonable length
  if (process.env.SX_BET_API_KEY.length < 10) {
    logger.error('SX_BET_API_KEY appears invalid (too short)');
    return false;
  }
  
  // Validate private key format
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const formattedKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    
    if (!ethers.isHexString(formattedKey) || formattedKey.length !== 66) {
      logger.error('PRIVATE_KEY is not a valid 32-byte hex string');
      return false;
    }
    
    // Set maker address from private key
    const wallet = new ethers.Wallet(formattedKey);
    ADDRESSES.MAKER = wallet.address;
    logger.info(`Maker address: ${ADDRESSES.MAKER}`);
    
    return true;
  } catch (error) {
    logger.error(`Error validating private key: ${error.message}`);
    return false;
  }
}

/**
 * Initializes the application
 * @returns {Promise<void>}
 */
async function init() {
  try {
    logger.info('Starting SX Bet Odds Maximizer Bot...');
    
    // Validate environment
    if (!validateEnvironment()) {
      logger.error('Environment validation failed. Exiting...');
      process.exit(1);
    }
    
    // Initialize WebSocket connection
    try {
      await initializeWebsocket();
      logger.info('WebSocket connection initialized successfully');
    } catch (wsError) {
      logger.warn(`WebSocket connection failed, using polling fallback: ${wsError.message}`);
    }
    
    // Register cleanup handler for graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT. Cleaning up...');
      await cleanup();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM. Cleaning up...');
      await cleanup();
      process.exit(0);
    });
    
    // Start the CLI
    await startCLI();
    
  } catch (error) {
    logger.error('Initialization error:', error);
    process.exit(1);
  }
}

/**
 * Cleanup function for graceful shutdown
 * @returns {Promise<void>}
 */
async function cleanup() {
  try {
    logger.info('Cancelling all active orders...');
    await cancelAllActiveOrders();
    logger.info('All active orders cancelled. Shutting down...');
  } catch (error) {
    logger.error('Error during cleanup:', error);
  }
}

// Start the application
init().catch(error => {
  logger.error('Fatal error:', error);
  process.exit(1);
});