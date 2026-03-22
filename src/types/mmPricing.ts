/**
 * MM Pricing Types
 *
 * Types for Thetanuts Market Maker pricing module.
 * MM pricing includes fee adjustments and collateral costs,
 * typically resulting in prices 10-20% worse than raw exchange prices.
 */

/**
 * Collateral APR rates for calculating collateral cost.
 * These are the opportunity cost rates for locking up collateral.
 *
 * Source of truth: mm_bot.py (thetanuts_rfq/scripts/mm_bot.py:789-794)
 * These values MUST match the production mm_bot.py implementation.
 */
export const COLLATERAL_APR: Record<string, number> = {
  BTC: 0.01, // 1% - matches mm_bot.py
  ETH: 0.04, // 4% - matches mm_bot.py
  USD: 0.07, // 7% - matches mm_bot.py
};

/** Default rate for unknown collateral types (e.g., DOGE, XRP) */
export const DEFAULT_CARRY_RATE = 0.05;

/** Fee multiplier buffer applied to MM prices (matches v4-webapp: 3% markup) */
export const FEE_MULTIPLIER = 1.03;

export type CollateralAsset = 'BTC' | 'ETH' | 'USD';

/**
 * Raw pricing data from the /all API endpoint
 */
export interface RawOptionPricing {
  /** Bid price (in underlying terms, e.g., 0.0002 ETH) */
  bid_price: number;
  /** Ask price (in underlying terms) */
  ask_price: number;
  /** Mark/mid price */
  mark_price: number;
  /** Current underlying asset price in USD */
  underlying_price: number;
  /** Strike price in USD */
  strike: number;
  /** Whether the option passes tolerance check */
  passesToleranceCheck: boolean;
}

/**
 * API response from /all endpoint
 */
export interface MMAllPricingResponse {
  data: {
    ETH: Record<string, RawOptionPricing>;
    BTC: Record<string, RawOptionPricing>;
  };
  metadata: {
    last_fetched: number;
    cache_ttl: number;
    cache_expires_in: number;
    endpoint: string;
    is_stale: boolean;
    in_cooldown: boolean;
    manually_loaded: boolean;
  };
}

/**
 * Parsed ticker information
 */
export interface ParsedTicker {
  /** Underlying asset (ETH, BTC) */
  underlying: string;
  /** Expiry timestamp (Unix seconds) */
  expiry: number;
  /** Strike price in USD */
  strike: number;
  /** True for call, false for put */
  isCall: boolean;
  /** Original ticker string */
  ticker: string;
}

/** MM pricing for a specific collateral type */
export interface MMCollateralPricing {
  /** Collateral asset (e.g., 'ETH', 'USD') */
  collateralAsset: string;
  /** Collateral amount per contract */
  collateralAmount: number;
  /** Collateral cost per unit of underlying */
  collateralCostPerUnit: number;
  /** MM bid price (fee-adjusted - collateral cost) */
  mmBidPrice: number;
  /** MM ask price (fee-adjusted + collateral cost) */
  mmAskPrice: number;
  /** Whitelisted MM bid price */
  mmWlBidPrice: number;
  /** Whitelisted MM ask price */
  mmWlAskPrice: number;
  /** Buffered MM bid price (÷ FEE_MULTIPLIER) */
  mmBidPriceBuffered: number;
  /** Buffered MM ask price (× FEE_MULTIPLIER) */
  mmAskPriceBuffered: number;
  /** Buffered whitelisted MM bid price */
  mmWlBidPriceBuffered: number;
  /** Buffered whitelisted MM ask price */
  mmWlAskPriceBuffered: number;
}

/**
 * MM-adjusted pricing for a vanilla option with fee adjustment applied.
 * Includes pricing for all collateral types (native + USD).
 */
export interface MMVanillaPricing {
  /** Original ticker string, e.g., "ETH-16FEB26-1800-P" */
  ticker: string;
  /** Original bid price from exchange */
  rawBidPrice: number;
  /** Original ask price from exchange */
  rawAskPrice: number;
  /** Fee-adjusted bid price (before collateral cost) */
  feeAdjustedBid: number;
  /** Fee-adjusted ask price (before collateral cost) */
  feeAdjustedAsk: number;
  /** Mark/mid price */
  markPrice: number;
  /** Current underlying asset price in USD */
  underlyingPrice: number;
  /** Strike price in USD */
  strike: number;
  /** Expiry timestamp (Unix seconds) */
  expiry: number;
  /** True for call, false for put */
  isCall: boolean;
  /** Underlying asset (ETH, BTC) */
  underlying: string;
  /** Whether the option passes tolerance check */
  passesToleranceCheck: boolean;
  /** Time to expiry in years */
  timeToExpiryYears: number;
  /** Fee multiplier used for buffered prices */
  feeMultiplier: number;
  /** Pricing by collateral type (native asset + USD) */
  byCollateral: Record<string, MMCollateralPricing>;
}

/**
 * Position pricing request parameters
 */
export interface PositionPricingParams {
  /** Option ticker, e.g., "ETH-16FEB26-1800-P" */
  ticker: string;
  /** Whether user is requesting long position */
  isLong: boolean;
  /** Number of contracts (raw count, e.g., 6 for 6 contracts) */
  numContracts: number;
  /** Collateral token symbol (affects APR used) */
  collateralToken: 'USDC' | 'WETH' | 'cbBTC';
}

/**
 * Position-aware pricing for RFQ that includes collateral cost.
 * This is the full pricing that a market maker would quote.
 */
export interface MMPositionPricing extends MMVanillaPricing {
  /** Whether user is requesting long position */
  isLong: boolean;
  /** Number of contracts (raw count) */
  numContracts: number;
  /** Collateral required (in collateral token decimals) */
  collateralRequired: bigint;
  /** Cost of locking collateral (in collateral token decimals) */
  collateralCost: bigint;
  /** Base premium without collateral cost (in collateral token decimals) */
  basePremium: bigint;
  /** Final price including collateral cost (in collateral token decimals) */
  totalPrice: bigint;
  /** Time to expiry in years */
  timeToExpiryYears: number;
  /** Collateral token used */
  collateralToken: string;
}

/**
 * Spread pricing parameters
 */
export interface SpreadPricingParams {
  /** Underlying asset (ETH, BTC) */
  underlying: string;
  /** Two strikes [near, far] in 8 decimals */
  strikes: [bigint, bigint];
  /** Expiry timestamp (Unix seconds) */
  expiry: number;
  /** True for call spread, false for put spread */
  isCall: boolean;
  /** Number of contracts (18 decimals) - optional */
  numContracts?: bigint;
}

/**
 * MM pricing for a two-leg spread
 */
export interface MMSpreadPricing {
  /** Near leg pricing */
  nearLeg: MMVanillaPricing;
  /** Far leg pricing */
  farLeg: MMVanillaPricing;
  /** Fee-adjusted spread price without collateral cost (in underlying terms) */
  netSpreadPrice: number;
  /** Spread-level collateral cost in USD (width * APR * time) */
  spreadCollateralCost: number;
  /** Spread width in USD (max loss per contract) */
  widthUsd: number;
  /** Combined MM bid price (netSpreadPrice - spreadCC in underlying terms) */
  netMmBidPrice: number;
  /** Combined MM ask price (netSpreadPrice + spreadCC in underlying terms) */
  netMmAskPrice: number;
  /** Maximum loss per contract (same as widthUsd) */
  maxLoss: number;
  /** Collateral required (6 decimals for USDC) */
  collateral: bigint;
  /** Spread type */
  type: 'call_spread' | 'put_spread';
}

/**
 * Condor pricing parameters
 */
export interface CondorPricingParams {
  /** Underlying asset (ETH, BTC) */
  underlying: string;
  /** Four strikes in ascending order (8 decimals) */
  strikes: [bigint, bigint, bigint, bigint];
  /** Expiry timestamp (Unix seconds) */
  expiry: number;
  /** Condor type */
  type: 'call' | 'put' | 'iron';
  /** Number of contracts (18 decimals) - optional */
  numContracts?: bigint;
}

/**
 * MM pricing for a four-leg condor
 */
export interface MMCondorPricing {
  /** All four legs */
  legs: [MMVanillaPricing, MMVanillaPricing, MMVanillaPricing, MMVanillaPricing];
  /** Fee-adjusted condor price without collateral cost (in underlying terms) */
  netCondorPrice: number;
  /** Spread-level collateral cost in USD (width * APR * time) */
  spreadCollateralCost: number;
  /** Combined MM bid price (netCondorPrice - spreadCC in underlying terms) */
  netMmBidPrice: number;
  /** Combined MM ask price (netCondorPrice + spreadCC in underlying terms) */
  netMmAskPrice: number;
  /** Spread width (difference between adjacent strikes) in USD */
  spreadWidth: number;
  /** Collateral required (6 decimals for USDC) */
  collateral: bigint;
  /** Condor type */
  type: 'call_condor' | 'put_condor' | 'iron_condor';
}

/**
 * Butterfly pricing parameters
 */
export interface ButterflyPricingParams {
  /** Underlying asset (ETH, BTC) */
  underlying: string;
  /** Three strikes [lower, middle, upper] in 8 decimals */
  strikes: [bigint, bigint, bigint];
  /** Expiry timestamp (Unix seconds) */
  expiry: number;
  /** True for call butterfly, false for put butterfly */
  isCall: boolean;
  /** Number of contracts (18 decimals) - optional */
  numContracts?: bigint;
}

/**
 * MM pricing for a three-leg butterfly
 */
export interface MMButterflyPricing {
  /** All three legs */
  legs: [MMVanillaPricing, MMVanillaPricing, MMVanillaPricing];
  /** Fee-adjusted butterfly price without collateral cost (in underlying terms) */
  netButterflyPrice: number;
  /** Spread-level collateral cost in USD (width * APR * time) */
  spreadCollateralCost: number;
  /** Combined MM bid price (netButterflyPrice - spreadCC in underlying terms) */
  netMmBidPrice: number;
  /** Combined MM ask price (netButterflyPrice + spreadCC in underlying terms) */
  netMmAskPrice: number;
  /** Wing width (distance from middle to outer strikes) in USD */
  width: number;
  /** Collateral required (6 decimals for USDC) */
  collateral: bigint;
  /** Butterfly type */
  type: 'call_butterfly' | 'put_butterfly';
}
