import type { ThetanutsClient } from '../client/ThetanutsClient.js';
import type {
  WebSocketState,
  SubscriptionType,
  SubscriptionOptions,
  WebSocketMessage,
  WebSocketConfig,
  OrderUpdate,
  PriceUpdate,
  PositionUpdate,
  TradeUpdate,
  QuotationUpdate,
  WebSocketEventHandler,
  RfqSubscriptionCallbacks,
  RfqSubscription,
} from '../types/websocket.js';
import { createError } from '../utils/errors.js';

/**
 * Default WebSocket configuration
 */
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  autoReconnect: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  pingInterval: 30000,
  connectionTimeout: 10000,
};

/**
 * Module for WebSocket real-time subscriptions
 *
 * Provides methods for subscribing to real-time updates:
 * - Order updates (new, filled, cancelled)
 * - Price updates
 * - Position updates
 * - Trade updates
 * - Quotation updates
 *
 * @example
 * ```typescript
 * // Connect to WebSocket
 * await client.ws.connect();
 *
 * // Subscribe to orders
 * client.ws.subscribe({ type: 'orders' }, (update) => {
 *   console.log('Order update:', update);
 * });
 *
 * // Subscribe to prices
 * client.ws.subscribe({ type: 'prices', asset: 'ETH' }, (update) => {
 *   console.log('Price update:', update);
 * });
 *
 * // Disconnect when done
 * client.ws.disconnect();
 * ```
 */
export class WebSocketModule {
  /** WebSocket instance */
  private ws: WebSocket | null = null;

  /** Current connection state */
  private _state: WebSocketState = 'disconnected';

  /** Configuration */
  private config: Required<WebSocketConfig>;

  /** Active subscriptions */
  private subscriptions: Map<string, Set<WebSocketEventHandler>> = new Map();

  /** Reconnect attempt counter */
  private reconnectAttempts = 0;

  /** Ping interval handle */
  private pingIntervalHandle: ReturnType<typeof setInterval> | null = null;

  /** Connection timeout handle */
  private connectionTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

  /** Event handlers for connection state changes */
  private stateChangeHandlers: Set<WebSocketEventHandler<WebSocketState>> = new Set();

  /** Event handlers for errors */
  private errorHandlers: Set<WebSocketEventHandler<Error>> = new Set();

  constructor(private readonly client: ThetanutsClient, config?: WebSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current connection state
   */
  get state(): WebSocketState {
    return this._state;
  }

  /**
   * Check if connected
   */
  get isConnected(): boolean {
    return this._state === 'connected';
  }

  /**
   * Update connection state and notify handlers
   */
  private setState(newState: WebSocketState): void {
    if (this._state !== newState) {
      this._state = newState;
      this.client.logger.debug('WebSocket state changed', { state: newState });
      this.stateChangeHandlers.forEach((handler) => handler(newState));
    }
  }

  /**
   * Connect to the WebSocket server
   *
   * @returns Promise that resolves when connected
   *
   * @example
   * ```typescript
   * await client.ws.connect();
   * console.log('Connected to WebSocket');
   * ```
   */
  async connect(): Promise<void> {
    if (this._state === 'connected' || this._state === 'connecting') {
      this.client.logger.debug('Already connected or connecting');
      return;
    }

    this.setState('connecting');
    this.client.logger.info('Connecting to WebSocket', { url: this.client.wsBaseUrl });

    return new Promise((resolve, reject) => {
      try {
        // Check if WebSocket is available (browser/node environment)
        if (typeof WebSocket === 'undefined') {
          throw createError('WEBSOCKET_ERROR', 'WebSocket is not available in this environment');
        }

        this.ws = new WebSocket(this.client.wsBaseUrl);

        // Set connection timeout
        this.connectionTimeoutHandle = setTimeout(() => {
          if (this._state === 'connecting') {
            this.client.logger.error('WebSocket connection timeout');
            this.ws?.close();
            reject(createError('WEBSOCKET_ERROR', 'Connection timeout'));
          }
        }, this.config.connectionTimeout);

        this.ws.onopen = () => {
          this.clearConnectionTimeout();
          this.setState('connected');
          this.reconnectAttempts = 0;
          this.startPingInterval();
          this.resubscribeAll();
          this.client.logger.info('WebSocket connected');
          resolve();
        };

        this.ws.onclose = (event) => {
          this.cleanup();
          this.client.logger.info('WebSocket closed', { code: event.code, reason: event.reason });

          if (this.config.autoReconnect && this._state !== 'disconnected') {
            this.attemptReconnect();
          } else {
            this.setState('disconnected');
          }
        };

        this.ws.onerror = (event) => {
          const error = createError('WEBSOCKET_ERROR', 'WebSocket error occurred');
          this.client.logger.error('WebSocket error', { event });
          this.errorHandlers.forEach((handler) => handler(error));

          if (this._state === 'connecting') {
            this.clearConnectionTimeout();
            reject(error);
          }
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as string);
        };
      } catch (error) {
        this.setState('disconnected');
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket server
   *
   * @example
   * ```typescript
   * client.ws.disconnect();
   * ```
   */
  disconnect(): void {
    this.client.logger.info('Disconnecting WebSocket');
    this.setState('disconnected');
    this.cleanup();
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
    this.subscriptions.clear();
  }

  /**
   * Subscribe to updates
   *
   * @param options - Subscription options
   * @param handler - Handler function for updates
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * // Subscribe to order updates
   * const unsubscribe = client.ws.subscribe(
   *   { type: 'orders' },
   *   (update) => console.log('Order:', update)
   * );
   *
   * // Later: unsubscribe
   * unsubscribe();
   * ```
   */
  subscribe<T = unknown>(
    options: SubscriptionOptions,
    handler: WebSocketEventHandler<T>
  ): () => void {
    const key = this.getSubscriptionKey(options);

    let handlers = this.subscriptions.get(key);
    if (!handlers) {
      handlers = new Set();
      this.subscriptions.set(key, handlers);
    }

    handlers.add(handler as WebSocketEventHandler);

    // Send subscribe message if connected
    if (this.isConnected) {
      this.sendSubscribe(options);
    }

    this.client.logger.debug('Subscribed', { type: options.type, key });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(options, handler as WebSocketEventHandler);
    };
  }

  /**
   * Unsubscribe from updates
   *
   * @param options - Subscription options
   * @param handler - Handler function to remove (optional, removes all if not specified)
   */
  unsubscribe(options: SubscriptionOptions, handler?: WebSocketEventHandler): void {
    const key = this.getSubscriptionKey(options);
    const handlers = this.subscriptions.get(key);

    if (!handlers) {
      return;
    }

    if (handler) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscriptions.delete(key);
        if (this.isConnected) {
          this.sendUnsubscribe(options);
        }
      }
    } else {
      this.subscriptions.delete(key);
      if (this.isConnected) {
        this.sendUnsubscribe(options);
      }
    }

    this.client.logger.debug('Unsubscribed', { type: options.type, key });
  }

  /**
   * Subscribe to order updates
   *
   * @param handler - Handler for order updates
   * @returns Unsubscribe function
   */
  subscribeOrders(handler: WebSocketEventHandler<OrderUpdate>): () => void {
    return this.subscribe({ type: 'orders' }, handler);
  }

  /**
   * Subscribe to price updates
   *
   * @param asset - Asset symbol to subscribe to (optional)
   * @param handler - Handler for price updates
   * @returns Unsubscribe function
   */
  subscribePrices(handler: WebSocketEventHandler<PriceUpdate>, asset?: string): () => void {
    const options: SubscriptionOptions = { type: 'prices' };
    if (asset !== undefined) {
      options.asset = asset;
    }
    return this.subscribe(options, handler);
  }

  /**
   * Subscribe to position updates
   *
   * @param address - Address to subscribe to (defaults to signer address)
   * @param handler - Handler for position updates
   * @returns Unsubscribe function
   */
  subscribePositions(handler: WebSocketEventHandler<PositionUpdate>, address?: string): () => void {
    const options: SubscriptionOptions = { type: 'positions' };
    if (address !== undefined) {
      options.address = address;
    }
    return this.subscribe(options, handler);
  }

  /**
   * Subscribe to trade updates
   *
   * @param handler - Handler for trade updates
   * @returns Unsubscribe function
   */
  subscribeTrades(handler: WebSocketEventHandler<TradeUpdate>): () => void {
    return this.subscribe({ type: 'trades' }, handler);
  }

  /**
   * Subscribe to quotation updates
   *
   * @param handler - Handler for quotation updates
   * @returns Unsubscribe function
   */
  subscribeQuotations(handler: WebSocketEventHandler<QuotationUpdate>): () => void {
    return this.subscribe({ type: 'quotations' }, handler);
  }

  /**
   * Subscribe to events for a specific RFQ
   *
   * Filters quotation events by quotationId and routes them to specific callbacks
   * based on the event type.
   *
   * @param quotationId - Quotation ID to subscribe to
   * @param callbacks - Callbacks for different event types
   * @returns Subscription with unsubscribe method
   *
   * @example
   * ```typescript
   * const subscription = client.ws.subscribeToRfq(1n, {
   *   onOfferMade: (event) => {
   *     console.log('Offer made by:', event.offeror);
   *   },
   *   onOfferRevealed: (event) => {
   *     console.log('Offer revealed by:', event.offeror);
   *   },
   *   onSettled: (event) => {
   *     console.log('RFQ settled, option:', event.optionAddress);
   *   },
   *   onCancelled: (event) => {
   *     console.log('RFQ cancelled');
   *   },
   *   onError: (error) => {
   *     console.error('Error:', error);
   *   },
   * });
   *
   * // Later: unsubscribe
   * subscription.unsubscribe();
   * ```
   */
  subscribeToRfq(quotationId: bigint, callbacks: RfqSubscriptionCallbacks): RfqSubscription {
    const quotationIdStr = quotationId.toString();

    this.client.logger.debug('Subscribing to RFQ', { quotationId: quotationIdStr });

    // Create a handler that filters by quotationId and routes to appropriate callbacks
    const handler: WebSocketEventHandler<QuotationUpdate> = (update) => {
      // Check if this update is for our quotationId
      if (update.quotationId !== quotationIdStr) {
        return;
      }

      try {
        switch (update.event) {
          case 'offer_made':
            callbacks.onOfferMade?.(update);
            break;
          case 'offer_revealed':
            callbacks.onOfferRevealed?.(update);
            break;
          case 'settled':
            callbacks.onSettled?.(update);
            break;
          case 'cancelled':
            callbacks.onCancelled?.(update);
            break;
        }
      } catch (error) {
        if (callbacks.onError) {
          callbacks.onError(error instanceof Error ? error : new Error(String(error)));
        } else {
          this.client.logger.error('RFQ subscription handler error', { error, quotationId: quotationIdStr });
        }
      }
    };

    // Subscribe to quotations with our handler
    const unsubscribe = this.subscribeQuotations(handler);

    // Also subscribe to error events if callback provided
    let unsubscribeError: (() => void) | null = null;
    if (callbacks.onError) {
      unsubscribeError = this.onError(callbacks.onError);
    }

    return {
      unsubscribe: () => {
        unsubscribe();
        unsubscribeError?.();
        this.client.logger.debug('Unsubscribed from RFQ', { quotationId: quotationIdStr });
      },
    };
  }

  /**
   * Subscribe to all OptionFactory events
   *
   * Convenience method that subscribes to quotation events and routes them
   * to appropriate callbacks based on event type.
   *
   * @param callbacks - Callbacks for different event types
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = client.ws.subscribeToFactory({
   *   onQuotationRequested: (event) => {
   *     console.log('New RFQ:', event.quotationId);
   *   },
   *   onOfferMade: (event) => {
   *     console.log('Offer made on RFQ:', event.quotationId);
   *   },
   * });
   * ```
   */
  subscribeToFactory(callbacks: {
    onQuotationRequested?: (event: QuotationUpdate) => void;
    onOfferMade?: (event: QuotationUpdate) => void;
    onOfferRevealed?: (event: QuotationUpdate) => void;
    onSettled?: (event: QuotationUpdate) => void;
    onCancelled?: (event: QuotationUpdate) => void;
  }): () => void {
    const handler: WebSocketEventHandler<QuotationUpdate> = (update) => {
      switch (update.event) {
        case 'created':
          callbacks.onQuotationRequested?.(update);
          break;
        case 'offer_made':
          callbacks.onOfferMade?.(update);
          break;
        case 'offer_revealed':
          callbacks.onOfferRevealed?.(update);
          break;
        case 'settled':
          callbacks.onSettled?.(update);
          break;
        case 'cancelled':
          callbacks.onCancelled?.(update);
          break;
      }
    };

    return this.subscribeQuotations(handler);
  }

  /**
   * Subscribe to OptionBook events (order fills)
   *
   * @param callbacks - Callbacks for order events
   * @returns Unsubscribe function
   *
   * @example
   * ```typescript
   * const unsubscribe = client.ws.subscribeToBook({
   *   onOrderFilled: (event) => {
   *     console.log('Order filled:', event.orderId);
   *   },
   *   onOrderCancelled: (event) => {
   *     console.log('Order cancelled:', event.orderId);
   *   },
   * });
   * ```
   */
  subscribeToBook(callbacks: {
    onOrderFilled?: (event: OrderUpdate) => void;
    onOrderCancelled?: (event: OrderUpdate) => void;
    onNewOrder?: (event: OrderUpdate) => void;
  }): () => void {
    const handler: WebSocketEventHandler<OrderUpdate> = (update) => {
      switch (update.event) {
        case 'fill':
          callbacks.onOrderFilled?.(update);
          break;
        case 'cancel':
          callbacks.onOrderCancelled?.(update);
          break;
        case 'new':
          callbacks.onNewOrder?.(update);
          break;
      }
    };

    return this.subscribeOrders(handler);
  }

  /**
   * Add a handler for connection state changes
   *
   * @param handler - State change handler
   * @returns Function to remove the handler
   */
  onStateChange(handler: WebSocketEventHandler<WebSocketState>): () => void {
    this.stateChangeHandlers.add(handler);
    return () => {
      this.stateChangeHandlers.delete(handler);
    };
  }

  /**
   * Add a handler for errors
   *
   * @param handler - Error handler
   * @returns Function to remove the handler
   */
  onError(handler: WebSocketEventHandler<Error>): () => void {
    this.errorHandlers.add(handler);
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  /**
   * Generate subscription key from options
   */
  private getSubscriptionKey(options: SubscriptionOptions): string {
    const parts: string[] = [options.type];
    if (options.asset) parts.push(`asset:${options.asset}`);
    if (options.address) parts.push(`address:${options.address}`);
    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        parts.push(`${key}:${String(value)}`);
      }
    }
    return parts.join('|');
  }

  /**
   * Send a subscribe message
   */
  private sendSubscribe(options: SubscriptionOptions): void {
    const message: WebSocketMessage = {
      type: 'subscribe',
      subscription: options.type,
      data: {
        asset: options.asset,
        address: options.address,
        ...options.filters,
      },
    };
    this.send(message);
  }

  /**
   * Send an unsubscribe message
   */
  private sendUnsubscribe(options: SubscriptionOptions): void {
    const message: WebSocketMessage = {
      type: 'unsubscribe',
      subscription: options.type,
      data: {
        asset: options.asset,
        address: options.address,
        ...options.filters,
      },
    };
    this.send(message);
  }

  /**
   * Send a message to the server
   */
  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as WebSocketMessage;

      if (message.type === 'pong') {
        // Pong received, connection is alive
        return;
      }

      if (message.type === 'error') {
        this.client.logger.error('WebSocket error message', { error: message.error });
        const error = createError('WEBSOCKET_ERROR', message.error ?? 'Unknown error');
        this.errorHandlers.forEach((handler) => handler(error));
        return;
      }

      if (message.type === 'update' && message.subscription) {
        this.dispatchUpdate(message.subscription, message.data);
      }
    } catch (error) {
      this.client.logger.error('Failed to parse WebSocket message', { error, data });
    }
  }

  /**
   * Dispatch update to subscription handlers
   */
  private dispatchUpdate(type: SubscriptionType, data: unknown): void {
    // Find all matching subscriptions
    for (const [key, handlers] of this.subscriptions) {
      if (key.startsWith(type)) {
        handlers.forEach((handler) => {
          try {
            handler(data);
          } catch (error) {
            this.client.logger.error('Subscription handler error', { error, type, key });
          }
        });
      }
    }
  }

  /**
   * Resubscribe to all active subscriptions
   */
  private resubscribeAll(): void {
    for (const key of this.subscriptions.keys()) {
      const [type, ...rest] = key.split('|') as [SubscriptionType, ...string[]];
      const options: SubscriptionOptions = { type };

      for (const part of rest) {
        const [partKey, value] = part.split(':') as [string, string];
        if (partKey === 'asset') options.asset = value;
        else if (partKey === 'address') options.address = value;
      }

      this.sendSubscribe(options);
    }
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.client.logger.error('Max reconnect attempts reached');
      this.setState('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.setState('reconnecting');
    this.client.logger.info('Attempting reconnect', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.config.maxReconnectAttempts,
    });

    setTimeout(() => {
      if (this._state === 'reconnecting') {
        this.connect().catch((error: unknown) => {
          this.client.logger.error('Reconnect failed', { error });
        });
      }
    }, this.config.reconnectInterval);
  }

  /**
   * Start ping interval
   */
  private startPingInterval(): void {
    this.stopPingInterval();
    this.pingIntervalHandle = setInterval(() => {
      this.send({ type: 'ping' });
    }, this.config.pingInterval);
  }

  /**
   * Stop ping interval
   */
  private stopPingInterval(): void {
    if (this.pingIntervalHandle) {
      clearInterval(this.pingIntervalHandle);
      this.pingIntervalHandle = null;
    }
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutHandle) {
      clearTimeout(this.connectionTimeoutHandle);
      this.connectionTimeoutHandle = null;
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopPingInterval();
    this.clearConnectionTimeout();
  }
}
