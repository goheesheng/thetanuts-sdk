# Fill Orders

Execute a trade against a maker order, swap-and-fill in one transaction, or cancel your own order.

## Setup: client with signer

All write operations (fill, cancel) require a signer. Read operations (preview, fetch) do not.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer,
  referrer: '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567', // optional
});
```

## Complete OptionBook fill workflow

```typescript
// 1. Fetch available orders
const orders = await client.api.fetchOrders();
const order = orders.find((o) => o.order.expiry > BigInt(Math.floor(Date.now() / 1000)));
if (!order) throw new Error('No active orders found');

// 2. Preview the fill (dry-run, no transaction)
const preview = client.optionBook.previewFillOrder(order, 10_000000n); // 10 USDC
console.log(`Contracts: ${preview.numContracts}, Collateral: ${preview.totalCollateral}`);

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

## fillOrder()

Execute a fill against an existing maker order.

```typescript
const receipt = await client.optionBook.fillOrder(
  order,                           // OrderWithSignature from fetchOrders()
  10_000000n,                      // 10 USDC (optional — omit to fill max)
  '0xYourReferrerAddress',         // optional referrer override
);
console.log(`Filled: ${receipt.hash}`);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderWithSig` | `OrderWithSignature` | Order from `client.api.fetchOrders()` |
| `usdcAmount` | `bigint?` | Collateral to spend (6 decimals). Omit to fill the full available amount |
| `referrer` | `string?` | Referrer address. Falls back to client-level referrer or zero address |

**Returns:** `TransactionReceipt`

**Throws:**
- `ORDER_EXPIRED` — order has already expired
- `INVALID_ORDER` — order is missing `rawApiData` (re-fetch from the API)
- `SIGNER_REQUIRED` — no signer configured on the client
- `INSUFFICIENT_ALLOWANCE` — approve the collateral token first via `client.erc20.ensureAllowance()`
- `CONTRACT_REVERT` — on-chain revert (check `error.cause` for details)

## swapAndFillOrder()

Fill an order while atomically swapping from a different source token. Useful when you hold WETH but the order requires USDC collateral.

```typescript
const receipt = await client.optionBook.swapAndFillOrder(
  order,
  swapRouterAddress,       // e.g. 1inch, 0x, Odos router address
  swapSrcTokenAddress,     // token you are holding (e.g. WETH address)
  swapSrcAmount,           // amount of source token to swap (bigint)
  swapCalldata,            // pre-encoded swap calldata from your aggregator
  '0xYourReferrerAddress', // optional
);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderWithSig` | `OrderWithSignature` | Order from `client.api.fetchOrders()` |
| `swapRouter` | `string` | Swap router contract address |
| `swapSrcToken` | `string` | Source token address to swap from |
| `swapSrcAmount` | `bigint` | Amount of source token to swap |
| `swapData` | `string` | Encoded swap calldata from your aggregator |
| `referrer` | `string?` | Referrer address |

**Returns:** `TransactionReceipt`

You must approve the swap router to spend the source token before calling this. The encoded swap calldata must match `swapRouter`, `swapSrcToken`, and `swapSrcAmount` exactly.

## cancelOrder()

Cancel an existing order. Only the original maker can cancel their own orders.

```typescript
const receipt = await client.optionBook.cancelOrder(order);
console.log(`Cancelled: ${receipt.hash}`);
```

**Parameters:** `orderWithSig: OrderWithSignature`

**Returns:** `TransactionReceipt`

**Throws:** `INVALID_ORDER` if the order is missing `rawApiData`. Contract reverts if the caller is not the original maker.

## Error handling

```typescript
import {
  ThetanutsError,
  OrderExpiredError,
  InsufficientAllowanceError,
  ContractRevertError,
} from '@thetanuts-finance/thetanuts-client';

try {
  const receipt = await client.optionBook.fillOrder(order, 10_000000n);
} catch (error) {
  if (error instanceof OrderExpiredError) {
    // Order expired between fetch and fill — get a fresh list
    const freshOrders = await client.api.fetchOrders();
    // retry with freshOrders[0]
  } else if (error instanceof InsufficientAllowanceError) {
    // Approve first, then retry
    await client.erc20.ensureAllowance(
      client.chainConfig.tokens.USDC.address,
      client.chainConfig.contracts.optionBook,
      10_000000n,
    );
    const receipt = await client.optionBook.fillOrder(order, 10_000000n);
  } else if (error instanceof ContractRevertError) {
    console.error('Contract reverted:', error.message, error.cause);
  } else if (error instanceof ThetanutsError) {
    console.error(`SDK error [${error.code}]: ${error.message}`);
  }
}
```

## Production checklist

- Always call `previewFillOrder()` before `fillOrder()` — use `preview.totalCollateral` for the exact approval amount.
- Always call `ensureAllowance()` before `fillOrder()`. The SDK does not auto-approve.
- Check `order.order.expiry` before filling to avoid wasted gas on an already-expired order.
- Use a reliable RPC provider in production — the public `mainnet.base.org` endpoint has strict rate limits.

---

## See Also

- [Preview Fills](preview-fills.md)
- [Encode for External Wallets](encode-external-wallets.md)
- [Browse and Filter Orders](browse-filter-orders.md)
