// src/api/orderPoster.js - Module for posting orders to SX Bet API
import { ethers } from 'ethers';
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { TOKENS, ADDRESSES, API, ORDER } from '../config/constants.js';

/**
 * Creates and posts a new order to the SX Bet exchange
 * @param {string} marketHash - The market hash to bet on
 * @param {boolean} isMakerBettingOutcomeOne - True if betting on outcome one, false for outcome two
 * @param {number} betSizeUSDC - Bet size in USDC (e.g., 10 for 10 USDC)
 * @param {number} impliedOdds - Desired implied odds (e.g., 0.5 for 50%)
 * @returns {Promise<object>} - API response
 */
export async function postOrder(marketHash, isMakerBettingOutcomeOne, betSizeUSDC, impliedOdds) {
  try {
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }
    
    // Get maker address from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const maker = wallet.address;
    
    // Convert USDC amount to correct units (6 decimals for USDC)
    const totalBetSize = ethers.parseUnits(betSizeUSDC.toString(), TOKENS.USDC.DECIMALS).toString();
    
    // Convert implied odds to the format needed for the API (20 decimals)
    const percentageOdds = ethers.parseUnits(impliedOdds.toString(), 20).toString();
    
    // Current time + 1 hour for API expiry (ensure it's an integer)
    const apiExpiry = Math.floor(Date.now() / 1000) + ORDER.EXPIRY_SECONDS;
    
    logger.info('Order details: ', {
      marketHash,
      maker,
      totalBetSize,
      percentageOdds,
      apiExpiry,
      isMakerBettingOutcomeOne
    });
    
    // Create order object
    const order = {
      marketHash,
      maker,
      totalBetSize,
      percentageOdds,
      baseToken: TOKENS.USDC.ADDRESS,
      apiExpiry,
      expiry: ORDER.STANDARD_EXPIRY,
      executor: ADDRESSES.EXECUTOR,
      isMakerBettingOutcomeOne,
      salt: ethers.hexlify(ethers.randomBytes(32)),
    };

    // Generate order hash
    const orderHash = ethers.solidityPackedKeccak256(
      [
        'bytes32',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'address',
        'address',
        'bool',
      ],
      [
        order.marketHash,
        order.baseToken,
        order.totalBetSize,
        order.percentageOdds,
        order.expiry,
        order.salt,
        order.maker,
        order.executor,
        order.isMakerBettingOutcomeOne,
      ]
    );

    // Sign the order hash
    const signature = await wallet.signMessage(ethers.getBytes(orderHash));
    
    // Combine order with signature
    const signedOrder = { ...order, signature };

    logger.info('Posting order to API', { orderHash });

    // Post to API
    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.POST_ORDER}`, {
      method: 'POST',
      body: JSON.stringify({ orders: [signedOrder] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`API Error: ${JSON.stringify(data)}`);
    }
    
    logger.info('Order posted successfully', { 
      orderHash: data.data.orders[0],
      betSizeUSDC,
      impliedOdds
    });
    
    return data;
  } catch (error) {
    logger.error('Error posting order:', error);
    throw error;
  }
}