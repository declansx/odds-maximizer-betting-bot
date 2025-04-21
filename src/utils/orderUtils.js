// src/utils/orderUtils.js - Utility functions for order calculations
import { ethers } from 'ethers';
import { TOKENS } from '../config/constants.js';

/**
 * Converts token amount from Ethereum units to nominal units
 * @param {string} ethereumAmount - Amount in Ethereum units (string)
 * @param {number} decimals - Token decimals (default: 6 for USDC)
 * @returns {number} - Amount in nominal units
 */
export function toNominalAmount(ethereumAmount, decimals = TOKENS.USDC.DECIMALS) {
  if (!ethereumAmount) return 0;
  
  try {
    return Number(ethers.formatUnits(ethereumAmount, decimals));
  } catch (error) {
    console.error('Error converting to nominal amount:', error);
    return 0;
  }
}

/**
 * Converts nominal amount to Ethereum units
 * @param {number} nominalAmount - Amount in nominal units
 * @param {number} decimals - Token decimals (default: 6 for USDC)
 * @returns {string} - Amount in Ethereum units as string
 */
export function toEthereumAmount(nominalAmount, decimals = TOKENS.USDC.DECIMALS) {
  try {
    return ethers.parseUnits(nominalAmount.toString(), decimals).toString();
  } catch (error) {
    console.error('Error converting to Ethereum amount:', error);
    return '0';
  }
}

/**
 * Converts percentage odds from contract format to readable implied odds
 * @param {string} percentageOdds - Odds in contract format (string)
 * @returns {number} - Implied odds (0-1)
 */
export function toImpliedOdds(percentageOdds) {
  if (!percentageOdds) return 0;
  
  try {
    return Number(ethers.formatUnits(percentageOdds, 20));
  } catch (error) {
    console.error('Error converting to implied odds:', error);
    return 0;
  }
}

/**
 * Converts implied odds to percentage odds in contract format
 * @param {number} impliedOdds - Implied odds (0-1)
 * @returns {string} - Odds in contract format
 */
export function toPercentageOdds(impliedOdds) {
  try {
    return ethers.parseUnits(impliedOdds.toString(), 20).toString();
  } catch (error) {
    console.error('Error converting to percentage odds:', error);
    return '0';
  }
}

/**
 * Calculates the implied odds for a taker
 * @param {string} percentageOdds - Maker's odds in contract format (string)
 * @returns {number} - Taker's implied odds (0-1)
 */
export function calculateTakerImpliedOdds(percentageOdds) {
  const makerOdds = toImpliedOdds(percentageOdds);
  return 1 - makerOdds;
}

/**
 * Converts implied odds to decimal odds format
 * @param {number} impliedOdds - Implied odds (0-1)
 * @returns {number} - Decimal odds
 */
export function toDecimalOdds(impliedOdds) {
  if (!impliedOdds || impliedOdds <= 0) return 0;
  return 1 / impliedOdds;
}

/**
 * Calculates the remaining bet size available for a taker
 * @param {string} totalBetSize - Total bet size in Ethereum units (string)
 * @param {string} fillAmount - Amount already filled in Ethereum units (string)
 * @param {string} percentageOdds - Odds in contract format (string)
 * @returns {number} - Remaining taker bet size in nominal units
 */
export function calculateRemainingTakerSpace(totalBetSize, fillAmount, percentageOdds) {
  try {
    const totalBetSizeBN = BigInt(totalBetSize || '0');
    const fillAmountBN = BigInt(fillAmount || '0');
    const remainingMakerAmount = totalBetSizeBN - fillAmountBN;
    
    if (remainingMakerAmount <= 0n) {
      return 0;
    }
    
    const percentageOddsBN = BigInt(percentageOdds || '0');
    if (percentageOddsBN <= 0n) {
      return 0;
    }
    
    // Formula: remainingTakerSpace = (totalBetSize - fillAmount) * 10^20 / percentageOdds - (totalBetSize - fillAmount)
    const takerSpaceBN = (remainingMakerAmount * (10n ** 20n) / percentageOddsBN) - remainingMakerAmount;
    
    // Convert to nominal units
    return toNominalAmount(takerSpaceBN.toString());
  } catch (error) {
    console.error('Error calculating remaining taker space:', error);
    return 0;
  }
}

/**
 * Formats an order for display from taker's perspective
 * @param {Object} order - Order object from API
 * @returns {Object} - Formatted order with taker's perspective
 */
export function formatOrderForTaker(order) {
  const {
    totalBetSize,
    fillAmount,
    percentageOdds,
    isMakerBettingOutcomeOne,
    orderHash
  } = order;
  
  // Calculate taker's implied odds
  const takerImpliedOdds = calculateTakerImpliedOdds(percentageOdds);
  const takerDecimalOdds = toDecimalOdds(takerImpliedOdds);
  
  // Calculate remaining bet size for taker
  const remainingTakerSpace = calculateRemainingTakerSpace(totalBetSize, fillAmount, percentageOdds);
  
  return {
    orderHash,
    outcome: isMakerBettingOutcomeOne ? 2 : 1, // Taker bets opposite of maker
    impliedOdds: takerImpliedOdds,
    impliedOddsFormatted: `${(takerImpliedOdds * 100).toFixed(2)}%`,
    decimalOdds: takerDecimalOdds.toFixed(2),
    availableBetSize: remainingTakerSpace.toFixed(2),
    createdAt: order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'
  };
}