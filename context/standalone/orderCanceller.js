// orderCanceller.js
import { ethers } from 'ethers';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import dotenv from 'dotenv';

dotenv.config();

const CONSTANTS = {
  MAKER: '0xa6fa134f76496300419E6dbee487239F09d247aE',
  CHAIN_ID: 4162,
  DOMAIN_NAME: 'CancelOrderV2SportX',
  DOMAIN_VERSION: '1.0',
  CHAIN_VERSION: 'SXR',
  API_ENDPOINT: 'https://api.sx.bet/orders/cancel/v2'
};

/**
 * Creates EIP712 payload for order cancellation
 * @param {string[]} orderHashes - Array of order hashes to cancel
 * @param {string} salt - Random salt as hex string
 * @param {number} timestamp - Current timestamp in seconds
 * @returns {object} - EIP712 typed data
 */
function getCancelOrderEIP712Payload(orderHashes, salt, timestamp) {
  const payload = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'salt', type: 'bytes32' },
      ],
      Details: [
        { name: 'orderHashes', type: 'string[]' },
        { name: 'timestamp', type: 'uint256' },
      ],
    },
    primaryType: 'Details',
    domain: {
      name: CONSTANTS.DOMAIN_NAME,
      version: CONSTANTS.DOMAIN_VERSION,
      chainId: CONSTANTS.CHAIN_ID,
      salt,
    },
    message: { 
      orderHashes, 
      timestamp 
    },
  };
  
  return payload;
}

/**
 * Cancels orders on the SX Bet exchange
 * @param {string[]} orderHashes - Array of order hashes to cancel
 * @returns {Promise<object>} - API response
 */
export async function cancelOrders(orderHashes) {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('PRIVATE_KEY not found in .env file');
    }
    
    // Strip '0x' prefix if present for @metamask/eth-sig-util
    const bufferPrivateKey = Buffer.from(
      privateKey.startsWith('0x') ? privateKey.substring(2) : privateKey, 
      'hex'
    );
    
    // Generate random salt
    const salt = `0x${Buffer.from(ethers.randomBytes(32)).toString('hex')}`;
    
    // Current timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create payload for signing
    const payload = getCancelOrderEIP712Payload(orderHashes, salt, timestamp);
    
    // Sign the payload
    const signature = signTypedData({
      privateKey: bufferPrivateKey,
      data: payload,
      version: SignTypedDataVersion.V4,
    });
    
    // Create API payload
    const apiPayload = {
      signature,
      orderHashes,
      salt,
      maker: CONSTANTS.MAKER,
      timestamp,
    };
    
    // Add chain version query parameter if not default
    const queryParams = CONSTANTS.CHAIN_VERSION ? 
      `?chainVersion=${CONSTANTS.CHAIN_VERSION}` : '';
    
    // Send request to API
    const response = await fetch(`${CONSTANTS.API_ENDPOINT}${queryParams}`, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error cancelling orders:', error);
    throw error;
  }
}