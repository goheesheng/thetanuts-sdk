import type { TransactionReceipt, TransactionResponse } from 'ethers';

/**
 * Option contract info
 */
export interface OptionInfo {
  /** Option contract address */
  address: string;
  /** Option type (0=call, 1=put, etc.) */
  optionType: number;
  /** Strike prices */
  strikes: bigint[];
  /** Expiry timestamp */
  expiry: bigint;
  /** Collateral token address */
  collateralToken: string;
  /** Underlying token address */
  underlyingToken: string;
}

/**
 * Position info for an account
 */
export interface PositionInfo {
  /** Buyer position size */
  buyerPosition: bigint;
  /** Seller position size */
  sellerPosition: bigint;
}

/**
 * Result of close position transaction
 */
export interface ClosePositionResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Option contract address */
  optionAddress: string;
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Result of transfer position transaction
 */
export interface TransferPositionResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Option contract address */
  optionAddress: string;
  /** Recipient address */
  to: string;
  /** Whether buyer position was transferred */
  isBuyer: boolean;
  /** Amount transferred */
  amount: bigint;
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Result of split position transaction
 */
export interface SplitPositionResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Option contract address */
  optionAddress: string;
  /** Split amounts */
  amounts: bigint[];
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Payout calculation result
 */
export interface PayoutCalculation {
  /** Calculated payout amount */
  payout: bigint;
  /** Settlement price used */
  settlementPrice: bigint;
  /** Option address */
  optionAddress: string;
}

/**
 * Result of payout transaction
 */
export interface PayoutResult {
  /** Transaction hash */
  txHash: string;
  /** Transaction response */
  tx: TransactionResponse;
  /** Wait for confirmation */
  wait(confirmations?: number): Promise<TransactionReceipt>;
}

/**
 * Unpacked option type information
 */
export interface UnpackedOptionType {
  /** True if collateral is quote currency (e.g., USDC) */
  isQuoteCollateral: boolean;
  /** True if physically settled, false if cash settled */
  isPhysicallySettled: boolean;
  /** Option style: 0=European, 1=American */
  optionStyle: number;
  /** Option structure: 0=Vanilla, 1=Spread, 2=Butterfly, 3=Condor */
  optionStructure: number;
}

/**
 * Complete option information aggregated from multiple contract calls.
 * Useful for displaying all option details without making 6+ separate calls.
 */
export interface FullOptionInfo {
  /** Basic option info (optionType, strikes, expiry, collateralToken) */
  info: OptionInfo;
  /** Current buyer address */
  buyer: string;
  /** Current seller address */
  seller: string;
  /** Whether the option has expired */
  isExpired: boolean;
  /** Whether the option has been settled */
  isSettled: boolean;
  /** Number of contracts */
  numContracts: bigint;
  /** Collateral amount locked */
  collateralAmount: bigint;
}

/**
 * Option initialization parameters
 */
export interface OptionParams {
  /** Collateral token address */
  collateralToken: string;
  /** Chainlink price feed address */
  chainlinkPriceFeed: string;
  /** Historical TWAP consumer address */
  historicalTWAPConsumer: string;
  /** Buyer address */
  buyer: string;
  /** Seller address */
  seller: string;
  /** Strike prices (8 decimals) */
  strikes: bigint[];
  /** Expiry timestamp */
  expiryTimestamp: bigint;
  /** TWAP period in seconds */
  twapPeriod: bigint;
  /** Number of contracts */
  numContracts: bigint;
  /** Collateral amount */
  collateralAmount: bigint;
  /** Emergency rescue address */
  rescueAddress: string;
  /** Factory address */
  factoryAddress: string;
  /** Extra option data (packed) */
  extraOptionData: string;
}
