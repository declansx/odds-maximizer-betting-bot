// fetchSportsLeaguesFixturesMarkets.js
import fetch from 'node-fetch';
import readline from 'readline';

/**
 * Creates an interface for reading user input from the terminal
 * @returns {readline.Interface} Readline interface
 */
function createReadlineInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Fetches all available sports from the SX Bet API
 * @returns {Promise<Array>} Promise resolving to an array of sport objects
 */
async function fetchSports() {
  try {
    const response = await fetch('https://api.sx.bet/sports');
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching sports data:', error.message);
    return [];
  }
}

/**
 * Fetches active leagues for a specific sport ID
 * @param {number} sportId The ID of the sport
 * @returns {Promise<Array>} Promise resolving to an array of active league objects
 */
async function fetchActiveLeaguesForSport(sportId) {
  try {
    const response = await fetch(`https://api.sx.bet/leagues/active?sportId=${sportId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching active leagues:', error.message);
    return [];
  }
}

/**
 * Fetches active fixtures for a specific league ID
 * @param {number} leagueId The ID of the league
 * @returns {Promise<Array>} Promise resolving to an array of fixture objects
 */
async function fetchFixturesForLeague(leagueId) {
  try {
    const response = await fetch(`https://api.sx.bet/fixture/active?leagueId=${leagueId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error fetching fixtures:', error.message);
    return [];
  }
}

/**
 * Fetches active markets for a specific event ID
 * @param {string} eventId The ID of the event
 * @returns {Promise<Array>} Promise resolving to an array of market objects
 */
async function fetchMarketsForEvent(eventId) {
  try {
    const response = await fetch(`https://api.sx.bet/markets/active?eventId=${eventId}&onlyMainLine=true`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.status !== 'success') {
      throw new Error('API returned failure status');
    }
    
    return result.data.markets;
  } catch (error) {
    console.error('Error fetching markets:', error.message);
    return [];
  }
}

/**
 * Filters fixtures to only include those starting in the next 48 hours
 * @param {Array} fixtures Array of fixture objects
 * @returns {Array} Filtered array of fixture objects
 */
function filterFixturesForNext48Hours(fixtures) {
  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  
  return fixtures.filter(fixture => {
    const startDate = new Date(fixture.startDate);
    return startDate >= now && startDate <= in48Hours;
  });
}

/**
 * Sorts fixtures chronologically by start date
 * @param {Array} fixtures Array of fixture objects
 * @returns {Array} Sorted array of fixture objects
 */
function sortFixturesChronologically(fixtures) {
  return [...fixtures].sort((a, b) => {
    return new Date(a.startDate) - new Date(b.startDate);
  });
}

/**
 * Formats a date into a readable string
 * @param {string} dateString ISO date string
 * @returns {string} Formatted date string
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString();
}

/**
 * Formats a UNIX timestamp into a readable string
 * @param {number} timestamp UNIX timestamp
 * @returns {string} Formatted date string
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
  return date.toLocaleString();
}

/**
 * Displays sports data in the terminal
 * @param {Array} sports Array of sport objects
 */
function displaySports(sports) {
  console.log('\n===== AVAILABLE SPORTS =====\n');
  
  if (sports.length === 0) {
    console.log('No sports data available.');
    return;
  }
  
  // Calculate the maximum ID length for alignment
  const maxIdLength = Math.max(...sports.map(sport => sport.sportId.toString().length));
  
  // Display each sport with aligned columns
  sports.forEach(sport => {
    console.log(`ID: ${sport.sportId.toString().padEnd(maxIdLength)} | ${sport.label}`);
  });
  
  console.log(`\nTotal sports available: ${sports.length}`);
}

/**
 * Displays active leagues for a sport in the terminal
 * @param {Array} leagues Array of league objects
 * @param {string} sportName Name of the sport
 */
function displayActiveLeagues(leagues, sportName) {
  console.log(`\n===== ACTIVE LEAGUES FOR ${sportName.toUpperCase()} =====\n`);
  
  if (leagues.length === 0) {
    console.log('No active leagues available for this sport.');
    return;
  }
  
  // Calculate the maximum ID length for alignment
  const maxIdLength = Math.max(...leagues.map(league => league.leagueId.toString().length));
  
  // Display each league with aligned columns
  leagues.forEach(league => {
    console.log(`ID: ${league.leagueId.toString().padEnd(maxIdLength)} | ${league.label}`);
  });
  
  console.log(`\nTotal active leagues: ${leagues.length}`);
}

/**
 * Displays fixtures for a league in the terminal
 * @param {Array} fixtures Array of fixture objects
 * @param {string} leagueName Name of the league
 * @returns {Array} The displayed fixtures
 */
function displayFixtures(fixtures, leagueName) {
  console.log(`\n===== FIXTURES FOR ${leagueName.toUpperCase()} (NEXT 48 HOURS) =====\n`);
  
  if (fixtures.length === 0) {
    console.log('No fixtures available for this league in the next 48 hours.');
    return fixtures;
  }
  
  // Display each fixture
  fixtures.forEach((fixture, index) => {
    console.log(`[${index + 1}] Event ID: ${fixture.eventId}`);
    
    if (fixture.participantOneName && fixture.participantTwoName) {
      console.log(`    ${fixture.participantOneName} vs ${fixture.participantTwoName}`);
    } else if (fixture.participants) {
      console.log(`    Participants: ${fixture.participants.join(', ')}`);
    }
    
    console.log(`    Start Time: ${formatDate(fixture.startDate)}`);
    console.log(`    League: ${fixture.leagueLabel} (ID: ${fixture.leagueId})`);
    console.log(`    Sport ID: ${fixture.sportId}`);
    console.log(`    Status: ${fixture.status}`);
    console.log('-'.repeat(60));
  });
  
  console.log(`\nTotal fixtures in next 48 hours: ${fixtures.length}`);
  return fixtures;
}

/**
 * Displays markets for a fixture in the terminal
 * @param {Array} markets Array of market objects
 * @param {string} eventId The event ID
 */
function displayMarkets(markets, eventId) {
  console.log(`\n===== ACTIVE MAINLINE MARKETS FOR EVENT ID: ${eventId} =====\n`);
  
  if (markets.length === 0) {
    console.log('No active mainline markets available for this fixture.');
    return;
  }
  
  // Display each market
  markets.forEach((market, index) => {
    console.log(`[${index + 1}] Market Type: ${market.type} (${getMarketTypeName(market.type)})`);
    console.log(`    Market Hash: ${market.marketHash}`);
    console.log(`    Outcome One: ${market.outcomeOneName}`);
    console.log(`    Outcome Two: ${market.outcomeTwoName}`);
    
    if (market.line !== undefined) {
      console.log(`    Line: ${market.line}`);
    }
    
    console.log(`    Teams: ${market.teamOneName} vs ${market.teamTwoName}`);
    console.log(`    Game Time: ${formatTimestamp(market.gameTime)}`);
    console.log(`    Sport: ${market.sportLabel} (ID: ${market.sportId})`);
    console.log(`    League: ${market.leagueLabel} (ID: ${market.leagueId})`);
    console.log(`    Status: ${market.status}`);
    console.log(`    Live Enabled: ${market.liveEnabled ? 'Yes' : 'No'}`);
    
    if (market.mainLine) {
      console.log(`    Main Line: Yes`);
    }
    
    console.log('-'.repeat(60));
  });
  
  console.log(`\nTotal active mainline markets: ${markets.length}`);
}

/**
 * Gets the name of a market type based on its ID
 * @param {number} typeId The type ID
 * @returns {string} The market type name
 */
function getMarketTypeName(typeId) {
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

/**
 * Asks user to select a sport and displays its active leagues
 * @param {Array} sports Array of sport objects
 * @returns {Promise<{leagues: Array, selectedSport: Object}>} Selected sport and its leagues
 */
async function selectSportAndDisplayLeagues(sports) {
  if (sports.length === 0) {
    return { leagues: [], selectedSport: null };
  }
  
  const rl = createReadlineInterface();
  
  try {
    const sportId = await new Promise((resolve) => {
      rl.question('\nEnter the ID of a sport to view its active leagues: ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    // Validate input
    const numericSportId = parseInt(sportId, 10);
    
    if (isNaN(numericSportId)) {
      console.log('Invalid input. Please enter a valid sport ID.');
      return { leagues: [], selectedSport: null };
    }
    
    // Find the selected sport
    const selectedSport = sports.find(sport => sport.sportId === numericSportId);
    
    if (!selectedSport) {
      console.log(`Sport with ID ${numericSportId} not found.`);
      return { leagues: [], selectedSport: null };
    }
    
    console.log(`\nFetching active leagues for ${selectedSport.label}...`);
    
    // Fetch active leagues for the selected sport
    const activeLeagues = await fetchActiveLeaguesForSport(numericSportId);
    displayActiveLeagues(activeLeagues, selectedSport.label);
    
    return { leagues: activeLeagues, selectedSport };
    
  } finally {
    rl.close();
  }
}

/**
 * Asks user to select a league and displays its fixtures
 * @param {Array} leagues Array of league objects
 * @param {Object} selectedSport The selected sport object
 * @returns {Promise<{fixtures: Array, selectedLeague: Object}>} Selected league and its fixtures
 */
async function selectLeagueAndDisplayFixtures(leagues, selectedSport) {
  if (!leagues || leagues.length === 0 || !selectedSport) {
    return { fixtures: [], selectedLeague: null };
  }
  
  const rl = createReadlineInterface();
  
  try {
    const leagueId = await new Promise((resolve) => {
      rl.question('\nEnter the ID of a league to view its fixtures: ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    // Validate input
    const numericLeagueId = parseInt(leagueId, 10);
    
    if (isNaN(numericLeagueId)) {
      console.log('Invalid input. Please enter a valid league ID.');
      return { fixtures: [], selectedLeague: null };
    }
    
    // Find the selected league
    const selectedLeague = leagues.find(league => league.leagueId === numericLeagueId);
    
    if (!selectedLeague) {
      console.log(`League with ID ${numericLeagueId} not found.`);
      return { fixtures: [], selectedLeague: null };
    }
    
    console.log(`\nFetching fixtures for ${selectedLeague.label}...`);
    
    // Fetch fixtures for the selected league
    const fixtures = await fetchFixturesForLeague(numericLeagueId);
    
    // Filter fixtures for the next 48 hours
    const filteredFixtures = filterFixturesForNext48Hours(fixtures);
    
    // Sort fixtures chronologically
    const sortedFixtures = sortFixturesChronologically(filteredFixtures);
    
    // Display the fixtures
    const displayedFixtures = displayFixtures(sortedFixtures, selectedLeague.label);
    
    return { fixtures: displayedFixtures, selectedLeague };
    
  } finally {
    rl.close();
  }
}

/**
 * Asks user to select a fixture and displays its active markets
 * @param {Array} fixtures Array of fixture objects
 */
async function selectFixtureAndDisplayMarkets(fixtures) {
  if (!fixtures || fixtures.length === 0) {
    return;
  }
  
  const rl = createReadlineInterface();
  
  try {
    const fixtureIndex = await new Promise((resolve) => {
      rl.question('\nEnter the number of a fixture to view its active markets: ', (answer) => {
        resolve(answer.trim());
      });
    });
    
    // Validate input
    const numericIndex = parseInt(fixtureIndex, 10);
    
    if (isNaN(numericIndex) || numericIndex < 1 || numericIndex > fixtures.length) {
      console.log(`Invalid input. Please enter a number between 1 and ${fixtures.length}.`);
      return;
    }
    
    // Get the selected fixture (adjusting for 0-indexed array)
    const selectedFixture = fixtures[numericIndex - 1];
    
    console.log(`\nFetching active markets for fixture: ${selectedFixture.participantOneName} vs ${selectedFixture.participantTwoName}...`);
    
    // Fetch active markets for the selected fixture
    const markets = await fetchMarketsForEvent(selectedFixture.eventId);
    
    // Display the markets
    displayMarkets(markets, selectedFixture.eventId);
    
  } finally {
    rl.close();
  }
}

// Main execution
async function main() {
  console.log('Fetching sports from SX Bet API...');
  const sports = await fetchSports();
  displaySports(sports);
  
  if (sports.length > 0) {
    const { leagues, selectedSport } = await selectSportAndDisplayLeagues(sports);
    
    if (leagues && leagues.length > 0) {
      const { fixtures } = await selectLeagueAndDisplayFixtures(leagues, selectedSport);
      
      if (fixtures && fixtures.length > 0) {
        await selectFixtureAndDisplayMarkets(fixtures);
      }
    }
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error);
  process.exit(1);
});