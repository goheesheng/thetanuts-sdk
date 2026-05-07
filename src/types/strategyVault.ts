/**
 * StrategyVault Types — Fixed-strike + CLVEX directional/condor vaults on Base
 *
 * Types for the BaseVault / FixedStrikeStrategyVault / DirectionalStrategyVault /
 * MeanRevertingCondorStrategyVault contracts. All share the same BaseVault interface.
 */

import type { TransactionReceipt } from 'ethers';

// ─── Vault Configuration ───

export interface StrategyVaultEntry {
  address: string;
  name: string;
  strike?: number;
  strategy?: string;
}

// ─── Vault State ───

export interface StrategyVaultAssets {
  assetValues: bigint[];
  pendingDepositValues: bigint[];
  optionCollateralValues: bigint[];
  totalAssets: bigint;
}

export interface StrategyVaultState {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  assets: StrategyVaultAssets;
  isRfqActive: boolean;
  activeRfqId: bigint;
  activeOptionsLengths: bigint[];
  hasActiveOptions: boolean;
  canCreateOption: boolean;
  nextExpiryTimestamp: number;
}

// ─── Vault Epoch Info ───

export interface VaultEpochInfo {
  nextExpiryTimestamp: number;
  isRfqActive: boolean;
  activeOptionsCount: number;
  canCreateOption: boolean;
}

// ─── Deposit/Withdraw ───

export interface StrategyVaultDepositResult {
  receipt: TransactionReceipt;
}

export interface StrategyVaultWithdrawResult {
  receipt: TransactionReceipt;
}

export interface StrategyVaultCreateOptionResult {
  receipt: TransactionReceipt;
}
