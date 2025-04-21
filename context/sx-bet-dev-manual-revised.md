# SX Bet API Developer Manual - Supplementary Information

## Purpose
This manual provides crucial information that is *not explicitly covered* in the provided modules. It focuses on API response structures, dependency requirements, and implementation guidelines to create error-free code on the first attempt.

## API Response Structures & Data Formats

### Market Data Responses

#### `GET /sports`
```json
{
  "status": "success",
  "data": [
    {
      "sportId": 1,
      "label": "Basketball"
    },
    {
      "sportId": 2,
      "label": "Hockey"
    },
    {
      "sportId": 3,
      "label": "Baseball"
    },
  ]
} 
```

#### `GET /leagues/active`
```json
{
  "status": "success",
  "data": [
    {
      "leagueId": 34,
      "label": "UFC",
      "sportId": 7,
,
      "eventsByType": {
        "game-lines": 36
      }
    },
  ]
} 
```

#### `GET /fixture/active`
```json
{
  "status": "success",
  "data": [
    {
      "participantOneName": "Nevada Wolf Pack",
      "participantTwoName": "North Dakota State",
      "startDate": "2020-11-25T20:00:00.000Z",
      "status": 1,
      "leagueId": 2,
      "leagueLabel": "NCAA",
      "sportId": 1,
      "eventId": "L6206070"
    },
  ]
}
```

#### `GET /markets/active`
```json
{
  "status": "success",
  "data": {
    "markets": [
      {
        "status": "ACTIVE",
        "marketHash": "0x0d64c52e8781acdada86920a2d1e5acd6f29dcfe285cf9cae367b671dff05f7d",
        "outcomeOneName": "Nikoloz Basilashvili",
        "outcomeTwoName": "Carlos Alcaraz",
        "outcomeVoidName": "NO_CONTEST",
        "teamOneName": "Nikoloz Basilashvili",
        "teamTwoName": "Carlos Alcaraz",
        "type": 226,
        "gameTime": 1622735700,
        "sportXEventId": "L7032829",
        "liveEnabled": true,
        "sportLabel": "Tennis",
        "sportId": 6,
        "leagueId": 1070,
  ,
        "leagueLabel": "ATP French Open",
        "group1": "ATP French Open"
      },
 }
}
```

### Order Data Responses

#### `GET /orders`
```json
{
  "status": "success",
  "data": [
    {
      "fillAmount": "0",
      "orderHash": "0xb46e5fff6498f061e93c4f5ed501ee72d924180d6aa78cdfd4d188d3383c91d4",
      "marketHash": "0x0eeace4a9bbf6235bc59695258a419ed3a05a2c8e3b6a58fb71a0d9e6b031c2b",
      "maker": "0x63a4491dC73245E181c47BAe0ae9d6627E56dE55",
      "totalBetSize": "10000000000000000000",
      "percentageOdds": "70455284072443640000",
      "expiry": 2209006800,
      "apiExpiry": 1631233201,
      "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      "executor": "0x3E91041b9e60C7275f8296b8B0a97141e6442d49",
      "salt": "69415402816762328320330277846098411244657139277332120954321492419616371539163",
      "isMakerBettingOutcomeOne": true,
      "signature": "0x2aaea5b7c86166c0fbf2745c66aff794a23d21ac71ee143d08706700adbb59aa4c9b862286cf736acae5a74b10847ced73b628f4396eaab0af13b0c637fe4d021b",
      "createdAt": "2021-06-04T17:42:07.257Z"
    },
  ]
}
```

### Trade Data Responses

#### `GET /trades`
```json
{
  "status": "success",
  "data": {
    "trades": [
      {
        "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
        "bettor": "0x63a4491dC73245E181c47BAe0ae9d6627E56dE55",
        "stake": "10236134166947574099",
        "odds": "50583446830801460000",
        "orderHash": "0xb47329db2a3f612748094f415f9bf478cbed2f196548ec68154bd1fc543a6f09",
        "marketHash": "0x3fd03af14bf11264f5274ed4c8cc283e4479d29d33e17409e8e7d9b26ca9f030",
        "maker": true,
        "betTime": 1607708054,
        "settled": true,
        "settleValue": 1,
        "bettingOutcomeOne": false,
        "fillHash": "0xbe846c92bec584c4d2215df76ac7d53ebab25f81a30cca5811fb93f35e8b5321",
        "tradeStatus": "SUCCESS",
        "valid": true,
        "outcome": 1,
        "settleDate": "2020-12-11T20:17:45.990Z"
      },
    ]
  }
}    
```

### Order Management Responses

#### `POST /orders/new`
```json
{
  "status": "success",
  "data": {
    "orders": [
      "0x7a9d420551c4a635849013dd908f7894766e97aee25fe656d0c5ac857e166fac"
    ]
  }
}
```

#### `POST /orders/cancel/v2?chainVersion=SXR`
```json
{
  "status": "success",
  "data": {
    "cancelledCount": 1
  }
}
```

#### `POST /orders/fill`
```json
{
  "status": "success",
  "data": {
    "fillHash": "0x840763ae29b7a6adfa0e315afa47be30cdebd5b793d179dc07dc8fc4f0034965"
  }
}
```

### WebSocket Updates Format

The WebSocket sends order updates as arrays of arrays:

```javascript
[
  [
    "0x7bd766486f589f3e272d48294d8881fe68aae7704f7b2ef0a50bf6128be44271", // orderHash
    "INACTIVE", //status
    "1000000000", //fillAmount
    "0x9883D5e7dC023A441A01Ef95aF406C69926a0AB6", //maker
    "1000000000", // totalBetSize
    "20306024864520233000", // percentageOdds
    2209006800, // expiry
    1625691600, // apiExpiry
    "1271418014917937117393617219009886912225128221921196717331617268846160092273", // salt
    false, // isMakerBettingOutcomeOne
    "0xbf099ab02255d5e2a9e063dc43a7afe96e65f5e8fc2ed3d2ba60b0a3fcadb3441bf32271293e85b7a795c9d86a2304035a0da3285113e746547e236bc58885e01c", // signature
    "6982204685293715457", // updateTime
    "SXR", // chainVersion
    "L13772588", //sportXeventId
  ]
]
```

## Dependency Requirements

### Required Versions

| Package | Required Version | Notes |
|---------|------------------|-------|
| ethers | ^6.7.1 | **Important**: Uses v6 API, not v5! |
| axios | ^1.6.0 | |
| ably | ^2.6.5 | For WebSocket |
| dotenv | ^16.3.1 | |
| bignumber.js | ^9.1.1 | For precise mathematical calculations |

### Node.js Requirements

- **Required**: Node.js v18.x or higher
- **Module System**: ES Modules required
- **Include in package.json**: `"type": "module"`

## Critical Implementation Guidelines

### Ethers.js v6 Specifics

```javascript
// ❌ INCORRECT (v5 style):
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(address, abi, wallet);
const signature = await wallet.signMessage(ethers.utils.arrayify(message));
const amount = ethers.utils.parseUnits("1.0", 6);

// ✅ CORRECT (v6 style):
const wallet = new ethers.Wallet(privateKey, provider);
const contract = new ethers.Contract(address, abi, wallet);
const signature = await wallet.signMessage(ethers.getBytes(message));
const amount = ethers.parseUnits("1.0", 6);
```

### BigInt for All Financial Calculations

```javascript
// ❌ INCORRECT: 
const fillAmount = (totalBetSize - fillAmount) * (10**20) / percentageOdds;

// ✅ CORRECT:
const fillAmount = (BigInt(totalBetSize) - BigInt(fillAmount)) * BigInt(10**20) / BigInt(percentageOdds);
```

### EIP-712 Signing Structure

For order filling, ensure the types are exactly in this format:

```javascript
// Types must match exactly
const types = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
  ],
  Details: [
    { name: 'action', type: 'string' },
    { name: 'market', type: 'string' },
    { name: 'betting', type: 'string' },
    { name: 'stake', type: 'string' },
    { name: 'odds', type: 'string' },
    { name: 'returning', type: 'string' },
    { name: 'fills', type: 'FillObject' }
  ],
  // And so on...
};
```

### Precision Constants

- USDC: 6 decimal places (1 USDC = 1,000,000 base units)
- Percentage Odds: 20 decimal places (50% = 5000000000000000000)

### Chain-Specific Constants

```javascript
const CONSTANTS = {
  CHAIN_ID: 4162,
  EIP712_FILL_HASHER: '0x845a2Da2D70fEDe8474b1C8518200798c60aC364',
  TOKEN_TRANSFER_PROXY: '0x38aef22152BC8965bf0af7Cf53586e4b0C4E9936',
  USDC_ADDRESS: '0x6629Ce1Cf35Cc1329ebB4F63202F3f197b3F050B',
  TAKER_ADDRESS: '0xADb93842A9cEa59A11Fed9E3D9870D37eb2eC9Dd',
};
```

## Common AI Coding Pitfalls to Avoid

### 1. Import Statement Format

```javascript
// ❌ INCORRECT (CommonJS):
const { ethers } = require('ethers');
const axios = require('axios');

// ✅ CORRECT (ES Modules):
import { ethers } from 'ethers';
import axios from 'axios';
```

### 2. Async/Await Handling

```javascript
// ❌ INCORRECT: 
function doAsyncWork() {
  getData().then(result => {
    // work with result
  });
}

// ✅ CORRECT:
async function doAsyncWork() {
  try {
    const result = await getData();
    // work with result
  } catch (error) {
    // proper error handling
  }
}
```

### 3. Error Handling for API Calls

```javascript
// ❌ INCORRECT:
const response = await fetch(url);
const data = await response.json();
// Use data without checks

// ✅ CORRECT:
const response = await fetch(url);
const data = await response.json();
if (data.status !== 'success') {
  throw new Error(`API Error: ${data.message || JSON.stringify(data)}`);
}
// Use data.data
```

### 4. WebSocket Connection Management

```javascript
// ❌ INCORRECT:
// Connect and forget
client.connect();

// ✅ CORRECT:
// Handle connection lifecycle
client.on('connected', () => { /* ... */ });
client.on('disconnected', () => { /* reconnect logic */ });
client.on('error', (error) => { /* error handling */ });
```

### 5. Null/Undefined Checks

```javascript
// ❌ INCORRECT:
const value = order.fillAmount;

// ✅ CORRECT:
const value = order.fillAmount || '0';
```

### 6. API Response Unwrapping

Remember the SX Bet API always wraps responses in a standard format:

```javascript
// ❌ INCORRECT:
const orders = await response.json();
orders.forEach(order => { /* ... */ });

// ✅ CORRECT:
const data = await response.json();
if (data.status === 'success' && Array.isArray(data.data)) {
  data.data.forEach(order => { /* ... */ });
}
```

## Testing Recommendations

### 1. Response Mocking

When testing, mock API responses with the exact response structure:

```javascript
// Mock fetchOrders
jest.mock('../services/orderService', () => ({
  fetchOrders: jest.fn().mockResolvedValue([
    {
      orderHash: '0x123...',
      marketHash: '0x123...',
      // Include all expected fields
    }
  ])
}));
```

### 2. WebSocket Event Testing

Test WebSocket event handlers with correctly formatted data:

```javascript
// Create a mock websocket update
const mockUpdate = [
  [
    "0x123...", // orderHash
    "ACTIVE",   // status
    // Include all fields in the correct order
  ]
];

// Trigger the update handler
client.processOrderBookUpdates('0x123...', mockUpdate);
```

### 3. Odds Calculation Verification

Verify odds calculations with known values:

```javascript
// Test percentage to decimal odds conversion
test('50% odds should convert to 2.0 decimal odds', () => {
  const percentageOdds = '5000000000000000000'; // 50%
  const decimalOdds = calculateTakerOdds(percentageOdds);
  expect(decimalOdds).toBe('2.00');
});
```

## Integration Checklist

Before deploying your bot, verify:

1. ✅ All dependencies are at the correct versions
2. ✅ BigInt is used for all financial calculations
3. ✅ EIP-712 signing structures match exactly
4. ✅ WebSocket updates are correctly parsed
5. ✅ API responses are properly unwrapped
6. ✅ Error handling is comprehensive
7. ✅ Environment variables are correctly loaded
8. ✅ ES Module syntax is used consistently
9. ✅ Cohesiveness: Ensure that data flows seamlessly between all the modules you create. The bot needs to be production-ready and error-free. Explicitly define how data (e.g., in-memory taker orderbook, position objects, settings) is passed between modules—either as function parameters or returned values, avoiding global variables unless specified. Test all inter-module calls to verify they work without errors.
10. ✅ Split the Code: Split the code up into many shorter, more manageable files. There should be 20+ files for this build. Organize files logically (e.g., CLI, core modules, utilities) and provide a brief comment in each file explaining its role. Ensure every file exports its primary functions or objects and imports only what it needs, avoiding circular dependencies.
11. ✅ Do Not Redefine: Do not redefine any block-scoped variables.
12. ✅ Thoroughness: Focus on delivering production-ready code that achieves my desired features. Do not make assumptions without verifying them. After writing the code, simulate a full run of the bot (e.g., creating a position, monitoring, posting orders) to verify no ‘not a function,’ ‘not defined,’ or ‘export not found’ errors occur. Fix any such errors before submission.







