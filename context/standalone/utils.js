// utils.js - Utility functions for odds and bet size conversion

/**
 * Converts token amount from Ethereum units to nominal units
 * @param {string} ethereumAmount - Amount in Ethereum units (string)
 * @param {number} decimals - Token decimals (default: 6 for USDC)
 * @returns {number} - Amount in nominal units
 */
export function toNominalAmount(ethereumAmount, decimals = 6) {
    return parseFloat(ethereumAmount) / Math.pow(10, decimals);
  }
  
  /**
   * Converts percentage odds from contract format to readable implied odds
   * @param {string} percentageOdds - Odds in contract format (string)
   * @returns {number} - Implied odds (0-1)
   */
  export function toImpliedOdds(percentageOdds) {
    return parseFloat(percentageOdds) / Math.pow(10, 20);
  }
  
  /**
   * Calculates the implied odds for a taker
   * @param {string} percentageOdds - Maker's odds in contract format (string)
   * @returns {number} - Taker's implied odds (0-1)
   */
  export function calculateTakerImpliedOdds(percentageOdds) {
    const makerOdds = toImpliedOdds(percentageOdds);
    return 1 - makerOdds;
  }
  
  /**
   * Converts implied odds to decimal odds format
   * @param {number} impliedOdds - Implied odds (0-1)
   * @returns {number} - Decimal odds
   */
  export function toDecimalOdds(impliedOdds) {
    return 1 / impliedOdds;
  }
  
  /**
   * Calculates the remaining bet size available for a taker
   * @param {string} totalBetSize - Total bet size in Ethereum units (string)
   * @param {string} fillAmount - Amount already filled in Ethereum units (string)
   * @param {string} percentageOdds - Odds in contract format (string)
   * @returns {number} - Remaining taker bet size in Ethereum units
   */
  export function calculateRemainingTakerSpace(totalBetSize, fillAmount, percentageOdds) {
    const totalBetSizeBN = parseFloat(totalBetSize);
    const fillAmountBN = parseFloat(fillAmount);
    const remainingMakerAmount = totalBetSizeBN - fillAmountBN;
    
    if (remainingMakerAmount <= 0) {
      return 0;
    }
    
    // Formula: remainingTakerSpace = (totalBetSize - fillAmount) * 10^20 / percentageOdds - (totalBetSize - fillAmount)
    const percentageOddsBN = parseFloat(percentageOdds);
    return (remainingMakerAmount * Math.pow(10, 20) / percentageOddsBN) - remainingMakerAmount;
  }
  
  /**
   * Formats an order for display from taker's perspective
   * @param {Object} order - Order object from API
   * @returns {Object} - Formatted order with taker's perspective
   */
  export function formatOrderForTaker(order) {
    const {
      totalBetSize,
      fillAmount,
      percentageOdds,
      isMakerBettingOutcomeOne
    } = order;
    
    // Calculate taker's implied odds
    const takerImpliedOdds = calculateTakerImpliedOdds(percentageOdds);
    const takerDecimalOdds = toDecimalOdds(takerImpliedOdds);
    
    // Calculate remaining bet size for taker
    const remainingTakerSpaceEth = calculateRemainingTakerSpace(totalBetSize, fillAmount, percentageOdds);
    const remainingTakerSpaceNominal = toNominalAmount(remainingTakerSpaceEth.toString());
    
    return {
      orderHash: order.orderHash,
      outcome: isMakerBettingOutcomeOne ? 2 : 1, // Taker bets opposite of maker
      impliedOdds: takerImpliedOdds,
      impliedOddsFormatted: `${(takerImpliedOdds * 100).toFixed(2)}%`,
      decimalOdds: takerDecimalOdds.toFixed(2),
      availableBetSize: remainingTakerSpaceNominal.toFixed(2),
      createdAt: new Date(order.createdAt).toLocaleString()
    };
  }