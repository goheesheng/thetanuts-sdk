/**
 * Order fill event from OptionBook
 */
export interface OrderFillEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Maker address */
  maker: string;
  /** Taker address */
  taker: string;
  /** Option contract address */
  option: string;
  /** Number of contracts filled */
  numContracts: bigint;
  /** Price per contract */
  price: bigint;
  /** Referrer address (if any) */
  referrer: string;
}

/**
 * Order cancelled event from OptionBook
 */
export interface OrderCancelledEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Maker address */
  maker: string;
  /** Order nonce */
  nonce: bigint;
}

/**
 * Option created event from OptionFactory
 */
export interface OptionCreatedEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Option contract address */
  optionAddress: string;
  /** Underlying asset address */
  underlyingAsset: string;
  /** Collateral token address */
  collateralToken: string;
  /** Option type */
  optionType: number;
  /** Strike prices */
  strikes: bigint[];
  /** Expiry timestamp */
  expiry: bigint;
}

/**
 * Quotation requested event from OptionFactory
 */
export interface QuotationRequestedEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Quotation ID */
  quotationId: bigint;
  /** Requester address */
  requester: string;
}

/**
 * Offer made event from OptionFactory
 */
export interface OfferMadeEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Quotation ID */
  quotationId: bigint;
  /** Offeror address */
  offeror: string;
}

/**
 * Offer revealed event from OptionFactory
 */
export interface OfferRevealedEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Quotation ID */
  quotationId: bigint;
  /** Offeror address */
  offeror: string;
  /** Offer amount */
  offerAmount: bigint;
}

/**
 * Quotation settled event from OptionFactory
 */
export interface QuotationSettledEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Quotation ID */
  quotationId: bigint;
  /** Winning offeror address */
  winningOfferor: string;
  /** Created option address */
  optionAddress: string;
}

/**
 * Position closed event from Option contract
 */
export interface PositionClosedEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Account address */
  account: string;
  /** Payout amount */
  payout: bigint;
}

/**
 * Position transferred event from Option contract
 */
export interface PositionTransferredEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** From address */
  from: string;
  /** To address */
  to: string;
  /** Whether buyer position */
  isBuyer: boolean;
  /** Amount transferred */
  amount: bigint;
}

/**
 * Event query filters
 */
export interface EventFilters {
  /** Start block number */
  fromBlock?: number;
  /** End block number */
  toBlock?: number;
  /** Filter by address(es) */
  addresses?: string[];
}

/**
 * Quotation cancelled event from OptionFactory
 */
export interface QuotationCancelledEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
  /** Quotation ID */
  quotationId: bigint;
  /** Canceller address */
  canceller: string;
}

/**
 * Complete RFQ history for a quotation
 */
export interface RfqHistory {
  /** Quotation ID */
  quotationId: bigint;
  /** Quotation requested event */
  requested: QuotationRequestedEvent | null;
  /** All offers made */
  offersMade: OfferMadeEvent[];
  /** All offers revealed */
  offersRevealed: OfferRevealedEvent[];
  /** Settlement event (if settled) */
  settled: QuotationSettledEvent | null;
  /** Cancellation event (if cancelled) */
  cancelled: QuotationCancelledEvent | null;
}

/**
 * Event types supported by queryEvents
 */
export type EventType =
  | 'OrderFilled'
  | 'OrderCancelled'
  | 'OptionCreated'
  | 'QuotationRequested'
  | 'OfferMade'
  | 'OfferRevealed'
  | 'QuotationSettled'
  | 'QuotationCancelled';

/**
 * Generic event query parameters
 */
export interface EventQueryParams {
  /** Start block number */
  fromBlock?: number;
  /** End block number */
  toBlock?: number;
  /** Event type to query */
  eventType: EventType;
}

/**
 * Base event interface
 */
export interface BaseEvent {
  /** Block number */
  blockNumber: number;
  /** Transaction hash */
  transactionHash: string;
  /** Log index */
  logIndex: number;
}

// ============================================================
// BaseOption Events
// ============================================================

/**
 * ExcessCollateralReturned event from BaseOption contract.
 * Emitted when excess collateral is returned to the seller. r12 renamed
 * the prior `CollateralReturned` event to `ExcessCollateralReturned`
 * and reshaped the fields: there is no `optionAddress` field on the
 * event itself (use `BaseEvent.address` from the filter context if you
 * need it), and the value field is named `collateralReturned`.
 */
export interface ExcessCollateralReturnedEvent extends BaseEvent {
  /** Seller address */
  seller: string;
  /** Collateral token address */
  collateralToken: string;
  /** Amount of collateral returned */
  collateralReturned: bigint;
}

/**
 * OptionClosed event from BaseOption contract
 * Emitted when option is closed early
 */
export interface OptionClosedEvent extends BaseEvent {
  /** Option contract address */
  optionAddress: string;
  /** Address that closed the option */
  closedBy: string;
  /** Amount of collateral returned */
  collateralReturned: bigint;
}

/**
 * OptionExpired event from BaseOption contract
 * Emitted when option expires and settlement price is recorded
 */
export interface OptionExpiredEvent extends BaseEvent {
  /** Option contract address */
  optionAddress: string;
  /** Settlement price (8 decimals) */
  settlementPrice: bigint;
}

/**
 * OptionPayout event from BaseOption contract
 * Emitted when buyer receives payout after settlement
 */
export interface OptionPayoutEvent extends BaseEvent {
  /** Option contract address */
  optionAddress: string;
  /** Buyer address */
  buyer: string;
  /** Amount paid out */
  amountPaidOut: bigint;
}

/**
 * OptionSettlementFailed event from BaseOption contract.
 * Emitted when settlement fails (e.g., oracle issue). r12 emits no inputs
 * on the event itself; the SDK populates `optionAddress` from the filter
 * context for caller convenience.
 */
export interface OptionSettlementFailedEvent extends BaseEvent {
  /** Option contract address (from filter context, not the event itself) */
  optionAddress: string;
}

/**
 * OptionSplit event from BaseOption contract.
 * Emitted when an option position is split. r12 shape adds feePaid and
 * counterparty (indexed) fields.
 */
export interface OptionSplitEvent extends BaseEvent {
  /** Original option address (from filter context) */
  originalOption: string;
  /** New option contract address */
  newOption: string;
  /** Collateral amount split off */
  collateralAmount: bigint;
  /** Split fee paid (in chain native units, msg.value forwarded) */
  feePaid: bigint;
  /** Counterparty address (indexed) */
  counterparty: string;
}

/**
 * RoleTransferred event from BaseOption contract
 * Emitted when buyer or seller position is transferred
 */
export interface RoleTransferredEvent extends BaseEvent {
  /** Option contract address */
  optionAddress: string;
  /** From address */
  from: string;
  /** To address */
  to: string;
  /** Whether buyer position was transferred */
  isBuyer: boolean;
}

/**
 * TransferApproval event from BaseOption contract
 * Emitted when transfer approval is granted or revoked
 */
export interface TransferApprovalEvent extends BaseEvent {
  /** Target address */
  target: string;
  /** From address */
  from: string;
  /** Whether buyer transfer */
  isBuyer: boolean;
  /** Whether approved */
  isApproved: boolean;
}

/**
 * ERC20Rescued event from BaseOption contract
 * Emitted when stuck tokens are rescued
 */
export interface ERC20RescuedEvent extends BaseEvent {
  /** Rescue address */
  rescueAddress: string;
  /** Token address */
  tokenAddress: string;
  /** Amount rescued */
  amount: bigint;
}
