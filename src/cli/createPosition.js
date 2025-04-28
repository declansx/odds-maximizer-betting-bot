// src/cli/createPosition.js - CLI flow for creating new positions
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fetchSports } from '../api/fetchSports.js';
import { fetchActiveLeaguesForSport } from '../api/fetchSports.js';
import { fetchFixturesForLeague } from '../api/fetchSports.js';
import { fetchMarketsForEvent } from '../api/fetchSports.js';
import { createNewPosition } from '../core/positionManager.js';
import { initializeMarketMonitoring } from '../core/marketMonitor.js';
import { postInitialOrder } from '../core/positionManager.js';
import { logger, cliLogger } from '../utils/logger.js';
import { CLI, TIME } from '../config/constants.js';
import { formatDate } from '../utils/dateUtils.js';

/**
 * CLI flow for creating a new position
 * @returns {Promise<void>}
 */
export async function createPosition() {
  try {
    console.log('\n' + chalk.cyan('┌' + '─'.repeat(60) + '┐'));
    console.log(chalk.cyan('│') + chalk.bold(' CREATE NEW POSITION ') + ' '.repeat(42) + chalk.cyan('│'));
    console.log(chalk.cyan('└' + '─'.repeat(60) + '┘\n'));
    
    // Variables used across steps
    let sportId;
    let leagueId;
    let eventId;
    let selectedFixture;
    let market;
    let outcomeIndex;
    
    let step = 1;
    while (step <= 6) {
      switch (step) {
        case 1: {
          // Step 1: Select a sport
          const sports = await fetchSports();
          if (!sports || sports.length === 0) {
            cliLogger.error(chalk.red('✗ No sports available'));
            return;
          }
          
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: chalk.yellow('Select a sport:'),
              prefix: chalk.cyan('◆'),
              choices: [
                ...sports.map(sport => ({
                  name: chalk.white(sport.label),
                  value: { type: 'select', sportId: sport.sportId }
                })),
                { name: chalk.red('Back to main menu'), value: { type: 'back' } }
              ]
            }
          ]);
          
          if (action.type === 'back') {
            return;
          }
          
          sportId = action.sportId;
          step++;
          break;
        }
        
        case 2: {
          // Step 2: Select a league
          const leagues = await fetchActiveLeaguesForSport(sportId);
          if (!leagues || leagues.length === 0) {
            cliLogger.error(chalk.red('✗ No active leagues available for this sport'));
            step--;
            break;
          }
          
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: chalk.yellow('Select a league:'),
              prefix: chalk.cyan('◆'),
              choices: [
                ...leagues.map(league => ({
                  name: chalk.white(league.label),
                  value: { type: 'select', leagueId: league.leagueId }
                })),
                { name: chalk.red('Back to sports selection'), value: { type: 'back' } }
              ]
            }
          ]);
          
          if (action.type === 'back') {
            step--;
            break;
          }
          
          leagueId = action.leagueId;
          step++;
          break;
        }
        
        case 3: {
          // Step 3: Select a fixture
          let fixtures = await fetchFixturesForLeague(leagueId);
          if (!fixtures || fixtures.length === 0) {
            cliLogger.error(chalk.red('✗ No fixtures available for this league'));
            step--;
            break;
          }
          
          // Filter fixtures to only include those starting in the next 48 hours
          const now = Date.now();
          fixtures = fixtures.filter(fixture => {
            const startDate = new Date(fixture.startDate).getTime();
            return startDate >= now && startDate <= now + TIME.TWO_DAYS_MS;
          });
          
          if (fixtures.length === 0) {
            cliLogger.error(chalk.red('✗ No fixtures available in the next 48 hours'));
            step--;
            break;
          }
          
          // Sort fixtures chronologically
          fixtures.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
          
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: chalk.yellow('Select a fixture (next 48 hours):'),
              prefix: chalk.cyan('◆'),
              choices: [
                ...fixtures.map(fixture => ({
                  name: chalk.white(`${fixture.participantOneName} vs ${fixture.participantTwoName} - ${chalk.dim(formatDate(fixture.startDate))}`),
                  value: { type: 'select', eventId: fixture.eventId, fixture }
                })),
                { name: chalk.red('Back to league selection'), value: { type: 'back' } }
              ]
            }
          ]);
          
          if (action.type === 'back') {
            step--;
            break;
          }
          
          eventId = action.eventId;
          selectedFixture = action.fixture;
          step++;
          break;
        }
        
        case 4: {
          // Step 4: Select a market
          const markets = await fetchMarketsForEvent(eventId);
          if (!markets || markets.length === 0) {
            cliLogger.error(chalk.red('✗ No markets available for this fixture'));
            step--;
            break;
          }
          
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: chalk.yellow('Select a market:'),
              prefix: chalk.cyan('◆'),
              choices: [
                ...markets.map(market => ({
                  name: chalk.white(`${market.type === 3 ? 'Spread' : market.type === 2 ? 'Total' : 'Moneyline'}: ${market.outcomeOneName} / ${market.outcomeTwoName}${market.line ? chalk.dim(` (${market.line})`) : ''}`),
                  value: { type: 'select', market }
                })),
                { name: chalk.red('Back to fixture selection'), value: { type: 'back' } }
              ]
            }
          ]);
          
          if (action.type === 'back') {
            step--;
            break;
          }
          
          market = action.market;
          step++;
          break;
        }
        
        case 5: {
          // Step 5: Select an outcome
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: chalk.yellow('Select an outcome to bet on:'),
              prefix: chalk.cyan('◆'),
              choices: [
                {
                  name: chalk.green(market.outcomeOneName),
                  value: { type: 'select', outcomeIndex: 1 }
                },
                {
                  name: chalk.green(market.outcomeTwoName),
                  value: { type: 'select', outcomeIndex: 2 }
                },
                { name: chalk.red('Back to market selection'), value: { type: 'back' } }
              ]
            }
          ]);
          
          if (action.type === 'back') {
            step--;
            break;
          }
          
          outcomeIndex = action.outcomeIndex;
          step++;
          break;
        }
        
        case 6: {
          // Step 6: Position settings
          const { action } = await inquirer.prompt([
            {
              type: 'list',
              name: 'action',
              message: chalk.yellow('Configure position settings:'),
              prefix: chalk.cyan('◆'),
              choices: [
                { name: chalk.green('Continue with default settings'), value: { type: 'default' } },
                { name: chalk.blue('Configure custom settings'), value: { type: 'custom' } },
                { name: chalk.red('Back to outcome selection'), value: { type: 'back' } }
              ]
            }
          ]);
          
          if (action.type === 'back') {
            step--;
            break;
          }
          
          let settings;
          if (action.type === 'default') {
            settings = {
              maxFillAmount: 100,
              premium: CLI.DEFAULT_PREMIUM,
              maxVig: CLI.DEFAULT_MAX_VIG,
              minLiquidity: CLI.DEFAULT_LIQUIDITY,
              minBetSizeOdds: CLI.DEFAULT_MIN_BET_SIZE_ODDS,
              minBetSizeVig: CLI.DEFAULT_MIN_BET_SIZE_VIG
            };
          } else {
            settings = await inquirer.prompt([
              {
                type: 'number',
                name: 'maxFillAmount',
                message: chalk.yellow('Enter your maximum bet size in USDC:'),
                prefix: chalk.cyan('◆'),
                default: 100,
                validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
              },
              {
                type: 'number',
                name: 'premium',
                message: chalk.yellow('Enter your premium percentage (e.g., 10 for 10%):'),
                prefix: chalk.cyan('◆'),
                default: CLI.DEFAULT_PREMIUM,
                validate: value => value >= 0 && value < 100 ? true : chalk.red('Please enter a number between 0 and 100')
              },
              {
                type: 'number',
                name: 'maxVig',
                message: chalk.yellow('Enter your maximum vig tolerance percentage:'),
                prefix: chalk.cyan('◆'),
                default: CLI.DEFAULT_MAX_VIG,
                validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
              },
              {
                type: 'number',
                name: 'minLiquidity',
                message: chalk.yellow('Enter your minimum liquidity tolerance in USDC:'),
                prefix: chalk.cyan('◆'),
                default: CLI.DEFAULT_LIQUIDITY,
                validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
              },
              {
                type: 'number',
                name: 'minBetSizeOdds',
                message: chalk.yellow('Enter minimum bet size to consider for odds calculation in USDC:'),
                prefix: chalk.cyan('◆'),
                default: CLI.DEFAULT_MIN_BET_SIZE_ODDS,
                validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
              },
              {
                type: 'number',
                name: 'minBetSizeVig',
                message: chalk.yellow('Enter minimum bet size to consider for vig calculation in USDC:'),
                prefix: chalk.cyan('◆'),
                default: CLI.DEFAULT_MIN_BET_SIZE_VIG,
                validate: value => value > 0 ? true : chalk.red('Please enter a positive number')
              }
            ]);
          }
          
          // Create the position
          console.log('\n' + chalk.dim('─'.repeat(60)));
          cliLogger.info(chalk.dim('Creating position...'));
          const positionData = {
            marketHash: market.marketHash,
            marketType: market.type,
            outcomeIndex,
            outcomeName: outcomeIndex === 1 ? market.outcomeOneName : market.outcomeTwoName,
            teamOneName: market.teamOneName,
            teamTwoName: market.teamTwoName,
            eventId,
            leagueId,
            sportId,
            line: market.line,
            maxFillAmount: settings.maxFillAmount,
            premium: settings.premium,
            maxVig: settings.maxVig,
            minLiquidity: settings.minLiquidity,
            minBetSizeOdds: settings.minBetSizeOdds,
            minBetSizeVig: settings.minBetSizeVig,
            startDate: selectedFixture.startDate
          };
          const position = await createNewPosition(positionData);
          
          // Initialize market monitoring
          cliLogger.info(chalk.dim('Initializing market monitoring...'));
          const monitoringInitialized = await initializeMarketMonitoring(position);
          
          if (!monitoringInitialized) {
            cliLogger.error(chalk.red('✗ Failed to initialize market monitoring'));
            return;
          }
          
          // Post initial order
          cliLogger.info(chalk.dim('Posting initial order...'));
          await postInitialOrder(position.id);
          
          cliLogger.info(chalk.green('✓ Position created successfully!'));
          console.log(chalk.dim('─'.repeat(60)));
          
          // Display summary
          console.log('\n' + chalk.cyan('┌' + '─'.repeat(60) + '┐'));
          console.log(chalk.cyan('│') + chalk.bold(' POSITION SUMMARY ') + ' '.repeat(44) + chalk.cyan('│'));
          console.log(chalk.cyan('└' + '─'.repeat(60) + '┘\n'));
          
          console.log(chalk.dim('ID: ') + chalk.white(position.id));
          console.log(chalk.dim('Market: ') + chalk.white(`${market.teamOneName} vs ${market.teamTwoName}`));
          console.log(chalk.dim('Outcome: ') + chalk.green(position.outcomeName));
          console.log(chalk.dim('Max Bet Size: ') + chalk.yellow(`${position.maxFillAmount} USDC`));
          console.log(chalk.dim('Premium: ') + chalk.yellow(`${position.premium}%`));
          console.log(chalk.dim('Max Vig: ') + chalk.yellow(`${position.maxVig}%`));
          console.log(chalk.dim('Min Liquidity: ') + chalk.yellow(`${position.minLiquidity} USDC`));
          console.log('\n' + chalk.dim('─'.repeat(60)));
          
          step++;
          break;
        }
      }
    }
  } catch (error) {
    console.log('\n');
    cliLogger.error(chalk.red(`✗ Error creating position: ${error.message}`));
    logger.error('Error in position creation flow:', error);
  }
}