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
  /** Option lifecycle status */
  optionStatus?: OptionStatusType;
  /** Structured PnL entries for this user */
  pnlEntries?: PositionPnL[];
  /** PnL in USD (8 decimals) */
  pnlUsd?: string | null;
  /** PnL percentage */
  pnlPct?: string | null;
  /** Implementation name (e.g. PUT, INVERSE_CALL) */
  implementationName?: string;
  /** Implementation type */
  implementationType?: string;
  /** Book address (for book positions) */
  bookAddress?: string;
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

// ============================================================
// Token Amounts & Time Window Stats (shared by protocol stats + referrer summary)
// ============================================================

/**
 * Token amounts keyed by symbol (e.g. { "USDC": "3637.61", "WETH": "134021.97" })
 */
export type TokenAmounts = Record<string, string>;

/**
 * Stats for a time window (24h, 7d, 30d)
 */
export interface TimeWindowStats {
  /** Number of positions in this window */
  positions: number;
  /** Number of settled positions in this window */
  settled?: number;
  /** Volume by token */
  volume: TokenAmounts;
  /** Premium by token */
  premium: TokenAmounts;
  /** Fees by token */
  fees: TokenAmounts;
  /** Referral fees by token */
  referralFees?: TokenAmounts;
  /** Total volume in USD */
  volumeUsd: string;
  /** Total premium in USD */
  premiumUsd: string;
  /** Total fees in USD */
  feesUsd: string;
}

/**
 * Stats breakdown for an implementation type (e.g. INVERSE_CALL, PUT, PUT_SPREAD)
 */
export interface ImplementationTypeStats {
  /** Total positions */
  count: number;
  /** Settled positions */
  settled: number;
  /** Active positions */
  active: number;
  /** Number of buyer wins */
  buyerWins: number;
  /** Contract addresses */
  implementations: string[];
  /** Volume by token */
  volume: TokenAmounts;
  /** Premium by token */
  premium: TokenAmounts;
  /** Total volume in USD */
  volumeUsd: string;
  /** Total premium in USD */
  premiumUsd: string;
  /** 24h window */
  '24h': { positions: number; volume: TokenAmounts; premium: TokenAmounts; volumeUsd: string; premiumUsd: string };
  /** 7d window */
  '7d': { positions: number; volume: TokenAmounts; premium: TokenAmounts; volumeUsd: string; premiumUsd: string };
  /** 30d window */
  '30d': { positions: number; volume: TokenAmounts; premium: TokenAmounts; volumeUsd: string; premiumUsd: string };
  /** Buyer win rate percentage */
  buyerWinRate: string;
}

// ============================================================
// Referrer Summary (new field from unified indexer)
// ============================================================

/**
 * Rich summary statistics for a referrer from the unified indexer.
 * Includes volume, premium, fees broken down by token and USD,
 * time windows (24h/7d/30d), and per-implementation-type breakdowns.
 */
export interface ReferrerSummary {
  /** Total referred positions */
  totalPositions: number;
  /** Total settled positions */
  totalSettled: number;
  /** Total active positions */
  totalActive: number;
  /** Number of unique referred users */
  uniqueUsers: number;
  /** Timestamp of first referred trade */
  firstTradeTimestamp: number;
  /** Timestamp of most recent referred trade */
  lastTradeTimestamp: number;
  /** Total volume by token */
  totalVolume: TokenAmounts;
  /** Total premium by token */
  totalPremium: TokenAmounts;
  /** Total fees by token */
  totalFees: TokenAmounts;
  /** Total referral fees by token */
  totalReferralFees: TokenAmounts;
  /** Total volume in USD */
  totalVolumeUsd: string;
  /** Total premium in USD */
  totalPremiumUsd: string;
  /** Total fees in USD */
  totalFeesUsd: string;
  /** 24-hour window stats */
  '24h': TimeWindowStats;
  /** 7-day window stats */
  '7d': TimeWindowStats;
  /** 30-day window stats */
  '30d': TimeWindowStats;
  /** Breakdown by implementation type */
  byImplementationType: Record<string, ImplementationTypeStats>;
  /** Overall exercise rate percentage */
  exerciseRate: string;
  /** Average premium ratio percentage */
  avgPremiumRatio: string;
  /** New unique users by time window */
  uniqueUsersNew: { '24h': number; '7d': number; '30d': number };
}

/**
 * Referrer statistics from indexer API
 *
 * Contains positions referred by an address with full position data,
 * and a summary with volume/premium/fees breakdowns.
 *
 * The new unified indexer returns rich position objects (30+ fields with
 * settlement and PnL data) and a summary field. Clients can derive
 * per-user daily metrics and top trades from the position data.
 */
export interface ReferrerStats {
  /** Referrer address */
  referrer: string;
  /** Positions referred by this referrer, indexed by option address */
  positions: Record<string, Record<string, unknown>>;
  /** Rich summary stats from unified indexer (volume, premium, fees, time windows, impl breakdown) */
  summary?: ReferrerSummary;
  /** Last update timestamp (unix seconds) */
  lastUpdateTimestamp: number;
  /** @deprecated Not populated by new indexer. Derive from positions data instead. */
  userDailyMetrics?: Record<string, unknown>;
  /** @deprecated Not populated by new indexer. Derive from positions PnL data instead. */
  topProfitableTrades?: Array<Record<string, unknown>>;
}

/**
 * Factory-side protocol stats snapshot included in a FactoryReferrerStats response.
 *
 * These are factory-wide totals at the time of the response, not scoped to the
 * referrer. Uses the raw field names returned by the indexer.
 */
export interface FactoryReferrerProtocolStats {
  /** Total RFQs indexed */
  totalRFQs: number;
  /** Total offers indexed */
  totalOffers: number;
  /** Total options indexed */
  totalOptions: number;
  /** Total volume by token */
  totalVolume: TokenAmounts;
  /** Total premium by token */
  totalPremium: TokenAmounts;
  /** Total fees by token */
  totalFees: TokenAmounts;
  /** Total referral fees (USD-denominated string) */
  totalReferralFees: string;
}

/**
 * Referrer statistics scoped to the factory/RFQ side of the indexer.
 *
 * Returned by GET /api/v1/factory/referrer/:address/state.
 *
 * Unlike the book `ReferrerStats`, this is RFQ-centric: it contains the
 * full set of RFQs this referrer was credited on, the referral IDs used,
 * and a factory protocol stats snapshot.
 */
export interface FactoryReferrerStats {
  /** Referrer address */
  referrer: string;
  /** On-chain referral IDs associated with this referrer */
  referralIds: number[];
  /** RFQs referred by this address, keyed by RFQ id */
  rfqs: Record<string, StateRfq>;
  /** Factory protocol stats snapshot */
  protocolStats: FactoryReferrerProtocolStats;
  /** Last update timestamp (unix seconds) */
  lastUpdateTimestamp: number;
}

// ============================================================
// Protocol Stats (new unified indexer endpoints)
// ============================================================

/**
 * Detailed protocol statistics with time windows and implementation breakdowns.
 * Shared shape for book, factory, and combined protocol stats.
 */
export interface ProtocolStatsDetail {
  /** Total positions */
  totalPositions: number;
  /** Total settled positions (book/combined only) */
  totalSettled?: number;
  /** Total active positions (book/combined only) */
  totalActive?: number;
  /** Number of unique users */
  uniqueUsers: number;
  /** Timestamp of first trade */
  firstTradeTimestamp: number;
  /** Timestamp of most recent trade */
  lastTradeTimestamp: number;
  /** Total volume by token */
  totalVolume: TokenAmounts;
  /** Total premium by token */
  totalPremium: TokenAmounts;
  /** Total fees by token */
  totalFees: TokenAmounts;
  /** Total referral fees by token */
  totalReferralFees?: TokenAmounts;
  /** Total volume in USD */
  totalVolumeUsd: string;
  /** Total premium in USD */
  totalPremiumUsd: string;
  /** Total fees in USD */
  totalFeesUsd: string;
  /** 24-hour window stats */
  '24h': TimeWindowStats;
  /** 7-day window stats */
  '7d': TimeWindowStats;
  /** 30-day window stats */
  '30d': TimeWindowStats;
  /** Breakdown by implementation type */
  byImplementationType?: Record<string, ImplementationTypeStats>;
  /** Overall exercise rate percentage */
  exerciseRate?: string;
  /** Average premium ratio percentage */
  avgPremiumRatio?: string;
  /** Average time to fill in seconds (factory only) */
  avgTimeToFill?: number;
  /** Average offers per RFQ (factory only) */
  avgOffersPerRfq?: number;
  /** Total offers (factory only) */
  totalOffers?: number;
  /** New unique users by time window */
  uniqueUsersNew?: { '24h': number; '7d': number; '30d': number };
}

/**
 * Protocol stats response from unified indexer.
 * Returned by /api/v1/book/stats/protocol, /api/v1/factory/stats/protocol, /api/v1/stats/protocol
 */
export interface ProtocolStatsResponse {
  /** Chain ID */
  chainId: number;
  /** Indexed book addresses (book stats only) */
  indexedBookAddresses?: string[];
  /** Indexed factory addresses (factory stats only) */
  indexedFactoryAddresses?: string[];
  /** Protocol statistics */
  stats: ProtocolStatsDetail;
  /** Last update timestamp */
  lastUpdateTimestamp?: number;
}

// ============================================================
// Daily Stats (new unified indexer endpoints)
// ============================================================

/**
 * A single day's trading statistics
 */
export interface DailyStatsEntry {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Number of trades */
  trades: number;
  /** Volume by token */
  volume: TokenAmounts;
  /** Premium by token */
  premium: TokenAmounts;
  /** Fees by token */
  fees: TokenAmounts;
  /** Total volume in USD */
  volumeUsd: string;
  /** Total premium in USD */
  premiumUsd: string;
  /** Total fees in USD */
  feesUsd: string;
}

/**
 * Daily stats response from unified indexer.
 * Returned by /api/v1/book/stats/daily, /api/v1/factory/stats/daily, /api/v1/stats/daily
 */
export interface DailyStatsResponse {
  /** Array of daily entries */
  daily: DailyStatsEntry[];
  /** Last update timestamp */
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

