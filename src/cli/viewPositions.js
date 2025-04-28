// src/cli/viewPositions.js - CLI flow for viewing active positions
import inquirer from 'inquirer';
import chalk from 'chalk';
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
      console.log('\n' + chalk.yellow('ℹ No active positions found'));
      return;
    }
    
    // Display positions list
    console.log('\n' + chalk.cyan('┌' + '─'.repeat(60) + '┐'));
    console.log(chalk.cyan('│') + chalk.bold(' ACTIVE POSITIONS ') + ' '.repeat(45) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(60) + '┘\n'));
    
    const positionChoice = await inquirer.prompt([
      {
        type: 'list',
        name: 'positionId',
        message: chalk.yellow('Select a position to view:'),
        prefix: chalk.cyan('◆'),
        choices: positions.map(position => ({
          name: chalk.white(`${position.teamOneName} vs ${position.teamTwoName} - `) + 
                chalk.green(position.outcomeName) + 
                chalk.dim(` (${Math.round(position.fillPercentage)}% filled)`),
          value: position.id
        }))
      }
    ]);
    
    // Get the selected position
    const position = getPosition(positionChoice.positionId);
    
    if (!position) {
      cliLogger.error(chalk.red('✗ Position not found'));
      return;
    }
    
    // Display position details
    displayPositionDetails(position);
    
    // Options for position management
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.yellow('What would you like to do with this position?'),
        prefix: chalk.cyan('◆'),
        choices: [
          { name: chalk.red('Close position permanently'), value: 'close' },
          { name: chalk.blue('Edit position settings'), value: 'edit' },
          { name: chalk.yellow('Back to main menu'), value: 'back' }
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
    console.log('\n');
    cliLogger.error(chalk.red(`✗ Error viewing positions: ${error.message}`));
    logger.error('Error in view positions flow:', error);
  }
}

/**
 * Displays detailed information about a position
 * @param {Object} position - Position object
 */
function displayPositionDetails(position) {
  console.log('\n' + chalk.cyan('┌' + '─'.repeat(60) + '┐'));
  console.log(chalk.cyan('│') + chalk.bold(' POSITION DETAILS ') + ' '.repeat(44) + chalk.cyan('│'));
  console.log(chalk.cyan('└' + '─'.repeat(60) + '┘\n'));
  
  // Basic Info
  console.log(chalk.dim('ID: ') + chalk.white(position.id));
  console.log(chalk.dim('Market: ') + chalk.white(`${position.teamOneName} vs ${position.teamTwoName}`));
  console.log(chalk.dim('Type: ') + chalk.white(`${getMarketTypeName(position.marketType)}${position.line ? chalk.dim(` (${position.line})`) : ''}`));
  console.log(chalk.dim('Outcome: ') + chalk.green(position.outcomeName));
  console.log(chalk.dim('Start Date: ') + chalk.white(formatDate(position.startDate)));
  console.log(chalk.dim('Status: ') + getStatusColor(position.status)(position.status));
  console.log(chalk.dim('Order Status: ') + getStatusColor(position.orderStatus)(position.orderStatus));
  console.log(chalk.dim('Bet Size: ') + chalk.yellow(`${position.maxFillAmount} USDC`));
  console.log(chalk.dim('Filled: ') + chalk.yellow(`${position.fillAmount} USDC`) + chalk.dim(` (${position.fillPercentage.toFixed(2)}%)`));
  
  if (position.activeOrderHash) {
    console.log(chalk.dim('Active Order: ') + chalk.blue(position.activeOrderHash));
  }
  
  if (position.bestTakerOdds) {
    console.log(chalk.dim('Current Best Taker Odds: ') + 
      chalk.yellow(formatImpliedOdds(position.bestTakerOdds)) + 
      chalk.dim(` (${formatDecimalOdds(1/position.bestTakerOdds)})`));
  }
  
  if (position.lastOrderOdds) {
    const premiumOdds = position.lastOrderOdds * (1 - position.premium/100);
    console.log(chalk.dim('Last Order Odds: ') + 
      chalk.yellow(formatImpliedOdds(premiumOdds)) + 
      chalk.dim(` (${formatDecimalOdds(1/premiumOdds)})`));
  }
  
  // Risk Settings
  console.log('\n' + chalk.cyan('Risk Settings:'));
  console.log(chalk.dim('Premium: ') + chalk.yellow(`${position.premium}%`));
  console.log(chalk.dim('Max Vig: ') + chalk.yellow(`${position.maxVig}%`));
  console.log(chalk.dim('Min Liquidity: ') + chalk.yellow(`${position.minLiquidity} USDC`));
  console.log(chalk.dim('Min Bet Size for Odds: ') + chalk.yellow(`${position.minBetSizeOdds} USDC`));
  console.log(chalk.dim('Min Bet Size for Vig: ') + chalk.yellow(`${position.minBetSizeVig} USDC`));
  
  // Market Status
  console.log('\n' + chalk.cyan('Market Status:'));
  if (position.currentVig !== null) {
    console.log(chalk.dim('Current Vig: ') + chalk.yellow(`${position.currentVig.toFixed(2)}%`));
  }
  
  if (position.currentLiquidity) {
    console.log(chalk.dim('Liquidity Outcome 1: ') + chalk.yellow(`${position.currentLiquidity.outcome1?.toFixed(2) || 'N/A'} USDC`));
    console.log(chalk.dim('Liquidity Outcome 2: ') + chalk.yellow(`${position.currentLiquidity.outcome2?.toFixed(2) || 'N/A'} USDC`));
  }
  
  if (position.operations.isRiskThresholdBreached) {
    console.log(chalk.dim('Risk Status: ') + chalk.red('THRESHOLDS EXCEEDED'));
  } else {
    console.log(chalk.dim('Risk Status: ') + chalk.green('OK'));
  }
  
  console.log('\n' + chalk.dim('─'.repeat(60)));
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
      message: chalk.yellow('Are you sure you want to close this position permanently?'),
      prefix: chalk.red('⚠'),
      default: false
    }
  ]);
  
  if (!confirm) {
    console.log('\n' + chalk.yellow('ℹ Operation cancelled'));
    return;
  }
  
  try {
    console.log('\n' + chalk.dim('─'.repeat(60)));
    cliLogger.info(chalk.dim('Closing position...'));
    await closePosition(position.id);
    cliLogger.info(chalk.green('✓ Position closed successfully'));
    console.log(chalk.dim('─'.repeat(60)));
  } catch (error) {
    cliLogger.error(chalk.red(`✗ Error closing position: ${error.message}`));
  }
}

/**
 * Handles the flow for editing a position
 * @param {Object} position - Position object
 * @returns {Promise<void>}
 */
async function handleEditPosition(position) {
  try {
    console.log('\n' + chalk.cyan('┌' + '─'.repeat(60) + '┐'));
    console.log(chalk.cyan('│') + chalk.bold(' EDIT POSITION SETTINGS ') + ' '.repeat(40) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(60) + '┘\n'));
    
    const updatedSettings = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxFillAmount',
        message: chalk.yellow('Enter your maximum bet size in USDC:'),
        prefix: chalk.cyan('◆'),
        default: position.maxFillAmount,
        validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
      },
      {
        type: 'number',
        name: 'premium',
        message: chalk.yellow('Enter your premium percentage (e.g., 10 for 10%):'),
        prefix: chalk.cyan('◆'),
        default: position.premium,
        validate: value => value >= 0 && value < 100 ? true : chalk.red('Please enter a number between 0 and 100')
      },
      {
        type: 'number',
        name: 'maxVig',
        message: chalk.yellow('Enter your maximum vig tolerance percentage:'),
        prefix: chalk.cyan('◆'),
        default: position.maxVig,
        validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
      },
      {
        type: 'number',
        name: 'minLiquidity',
        message: chalk.yellow('Enter your minimum liquidity tolerance in USDC:'),
        prefix: chalk.cyan('◆'),
        default: position.minLiquidity,
        validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
      },
      {
        type: 'number',
        name: 'minBetSizeOdds',
        message: chalk.yellow('Enter minimum bet size to consider for odds calculation in USDC:'),
        prefix: chalk.cyan('◆'),
        default: position.minBetSizeOdds,
        validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
      },
      {
        type: 'number',
        name: 'minBetSizeVig',
        message: chalk.yellow('Enter minimum bet size to consider for vig calculation in USDC:'),
        prefix: chalk.cyan('◆'),
        default: position.minBetSizeVig,
        validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
      }
    ]);
    
    console.log('\n' + chalk.dim('─'.repeat(60)));
    cliLogger.info(chalk.dim('Updating position...'));
    await updatePosition(position.id, updatedSettings);
    cliLogger.info(chalk.green('✓ Position updated successfully'));
    console.log(chalk.dim('─'.repeat(60)) + '\n');
    
    // Display updated position
    const updatedPosition = getPosition(position.id);
    if (updatedPosition) {
      displayPositionDetails(updatedPosition);
    }
  } catch (error) {
    cliLogger.error(chalk.red(`✗ Error updating position: ${error.message}`));
  }
}

/**
 * Gets a color function for a status
 * @param {string} status - Status string
 * @returns {Function} - Chalk color function
 */
function getStatusColor(status) {
  switch (status) {
    case 'ACTIVE':
      return chalk.green;
    case 'COMPLETED':
      return chalk.blue;
    case 'RISK_PAUSED':
      return chalk.yellow;
    case 'ERROR':
      return chalk.red;
    case 'INITIALIZING':
      return chalk.magenta;
    case 'CLOSED':
      return chalk.gray;
    case 'CANCELLED':
    case 'CANCELLED_RISK':
    case 'CANCELLED_UPDATE':
      return chalk.red;
    case 'FILLED':
      return chalk.green;
    default:
      return chalk.white;
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