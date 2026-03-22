import type { TransactionReceipt, TransactionResponse } from 'ethers';

/**
 * Contract Order structure for OptionBook contract (v2)
 * This matches the on-chain struct exactly
 */
export interface ContractOrder {
  /** Maker address */
  maker: string;
  /** Order expiry timestamp (when the order itself expires, not the option) */
  orderExpiryTimestamp: bigint;
  /** Collateral token address (USDC, WETH, etc.) */
  collateral: string;
  /** Whether this is a call option (true) or put option (false) */
  isCall: boolean;
  /** Price feed address for the underlying asset */
  priceFeed: string;
  /** Implementation address (determines product type: spread, butterfly, condor) */
  implementation: string;
  /** Whether maker is long (true = maker sells to taker, false = maker buys from taker) */
  isLong: boolean;
  /** Maximum collateral that can be used for this order */
  maxCollateralUsable: bigint;
  /** Strike prices array (8 decimals) */
  strikes: bigint[];
  /** Option expiry timestamp */
  expiry: bigint;
  /** Price per contract (8 decimals) */
  price: bigint;
  /** Number of contracts to fill (6 decimals for USDC collateral) */
  numContracts: bigint;
  /** Extra option data (usually "0x") */
  extraOptionData: string;
}

/**
 * Order structure used in SDK (simplified view)
 * Contains the essential fields for display and basic operations
 */
export interface Order {
  /** Maker address */
  maker: string;
  /** Taker address (zero address for any taker) */
  taker: string;
  /** Option contract address (empty before fill, populated after) */
  option: string;
  /** Whether maker is buyer (true) or seller (false) from taker's perspective */
  isBuyer: boolean;
  /** Number of contracts */
  numContracts: bigint;
  /** Price per contract in collateral token units (8 decimals) */
  price: bigint;
  /** Option expiry timestamp */
  expiry: bigint;
  /** Order nonce for identification */
  nonce: bigint;
  /** Option type (0 = call, 1 = put) */
  optionType?: number;
  /**
   * All strike prices in 8 decimals.
   * Array length indicates product type:
   * - 1 strike: vanilla (put/call)
   * - 2 strikes: spread
   * - 3 strikes: butterfly
   * - 4 strikes: condor/iron condor/ranger
   */
  strikes?: bigint[];
  /**
   * @deprecated Use `strikes[0]` instead. This field only contains the first strike.
   * Strike price in 8 decimals
   */
  strikePrice?: bigint;
  /** Collateral token address */
  collateralToken?: string;
  /** Underlying token address */
  underlyingToken?: string;
  /** Order deadline timestamp */
  deadline?: bigint;
}

/**
 * Swap parameters for swapAndFillOrder
 */
export interface SwapParams {
  /** Token to swap from */
  tokenIn: string;
  /** Amount of tokenIn to swap */
  amountIn: bigint;
  /** Minimum amount of collateral to receive */
  minAmountOut: bigint;
  /** Swap router address */
  router: string;
  /** Encoded swap data */
  swapData: string;
}

/**
 * Fee information for a token/referrer pair
 */
export interface FeeInfo {
  /** Protocol fee in basis points */
  protocolFeeBps: bigint;
  /** Referrer fee in basis points */
  referrerFeeBps: bigint;
  /** Total fee in basis points */
  totalFeeBps: bigint;
  /** Accrued fees for the referrer */
  accruedFees: bigint;
}

/**
 * Quote information from the API
 */
export interface Quote {
  /** Quote ID */
  id: string;
  /** Order data */
  order: Order;
  /** Order signature */
  signature: string;
  /** Maker's quote price */
  quotePrice: bigint;
  /** Quote expiry */
  expiresAt: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of fillOrder transaction
 */
export interface FillOrderResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Option contract address created */
  optionAddress: string;
  /** Number of contracts filled */
  numContractsFilled: bigint;
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Result of swapAndFillOrder transaction
 */
export interface SwapAndFillOrderResult extends FillOrderResult {
  /** Swap parameters used */
  swapParams: SwapParams;
  /** Amount of tokenIn swapped */
  amountSwapped: bigint;
}

/**
 * Result of cancelOrder transaction
 */
export interface CancelOrderResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Cancelled order */
  order: Order;
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Generic transaction result
 */
export interface TransactionResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Encoded transaction data for external wallet use
 */
export interface EncodedTransaction {
  /** Contract address to send the transaction to */
  to: string;
  /** Encoded calldata */
  data: string;
}

/**
 * EIP-712 domain information
 */
export interface Eip712Domain {
  /** EIP-712 fields bitmask */
  fields: string;
  /** Domain name */
  name: string;
  /** Domain version */
  version: string;
  /** Chain ID */
  chainId: bigint;
  /** Verifying contract address */
  verifyingContract: string;
  /** Domain salt */
  salt: string;
  /** Domain extensions */
  extensions: bigint[];
}
