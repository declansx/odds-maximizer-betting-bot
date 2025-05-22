// oddsUtils.js
import { ethers } from 'ethers';

// Step size for odds ladder (0.25%)
export const ODDS_LADDER_STEP_SIZE = 25;

/**
 * Checks if the implied odds are valid according to the odds ladder
 * @param {ethers.BigNumberish} odds - Odds in BigNumber format
 * @returns {boolean} - True if odds are valid
 */
export function checkOddsLadderValid(odds) {
  // Convert to BigInt for modulo operation
  const oddsBI = ethers.toBigInt(odds);
  const stepSize = ethers.parseUnits('1', 16) * BigInt(ODDS_LADDER_STEP_SIZE);
  
  // Check if odds fall on the ladder (modulo equals zero)
  return oddsBI % stepSize === BigInt(0);
}

/**
 * Rounds implied odds to the nearest step on the odds ladder
 * @param {number} impliedOdds - Implied odds in decimal format (e.g., 0.5025)
 * @returns {string} - Rounded odds in API format (with 20 decimals)
 */
export function roundToNearestStep(impliedOdds) {
  // Convert to percentage with 2 decimal places (e.g., 50.25)
  const percentage = impliedOdds * 100;
  
  // Round to nearest step (0.25%)
  const roundedPercentage = Math.round(percentage / 0.25) * 0.25;
  
  // Convert back to implied odds
  const roundedImplied = roundedPercentage / 100;
  
  // Return as string in API format (20 decimals)
  return ethers.parseUnits(roundedImplied.toString(), 20).toString();
}

/**
 * Converts implied odds to readable format
 * @param {string} apiOdds - Odds in API format
 * @returns {number} - Implied odds in decimal format (e.g., 0.5025)
 */
export function apiOddsToReadable(apiOdds) {
  return Number(ethers.formatUnits(apiOdds, 20));
}

/**
 * Converts implied odds to decimal odds
 * @param {number} impliedOdds - Implied odds in decimal format (e.g., 0.5025)
 * @returns {number} - Decimal odds (e.g., 1.99)
 */
export function impliedToDecimalOdds(impliedOdds) {
  return 1 / impliedOdds;
}