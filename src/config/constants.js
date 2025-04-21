// src/config/constants.js - Application constants
import { ethers } from 'ethers';

// Token-related constants
export const TOKENS = {
  USDC: {
    ADDRESS: '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B',
    DECIMALS: 6,
    DIVISOR: BigInt(10 ** 6)
  }
};

// Chain-related constants
export const CHAIN = {
  ID: 4162,
  VERSION: 'SXR',
  DOMAIN_NAME: 'CancelOrderV2SportX',
  DOMAIN_VERSION: '1.0',
};

// Contract addresses - Will be properly initialized at runtime
export const ADDRESSES = {
  EXECUTOR: '0x52adf738AAD93c31f798a30b2C74D658e1E9a562',
  MAKER: '' // Will be set from private key at runtime
};

// API endpoints
export const API = {
  BASE_URL: 'https://api.sx.bet',
  ENDPOINTS: {
    SPORTS: '/sports',
    LEAGUES: '/leagues/active',
    FIXTURES: '/fixture/active',
    MARKETS: '/markets/active',
    ORDERS: '/orders',
    POST_ORDER: '/orders/new',
    CANCEL_ORDER: '/orders/cancel/v2',
    USER_TOKEN: '/user/token',
  }
};

// WebSocket-related constants
export const WS = {
  RETRY_DELAY: 5000, // 5 seconds
  MAX_RETRIES: 3,
  CONNECTION_TIMEOUT: 20000, // 20 seconds
  SUBSCRIPTION_TIMEOUT: 15000, // 15 seconds
  POLLING_INTERVAL: 10000, // 10 seconds
};

// Odds-related constants
export const ODDS = {
  LADDER_STEP_SIZE: 25, // 0.25%
  MIN_IMPLIED_ODDS: 0.01, // 1%
  MAX_IMPLIED_ODDS: 0.99, // 99%
  STEP_SIZE_DIVISOR: BigInt(10 ** 16)
};

// Time-related constants (in milliseconds)
export const TIME = {
  HOUR_MS: 60 * 60 * 1000,
  DAY_MS: 24 * 60 * 60 * 1000,
  TWO_DAYS_MS: 2 * 24 * 60 * 60 * 1000,
  ORDER_EXPIRY_SECONDS: 3600 // 1 hour in seconds
};

// CLI-related constants
export const CLI = {
  TEMP_MESSAGE_TIMEOUT: 3000, // 3 seconds
  DEFAULT_PREMIUM: 10, // 10%
  DEFAULT_MAX_VIG: 5, // 5%
  DEFAULT_LIQUIDITY: 500, // 500 USDC
  DEFAULT_MIN_BET_SIZE_ODDS: 10, // 10 USDC
  DEFAULT_MIN_BET_SIZE_VIG: 20, // 20 USDC
};

// Order-related constants
export const ORDER = {
  MAX_RETRY_COUNT: 3,
  RETRY_DELAY_MS: 1000, // 1 second
  BACKOFF_FACTOR: 2, // Exponential backoff
  STANDARD_EXPIRY: 2209006800, // Standard expiry date
  EXPIRY_SECONDS: 3600 // 1 hour in seconds
};

// Position-related constants
export const POSITION = {
  FILL_COMPLETION_THRESHOLD: 99, // 99% filled is considered complete
};

// The amount necessary to consider a position fully filled (99.5%)
export const FILL_COMPLETION_THRESHOLD = 0.995;

// Initialize maker address from private key if available
try {
  if (typeof process !== 'undefined' && process.env && process.env.PRIVATE_KEY) {
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    ADDRESSES.MAKER = wallet.address;
  }
} catch (error) {
  console.error('Error initializing maker address from private key:', error.message);
}