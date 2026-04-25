# Pricing & Calculation

Browse available strikes, calculate exact loan costs, and check promotional pricing eligibility.

## Fetch Strike Options

`getStrikeOptions()` fetches live pricing from the Deribit-style API, filters for valid OTM put options, calculates estimated APRs, and groups results by expiry date.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

// ETH strikes with default settings
const groups = await client.loan.getStrikeOptions('ETH');

// BTC strikes with custom filters
const btcGroups = await client.loan.getStrikeOptions('BTC', {
  minDurationDays: 30,   // At least 30 days to expiry
  maxStrikes: 5,         // Top 5 strikes per expiry
  sortOrder: 'highestStrike',
  maxApr: 15,            // Borrowing rate for cost estimation
});
```

### Strike Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `minDurationDays` | `7` | Minimum days until expiry |
| `maxStrikes` | `20` | Maximum strikes per expiry group |
| `sortOrder` | `'highestStrike'` | `'highestStrike'`, `'lowestStrike'`, `'nearestExpiry'`, `'furthestExpiry'` |
| `maxApr` | `20` | Borrowing APR used for cost estimation (not a filter) |

### Strike Option Fields

Each option in a group contains:

| Field | Type | Description |
|-------|------|-------------|
| `strike` | `number` | Strike price in USD |
| `strikeFormatted` | `string` | `"$1,600"` |
| `expiry` | `number` | Unix timestamp |
| `expiryFormatted` | `string` | `"Fri, March 28, 2025"` |
| `expiryLabel` | `string` | Deribit format: `"28MAR25"` |
| `underlyingPrice` | `number` | Current underlying price |
| `askPrice` | `number` | Option ask price (fraction of underlying) |
| `impliedLoanAmount` | `number` | Estimated receive per unit of collateral |
| `effectiveApr` | `number` | All-in APR including all costs |
| `isPromo` | `boolean` | Promotional pricing eligible |

---

## Calculate Loan Costs

`calculateLoan()` is synchronous — pure BigInt math, no network calls. Use it after selecting a strike from `getStrikeOptions()`.

```typescript
const calc = client.loan.calculateLoan({
  depositAmount: '2.5',       // 2.5 ETH
  underlying: 'ETH',
  strike: 1800,               // $1,800 strike
  expiryTimestamp: 1780041600, // Unix seconds
  askPrice: 0.007,             // from strike option
  underlyingPrice: 2500,       // from strike option
  maxApr: 20,                  // borrowing rate (default: 20)
});

if (calc) {
  // Raw BigInt values (USDC, 6 decimals)
  console.log(calc.owe);             // Total owed at expiry
  console.log(calc.optionCost);      // Option premium
  console.log(calc.capitalCost);     // Borrowing fee
  console.log(calc.protocolFee);     // Protocol fee (4 bps)
  console.log(calc.totalCosts);      // Sum of all costs
  console.log(calc.finalLoanAmount); // What you receive

  // Formatted strings
  console.log(calc.formatted.receive);    // "4198.23"
  console.log(calc.formatted.repay);      // "4500.00"
  console.log(calc.formatted.optionCost); // "43.7500"
  console.log(calc.formatted.capitalCost);// "98.6301"
  console.log(calc.formatted.protocolFee);// "1.8000"
  console.log(calc.formatted.apr);        // "14.52"

  // Use finalLoanAmount as minSettlementAmount in requestLoan()
  await client.loan.requestLoan({
    underlying: 'ETH',
    collateralAmount: '2.5',
    strike: 1800,
    expiryTimestamp: 1780041600,
    minSettlementAmount: calc.finalLoanAmount,
  });
}
```

Returns `null` if inputs are invalid (zero deposit, zero strike, etc.) or if the final loan amount would be negative.

---

## Promotional Pricing

Check if a specific strike qualifies for promotional rates:

```typescript
const isPromo = client.loan.isPromoOption(
  1200,           // strike price in USD
  2500,           // current underlying price
  1790041600,     // expiry timestamp
  50000,          // estimated loan amount in USD (optional, for $250k cap)
);

console.log(isPromo); // true if eligible
```

### Promo Eligibility Rules

| Condition | Requirement |
|-----------|-------------|
| Days to expiry | > 90 days |
| LTV ratio | < 50% (strike / underlyingPrice) |
| Loan amount | < $250,000 per person |
| Total pool | < $2,000,000 across all promo loans |

When promo applies:
- Option premium is waived (`optionCost = 0`)
- Borrowing APR is fixed at 5.68%

---

## Raw Pricing Data

Access the underlying Deribit-style pricing API directly:

```typescript
const pricing = await client.loan.fetchPricing();

// pricing['ETH']['ETH-28MAR25-3000-P'] = {
//   underlying_price: 2500,
//   ask_price: 0.007,
//   mark_price: 0.0065,
// }

// Cached for 30 seconds — subsequent calls return cached data
const cached = await client.loan.fetchPricing(); // instant if < 30s
```

---

## See Also

- [Overview](overview.md) — Module overview and cost formula
- [Borrowing](borrowing.md) — Full borrowing workflow
- [Lending](lending.md) — Fill limit orders and earn yield
