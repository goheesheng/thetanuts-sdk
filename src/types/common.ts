/**
 * Common type definitions shared across modules
 */

/**
 * Option type (call or put)
 */
export type OptionType = 'call' | 'put';

/**
 * Product type based on number of strikes
 */
export type ProductType = 'spread' | 'butterfly' | 'condor';

/**
 * Option structure types supported by Thetanuts V4
 */
export type OptionStructure =
  | 'call'
  | 'put'
  | 'call_spread'
  | 'put_spread'
  | 'butterfly'
  | 'iron_condor'
  | 'straddle'
  | 'strangle';

/**
 * Side of an order or position
 */
export type OrderSide = 'buy' | 'sell';

/**
 * Order status
 */
export type OrderStatus = 'open' | 'filled' | 'partially_filled' | 'cancelled' | 'expired';

/**
 * Position status
 */
export type PositionStatus = 'open' | 'closed' | 'expired' | 'exercised';

/**
 * Underlying asset identifier
 */
export type UnderlyingAsset = string;

/**
 * Collateral token identifier
 */
export type CollateralToken = string;
