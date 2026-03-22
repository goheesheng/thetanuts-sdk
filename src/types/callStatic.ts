/**
 * Call Static Types
 *
 * Types for transaction simulation using ethers.js v6 staticCall.
 * Allows developers to simulate transactions and get return values
 * without submitting to the blockchain.
 */

import type { ThetanutsError } from './errors.js';

/**
 * Result of a static call (transaction simulation)
 *
 * @example
 * ```typescript
 * // Simulate createRFQ to get the next RFQ ID
 * const result = await client.optionFactory.callStaticCreateRFQ(request);
 * if (result.success) {
 *   console.log('Next RFQ ID:', result.returnValue);
 * }
 * ```
 */
export interface CallStaticResult<T> {
  /** Whether the transaction would succeed */
  success: boolean;
  /** Return value from contract function (only if success is true) */
  returnValue?: T;
  /** Error if simulation failed */
  error?: ThetanutsError;
  /** Estimated gas for this transaction */
  gasEstimate: bigint;
  /** Gas limit with 20% buffer for AA wallets */
  gasLimitWithBuffer: bigint;
}
