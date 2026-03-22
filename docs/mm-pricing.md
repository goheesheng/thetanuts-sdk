# Market Maker Pricing Guide

This guide covers the MM pricing module, which provides market maker prices with fee adjustments and collateral carrying costs.

## Table of Contents

- [Overview](#overview)
- [Fee Adjustment Formula](#fee-adjustment-formula)
- [Collateral Carrying Cost](#collateral-carrying-cost)
- [Vanilla Option Pricing](#vanilla-option-pricing)
- [Structure Pricing](#structure-pricing)
- [Helper Functions](#helper-functions)

## Overview

The MM pricing module fetches indicative prices from market makers and applies:

1. **Fee Adjustment** - Widens the bid-ask spread for exchange fees
2. **Collateral Carrying Cost** - Adds cost of capital for short positions

### Importing

```typescript
import {
  MMPricingModule,
  applyFeeAdjustment,
  calculateCollateralCost,
  parseTicker,
  buildTicker,
  COLLATERAL_APR,
} from '@anthropic/thetanuts-sdk';
```

### Module Initialization

```typescript
const client = new ThetanutsClient({ chainId: 8453 });
const mmPricing = client.mmPricing;

// Or standalone
const mmPricing = new MMPricingModule(httpClient, logger);
```

## Fee Adjustment Formula

Market maker prices are adjusted to account for exchange fees:

```
feeAdjustment = min(0.0003, rawPrice × 0.125)
```

**Applied to prices:**
- Ask price: `feeAdjustedAsk = rawAsk + feeAdjustment`
- Bid price: `feeAdjustedBid = rawBid - feeAdjustment`

### Example

```typescript
import { applyFeeAdjustment } from '@anthropic/thetanuts-sdk';

// Raw bid/ask from market maker
const rawBid = 0.02;   // 0.02 ETH
const rawAsk = 0.025;  // 0.025 ETH

// Apply fee adjustment
const adjustedBid = applyFeeAdjustment(rawBid, 'bid');
const adjustedAsk = applyFeeAdjustment(rawAsk, 'ask');

// feeAdjustment = min(0.0003, 0.02 * 0.125) = min(0.0003, 0.0025) = 0.0003
// adjustedBid = 0.02 - 0.0003 = 0.0197
// adjustedAsk = 0.025 + 0.0003 = 0.0253
```

### Why 0.0003 Cap?

The fee adjustment is capped at 0.0003 (0.03% of 1 contract) to prevent excessive widening for high-premium options. This matches the protocol's fee structure.

## Collateral Carrying Cost

Short positions require collateral, which has an opportunity cost. The SDK calculates this based on:

- **BTC collateral**: 1% APR
- **ETH collateral**: 4% APR
- **USD collateral**: 7% APR

### Formula

```
collateralCost = collateralValue × APR × timeToExpiry
```

Where `timeToExpiry` is in years.

### COLLATERAL_APR Constants

```typescript
import { COLLATERAL_APR } from '@anthropic/thetanuts-sdk';

console.log(COLLATERAL_APR);
// {
//   BTC: 0.01,  // 1%
//   ETH: 0.04,  // 4%
//   USD: 0.07,  // 7%
// }
```

### Example

```typescript
import { calculateCollateralCost } from '@anthropic/thetanuts-sdk';

// PUT option: 1 contract at strike 2000, 30 days to expiry
const collateralUsd = 2000;
const timeToExpiryYears = 30 / 365;
const collateralType = 'USD';

const cost = calculateCollateralCost(
  collateralUsd,
  timeToExpiryYears,
  collateralType
);
// cost = 2000 × 0.07 × (30/365) = $11.51
```

### Spread Collateral Cost

For spreads, the collateral cost is based on the **spread width** (max loss), not individual legs:

```typescript
import { calculateSpreadCollateralCost } from '@anthropic/thetanuts-sdk';

// CALL_SPREAD [2000, 2500]: width = 500
const widthUsd = 500;
const timeToExpiryYears = 30 / 365;

const spreadCC = calculateSpreadCollateralCost(widthUsd, timeToExpiryYears);
// spreadCC = 500 × 0.07 × (30/365) = $2.88
```

## Vanilla Option Pricing

### getAllPricing

Fetches all option prices for an underlying asset.

```typescript
const allPricing = await mmPricing.getAllPricing('ETH');

// Returns: MMAllPricingResponse
// {
//   expirations: [
//     {
//       expiry: 1710547200,
//       expiryLabel: '16MAR24',
//       options: [
//         { strike: 1800, isCall: true, bid: 0.05, ask: 0.055, ... },
//         { strike: 1800, isCall: false, bid: 0.02, ask: 0.025, ... },
//         ...
//       ]
//     }
//   ]
// }
```

### getTickerPricing

Fetches pricing for a specific option ticker.

```typescript
const pricing = await mmPricing.getTickerPricing('ETH-16MAR24-2000-P');

// Returns: MMVanillaPricing
// {
//   ticker: 'ETH-16MAR24-2000-P',
//   underlying: 'ETH',
//   strike: 2000,
//   isCall: false,
//   expiry: 1710547200,
//   rawBid: 0.02,
//   rawAsk: 0.025,
//   feeAdjustedBid: 0.0197,
//   feeAdjustedAsk: 0.0253,
//   timeToExpiryYears: 0.0822,
//   ...
// }
```

### getPositionPricing

Fetches pricing with collateral cost for a specific position.

```typescript
const positionPricing = await mmPricing.getPositionPricing({
  ticker: 'ETH-16MAR24-2000-P',
  isLong: false,           // Short position (selling)
  numContracts: 5,
  collateralToken: 'USDC',
});

// Returns: MMPositionPricing
// {
//   ...vanilla pricing fields...,
//   collateralCostPerContract: 11.51,
//   totalCollateralCost: 57.55,
//   netAskPrice: 0.0253 + collateralCostPerUnderlying,
//   ...
// }
```

## Structure Pricing

### getSpreadPricing

Fetches pricing for a two-leg spread.

```typescript
const spreadPricing = await mmPricing.getSpreadPricing({
  underlying: 'ETH',
  strike1: 200000000000,  // 2000 in 8 decimals
  strike2: 250000000000,  // 2500 in 8 decimals
  expiry: 1710547200,
  isCall: true,
});

// Returns: MMSpreadPricing
// {
//   nearLeg: { strike: 2000, ...vanilla pricing... },
//   farLeg: { strike: 2500, ...vanilla pricing... },
//   widthUsd: 500,
//   netSpreadPriceBid: nearBid - farAsk,
//   netSpreadPriceAsk: nearAsk - farBid,
//   spreadCollateralCostUsd: 2.88,
//   netMmBidPrice: netBid - spreadCCPerUnderlying,
//   netMmAskPrice: netAsk + spreadCCPerUnderlying,
// }
```

### getButterflyPricing

Fetches pricing for a three-leg butterfly.

```typescript
const butterflyPricing = await mmPricing.getButterflyPricing({
  underlying: 'ETH',
  strike1: 190000000000,  // 1900
  strike2: 200000000000,  // 2000
  strike3: 210000000000,  // 2100
  expiry: 1710547200,
  isCall: true,
});

// Returns: MMButterflyPricing
// {
//   lowerLeg: {...},
//   middleLeg: {...},
//   upperLeg: {...},
//   widthUsd: 100,
//   netButterflyPrice: ...,
//   ...
// }
```

### getCondorPricing

Fetches pricing for a four-leg condor.

```typescript
const condorPricing = await mmPricing.getCondorPricing({
  underlying: 'ETH',
  strike1: 180000000000,  // 1800
  strike2: 190000000000,  // 1900
  strike3: 210000000000,  // 2100
  strike4: 220000000000,  // 2200
  expiry: 1710547200,
  type: 'iron',  // 'call', 'put', or 'iron'
});

// Returns: MMCondorPricing
// {
//   leg1: {...}, leg2: {...}, leg3: {...}, leg4: {...},
//   widthUsd: 100,  // max of spread widths for iron condor
//   netCondorPrice: ...,
//   ...
// }
```

## Helper Functions

### parseTicker

Parses an option ticker into components.

```typescript
import { parseTicker } from '@anthropic/thetanuts-sdk';

const parsed = parseTicker('ETH-16MAR24-2000-P');
// {
//   underlying: 'ETH',
//   expiryLabel: '16MAR24',
//   strike: 2000,
//   isCall: false,
// }
```

### buildTicker

Builds an option ticker from components.

```typescript
import { buildTicker } from '@anthropic/thetanuts-sdk';

const ticker = buildTicker('ETH', '16MAR24', 2000, false);
// 'ETH-16MAR24-2000-P'
```

## Price Components Summary

When you receive MM pricing, the price includes multiple components:

| Component | Description | Applies To |
|-----------|-------------|------------|
| Raw Price | Market maker's base price | All |
| Fee Adjustment | Exchange fee spread widening | All |
| Collateral Cost | Cost of capital for short positions | Short only |

**Final Ask Price (for buying/going long):**
```
finalAsk = rawAsk + feeAdjustment
```

**Final Bid Price (for selling/going short):**
```
finalBid = rawBid - feeAdjustment - collateralCost
```

## Related Documentation

- [RFQ Calculations Guide](./rfq-calculations.md)
- [Product Types Reference](./product-types.md)
- [RFQ Workflow](./rfq-workflow.md)
