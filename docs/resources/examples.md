# Examples

Runnable TypeScript examples covering the most common SDK workflows.

## Overview

All examples live in the [`docs/examples/`](../examples/) directory. Each file is self-contained and can be run directly with `ts-node` or adapted into your own integration.

---

## Example Files

### [fill-order.ts](../examples/fill-order.ts)

Complete OptionBook fill flow with preview, approval, and error handling.

Covers: previewing a fill, checking and approving token allowances, executing the fill transaction, and handling common error cases such as insufficient balance and expired orders.

---

### [claim-fees.ts](../examples/claim-fees.ts)

Check and claim referrer fees across all collateral tokens.

Covers: fetching all claimable fee balances per collateral token using `getAllClaimableFees()`, filtering tokens with non-zero balances, and batching claims with `claimAllFees()`.

---

### [create-rfq.ts](../examples/create-rfq.ts)

Complete RFQ creation flow for both BUY and SELL directions.

Covers: building RFQ parameters with `buildRFQRequest()`, approving collateral tokens for SELL positions, encoding and submitting the `requestForQuotation` transaction, and polling for incoming offers.

---

### [physical-option-rfq.ts](../examples/physical-option-rfq.ts)

Physically settled option RFQ (vanilla options only).

Covers: creating an RFQ for a physically settled vanilla option, setting `extraOptionData` for physical settlement, and the differences in collateral handling compared to cash-settled options.

---

### [fetch-pricing.ts](../examples/fetch-pricing.ts)

MM pricing retrieval with filters.

Covers: fetching all pricing with `getAllPricing()`, filtering by expiry, strike range, and option type using the built-in filter utilities, and displaying a sorted pricing table.

---

### [option-management.ts](../examples/option-management.ts)

Option queries and operations.

Covers: fetching full option info with `getFullOptionInfo()`, checking expiry and settlement status, querying buyer and seller addresses, and performing settlement or exercise transactions.

---

### [query-stats.ts](../examples/query-stats.ts)

Protocol and referrer statistics.

Covers: fetching combined protocol stats, querying referrer-specific stats including volume and fee breakdowns, and reading daily time-series data via `getDailyStats()`, `getBookDailyStats()`, and `getFactoryDailyStats()`.

---

## Running an Example

```bash
# Install dependencies
npm install

# Run a specific example (requires ts-node)
npx ts-node docs/examples/fetch-pricing.ts
```

Most examples require a configured `ThetanutsClient`. See [Quick Start](../getting-started/quick-start.md) for setup instructions.

---

## See Also

- [Quick Start](../getting-started/quick-start.md) - Set up your first client instance
- [Migration Guide](./migration-guide.md) - Upgrade from older SDK patterns
- [Changelog](./changelog.md) - Version history
