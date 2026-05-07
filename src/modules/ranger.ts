import { Contract } from 'ethers';
import type { ContractTransactionResponse, TransactionReceipt } from 'ethers';

import type { ThetanutsClient } from '../client/ThetanutsClient.js';
import { RANGER_OPTION_ABI } from '../abis/ranger.js';
import { createError, mapContractError } from '../utils/errors.js';
import { validateAddress } from '../utils/validation.js';

interface RangerContract {
  // ─── Identity / metadata ───
  buyer(): Promise<string>;
  seller(): Promise<string>;
  creator(): Promise<string>;
  collateralToken(): Promise<string>;
  collateralAmount(): Promise<bigint>;
  numContracts(): Promise<bigint>;
  expiryTimestamp(): Promise<bigint>;
  chainlinkPriceFeed(): Promise<string>;
  historicalTWAPConsumer(): Promise<string>;
  twapPeriod(): Promise<bigint>;
  optionType(): Promise<bigint>;
  optionSettled(): Promise<boolean>;
  paramsHash(): Promise<string>;
  splitGeneration(): Promise<bigint>;
  optionParent(): Promise<string>;
  factory(): Promise<string>;
  rescueAddress(): Promise<string>;
  getImplementation(): Promise<string>;
  getStrikes(): Promise<bigint[]>;

  // ─── Ranger-specific ───
  getZone(): Promise<[bigint, bigint]>;
  getSpreadWidth(): Promise<bigint>;

  // ─── Pricing / payout ───
  getTWAP(): Promise<bigint>;
  calculatePayout(price: bigint): Promise<bigint>;
  simulatePayout(price: bigint, strikes: bigint[], numContracts: bigint): Promise<bigint>;
  calculateRequiredCollateral(strikes: bigint[], numContracts: bigint): Promise<bigint>;
  /**
   * Returns the fee (chain-native units) the contract will demand as
   * msg.value when reclaiming collateral from the option at `ownedOption`.
   * The fee is a property of the option being reclaimed, not the caller.
   */
  getReclaimFee(ownedOption: string): Promise<bigint>;
  getSplitFee(): Promise<bigint>;

  // ─── Writes ───
  payout(): Promise<ContractTransactionResponse>;
  close(): Promise<ContractTransactionResponse>;
  split(splitCollateralAmount: bigint, overrides?: { value?: bigint }): Promise<ContractTransactionResponse>;
  transfer(isBuyer: boolean, target: string): Promise<ContractTransactionResponse>;
  reclaimCollateral(ownedOption: string, overrides?: { value?: bigint }): Promise<ContractTransactionResponse>;
  returnExcessCollateral(): Promise<ContractTransactionResponse>;
}

/**
 * Snapshot of an on-chain Ranger option's state.
 */
export interface RangerInfo {
  buyer: string;
  seller: string;
  creator: string;
  collateralToken: string;
  collateralAmount: bigint;
  numContracts: bigint;
  expiryTimestamp: bigint;
  chainlinkPriceFeed: string;
  /** Strikes that define the ranger's payoff curve (4 strikes). */
  strikes: bigint[];
  /** Zone bounds (zoneLower, zoneUpper) — payout area for the buyer. */
  zone: { zoneLower: bigint; zoneUpper: bigint };
  /** Width of each spread leg, in price units. */
  spreadWidth: bigint;
  /** True after settlement has been called and finalized. */
  optionSettled: boolean;
}

/**
 * Module for RangerOption (zone-bound payoff) contract interactions.
 *
 * Ranger options are 4-strike, zone-bound payoffs deployed in r12. Each
 * Ranger has a lower and upper "zone" defined by strikes[1] and strikes[2];
 * the payoff is maximal inside that zone and decays linearly outside.
 *
 * @example
 * ```typescript
 * const info = await client.ranger.getInfo(rangerAddress);
 * if (info.expiryTimestamp <= BigInt(Math.floor(Date.now() / 1000))) {
 *   await client.ranger.payout(rangerAddress);
 * }
 * ```
 */
export class RangerModule {
  private contractCache = new Map<string, RangerContract>();
  private readonly _disabled: boolean;

  constructor(private readonly client: ThetanutsClient) {
    // RANGER is registered in chainConfig.implementations only on chains
    // where the on-chain RangerOption is deployed. On chains without it
    // (Ethereum mainnet today), every method throws NETWORK_UNSUPPORTED
    // up front instead of failing deep inside ethers with a cryptic
    // eth_call error. Treat both an unset value and the zero-address
    // placeholder as disabled, so a custom or partially-populated
    // chain config can't smuggle a 0x0…0 implementation past the guard.
    // Comparison is case-insensitive: ethers normalizes addresses on
    // read but a hand-typed config could use mixed case.
    const ranger = client.chainConfig.implementations.RANGER;
    this._disabled = !ranger || ranger.toLowerCase() === '0x0000000000000000000000000000000000000000';
  }

  private ensureEnabled(): void {
    if (this._disabled) {
      throw createError(
        'NETWORK_UNSUPPORTED',
        `RangerModule requires a chain with RangerOption deployed; chainId ${this.client.chainId} has no RANGER implementation.`,
      );
    }
  }

  private getReadContract(rangerAddress: string): RangerContract {
    const cacheKey = rangerAddress.toLowerCase();
    let contract = this.contractCache.get(cacheKey);
    if (!contract) {
      contract = new Contract(
        rangerAddress,
        RANGER_OPTION_ABI,
        this.client.provider,
      ) as unknown as RangerContract;
      this.contractCache.set(cacheKey, contract);
    }
    return contract;
  }

  private getWriteContract(rangerAddress: string): RangerContract {
    const signer = this.client.requireSigner();
    return new Contract(
      rangerAddress,
      RANGER_OPTION_ABI,
      signer,
    ) as unknown as RangerContract;
  }

  // ────────────────── Reads ──────────────────

  /**
   * Get a structured snapshot of a Ranger option.
   */
  async getInfo(rangerAddress: string): Promise<RangerInfo> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    const contract = this.getReadContract(rangerAddress);

    try {
      const [
        buyer, seller, creator,
        collateralToken, collateralAmount, numContracts, expiryTimestamp,
        chainlinkPriceFeed, strikes, zone, spreadWidth, optionSettled,
      ] = await Promise.all([
        contract.buyer(),
        contract.seller(),
        contract.creator(),
        contract.collateralToken(),
        contract.collateralAmount(),
        contract.numContracts(),
        contract.expiryTimestamp(),
        contract.chainlinkPriceFeed(),
        contract.getStrikes(),
        contract.getZone(),
        contract.getSpreadWidth(),
        contract.optionSettled(),
      ]);

      return {
        buyer, seller, creator,
        collateralToken, collateralAmount, numContracts, expiryTimestamp,
        chainlinkPriceFeed, strikes,
        zone: { zoneLower: zone[0], zoneUpper: zone[1] },
        spreadWidth,
        optionSettled,
      };
    } catch (error) {
      this.client.logger.error('Failed to read Ranger info', { error, rangerAddress });
      throw mapContractError(error);
    }
  }

  /** Strikes (4 values) defining the ranger's payoff curve. */
  async getStrikes(rangerAddress: string): Promise<bigint[]> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).getStrikes();
  }

  /** Zone bounds: { zoneLower, zoneUpper } — buyer's max-payout range. */
  async getZone(rangerAddress: string): Promise<{ zoneLower: bigint; zoneUpper: bigint }> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    const [zoneLower, zoneUpper] = await this.getReadContract(rangerAddress).getZone();
    return { zoneLower, zoneUpper };
  }

  /** Per-leg spread width. */
  async getSpreadWidth(rangerAddress: string): Promise<bigint> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).getSpreadWidth();
  }

  /** Current TWAP from the configured Chainlink consumer. */
  async getTWAP(rangerAddress: string): Promise<bigint> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).getTWAP();
  }

  /** Compute payout at a given settlement price using on-chain logic. */
  async calculatePayout(rangerAddress: string, price: bigint): Promise<bigint> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).calculatePayout(price);
  }

  /**
   * Simulate the payout for hypothetical strikes / numContracts at a price.
   * Pure function — does not require the option to be initialized.
   */
  async simulatePayout(
    rangerAddress: string,
    price: bigint,
    strikes: bigint[],
    numContracts: bigint,
  ): Promise<bigint> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).simulatePayout(price, strikes, numContracts);
  }

  /** Compute the collateral required for a given strikes/numContracts pair. */
  async calculateRequiredCollateral(
    rangerAddress: string,
    strikes: bigint[],
    numContracts: bigint,
  ): Promise<bigint> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).calculateRequiredCollateral(strikes, numContracts);
  }

  // ────────────────── Writes ──────────────────

  /** Execute payout after expiry — claims the buyer's settlement. */
  async payout(rangerAddress: string): Promise<TransactionReceipt> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    try {
      const contract = this.getWriteContract(rangerAddress);
      const tx = await contract.payout();
      const receipt = await tx.wait();
      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'Transaction failed - no receipt returned');
      }
      this.client.logger.info('Ranger payout executed', { rangerAddress, txHash: receipt.hash });
      return receipt;
    } catch (error) {
      this.client.logger.error('Ranger payout failed', { error, rangerAddress });
      throw mapContractError(error);
    }
  }

  /** Close a Ranger position before expiry (mutual cancellation). */
  async close(rangerAddress: string): Promise<TransactionReceipt> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    try {
      const contract = this.getWriteContract(rangerAddress);
      const tx = await contract.close();
      const receipt = await tx.wait();
      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'Transaction failed - no receipt returned');
      }
      this.client.logger.info('Ranger position closed', { rangerAddress, txHash: receipt.hash });
      return receipt;
    } catch (error) {
      this.client.logger.error('Ranger close failed', { error, rangerAddress });
      throw mapContractError(error);
    }
  }

  /** Split a Ranger by a portion of its collateral; returns the new child option address. */
  async split(rangerAddress: string, splitCollateralAmount: bigint): Promise<TransactionReceipt> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    if (splitCollateralAmount <= 0n) {
      throw createError('INVALID_PARAMS', 'Split collateral amount must be positive');
    }
    try {
      // r12 split() is payable: forward getSplitFee() as msg.value.
      const readContract = this.getReadContract(rangerAddress);
      const splitFee = await readContract.getSplitFee();

      const contract = this.getWriteContract(rangerAddress);
      const tx = await contract.split(splitCollateralAmount, { value: splitFee });
      const receipt = await tx.wait();
      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'Transaction failed - no receipt returned');
      }
      this.client.logger.info('Ranger position split', {
        rangerAddress,
        txHash: receipt.hash,
        splitFee: splitFee.toString(),
      });
      return receipt;
    } catch (error) {
      this.client.logger.error('Ranger split failed', { error, rangerAddress });
      throw mapContractError(error);
    }
  }

  /** Transfer the buyer or seller side of a Ranger position to another address. */
  async transfer(
    rangerAddress: string,
    isBuyer: boolean,
    target: string,
  ): Promise<TransactionReceipt> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    validateAddress(target, 'target');
    try {
      const contract = this.getWriteContract(rangerAddress);
      const tx = await contract.transfer(isBuyer, target);
      const receipt = await tx.wait();
      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'Transaction failed - no receipt returned');
      }
      this.client.logger.info('Ranger position transferred', {
        rangerAddress, isBuyer, target, txHash: receipt.hash,
      });
      return receipt;
    } catch (error) {
      this.client.logger.error('Ranger transfer failed', { error, rangerAddress, target });
      throw mapContractError(error);
    }
  }

  /**
   * Reclaim collateral from an owned option after settlement.
   *
   * @param rangerAddress - Ranger contract to call.
   * @param ownedOption  - Address of the option whose collateral the caller is reclaiming.
   *   In r12 the contract treats this as the owned position to reclaim from, not a transfer
   *   destination. The reclaimed collateral goes to the caller (the signer).
   *
   * Sends `getReclaimFee(ownedOption)` as msg.value — the r12 contract derives the fee
   * from the option being reclaimed, not from the caller.
   */
  async reclaimCollateral(
    rangerAddress: string,
    ownedOption: string,
  ): Promise<TransactionReceipt> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    validateAddress(ownedOption, 'ownedOption');
    try {
      // Caller must hold a signer to send the tx, but the fee is keyed on
      // the option being reclaimed, not on the caller.
      this.client.requireSigner();

      const readContract = this.getReadContract(rangerAddress);
      const reclaimFee = await readContract.getReclaimFee(ownedOption);

      const contract = this.getWriteContract(rangerAddress);
      const tx = await contract.reclaimCollateral(ownedOption, { value: reclaimFee });
      const receipt = await tx.wait();
      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'Transaction failed - no receipt returned');
      }
      this.client.logger.info('Ranger collateral reclaimed', {
        rangerAddress,
        ownedOption,
        reclaimFee: reclaimFee.toString(),
        txHash: receipt.hash,
      });
      return receipt;
    } catch (error) {
      this.client.logger.error('Ranger reclaim failed', { error, rangerAddress, ownedOption });
      throw mapContractError(error);
    }
  }

  /** Return any excess collateral the Ranger still holds. */
  async returnExcessCollateral(rangerAddress: string): Promise<TransactionReceipt> {
    this.ensureEnabled();
    validateAddress(rangerAddress, 'rangerAddress');
    try {
      const contract = this.getWriteContract(rangerAddress);
      const tx = await contract.returnExcessCollateral();
      const receipt = await tx.wait();
      if (!receipt) {
        throw createError('CONTRACT_REVERT', 'Transaction failed - no receipt returned');
      }
      this.client.logger.info('Ranger excess collateral returned', { rangerAddress, txHash: receipt.hash });
      return receipt;
    } catch (error) {
      this.client.logger.error('Ranger returnExcessCollateral failed', { error, rangerAddress });
      throw mapContractError(error);
    }
  }
}
