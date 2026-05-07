# Position & Spread Pricing

Fetch position-level pricing (with collateral cost) for single options and multi-leg spreads, and integrate `rfqCalculations`, `mmPricing`, and `optionFactory` into a complete RFQ workflow.

## getPositionPricing

Returns pricing for a specific option position including collateral cost. Use this when you know the direction (long/short), contract count, and collateral token.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const position = await client.mmPricing.getPositionPricing({
  ticker: 'ETH-16FEB26-1800-P',
  isLong: true,         // true = BUY, false = SELL
  numContracts: 10,
  collateralToken: 'USDC',
});

console.log(position.basePremium);     // Fee-adjusted price before carrying cost
console.log(position.collateralCost);  // Carrying cost added for short positions
console.log(position.totalPrice);      // Final all-in price including collateral cost
```

For short positions, `collateralCost` is calculated as:

```
collateralCost = collateralValue × APR × timeToExpiry
```

where APR is 1% for BTC, 4% for ETH, 7% for USD collateral.

---

## getSpreadPricing

Returns net spread pricing for a two-leg structure. Multi-leg structures use a **spread-level** collateral cost based on the spread width (max loss), not the sum of per-leg costs.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const spread = await client.mmPricing.getSpreadPricing({
  underlying: 'ETH',
  strikes: [220000000000n, 200000000000n],  // 8 decimals: $2200, $2000
  expiry: 1774627200,
  isCall: false,  // Put spread
});

// Width and collateral cost
console.log('Width (USD):', spread.widthUsd);                // e.g. 200
console.log('Spread CC (USD):', spread.spreadCollateralCost); // e.g. ~$0.42
console.log('Net spread price (ETH):', spread.netSpreadPrice);

// Net MM prices already include the spread-level collateral cost
const ethPrice = spread.nearLeg.underlyingPrice;
console.log('Ask (USD):', (spread.netMmAskPrice * ethPrice).toFixed(2));
console.log('Bid (USD):', (spread.netMmBidPrice * ethPrice).toFixed(2));
```

---

## getButterflyPricing

Returns net pricing for a three-leg butterfly. Strikes are passed in the order `[lower, middle, upper]` (8-decimal price units). Width-based collateral cost mirrors the spread case.

```typescript
const fly = await client.mmPricing.getButterflyPricing({
  underlying: 'ETH',
  strikes: [180000000000n, 200000000000n, 220000000000n],  // $1800, $2000, $2200
  expiry: 1774627200,
  isCall: true,
});

console.log('Width (USD):', fly.widthUsd);
console.log('Net ask (ETH):', fly.netMmAskPrice);
console.log('Net bid (ETH):', fly.netMmBidPrice);
```

---

## getCondorPricing

Returns net pricing for a four-leg condor (`[strike1, strike2, strike3, strike4]`, ascending). Same collateral-cost model as butterfly — based on the wider wing.

```typescript
const condor = await client.mmPricing.getCondorPricing({
  underlying: 'ETH',
  strikes: [
    160000000000n,  // $1600
    180000000000n,  // $1800
    220000000000n,  // $2200
    240000000000n,  // $2400
  ],
  expiry: 1774627200,
  isCall: false,
});

console.log('Net ask (ETH):', condor.netMmAskPrice);
console.log('Net bid (ETH):', condor.netMmBidPrice);
```

For iron condors and richer 4-strike combinations, validate parameters with `validateCondor` / `validateIronCondor` from the rfqCalculations helpers before submitting.

---

## How rfqCalculations, mmPricing, and optionFactory Fit Together

The three modules divide responsibilities cleanly:

| Module | Purpose |
|--------|---------|
| `rfqCalculations` | Position sizing: `numContracts`, `collateral`, `reservePrice` |
| `mmPricing` | Price discovery: fee-adjusted bid/ask, collateral carrying cost |
| `optionFactory` | RFQ submission and settlement lifecycle |

### Workflow

```
User Input (amount, product, strikes, direction)
       │
       ▼
1. Get MM pricing        → mmPricing.getTickerPricing() / getSpreadPricing()
       │
       ▼
2. Calculate contracts   → calculateNumContracts({ tradeAmount, product, strikes, isBuy })
       │
       ▼
3. Calculate reserve     → calculateReservePrice(numContracts, mmPrice, spot, product)
       │
       ▼
4. Submit RFQ            → optionFactory.requestForQuotation(request)
```

### SELL Order Example

When selling, use `feeAdjustedBid` and supply collateral.

```typescript
import {
  ThetanutsClient,
  calculateNumContracts,
  calculateCollateralRequired,
  calculateReservePrice,
} from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

// User sells PUT with 4000 USDC collateral
const tradeAmount = 4000;
const strike = 2000;
const spot = 2500;

const pricing = await client.mmPricing.getTickerPricing('ETH-16MAR24-2000-P');

const numContracts = calculateNumContracts({
  tradeAmount,
  product: 'PUT',
  strikes: [strike],
  isBuy: false,
});
// Result: 2 contracts (4000 / 2000)

const collateral = calculateCollateralRequired(numContracts, 'PUT', [strike]);
// Result: 4000 USDC

const reservePrice = calculateReservePrice(
  numContracts,
  pricing.feeAdjustedBid,  // Use bid for selling
  spot,
  'PUT'
);
// Result: minimum premium to receive (in USDC)

console.log(`Selling ${numContracts} contracts`);
console.log(`Collateral required: ${collateral} USDC`);
console.log(`Reserve price: ${reservePrice} USDC`);
```

### BUY Order Example

When buying, use `feeAdjustedAsk` and specify a premium budget.

```typescript
import {
  ThetanutsClient,
  calculateNumContracts,
  calculateReservePrice,
} from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const budget = 200;  // USDC to spend on premium
const strike = 2000;
const spot = 2000;

const pricing = await client.mmPricing.getTickerPricing('ETH-16MAR24-2000-P');

const numContracts = calculateNumContracts({
  tradeAmount: budget,
  product: 'PUT',
  strikes: [strike],
  isBuy: true,
  mmPrice: pricing.feeAdjustedAsk,  // Use ask for buying
  spot,
});
// Result: 2 contracts (200 / 100 premium per contract)

const reservePrice = calculateReservePrice(
  numContracts,
  pricing.feeAdjustedAsk,
  spot,
  'PUT'
);
// Result: maximum premium to pay (in USDC)

console.log(`Buying ${numContracts} contracts`);
console.log(`Reserve price: ${reservePrice} USDC`);
```

### BUY vs SELL Summary

| | SELL Order | BUY Order |
|-|------------|-----------|
| Input amount | Collateral to post | Premium budget |
| MM price to use | `feeAdjustedBid` | `feeAdjustedAsk` |
| `numContracts` formula | `tradeAmount / maxLoss` | `tradeAmount / premiumPerContract` |
| `reservePrice` meaning | Minimum premium to receive | Maximum premium to pay |
| Collateral required | Yes — from `calculateCollateralRequired` | No (buyer) |

---

## See Also

- [MM Pricing Overview](./mm-pricing.md) - `getAllPricing`, `getTickerPricing`, fee adjustment formula
- [Collateral Cost Reference](./collateral-cost.md) - APR rates and carrying cost formula
- [Filters & Utilities](./filters-utilities.md) - Filter and sort helpers for pricing arrays
