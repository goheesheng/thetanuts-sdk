import type { Signer, Provider } from 'ethers';
import type { ThetanutsLogger } from './logger.js';
import type { KeyStorageProvider } from './rfqKeyManager.js';

/**
 * Supported chain IDs for Thetanuts SDK V4
 */
export type SupportedChainId = 8453; // Base mainnet

/**
 * Environment configuration
 */
export type Environment = 'dev' | 'prod';

/**
 * Configuration options for ThetanutsClient V4
 *
 * @example
 * ```typescript
 * import { ThetanutsClient } from '@thetanuts/thetanuts-client';
 * import { ethers } from 'ethers';
 *
 * const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
 * const signer = new ethers.Wallet(privateKey, provider);
 *
 * const client = new ThetanutsClient({
 *   chainId: 8453,
 *   provider,
 *   signer,
 *   referrer: '0x...',
 * });
 * ```
 */
export interface ThetanutsClientConfig {
  /** Chain ID to connect to (e.g., 8453 for Base mainnet) */
  chainId: SupportedChainId;

  /** ethers.js v6 Provider for read operations */
  provider: Provider;

  /** Signer for write operations (optional for read-only mode) */
  signer?: Signer;

  /** Referrer address for fee sharing (optional) */
  referrer?: string;

  /** Base URL for API calls (optional, defaults based on chain config) */
  apiBaseUrl?: string;

  /** Indexer API URL for positions, history, stats (optional) */
  indexerApiUrl?: string;

  /** Pricing API URL (optional, defaults to pricing.thetanuts.finance) */
  pricingApiUrl?: string;

  /** WebSocket URL for real-time events (optional) */
  wsUrl?: string;

  /** State API URL for RFQ state indexer (optional, defaults from chain config) */
  stateApiUrl?: string;

  /** Environment - 'dev' or 'prod' (default: 'prod') */
  env?: Environment;

  /** Optional logger instance */
  logger?: ThetanutsLogger;

  /** Storage provider for RFQ keys (optional, auto-detects environment: localStorage in browser, file storage in Node.js) */
  keyStorageProvider?: KeyStorageProvider;

  /** Custom key prefix for RFQ keys (default: 'thetanuts_rfq_key') */
  rfqKeyPrefix?: string;
}

/**
 * @deprecated Use SupportedChainId instead. Will be removed in next major version.
 */
export type SupportedNetwork = 'base';
