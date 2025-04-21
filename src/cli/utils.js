// src/cli/utils.js - CLI utility functions
import chalk from 'chalk';
import { cliLogger } from '../utils/logger.js';
import { CLI } from '../config/constants.js';

/**
 * Displays a temporary message that clears after a timeout
 * @param {string} message - Message to display
 * @param {string} type - Message type (info, success, warn, error)
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<void>}
 */
export async function showTemporaryMessage(message, type = 'info', timeout = CLI.TEMP_MESSAGE_TIMEOUT) {
  let formattedMessage = message;
  
  switch (type) {
    case 'success':
      formattedMessage = chalk.green(`✓ ${message}`);
      break;
    case 'warn':
      formattedMessage = chalk.yellow(`⚠ ${message}`);
      break;
    case 'error':
      formattedMessage = chalk.red(`✗ ${message}`);
      break;
    case 'info':
    default:
      formattedMessage = chalk.blue(`ℹ ${message}`);
      break;
  }
  
  process.stdout.write('\n' + formattedMessage + '\n');
  
  // Clear the message after timeout
  await new Promise(resolve => setTimeout(() => {
    // Move cursor up and clear lines
    process.stdout.write('\x1B[1A\x1B[2K');
    process.stdout.write('\x1B[1A\x1B[2K');
    resolve();
  }, timeout));
}

/**
 * Formats a position for display in a list
 * @param {Object} position - Position object
 * @returns {string} - Formatted position string
 */
export function formatPositionForList(position) {
  const statusColor = getStatusColor(position.status);
  const statusText = chalk[statusColor](position.status);
  
  return `${position.teamOneName} vs ${position.teamTwoName} | ${position.outcomeName} | ${statusText} | Fill: ${Math.round(position.fillPercentage)}%`;
}

/**
 * Gets a color for a position status
 * @param {string} status - Position status
 * @returns {string} - Chalk color name
 */
function getStatusColor(status) {
  switch (status) {
    case 'ACTIVE':
      return 'green';
    case 'COMPLETED':
      return 'blue';
    case 'RISK_PAUSED':
      return 'yellow';
    case 'ERROR':
      return 'red';
    case 'INITIALIZING':
      return 'magenta';
    case 'CLOSED':
      return 'gray';
    default:
      return 'white';
  }
}

/**
 * Formats order status for display
 * @param {string} orderStatus - Order status
 * @returns {string} - Formatted order status string
 */
export function formatOrderStatus(orderStatus) {
  const statusMap = {
    'NONE': 'No Order',
    'ACTIVE': 'Active',
    'CANCELLED': 'Cancelled',
    'CANCELLED_RISK': 'Cancelled (Risk)',
    'CANCELLED_UPDATE': 'Cancelled (Update)',
    'ERROR': 'Error',
    'FILLED': 'Filled'
  };
  
  return statusMap[orderStatus] || orderStatus;
}

/**
 * Formats market risk status for display
 * @param {Object} position - Position object
 * @returns {string} - Formatted risk status string
 */
export function formatRiskStatus(position) {
  if (position.operations.isRiskThresholdBreached) {
    if (position.currentVig !== null && position.currentVig > position.maxVig) {
      return chalk.yellow(`High Vig (${position.currentVig.toFixed(2)}%)`);
    } else if (position.currentLiquidity) {
      if (position.currentLiquidity.outcome1 < position.minLiquidity) {
        return chalk.yellow(`Low Liquidity Outcome 1 (${position.currentLiquidity.outcome1.toFixed(2)} USDC)`);
      } else if (position.currentLiquidity.outcome2 < position.minLiquidity) {
        return chalk.yellow(`Low Liquidity Outcome 2 (${position.currentLiquidity.outcome2.toFixed(2)} USDC)`);
      }
    }
    return chalk.yellow('Risk Threshold Exceeded');
  }
  
  return chalk.green('OK');
}

/**
 * Clears the terminal screen
 */
export function clearScreen() {
  process.stdout.write('\x1Bc');
}

/**
 * Creates a spinner for loading states
 * @param {string} message - Message to display with spinner
 * @returns {Object} - Spinner object with start and stop methods
 */
export function createSpinner(message) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let intervalId;
  
  return {
    start: () => {
      intervalId = setInterval(() => {
        process.stdout.write(`\r${frames[frameIndex]} ${message}`);
        frameIndex = (frameIndex + 1) % frames.length;
      }, 80);
    },
    stop: () => {
      clearInterval(intervalId);
      process.stdout.write(`\r${' '.repeat(message.length + 2)}\r`);
    }
  };
}