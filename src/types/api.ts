import type { Order } from './optionBook.js';
import type { StateRfq } from './stateApi.js';

/**
 * Raw order data from Odette API for filtering
 */
export interface OdetteRawOrderData {
  /** Collateral token address */
  collateral: string;
  /** Price feed address (BTC or ETH) */
  priceFeed: string;
  /** Implementation address (determines product type) */
  implementation: string;
  /** Strike prices (8 decimals) */
  strikes: string[];
  /** Is call option */
  isCall: boolean;
  /** Is long position (maker is selling) */
  isLong: boolean;
  /** Order expiry timestamp */
  orderExpiryTimestamp: number;
  /** Extra option data */
  extraOptionData: string;
  /** Max collateral usable */
  maxCollateralUsable: string;
  /** OptionBook contract address the order was signed for */
  optionBookAddress?: string;
  /** Option greeks from pricing API */
  greeks?: {
    delta: number;
    iv: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

/**
 * Order with signature for API responses
 */
export interface OrderWithSignature {
  /** Order data */
  order: Order;
  /** Maker's signature */
  signature: string;
  /** Available amount to fill */
  availableAmount: bigint;
  /** Maker address (convenience) */
  makerAddress: string;
  /** Raw data from Odette API for filtering */
  rawApiData?: OdetteRawOrderData;
}

/**
 * Filters for orders
 */
export interface OrderFilters {
  /** Filter by underlying asset */
  asset?: string;
  /** Filter by option type (call/put) */
  type?: 'call' | 'put';
  /** Filter by collateral token */
  collateral?: string;
  /** Filter by minimum expiry timestamp */
  minExpiry?: number;
  /** Filter by maximum expiry timestamp */
  maxExpiry?: number;
}

/**
 * Settlement details for a closed/settled position
 */
export interface PositionSettlement {
  /** Settlement price from oracle */
  settlementPrice: bigint;
  /** Payout to buyer */
  payoutBuyer: bigint;
  /** Collateral returned to seller */
  collateralReturnedSeller: bigint;
  /** Whether the option was exercised */
  exercised: boolean;
  /** Delivery amount */
  deliveryAmount: bigint;
  /** Delivery collateral */
  deliveryCollateral: bigint;
  /** Whether settlement was an explicit decision */
  explicitDecision: boolean;
  /** Whether oracle failed */
  oracleFailure: boolean;
  /** Reason for oracle failure */
  oracleFailureReason: string;
}

/**
 * User position from API
 */
export interface Position {
  /** Position ID */
  id: string;
  /** Option contract address */
  optionAddress: string;
  /** Position side (buyer/seller) */
  side: 'buyer' | 'seller';
  /** Number of contracts */
  amount: bigint;
  /** Entry price */
  entryPrice: bigint;
  /** Current market value */
  currentValue: bigint;
  /** Unrealized PnL */
  pnl: bigint;
  /** Option details */
  option: {
    underlying: string;
    collateral: string;
    strikes: bigint[];
    expiry: number;
    optionType: number;
  };
  /** Position status */
  status: string;
  /** Buyer address */
  buyer: string;
  /** Seller address */
  seller: string;
  /** Referrer address */
  referrer: string;
  /** Created by address */
  createdBy: string;
  /** Entry timestamp */
  entryTimestamp: bigint;
  /** Entry transaction hash */
  entryTxHash: string;
  /** Entry block number */
  entryBlock: bigint;
  /** Entry fee paid */
  entryFeePaid: bigint;
  /** Collateral amount */
  collateralAmount: bigint;
  /** Collateral token symbol */
  collateralSymbol: string;
  /** Collateral token decimals */
  collateralDecimals: number;
  /** Price feed address */
  priceFeed: string;
  /** Close timestamp */
  closeTimestamp: bigint;
  /** Close transaction hash */
  closeTxHash: string;
  /** Close block number */
  closeBlock: bigint;
  /** Raw option type number */
  optionTypeRaw: number;
  /** Whether position was explicitly closed */
  explicitClose: boolean;
  /** Settlement details (present when settled/closed) */
  settlement?: PositionSettlement;
}

/**
 * Trade history entry
 */
export interface TradeHistory {
  /** Trade ID */
  id: string;
  /** Timestamp */
  timestamp: number;
  /** Transaction hash */
  txHash: string;
  /** Trade type (fill/cancel/exercise/settle/close) */
  type: 'fill' | 'cancel' | 'exercise' | 'settle' | 'close';
  /** Amount traded */
  amount: bigint;
  /** Price per contract */
  price: bigint;
  /** Option details */
  option: {
    address: string;
    underlying: string;
    expiry: number;
  };
  /** Position status */
  status: string;
  /** Buyer address */
  buyer: string;
  /** Seller address */
  seller: string;
  /** Referrer address */
  referrer: string;
  /** Created by address */
  createdBy: string;
  /** Entry block number */
  entryBlock: bigint;
  /** Entry fee paid */
  entryFeePaid: bigint;
  /** Collateral amount */
  collateralAmount: bigint;
  /** Collateral token symbol */
  collateralSymbol: string;
  /** Collateral token decimals */
  collateralDecimals: number;
  /** Price feed address */
  priceFeed: string;
  /** Option type raw number */
  optionTypeRaw: number;
  /** Strikes array */
  strikes: bigint[];
  /** Whether position was explicitly closed */
  explicitClose: boolean;
  /** Close timestamp */
  closeTimestamp: bigint;
  /** Close transaction hash */
  closeTxHash: string;
  /** Close block number */
  closeBlock: bigint;
  /** Settlement details */
  settlement?: PositionSettlement;
}

/**
 * Position breakdown from indexer stats
 */
export interface PositionBreakdown {
  /** Total positions */
  total: number;
  /** Open positions */
  open: number;
  /** Settled positions */
  settled: number;
  /** Closed positions */
  closed: number;
  /** Pending initialization */
  pendingInit: number;
}

/**
 * Protocol statistics from indexer API
 */
export interface ProtocolStats {
  /** Total options tracked */
  totalOptionsTracked: number;
  /** Open positions count */
  openPositions: number;
  /** Settled positions count */
  settledPositions: number;
  /** Closed positions count */
  closedPositions: number;
  /** Unique users count */
  uniqueUsers: number;
  /** Last processed block number */
  lastProcessedBlock: number;
  /** Last update timestamp */
  lastUpdateTimestamp: number;
  /** Position breakdown */
  positions: PositionBreakdown;
}

/**
 * Market price information
 */
export interface MarketPrice {
  /** Current price in USD */
  price: bigint;
  /** 24-hour price change percentage */
  change24h: number;
  /** Last update timestamp */
  timestamp: number;
}

/**
 * Market prices for all assets
 */
export type MarketPrices = Record<string, MarketPrice>;

/**
 * Market data prices for all supported assets
 */
export interface MarketDataPrices {
  /** Ethereum price in USD */
  ETH: number;
  /** Bitcoin price in USD */
  BTC: number;
  /** Solana price in USD */
  SOL: number;
  /** XRP price in USD */
  XRP: number;
  /** BNB price in USD */
  BNB: number;
  /** Avalanche price in USD */
  AVAX: number;
  /** Additional assets (extensible) */
  [key: string]: number;
}

/**
 * Metadata from API response
 */
export interface MarketDataMetadata {
  /** Last updated timestamp (milliseconds) */
  lastUpdated: number;
  /** Current server time (milliseconds) */
  currentTime: number;
}

/**
 * Full market data response
 */
export interface MarketDataResponse {
  /** Asset prices */
  prices: MarketDataPrices;
  /** Response metadata */
  metadata: MarketDataMetadata;
}

/**
 * Referrer statistics from indexer API
 *
 * Contains aggregated data for positions referred by an address.
 */
export interface ReferrerStats {
  /** Referrer address */
  referrer: string;
  /** Positions referred by this referrer, indexed by option address */
  positions: Record<string, Record<string, unknown>>;
  /** User daily metrics */
  userDailyMetrics: Record<string, unknown>;
  /** Top profitable trades */
  topProfitableTrades: Array<Record<string, unknown>>;
  /** Last update timestamp (unix seconds) */
  lastUpdateTimestamp: number;
}

/**
 * Indexer health check response
 */
export interface IndexerHealth {
  /** Health status */
  status: 'ok' | 'unhealthy';
  /** Chain ID */
  chainId: number;
  /** Last indexed block number */
  lastIndexedBlock: number;
  /** Current head block on chain */
  headBlock: number;
  /** Block lag behind head */
  lagBlocks: number;
  /** Last heartbeat ping (unix seconds) */
  lastPing: number;
  /** Seconds since last ping (null if never pinged) */
  secondsSincePing: number | null;
  /** Current timestamp (unix seconds) */
  timestamp: number;
}

/**
 * Factory (RFQ) protocol statistics
 */
export interface FactoryStats {
  /** Total RFQs created */
  totalRfqs: number;
  /** Currently active RFQs */
  activeRfqs: number;
  /** Settled RFQs */
  settledRfqs: number;
  /** Cancelled RFQs */
  cancelledRfqs: number;
  /** Total offers made */
  totalOffers: number;
  /** Total options created (= settledRfqs) */
  totalOptions: number;
  /** Last processed block number */
  lastProcessedBlock: number;
  /** Last update timestamp (unix seconds) */
  lastUpdateTimestamp: number;
  /** Indexed factory contract addresses */
  indexedFactoryAddresses: string[];
}

// ============================================================
// PnL Types (Factory + Book options)
// ============================================================

export type OptionStatusType = 'active' | 'closed' | 'expired-awaiting-settlement' | 'settled-itm' | 'settled-otm';

export interface PositionPnL {
  side: 'buyer' | 'seller';
  entryRfqId: string;
  exitType: 'rfq' | 'settled-itm' | 'settled-otm' | 'active' | 'closed' | 'expired-awaiting-settlement';
  exitRfqId: string | null;
  /** Cash-settled fields (null for physical options) */
  cost: string | null;
  value: string | null;
  pnl: string | null;
  /** Physical-settled fields (null for cash options) */
  collateralToken: string | null;
  collateralCost: string | null;
  collateralValue: string | null;
  collateralPnl: string | null;
  deliveryToken: string | null;
  deliveryCost: string | null;
  deliveryValue: string | null;
  deliveryPnl: string | null;
  /** USD totals (always present when PnL is calculable) */
  costUsd: string | null;
  valueUsd: string | null;
  pnlUsd: string | null;
  pnlPct: string | null;
}

export interface FactoryOptionSettlement {
  settlementPrice: string | null;
  payoutBuyer: string | null;
  collateralReturnedSeller: string | null;
  exercised: boolean;
  deliveryAmount: string | null;
  deliveryCollateral: string | null;
}

export interface FactoryOptionDetail {
  optionAddress: string;
  rfqs: StateRfq[];
  optionEvents: unknown[];
  optionStatus: OptionStatusType;
  settlement: FactoryOptionSettlement | null;
  pnl: Record<string, PositionPnL[]>;
}

export interface BookOptionDetail {
  optionAddress: string;
  optionStatus: OptionStatusType;
  settlement: PositionSettlement | null;
  pnl: Record<string, PositionPnL[]> | null;
  [key: string]: unknown;
}

