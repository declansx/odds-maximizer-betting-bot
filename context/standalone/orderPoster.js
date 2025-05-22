// orderPoster.js
import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const CONSTANTS = {
  MAKER: '0xa6fa134f76496300419E6dbee487239F09d247aE',
  EXECUTOR: '0x52adf738AAD93c31f798a30b2C74D658e1E9a562',
  BASE_TOKEN: '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B',
  API_ENDPOINT: 'https://api.sx.bet/orders/new'
};

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
    // Convert USDC amount to correct units (6 decimals for USDC)
    const totalBetSize = ethers.parseUnits(betSizeUSDC.toString(), 6).toString();
    
    // Convert implied odds to the format needed for the API
    // Implied odds are represented with 20 decimals (10^20)
    const percentageOdds = ethers.parseUnits(impliedOdds.toString(), 20).toString();
    
    // Current time + 1 hour for API expiry
    const apiExpiry = Math.floor(Date.now() / 1000) + 3600;
    
    // Create order object
    const order = {
      marketHash,
      maker: CONSTANTS.MAKER,
      totalBetSize,
      percentageOdds,
      baseToken: CONSTANTS.BASE_TOKEN,
      apiExpiry,
      expiry: 2209006800, // Deprecated but required
      executor: CONSTANTS.EXECUTOR,
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
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }
    
    const wallet = new ethers.Wallet(privateKey);
    const signature = await wallet.signMessage(ethers.getBytes(orderHash));
    
    // Combine order with signature
    const signedOrder = { ...order, signature };

    // Post to API
    const response = await fetch(CONSTANTS.API_ENDPOINT, {
      method: 'POST',
      body: JSON.stringify({ orders: [signedOrder] }),
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error posting order:', error);
    throw error;
  }
}