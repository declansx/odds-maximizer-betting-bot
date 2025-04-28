**Websocket API**
You must have a valid API key to subscribe to realtime channels via the API. See API Key for more info.

You can connect to the websocket API and listen for realtime changes on several resources such as the order book, markets, scores, and line updates.

Initialization

    ```javascript
    import * as ably from "ably";
    import axios from "axios";

    async function createTokenRequest() {
      const response = await axios.get("https://api.sx.bet/user/token", {
        headers: {
          "X-Api-Key": process.env.SX_BET_API_KEY,
        },
      });
      return response.data;
    }

    async function initialize() {
      const realtime = new ably.Realtime.Promise({
        authCallback: async (tokenParams, callback) => {
          try {
            const tokenRequest = await createTokenRequest();
            // Make a network request to GET /user/token passing in
            // `X-Api-Key: [YOUR_API_KEY]` as a header
            callback(null, tokenRequest);
          } catch (error) {
            callback(error, null);
          }
        },
      });
      await ablyClient.connection.once("connected");
    }
    ```
    
We use the Ably SDK to allow users to connect to our API. It supports pretty much every major language but all of the examples on this page will be in JavaScript. The API is relatively identical across languages though. See this link for a basic overview of the API in other languages.

 You only need one instance of the ably object to connect to the API. Connections to multiple channels are multiplexed though the single network connection. If you create too many individual connections, you will be forcefully unsubscribed from all channels and disconnected.
All the examples following assume you have a realtime object in scope following the initialization code to the right.

**Order book updates**

    ```javascript
    const marketHash =
      "0x04b9af76dfb92e71500975db77b1de0bb32a0b2413f1b3facbb25278987519a7";
    const token = "0xa25dA0331Cd053FD17C47c8c34BCCBAaF516C438";
    const channel = realtime.channels.get(`order_book:${token}:${marketHash}`);
    channel.subscribe((message) => {
      console.log(message.data);
    });
    ```
The above command returns JSON structured like this

    ```json
    [
      [
        "0x7bd766486f589f3e272d48294d8881fe68aae7704f7b2ef0a50bf6128be44271",
        "INACTIVE",
        "1000000000",
        "0x9883D5e7dC023A441A01Ef95aF406C69926a0AB6",
        "1000000000",
        "20306024864520233000",
        2209006800,
        1625691600,
        "1271418014917937117393617219009886912225128221921196717331617268846160092273",
        false,
        "0xbf099ab02255d5e2a9e063dc43a7afe96e65f5e8fc2ed3d2ba60b0a3fcadb3441bf32271293e85b7a795c9d86a2304035a0da3285113e746547e236bc58885e01c",
        "6982204685293715457",
        "SXR",
        "L13772588",
      ]
    ]
    ```

Subscribe to changes in a particular order book. You will receive updates when orders are filled, cancelled, or posted. Note that for performance reasons, updates are delayed by at most 100ms. Updates are packed into arrays to reduce total bandwidth.

Channel name format
order_book:{token}:{marketHash}

Name	Type	Description
token	string	Restrict updates to only orders denominated in this token
marketHash	string	The market to subscribe to
Message payload format
The order is packed into an array and the fields are sent in the below order, with the 0th index as the first row. Note that these are the same fields as mentioned in the the orders section, with an additional status and updateTime field.

Name	Type	Description
orderHash	string	A unique identifier for this order
status	string	"ACTIVE" if this order is still valid, "INACTIVE" otherwise
fillAmount	string	How much this order has been filled in Ethereum units up to a max of totalBetSize. See the token section of how to convert this into nominal amounts
maker	string	The market maker for this order
totalBetSize	string	The total size of this order in Ethereum units. See the the token section section for how to convert this into nominal amounts.
percentageOdds	string	The odds that the maker receives in the sportx protocol format. To convert to an implied odds divide by 10^20. To convert to the odds that the taker would receive if this order would be filled in implied format, use the formula takerOdds=1-percentageOdds/10^20. See the unit conversion section for more details.
expiry	number	Depcreated field: the time in unix seconds after which this order is no longer valid. Always 2209006800
apiExpiry	number	The time in unix seconds after which this order is no longer valid
salt	string	A random number to differentiate identical orders
isMakerBettingOutcomeOne	boolean	true if the maker is betting outcome one (and hence taker is betting outcome two if filled)
signature	string	Signature of the maker on this order
updateTime	string	Server-side clock time for the last modification of this order.
chainVersion	string	SXN or SXR
sportXeventId	string	The event related to this order
Note that the messages are sent in batches in an array. If you receive two updates for the same orderHash within an update, you can order them by updateTime after converting the updateTime to a BigInt or BigNumber.

**Get sports**

    ```bash
    curl --location --request GET 'https://api.sx.bet/sports'
    ```

The above command returns JSON structured like this:

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
        {
          "sportId": 4,
          "label": "Golf"
        },
        {
          "sportId": 5,
          "label": "Soccer"
        },
        {
          "sportId": 6,
          "label": "Tennis"
        },
        {
          "sportId": 7,
          "label": "Mixed Martial Arts"
        },
        {
          "sportId": 8,
          "label": "Football"
        },
        {
          "sportId": 9,
          "label": "E Sports"
        },
        {
          "sportId": 10,
          "label": "Custom"
        },
        {
          "sportId": 11,
          "label": "Rugby Union"
        },
        {
          "sportId": 12,
          "label": "Racing"
        },
        {
          "sportId": 13,
          "label": "Boxing"
        },
        {
          "sportId": 14,
          "label": "Crypto"
        },
        {
          "sportId": 15,
          "label": "Cricket"
        },
        {
          "sportId": 16,
          "label": "Economics"
        },
        {
          "sportId": 17,
          "label": "Politics"
        },
        {
          "sportId": 18,
          "label": "Entertainment"
        },
        {
          "sportId": 19,
          "label": "Medicinal"
        },
        {
          "sportId": 20,
          "label": "Rugby League"
        }
      ]
    }
    ```
This endpoint retrieves all sports available on the exchange

HTTP Request
GET https://api.sx.bet/sports

Response format
Name	Type	Description
status	string	success or failure if the request succeeded or not
data	Sport[]	Sports available on the exchange
A Sport object looks like

Name	Type	Description
sportId	number	The ID of the sport
label	string	The sport name


**Get active leagues**

    ```bash
    curl --location --request GET 'https://api.sx.bet/leagues/active'
    ```

The above command returns JSON structured like this:

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
        {
          "leagueId": 30,
          "label": "Champions League_UEFA",
          "sportId": 5,
    ,
          "eventsByType": {
            "outright-winner": 32,
            "game-lines": 10
          }
        },
        {
          "leagueId": 29,
          "label": "English Premier League",
          "sportId": 5,
    ,
          "eventsByType": {
            "outright-winner": 23,
            "game-lines": 10
          }
        },
        {
          "leagueId": 1197,
          "label": "UEFA Nations League",
          "sportId": 5,
    ,
          "eventsByType": {
            "outright-winner": 19,
            "game-lines": 2
          }
        },
        {
          "leagueId": 244,
          "label": "Bundesliga",
          "sportId": 5,
    ,
          "eventsByType": {
            "game-lines": 9,
            "outright-winner": 18
          }
        },
        {
          "leagueId": 1114,
          "label": "La Liga",
          "sportId": 5,
    ,
          "eventsByType": {
            "game-lines": 10,
            "outright-winner": 37
          }
        },
        {
          "leagueId": 1112,
          "label": "Ligue 1",
          "sportId": 5,
    ,
          "eventsByType": {
            "game-lines": 20,
            "outright-winner": 20
          }
        },
        {
          "leagueId": 1113,
          "label": "Serie A",
          "sportId": 5,
    ,
          "eventsByType": {
            "outright-winner": 20,
            "game-lines": 10
          }
        },
        {
          "leagueId": 1236,
          "label": "Portugal Primeira Liga",
          "sportId": 5,
    ,
          "eventsByType": {
            "outright-winner": 17,
            "game-lines": 9
          }
        }
      ]
    }
    ```

This endpoint returns all the currently active leagues with markets in them.

 Note that this endpoint is only updated every 10m.
HTTP Request
GET https://api.sx.bet/leagues/active

Query parameters
Name	Required	Type	Description
sportId	true	number	Only return active leagues under this sport
chainVersion	false	string	Must be either SXN or SXR.
If not passed, data from both chains are returned. See migration docs
Response format
See get leagues section for how the response object is formatted. There is an additional field eventsByType which maps the number of unique events within a particular bet group (for example, game-lines or outright-winner).

**Get fixtures**

    ```bash
    curl --location --request GET 'https://api.sx.bet/fixture/active?leagueId=2'
    ```

The above command returns JSON structured like this:

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
        {
          "participantOneName": "UMass Lowell River Hawks",
          "participantTwoName": "San Francisco Dons",
          "startDate": "2020-11-25T20:00:00.000Z",
          "status": 1,
          "leagueId": 2,
          "leagueLabel": "NCAA",
          "sportId": 1,
          "eventId": "L6208648"
        },
        {
          "participantOneName": "William Jewell",
          "participantTwoName": "Indianapolis",
          "startDate": "2020-11-28T03:45:00.000Z",
          "status": 1,
          "leagueId": 2,
          "leagueLabel": "NCAA",
          "sportId": 1,
          "eventId": "L6217784"
        }
      ]
    }
    ```
This endpoint returns current active fixtures for a particular league. A fixture can also be thought of as an event and multiple markets are under a particular event. Note that this endpoint only returns fixtures that have a status of either 1, 2, 6, 7, 8, or 9. See the status table in this section for more details.

HTTP Request
GET https://api.sx.bet/fixture/active

Query parameters
Name	Required	Type	Description
leagueId	true	number	The ID of the league
Response format
Name	Type	Description
status	string	success or failure if the request succeeded or not
data	Fixture[]	The active fixtures for this particular league
A Fixture object looks like this

Name	Type	Description
participantOneName	string?	The first participant in the fixture. Present if it's a two-participant event.
participantTwoName	string?	The second participant in the fixture. Present if it's a two-participant event.
participants	string[]?	All the participants in the fixture. Present if it's an n-participant event.
startDate	string	The start date of the event in UTC time
status	number	The status of the fixture. See the status table in this section for more details.
leagueId	number	The ID of the league this fixture belongs to
leagueLabel	string	The name of the league this fixture belongs to
sportId	number	The ID of the sport this fixture belongs to
eventId	string	The ID of this fixture

**Get active markets**

    ```bash
    curl --location --request GET 'https://api.sx.bet/markets/active?onlyMainLine=true'
    ```

The above command returns JSON structured like this:

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
          {
            "status": "ACTIVE",
            "marketHash": "0xe609a49d083cd41214a0db276c1ba323c4a947eefd2e4260386fec7b5d258188",
            "outcomeOneName": "Over 36.5",
            "outcomeTwoName": "Under 36.5",
            "outcomeVoidName": "NO_GAME_OR_EVEN",
            "teamOneName": "Nikoloz Basilashvili",
            "teamTwoName": "Carlos Alcaraz",
            "type": 2,
            "gameTime": 1622735700,
            "line": 36.5,
            "sportXEventId": "L7032829",
            "liveEnabled": true,
            "sportLabel": "Tennis",
            "sportId": 6,
            "leagueId": 1070,
      ,
            "leagueLabel": "ATP French Open",
            "mainLine": true,
            "group1": "ATP French Open"
          },
          {
            "status": "ACTIVE",
            "marketHash": "0x85e588d72b4a2ec6386846a6f4706dba2124410e38bd8e8f7f37dee9728e0d84",
            "outcomeOneName": "Nikoloz Basilashvili +1.5",
            "outcomeTwoName": "Carlos Alcaraz -1.5",
            "outcomeVoidName": "NO_GAME_OR_EVEN",
            "teamOneName": "Nikoloz Basilashvili",
            "teamTwoName": "Carlos Alcaraz",
            "type": 3,
            "gameTime": 1622735700,
            "line": 1.5,
            "sportXEventId": "L7032829",
            "liveEnabled": true,
            "sportLabel": "Tennis",
            "sportId": 6,
            "leagueId": 1070,
      ,
            "leagueLabel": "ATP French Open",
            "mainLine": true,
            "group1": "ATP French Open"
          }
        ],
        "nextKey": "60c7b8f54da0ad001aa3261c"
      }
    }
    ```
This endpoint retrieves active markets on the exchange. It does not return markets that have been settled or reported. Note that to retrieve odds for a particular market, you must query the orders endpoint the orders endpoint separately.

HTTP Request
GET https://api.sx.bet/markets/active

Query parameters
Name	Required	Type	Description
onlyMainLine	false	boolean	If set to true, the result will only include main lines on spread and over under markets
eventId	false	string	If set, it will only include markets for a particular sportXEventId
leagueId	false	number	If set, it will only include markets for a particular league ID
sportIds	false	number[]	If set, it will only include markets for particular sport IDs (comma separated)
liveOnly	false	boolean	If set, it will only include markets that are currently available for in-play betting
betGroup	false	string	If set, it will only include markets for a particular bet group
type	false	number[]	If set, it will only include markets for those particular market types. See below for the options
paginationKey	false	string	Used for pagination. Pass the nextKey returned from the previous request to retrieve the next set of records.
pageSize	false	number	Used for pagination. Requested page size. Each call will only return up to this amount of records. Maximum of 50
chainVersion	false	string	Must be either SXN or SXR.
If not passed, data from both chains are returned. See migration docs
 Only one of type and betGroup can be present. Not both.
Response format
Name	Type	Description
status	string	success or failure if the request succeeded or not
data	object	The response data
> markets	Market[]	The active markets
> nextKey	string	Use this key as the paginationKey to retrieve the next set of records, if any
A market object looks like this

Name	Type	Description
status	string	ACTIVE or INACTIVE
marketHash	string	The unique identifier for the market
outcomeOneName	string	Outcome one for this market
outcomeTwoName	string	Outcome two for this market
outcomeVoidName	string	Outcome void for this market
teamOneName	string	The name of the first team/player participating
teamTwoName	string	The name of the second team/player participating
type	MarketType	The type of the market
gameTime	number	The UNIX timestamp of the game
line	number?	The line of the market. Only applicable to markets with a line
sportXEventId	string	The unique event ID for this market
liveEnabled	boolean	Whether or not this match is available for live betting
sportLabel	string	The name of the sport for this market
sportId	number	The ID of the sport for this market
leagueId	number	The league ID for this market
leagueLabel	string	The name of the league for this market
mainLine	boolean?	If this market is currently the main line or not. If the market is not a market with multiple lines, this field will not be present
group1	string	Indicator to the client of how to display this market
group2	string?	Indicator to the client of how to display this market
teamOneMeta	string?	Extra metadata for team one
teamTwoMeta	string?	Extra metadata for team two
marketMeta	string?	Extra metadata for the market overall
legs	Market[]?	If this is a Parlay Market, this field will contain an array of the underlying Legs as a Market object
chainVersion	string?	SXN or SXR. See migration docs.
A MarketType can currently be one of the following

ID	Name	Has Lines	Description	Bet Group
1	1X2	false	Who will win the game (1X2)	1X2
52	12	false	Who will win the game	game-lines
88	To Qualify	false	Which team will qualify	game-lines
226	12 Including Overtime	false	Who will win the game including overtime (no draw)	game-lines
3	Asian Handicap	true	Who will win the game with handicap (no draw)	game-lines
201	Asian Handicap Games	true	Who will win more games with handicap (no draw)	game-lines
342	Asian Handicap Including Overtime	true	Who will win the game with handicap (no draw) including Overtime	game-lines
2	Under/Over	true	Will the score be under/over a specific line	game-lines
835	Asian Under/Over	true	Will the score be under/over specific asian line	game-lines
28	Under/Over Including Overtime	true	Will the score including overtime be over/under a specific line	game-lines
29	Under/Over Rounds	true	Will the number of rounds in the match will be under/over a specific line	game-lines
166	Under/Over Games	true	Number of games will be under/over a specific line	game-lines
1536	Under/Over Maps	true	Will the number of maps be under/over a specific line	game-lines
274	Outright Winner	false	Winner of a tournament, not a single match	outright-winner
202	First Period Winner	false	Who will win the 1st Period Home/Away	first-period-lines
203	Second Period Winner	false	Who will win the 2nd Period Home/Away	second-period-lines
204	Third Period Winner	false	Who will win the 3rd Period Home/Away	third-period-lines
205	Fourth Period Winner	false	Who will win the 4th Period Home/Away	fourth-period-lines
866	Set Spread	true	Which team/player will win more sets with handicap	set-betting
165	Set Total	true	Number of sets will be under/over a specific line	set-betting
53	Asian Handicap Halftime	true	Who will win the 1st half with handicap (no draw)	first-half-lines
64	Asian Handicap First Period	true	Who will win the 1st period with handicap (no draw)	first-period-lines
65	Asian Handicap Second Period	true	Who will win the 2nd period with handicap (no draw)	second-period-lines
66	Asian Handicap Third Period	true	Who will win the 3rd period with handicap (no draw)	third-period-lines
63	12 Halftime	false	Who will win the 1st half (no draw)	first-half-lines
77	Under/Over Halftime	true	Will the score in the 1st half be under/over a specific line	first-half-lines
21	Under/Over First Period	true	Will the score in the 1st period be under/over a specific line	first-period-lines
45	Under/Over Second Period	true	Will the score in the 2nd period be under/over a specific line	second-period-lines
46	Under/Over Third Period	true	Will the score in the 3rd period be under/over a specific line	third-period-lines
281	1st Five Innings Asian handicap	true	Who will win the 1st five innings with handicap (no draw)	first-five-innings
1618	1st 5 Innings Winner-12	false	Who will win in the 1st five innings	first-five-innings
236	1st 5 Innings Under/Over	true	Will the score in the 1st five innings be under/over a specific line	first-five-innings
More types will be added continuously.

**Get specific markets**
curl --location --request GET 'https://api.sx.bet/markets/find'
The above command returns JSON structured like this:

{
  "status": "success",
  "data": [
    {
      "status": "ACTIVE",
      "marketHash": "0x3cba25f2253035b015b9bb555c1bf900f6737704d57425dd2a5b60e929c33b81",
      "outcomeOneName": "Over 2.5",
      "outcomeTwoName": "Under 2.5",
      "outcomeVoidName": "NO_GAME_OR_EVEN",
      "teamOneName": "Aston Villa",
      "teamTwoName": "Burnley",
      "type": 2,
      "gameTime": 1608228000,
      "line": 2.5,
      "reportedDate": 1608234719,
      "outcome": 2,
      "teamOneScore": 0,
      "teamTwoScore": 0,
      "sportXEventId": "L6247212",
      "liveEnabled": false,
      "sportLabel": "Soccer",
      "sportId": 5,
      "leagueId": 29,
      "leagueLabel": "English Premier League",
      "group1": "English Premier League"
    }
  ]
}

This endpoint retrieves specific markets

HTTP Request
GET https://api.sx.bet/markets/find

Query parameters
Name        Required    Type        Description
marketHashes    true    string[]    The market hashes of the markets to retrieve. Comma separated. Maximum 30.

Response format
Name    Type        Description
status  string      success or failure if the request succeeded or not
data    Market[]    The response data

See active markets section for how the Market object is formatted. Note that there are a few additional fields if you are querying a market that has been settled/reported:

Name            Type    Description
reportedDate    number  Time in unix seconds of when the market was reported
outcome         number  The outcome of the market. Can be one of 0 1 or 2. 0 means the market was voided and stakes were returned to bettors. 1 means the outcome labeled outcomeOneName was the outcome. 2 means the outcome labeled outcomeTwoName was the outcome.
teamOneScore    number  Final score of team one
teamTwoScore    number  Final score of team two

Error Responses
Error Code          Description
BAD_MARKET_HASHES   Invalid marketHashes or more than 30 marketHashes queried


**Get active trades**
    ```bash
    curl --location --request GET 'https://api.sx.bet/trades'
    ```
The above command returns JSON structured like this:

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
          {
            "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
            "bettor": "0x683bcf3ecc5A6e2E99ff83f3300515a584108391",
            "stake": "9999999999999999999",
            "odds": "49416553169198540000",
            "orderHash": "0xb47329db2a3f612748094f415f9bf478cbed2f196548ec68154bd1fc543a6f09",
            "marketHash": "0x3fd03af14bf11264f5274ed4c8cc283e4479d29d33e17409e8e7d9b26ca9f030",
            "maker": false,
            "betTime": 1607708054,
            "settled": true,
            "settleValue": 1,
            "bettingOutcomeOne": true,
            "fillHash": "0xbe846c92bec584c4d2215df76ac7d53ebab25f81a30cca5811fb93f35e8b5321",
            "tradeStatus": "SUCCESS",
            "valid": true,
            "outcome": 1,
            "settleDate": "2020-12-11T20:17:45.990Z"
          },
          {
            "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
            "bettor": "0xE965292B97CD666e85FaB99e2732b1A71046cf3F",
            "stake": "17592800276256254757",
            "odds": "69184587813620070000",
            "orderHash": "0x1534133364d8b18d803a9419914bb89a651de5e9fa1845868d6844a6670c4762",
            "marketHash": "0xcb8285aeef17d824b76cf4a00ba5f2bf256048114937c85609897e7b8967e9ca",
            "maker": true,
            "betTime": 1607719092,
            "settled": true,
            "settleValue": 1,
            "bettingOutcomeOne": true,
            "fillHash": "0xc0240cf27c111d843bc4cf2de0521ab097223de933125857343e7a6fba469172",
            "tradeStatus": "SUCCESS",
            "valid": true,
            "outcome": 1,
            "settleDate": "2020-12-11T22:02:19.484Z"
          },
          {
            "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
            "bettor": "0x5aC843EecBf67669d4003aa49aE5e0136dc73365",
            "stake": "7835984995472770999",
            "odds": "30815412186379930000",
            "orderHash": "0x1534133364d8b18d803a9419914bb89a651de5e9fa1845868d6844a6670c4762",
            "marketHash": "0xcb8285aeef17d824b76cf4a00ba5f2bf256048114937c85609897e7b8967e9ca",
            "maker": false,
            "betTime": 1607719092,
            "settled": true,
            "settleValue": 1,
            "bettingOutcomeOne": false,
            "fillHash": "0xc0240cf27c111d843bc4cf2de0521ab097223de933125857343e7a6fba469172",
            "tradeStatus": "SUCCESS",
            "valid": true,
            "outcome": 1,
            "settleDate": "2020-12-11T22:02:19.484Z"
          }
        ],
        "nextKey": "60e4b70dc476a37a5b1b15ae",
        "pageSize": 4
      }
    }
    ```

This endpoint retrieves past trades on the exchange split up by order. This is a paginated endpoint. For example, if a trade fills more than one order at once, it will show up as two entries for the bettor.

HTTP Request
GET https://api.sx.bet/trades

Query parameters
Name	Required	Type	Description
startDate	false	number	Only get trades placed after this time in UNIX seconds
endDate	false	number	Only get trades placed before this time in UNIX seconds
bettor	false	string	Only get trades placed by this bettor (regardless if maker or taker)
settled	false	boolean	If true, only get settled trades
marketHashes	false	string[]	Only get trades for particular markets. Comma separated
baseToken	false	string	Only get trades placed for a particular token
maker	false	boolean	If true, only get trades where the bettor is the maker
affiliate	false	string	Only get trades under this affiliate
pageSize	false	number	Requested page size. Each call will only return up to this amount of records. Default is 100.
paginationKey	false	string	Used for pagination. Pass the nextKey returned from the previous request to retrieve the next set of records.
tradeStatus	false	string	Filter trades to see only those with SUCCESS or FAILED status'
chainVersion	false	string	Must be either SXN or SXR.
If not passed, data from both chains are returned. See migration docs
Response format
Name	Type	Description
status	string	success or failure if the request succeeded or not
data	object	The response data
> trades	Trade[]	The trades for the request
> nextKey	string	Use this key as the paginationKey to retrieve the next set of records, if any
> pageSize	number	Maximum amount of records on this page. Will be equal to the pageSize passed in
A Trade object has the following format

Name	Type	Description
baseToken	string	The token in which this trade was placed
bettor	string	The address of the bettor who placed the trade
stake	string	Exact token amount that was staked for the bet. To convert into a readable token amount, see the token conversion section
odds	string	Implied odds that the bettor received for this bet. Divide by 10^20 to get the odds in decimal format.
orderHash	string	The unique identifier of the order that was filled for this trade
marketHash	string	The unique identifier of the market for which this trade was placed
maker	boolean	true if the bettor is market maker in this trade
betTime	number	The time in UNIX seconds when the trade was placed
settled	boolean	true if this bet is settled (this refers to if the bet was won lost or voided, not if the trade succeeded or not)
bettingOutcomeOne	boolean	true if the bettor is betting outcome one in the market
fillHash	string	The unique identifier for this trade
tradeStatus	string	SUCCESS or FAILED depending on if this trade succeeded or not
valid	boolean	true if the trade counts toward competitions or tournaments
outcome	number	with settled=true, this will be 0, 1, or 2 depending on the final outcome of the market
settleDate	string	ISO formatted date string of when the trade was settled
chainVersion	string	SXN or SXR. See migration docs.
sportXeventId	string	The event related to this trade


**Get active orders**

    ```bash
    curl --location --request GET 'https://api.sx.bet/orders'
    ```

The above command returns JSON structured like this

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
        {
          "fillAmount": "0",
          "orderHash": "0xd055d177477bd19faa9bad5cb4f907d8ebe069b614bb708713de068293cb809d",
          "marketHash": "0x0eeace4a9bbf6235bc59695258a419ed3a05a2c8e3b6a58fb71a0d9e6b031c2b",
          "maker": "0x63a4491dC73245E181c47BAe0ae9d6627E56dE55",
          "totalBetSize": "10000000000000000000",
          "percentageOdds": "29542732332840140000",
          "expiry": 2209006800,
          "apiExpiry": 1631233201,
          "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
          "executor": "0x3E91041b9e60C7275f8296b8B0a97141e6442d49",
          "salt": "37069036490382455296196784649228360571791475783443923366499720348790829992442",
          "isMakerBettingOutcomeOne": false,
          "signature": "0x68fb16ff440c65e0306cb16a9842da362480208a9a75597d45ca722769d93e6a13c9196a2654f764bfd5c0d4c83165c0a8ffa955ae9af8afd17544b0db29eaf71c",
          "createdAt": "2021-06-04T17:42:07.303Z"
        },
        {
          "fillAmount": "0",
          "orderHash": "0xa5a30ca2251ac1431adf3d88f5734a53b78a13b2c707211eb83996bf099e3973",
          "marketHash": "0x15c5cceb3d27518241355e9f148ef96b0a178f1bcdb366dea2d0e621a9cef1fb",
          "maker": "0x63a4491dC73245E181c47BAe0ae9d6627E56dE55",
          "totalBetSize": "10000000000000000000",
          "percentageOdds": "50000000000000000000",
          "expiry": 2209006800,
          "apiExpiry": 1631233201,
          "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
          "executor": "0x3E91041b9e60C7275f8296b8B0a97141e6442d49",
          "salt": "90344661128498016788545482097709376028896473001963632493180076229973632520043",
          "isMakerBettingOutcomeOne": true,
          "signature": "0x9b6c1e1d0cae584a3078f20d7bafd2031467a1cbce905027c6c970c13edef4357eeac625afe869417ffbecfb67b6672b765177d42fbda777f6b1a00962da2cc61c",
          "createdAt": "2021-06-04T17:42:07.270Z"
        }
      ]
    }
    ```

This endpoint returns active orders on the exchange based on a few parameters

HTTP Request
GET https://api.sx.bet/orders

Query parameters
Name	Required	Type	Description
marketHashes	false	string[]	Only get orders for these market hashes. Comma separated.
baseToken	false	string	Only get orders denominated in this base token
maker	false	string	Only get orders for this market maker
sportXEventId	false	string	Only get orders for this event ID
chainVersion	false	string	Must be either SXN or SXR.
If not passed, data from both chains are returned. See migration docs
 One of `marketHashes` or `maker` is required.
 Only one of `marketHashes` and `sportXEventId` can be present.


Response format
Name	Type	Description
fillAmount	string	How much this order has been filled in Ethereum units up to a max of totalBetSize. See the token section of how to convert this into nominal amounts
orderHash	string	A unique identifier for this order
marketHash	string	The market corresponding to this order
maker	string	The market maker for this order
totalBetSize	string	The total size of this order in Ethereum units. See the the token section section for how to convert this into nominal amounts.
percentageOdds	string	The odds that the maker receives in the sx.bet protocol format. To convert to an implied odds divide by 10^20. To convert to the odds that the taker would receive if this order would be filled in implied format, use the formula takerOdds=1-percentageOdds/10^20. See the unit conversion section for more details.
expiry	number	Deprecated: the time in unix seconds after which this order is no longer valid. After deprecation, this field is always 2209006800 (2040)
apiExpiry	number	The time in unix seconds after which this order is no longer valid.
baseToken	string	The base token this order is denominated in
executor	string	The address permitted to execute on this order. This is set to the sx.bet exchange
salt	string	A random number to differentiate identical orders
isMakerBettingOutcomeOne	boolean	true if the maker is betting outcome one (and hence taker is betting outcome two if filled)
signature	string	Signature of the maker on this order
sportXeventId	string	The event related to this order

Error Responses
Error Code	Description
RATE_LIMIT_ORDER_REQUEST_MARKET_COUNT	More than 1000 marketHashes queried
BOTH_SPORTXEVENTID_MARKETHASHES_PRESENT	Can only send one of marketHashes or sportXEventId
 Note that totalBetSize and fillAmount are from *the perspective of the market maker*. totalBetSize can be thought of as the maximum amount of tokens the maker will be putting into the pot if the order was fully filled. fillAmount can be thought of as how many tokens the maker has already put into the pot. To compute how much space there is left from the taker's perspective, you can use the formula remainingTakerSpace = (totalBetSize - fillAmount) * 10^20 / percentageOdds - (totalBetSize - fillAmount)


Post a new order
    ```bash
    curl --location --request POST 'https://api.sx.bet/orders/new' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "orders": [
            {
                "marketHash": "0x0eeace4a9bbf6235bc59695258a419ed3a05a2c8e3b6a58fb71a0d9e6b031c2b",
                "maker": "0x6F75bA6c90E3da79b7ACAfc0fb9cf3968aa4ee39",
                "totalBetSize": "21600000000000000000",
                "percentageOdds": "47846889952153115000",
                "baseToken": "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
                "apiExpiry": 1631359800,
                "expiry": 2209006800,
                "executor": "0x3E91041b9e60C7275f8296b8B0a97141e6442d49",
                "isMakerBettingOutcomeOne": true,
                "signature": "0x50b00e7994b0656f78701537296444bccba2a7e4d46a84ff26c8ca48cb66774c76faa893be293412959779900232065c8236e489158070777d7a3e1a37d911811b",
                "salt": "61882422358902283358380622686147595792242782952753619716150366288606659190035"
            }
        ]
    }'
    ```
    ```javascript
    import { BigNumber, utils, providers, Wallet } from "ethers";

    const order = {
      marketHash:
        "0x0eeace4a9bbf6235bc59695258a419ed3a05a2c8e3b6a58fb71a0d9e6b031c2b",
      maker: "0x6F75bA6c90E3da79b7ACAfc0fb9cf3968aa4ee39",
      totalBetSize: BigNumber.from("21600000000000000000").toString(),
      percentageOdds: BigNumber.from("47846889952153115000").toString(),
      baseToken: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      apiExpiry: 1631233201,
      expiry: 2209006800,
      executor: "0x3E91041b9e60C7275f8296b8B0a97141e6442d49",
      isMakerBettingOutcomeOne: true,
      salt: BigNumber.from(utils.randomBytes(32)).toString(),
    };

    const orderHash = utils.arrayify(
      utils.solidityKeccak256(
        [
          "bytes32",
          "address",
          "uint256",
          "uint256",
          "uint256",
          "uint256",
          "address",
          "address",
          "bool",
        ],
        [
          order.marketHash,
          order.baseToken,
          order.totalBetSize,
          order.percentageOdds,
          order.expiry,
          order.salt,
          order.maker,
          order.executor,
          order.isMakerBettingOutcomeOne,
        ]
      )
    );

    // Example shown here with an ethers.js wallet if you're interacting with the exchange using a private key
    const wallet = new Wallet(process.env.PRIVATE_KEY);
    const signature = await wallet.signMessage(orderHash);

    // Example shown here if you're interacting with the exchange using an injected web3 provider such as metamask
    const provider = new providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const signature = await signer.signMessage(orderHash);

    const signedOrder = { ...order, signature };

    const result = await fetch("https://api.sx.bet/orders/new", {
      method: "POST",
      body: JSON.stringify({ orders: [signedOrder] }),
      headers: { "Content-Type": "application/json" },
    });

    // Odds ladder testing

    import { BigNumber } from "bignumber.js";
    import { BigNumber as EthBigNumber } from "ethers";

    export const ODDS_LADDER_STEP_SIZE = 25; // (0.1% = 1, 0.5% = 5, etc)

    /**
     * Check if the odds are valid, i.e., in one of the allowed steps
     * @param odds Odds to check
     */
    export function checkOddsLadderValid(
      odds: EthBigNumber,
      stepSizeOverride?: number
    ) {
      // Logic:
      // 100% = 10^20
      // 10% = 10^19
      // 1% = 10^18
      // 0.1% = 10^17
      return odds
        .mod(EthBigNumber.from(10).pow(16).mul(ODDS_LADDER_STEP_SIZE))
        .eq(0);
    }

    /**
     * Rounds odds to the nearest step.
     * @param odds Odds to round.
     */
    export function roundDownOddsToNearestStep(
      odds: EthBigNumber,
      stepSizeOverride?: number
    ) {
      const step = EthBigNumber.from(10).pow(16).mul(ODDS_LADDER_STEP_SIZE);
      const bnStep = new BigNumber(step.toString());
      const bnOdds = new BigNumber(odds.toString());
      const firstPassDivision = bnOdds.dividedBy(bnStep).toFixed(0, 3);
      return EthBigNumber.from(firstPassDivision).mul(step);
    }
    ```
The above command returns JSON structured like this

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
This endpoint offers new orders on the exchange (market making). Offering orders does not cost any fee.

Note you can offer as many orders as you wish, provided your total exposure for each token (as measured by totalBetSize - fillAmount) remains under your wallet balance. If your wallet balance dips under your total exposure, orders will be removed from the book until it reaches the minimum again.

 Your assets must be on SX Network to place orders.
 If the API finds that your balance is consistently below your total exposure requiring orders to be cancelled, your account may be temporarily restricted.
To offer bets on sx.bet via the API, make sure you first enable betting by following the steps here.

We enforce an odds ladder to prevent diming. Your offer, in implied odds, must fall on one of the steps on the ladder. Currently, that is set to intervals of 0.25%, meaning that your offer cannot fall between the steps. An offer of 50.25% would be valid, but an offer of 50.05% would not. You can check if your odds would fall on the ladder by taking the modulus of your odds and 2.5 * 10 ^ 17 and checking if it's equal to 0. See the bottom of the JavaScript tab for a sample on how to do this, and how to round your odds to the nearest step.

You can get the current interval from GET /metadata. It will spit out a number from 10 to 100, where 10 = 0.10%, and 25 = 0.25%

 Odds not on the ladder will be rejected and your order(s) will not be posted.
HTTP Request
POST https://api.sx.bet/orders/new

Request payload parameters
Name	Required	Type	Description
orders	true	SignedNewOrder[]	The new orders to post
A SignedNewOrder object looks like this

Name	Type	Description
marketHash	string	The market you wish to place this order under
maker	string	The ethereum address offering the bet
baseToken	string	The token this order is denominated in
totalBetSize	string	The total bet size of the order in Ethereum units.
percentageOdds	string	The odds the maker will be receiving as this order gets filled. Must be on the odds ladder or will be rejected.
expiry	number	Deprecated. Time in UNIX seconds after which this order is no longer valid. Must always be 2209006800.
apiExpiry	number	Time in UNIX seconds after which this order is no longer valid.
executor	string	The sx.bet executor address. See the metadata section for where to get this address
salt	string	A random 32 byte string to differentiate between between orders with otherwise identical parameters
isMakerBettingOutcomeOne	boolean	true if the maker is betting outcome one (and hence taker is betting outcome two if filled)
signature	string	The signature of the maker on this order payload
 The address in the maker field must match the account being used to create the signature!
Response format
Name	Type	Description
status	string	success or failure if the request succeeded or not
data	object	The response data
> orders	string[]	The order hashes corresponding to the new orders
 Note that totalBetSize is from *the perspective of the market maker*. totalBetSize can be thought of as the maximum amount of tokens the maker (you) will be putting into the pot if the order was fully filled. This is the maximum amount you will risk.
Error Responses
Error Code	Description
TOO_MANY_DIFFERENT_MARKETS	More than 3 different markets queried
ORDERS_MUST_HAVE_IDENTICAL_MARKET	All orders must be for the same network, either SXN or SXR
BAD_BASE_TOKEN	All orders must be for the same base token, either USDC or WSX
Cancel individual orders
    ```bash
    curl --location --request POST 'https://api.sx.bet/orders/cancel/v2' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "orderHashes": [
            "0x335d3dbd0621f0f6da90d1a58269e71b2fb5e91193dca75a0b90396cccb63001"
        ],
        "signature": "0x1763cb98a069657cb778fdc295eac48741b957bfe58e54f7f9ad03c6c1ca3d053d9ca2e6957af794991217752b69cb9aa4ac9330395c92e24c8c25ec19220e5a1b",
        "salt": "0x6845028402f518a1c90770554a71017cd434ae9f2c09aa56c9560835c1929650",
        "maker": "0xe087299AE9Acd0133d6D1544A97Bb0EEe24a2671",
        "timestamp": 1643897553
    }'
    ```
    ```javascript
    import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";
    import { randomBytes } from "@ethersproject/random";

    // Example is shown using a private key

    const privateKey = process.env.PRIVATE_KEY;
    const bufferPrivateKey = Buffer.from(privateKey.substring(2), "hex");
    const orderHashes = [
      "0x4ead6ef92741cd0b6e1ea32cb1d9586a85165e8bd780ab6f897992428c357bf1",
    ];
    const salt = `0x${Buffer.from(randomBytes(32)).toString("hex")}`;
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const wallet = new Wallet(privateKey);

    function getCancelOrderEIP712Payload(orderHashes, salt, timestamp, chainId) {
      const payload = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "salt", type: "bytes32" },
          ],
          Details: [
            { name: "orderHashes", type: "string[]" },
            { name: "timestamp", type: "uint256" },
          ],
        },
        primaryType: "Details",
        domain: {
          name: "CancelOrderV2SportX",
          version: "1.0",
          chainId,
          salt,
        },
        message: { orderHashes, timestamp },
      };
      return payload;
    }

    const payload = getCancelOrderEIP712Payload(orderHashes, salt, timestamp, chainId);

    const signature = signTypedData({
      privateKey: bufferPrivateKey, 
      data: payload,
      version: SignTypedDataVersion.V4,
    });

    const apiPayload = {
      signature,
      orderHashes,
      salt,
      maker: wallet.address,
      timestamp,
    };

    const result = await fetch("https://api.sx.bet/orders/cancel/v2", {
      method: "POST",
      body: JSON.stringify(apiPayload),
      headers: { "Content-Type": "application/json" },
    });
    ```
The above command returns json structured like this

    ```json
    {
      "status": "success",
      "data": {
        "cancelledCount": 1
      }
    }
    ```
This endpoint cancels existing orders on the exchange that you placed as a market maker. If passed orders that do not exist, they simply fail silently while the others will succeed.

HTTP Request
POST https://api.sx.bet/orders/cancel/v2

Query parameters
Name	Required	Type	Description
chainVersion	false	string	Must be either SXN or SXR.
If not passed, Default will be SXN. See migration docs
Request payload parameters
Name	Required	Type	Description
orderHashes	true	string[]	The order hashes to cancel
signature	true	string	The EIP712 signature on the cancel order payload. See the EIP712 signing section for more details on how to compute this signature.
salt	required	string	A random 32 bytes hex string to protect against replay
maker	required	true	The account from which you are cancelling orders
timestamp	required	true	The current timestamp in UNIX seconds to protect against replay
Response format
Name	Type	Description
status	string	success or failure if the request succeeded or not
data	object	The response data
> cancelledCount	string[]	How many orders were cancelled, of the orders passed
Error Responses
Error Code	Description
CANCEL_REQUEST_ALREADY_PROCESSED	This cancellation is already processed


**Unit Conversion**
**Tokens**
Every token in Ethereum has an associated "decimals" value. This effectively specifies how divisible the token is. For example, 100 USDC is actually stored as 100 * 10^18 USDC on Ethereum itself. Here is a table for the tokens supported by SX.bet and their associated decimals value

Token	SX Network Address	Decimals
USDC	See https://api.sx.bet/metadata for address	6
WSX	See https://api.sx.bet/metadata for address	18
To convert from nominal units (such as 100 USDC) to Ethereum units which are used in the API, you can do the following.

ethereumAmount = nominalAmount * 10^decimals

Similarly, to convert from Ethereum units to nominal units, you can do the following

nominalAmount = ethereumAmount / 10^decimals

where decimals is specified in the above table.

**Odds**
Odds are specified in an implied odds format like 8391352143642350000. To convert to a readable implied odds, divide by 10^20. 8391352143642350000 for example is 0.0839 or 8.39%

To convert from implied odds to decimal odds, inverse the number. For example, 0.0839 in decimal format is 1/0.0839 = 11.917.

**Bookmaker odds**

    ```json
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
    }
    ```

It's important to note how odds are displayed on sx.bet. Recall from the order section that percentageOdds is from the perspective of the market maker. The odds that are displayed on sx.bet in the order books are what the taker will be receiving. Let's run through an example.

Suppose an order looks like the one.

Here the maker is betting outcome one (isMakerBettingOutcomeOne = true) and receiving implied odds of 70455284072443640000 / 10^20 = 0.704552841. Therefore the taker is betting outcome two and receiving implied odds of 1 - 0.704552841 = 0.295447159. This would be displayed on sx.bet (what the user sees) under the second order book with odds of 29.5% in implied format, or 1 / 0.295447159 = 3.3847 in decimal format.
