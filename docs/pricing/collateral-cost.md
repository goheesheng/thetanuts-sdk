# Collateral Cost Reference

Understand how collateral carrying cost is calculated, what APR rates apply per asset, and how it affects the pricing of short option positions.

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Reserve Price** | The max (BUY) or min (SELL) acceptable total premium per contract |
| **Collateral** | Funds locked by the seller to secure the option; pulled at settlement |
| **Collateral Cost** | Opportunity cost of locked capital: `amount × APR × time` |

---

## APR Rates

The SDK uses fixed annual percentage rates per collateral type:

| Collateral | APR | Example |
|------------|-----|---------|
| BTC (cbBTC) | 1% | 1 BTC locked for 1 year costs 0.01 BTC |
| ETH (WETH) | 4% | 1 ETH locked for 30 days costs ≈ 0.00329 ETH |
| USD (USDC) | 7% | $2000 locked for 30 days costs ≈ $11.51 |

```typescript
import { COLLATERAL_APR } from '@thetanuts-finance/thetanuts-client';

console.log(COLLATERAL_APR);
// { BTC: 0.01, ETH: 0.04, USD: 0.07 }
```

---

## Collateral Cost Formula

```
collateralCost = collateralValue × APR × timeToExpiry
```

Where `timeToExpiry` is expressed in years (e.g., 30 days = `30 / 365`).

### Vanilla Option Example

```typescript
import { calculateCollateralCost } from '@thetanuts-finance/thetanuts-client';

// PUT option: 1 contract at strike 2000, 30 days to expiry, USDC collateral
const collateralUsd = 2000;
const timeToExpiryYears = 30 / 365;
const collateralType = 'USD';

const cost = calculateCollateralCost(collateralUsd, timeToExpiryYears, collateralType);
// cost = 2000 × 0.07 × (30/365) = $11.51
```

### Spread Collateral Cost

For spreads, the carrying cost is based on the **spread width** (max loss), not the sum of individual leg costs.

```typescript
import { calculateSpreadCollateralCost } from '@thetanuts-finance/thetanuts-client';

// CALL_SPREAD [2000, 2500]: width = $500
const widthUsd = 500;
const timeToExpiryYears = 30 / 365;

const spreadCC = calculateSpreadCollateralCost(widthUsd, timeToExpiryYears);
// spreadCC = 500 × 0.07 × (30/365) = $2.88
```

---

## How Carrying Cost Affects Pricing

Collateral cost is only relevant for **short positions** (sellers). It is subtracted from the bid price, representing the minimum premium a seller needs to cover their cost of capital.

| Price Direction | Formula |
|-----------------|---------|
| Ask (long/buy)  | `rawAsk + feeAdjustment` |
| Bid (short/sell) | `rawBid - feeAdjustment - collateralCost` |

The `byCollateral` breakdown on ticker pricing exposes per-collateral MM prices:

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const pricing = await client.mmPricing.getTickerPricing('ETH-16FEB26-1800-P');

// Fee-adjusted prices (no collateral cost applied)
console.log(pricing.feeAdjustedBid);
console.log(pricing.feeAdjustedAsk);

// MM prices per collateral type (collateral cost factored in)
console.log(pricing.byCollateral.USD.mmBidPrice);  // Lower than feeAdjustedBid
console.log(pricing.byCollateral.USD.mmAskPrice);  // Same as feeAdjustedAsk (buyers don't pay CC)
console.log(pricing.byCollateral.ETH.mmBidPrice);
console.log(pricing.byCollateral.ETH.mmAskPrice);
```

### Position-Level Collateral Cost

`getPositionPricing` returns the carrying cost as an explicit field:

```typescript
const position = await client.mmPricing.getPositionPricing({
  ticker: 'ETH-16FEB26-1800-P',
  isLong: false,          // Short = seller pays collateral cost
  numContracts: 5,
  collateralToken: 'USDC',
});

console.log(position.basePremium);     // Fee-adjusted price only
console.log(position.collateralCost);  // Carrying cost component
console.log(position.totalPrice);      // basePremium - collateralCost (for short)
```

---

## Collateral by Product Type

Different products lock different collateral amounts. The max loss per contract determines the collateral requirement.

| Product | Collateral Locked (per contract) |
|---------|----------------------------------|
| PUT | `strike` USDC |
| INVERSE_CALL | `1` WETH (or cbBTC for BTC) |
| LINEAR_CALL | `strike` USDC |
| CALL_SPREAD / PUT_SPREAD | `upperStrike - lowerStrike` USDC |
| IRON_CONDOR | `max(putSpreadWidth, callSpreadWidth)` USDC |

For collateral calculations:

```typescript
import { calculateCollateralRequired } from '@thetanuts-finance/thetanuts-client';

// PUT: 5 contracts at strike 2000 = 10000 USDC
calculateCollateralRequired(5, 'PUT', [2000]);
// Result: 10000

// CALL_SPREAD: 10 contracts, strikes [2000, 2500] = 5000 USDC
calculateCollateralRequired(10, 'CALL_SPREAD', [2000, 2500]);
// Result: 5000 (10 × 500 width)

// INVERSE_CALL: 10 contracts = 10 WETH
calculateCollateralRequired(10, 'INVERSE_CALL', [2000]);
// Result: 10
```

---

## See Also

- [MM Pricing Overview](./mm-pricing.md) - Fee adjustment formula and `MMPricingModule` methods
- [Position & Spread Pricing](./position-spread-pricing.md) - `getPositionPricing` and `getSpreadPricing` with collateral cost
- [Filters & Utilities](./filters-utilities.md) - Filter and sort helpers for pricing arrays
