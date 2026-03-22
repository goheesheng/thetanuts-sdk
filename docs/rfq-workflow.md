# RFQ Workflow Guide

This guide shows how to use the RFQ calculations and MM pricing modules together to build a complete RFQ workflow.

## Table of Contents

- [Overview](#overview)
- [Workflow Diagram](#workflow-diagram)
- [SELL Order Workflow](#sell-order-workflow)
- [BUY Order Workflow](#buy-order-workflow)
- [Complete Examples](#complete-examples)

## Overview

An RFQ (Request for Quote) workflow involves:

1. **Validate strikes** - Ensure strikes meet on-chain requirements
2. **Get MM pricing** - Fetch indicative prices from market makers
3. **Calculate position size** - Determine number of contracts
4. **Calculate reserve price** - Set the minimum acceptable premium
5. **Submit RFQ** - Send the request to the option factory

### Module Responsibilities

| Module | Purpose |
|--------|---------|
| `rfqCalculations` | Position sizing (numContracts, collateral) |
| `mmPricing` | Price discovery (bid/ask with fees and carrying cost) |
| `optionFactory` | RFQ submission and settlement |

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
│  - Trade amount (USDC, WETH, or cbBTC)                          │
│  - Product type (PUT, CALL_SPREAD, etc.)                        │
│  - Strikes                                                       │
│  - Direction (buy/sell)                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    1. VALIDATE STRIKES                           │
│  validateButterfly() / validateCondor() / validateIronCondor()  │
│  validateRanger()                                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    2. GET MM PRICING                             │
│  mmPricing.getTickerPricing() or getSpreadPricing() etc.        │
│  Returns: feeAdjustedBid, feeAdjustedAsk                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 3. CALCULATE NUM CONTRACTS                       │
│  calculateNumContracts({ tradeAmount, product, strikes, ... })  │
│  SELL: based on collateral / max loss                           │
│  BUY: based on premium / price per contract                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 4. CALCULATE RESERVE PRICE                       │
│  calculateReservePrice(numContracts, mmPrice, spot, product)    │
│  This is the minimum premium you'll accept                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     5. SUBMIT RFQ                                │
│  optionFactory.requestQuotation({ numContracts, reservePrice }) │
└─────────────────────────────────────────────────────────────────┘
```

## SELL Order Workflow

When selling options, you provide collateral and receive premium.

### Step-by-Step

```typescript
import {
  ThetanutsClient,
  validateIronCondor,
  calculateNumContracts,
  calculateCollateralRequired,
  calculateReservePrice,
} from '@anthropic/thetanuts-sdk';

async function sellIronCondor(
  client: ThetanutsClient,
  tradeAmount: number,  // USDC to put up as collateral
  strikes: number[],    // [putLower, putUpper, callLower, callUpper]
  expiry: number        // Unix timestamp
) {
  // 1. Validate strikes
  const validation = validateIronCondor(strikes);
  if (!validation.valid) {
    throw new Error(`Invalid strikes: ${validation.error}`);
  }

  // 2. Get MM pricing
  const condorPricing = await client.mmPricing.getCondorPricing({
    underlying: 'ETH',
    strike1: strikes[0] * 1e8,
    strike2: strikes[1] * 1e8,
    strike3: strikes[2] * 1e8,
    strike4: strikes[3] * 1e8,
    expiry,
    type: 'iron',
  });

  // 3. Calculate number of contracts
  const numContracts = calculateNumContracts({
    tradeAmount,
    product: 'IRON_CONDOR',
    strikes,
    isBuy: false,
  });

  // 4. Calculate reserve price (minimum premium to receive)
  const spot = await client.api.getSpotPrice('ETH');
  const reservePrice = calculateReservePrice(
    numContracts,
    condorPricing.netMmBidPrice,  // Use bid for selling
    spot,
    'IRON_CONDOR'
  );

  // 5. Calculate collateral required
  const collateral = calculateCollateralRequired(
    numContracts,
    'IRON_CONDOR',
    strikes
  );

  console.log({
    numContracts,
    reservePrice,
    collateral,
    mmBidPrice: condorPricing.netMmBidPrice,
  });

  // 6. Submit RFQ (example - actual implementation may vary)
  // const rfq = await client.optionFactory.buildIronCondorRFQ({
  //   underlying: 'ETH',
  //   strikes,
  //   expiry,
  //   isLong: false,
  //   numContracts,
  //   reservePrice,
  // });
}
```

## BUY Order Workflow

When buying options, you pay premium to acquire contracts.

### Step-by-Step

```typescript
import {
  ThetanutsClient,
  calculateNumContracts,
  calculateReservePrice,
  premiumPerContract,
} from '@anthropic/thetanuts-sdk';

async function buyPut(
  client: ThetanutsClient,
  tradeAmount: number,  // USDC budget for premium
  strike: number,
  expiry: number
) {
  // 1. Get MM pricing
  const ticker = `ETH-${formatExpiry(expiry)}-${strike}-P`;
  const pricing = await client.mmPricing.getTickerPricing(ticker);

  // 2. Get spot price
  const spot = await client.api.getSpotPrice('ETH');

  // 3. Calculate premium per contract in USDC
  const premiumUsd = premiumPerContract(
    pricing.feeAdjustedAsk,  // Use ask for buying
    spot,
    'PUT'
  );

  // 4. Calculate number of contracts from budget
  const numContracts = calculateNumContracts({
    tradeAmount,
    product: 'PUT',
    strikes: [strike],
    isBuy: true,
    mmPrice: pricing.feeAdjustedAsk,
    spot,
  });

  // 5. Calculate reserve price (maximum premium to pay)
  const reservePrice = calculateReservePrice(
    numContracts,
    pricing.feeAdjustedAsk,
    spot,
    'PUT'
  );

  console.log({
    numContracts,
    premiumPerContract: premiumUsd,
    totalPremium: reservePrice,
    mmAskPrice: pricing.feeAdjustedAsk,
  });
}
```

## Complete Examples

### Example 1: Sell PUT

```typescript
import {
  ThetanutsClient,
  calculateNumContracts,
  calculateCollateralRequired,
  calculateReservePrice,
} from '@anthropic/thetanuts-sdk';

const client = new ThetanutsClient({ chainId: 8453 });

// User wants to sell PUT with 4000 USDC
const tradeAmount = 4000;
const strike = 2000;
const product = 'PUT';

// Get MM pricing
const pricing = await client.mmPricing.getTickerPricing('ETH-16MAR24-2000-P');
const spot = 2500;

// Calculate position
const numContracts = calculateNumContracts({
  tradeAmount,
  product,
  strikes: [strike],
  isBuy: false,
});
// Result: 2 contracts (4000 / 2000)

const collateral = calculateCollateralRequired(numContracts, product, [strike]);
// Result: 4000 USDC

const reservePrice = calculateReservePrice(
  numContracts,
  pricing.feeAdjustedBid,
  spot,
  product
);
// Result: premium in USDC

console.log(`Selling ${numContracts} PUT contracts`);
console.log(`Collateral required: ${collateral} USDC`);
console.log(`Expected premium: ${reservePrice} USDC`);
```

### Example 2: Buy CALL_SPREAD

```typescript
import {
  ThetanutsClient,
  calculateNumContracts,
  calculateReservePrice,
} from '@anthropic/thetanuts-sdk';

const client = new ThetanutsClient({ chainId: 8453 });

// User wants to buy CALL_SPREAD with 500 USDC budget
const budget = 500;
const strikes = [2000, 2500];
const product = 'CALL_SPREAD';

// Get spread pricing
const spreadPricing = await client.mmPricing.getSpreadPricing({
  underlying: 'ETH',
  strike1: 200000000000,
  strike2: 250000000000,
  expiry: 1710547200,
  isCall: true,
});

const spot = 2500;

// Calculate how many contracts we can buy
const numContracts = calculateNumContracts({
  tradeAmount: budget,
  product,
  strikes,
  isBuy: true,
  mmPrice: spreadPricing.netMmAskPrice,
  spot,
});

const reservePrice = calculateReservePrice(
  numContracts,
  spreadPricing.netMmAskPrice,
  spot,
  product
);

console.log(`Buying ${numContracts} CALL_SPREAD contracts`);
console.log(`Total premium: ${reservePrice} USDC`);
```

### Example 3: Sell IRON_CONDOR with Validation

```typescript
import {
  ThetanutsClient,
  validateIronCondor,
  calculateNumContracts,
  calculateCollateralRequired,
  calculateReservePrice,
} from '@anthropic/thetanuts-sdk';

const client = new ThetanutsClient({ chainId: 8453 });

// Iron condor with unequal spreads
const strikes = [1800, 1900, 2100, 2250];
// putSpread = 100, callSpread = 150

// 1. Validate
const validation = validateIronCondor(strikes);
if (!validation.valid) {
  console.error('Invalid:', validation.error);
  process.exit(1);
}

// 2. Get pricing
const condorPricing = await client.mmPricing.getCondorPricing({
  underlying: 'ETH',
  strike1: 180000000000,
  strike2: 190000000000,
  strike3: 210000000000,
  strike4: 225000000000,
  expiry: 1710547200,
  type: 'iron',
});

const spot = 2000;

// 3. Calculate position (width = max(100, 150) = 150)
const numContracts = calculateNumContracts({
  tradeAmount: 1500,  // 1500 USDC
  product: 'IRON_CONDOR',
  strikes,
  isBuy: false,
});
// Result: 10 contracts

const collateral = calculateCollateralRequired(
  numContracts,
  'IRON_CONDOR',
  strikes
);
// Result: 1500 USDC (10 × 150)

const reservePrice = calculateReservePrice(
  numContracts,
  condorPricing.netMmBidPrice,
  spot,
  'IRON_CONDOR'
);

console.log(`Selling ${numContracts} IRON_CONDOR contracts`);
console.log(`Collateral: ${collateral} USDC`);
console.log(`Expected premium: ${reservePrice} USDC`);
```

## Summary

| Step | SELL Order | BUY Order |
|------|------------|-----------|
| Input | Collateral amount | Premium budget |
| MM Price | Use `feeAdjustedBid` | Use `feeAdjustedAsk` |
| numContracts | `tradeAmount / maxLoss` | `tradeAmount / premium` |
| reservePrice | Minimum to receive | Maximum to pay |
| Collateral | Calculated from numContracts | Not required (buyer) |

## Related Documentation

- [RFQ Calculations Guide](./rfq-calculations.md)
- [MM Pricing Guide](./mm-pricing.md)
- [Product Types Reference](./product-types.md)
- [Validation Functions](./validation.md)
