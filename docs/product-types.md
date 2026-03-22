# Product Types Reference

This document provides a comprehensive reference for all option product types supported by the Thetanuts SDK.

## Table of Contents

- [Overview](#overview)
- [Product Registry Table](#product-registry-table)
- [Vanilla Options](#vanilla-options)
- [Spreads](#spreads)
- [Multi-Leg Structures](#multi-leg-structures)

## Overview

The SDK supports 12 product types, each with specific collateral requirements, strike configurations, and max loss formulas. Understanding these is essential for correctly sizing positions and calculating collateral.

### Collateral Types

- **Base Collateral**: WETH or cbBTC - used for inverse products
- **Quote Collateral**: USDC - used for standard products

## Product Registry Table

| Product | Collateral | Strikes | Width Formula | Max Loss per Contract |
|---------|------------|---------|---------------|----------------------|
| `INVERSE_CALL` | Base | 1 | N/A | 1 unit |
| `PUT` | Quote | 1 | N/A | strike |
| `LINEAR_CALL` | Quote | 1 | N/A | strike |
| `CALL_SPREAD` | Quote | 2 | `K_upper - K_lower` | width |
| `PUT_SPREAD` | Quote | 2 | `K_upper - K_lower` | width |
| `INVERSE_CALL_SPREAD` | Base | 2 | `1 - K_lower/K_upper` | width |
| `CALL_FLYS` | Quote | 3 | `K_middle - K_lower` | width |
| `PUT_FLYS` | Quote | 3 | `K_upper - K_middle` | width |
| `CALL_CONDOR` | Quote | 4 | `K[1] - K[0]` | width |
| `PUT_CONDOR` | Quote | 4 | `K[3] - K[2]` | width |
| `IRON_CONDOR` | Quote | 4 | `max(putSpread, callSpread)` | width |
| `RANGER` | Quote | 4 | `2 × (K[1] - K[0])` | width |

## Vanilla Options

### INVERSE_CALL

A call option collateralized in the underlying asset (WETH or cbBTC).

```typescript
import { calculateNumContracts, calculateCollateralRequired } from '@anthropic/thetanuts-sdk';

// Selling 1 WETH of INVERSE_CALL
const numContracts = calculateNumContracts({
  tradeAmount: 1,        // 1 WETH
  product: 'INVERSE_CALL',
  strikes: [2000],
  isBuy: false,
});
// Result: 1 contract

const collateral = calculateCollateralRequired(1, 'INVERSE_CALL', [2000]);
// Result: 1 WETH
```

### PUT

A put option collateralized in USDC. Max loss = strike price.

```typescript
// Selling 2000 USDC worth of PUT at strike 2000
const numContracts = calculateNumContracts({
  tradeAmount: 2000,     // 2000 USDC
  product: 'PUT',
  strikes: [2000],
  isBuy: false,
});
// Result: 1 contract

const collateral = calculateCollateralRequired(1, 'PUT', [2000]);
// Result: 2000 USDC
```

### LINEAR_CALL

A call option with linear payout capped at 2× strike, collateralized in USDC.

```typescript
// Selling 2000 USDC worth of LINEAR_CALL at strike 2000
const numContracts = calculateNumContracts({
  tradeAmount: 2000,
  product: 'LINEAR_CALL',
  strikes: [2000],
  isBuy: false,
});
// Result: 1 contract

const collateral = calculateCollateralRequired(1, 'LINEAR_CALL', [2000]);
// Result: 2000 USDC
```

## Spreads

### CALL_SPREAD

A bullish spread buying a lower strike call and selling a higher strike call.

**Width Formula:** `K_upper - K_lower`

```typescript
// Selling 500 USDC worth of CALL_SPREAD [2000, 2500]
const numContracts = calculateNumContracts({
  tradeAmount: 500,
  product: 'CALL_SPREAD',
  strikes: [2000, 2500],  // [lower, upper]
  isBuy: false,
});
// Result: 1 contract (width = 500)

const collateral = calculateCollateralRequired(1, 'CALL_SPREAD', [2000, 2500]);
// Result: 500 USDC
```

### PUT_SPREAD

A bearish spread buying a higher strike put and selling a lower strike put.

**Width Formula:** `K_upper - K_lower`

```typescript
// Selling 200 USDC worth of PUT_SPREAD [1800, 2000]
const numContracts = calculateNumContracts({
  tradeAmount: 200,
  product: 'PUT_SPREAD',
  strikes: [1800, 2000],
  isBuy: false,
});
// Result: 1 contract (width = 200)

const collateral = calculateCollateralRequired(1, 'PUT_SPREAD', [1800, 2000]);
// Result: 200 USDC
```

### INVERSE_CALL_SPREAD

A call spread collateralized in the underlying asset.

**Width Formula:** `1 - K_lower/K_upper`

```typescript
// Selling 0.2 WETH worth of INVERSE_CALL_SPREAD [2000, 2500]
const numContracts = calculateNumContracts({
  tradeAmount: 0.2,
  product: 'INVERSE_CALL_SPREAD',
  strikes: [2000, 2500],
  isBuy: false,
});
// Result: 1 contract (width = 1 - 2000/2500 = 0.2)

const collateral = calculateCollateralRequired(1, 'INVERSE_CALL_SPREAD', [2000, 2500]);
// Result: 0.2 WETH
```

## Multi-Leg Structures

### CALL_FLYS (Call Butterfly)

A three-leg structure: buy 1 lower, sell 2 middle, buy 1 upper.

**Width Formula:** `K_middle - K_lower`

**Validation:** Strikes must be equidistant. See [validateButterfly](./validation.md#validatebutterfly).

```typescript
import { validateButterfly } from '@anthropic/thetanuts-sdk';

const strikes = [1900, 2000, 2100];
const validation = validateButterfly(strikes);
// Result: { valid: true }

const numContracts = calculateNumContracts({
  tradeAmount: 100,
  product: 'CALL_FLYS',
  strikes: [1900, 2000, 2100],
  isBuy: false,
});
// Result: 1 contract (width = 100)
```

### PUT_FLYS (Put Butterfly)

A three-leg structure: buy 1 upper, sell 2 middle, buy 1 lower.

**Width Formula:** `K_upper - K_middle`

**Validation:** Strikes must be equidistant. See [validateButterfly](./validation.md#validatebutterfly).

### CALL_CONDOR

A four-leg structure with two call spreads.

**Width Formula:** `K[1] - K[0]` (the spread width)

**Validation:** Spread widths must be equal. See [validateCondor](./validation.md#validatecondor).

```typescript
import { validateCondor } from '@anthropic/thetanuts-sdk';

const strikes = [1800, 1900, 2100, 2200];
const validation = validateCondor(strikes);
// Result: { valid: true } (both spreads have width 100)

const numContracts = calculateNumContracts({
  tradeAmount: 100,
  product: 'CALL_CONDOR',
  strikes: [1800, 1900, 2100, 2200],
  isBuy: false,
});
// Result: 1 contract
```

### PUT_CONDOR

A four-leg structure with two put spreads.

**Width Formula:** `K[3] - K[2]` (the spread width)

**Validation:** Spread widths must be equal. See [validateCondor](./validation.md#validatecondor).

### IRON_CONDOR

A four-leg structure combining a put spread and a call spread.

**Strike Order:** `[putLower, putUpper, callLower, callUpper]`

**Width Formula:** `max(putSpread, callSpread)` - uses the larger of the two spreads

**Validation:** Put spread must not overlap with call spread. See [validateIronCondor](./validation.md#validateironcondor).

```typescript
import { validateIronCondor } from '@anthropic/thetanuts-sdk';

// Unequal spreads: putSpread=100, callSpread=150
const strikes = [1800, 1900, 2100, 2250];
const validation = validateIronCondor(strikes);
// Result: { valid: true }

const numContracts = calculateNumContracts({
  tradeAmount: 150,  // max(100, 150) = 150
  product: 'IRON_CONDOR',
  strikes: [1800, 1900, 2100, 2250],
  isBuy: false,
});
// Result: 1 contract

const collateral = calculateCollateralRequired(10, 'IRON_CONDOR', [1800, 1900, 2100, 2250]);
// Result: 1500 USDC (10 contracts × 150 width)
```

### RANGER

A zone-bound strategy with four equidistant strikes.

**Strike Order:** `[K0, K1, K2, K3]` where all intervals are equal

**Width Formula:** `2 × (K[1] - K[0])`

**Validation:** All strike intervals must be equal, with a gap between inner strikes. See [validateRanger](./validation.md#validateranger).

```typescript
import { validateRanger } from '@anthropic/thetanuts-sdk';

const strikes = [1900, 2000, 2100, 2200];
const validation = validateRanger(strikes);
// Result: { valid: true }

const numContracts = calculateNumContracts({
  tradeAmount: 200,  // 2 × 100 = 200
  product: 'RANGER',
  strikes: [1900, 2000, 2100, 2200],
  isBuy: false,
});
// Result: 1 contract

const collateral = calculateCollateralRequired(5, 'RANGER', [1900, 2000, 2100, 2200]);
// Result: 1000 USDC (5 contracts × 200 width)
```

## Related Documentation

- [RFQ Calculations Guide](./rfq-calculations.md)
- [Validation Functions](./validation.md)
- [MM Pricing Guide](./mm-pricing.md)
- [RFQ Workflow](./rfq-workflow.md)
