// src/api/fetchSports.js - API calls to fetch sports, leagues, fixtures, and markets
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { API, TIME } from '../config/constants.js';

/**
 * Fetches all available sports from the SX Bet API
 * @returns {Promise<Array>} - Promise resolving to an array of sport objects
 */
export async function fetchSports() {
  try {
    logger.info('Fetching sports data...');
    
    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.SPORTS}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    logger.info(`Fetched ${result.data.length} sports`);
    return result.data;
  } catch (error) {
    logger.error('Error fetching sports data:', error);
    return [];
  }
}

/**
 * Fetches active leagues for a specific sport ID
 * @param {number} sportId - The ID of the sport
 * @returns {Promise<Array>} - Promise resolving to an array of league objects
 */
export async function fetchActiveLeaguesForSport(sportId) {
  try {
    logger.info(`Fetching active leagues for sport ID: ${sportId}`);
    
    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.LEAGUES}?sportId=${sportId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    logger.info(`Fetched ${result.data.length} active leagues for sport ID: ${sportId}`);
    return result.data;
  } catch (error) {
    logger.error(`Error fetching active leagues for sport ID ${sportId}:`, error);
    return [];
  }
}

/**
 * Fetches fixtures for a specific league ID
 * @param {number} leagueId - The ID of the league
 * @returns {Promise<Array>} - Promise resolving to an array of fixture objects
 */
export async function fetchFixturesForLeague(leagueId) {
  try {
    logger.info(`Fetching fixtures for league ID: ${leagueId}`);
    
    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.FIXTURES}?leagueId=${leagueId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    // Filter fixtures to only include those starting in the next 48 hours
    const now = Date.now();
    const filteredFixtures = result.data.filter(fixture => {
      const startDate = new Date(fixture.startDate).getTime();
      return startDate >= now && startDate <= now + TIME.TWO_DAYS_MS;
    });
    
    logger.info(`Fetched ${filteredFixtures.length} fixtures for league ID: ${leagueId} in the next 48 hours`);
    return filteredFixtures;
  } catch (error) {
    logger.error(`Error fetching fixtures for league ID ${leagueId}:`, error);
    return [];
  }
}

/**
 * Fetches markets for a specific event ID
 * @param {string} eventId - The ID of the event
 * @returns {Promise<Array>} - Promise resolving to an array of market objects
 */
export async function fetchMarketsForEvent(eventId) {
  try {
    logger.info(`Fetching markets for event ID: ${eventId}`);
    
    const response = await fetch(`${API.BASE_URL}${API.ENDPOINTS.MARKETS}?eventId=${eventId}&onlyMainLine=true`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    logger.info(`Fetched ${result.data.markets.length} markets for event ID: ${eventId}`);
    return result.data.markets;
  } catch (error) {
    logger.error(`Error fetching markets for event ID ${eventId}:`, error);
    return [];
  }
}

/**
 * Formats a market type to a user-friendly string
 * @param {number} typeId - The market type ID
 * @returns {string} - The market type name
 */
export function getMarketTypeName(typeId) {
  const marketTypes = {
    1: '1X2',
    2: 'Under/Over',
    3: 'Asian Handicap',
    21: 'Under/Over First Period',
    28: 'Under/Over Including Overtime',
    29: 'Under/Over Rounds',
    45: 'Under/Over Second Period',
    46: 'Under/Over Third Period',
    52: '12',
    53: 'Asian Handicap Halftime',
    63: '12 Halftime',
    64: 'Asian Handicap First Period',
    65: 'Asian Handicap Second Period',
    66: 'Asian Handicap Third Period',
    77: 'Under/Over Halftime',
    88: 'To Qualify',
    165: 'Set Total',
    166: 'Under/Over Games',
    201: 'Asian Handicap Games',
    202: 'First Period Winner',
    203: 'Second Period Winner',
    204: 'Third Period Winner',
    205: 'Fourth Period Winner',
    226: '12 Including Overtime',
    236: '1st 5 Innings Under/Over',
    274: 'Outright Winner',
    281: '1st Five Innings Asian handicap',
    342: 'Asian Handicap Including Overtime',
    835: 'Asian Under/Over',
    866: 'Set Spread',
    1536: 'Under/Over Maps',
    1618: '1st 5 Innings Winner-12'
  };
  
  return marketTypes[typeId] || 'Unknown';
}