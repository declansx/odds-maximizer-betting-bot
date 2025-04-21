// src/utils/oddsUtils.js - Utility functions for odds calculations
import { ethers } from 'ethers';
import { ODDS } from '../config/constants.js';

/**
 * Checks if the implied odds are valid according to the odds ladder
 * @param {string|ethers.BigNumber} odds - Odds in BigNumber format or string
 * @returns {boolean} - True if odds are valid
 */
export function checkOddsLadderValid(odds) {
  try {
    // Convert to BigInt for modulo operation
    const oddsBI = ethers.toBigInt(odds);
    const stepSize = ODDS.STEP_SIZE_DIVISOR * BigInt(ODDS.LADDER_STEP_SIZE);
    
    // Check if odds fall on the ladder (modulo equals zero)
    return oddsBI % stepSize === 0n;
  } catch (error) {
    console.error('Error checking odds ladder validity:', error);
    return false;
  }
}

/**
 * Rounds implied odds to the nearest step on the odds ladder
 * @param {number} impliedOdds - Implied odds in decimal format (e.g., 0.5025)
 * @returns {number} - Rounded odds in implied format
 */
export function roundToNearestStep(impliedOdds) {
  try {
    // Convert to percentage with 2 decimal places (e.g., 50.25)
    const percentage = impliedOdds * 100;
    
    // Round to nearest step (0.25%)
    const roundedPercentage = Math.round(percentage / 0.25) * 0.25;
    
    // Convert back to implied odds
    const roundedImplied = roundedPercentage / 100;
    
    return roundedImplied;
  } catch (error) {
    console.error('Error rounding to nearest step:', error);
    return impliedOdds;
  }
}

/**
 * Converts implied odds to API format
 * @param {number} impliedOdds - Implied odds in decimal format (e.g., 0.5025)
 * @returns {string} - Odds in API format (with 20 decimals)
 */
export function impliedToApiOdds(impliedOdds) {
  try {
    return ethers.parseUnits(impliedOdds.toString(), 20).toString();
  } catch (error) {
    console.error('Error converting to API odds:', error);
    return '0';
  }
}

/**
 * Converts API format odds to implied odds
 * @param {string} apiOdds - Odds in API format
 * @returns {number} - Implied odds in decimal format (e.g., 0.5025)
 */
export function apiOddsToImplied(apiOdds) {
  try {
    return Number(ethers.formatUnits(apiOdds, 20));
  } catch (error) {
    console.error('Error converting to implied odds:', error);
    return 0;
  }
}

/**
 * Converts implied odds to decimal odds
 * @param {number} impliedOdds - Implied odds in decimal format (e.g., 0.5025)
 * @returns {number} - Decimal odds (e.g., 1.99)
 */
export function impliedToDecimalOdds(impliedOdds) {
  if (!impliedOdds || impliedOdds <= 0) return 0;
  return 1 / impliedOdds;
}

/**
 * Converts decimal odds to implied odds
 * @param {number} decimalOdds - Decimal odds (e.g., 1.99)
 * @returns {number} - Implied odds in decimal format (e.g., 0.5025)
 */
export function decimalToImpliedOdds(decimalOdds) {
  if (!decimalOdds || decimalOdds <= 0) return 0;
  return 1 / decimalOdds;
}

/**
 * Validates odds are within acceptable range
 * @param {number} impliedOdds - Implied odds in decimal format
 * @returns {boolean} - True if odds are valid
 */
export function validateOddsRange(impliedOdds) {
  return impliedOdds >= ODDS.MIN_IMPLIED_ODDS && 
         impliedOdds <= ODDS.MAX_IMPLIED_ODDS;
}

/**
 * Formats implied odds for display
 * @param {number} impliedOdds - Implied odds in decimal format
 * @returns {string} - Formatted odds string (e.g., "50.25%")
 */
export function formatImpliedOdds(impliedOdds) {
  if (!impliedOdds && impliedOdds !== 0) return 'N/A';
  return `${(impliedOdds * 100).toFixed(2)}%`;
}

/**
 * Formats decimal odds for display
 * @param {number} decimalOdds - Decimal odds
 * @returns {string} - Formatted odds string (e.g., "1.99")
 */
export function formatDecimalOdds(decimalOdds) {
  if (!decimalOdds && decimalOdds !== 0) return 'N/A';
  return decimalOdds.toFixed(2);
}