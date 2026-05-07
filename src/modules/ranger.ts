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
  getReclaimFee(caller: string): Promise<bigint>;
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

  constructor(private readonly client: ThetanutsClient) {}

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
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).getStrikes();
  }

  /** Zone bounds: { zoneLower, zoneUpper } — buyer's max-payout range. */
  async getZone(rangerAddress: string): Promise<{ zoneLower: bigint; zoneUpper: bigint }> {
    validateAddress(rangerAddress, 'rangerAddress');
    const [zoneLower, zoneUpper] = await this.getReadContract(rangerAddress).getZone();
    return { zoneLower, zoneUpper };
  }

  /** Per-leg spread width. */
  async getSpreadWidth(rangerAddress: string): Promise<bigint> {
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).getSpreadWidth();
  }

  /** Current TWAP from the configured Chainlink consumer. */
  async getTWAP(rangerAddress: string): Promise<bigint> {
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).getTWAP();
  }

  /** Compute payout at a given settlement price using on-chain logic. */
  async calculatePayout(rangerAddress: string, price: bigint): Promise<bigint> {
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
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).simulatePayout(price, strikes, numContracts);
  }

  /** Compute the collateral required for a given strikes/numContracts pair. */
  async calculateRequiredCollateral(
    rangerAddress: string,
    strikes: bigint[],
    numContracts: bigint,
  ): Promise<bigint> {
    validateAddress(rangerAddress, 'rangerAddress');
    return this.getReadContract(rangerAddress).calculateRequiredCollateral(strikes, numContracts);
  }

  // ────────────────── Writes ──────────────────

  /** Execute payout after expiry — claims the buyer's settlement. */
  async payout(rangerAddress: string): Promise<TransactionReceipt> {
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
   * Sends `getReclaimFee(caller)` as msg.value (the r12 contract is payable).
   */
  async reclaimCollateral(
    rangerAddress: string,
    ownedOption: string,
  ): Promise<TransactionReceipt> {
    validateAddress(rangerAddress, 'rangerAddress');
    validateAddress(ownedOption, 'ownedOption');
    try {
      const signer = this.client.requireSigner();
      const callerAddress = await signer.getAddress();

      const readContract = this.getReadContract(rangerAddress);
      const reclaimFee = await readContract.getReclaimFee(callerAddress);

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
