# Preview Fills

Simulate a fill before committing — see the exact contract count, collateral required, and price per contract without sending any transaction.

## Why preview first?

For OptionBook orders, `availableAmount` on the order is the **maker's collateral budget**, not the number of contracts you receive. The actual contract count depends on the option type and its collateral formula. Without previewing, you cannot know what you are actually buying.

`previewFillOrder()` runs the exact formula the on-chain contract will use, so there are no surprises at fill time.

## Collateral Formulas by Option Type

| Option Type | Strikes | Formula | Example |
|-------------|---------|---------|---------|
| **Vanilla PUT** | 1 | `(collateral × 1e8) / strike` | 10,000 USDC at $95k strike = 0.105 contracts |
| **Inverse CALL** | 1 | `collateral / 1e12` | 1 WETH = 1 contract |
| **SPREAD** | 2 | `(collateral × 1e8) / spreadWidth` | 10,000 USDC / $10k spread = 1 contract |
| **BUTTERFLY** | 3 | `(collateral × 1e8) / maxSpread` | Based on widest strike range |
| **CONDOR** | 4 | `(collateral × 1e8) / maxSpread` | Based on widest strike range |

**Why this matters for a PUT:** A $95,000 strike PUT where the maker budgets 10,000 USDC:
- `(10,000 × 1e8) / 95,000 = ~0.105 contracts`
- You are buying 0.105 contracts, **not** 10,000

## previewFillOrder()

Dry-run a fill. Safe to call without a signer — no chain state is modified.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

const orders = await client.api.fetchOrders();
const order = orders[0];

// Preview a max fill (no amount specified)
const maxPreview = client.optionBook.previewFillOrder(order);
console.log(`Max contracts available: ${maxPreview.maxContracts}`);
console.log(`Collateral token: ${maxPreview.collateralToken}`);
console.log(`Price per contract: ${maxPreview.pricePerContract}`);

// Preview with a specific premium amount (10 USDC)
const preview = client.optionBook.previewFillOrder(order, 10_000000n);
console.log(`Contracts for 10 USDC: ${preview.numContracts}`);
console.log(`Total collateral needed: ${preview.totalCollateral}`);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `orderWithSig` | `OrderWithSignature` | Order from `client.api.fetchOrders()` |
| `usdcAmount` | `bigint?` | Collateral to spend (6 decimals). Omit to preview a max fill |
| `referrer` | `string?` | Referrer address. Falls back to client-level referrer or zero address |

### Return value

```typescript
{
  numContracts: bigint,      // Contracts you will receive for the given usdcAmount
  maxContracts: bigint,      // Maximum contracts available in this order
  collateralToken: string,   // Token address for collateral payment
  pricePerContract: bigint,  // Price per contract (8 decimals)
  totalCollateral: bigint,   // Total collateral needed (use this for ensureAllowance)
  referrer: string,          // Resolved referrer address
  maker: string,             // Maker address
  expiry: bigint,            // Order expiry timestamp
  isCall: boolean,           // true for CALL, false for PUT
  strikes: bigint[],         // Strike(s) in 8 decimals
}
```

## Full preview-to-fill pattern

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ThetanutsClient({ chainId: 8453, provider, signer });

// 1. Fetch orders
const orders = await client.api.fetchOrders();
const order = orders.find((o) => o.order.expiry > BigInt(Math.floor(Date.now() / 1000)));
if (!order) throw new Error('No active orders');

// 2. Preview with 10 USDC
const preview = client.optionBook.previewFillOrder(order, 10_000000n);

console.log(`You will receive: ${preview.numContracts} contracts`);
console.log(`Price per contract: ${preview.pricePerContract}`);
console.log(`Collateral required: ${preview.totalCollateral}`);
console.log(`Collateral token: ${preview.collateralToken}`);

// 3. Use preview.totalCollateral for the exact approval amount
await client.erc20.ensureAllowance(
  preview.collateralToken,
  client.chainConfig.contracts.optionBook,
  preview.totalCollateral,
);

// 4. Fill
const receipt = await client.optionBook.fillOrder(order, 10_000000n);
console.log(`Filled: ${receipt.hash}`);
```

## Checking order expiry before preview

```typescript
const now = BigInt(Math.floor(Date.now() / 1000));

if (order.order.expiry <= now) {
  throw new Error('Order has already expired');
}

// Safe to preview
const preview = client.optionBook.previewFillOrder(order, 10_000000n);
```

---

## On-chain pre-flight (callStatic)

`previewFillOrder()` runs the math locally. If you also want to confirm the contract itself would not revert under current state (allowance, nonce reuse, order cancellation, transient reverts) without paying gas, use the `callStatic` helpers — they execute the call against the node and return the would-be result or the revert reason.

```typescript
// Pre-flight a fill: returns the option address that would be created/transferred.
const fillResult = await client.optionBook.callStaticFillOrder(order, 10_000000n);
if (!fillResult.ok) {
  console.error('Fill would revert:', fillResult.error);
} else {
  console.log('Would create option at:', fillResult.value);
}

// Pre-flight a cancel.
const cancelResult = await client.optionBook.callStaticCancelOrder(order);
if (!cancelResult.ok) {
  console.error('Cancel would revert:', cancelResult.error);
}
```

Both methods return a `CallStaticResult` (`{ ok: true, value }` or `{ ok: false, error }`). Useful inside form UIs to disable the submit button when the chain says the call would fail.

---

## See Also

- [Browse and Filter Orders](browse-filter-orders.md)
- [Fill Orders](fill-orders.md)
- [Overview](overview.md)
