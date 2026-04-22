# Filters & Utilities

Helper methods on `MMPricingModule` for filtering, sorting, and selecting pricing data from a pricing array.

## Setup

All utilities are methods on `client.mmPricing`. Start by fetching a pricing array:

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const all = await client.mmPricing.getAllPricing('ETH');
const values = Object.values(all);
```

---

## filterExpired

Removes options whose expiry has already passed.

```typescript
const active = client.mmPricing.filterExpired(values);
// Returns only options with expiry > Date.now()
```

---

## sortByExpiryAndStrike

Sorts options by nearest expiry first, then ascending strike within each expiry.

```typescript
const sorted = client.mmPricing.sortByExpiryAndStrike(values);
// [{ expiry: 1710547200, strike: 1800 }, { expiry: 1710547200, strike: 2000 }, ...]
```

---

## getUniqueExpiries

Returns a deduplicated list of expiry date strings in `YYYY-MM-DD` format, sorted ascending.

```typescript
const expiries = client.mmPricing.getUniqueExpiries(values);
// ['2025-02-16', '2025-03-16', '2025-06-27', ...]
```

---

## filterByType

Filters the array to only calls (`isCall: true`) or only puts (`isCall: false`).

```typescript
const puts  = client.mmPricing.filterByType(values, false);
const calls = client.mmPricing.filterByType(values, true);
```

---

## filterByExpiry

Filters the array to options expiring on a specific date string (`YYYY-MM-DD`).

```typescript
const feb16 = client.mmPricing.filterByExpiry(values, '2025-02-16');
```

---

## filterByStrikeRange

Filters the array to options whose strike falls within `[min, max]` (inclusive).

```typescript
const nearATM = client.mmPricing.filterByStrikeRange(values, 1800, 2200);
```

---

## getPricingArray

Convenience method: fetches all pricing for an underlying, removes expired entries, and returns the result as a sorted array in one call.

```typescript
const pricing = await client.mmPricing.getPricingArray('ETH');
// Equivalent to:
// const all = await client.mmPricing.getAllPricing('ETH');
// const sorted = client.mmPricing.sortByExpiryAndStrike(
//   client.mmPricing.filterExpired(Object.values(all))
// );
```

---

## Combining Utilities

Utilities can be chained to build a precise subset. Example: active put options near ATM for a specific expiry.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453 });

const pricing = await client.mmPricing.getPricingArray('ETH');

const nearATMPuts = client.mmPricing.filterByStrikeRange(
  client.mmPricing.filterByType(
    client.mmPricing.filterByExpiry(pricing, '2025-03-16'),
    false  // puts only
  ),
  1800,
  2200
);

console.log(nearATMPuts.map(p => p.strike));
// [1800, 1900, 2000, 2100, 2200]
```

---

## See Also

- [MM Pricing Overview](./mm-pricing.md) - `getAllPricing`, `getTickerPricing`, and `MMPricingModule` method table
- [Position & Spread Pricing](./position-spread-pricing.md) - `getPositionPricing` and `getSpreadPricing`
- [Collateral Cost Reference](./collateral-cost.md) - APR rates and carrying cost formula
