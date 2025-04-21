// src/api/orderCanceller.js - Module for cancelling orders on SX Bet API
import { ethers } from 'ethers';
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util';
import { logger } from '../utils/logger.js';
import { CHAIN, API } from '../config/constants.js';

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
      name: CHAIN.DOMAIN_NAME,
      version: CHAIN.DOMAIN_VERSION,
      chainId: CHAIN.ID,
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
    if (!process.env.PRIVATE_KEY) {
      throw new Error('PRIVATE_KEY not found in environment variables');
    }
    
    // Get maker address from private key
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
    const maker = wallet.address;
    
    // Strip '0x' prefix if present for @metamask/eth-sig-util
    const bufferPrivateKey = Buffer.from(
      process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY.substring(2) : process.env.PRIVATE_KEY, 
      'hex'
    );
    
    // Generate random salt
    const salt = `0x${Buffer.from(ethers.randomBytes(32)).toString('hex')}`;
    
    // Current timestamp in seconds
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Create payload for signing
    const payload = getCancelOrderEIP712Payload(orderHashes, salt, timestamp);
    
    logger.info('Creating cancel order payload', { 
      orderHashes,
      timestamp
    });
    
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
      maker,
      timestamp,
    };
    
    // Add chain version query parameter
    const queryParams = CHAIN.VERSION ? 
      `?chainVersion=${CHAIN.VERSION}` : '';
    
    logger.info('Sending cancel order request to API', { 
      orderCount: orderHashes.length 
    });
    
    // Send request to API
    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.CANCEL_ORDER}${queryParams}`, {
      method: 'POST',
      body: JSON.stringify(apiPayload),
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.json();
    
    if (data.status !== 'success') {
      throw new Error(`API Error: ${JSON.stringify(data)}`);
    }
    
    logger.info('Orders cancelled successfully', { 
      cancelledCount: data.data.cancelledCount 
    });
    
    return data;
  } catch (error) {
    logger.error('Error cancelling orders:', error);
    throw error;
  }
}