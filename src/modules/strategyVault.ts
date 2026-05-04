/**
 * StrategyVault Module — Kairos fixed-strike + CLVEX directional/condor vaults on Base
 *
 * Wraps 5 Kairos fixed-strike vaults and 3 CLVEX directional/condor strategy vaults,
 * all sharing the same BaseVault interface. Uses Multicall3 for efficient batched reads.
 *
 * @example
 * ```typescript
 * const client = new ThetanutsClient({ chainId: 8453, provider, signer });
 *
 * // Get all vault states in one RPC call
 * const vaults = await client.strategyVault.getAllVaults();
 *
 * // Deposit into a Kairos vault
 * const result = await client.strategyVault.deposit(
 *   '0x5189180C5Bb1bB54f8479a6aeFdFFEd66Ea0951b',
 *   ethers.parseUnits('1.0', 18),
 *   0,
 * );
 *
 * // Check if a new epoch can be triggered
 * const canCreate = await client.strategyVault.canCreateOption(vaultAddress);
 * ```
 */

import { Contract, Interface } from 'ethers';
import type { ContractTransactionResponse } from 'ethers';

import type { ThetanutsClient } from '../client/ThetanutsClient.js';
import { STRATEGY_VAULT_ABI } from '../abis/strategyVault.js';
import { STRATEGY_VAULT_CONFIG } from '../chains/strategyVault.js';
import { createError, mapContractError } from '../utils/errors.js';
import { validateAddress } from '../utils/validation.js';
import type {
  StrategyVaultState,
  StrategyVaultAssets,
  StrategyVaultDepositResult,
  StrategyVaultWithdrawResult,
  StrategyVaultCreateOptionResult,
} from '../types/strategyVault.js';

// ─── Constants ───

const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[] returnData)',
];

// ─── Typed Contract Interfaces ───

interface VaultReadContract {
  name(): Promise<string>;
  symbol(): Promise<string>;
  totalSupply(): Promise<bigint>;
  getTotalAssets(): Promise<{
    assetValues: bigint[];
    pendingDepositValues: bigint[];
    optionCollateralValues: bigint[];
    totalAssets: bigint;
  }>;
  isRfqActive(): Promise<boolean>;
  activeRfqId(): Promise<bigint>;
  getActiveOptionsLengths(): Promise<bigint[]>;
  getNextExpiryTimestamp(): Promise<bigint>;
  balanceOf(account: string): Promise<bigint>;
}

interface VaultWriteContract {
  deposit: {
    (amount: bigint, assetIndex: number): Promise<ContractTransactionResponse>;
    (amount: bigint, assetIndex: number, overrides: { gasLimit: bigint }): Promise<ContractTransactionResponse>;
    estimateGas(amount: bigint, assetIndex: number): Promise<bigint>;
  };
  withdraw: {
    (shares: bigint): Promise<ContractTransactionResponse>;
    (shares: bigint, overrides: { gasLimit: bigint }): Promise<ContractTransactionResponse>;
    estimateGas(shares: bigint): Promise<bigint>;
  };
  createOption: {
    (): Promise<ContractTransactionResponse>;
    (overrides: { gasLimit: bigint }): Promise<ContractTransactionResponse>;
    estimateGas(): Promise<bigint>;
  };
}

interface Multicall3Contract {
  aggregate3(
    calls: { target: string; allowFailure: boolean; callData: string }[],
  ): Promise<{ success: boolean; returnData: string }[]>;
}

// ─── Module ───

export class StrategyVaultModule {
  private readonly _disabled: boolean;
  private readonly vaultIface: Interface;

  constructor(private readonly client: ThetanutsClient) {
    this._disabled = client.chainId !== STRATEGY_VAULT_CONFIG.chainId;
    this.vaultIface = new Interface(STRATEGY_VAULT_ABI);
  }

  // ─── Private Helpers ───

  private ensureEnabled(): void {
    if (this._disabled) {
      throw createError(
        'NETWORK_UNSUPPORTED',
        `StrategyVault module requires chain ${STRATEGY_VAULT_CONFIG.chainId} (${STRATEGY_VAULT_CONFIG.chainName}), but client is on chain ${this.client.chainId}`,
      );
    }
  }

  private getConfiguredVaultAddresses(): string[] {
    return [
      ...STRATEGY_VAULT_CONFIG.kairos.vaults.map((vault) => vault.address),
      ...STRATEGY_VAULT_CONFIG.clvex.vaults.map((vault) => vault.address),
    ];
  }

  private validateConfiguredVault(address: string): void {
    validateAddress(address, 'vaultAddress');
    const normalized = address.toLowerCase();
    if (!this.getConfiguredVaultAddresses().some((vaultAddress) => vaultAddress.toLowerCase() === normalized)) {
      throw createError(
        'INVALID_PARAMS',
        'vaultAddress is not a configured strategy vault address'
      );
    }
  }

  private getVaultReadContract(vaultAddress: string): VaultReadContract {
    return new Contract(
      vaultAddress,
      STRATEGY_VAULT_ABI,
      this.client.provider,
    ) as unknown as VaultReadContract;
  }

  private getVaultWriteContract(vaultAddress: string): VaultWriteContract {
    const signer = this.client.requireSigner();
    return new Contract(
      vaultAddress,
      STRATEGY_VAULT_ABI,
      signer,
    ) as unknown as VaultWriteContract;
  }

  private getMulticall3(): Multicall3Contract {
    return new Contract(
      MULTICALL3_ADDRESS,
      MULTICALL3_ABI,
      this.client.provider,
    ) as unknown as Multicall3Contract;
  }

  // ═══════════════════════════════════════════
  // Vault Reads
  // ═══════════════════════════════════════════

  /**
   * Get the full state of a single vault using a batched Multicall3 call.
   *
   * Reads name, symbol, totalSupply, getTotalAssets, isRfqActive, activeRfqId,
   * getActiveOptionsLengths, and getNextExpiryTimestamp in one RPC round-trip.
   *
   * @param vaultAddress - The vault contract address
   * @returns Complete vault state including derived canCreateOption flag
   * @example
   * ```typescript
   * const state = await client.strategyVault.getVaultState('0x5189...');
   * console.log(`${state.name}: TVL = ${state.assets.totalAssets}`);
   * ```
   */
  async getVaultState(vaultAddress: string): Promise<StrategyVaultState> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    const calls = [
      { fragment: 'name', args: [] },
      { fragment: 'symbol', args: [] },
      { fragment: 'totalSupply', args: [] },
      { fragment: 'getTotalAssets', args: [] },
      { fragment: 'isRfqActive', args: [] },
      { fragment: 'activeRfqId', args: [] },
      { fragment: 'getActiveOptionsLengths', args: [] },
      { fragment: 'getNextExpiryTimestamp', args: [] },
    ];

    const encodedCalls = calls.map((call) => ({
      target: vaultAddress,
      allowFailure: false,
      callData: this.vaultIface.encodeFunctionData(call.fragment, call.args),
    }));

    try {
      const multicall = this.getMulticall3();
      const results: { success: boolean; returnData: string }[] =
        await multicall.aggregate3(encodedCalls);

      const name = this.vaultIface.decodeFunctionResult('name', results[0]!.returnData)[0] as string;
      const symbol = this.vaultIface.decodeFunctionResult('symbol', results[1]!.returnData)[0] as string;
      const totalSupply = this.vaultIface.decodeFunctionResult('totalSupply', results[2]!.returnData)[0] as bigint;

      const assetsResult = this.vaultIface.decodeFunctionResult('getTotalAssets', results[3]!.returnData);
      const assets: StrategyVaultAssets = {
        assetValues: assetsResult[0] as bigint[],
        pendingDepositValues: assetsResult[1] as bigint[],
        optionCollateralValues: assetsResult[2] as bigint[],
        totalAssets: assetsResult[3] as bigint,
      };

      const isRfqActive = this.vaultIface.decodeFunctionResult('isRfqActive', results[4]!.returnData)[0] as boolean;
      const activeRfqId = this.vaultIface.decodeFunctionResult('activeRfqId', results[5]!.returnData)[0] as bigint;
      const activeOptionsLengths = this.vaultIface.decodeFunctionResult('getActiveOptionsLengths', results[6]!.returnData)[0] as bigint[];
      const nextExpiryTimestamp = Number(
        this.vaultIface.decodeFunctionResult('getNextExpiryTimestamp', results[7]!.returnData)[0] as bigint,
      );

      const hasActiveOptions = activeOptionsLengths.some((len) => len > 0n);
      const canCreateOption = !isRfqActive && !hasActiveOptions;

      return {
        address: vaultAddress,
        name,
        symbol,
        totalSupply,
        assets,
        isRfqActive,
        activeRfqId,
        activeOptionsLengths,
        hasActiveOptions,
        canCreateOption,
        nextExpiryTimestamp,
      };
    } catch (error) {
      this.client.logger.error('Failed to get vault state', { error, vaultAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get the total asset breakdown of a vault.
   *
   * @param vaultAddress - The vault contract address
   * @returns Asset values, pending deposits, option collateral, and total
   */
  async getTotalAssets(vaultAddress: string): Promise<StrategyVaultAssets> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    try {
      const contract = this.getVaultReadContract(vaultAddress);
      const result = await contract.getTotalAssets();
      return {
        assetValues: result.assetValues,
        pendingDepositValues: result.pendingDepositValues,
        optionCollateralValues: result.optionCollateralValues,
        totalAssets: result.totalAssets,
      };
    } catch (error) {
      this.client.logger.error('Failed to get total assets', { error, vaultAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get the vault share balance of a user.
   *
   * @param vaultAddress - The vault contract address
   * @param userAddress - The user's wallet address
   * @returns Share balance as bigint
   */
  async getShareBalance(vaultAddress: string, userAddress: string): Promise<bigint> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);
    validateAddress(userAddress, 'userAddress');

    try {
      const contract = this.getVaultReadContract(vaultAddress);
      return await contract.balanceOf(userAddress);
    } catch (error) {
      this.client.logger.error('Failed to get share balance', { error, vaultAddress, userAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Get the next expiry timestamp for a vault.
   *
   * @param vaultAddress - The vault contract address
   * @returns Unix timestamp (seconds) of the next expiry
   */
  async getNextExpiry(vaultAddress: string): Promise<number> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    try {
      const contract = this.getVaultReadContract(vaultAddress);
      const ts = await contract.getNextExpiryTimestamp();
      return Number(ts);
    } catch (error) {
      this.client.logger.error('Failed to get next expiry', { error, vaultAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Check whether a new option epoch can be created for the vault.
   * Returns true when isRfqActive is false AND all active option lengths are zero.
   *
   * @param vaultAddress - The vault contract address
   * @returns true if createOption() can be called
   */
  async canCreateOption(vaultAddress: string): Promise<boolean> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    try {
      const contract = this.getVaultReadContract(vaultAddress);
      const [rfqActive, lengths] = await Promise.all([
        contract.isRfqActive(),
        contract.getActiveOptionsLengths(),
      ]);
      const totalActiveOptions = lengths.reduce((sum, len) => sum + len, 0n);
      return !rfqActive && totalActiveOptions === 0n;
    } catch (error) {
      this.client.logger.error('Failed to check canCreateOption', { error, vaultAddress });
      throw mapContractError(error);
    }
  }

  /**
   * Check whether the vault is in recovery mode.
   * Recovery mode is inferred when there are no active options, no RFQ,
   * and the next expiry timestamp is in the past.
   *
   * @param vaultAddress - The vault contract address
   * @returns true if the vault appears to be in recovery mode
   */
  async isRecoveryMode(vaultAddress: string): Promise<boolean> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    try {
      const contract = this.getVaultReadContract(vaultAddress);
      const [rfqActive, lengths, nextExpiry] = await Promise.all([
        contract.isRfqActive(),
        contract.getActiveOptionsLengths(),
        contract.getNextExpiryTimestamp(),
      ]);
      const totalActiveOptions = lengths.reduce((sum, len) => sum + len, 0n);
      const now = Math.floor(Date.now() / 1000);
      return !rfqActive && totalActiveOptions === 0n && Number(nextExpiry) < now;
    } catch (error) {
      this.client.logger.error('Failed to check recovery mode', { error, vaultAddress });
      throw mapContractError(error);
    }
  }

  // ═══════════════════════════════════════════
  // Vault Writes
  // ═══════════════════════════════════════════

  /**
   * Deposit assets into a strategy vault.
   *
   * @param vaultAddress - The vault contract address
   * @param amount - Amount to deposit (in asset's native decimals)
   * @param assetIndex - Index of the asset to deposit (0 = base, 1 = quote, etc.)
   * @returns Transaction receipt
   * @throws {SignerRequiredError} If no signer is attached
   * @example
   * ```typescript
   * // Deposit 1 aBasWETH into a Kairos vault
   * const result = await client.strategyVault.deposit(
   *   '0x5189180C5Bb1bB54f8479a6aeFdFFEd66Ea0951b',
   *   ethers.parseUnits('1.0', 18),
   *   0,
   * );
   * console.log(`Deposited: ${result.receipt.hash}`);
   * ```
   */
  async deposit(
    vaultAddress: string,
    amount: bigint,
    assetIndex: number,
  ): Promise<StrategyVaultDepositResult> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    if (amount <= 0n) {
      throw createError('INVALID_PARAMS', 'Deposit amount must be greater than zero');
    }

    const contract = this.getVaultWriteContract(vaultAddress);

    try {
      const gasEstimate = await contract.deposit.estimateGas(amount, assetIndex);
      const gasLimit = (gasEstimate * 120n) / 100n;
      const tx = await contract.deposit(amount, assetIndex, { gasLimit });
      const receipt = await tx.wait();

      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'No receipt returned from deposit');
      }

      this.client.logger.info('Vault deposit successful', {
        txHash: receipt.hash,
        vaultAddress,
        amount: amount.toString(),
        assetIndex,
      });

      return { receipt };
    } catch (error) {
      this.client.logger.error('Failed to deposit into vault', { error, vaultAddress, amount: amount.toString() });
      throw mapContractError(error);
    }
  }

  /**
   * Withdraw shares from a strategy vault.
   *
   * @param vaultAddress - The vault contract address
   * @param shares - Number of vault shares to withdraw
   * @returns Transaction receipt
   * @throws {SignerRequiredError} If no signer is attached
   * @example
   * ```typescript
   * const balance = await client.strategyVault.getShareBalance(vaultAddr, myAddr);
   * const result = await client.strategyVault.withdraw(vaultAddr, balance);
   * console.log(`Withdrew: ${result.receipt.hash}`);
   * ```
   */
  async withdraw(
    vaultAddress: string,
    shares: bigint,
  ): Promise<StrategyVaultWithdrawResult> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    if (shares <= 0n) {
      throw createError('INVALID_PARAMS', 'Shares amount must be greater than zero');
    }

    const contract = this.getVaultWriteContract(vaultAddress);

    try {
      const gasEstimate = await contract.withdraw.estimateGas(shares);
      const gasLimit = (gasEstimate * 120n) / 100n;
      const tx = await contract.withdraw(shares, { gasLimit });
      const receipt = await tx.wait();

      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'No receipt returned from withdraw');
      }

      this.client.logger.info('Vault withdrawal successful', {
        txHash: receipt.hash,
        vaultAddress,
        shares: shares.toString(),
      });

      return { receipt };
    } catch (error) {
      this.client.logger.error('Failed to withdraw from vault', { error, vaultAddress, shares: shares.toString() });
      throw mapContractError(error);
    }
  }

  /**
   * Trigger the creation of a new option epoch for the vault.
   * This is a permissionless call — anyone can trigger it when the vault is ready.
   *
   * @param vaultAddress - The vault contract address
   * @returns Transaction receipt
   * @throws {SignerRequiredError} If no signer is attached
   * @example
   * ```typescript
   * const canCreate = await client.strategyVault.canCreateOption(vaultAddr);
   * if (canCreate) {
   *   const result = await client.strategyVault.createOption(vaultAddr);
   *   console.log(`Epoch triggered: ${result.receipt.hash}`);
   * }
   * ```
   */
  async createOption(vaultAddress: string): Promise<StrategyVaultCreateOptionResult> {
    this.ensureEnabled();
    this.validateConfiguredVault(vaultAddress);

    const contract = this.getVaultWriteContract(vaultAddress);

    try {
      const gasEstimate = await contract.createOption.estimateGas();
      const gasLimit = (gasEstimate * 120n) / 100n;
      const tx = await contract.createOption({ gasLimit });
      const receipt = await tx.wait();

      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'No receipt returned from createOption');
      }

      this.client.logger.info('Option epoch created', {
        txHash: receipt.hash,
        vaultAddress,
      });

      return { receipt };
    } catch (error) {
      this.client.logger.error('Failed to create option', { error, vaultAddress });
      throw mapContractError(error);
    }
  }

  // ═══════════════════════════════════════════
  // Batch Reads
  // ═══════════════════════════════════════════

  /**
   * Get the full state of multiple vaults in a single Multicall3 RPC call.
   * Encodes all reads for all vaults into one aggregate3 call for maximum efficiency.
   *
   * @param vaultAddresses - Array of vault contract addresses
   * @returns Array of vault states in the same order as input addresses
   * @example
   * ```typescript
   * const states = await client.strategyVault.getAllVaultStates([
   *   '0x5189180C5Bb1bB54f8479a6aeFdFFEd66Ea0951b',
   *   '0xeD4c7897D5f1BD8cD00297B3348Fe558D2ABF2Ff',
   * ]);
   * ```
   */
  async getAllVaultStates(vaultAddresses: string[]): Promise<StrategyVaultState[]> {
    this.ensureEnabled();

    if (vaultAddresses.length === 0) {
      return [];
    }

    for (const addr of vaultAddresses) {
      this.validateConfiguredVault(addr);
    }

    const fragmentNames = [
      'name',
      'symbol',
      'totalSupply',
      'getTotalAssets',
      'isRfqActive',
      'activeRfqId',
      'getActiveOptionsLengths',
      'getNextExpiryTimestamp',
    ];

    const callsPerVault = fragmentNames.length;

    const encodedCalls: { target: string; allowFailure: boolean; callData: string }[] = [];
    for (const addr of vaultAddresses) {
      for (const fragment of fragmentNames) {
        encodedCalls.push({
          target: addr,
          allowFailure: false,
          callData: this.vaultIface.encodeFunctionData(fragment, []),
        });
      }
    }

    try {
      const multicall = this.getMulticall3();
      const results: { success: boolean; returnData: string }[] =
        await multicall.aggregate3(encodedCalls);

      const states: StrategyVaultState[] = [];

      for (let i = 0; i < vaultAddresses.length; i++) {
        const offset = i * callsPerVault;
        const vaultAddress = vaultAddresses[i]!;

        const name = this.vaultIface.decodeFunctionResult('name', results[offset]!.returnData)[0] as string;
        const symbol = this.vaultIface.decodeFunctionResult('symbol', results[offset + 1]!.returnData)[0] as string;
        const totalSupply = this.vaultIface.decodeFunctionResult('totalSupply', results[offset + 2]!.returnData)[0] as bigint;

        const assetsResult = this.vaultIface.decodeFunctionResult('getTotalAssets', results[offset + 3]!.returnData);
        const assets: StrategyVaultAssets = {
          assetValues: assetsResult[0] as bigint[],
          pendingDepositValues: assetsResult[1] as bigint[],
          optionCollateralValues: assetsResult[2] as bigint[],
          totalAssets: assetsResult[3] as bigint,
        };

        const isRfqActive = this.vaultIface.decodeFunctionResult('isRfqActive', results[offset + 4]!.returnData)[0] as boolean;
        const activeRfqId = this.vaultIface.decodeFunctionResult('activeRfqId', results[offset + 5]!.returnData)[0] as bigint;
        const activeOptionsLengths = this.vaultIface.decodeFunctionResult('getActiveOptionsLengths', results[offset + 6]!.returnData)[0] as bigint[];
        const nextExpiryTimestamp = Number(
          this.vaultIface.decodeFunctionResult('getNextExpiryTimestamp', results[offset + 7]!.returnData)[0] as bigint,
        );

        const hasActiveOptions = activeOptionsLengths.some((len) => len > 0n);
        const canCreateOption = !isRfqActive && !hasActiveOptions;

        states.push({
          address: vaultAddress,
          name,
          symbol,
          totalSupply,
          assets,
          isRfqActive,
          activeRfqId,
          activeOptionsLengths,
          hasActiveOptions,
          canCreateOption,
          nextExpiryTimestamp,
        });
      }

      this.client.logger.info('Batch vault state fetch complete', {
        vaultCount: vaultAddresses.length,
      });

      return states;
    } catch (error) {
      this.client.logger.error('Failed to get batch vault states', { error, vaultCount: vaultAddresses.length });
      throw mapContractError(error);
    }
  }

  // ═══════════════════════════════════════════
  // Convenience Methods
  // ═══════════════════════════════════════════

  /**
   * Get the state of all 5 Kairos fixed-strike vaults.
   *
   * @returns Array of vault states for all Kairos vaults
   * @example
   * ```typescript
   * const kairos = await client.strategyVault.getKairosVaults();
   * for (const v of kairos) {
   *   console.log(`${v.name}: TVL = ${v.assets.totalAssets}`);
   * }
   * ```
   */
  async getKairosVaults(): Promise<StrategyVaultState[]> {
    const addresses = STRATEGY_VAULT_CONFIG.kairos.vaults.map((v) => v.address);
    return this.getAllVaultStates(addresses);
  }

  /**
   * Get the state of all 3 CLVEX directional/condor strategy vaults.
   *
   * @returns Array of vault states for all CLVEX vaults
   * @example
   * ```typescript
   * const clvex = await client.strategyVault.getClvexVaults();
   * for (const v of clvex) {
   *   console.log(`${v.name}: canCreateOption = ${v.canCreateOption}`);
   * }
   * ```
   */
  async getClvexVaults(): Promise<StrategyVaultState[]> {
    const addresses = STRATEGY_VAULT_CONFIG.clvex.vaults.map((v) => v.address);
    return this.getAllVaultStates(addresses);
  }

  /**
   * Get the state of all 8 strategy vaults (5 Kairos + 3 CLVEX) in a single RPC call.
   *
   * @returns Array of all vault states
   * @example
   * ```typescript
   * const all = await client.strategyVault.getAllVaults();
   * console.log(`Total vaults: ${all.length}`);
   * ```
   */
  async getAllVaults(): Promise<StrategyVaultState[]> {
    const kairosAddresses = STRATEGY_VAULT_CONFIG.kairos.vaults.map((v) => v.address);
    const clvexAddresses = STRATEGY_VAULT_CONFIG.clvex.vaults.map((v) => v.address);
    return this.getAllVaultStates([...kairosAddresses, ...clvexAddresses]);
  }
}
