# RFQ Calculations Guide

This guide covers the `rfqCalculations` module, which provides functions for calculating position sizes, collateral requirements, and reserve prices for RFQ orders.

## Table of Contents

- [Overview](#overview)
- [Core Functions](#core-functions)
- [Buy vs Sell Orders](#buy-vs-sell-orders)
- [Examples by Product Type](#examples-by-product-type)

## Overview

The RFQ calculations module helps you:

1. **Calculate number of contracts** from a trade amount
2. **Calculate collateral required** for a given position
3. **Calculate reserve price** (total premium) for an order
4. **Determine collateral type** (base vs quote) for each product

### Importing

```typescript
import {
  calculateNumContracts,
  calculateCollateralRequired,
  calculateReservePrice,
  calculateDeliveryAmount,
  premiumPerContract,
  isBaseCollateral,
  isPhysicalProduct,
  type ProductName,
  type DeliveryResult,
} from '@thetanuts-finance/thetanuts-client';
```

## Core Functions

### isBaseCollateral

Determines whether a product uses base collateral (WETH/cbBTC) or quote collateral (USDC).

```typescript
function isBaseCollateral(product: ProductName): boolean
```

**Returns:**
- `true` for: `INVERSE_CALL`, `INVERSE_CALL_SPREAD`, `PHYSICAL_CALL`, `PHYSICAL_CALL_SPREAD`, `PHYSICAL_CALL_FLY`, `PHYSICAL_CALL_CONDOR`
- `false` for all other products (they use USDC)

```typescript
isBaseCollateral('INVERSE_CALL');        // true - uses WETH/cbBTC
isBaseCollateral('PUT');                  // false - uses USDC
isBaseCollateral('CALL_SPREAD');          // false - uses USDC
isBaseCollateral('INVERSE_CALL_SPREAD');  // true - uses WETH/cbBTC
```

### calculateNumContracts

Calculates the number of option contracts from a trade amount.

```typescript
function calculateNumContracts(params: {
  tradeAmount: number;      // Amount in collateral units
  product: ProductName;     // Product type
  strikes: number[];        // Strike price(s)
  isBuy: boolean;          // true for buy, false for sell
  mmPrice?: number;        // Required for buy orders (MM price in underlying)
  spot?: number;           // Required for buy orders (current spot price)
}): number
```

**For SELL orders:**
- `tradeAmount` = collateral you're putting up
- Formula: `tradeAmount / maxLossPerContract`

**For BUY orders:**
- `tradeAmount` = premium you're willing to pay
- Formula: `tradeAmount / premiumPerContract`

```typescript
// SELL: 2000 USDC of PUT at strike 2000 → 1 contract
calculateNumContracts({
  tradeAmount: 2000,
  product: 'PUT',
  strikes: [2000],
  isBuy: false,
});
// Result: 1

// BUY: 200 USDC of PUT, mmPrice=0.05, spot=2000 → 2 contracts
calculateNumContracts({
  tradeAmount: 200,
  product: 'PUT',
  strikes: [2000],
  isBuy: true,
  mmPrice: 0.05,  // 0.05 ETH per contract
  spot: 2000,     // ETH price
});
// Result: 2 (premium per contract = 0.05 × 2000 = $100)
```

### calculateCollateralRequired

Calculates the collateral required to open a position.

```typescript
function calculateCollateralRequired(
  numContracts: number,
  product: ProductName,
  strikes: number[]
): number
```

**Returns:** Collateral in the appropriate unit (WETH/cbBTC for base, USDC for quote)

```typescript
// PUT: 5 contracts at strike 2000 → 10000 USDC
calculateCollateralRequired(5, 'PUT', [2000]);
// Result: 10000

// CALL_SPREAD: 10 contracts, strikes [2000, 2500] → 5000 USDC
calculateCollateralRequired(10, 'CALL_SPREAD', [2000, 2500]);
// Result: 5000 (10 contracts × 500 width)

// INVERSE_CALL: 10 contracts → 10 WETH
calculateCollateralRequired(10, 'INVERSE_CALL', [2000]);
// Result: 10
```

### premiumPerContract

Converts MM price (in underlying units) to premium per contract in collateral units.

```typescript
function premiumPerContract(
  mmPrice: number,    // Price in underlying (e.g., 0.05 ETH)
  spot: number,       // Current spot price
  product: ProductName
): number
```

**For base collateral products:** Returns `mmPrice` as-is (already in underlying)
**For quote collateral products:** Returns `mmPrice × spot` (converts to USDC)

```typescript
// INVERSE_CALL: 0.05 ETH stays as 0.05 ETH
premiumPerContract(0.05, 2000, 'INVERSE_CALL');
// Result: 0.05

// PUT: 0.05 ETH × $2000 = $100 USDC
premiumPerContract(0.05, 2000, 'PUT');
// Result: 100

// CALL_SPREAD: 0.01 ETH × $2000 = $20 USDC
premiumPerContract(0.01, 2000, 'CALL_SPREAD');
// Result: 20
```

### calculateReservePrice

Calculates the total premium (reserve price) for an order.

```typescript
function calculateReservePrice(
  numContracts: number,
  mmPrice: number,      // Price per contract in underlying
  spot: number,         // Current spot price
  product: ProductName
): number
```

**Returns:** Total premium in collateral units

```typescript
// INVERSE_CALL: 10 contracts × 0.05 ETH = 0.5 ETH
calculateReservePrice(10, 0.05, 2000, 'INVERSE_CALL');
// Result: 0.5

// PUT: 5 contracts × 0.05 × $2000 = $500 USDC
calculateReservePrice(5, 0.05, 2000, 'PUT');
// Result: 500
```

## Buy vs Sell Orders

### SELL Orders

When selling options, you provide collateral and receive premium.

**Input:** `tradeAmount` = collateral you're putting up
**Output:** `numContracts` based on max loss per contract

```typescript
// Selling PUT with 4000 USDC collateral at strike 2000
const numContracts = calculateNumContracts({
  tradeAmount: 4000,      // 4000 USDC collateral
  product: 'PUT',
  strikes: [2000],        // Strike = max loss per contract
  isBuy: false,
});
// Result: 2 contracts (4000 / 2000)
```

### BUY Orders

When buying options, you pay premium to acquire contracts.

**Input:** `tradeAmount` = premium budget (in collateral units)
**Required:** `mmPrice` and `spot` to calculate premium per contract
**Output:** `numContracts` based on premium cost

```typescript
// Buying PUT with 200 USDC budget, mmPrice=0.05 ETH, spot=$2000
const numContracts = calculateNumContracts({
  tradeAmount: 200,       // 200 USDC budget
  product: 'PUT',
  strikes: [2000],
  isBuy: true,
  mmPrice: 0.05,          // 0.05 ETH per contract
  spot: 2000,             // ETH = $2000
});
// Result: 2 contracts (200 / 100 premium per contract)
```

## Examples by Product Type

### Vanilla Options

```typescript
// INVERSE_CALL SELL: 1 WETH → 1 contract
calculateNumContracts({
  tradeAmount: 1,
  product: 'INVERSE_CALL',
  strikes: [2000],
  isBuy: false,
});

// PUT SELL: 2000 USDC at K=2000 → 1 contract
calculateNumContracts({
  tradeAmount: 2000,
  product: 'PUT',
  strikes: [2000],
  isBuy: false,
});

// LINEAR_CALL SELL: 2000 USDC at K=2000 → 1 contract
calculateNumContracts({
  tradeAmount: 2000,
  product: 'LINEAR_CALL',
  strikes: [2000],
  isBuy: false,
});
```

### Spreads

```typescript
// CALL_SPREAD SELL: 500 USDC, K=[2000,2500] → 1 contract
calculateNumContracts({
  tradeAmount: 500,
  product: 'CALL_SPREAD',
  strikes: [2000, 2500],
  isBuy: false,
});

// INVERSE_CALL_SPREAD SELL: 0.2 WETH, K=[2000,2500] → 1 contract
calculateNumContracts({
  tradeAmount: 0.2,
  product: 'INVERSE_CALL_SPREAD',
  strikes: [2000, 2500],
  isBuy: false,
});

// PUT_SPREAD SELL: 500 USDC, K=[2000,2500] → 1 contract
calculateNumContracts({
  tradeAmount: 500,
  product: 'PUT_SPREAD',
  strikes: [2000, 2500],
  isBuy: false,
});
```

### Multi-Leg Structures

```typescript
// CALL_FLYS SELL: 100 USDC, K=[1900,2000,2100] → 1 contract
calculateNumContracts({
  tradeAmount: 100,
  product: 'CALL_FLYS',
  strikes: [1900, 2000, 2100],
  isBuy: false,
});

// CALL_CONDOR SELL: 100 USDC, K=[1800,1900,2100,2200] → 1 contract
calculateNumContracts({
  tradeAmount: 100,
  product: 'CALL_CONDOR',
  strikes: [1800, 1900, 2100, 2200],
  isBuy: false,
});

// IRON_CONDOR SELL (unequal spreads): 150 USDC → 1 contract
// putSpread=100, callSpread=150 → width=max(100,150)=150
calculateNumContracts({
  tradeAmount: 150,
  product: 'IRON_CONDOR',
  strikes: [1800, 1900, 2100, 2250],
  isBuy: false,
});

// RANGER SELL: 200 USDC, K=[1900,2000,2100,2200] → 1 contract
// width = 2 × 100 = 200
calculateNumContracts({
  tradeAmount: 200,
  product: 'RANGER',
  strikes: [1900, 2000, 2100, 2200],
  isBuy: false,
});
```

### Physical Options

Physical options involve actual delivery of the underlying asset at expiry, unlike cash-settled options.

#### isPhysicalProduct

Check if a product is physically settled.

```typescript
function isPhysicalProduct(product: ProductName): boolean

isPhysicalProduct('PHYSICAL_CALL');  // true
isPhysicalProduct('PHYSICAL_PUT');   // true
isPhysicalProduct('PUT');            // false
```

#### calculateDeliveryAmount

Calculate what the buyer must deliver at exercise for physical options.

```typescript
function calculateDeliveryAmount(
  numContracts: number,
  product: ProductName,
  strikes: number[],
  underlying?: 'ETH' | 'BTC'  // defaults to 'ETH'
): DeliveryResult

interface DeliveryResult {
  deliveryAmount: number;
  deliveryToken: string;  // 'USDC', 'WETH', 'cbBTC', or ''
}
```

**Physical Option Formulas:**

| Product | Collateral (Seller) | Delivery (Buyer) |
|---------|---------------------|------------------|
| PHYSICAL_CALL | numContracts (WETH) | strike × numContracts (USDC) |
| PHYSICAL_PUT | strike × numContracts (USDC) | numContracts (WETH) |

```typescript
// PHYSICAL_CALL: seller posts 10 WETH, buyer delivers 20000 USDC
calculateCollateralRequired(10, 'PHYSICAL_CALL', [2000]);
// Result: 10 (WETH)

calculateDeliveryAmount(10, 'PHYSICAL_CALL', [2000]);
// Result: { deliveryAmount: 20000, deliveryToken: 'USDC' }

// PHYSICAL_PUT: seller posts 20000 USDC, buyer delivers 10 WETH
calculateCollateralRequired(10, 'PHYSICAL_PUT', [2000]);
// Result: 20000 (USDC)

calculateDeliveryAmount(10, 'PHYSICAL_PUT', [2000]);
// Result: { deliveryAmount: 10, deliveryToken: 'WETH' }

// For BTC underlying
calculateDeliveryAmount(5, 'PHYSICAL_PUT', [50000], 'BTC');
// Result: { deliveryAmount: 5, deliveryToken: 'cbBTC' }
```

#### Physical Option Examples

```typescript
// PHYSICAL_CALL SELL: 1 WETH → 1 contract (1:1)
calculateNumContracts({
  tradeAmount: 1,
  product: 'PHYSICAL_CALL',
  strikes: [2000],
  isBuy: false,
});

// PHYSICAL_PUT SELL: 2000 USDC at K=2000 → 1 contract
calculateNumContracts({
  tradeAmount: 2000,
  product: 'PHYSICAL_PUT',
  strikes: [2000],
  isBuy: false,
});

// PHYSICAL_CALL_SPREAD SELL: 500 in underlying units, K=[2000,2500] → 1 contract
calculateNumContracts({
  tradeAmount: 500,
  product: 'PHYSICAL_CALL_SPREAD',
  strikes: [2000, 2500],
  isBuy: false,
});
```

## Related Documentation

- [Product Types Reference](./product-types.md)
- [Validation Functions](./validation.md)
- [MM Pricing Guide](./mm-pricing.md)
- [RFQ Workflow](./rfq-workflow.md)
