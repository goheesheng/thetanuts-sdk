# OptionBook Overview

Fill existing market-maker orders for vanilla options on-chain without needing a counterparty.

## What is OptionBook?

OptionBook is the order-book side of the Thetanuts protocol. Market makers post signed orders for vanilla options (PUTs and CALLs on ETH and BTC). As a taker, you browse those orders, pick one you like, and fill it in a single transaction.

Collateral is paid upfront by the taker. All OptionBook options are **cash-settled**: at expiry, the payout is calculated based on the difference between the strike price and the settlement price (Chainlink oracle), and paid out in the collateral token:

- **PUT options**: Collateral and payout in USDC
- **CALL options (Inverse Call)**: Collateral and payout in the underlying token (WETH for ETH, cbBTC for BTC)

No physical delivery of assets occurs. For physically settled options (actual delivery of underlying at expiry), use [RFQ/Factory](../rfq/overview.md) instead.

## OptionBook vs RFQ

| | **OptionBook** | **RFQ (Factory)** |
|---|---|---|
| **What** | Fill existing market-maker orders | Create custom options via sealed-bid auction |
| **When to use** | Quick trades on listed options | Custom strikes, expiries, multi-leg structures |
| **Structures** | Vanilla only | Vanilla, spread, butterfly, condor, iron condor |
| **Key methods** | `fillOrder()`, `previewFillOrder()` | `buildRFQRequest()`, `requestForQuotation()` |
| **Pricing** | Order prices from `fetchOrders()` | MM pricing from `getAllPricing()` |
| **Data source** | Book indexer (`/api/v1/book/`) | Factory indexer (`/api/v1/factory/`) |
| **User data** | `getUserPositionsFromIndexer()` | `getUserRfqs()`, `getUserOptionsFromRfq()` |
| **Stats** | `getBookProtocolStats()`, `getBookDailyStats()` | `getFactoryProtocolStats()`, `getFactoryDailyStats()` |
| **Collateral** | Paid upfront by taker | `collateralAmount = 0` (held by factory) |
| **Settlement** | Cash-settled (payout in USDC/WETH/cbBTC based on price difference at expiry) | Cash-settled or physically settled (actual delivery of underlying at expiry) |

Use OptionBook when you want to trade quickly against already-priced orders. Use RFQ when you need a specific strike, expiry, or multi-leg structure that is not currently listed in the book.

## Core Flow

Every OptionBook trade follows the same four steps:

```
fetchOrders()          — browse available maker orders
    ↓
previewFillOrder()     — dry-run: see contracts, collateral, price per contract
    ↓
ensureAllowance()      — approve the collateral token
    ↓
fillOrder()            — execute the trade on-chain
```

## Quick Example

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ThetanutsClient({
  chainId: 8453, // Base mainnet
  provider,
  signer,
});

// 1. Fetch available orders
const orders = await client.api.fetchOrders();
const order = orders.find((o) => o.order.expiry > BigInt(Math.floor(Date.now() / 1000)));
if (!order) throw new Error('No active orders');

// 2. Preview the fill (no transaction, no signer needed)
const preview = client.optionBook.previewFillOrder(order, 10_000000n); // 10 USDC
console.log(`Contracts: ${preview.numContracts}`);
console.log(`Collateral token: ${preview.collateralToken}`);
console.log(`Price per contract: ${preview.pricePerContract}`);

// 3. Approve collateral spending
await client.erc20.ensureAllowance(
  client.chainConfig.tokens.USDC.address,
  client.chainConfig.contracts.optionBook,
  10_000000n,
);

// 4. Fill the order
const receipt = await client.optionBook.fillOrder(order, 10_000000n);
console.log(`Trade executed: ${receipt.hash}`);
```

## Data Source

OptionBook orders come from the Book indexer at `/api/v1/book/`. The SDK abstracts this — you call `client.api.fetchOrders()` and receive typed `OrderWithSignature` objects with pre-computed Greeks and metadata.

## Module Access

All OptionBook operations go through two modules:

| Module | Purpose |
|--------|---------|
| `client.api` | Fetch orders, positions, stats (read-only, no signer) |
| `client.optionBook` | Fill/cancel orders, claim fees (write ops require signer) |

---

## See Also

- [Browse and Filter Orders](browse-filter-orders.md)
- [Preview Fills](preview-fills.md)
- [Fill Orders](fill-orders.md)
