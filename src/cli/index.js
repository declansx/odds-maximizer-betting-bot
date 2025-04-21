// src/cli/index.js - Main CLI interface
import inquirer from 'inquirer';
import { createPosition } from './createPosition.js';
import { viewPositions } from './viewPositions.js';
import { cancelAllActiveOrders } from '../core/orderManager.js';
import { closeConnection } from '../api/websocket.js';
import { logger, cliLogger } from '../utils/logger.js';

/**
 * Displays main menu and handles user selection
 * @returns {Promise<void>}
 */
export async function startCLI() {
  let running = true;
  
  cliLogger.info('SX Bet Odds Maximizer Bot');
  
  while (running) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Create a new position', value: 'create' },
          { name: 'View active positions', value: 'view' },
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);
    
    try {
      switch (action) {
        case 'create':
          await createPosition();
          break;
          
        case 'view':
          await viewPositions();
          break;
          
        case 'exit':
          running = false;
          await exitApplication();
          break;
      }
    } catch (error) {
      cliLogger.error(`Error executing action: ${error.message}`);
      logger.error('CLI action error:', error);
    }
  }
}

/**
 * Exits the application gracefully
 * @returns {Promise<void>}
 */
async function exitApplication() {
  cliLogger.info('Exiting SX Bet Odds Maximizer Bot...');
  
  try {
    cliLogger.info('Cancelling all active orders...');
    await cancelAllActiveOrders();
    cliLogger.info('All active orders cancelled successfully');
    
    cliLogger.info('Closing WebSocket connection...');
    await closeConnection();
    cliLogger.info('WebSocket connection closed successfully');
    
    cliLogger.info('Goodbye!');
    
    // Allow time for messages to be displayed
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    cliLogger.error(`Error during exit: ${error.message}`);
    logger.error('Exit error:', error);
    
    // Force exit after a timeout even if there's an error
    setTimeout(() => {
      process.exit(1);
    }, 3000);
  }
}