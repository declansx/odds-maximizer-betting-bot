// src/cli/createPosition.js - CLI flow for creating new positions
import inquirer from 'inquirer';
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
    cliLogger.info('Creating a new position...');
    
    // Step 1: Select a sport
    const sports = await fetchSports();
    if (!sports || sports.length === 0) {
      cliLogger.error('No sports available');
      return;
    }
    
    const { sportId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'sportId',
        message: 'Select a sport:',
        choices: sports.map(sport => ({
          name: sport.label,
          value: sport.sportId
        }))
      }
    ]);
    
    // Step 2: Select a league
    const leagues = await fetchActiveLeaguesForSport(sportId);
    if (!leagues || leagues.length === 0) {
      cliLogger.error('No active leagues available for this sport');
      return;
    }
    
    const { leagueId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'leagueId',
        message: 'Select a league:',
        choices: leagues.map(league => ({
          name: league.label,
          value: league.leagueId
        }))
      }
    ]);
    
    // Step 3: Select a fixture
    let fixtures = await fetchFixturesForLeague(leagueId);
    if (!fixtures || fixtures.length === 0) {
      cliLogger.error('No fixtures available for this league');
      return;
    }
    
    // Filter fixtures to only include those starting in the next 48 hours
    const now = Date.now();
    fixtures = fixtures.filter(fixture => {
      const startDate = new Date(fixture.startDate).getTime();
      return startDate >= now && startDate <= now + TIME.TWO_DAYS_MS;
    });
    
    if (fixtures.length === 0) {
      cliLogger.error('No fixtures available in the next 48 hours');
      return;
    }
    
    // Sort fixtures chronologically
    fixtures.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    
    const { eventId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'eventId',
        message: 'Select a fixture (next 48 hours):',
        choices: fixtures.map(fixture => ({
          name: `${fixture.participantOneName} vs ${fixture.participantTwoName} - ${formatDate(fixture.startDate)}`,
          value: fixture.eventId
        }))
      }
    ]);
    
    // Get selected fixture details for reference
    const selectedFixture = fixtures.find(fixture => fixture.eventId === eventId);
    
    // Step 4: Select a market
    const markets = await fetchMarketsForEvent(eventId);
    if (!markets || markets.length === 0) {
      cliLogger.error('No markets available for this fixture');
      return;
    }
    
    const { market } = await inquirer.prompt([
      {
        type: 'list',
        name: 'market',
        message: 'Select a market:',
        choices: markets.map(market => ({
          name: `${market.type === 3 ? 'Spread' : market.type === 2 ? 'Total' : 'Moneyline'}: ${market.outcomeOneName} / ${market.outcomeTwoName}${market.line ? ` (${market.line})` : ''}`,
          value: market
        }))
      }
    ]);
    
    // Step 5: Select an outcome
    const { outcomeIndex } = await inquirer.prompt([
      {
        type: 'list',
        name: 'outcomeIndex',
        message: 'Select an outcome to bet on:',
        choices: [
          {
            name: market.outcomeOneName,
            value: 1
          },
          {
            name: market.outcomeTwoName,
            value: 2
          }
        ]
      }
    ]);
    
    // Step 6: Position settings
    const settings = await inquirer.prompt([
      {
        type: 'number',
        name: 'maxFillAmount',
        message: 'Enter your maximum bet size in USDC:',
        default: 100,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'premium',
        message: 'Enter your premium percentage (e.g., 10 for 10%):',
        default: CLI.DEFAULT_PREMIUM,
        validate: value => value >= 0 && value < 100 ? true : 'Please enter a number between 0 and 100'
      },
      {
        type: 'number',
        name: 'maxVig',
        message: 'Enter your maximum vig tolerance percentage:',
        default: CLI.DEFAULT_MAX_VIG,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'minLiquidity',
        message: 'Enter your minimum liquidity tolerance in USDC:',
        default: CLI.DEFAULT_LIQUIDITY,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'minBetSizeOdds',
        message: 'Enter minimum bet size to consider for odds calculation in USDC:',
        default: CLI.DEFAULT_MIN_BET_SIZE_ODDS,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      },
      {
        type: 'number',
        name: 'minBetSizeVig',
        message: 'Enter minimum bet size to consider for vig calculation in USDC:',
        default: CLI.DEFAULT_MIN_BET_SIZE_VIG,
        validate: value => value > 0 ? true : 'Please enter a positive number'
      }
    ]);
    
    // Step 7: Create the position
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
    
    cliLogger.info('Creating position...');
    const position = await createNewPosition(positionData);
    
    // Step 8: Initialize market monitoring
    cliLogger.info('Initializing market monitoring...');
    const monitoringInitialized = await initializeMarketMonitoring(position);
    
    if (!monitoringInitialized) {
      cliLogger.error('Failed to initialize market monitoring');
      return;
    }
    
    // Step 9: Post initial order
    cliLogger.info('Posting initial order...');
    await postInitialOrder(position.id);
    
    cliLogger.info(`Position created successfully! Position ID: ${position.id}`);
    
    // Display summary
    cliLogger.info('Position Summary:');
    cliLogger.info(`Market: ${market.teamOneName} vs ${market.teamTwoName}`);
    cliLogger.info(`Outcome: ${position.outcomeName}`);
    cliLogger.info(`Max Bet Size: ${position.maxFillAmount} USDC`);
    cliLogger.info(`Premium: ${position.premium}%`);
    cliLogger.info(`Max Vig: ${position.maxVig}%`);
    cliLogger.info(`Min Liquidity: ${position.minLiquidity} USDC`);
    
  } catch (error) {
    cliLogger.error(`Error creating position: ${error.message}`);
    logger.error('Error in position creation flow:', error);
  }
}