# Referrer Fees

Earn a share of trading fees by attaching your address as referrer on OptionBook order fills.

## How referrer fees work

1. The protocol owner whitelists your address and sets your fee split (e.g. `5000` bps = 50%).
2. When a taker fills an order with your referrer address, the protocol fee is calculated as `min(0.06% of notional, 12.5% of premium)`. Your share — `fee × feeBps / 10000` — accrues in the on-chain `fees[token][referrer]` ledger.
3. Fees accrue **per collateral token**: PUT fills accrue USDC fees, CALL fills accrue WETH or cbBTC fees.
4. You call `claimAllFees()` (or `claimFees(token)` for one token at a time) to withdraw.

**OptionFactory (RFQ) fees are separate.** RFQ fees use the `referralId` system and can only be withdrawn by the contract owner. Only OptionBook fees are self-claimable. See the [RFQ Referrals](../rfq/referrals.md) guide for the OptionFactory side.

## Setting up a referrer

### Option 1: Client-level referrer (all fills use it automatically)

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer,
  referrer: '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567',
});

// All fillOrder calls will use this referrer automatically
await client.optionBook.fillOrder(order, 10_000000n);
```

### Option 2: Per-fill referrer (overrides client default)

```typescript
await client.optionBook.fillOrder(
  order,
  10_000000n,
  '0xYourReferrerAddress', // overrides client.referrer for this call only
);
```

### Option 3: Encode methods (viem, wagmi, Account Abstraction wallets)

```typescript
const { to, data } = client.optionBook.encodeFillOrder(
  order,
  10_000000n,
  '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567',
);
const hash = await walletClient.sendTransaction({ to, data });
```

If no referrer is provided, the zero address is used and no fees are earned.

## Querying fees

### Check your fee split

```typescript
const feeBps = await client.optionBook.getReferrerFeeSplit('0xYourAddress');
console.log(`Fee split: ${feeBps} bps (${Number(feeBps) / 100}%)`);
// e.g. 2500 bps = 25%
// 0 means not whitelisted — contact the protocol team
```

### Check a single token

```typescript
const usdc = client.chainConfig.tokens.USDC.address;
const feeAmount = await client.optionBook.getFees(usdc, '0xYourAddress');
console.log(`Accumulated USDC fees: ${ethers.formatUnits(feeAmount, 6)}`);
```

### Check all tokens at once

`getAllClaimableFees()` scans every configured collateral token in parallel and returns only non-zero balances. No signer required.

```typescript
const claimable = await client.optionBook.getAllClaimableFees('0xYourAddress');

if (claimable.length === 0) {
  console.log('No claimable fees.');
} else {
  for (const fee of claimable) {
    const formatted = ethers.formatUnits(fee.amount, fee.decimals);
    console.log(`${fee.symbol}: ${formatted}`);
  }
  // Example output:
  //   USDC: 12.50
  //   WETH: 0.003
}
```

**Parameters:** `address: string` — referrer address to check

**Returns:** `ClaimableFee[]` — array of `{ token, symbol, decimals, amount }` for each non-zero balance.

## Claiming fees

### Claim all tokens in one call

`claimAllFees()` finds claimable tokens, then claims each one sequentially. Partial failures are handled gracefully — if one token's claim fails, the rest still proceed.

```typescript
const results = await client.optionBook.claimAllFees();

for (const r of results) {
  if (r.receipt) {
    console.log(`Claimed ${r.symbol}: tx ${r.receipt.hash}`);
  } else {
    console.log(`Failed ${r.symbol}: ${r.error?.message}`);
    // Retry: await client.optionBook.claimFees(tokenAddress)
  }
}
```

**Parameters:** `address?: string` — referrer address. If omitted, uses the signer's address.

**Returns:** `ClaimFeeResult[]` — array of `{ symbol, amount, receipt?, error? }` for each token attempted.

**Throws:** `SIGNER_REQUIRED` if no signer is configured and no address provided.

### Claim a single token

```typescript
const usdc = client.chainConfig.tokens.USDC.address;
const receipt = await client.optionBook.claimFees(usdc);
console.log(`Claimed USDC fees: ${receipt.hash}`);
```

**Parameters:** `token: string` — collateral token address (USDC, WETH, cbBTC)

**Returns:** `TransactionReceipt`

## Full claim workflow example

See [`docs/examples/claim-fees.ts`](../examples/claim-fees.ts) for a complete, copy-paste ready example that:

1. Verifies your referrer whitelist status
2. Scans all tokens for claimable balances
3. Claims everything and reports results
4. Verifies zero balance after claiming

## End-to-end fee workflow summary

| Step | Method | Signer |
|------|--------|--------|
| Check fee split | `getReferrerFeeSplit(address)` | No |
| Check single token balance | `getFees(token, address)` | No |
| Check all token balances | `getAllClaimableFees(address)` | No |
| Claim one token | `claimFees(token)` | Yes |
| Claim all tokens | `claimAllFees(address?)` | Yes |

---

## See Also

- [Fill Orders](fill-orders.md)
- [Encode for External Wallets](encode-external-wallets.md)
- [Overview](overview.md)
