// src/cli/viewPositions.js - CLI flow for viewing active positions
import inquirer from 'inquirer';
import { getAllPositions, getPosition, updatePosition, closePosition } from '../core/positionManager.js';
import { logger, cliLogger } from '../utils/logger.js';
import { formatImpliedOdds, formatDecimalOdds } from '../utils/oddsUtils.js';
import { CLI } from '../config/constants.js';
import { formatDate } from '../utils/dateUtils.js';

/**
 * CLI flow for viewing and managing active positions
 * @returns {Promise<void>}
 */
export async function viewPositions() {
  try {
    // Get all active positions
    const positions = getAllPositions();
    
    if (!positions || positions.length === 0) {
      cliLogger.info('No active positions found');
      return;
    }
    
    // Display positions list
    cliLogger.info(`Found ${positions.length} active position(s):`);
    
    const positionChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'positionId',
        message: 'Select a position to view:',
        choices: positions.map(position => ({
          name: `${position.teamOneName} vs ${position.teamTwoName} - ${position.outcomeName} (${Math.round(position.fillPercentage)}% filled)`,
          value: position.id
        }))
      }
    ]);
    
    // Get the selected position
    const position = getPosition(positionChoice.positionId);
    
    if (!position) {
      cliLogger.error('Position not found');
      return;
    }
    
    // Display position details
    displayPositionDetails(position);
    
    // Options for position management
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do with this position?',
        choices: [
          { name: 'Close position permanently', value: 'close' },
          { name: 'Edit position settings', value: 'edit' },
          { name: 'Back to main menu', value: 'back' }
        ]
      }
    ]);
    
    switch (action) {
      case 'close':
        await handleClosePosition(position);
        break;
        
      case 'edit':
        await handleEditPosition(position);
        break;
        
      case 'back':
      default:
        return;
    }
    
  } catch (error) {
    cliLogger.error(`Error viewing positions: ${error.message}`);
    logger.error('Error in view positions flow:', error);
  }
}

/**
 * Displays detailed information about a position
 * @param {Object} position - Position object
 */
function displayPositionDetails(position) {
  cliLogger.info('\nPosition Details:');
  cliLogger.info('=================');
  cliLogger.info(`ID: ${position.id}`);
  cliLogger.info(`Market: ${position.teamOneName} vs ${position.teamTwoName}`);
  cliLogger.info(`Type: ${getMarketTypeName(position.marketType)}${position.line ? ` (${position.line})` : ''}`);
  cliLogger.info(`Outcome: ${position.outcomeName}`);
  cliLogger.info(`Start Date: ${formatDate(position.startDate)}`);
  cliLogger.info(`Status: ${position.status}`);
  cliLogger.info(`Order Status: ${position.orderStatus}`);
  cliLogger.info(`Bet Size: ${position.maxFillAmount} USDC`);
  cliLogger.info(`Filled: ${position.fillAmount} USDC (${position.fillPercentage.toFixed(2)}%)`);
  
  if (position.activeOrderHash) {
    cliLogger.info(`Active Order: ${position.activeOrderHash}`);
  }
  
  if (position.bestTakerOdds) {
    cliLogger.info(`Current Best Taker Odds: ${formatImpliedOdds(position.bestTakerOdds)} (${formatDecimalOdds(1/position.bestTakerOdds)})`);
  }
  
  if (position.lastOrderOdds) {
    const premiumOdds = position.lastOrderOdds * (1 - position.premium/100);
    cliLogger.info(`Last Order Odds: ${formatImpliedOdds(premiumOdds)} (${formatDecimalOdds(1/premiumOdds)})`);
  }
  
  cliLogger.info('\nRisk Settings:');
  cliLogger.info(`Premium: ${position.premium}%`);
  cliLogger.info(`Max Vig: ${position.maxVig}%`);
  cliLogger.info(`Min Liquidity: ${position.minLiquidity} USDC`);
  cliLogger.info(`Min Bet Size for Odds: ${position.minBetSizeOdds} USDC`);
  cliLogger.info(`Min Bet Size for Vig: ${position.minBetSizeVig} USDC`);
  
  cliLogger.info('\nMarket Status:');
  if (position.currentVig !== null) {
    cliLogger.info(`Current Vig: ${position.currentVig.toFixed(2)}%`);
  }
  
  if (position.currentLiquidity) {
    cliLogger.info(`Liquidity Outcome 1: ${position.currentLiquidity.outcome1?.toFixed(2) || 'N/A'} USDC`);
    cliLogger.info(`Liquidity Outcome 2: ${position.currentLiquidity.outcome2?.toFixed(2) || 'N/A'} USDC`);
  }
  
  if (position.operations.isRiskThresholdBreached) {
    cliLogger.info('Risk Status: THRESHOLDS EXCEEDED');
  } else {
    cliLogger.info('Risk Status: OK');
  }
}

/**
 * Handles the flow for closing a position
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function handleClosePosition(position) {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to close this position permanently?',
      default: false
    }
  ]);
  
  if (!confirm) {
    cliLogger.info('Operation cancelled');
    return;
  }
  
  try {
    cliLogger.info('Closing position...');
    await closePosition(position.id);
    cliLogger.info('Position closed successfully');
  } catch (error) {
    cliLogger.error(`Error closing position: ${error.message}`);
  }
}

/**
 * Handles the flow for editing a position
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function handleEditPosition(position) {
  try {
    const updatedSettings = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxFillAmount',
        message: 'Enter your maximum bet size in USDC:',
        default: position.maxFillAmount,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'premium',
        message: 'Enter your premium percentage (e.g., 10 for 10%):',
        default: position.premium,
        validate: value => value >= 0 && value < 100 ? true : 'Please enter a number between 0 and 100'
      },
      {
        type: 'number',
        name: 'maxVig',
        message: 'Enter your maximum vig tolerance percentage:',
        default: position.maxVig,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'minLiquidity',
        message: 'Enter your minimum liquidity tolerance in USDC:',
        default: position.minLiquidity,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'minBetSizeOdds',
        message: 'Enter minimum bet size to consider for odds calculation in USDC:',
        default: position.minBetSizeOdds,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'minBetSizeVig',
        message: 'Enter minimum bet size to consider for vig calculation in USDC:',
        default: position.minBetSizeVig,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      }
    ]);
    
    cliLogger.info('Updating position...');
    await updatePosition(position.id, updatedSettings);
    cliLogger.info('Position updated successfully');
    
    // Display updated position
    const updatedPosition = getPosition(position.id);
    if (updatedPosition) {
      displayPositionDetails(updatedPosition);
    }
  } catch (error) {
    cliLogger.error(`Error updating position: ${error.message}`);
  }
}

/**
 * Returns a human-readable name for a market type
 * @param {number} typeId - Market type ID
 * @returns {string} - Market type name
 */
function getMarketTypeName(typeId) {
  const marketTypes = {
    1: '1X2',
    2: 'Total (Over/Under)',
    3: 'Spread',
    21: 'Over/Under First Period',
    28: 'Over/Under Including Overtime',
    29: 'Over/Under Rounds',
    45: 'Over/Under Second Period',
    46: 'Over/Under Third Period',
    52: 'Moneyline',
    53: 'Spread Halftime',
    63: 'Moneyline Halftime',
    64: 'Spread First Period',
    65: 'Spread Second Period',
    66: 'Spread Third Period',
    77: 'Over/Under Halftime',
    88: 'To Qualify',
    165: 'Set Total',
    166: 'Games Total',
    201: 'Games Spread',
    202: 'First Period Winner',
    203: 'Second Period Winner',
    204: 'Third Period Winner',
    205: 'Fourth Period Winner',
    226: 'Moneyline Including Overtime',
    236: '1st 5 Innings Total',
    274: 'Outright Winner',
    281: '1st Five Innings Spread',
    342: 'Spread Including Overtime',
    835: 'Asian Total',
    866: 'Set Spread',
    1536: 'Maps Total',
    1618: '1st 5 Innings Moneyline'
  };
  
  return marketTypes[typeId] || 'Unknown';
}