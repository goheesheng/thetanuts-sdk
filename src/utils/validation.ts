import { isAddress } from 'ethers';
import { createError } from './errors.js';

/**
 * Validate that a value is a valid Ethereum address
 */
export function validateAddress(address: string, fieldName: string): void {
  if (!isAddress(address)) {
    const invalidAddress = address as string;
    throw createError(
      'INVALID_PARAMS',
      `Invalid ${fieldName}: ${invalidAddress} is not a valid Ethereum address`
    );
  }
}

/**
 * Validate that an order has not expired
 */
export function validateOrderExpiry(expiry: number, bufferSeconds = 60): void {
  const now = Math.floor(Date.now() / 1000);
  if (expiry <= now + bufferSeconds) {
    throw createError(
      'ORDER_EXPIRED',
      `Order has expired or will expire within ${bufferSeconds} seconds`,
      undefined,
      { expiry, now, bufferSeconds }
    );
  }
}

/**
 * Validate that requested fill size is within available size
 */
export function validateFillSize(
  requestedSize: bigint,
  availableSize: bigint,
  minSize?: bigint
): void {
  if (requestedSize <= 0n) {
    throw createError('INVALID_PARAMS', 'Fill size must be greater than 0');
  }

  if (requestedSize > availableSize) {
    throw createError(
      'SIZE_EXCEEDED',
      `Requested size ${requestedSize.toString()} exceeds available size ${availableSize.toString()}`,
      undefined,
      { requestedSize: requestedSize.toString(), availableSize: availableSize.toString() }
    );
  }

  if (minSize !== undefined && requestedSize < minSize) {
    throw createError(
      'INVALID_PARAMS',
      `Requested size ${requestedSize.toString()} is below minimum size ${minSize.toString()}`,
      undefined,
      { requestedSize: requestedSize.toString(), minSize: minSize.toString() }
    );
  }
}

/**
 * Validate slippage check for buy orders
 * @param actualPrice The actual price from the order
 * @param maxPrice Maximum price the buyer is willing to pay
 */
export function validateBuySlippage(actualPrice: bigint, maxPrice: bigint): void {
  if (actualPrice > maxPrice) {
    throw createError(
      'SLIPPAGE_EXCEEDED',
      `Price ${actualPrice.toString()} exceeds maximum allowed price ${maxPrice.toString()}`,
      undefined,
      { actualPrice: actualPrice.toString(), maxPrice: maxPrice.toString() }
    );
  }
}

/**
 * Validate slippage check for sell orders
 * @param actualPrice The actual price from the order
 * @param minPrice Minimum price the seller is willing to accept
 */
export function validateSellSlippage(actualPrice: bigint, minPrice: bigint): void {
  if (actualPrice < minPrice) {
    throw createError(
      'SLIPPAGE_EXCEEDED',
      `Price ${actualPrice.toString()} is below minimum acceptable price ${minPrice.toString()}`,
      undefined,
      { actualPrice: actualPrice.toString(), minPrice: minPrice.toString() }
    );
  }
}

/**
 * Calculate slippage-adjusted price
 * @param price Base price
 * @param slippageBps Slippage tolerance in basis points (e.g., 50 = 0.5%)
 * @param isBuy Whether this is a buy order (adds slippage) or sell (subtracts)
 */
export function calculateSlippagePrice(
  price: bigint,
  slippageBps: number,
  isBuy: boolean
): bigint {
  const basisPoints = 10000n;
  const slippage = BigInt(slippageBps);

  if (isBuy) {
    // For buys, add slippage to get max price
    return (price * (basisPoints + slippage)) / basisPoints;
  } else {
    // For sells, subtract slippage to get min price
    return (price * (basisPoints - slippage)) / basisPoints;
  }
}
