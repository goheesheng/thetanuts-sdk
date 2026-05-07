# MM Pricing Overview

Fetch indicative market maker prices with fee adjustments and collateral carrying costs for vanilla options and multi-leg structures.

## Overview

The `MMPricingModule` fetches prices from market makers and applies two adjustments:

1. **Fee Adjustment** - Widens the bid-ask spread to account for exchange fees
2. **Collateral Carrying Cost** - Adds the opportunity cost of capital for short positions

### Importing

```typescript
import {
  MMPricingModule,
  applyFeeAdjustment,
  calculateCollateralCost,
  parseTicker,
  buildTicker,
  COLLATERAL_APR,
} from '@thetanuts-finance/thetanuts-client';
```

### Module Initialization

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });
const mmPricing = client.mmPricing;
```

---

## Fee Adjustment Formula

Market maker prices are adjusted to account for exchange fees:

```
feeAdjustment = min(0.0003, rawPrice × 0.125)
```

- **Ask price:** `feeAdjustedAsk = rawAsk + feeAdjustment`
- **Bid price:** `feeAdjustedBid = rawBid - feeAdjustment`

The adjustment is capped at 0.0003 (0.03% of 1 contract) to prevent excessive spread widening for high-premium options.

```typescript
import { applyFeeAdjustment } from '@thetanuts-finance/thetanuts-client';

const rawBid = 0.02;
const rawAsk = 0.025;

const adjustedBid = applyFeeAdjustment(rawBid, 'bid');
const adjustedAsk = applyFeeAdjustment(rawAsk, 'ask');

// feeAdjustment = min(0.0003, 0.02 * 0.125) = 0.0003
// adjustedBid = 0.02 - 0.0003 = 0.0197
// adjustedAsk = 0.025 + 0.0003 = 0.0253
```

---

## Collateral Carrying Cost

Short positions require locked collateral with an opportunity cost. The SDK applies per-asset APR rates:

| Asset | APR |
|-------|-----|
| BTC   | 1%  |
| ETH   | 4%  |
| USD   | 7%  |

```
collateralCost = collateralValue × APR × timeToExpiry
```

Where `timeToExpiry` is expressed in years.

```typescript
import { calculateCollateralCost, COLLATERAL_APR } from '@thetanuts-finance/thetanuts-client';

console.log(COLLATERAL_APR);
// { BTC: 0.01, ETH: 0.04, USD: 0.07 }

// PUT at strike 2000, 30 days to expiry
const cost = calculateCollateralCost(2000, 30 / 365, 'USD');
// cost = 2000 × 0.07 × (30/365) = $11.51
```

---

## getAllPricing

Fetches all option prices for an underlying asset, grouped by expiry.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const allETH = await client.mmPricing.getAllPricing('ETH');
const allBTC = await client.mmPricing.getAllPricing('BTC');

// Returns: MMAllPricingResponse
// {
//   expirations: [
//     {
//       expiry: 1710547200,
//       expiryLabel: '16MAR24',
//       options: [
//         { strike: 1800, isCall: true, bid: 0.05, ask: 0.055, ... },
//         { strike: 1800, isCall: false, bid: 0.02, ask: 0.025, ... },
//       ]
//     }
//   ]
// }
```

---

## getTickerPricing

Fetches fee-adjusted pricing for a specific option ticker. Returns per-collateral breakdowns.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const pricing = await client.mmPricing.getTickerPricing('ETH-16FEB26-1800-P');

console.log(pricing.rawBidPrice);
console.log(pricing.rawAskPrice);
console.log(pricing.feeAdjustedBid);
console.log(pricing.feeAdjustedAsk);

// Per-collateral breakdowns (include collateral carrying cost)
console.log(pricing.byCollateral.USD.mmBidPrice);
console.log(pricing.byCollateral.USD.mmAskPrice);
console.log(pricing.byCollateral.ETH.mmBidPrice);
console.log(pricing.byCollateral.ETH.mmAskPrice);
```

---

## getPricingArray

Convenience wrapper that flattens `getAllPricing(...)` into a single sorted, non-expired array. Useful when you want to paginate or filter across all expiries at once instead of walking the nested `expirations[]` shape.

```typescript
const all = await client.mmPricing.getPricingArray('ETH');

// Already sorted by expiry, then strike. Expired options filtered out.
const calls = all.filter((p) => p.isCall);
const nearTerm = all.filter((p) => p.expiry < someThreshold);
```

For richer slicing (by date range, strike range, type), pair this with the helpers in [Filters & Utilities](./filters-utilities.md).

---

## MMPricingModule Method Table

| Method | Description | Signer Required |
|--------|-------------|-----------------|
| `getAllPricing(underlying)` | All pricing for ETH/BTC | No |
| `getTickerPricing(ticker)` | Pricing for specific ticker | No |
| `getPositionPricing(params)` | Long/short pricing with collateral cost | No |
| `getSpreadPricing(params)` | 2-leg spread pricing | No |
| `getButterflyPricing(params)` | 3-leg butterfly pricing | No |
| `getCondorPricing(params)` | 4-leg condor pricing | No |
| `filterExpired(pricing[])` | Filter out expired options | No |
| `sortByExpiryAndStrike(pricing[])` | Sort by expiry, then strike | No |
| `getUniqueExpiries(pricing[])` | Get unique expiry dates | No |
| `filterByType(pricing[], isCall)` | Filter calls or puts | No |
| `filterByExpiry(pricing[], date)` | Filter by expiry date | No |
| `filterByStrikeRange(pricing[], min, max)` | Filter by strike range | No |
| `getPricingArray(underlying)` | Sorted, non-expired pricing array | No |

---

## Price Components Summary

| Component | Description | Applies To |
|-----------|-------------|------------|
| Raw Price | Market maker's base price | All |
| Fee Adjustment | Exchange fee spread widening | All |
| Collateral Cost | Cost of capital for short positions | Short only |

**Final Ask (buying/going long):**
```
finalAsk = rawAsk + feeAdjustment
```

**Final Bid (selling/going short):**
```
finalBid = rawBid - feeAdjustment - collateralCost
```

---

## See Also

- [Position & Spread Pricing](./position-spread-pricing.md) - `getPositionPricing` and `getSpreadPricing` with collateral cost details
- [Collateral Cost Reference](./collateral-cost.md) - APR rates and the carrying cost formula
- [Filters & Utilities](./filters-utilities.md) - Filter and sort helpers for pricing arrays
