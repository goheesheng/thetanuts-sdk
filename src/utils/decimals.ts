/**
 * Standard decimal configurations
 */
export const DECIMALS = {
  USDC: 6,
  WETH: 18,
  cbBTC: 8,
  PRICE: 8, // Standard price decimals (like Chainlink)
  OPTION_SIZE: 18, // Option contract size decimals
} as const;

/**
 * Convert a human-readable number to bigint with specified decimals
 */
export function toBigInt(value: number | string, decimals: number): bigint {
  const str = typeof value === 'number' ? value.toString() : value;
  const [whole, fraction = ''] = str.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Convert a bigint to a human-readable number string with specified decimals
 */
export function fromBigInt(value: bigint, decimals: number): string {
  const str = value.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, -decimals) || '0';
  const fraction = str.slice(-decimals);
  const trimmedFraction = fraction.replace(/0+$/, '');
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

/**
 * Scale a value from one decimal precision to another
 */
export function scaleDecimals(
  value: bigint,
  fromDecimals: number,
  toDecimals: number
): bigint {
  if (fromDecimals === toDecimals) {
    return value;
  }

  if (fromDecimals < toDecimals) {
    return value * 10n ** BigInt(toDecimals - fromDecimals);
  }

  return value / 10n ** BigInt(fromDecimals - toDecimals);
}

/**
 * Format a bigint value for display with the given decimals
 */
export function formatAmount(
  value: bigint,
  decimals: number,
  displayDecimals?: number
): string {
  const str = fromBigInt(value, decimals);
  if (displayDecimals === undefined) {
    return str;
  }

  const parts = str.split('.');
  const whole = parts[0] ?? '0';
  const fraction = parts[1] ?? '';
  const trimmedFraction = fraction.slice(0, displayDecimals);
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

/**
 * Parse an amount string into bigint with proper decimal handling
 */
export function parseAmount(amount: string, decimals: number): bigint {
  // Remove any commas
  const cleaned = amount.replace(/,/g, '');
  return toBigInt(cleaned, decimals);
}
