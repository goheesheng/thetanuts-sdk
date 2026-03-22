/**
 * WebSocket connection states
 */
export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * WebSocket subscription types
 */
export type SubscriptionType = 'orders' | 'positions' | 'prices' | 'trades' | 'quotations';

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'update'
  | 'error'
  | 'ping'
  | 'pong';

/**
 * WebSocket subscription options
 */
export interface SubscriptionOptions {
  /** Subscription type */
  type: SubscriptionType;
  /** Filter by asset */
  asset?: string;
  /** Filter by address */
  address?: string;
  /** Additional filters */
  filters?: Record<string, string | number | boolean>;
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  /** Message type */
  type: WebSocketMessageType;
  /** Subscription type (for updates) */
  subscription?: SubscriptionType;
  /** Message data */
  data?: unknown;
  /** Error message (if type is error) */
  error?: string;
  /** Timestamp */
  timestamp?: number;
}

/**
 * Order update from WebSocket
 */
export interface OrderUpdate {
  /** Event type */
  event: 'new' | 'update' | 'fill' | 'cancel' | 'expire';
  /** Order ID */
  orderId: string;
  /** Order data */
  order?: {
    maker: string;
    option: string;
    numContracts: string;
    price: string;
    expiry: number;
  };
  /** Fill data (if event is 'fill') */
  fill?: {
    taker: string;
    amount: string;
    txHash: string;
  };
  /** Timestamp */
  timestamp: number;
}

/**
 * Price update from WebSocket
 */
export interface PriceUpdate {
  /** Asset symbol */
  asset: string;
  /** Current price */
  price: string;
  /** 24h change percentage */
  change24h: number;
  /** Timestamp */
  timestamp: number;
}

/**
 * Position update from WebSocket
 */
export interface PositionUpdate {
  /** Event type */
  event: 'open' | 'close' | 'update';
  /** Position ID */
  positionId: string;
  /** Option address */
  optionAddress: string;
  /** Owner address */
  owner: string;
  /** Position side */
  side: 'buyer' | 'seller';
  /** Position amount */
  amount: string;
  /** Current value */
  currentValue?: string;
  /** PnL */
  pnl?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Trade update from WebSocket
 */
export interface TradeUpdate {
  /** Trade ID */
  tradeId: string;
  /** Transaction hash */
  txHash: string;
  /** Option address */
  optionAddress: string;
  /** Maker address */
  maker: string;
  /** Taker address */
  taker: string;
  /** Amount traded */
  amount: string;
  /** Price per contract */
  price: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * Quotation update from WebSocket
 */
export interface QuotationUpdate {
  /** Event type */
  event: 'created' | 'offer_made' | 'offer_revealed' | 'settled' | 'cancelled';
  /** Quotation ID */
  quotationId: string;
  /** Requester address */
  requester?: string;
  /** Offeror address (for offer events) */
  offeror?: string;
  /** Winning offeror (for settled event) */
  winningOfferor?: string;
  /** Option address (for settled event) */
  optionAddress?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * WebSocket event handler types
 */
export type WebSocketEventHandler<T = unknown> = (data: T) => void;

/**
 * WebSocket configuration options
 */
export interface WebSocketConfig {
  /** Auto-reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect interval in milliseconds */
  reconnectInterval?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Ping interval in milliseconds */
  pingInterval?: number;
  /** Connection timeout in milliseconds */
  connectionTimeout?: number;
}

/**
 * RFQ subscription callbacks for subscribeToRfq
 */
export interface RfqSubscriptionCallbacks {
  /** Called when an offer is made for this RFQ */
  onOfferMade?: (event: QuotationUpdate) => void;
  /** Called when an offer is revealed for this RFQ */
  onOfferRevealed?: (event: QuotationUpdate) => void;
  /** Called when the RFQ is settled */
  onSettled?: (event: QuotationUpdate) => void;
  /** Called when the RFQ is cancelled */
  onCancelled?: (event: QuotationUpdate) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * RFQ subscription result
 */
export interface RfqSubscription {
  /** Unsubscribe from the RFQ */
  unsubscribe: () => void;
}
