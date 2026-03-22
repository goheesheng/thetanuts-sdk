import type { OptionStructure } from './common.js';

/**
 * Input parameters for payoff calculation
 */
export interface PayoffInput {
  /** Option structure type */
  structure: OptionStructure;
  /** Strike price(s) - array to support multi-leg structures */
  strikes: bigint[];
  /** Size of the position (positive for long, negative for short) */
  size: bigint;
  /** Premium paid/received per contract */
  premium: bigint;
  /** Whether this is a buy (true) or sell (false) */
  isBuy: boolean;
  /** Decimals for the collateral token (default: 6 for USDC) */
  collateralDecimals?: number;
  /** Decimals for the underlying price (default: 8) */
  priceDecimals?: number;
}

/**
 * Single point on a payoff diagram
 */
export interface PayoffPoint {
  /** Underlying price at this point */
  underlyingPrice: bigint;
  /** Payoff (profit/loss) at this price */
  payoff: bigint;
  /** Payoff as a percentage of premium (for visualization) */
  payoffPercentage: number;
}

/**
 * Complete payoff diagram data
 */
export interface PayoffDiagram {
  /** Input parameters used */
  input: PayoffInput;
  /** Array of payoff points */
  points: PayoffPoint[];
  /** Maximum profit (if bounded, otherwise undefined) */
  maxProfit?: bigint;
  /** Maximum loss (if bounded, otherwise undefined) */
  maxLoss?: bigint;
  /** Breakeven price(s) */
  breakevenPrices: bigint[];
}

/**
 * Parameters for generating a payoff diagram
 */
export interface PayoffDiagramParams {
  /** Payoff input parameters */
  input: PayoffInput;
  /** Minimum price for the diagram (default: 50% of lowest strike) */
  minPrice?: bigint;
  /** Maximum price for the diagram (default: 150% of highest strike) */
  maxPrice?: bigint;
  /** Number of points to generate (default: 100) */
  numPoints?: number;
}

/**
 * Greek values for an option position
 */
export interface Greeks {
  /** Delta: rate of change of option price with respect to underlying price */
  delta: number;
  /** Gamma: rate of change of delta with respect to underlying price */
  gamma: number;
  /** Theta: rate of change of option price with respect to time (per day) */
  theta: number;
  /** Vega: rate of change of option price with respect to volatility */
  vega: number;
  /** Rho: rate of change of option price with respect to interest rate */
  rho: number;
}

/**
 * Input for Greek calculation
 */
export interface GreeksInput {
  /** Option structure type */
  structure: OptionStructure;
  /** Strike price(s) */
  strikes: bigint[];
  /** Time to expiry in years */
  timeToExpiry: number;
  /** Current underlying price */
  spotPrice: bigint;
  /** Implied volatility (annualized, as decimal e.g., 0.5 for 50%) */
  volatility: number;
  /** Risk-free rate (annualized, as decimal e.g., 0.05 for 5%) */
  riskFreeRate: number;
  /** Position size */
  size: bigint;
  /** Price decimals (default: 8) */
  priceDecimals?: number;
}
