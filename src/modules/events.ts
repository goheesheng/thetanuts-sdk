import { Contract } from 'ethers';
import type { EventLog, Log } from 'ethers';

import type { ThetanutsClient } from '../client/ThetanutsClient.js';
import { OPTION_BOOK_ABI } from '../abis/optionBook.js';
import { OPTION_FACTORY_ABI } from '../abis/optionFactory.js';
import { OPTION_ABI } from '../abis/option.js';
import type {
  OrderFillEvent,
  OrderCancelledEvent,
  OptionCreatedEvent,
  QuotationRequestedEvent,
  OfferMadeEvent,
  OfferRevealedEvent,
  QuotationSettledEvent,
  QuotationCancelledEvent,
  PositionClosedEvent,
  PositionTransferredEvent,
  EventFilters,
  RfqHistory,
  EventQueryParams,
  BaseEvent,
  ExcessCollateralReturnedEvent,
  OptionClosedEvent,
  OptionExpiredEvent,
  OptionPayoutEvent,
  OptionSettlementFailedEvent,
  OptionSplitEvent,
  RoleTransferredEvent,
  TransferApprovalEvent,
  ERC20RescuedEvent,
} from '../types/events.js';
import { BASE_OPTION_ABI } from '../abis/option.js';
import { createError } from '../utils/errors.js';
import { mapContractError } from '../utils/errors.js';
import { validateAddress } from '../utils/validation.js';

/**
 * Module for querying contract events
 *
 * Provides methods for fetching historical events from:
 * - OptionBook contract (order fills, cancellations)
 * - OptionFactory contract (quotations, offers, settlements)
 * - Option contracts (position closures, transfers)
 *
 * @example
 * ```typescript
 * // Get order fill events
 * const fills = await client.events.getOrderFillEvents({
 *   fromBlock: 10000000,
 *   toBlock: 'latest',
 * });
 *
 * // Get option created events
 * const created = await client.events.getOptionCreatedEvents();
 * ```
 */
export class EventsModule {
  /** Cached contract instances */
  private optionBookContract: Contract | null = null;
  private optionFactoryContract: Contract | null = null;
  /** Cached latest block number (refreshed every 30s) */
  private cachedBlockNumber: number | null = null;
  private blockNumberCacheExpiry = 0;

  constructor(private readonly client: ThetanutsClient) {}

  /**
   * Get the latest block number with short-lived caching to avoid redundant RPC calls
   * when multiple event queries run in sequence.
   */
  private async getLatestBlockNumber(): Promise<number> {
    const now = Date.now();
    if (this.cachedBlockNumber !== null && now < this.blockNumberCacheExpiry) {
      return this.cachedBlockNumber;
    }
    this.cachedBlockNumber = await this.client.provider.getBlockNumber();
    this.blockNumberCacheExpiry = now + 30_000; // 30s cache
    return this.cachedBlockNumber;
  }

  /**
   * Get the OptionBook contract instance
   */
  private getOptionBookContract(): Contract {
    if (!this.optionBookContract) {
      this.optionBookContract = new Contract(
        this.client.getContractAddress('optionBook'),
        OPTION_BOOK_ABI,
        this.client.provider
      );
    }
    return this.optionBookContract;
  }

  /**
   * Get the OptionFactory contract instance
   */
  private getOptionFactoryContract(): Contract {
    if (!this.optionFactoryContract) {
      this.optionFactoryContract = new Contract(
        this.client.getContractAddress('optionFactory'),
        OPTION_FACTORY_ABI,
        this.client.provider
      );
    }
    return this.optionFactoryContract;
  }

  /**
   * Get an Option contract instance
   */
  private getOptionContract(optionAddress: string): Contract {
    return new Contract(optionAddress, OPTION_ABI, this.client.provider);
  }

  /**
   * Query events with automatic block range chunking to respect RPC limits.
   *
   * When no fromBlock is provided, searches backward from the latest block
   * (most events are recent). When fromBlock is provided, chunks forward.
   * Ranges ≤ MAX_BLOCK_RANGE are queried in a single call.
   */
  private async queryFilterChunked(
    contract: Contract,
    eventFilter: ReturnType<Contract['filters'][string]>,
    fromBlock: number | undefined,
    toBlock: number | string | undefined,
  ): Promise<(Log | EventLog)[]> {
    const MAX_BLOCK_RANGE = 10_000;
    const deploymentBlock = this.client.chainConfig.deploymentBlock;
    const maxChunks = 10; // ~100K blocks (~2 days on Base) when no fromBlock specified

    // Resolve toBlock
    let toBlockNum: number;
    if (toBlock === undefined || toBlock === 'latest') {
      toBlockNum = await this.getLatestBlockNumber();
    } else {
      toBlockNum = typeof toBlock === 'string' ? parseInt(toBlock, 10) : toBlock;
    }

    const startFrom = fromBlock ?? deploymentBlock;

    // If range fits in one query, just do it
    if (toBlockNum - startFrom <= MAX_BLOCK_RANGE) {
      return contract.queryFilter(eventFilter, startFrom, toBlockNum);
    }

    // If user provided explicit fromBlock, chunk forward (they want a specific range)
    if (fromBlock !== undefined) {
      const allLogs: (Log | EventLog)[] = [];
      for (let start = fromBlock; start <= toBlockNum; start += MAX_BLOCK_RANGE) {
        const end = Math.min(start + MAX_BLOCK_RANGE - 1, toBlockNum);
        const logs = await contract.queryFilter(eventFilter, start, end);
        allLogs.push(...logs);
      }
      return allLogs;
    }

    // No fromBlock → search backward from latest (most events are recent)
    const allLogs: (Log | EventLog)[] = [];
    let chunksSearched = 0;
    for (let end = toBlockNum; end >= deploymentBlock && chunksSearched < maxChunks; end -= MAX_BLOCK_RANGE) {
      const start = Math.max(end - MAX_BLOCK_RANGE + 1, deploymentBlock);
      const logs = await contract.queryFilter(eventFilter, start, end);
      allLogs.unshift(...logs); // prepend to maintain block order
      chunksSearched++;
    }
    return allLogs;
  }

  /**
   * Parse event logs into typed events
   */
  private isEventLog(log: Log | EventLog): log is EventLog {
    return 'args' in log;
  }

  /**
   * Get order fill events from OptionBook
   *
   * @param filters - Event query filters
   * @returns Array of order fill events
   *
   * @example
   * ```typescript
   * const fills = await client.events.getOrderFillEvents({
   *   fromBlock: 10000000,
   * });
   * for (const fill of fills) {
   *   console.log(`Maker: ${fill.maker}, Taker: ${fill.taker}`);
   * }
   * ```
   */
  async getOrderFillEvents(filters?: EventFilters): Promise<OrderFillEvent[]> {
    this.client.logger.debug('Getting order fill events', { filters });

    try {
      const contract = this.getOptionBookContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      // Query OrderFilled events
      const eventFilter = contract.filters['OrderFilled']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OrderFillEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            maker: string;
            taker: string;
            option: string;
            numContracts: bigint;
            price: bigint;
            referrer: string;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            maker: args.maker,
            taker: args.taker,
            option: args.option,
            numContracts: args.numContracts,
            price: args.price,
            referrer: args.referrer,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get order fill events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get order cancelled events from OptionBook
   *
   * @param filters - Event query filters
   * @returns Array of order cancelled events
   */
  async getOrderCancelledEvents(filters?: EventFilters): Promise<OrderCancelledEvent[]> {
    this.client.logger.debug('Getting order cancelled events', { filters });

    try {
      const contract = this.getOptionBookContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OrderCancelled']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OrderCancelledEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            maker: string;
            nonce: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            maker: args.maker,
            nonce: args.nonce,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get order cancelled events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get option created events from OptionFactory
   *
   * @param filters - Event query filters
   * @returns Array of option created events
   *
   * @example
   * ```typescript
   * const options = await client.events.getOptionCreatedEvents({
   *   fromBlock: 10000000,
   * });
   * console.log(`Found ${options.length} options created`);
   * ```
   */
  async getOptionCreatedEvents(filters?: EventFilters): Promise<OptionCreatedEvent[]> {
    this.client.logger.debug('Getting option created events', { filters });

    try {
      const contract = this.getOptionFactoryContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OptionCreated']?.();
      if (!eventFilter) {
        // Fall back to QuotationSettled which includes option address
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OptionCreatedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            optionAddress: string;
            underlyingAsset: string;
            collateralToken: string;
            optionType: number;
            strikes: bigint[];
            expiry: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            optionAddress: args.optionAddress,
            underlyingAsset: args.underlyingAsset,
            collateralToken: args.collateralToken,
            optionType: args.optionType,
            strikes: args.strikes,
            expiry: args.expiry,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get option created events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get quotation requested events from OptionFactory
   *
   * @param filters - Event query filters
   * @returns Array of quotation requested events
   */
  async getQuotationRequestedEvents(filters?: EventFilters): Promise<QuotationRequestedEvent[]> {
    this.client.logger.debug('Getting quotation requested events', { filters });

    try {
      const contract = this.getOptionFactoryContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['QuotationRequested']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: QuotationRequestedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            quotationId: bigint;
            requester: string;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            quotationId: args.quotationId,
            requester: args.requester,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get quotation requested events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get offer made events from OptionFactory
   *
   * @param filters - Event query filters
   * @returns Array of offer made events
   */
  async getOfferMadeEvents(filters?: EventFilters): Promise<OfferMadeEvent[]> {
    this.client.logger.debug('Getting offer made events', { filters });

    try {
      const contract = this.getOptionFactoryContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OfferMade']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OfferMadeEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            quotationId: bigint;
            offeror: string;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            quotationId: args.quotationId,
            offeror: args.offeror,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get offer made events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get offer revealed events from OptionFactory
   *
   * @param filters - Event query filters
   * @returns Array of offer revealed events
   */
  async getOfferRevealedEvents(filters?: EventFilters): Promise<OfferRevealedEvent[]> {
    this.client.logger.debug('Getting offer revealed events', { filters });

    try {
      const contract = this.getOptionFactoryContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OfferRevealed']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OfferRevealedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            quotationId: bigint;
            offeror: string;
            offerAmount: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            quotationId: args.quotationId,
            offeror: args.offeror,
            offerAmount: args.offerAmount,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get offer revealed events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get quotation settled events from OptionFactory
   *
   * @param filters - Event query filters
   * @returns Array of quotation settled events
   */
  async getQuotationSettledEvents(filters?: EventFilters): Promise<QuotationSettledEvent[]> {
    this.client.logger.debug('Getting quotation settled events', { filters });

    try {
      const contract = this.getOptionFactoryContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['QuotationSettled']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: QuotationSettledEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            quotationId: bigint;
            winningOfferor: string;
            optionAddress: string;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            quotationId: args.quotationId,
            winningOfferor: args.winningOfferor,
            optionAddress: args.optionAddress,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get quotation settled events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get position closed events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of position closed events
   */
  async getPositionClosedEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<PositionClosedEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting position closed events', { optionAddress, filters });

    try {
      const contract = this.getOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['PositionClosed']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: PositionClosedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            account: string;
            payout: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            account: args.account,
            payout: args.payout,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get position closed events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get position transferred events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of position transferred events
   */
  async getPositionTransferredEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<PositionTransferredEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting position transferred events', { optionAddress, filters });

    try {
      const contract = this.getOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['PositionTransferred']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: PositionTransferredEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            from: string;
            to: string;
            isBuyer: boolean;
            amount: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            from: args.from,
            to: args.to,
            isBuyer: args.isBuyer,
            amount: args.amount,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get position transferred events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get quotation cancelled events from OptionFactory
   *
   * @param filters - Event query filters
   * @returns Array of quotation cancelled events
   *
   * @example
   * ```typescript
   * const cancelled = await client.events.getQuotationCancelledEvents({
   *   fromBlock: 10000000,
   * });
   * ```
   */
  async getQuotationCancelledEvents(filters?: EventFilters): Promise<QuotationCancelledEvent[]> {
    this.client.logger.debug('Getting quotation cancelled events', { filters });

    try {
      const contract = this.getOptionFactoryContract();
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['QuotationCancelled']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: QuotationCancelledEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            quotationId: bigint;
            canceller: string;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            quotationId: args.quotationId,
            canceller: args.canceller,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get quotation cancelled events', { error });
      throw mapContractError(error);
    }
  }

  /**
   * Get complete RFQ history for a specific quotation ID
   *
   * @param quotationId - Quotation ID to get history for
   * @param filters - Optional event query filters
   * @returns Complete RFQ history including all events
   *
   * @example
   * ```typescript
   * const history = await client.events.getRfqHistory(1n);
   * console.log('Requested by:', history.requested?.requester);
   * console.log('Offers made:', history.offersMade.length);
   * console.log('Settled:', history.settled !== null);
   * ```
   */
  async getRfqHistory(quotationId: bigint, filters?: EventFilters): Promise<RfqHistory> {
    this.client.logger.debug('Getting RFQ history', { quotationId: quotationId.toString(), filters });

    try {
      // Run event queries sequentially to avoid rate limiting on public RPCs.
      // Each query may chunk across many blocks, so parallel execution can
      // trigger "over rate limit" errors on free-tier RPC providers.
      const requestedEvents = await this.getQuotationRequestedEvents(filters);
      const offerMadeEvents = await this.getOfferMadeEvents(filters);
      const offerRevealedEvents = await this.getOfferRevealedEvents(filters);
      const settledEvents = await this.getQuotationSettledEvents(filters);
      const cancelledEvents = await this.getQuotationCancelledEvents(filters);

      // Filter events for this quotation ID
      const requested = requestedEvents.find((e) => e.quotationId === quotationId) ?? null;
      const offersMade = offerMadeEvents.filter((e) => e.quotationId === quotationId);
      const offersRevealed = offerRevealedEvents.filter((e) => e.quotationId === quotationId);
      const settled = settledEvents.find((e) => e.quotationId === quotationId) ?? null;
      const cancelled = cancelledEvents.find((e) => e.quotationId === quotationId) ?? null;

      return {
        quotationId,
        requested,
        offersMade,
        offersRevealed,
        settled,
        cancelled,
      };
    } catch (error) {
      this.client.logger.error('Failed to get RFQ history', { error, quotationId: quotationId.toString() });
      throw mapContractError(error);
    }
  }

  /**
   * Generic event query method
   *
   * @param params - Query parameters including event type and block range
   * @returns Array of events matching the query
   *
   * @example
   * ```typescript
   * const events = await client.events.queryEvents({
   *   eventType: 'OrderFilled',
   *   fromBlock: 10000000,
   *   toBlock: 10100000,
   * });
   * ```
   */
  async queryEvents(params: EventQueryParams): Promise<BaseEvent[]> {
    const { eventType, fromBlock, toBlock } = params;
    this.client.logger.debug('Querying events', { eventType, fromBlock, toBlock });

    const filters: EventFilters = {};
    if (fromBlock !== undefined) {
      filters.fromBlock = fromBlock;
    }
    if (toBlock !== undefined) {
      filters.toBlock = toBlock;
    }

    switch (eventType) {
      case 'OrderFilled':
        return this.getOrderFillEvents(filters);

      case 'OrderCancelled':
        return this.getOrderCancelledEvents(filters);

      case 'OptionCreated':
        return this.getOptionCreatedEvents(filters);

      case 'QuotationRequested':
        return this.getQuotationRequestedEvents(filters);

      case 'OfferMade':
        return this.getOfferMadeEvents(filters);

      case 'OfferRevealed':
        return this.getOfferRevealedEvents(filters);

      case 'QuotationSettled':
        return this.getQuotationSettledEvents(filters);

      case 'QuotationCancelled':
        return this.getQuotationCancelledEvents(filters);

      default:
        throw createError('INVALID_PARAMS', `Unknown event type: ${String(eventType)}`);
    }
  }

  // ============================================================
  // BaseOption Event Query Methods
  // ============================================================

  /**
   * Get an Option contract instance using BASE_OPTION_ABI
   */
  private getBaseOptionContract(optionAddress: string): Contract {
    return new Contract(optionAddress, BASE_OPTION_ABI, this.client.provider);
  }

  /**
   * Get ExcessCollateralReturned events from an Option contract.
   *
   * r12 renamed the prior `CollateralReturned` event to
   * `ExcessCollateralReturned` and reshaped fields to
   * (seller indexed, collateralToken indexed, collateralReturned).
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of excess collateral returned events
   */
  async getExcessCollateralReturnedEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<ExcessCollateralReturnedEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting excess collateral returned events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['ExcessCollateralReturned']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: ExcessCollateralReturnedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            seller: string;
            collateralToken: string;
            collateralReturned: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            seller: args.seller,
            collateralToken: args.collateralToken,
            collateralReturned: args.collateralReturned,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get excess collateral returned events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get OptionClosed events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of option closed events
   */
  async getOptionClosedEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<OptionClosedEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting option closed events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OptionClosed']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OptionClosedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            optionAddress: string;
            closedBy: string;
            collateralReturned: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            optionAddress: args.optionAddress,
            closedBy: args.closedBy,
            collateralReturned: args.collateralReturned,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get option closed events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get OptionExpired events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of option expired events
   */
  async getOptionExpiredEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<OptionExpiredEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting option expired events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OptionExpired']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OptionExpiredEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            optionAddress: string;
            settlementPrice: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            optionAddress: args.optionAddress,
            settlementPrice: args.settlementPrice,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get option expired events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get OptionPayout events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of option payout events
   */
  async getOptionPayoutEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<OptionPayoutEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting option payout events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OptionPayout']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OptionPayoutEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            optionAddress: string;
            buyer: string;
            amountPaidOut: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            optionAddress: args.optionAddress,
            buyer: args.buyer,
            amountPaidOut: args.amountPaidOut,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get option payout events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get OptionSettlementFailed events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of option settlement failed events
   */
  async getOptionSettlementFailedEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<OptionSettlementFailedEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting option settlement failed events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OptionSettlementFailed']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OptionSettlementFailedEvent[] = [];
      for (const log of logs) {
        events.push({
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.index,
          optionAddress,
        });
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get option settlement failed events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get OptionSplit events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of option split events
   */
  async getOptionSplitEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<OptionSplitEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting option split events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['OptionSplit']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: OptionSplitEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          // r12 OptionSplit shape: (newOption indexed, collateralAmount,
          // feePaid, counterparty indexed). Earlier SDK extracted only
          // newOption + collateralAmount.
          const args = log.args as unknown as {
            newOption: string;
            collateralAmount: bigint;
            feePaid: bigint;
            counterparty: string;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            originalOption: optionAddress,
            newOption: args.newOption,
            collateralAmount: args.collateralAmount,
            feePaid: args.feePaid,
            counterparty: args.counterparty,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get option split events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get RoleTransferred events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of role transferred events
   */
  async getRoleTransferredEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<RoleTransferredEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting role transferred events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['RoleTransferred']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: RoleTransferredEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            optionAddress: string;
            from: string;
            to: string;
            isBuyer: boolean;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            optionAddress: args.optionAddress,
            from: args.from,
            to: args.to,
            isBuyer: args.isBuyer,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get role transferred events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get TransferApproval events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of transfer approval events
   */
  async getTransferApprovalEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<TransferApprovalEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting transfer approval events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['TransferApproval']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: TransferApprovalEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            target: string;
            from: string;
            isBuyer: boolean;
            isApproved: boolean;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            target: args.target,
            from: args.from,
            isBuyer: args.isBuyer,
            isApproved: args.isApproved,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get transfer approval events', { error, optionAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get ERC20Rescued events from an Option contract
   *
   * @param optionAddress - Option contract address
   * @param filters - Event query filters
   * @returns Array of ERC20 rescued events
   */
  async getERC20RescuedEvents(
    optionAddress: string,
    filters?: EventFilters
  ): Promise<ERC20RescuedEvent[]> {
    validateAddress(optionAddress, 'optionAddress');
    this.client.logger.debug('Getting ERC20 rescued events', { optionAddress, filters });

    try {
      const contract = this.getBaseOptionContract(optionAddress);
      const fromBlock = filters?.fromBlock;
      const toBlock = filters?.toBlock;

      const eventFilter = contract.filters['ERC20Rescued']?.();
      if (!eventFilter) {
        return [];
      }

      const logs = await this.queryFilterChunked(contract, eventFilter, fromBlock, toBlock);

      const events: ERC20RescuedEvent[] = [];
      for (const log of logs) {
        if (this.isEventLog(log)) {
          const args = log.args as unknown as {
            rescueAddress: string;
            tokenAddress: string;
            amount: bigint;
          };

          events.push({
            blockNumber: log.blockNumber,
            transactionHash: log.transactionHash,
            logIndex: log.index,
            rescueAddress: args.rescueAddress,
            tokenAddress: args.tokenAddress,
            amount: args.amount,
          });
        }
      }

      return events;
    } catch (error) {
      this.client.logger.error('Failed to get ERC20 rescued events', { error, optionAddress });
      throw mapContractError(error);
    }
  }
}
