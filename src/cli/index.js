// src/cli/index.js - Main CLI interface
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createPosition } from './createPosition.js';
import { viewPositions } from './viewPositions.js';
import { cancelAllActiveOrders } from '../core/orderManager.js';
import { closeConnection } from '../api/websocket.js';
import { logger, cliLogger } from '../utils/logger.js';

const TITLE_ART = `
███████╗██╗  ██╗    ██████╗ ███████╗████████╗
██╔════╝╚██╗██╔╝    ██╔══██╗██╔════╝╚══██╔══╝
███████╗ ╚███╔╝     ██████╔╝█████╗     ██║   
╚════██║ ██╔██╗     ██╔══██╗██╔══╝     ██║   
███████║██╔╝ ██╗    ██████╔╝███████╗   ██║   
╚══════╝╚═╝  ╚═╝    ╚═════╝ ╚══════╝   ╚═╝   
                                              
 ██████╗ ██████╗ ██████╗ ███████╗           
██╔═══██╗██╔══██╗██╔══██╗██╔════╝           
██║   ██║██║  ██║██║  ██║███████╗           
██║   ██║██║  ██║██║  ██║╚════██║           
╚██████╔╝██████╔╝██████╔╝███████║           
 ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝           
                                            
███╗   ███╗ █████╗ ██╗  ██╗██╗███╗   ███╗██╗███████╗███████╗██████╗ 
████╗ ████║██╔══██╗╚██╗██╔╝██║████╗ ████║██║╚══███╔╝██╔════╝██╔══██╗
██╔████╔██║███████║ ╚███╔╝ ██║██╔████╔██║██║  ███╔╝ █████╗  ██████╔╝
██║╚██╔╝██║██╔══██║ ██╔██╗ ██║██║╚██╔╝██║██║ ███╔╝  ██╔══╝  ██╔══██╗
██║ ╚═╝ ██║██║  ██║██╔╝ ██╗██║██║ ╚═╝ ██║██║███████╗███████╗██║  ██║
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝╚══════╝╚══════╝╚═╝  ╚═╝`;

const VERSION = '1.0.0';

/**
 * Clears the terminal screen
 */
function clearScreen() {
  process.stdout.write('\x1Bc');
}

/**
 * Displays the application header
 */
function displayHeader() {
  clearScreen();
  console.log(chalk.cyan(TITLE_ART));
  console.log(chalk.dim(`\nVersion ${VERSION}`));
  console.log(chalk.dim('=' + '='.repeat(60)));
}

/**
 * Displays main menu and handles user selection
 * @returns {Promise<void>}
 */
export async function startCLI() {
  let running = true;
  
  displayHeader();
  
  while (running) {
    console.log('\n');
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.yellow('What would you like to do?'),
        prefix: chalk.cyan('◆'),
        choices: [
          { 
            name: chalk.green('Create a new position'),
            value: 'create'
          },
          {
            name: chalk.blue('View active positions'),
            value: 'view'
          },
          {
            name: chalk.red('Exit'),
            value: 'exit'
          }
        ]
      }
    ]);
    
    try {
      switch (action) {
        case 'create':
          await createPosition();
          displayHeader();
          break;
          
        case 'view':
          await viewPositions();
          displayHeader();
          break;
          
        case 'exit':
          running = false;
          await exitApplication();
          break;
      }
    } catch (error) {
      console.log('\n');
      cliLogger.error(`${chalk.red('✗')} Error executing action: ${error.message}`);
      logger.error('CLI action error:', error);
    }
  }
}

/**
 * Exits the application gracefully
 * @returns {Promise<void>}
 */
async function exitApplication() {
  console.log('\n');
  cliLogger.info(chalk.yellow('Exiting SX Bet Odds Maximizer Bot...'));
  
  try {
    cliLogger.info(chalk.dim('Cancelling all active orders...'));
    await cancelAllActiveOrders();
    cliLogger.info(chalk.green('✓ All active orders cancelled successfully'));
    
    cliLogger.info(chalk.dim('Closing WebSocket connection...'));
    await closeConnection();
    cliLogger.info(chalk.green('✓ WebSocket connection closed successfully'));
    
    console.log('\n' + chalk.dim('=' + '='.repeat(60)));
    console.log(chalk.cyan('\nThank you for using SX Bet Odds Maximizer!'));
    console.log(chalk.dim('Goodbye! 👋\n'));
    
    // Allow time for messages to be displayed
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  } catch (error) {
    cliLogger.error(chalk.red(`✗ Error during exit: ${error.message}`));
    logger.error('Exit error:', error);
    
    // Force exit after a timeout even if there's an error
    setTimeout(() => {
      process.exit(1);
    }, 3000);
  }
}