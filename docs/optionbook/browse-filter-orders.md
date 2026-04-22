# Browse and Filter Orders

Fetch live maker orders from the OptionBook and narrow them down to exactly what you want to trade.

## fetchOrders()

Returns all currently available orders from the Book indexer. No signer required.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

const orders = await client.api.fetchOrders();
console.log(`Found ${orders.length} orders`);
```

Each element is an `OrderWithSignature` object. The most useful fields are on `order.order` (the on-chain struct) and `order.rawApiData` (enriched metadata from the indexer including Greeks).

### OrderWithSignature shape

```typescript
// Key fields you'll use most often
const o = orders[0];

o.order.expiry          // bigint — Unix timestamp
o.order.availableAmount // bigint — maker's collateral budget (NOT contract count)
o.order.price           // bigint — price per contract (8 decimals)
o.order.isBuy           // boolean — from the maker's perspective

o.rawApiData?.greeks?.delta  // number — delta
o.rawApiData?.greeks?.iv     // number — implied volatility (0–1)
o.rawApiData?.greeks?.theta  // number — theta per day
o.rawApiData?.isCall         // boolean
o.rawApiData?.strikes        // bigint[] — strike(s) in 8 decimals
o.rawApiData?.underlying     // 'ETH' | 'BTC'
```

> `availableAmount` is the maker's collateral budget, not the number of contracts. A 10,000 USDC budget at a $95,000 strike gives you roughly 0.105 contracts. Always use `previewFillOrder()` to see the actual contract count.

## filterOrders()

Fetch orders pre-filtered by the API. Saves you from loading the full order list when you already know what you want.

```typescript
// Only CALL orders that haven't expired
const callOrders = await client.api.filterOrders({
  isCall: true,
  minExpiry: Math.floor(Date.now() / 1000),
});

// Only PUT orders
const putOrders = await client.api.filterOrders({ isCall: false });
```

**Filter criteria:**

| Field | Type | Description |
|-------|------|-------------|
| `isCall` | `boolean` | `true` for CALLs, `false` for PUTs |
| `minExpiry` | `number` | Minimum expiry timestamp (Unix seconds) |

## Finding a specific order

After fetching, use standard array methods to locate the order you want:

```typescript
const orders = await client.api.fetchOrders();
const now = BigInt(Math.floor(Date.now() / 1000));

// Find the first non-expired order
const order = orders.find((o) => o.order.expiry > now);
if (!order) throw new Error('No active orders found');

// Find a specific ETH PUT by strike
const ethPut2000 = orders.find(
  (o) =>
    o.rawApiData?.underlying === 'ETH' &&
    !o.rawApiData?.isCall &&
    o.rawApiData?.strikes?.[0] === 200000000000n, // $2000 in 8 decimals
);

// Sort by price ascending
const byPrice = [...orders].sort((a, b) =>
  Number(a.order.price - b.order.price)
);
```

## OptionBook API methods

Full list of read methods available via `client.api` for the OptionBook side:

| Method | Description |
|--------|-------------|
| `fetchOrders()` | All available orders |
| `filterOrders(criteria)` | Orders matching filter criteria |
| `getUserPositionsFromIndexer(address)` | User positions on the book side |
| `getUserHistoryFromIndexer(address)` | Trade history on the book side |
| `getBookOption(optionAddress)` | Single book option with PnL |
| `getReferrerStatsFromIndexer(address)` | Referrer stats (book side) |
| `getBookProtocolStats()` | Protocol stats with 24h/7d/30d windows |
| `getBookDailyStats()` | Daily time series data |
| `getStatsFromIndexer()` | Legacy totals (uniqueUsers, openPositions) |

## Greeks from order data

```typescript
const orders = await client.api.fetchOrders();

for (const order of orders) {
  if (order.rawApiData?.greeks) {
    const { delta, iv, gamma, theta, vega } = order.rawApiData.greeks;
    console.log(`Delta: ${delta.toFixed(4)}`);
    console.log(`IV: ${(iv * 100).toFixed(1)}%`);
    console.log(`Theta: ${theta.toFixed(4)}/day`);
  }
}
```

Greeks may be `null` for illiquid options or very short-dated options near expiry.

---

## See Also

- [Overview](overview.md)
- [Preview Fills](preview-fills.md)
- [Fill Orders](fill-orders.md)
