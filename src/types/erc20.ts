import type { TransactionReceipt } from 'ethers';

/**
 * Result from an approval operation
 */
export interface ApprovalResult {
  /** Transaction receipt from the approval */
  receipt: TransactionReceipt;
  /** Token address that was approved */
  token: string;
  /** Spender address that received approval */
  spender: string;
  /** Amount approved */
  amount: bigint;
}

/**
 * Result from an ensureAllowance operation
 */
export interface EnsureAllowanceResult {
  /** Whether an approval was needed */
  approvalNeeded: boolean;
  /** Transaction receipt if approval was performed, null otherwise */
  receipt: TransactionReceipt | null;
  /** Current allowance after the operation */
  currentAllowance: bigint;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  /** Token address */
  token: string;
  /** Balance in wei/smallest unit */
  balance: bigint;
  /** Token decimals */
  decimals: number;
  /** Formatted balance as string */
  formatted: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  /** Token address */
  address: string;
  /** Token symbol */
  symbol: string;
  /** Token decimals */
  decimals: number;
  /** Token name (optional) */
  name?: string;
}
