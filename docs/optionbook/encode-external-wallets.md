# Encode for External Wallets

Build raw transaction payloads for OptionBook fills without using the built-in ethers signer — for use with viem, wagmi, Account Abstraction wallets, Safe, and similar tools.

## When to use encode methods

Use `encodeFillOrder()` and `encodeSwapAndFillOrder()` instead of `fillOrder()` / `swapAndFillOrder()` when:

- You are using **viem or wagmi** and want to send the transaction through your own wallet client
- Your wallet is an **Account Abstraction wallet** (Coinbase Smart Wallet, Safe, Biconomy, etc.)
- You need **custom gas estimation or nonce management**
- You are building a **transaction batch** and need the raw calldata

Both encode methods return `{ to: string; data: string }` — the target contract address and encoded calldata. No transaction is sent.

## encodeFillOrder()

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

// Fetch the order (no signer needed for this part)
const orders = await client.api.fetchOrders();
const order = orders[0];

// Encode the fill (no signer needed)
const { to, data } = client.optionBook.encodeFillOrder(
  order,
  10_000000n,                              // 10 USDC (optional — omit for max fill)
  '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567', // optional referrer
);
```

**Parameters:** same as `fillOrder()`.

**Returns:** `{ to: string; data: string }`

## Sending with viem/wagmi

```typescript
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

// 1. Encode the fill
const { to, data } = client.optionBook.encodeFillOrder(order, 10_000000n);

// 2. Send via viem wallet client
const hash = await walletClient.sendTransaction({
  to: to as `0x${string}`,
  data: data as `0x${string}`,
});
console.log(`Transaction hash: ${hash}`);
```

## Sending with ethers.js signer directly

```typescript
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const { to, data } = client.optionBook.encodeFillOrder(order, 10_000000n);
const tx = await signer.sendTransaction({ to, data });
console.log(`Transaction hash: ${tx.hash}`);
```

## encodeSwapAndFillOrder()

Encoded variant of `swapAndFillOrder()`. Atomically swaps from a source token and fills the order — useful when the user holds WETH but the order requires USDC collateral.

```typescript
const { to, data } = client.optionBook.encodeSwapAndFillOrder(
  order,
  swapRouterAddress,       // e.g. 1inch, 0x, Odos router
  swapSrcTokenAddress,     // token the user is holding
  swapSrcAmount,           // amount of source token to swap (bigint)
  swapCalldata,            // pre-encoded swap calldata from your aggregator
  '0xYourReferrerAddress', // optional referrer
);

// Send via any wallet
const hash = await walletClient.sendTransaction({
  to: to as `0x${string}`,
  data: data as `0x${string}`,
});
```

**Parameters:** same as `swapAndFillOrder()`.

**Returns:** `{ to: string; data: string }`

You must approve the swap router to spend the source token before sending this transaction.

## Approval encoding for external wallets

If you also need to encode the collateral approval for an external wallet:

```typescript
const { to: approveTo, data: approveData } = client.erc20.encodeApprove(
  client.chainConfig.tokens.USDC.address,
  client.chainConfig.contracts.optionBook,
  10_000000n,
);

// Send approve tx first
const approveTx = await walletClient.sendTransaction({
  to: approveTo as `0x${string}`,
  data: approveData as `0x${string}`,
});

// Then send the fill tx
const { to, data } = client.optionBook.encodeFillOrder(order, 10_000000n);
const fillTx = await walletClient.sendTransaction({
  to: to as `0x${string}`,
  data: data as `0x${string}`,
});
```

## Referrer in encode methods

Encode methods accept the same referrer parameter as their non-encode counterparts:

```typescript
// No referrer (zero address used)
client.optionBook.encodeFillOrder(order, 10_000000n)

// With referrer
client.optionBook.encodeFillOrder(order, 10_000000n, '0xReferrerAddress')
```

---

## See Also

- [Fill Orders](fill-orders.md)
- [Referrer Fees](referrer-fees.md)
- [Overview](overview.md)
