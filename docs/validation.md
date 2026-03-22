# Strike Validation Guide

This guide covers the validation functions for multi-leg option structures. These functions verify that strikes meet on-chain requirements before submitting RFQs.

## Table of Contents

- [Overview](#overview)
- [ValidationResult Type](#validationresult-type)
- [Validation Functions](#validation-functions)
  - [validateButterfly](#validatebutterfly)
  - [validateCondor](#validatecondor)
  - [validateIronCondor](#validateironcondor)
  - [validateRanger](#validateranger)
- [Error Handling](#error-handling)

## Overview

The on-chain option contracts enforce specific strike requirements for multi-leg structures. Submitting an RFQ with invalid strikes will cause the transaction to revert. Use these validation functions before submitting RFQs to catch errors early.

### Importing

```typescript
import {
  validateButterfly,
  validateCondor,
  validateIronCondor,
  validateRanger,
  type ValidationResult,
} from '@anthropic/thetanuts-sdk';
```

## ValidationResult Type

All validation functions return a `ValidationResult` object:

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;  // Present when valid is false
}
```

**Usage:**

```typescript
const result = validateButterfly([1900, 2000, 2100]);

if (!result.valid) {
  console.error('Invalid strikes:', result.error);
  return;
}

// Proceed with RFQ...
```

## Validation Functions

### validateButterfly

Validates strikes for `CALL_FLYS` and `PUT_FLYS` products.

```typescript
function validateButterfly(strikes: number[]): ValidationResult
```

**On-Chain Requirement:** The three strikes must be equidistant.

```
middle - lower === upper - middle
```

**Examples:**

```typescript
// Valid: equidistant strikes (100 apart)
validateButterfly([1900, 2000, 2100]);
// Result: { valid: true }

// Invalid: not equidistant (100 and 200 apart)
validateButterfly([1900, 2000, 2200]);
// Result: { valid: false, error: 'Butterfly strikes must be equidistant' }

// Invalid: wrong number of strikes
validateButterfly([1900, 2000]);
// Result: { valid: false, error: 'Butterfly requires exactly 3 strikes' }
```

**On-Chain Reference:** `ButterflyCallSpreadOption.sol:71-74`

### validateCondor

Validates strikes for `CALL_CONDOR` and `PUT_CONDOR` products.

```typescript
function validateCondor(strikes: number[]): ValidationResult
```

**On-Chain Requirement:** The two spread widths must be equal.

```
strikes[1] - strikes[0] === strikes[3] - strikes[2]
```

**Examples:**

```typescript
// Valid: equal spread widths (100 each)
validateCondor([1800, 1900, 2100, 2200]);
// Result: { valid: true }

// Invalid: unequal spread widths (100 and 150)
validateCondor([1800, 1900, 2100, 2250]);
// Result: { valid: false, error: 'Condor spread widths must be equal' }

// Invalid: wrong number of strikes
validateCondor([1800, 1900, 2100]);
// Result: { valid: false, error: 'Condor requires exactly 4 strikes' }
```

**On-Chain Reference:** `CallCondorOption.sol:69`

### validateIronCondor

Validates strikes for `IRON_CONDOR` products.

```typescript
function validateIronCondor(strikes: number[]): ValidationResult
```

**Strike Order:** `[putLower, putUpper, callLower, callUpper]`

**On-Chain Requirement:** The put spread must not overlap with the call spread.

```
putUpper <= callLower
```

**Examples:**

```typescript
// Valid: non-overlapping spreads
validateIronCondor([1800, 1900, 2100, 2200]);
// Result: { valid: true }

// Valid: touching but not overlapping
validateIronCondor([1800, 2000, 2000, 2200]);
// Result: { valid: true }

// Invalid: overlapping spreads
validateIronCondor([1800, 2100, 1900, 2200]);
// Result: { valid: false, error: 'Iron condor spreads must not overlap (putUpper <= callLower)' }

// Invalid: wrong number of strikes
validateIronCondor([1800, 1900, 2100]);
// Result: { valid: false, error: 'Iron condor requires exactly 4 strikes' }
```

**On-Chain Reference:** `IronCondorOption.sol:77`

### validateRanger

Validates strikes for `RANGER` products.

```typescript
function validateRanger(strikes: number[]): ValidationResult
```

**Strike Order:** `[K0, K1, K2, K3]`

**On-Chain Requirements:**
1. All strike intervals must be equal: `K1-K0 === K2-K1 === K3-K2`
2. There must be a gap between inner strikes: `K1 < K2`

**Examples:**

```typescript
// Valid: equidistant strikes (100 apart each)
validateRanger([1900, 2000, 2100, 2200]);
// Result: { valid: true }

// Invalid: unequal intervals
validateRanger([1900, 2000, 2100, 2250]);
// Result: { valid: false, error: 'Ranger strikes must be equidistant' }

// Invalid: inner strikes overlap (K1 >= K2)
validateRanger([1900, 2100, 2000, 2200]);
// Result: { valid: false, error: 'Ranger inner strikes must have gap (K1 < K2)' }

// Invalid: wrong number of strikes
validateRanger([1900, 2000, 2100]);
// Result: { valid: false, error: 'Ranger requires exactly 4 strikes' }
```

**On-Chain Reference:** `RangerOption.sol:125-149`

## Error Handling

### Best Practices

Always validate before calculating contracts or submitting RFQs:

```typescript
import {
  validateIronCondor,
  calculateNumContracts,
  calculateCollateralRequired,
} from '@anthropic/thetanuts-sdk';

function prepareIronCondorRFQ(
  strikes: number[],
  tradeAmount: number
) {
  // 1. Validate strikes first
  const validation = validateIronCondor(strikes);
  if (!validation.valid) {
    throw new Error(`Invalid iron condor strikes: ${validation.error}`);
  }

  // 2. Calculate position size
  const numContracts = calculateNumContracts({
    tradeAmount,
    product: 'IRON_CONDOR',
    strikes,
    isBuy: false,
  });

  // 3. Calculate collateral
  const collateral = calculateCollateralRequired(
    numContracts,
    'IRON_CONDOR',
    strikes
  );

  return { numContracts, collateral };
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "requires exactly N strikes" | Wrong number of strikes | Check product type requirements |
| "must be equidistant" | Unequal intervals | Adjust strikes to be evenly spaced |
| "spread widths must be equal" | Condor with different widths | Make both spreads the same width |
| "must not overlap" | Iron condor spreads cross | Ensure putUpper <= callLower |
| "inner strikes must have gap" | Ranger with K1 >= K2 | Ensure K1 < K2 |

## Related Documentation

- [Product Types Reference](./product-types.md)
- [RFQ Calculations Guide](./rfq-calculations.md)
- [RFQ Workflow](./rfq-workflow.md)
