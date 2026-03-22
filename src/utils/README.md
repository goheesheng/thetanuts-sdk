# Utility Functions

This directory contains utility functions used throughout the SDK.

## Files Overview

| File | Purpose |
|------|---------|
| `decimals.ts` | Decimal conversion utilities |
| `errors.ts` | Error creation and handling |
| `logger.ts` | Logger implementations |
| `validation.ts` | Input validation functions |

---

## Decimal Utilities (`decimals.ts`)

### Constants

```typescript
const DECIMALS = {
  USDC: 6,           // USDC token decimals
  WETH: 18,          // Wrapped Ether decimals
  cbBTC: 8,          // Coinbase BTC decimals
  PRICE: 8,          // Chainlink price feed decimals
  OPTION_SIZE: 18,   // Option contract size decimals
};
```

### Functions

#### toBigInt

Convert a human-readable number to bigint with decimals.

```typescript
import { toBigInt, DECIMALS } from '@thetanuts/thetanuts-client';

// Convert 100.5 USDC to raw value
const rawUsdc = toBigInt('100.5', DECIMALS.USDC);
// Result: 100500000n

// Convert 1.5 ETH to raw value
const rawEth = toBigInt('1.5', DECIMALS.WETH);
// Result: 1500000000000000000n
```

#### fromBigInt

Convert a raw bigint to human-readable string.

```typescript
import { fromBigInt, DECIMALS } from '@thetanuts/thetanuts-client';

// Convert raw USDC to human-readable
const usdc = fromBigInt(100500000n, DECIMALS.USDC);
// Result: '100.5'

// Convert raw ETH to human-readable
const eth = fromBigInt(1500000000000000000n, DECIMALS.WETH);
// Result: '1.5'
```

#### scaleDecimals

Scale a value from one decimal precision to another.

```typescript
import { scaleDecimals, DECIMALS } from '@thetanuts/thetanuts-client';

// Scale from USDC (6) to WETH (18) decimals
const scaled = scaleDecimals(1000000n, DECIMALS.USDC, DECIMALS.WETH);
// Result: 1000000000000000000n

// Scale from WETH (18) to USDC (6) decimals
const downscaled = scaleDecimals(1000000000000000000n, DECIMALS.WETH, DECIMALS.USDC);
// Result: 1000000n
```

#### formatAmount

Format a bigint for display with optional decimal places.

```typescript
import { formatAmount, DECIMALS } from '@thetanuts/thetanuts-client';

const formatted = formatAmount(123456789n, DECIMALS.USDC, 2);
// Result: '123.46'
```

#### parseAmount

Parse a string amount to bigint.

```typescript
import { parseAmount, DECIMALS } from '@thetanuts/thetanuts-client';

const parsed = parseAmount('100.50', DECIMALS.USDC);
// Result: 100500000n
```

---

## Error Utilities (`errors.ts`)

### createError

Create a typed `ThetanutsError`.

```typescript
import { createError } from '@thetanuts/thetanuts-client';

throw createError('ORDER_EXPIRED', 'Order has expired');

// With cause
throw createError('CONTRACT_REVERT', 'Transaction failed', originalError);

// With metadata
throw createError('INVALID_PARAMS', 'Invalid amount', null, { amount: -1 });
```

### wrapError

Wrap an unknown error as `ThetanutsError`.

```typescript
import { wrapError } from '@thetanuts/thetanuts-client';

try {
  await someOperation();
} catch (error) {
  throw wrapError(error);
  // Always returns ThetanutsError
}
```

### isThetanutsError

Type guard to check if an error is a `ThetanutsError`.

```typescript
import { isThetanutsError } from '@thetanuts/thetanuts-client';

try {
  await client.optionBook.fillOrder(order, signature);
} catch (error) {
  if (isThetanutsError(error)) {
    // TypeScript knows error.code exists
    console.log('Error code:', error.code);
    console.log('Error meta:', error.meta);
  } else {
    console.log('Unknown error:', error);
  }
}
```

### mapHttpError

Map HTTP/Axios errors to `ThetanutsError`.

```typescript
import { mapHttpError } from '@thetanuts/thetanuts-client';

try {
  await axios.get('/api/orders');
} catch (error) {
  throw mapHttpError(error);
  // Maps to ThetanutsError with code 'HTTP_ERROR'
}
```

### mapContractError

Map ethers.js contract errors to `ThetanutsError`.

```typescript
import { mapContractError } from '@thetanuts/thetanuts-client';

try {
  await contract.approve(spender, amount);
} catch (error) {
  throw mapContractError(error);
  // Maps to appropriate ThetanutsError code
}
```

---

## Logger Utilities (`logger.ts`)

### noopLogger

A no-op logger that does nothing (default).

```typescript
import { noopLogger } from '@thetanuts/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  logger: noopLogger, // No logging (default)
});
```

### consoleLogger

A logger that outputs to console.

```typescript
import { consoleLogger } from '@thetanuts/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  logger: consoleLogger,
});

// Logs will appear in console:
// [DEBUG] Getting balance { token: '0x...' }
// [INFO] Token approval successful { txHash: '0x...' }
```

### Custom Logger

Create your own logger implementation.

```typescript
import type { ThetanutsLogger } from '@thetanuts/thetanuts-client';

const myLogger: ThetanutsLogger = {
  debug: (msg, meta) => winston.debug(msg, meta),
  info: (msg, meta) => winston.info(msg, meta),
  warn: (msg, meta) => winston.warn(msg, meta),
  error: (msg, meta) => winston.error(msg, meta),
};

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  logger: myLogger,
});
```

---

## Validation Utilities (`validation.ts`)

### validateAddress

Validate an Ethereum address.

```typescript
import { validateAddress } from '@thetanuts/thetanuts-client';

validateAddress('0x1234...', 'tokenAddress');
// Throws ThetanutsError with code 'INVALID_PARAMS' if invalid
```

### validateOrderExpiry

Check if an order will expire soon.

```typescript
import { validateOrderExpiry } from '@thetanuts/thetanuts-client';

const expiryTimestamp = Math.floor(Date.now() / 1000) + 60; // 60 seconds

validateOrderExpiry(expiryTimestamp, 120);
// Throws 'ORDER_EXPIRED' if order expires within 120 seconds
```

### validateFillSize

Validate fill size against available amount.

```typescript
import { validateFillSize } from '@thetanuts/thetanuts-client';

validateFillSize(
  1000000n,     // requested
  500000n,      // available
  100000n       // minSize (optional)
);
// Throws 'SIZE_EXCEEDED' if requested > available
// Throws 'INVALID_PARAMS' if requested < minSize
```

### validateBuySlippage

Validate actual price doesn't exceed max for buys.

```typescript
import { validateBuySlippage } from '@thetanuts/thetanuts-client';

validateBuySlippage(
  105n,  // actual price
  100n   // max price
);
// Throws 'SLIPPAGE_EXCEEDED' if actual > max
```

### validateSellSlippage

Validate actual price meets minimum for sells.

```typescript
import { validateSellSlippage } from '@thetanuts/thetanuts-client';

validateSellSlippage(
  95n,   // actual price
  100n   // min price
);
// Throws 'SLIPPAGE_EXCEEDED' if actual < min
```

### calculateSlippagePrice

Calculate price with slippage applied.

```typescript
import { calculateSlippagePrice } from '@thetanuts/thetanuts-client';

// For buy: price * (1 + slippage)
const maxBuyPrice = calculateSlippagePrice(1000000n, 50, true);
// 50 bps = 0.5%, result: 1005000n

// For sell: price * (1 - slippage)
const minSellPrice = calculateSlippagePrice(1000000n, 50, false);
// 50 bps = 0.5%, result: 995000n
```

---

## Complete Example

```typescript
import {
  toBigInt,
  fromBigInt,
  DECIMALS,
  createError,
  isThetanutsError,
  validateAddress,
  validateFillSize,
  consoleLogger,
} from '@thetanuts/thetanuts-client';

// Convert amounts
const usdcAmount = toBigInt('1000', DECIMALS.USDC);
console.log(`Raw USDC: ${usdcAmount}`); // 1000000000n

// Validate inputs
try {
  validateAddress('invalid', 'tokenAddress');
} catch (error) {
  if (isThetanutsError(error)) {
    console.log(`Validation failed: ${error.code}`);
  }
}

// Check fill size
try {
  validateFillSize(
    toBigInt('100', DECIMALS.USDC),  // want to fill 100
    toBigInt('50', DECIMALS.USDC)    // only 50 available
  );
} catch (error) {
  if (isThetanutsError(error) && error.code === 'SIZE_EXCEEDED') {
    console.log('Cannot fill more than available');
  }
}
```
