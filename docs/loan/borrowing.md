# Borrowing

Request a loan by depositing ETH or BTC collateral. The SDK handles WETH wrapping, collateral approval, ECDH key generation, and event parsing automatically.

## Full Borrowing Flow

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

// Step 1: Browse available strikes
const groups = await client.loan.getStrikeOptions('ETH', {
  minDurationDays: 30,
  maxStrikes: 10,
  sortOrder: 'highestStrike',
  maxApr: 20,
});

for (const group of groups) {
  console.log(`\n${group.expiryFormatted}`);
  for (const opt of group.options) {
    const tag = opt.isPromo ? ' [PROMO]' : '';
    console.log(`  ${opt.strikeFormatted} | APR: ${opt.effectiveApr}%${tag}`);
  }
}

// Step 2: Calculate costs for a specific strike
const selected = groups[0].options[0];
const calc = client.loan.calculateLoan({
  depositAmount: '1.0',
  underlying: 'ETH',
  strike: selected.strike,
  expiryTimestamp: selected.expiry,
  askPrice: selected.askPrice,
  underlyingPrice: selected.underlyingPrice,
});

if (!calc) throw new Error('Invalid loan parameters');

console.log(`Receive:      ${calc.formatted.receive} USDC`);
console.log(`Repay:        ${calc.formatted.repay} USDC`);
console.log(`Option cost:  ${calc.formatted.optionCost} USDC`);
console.log(`Borrow fee:   ${calc.formatted.capitalCost} USDC`);
console.log(`Protocol fee: ${calc.formatted.protocolFee} USDC`);
console.log(`APR:          ${calc.formatted.apr}%`);
console.log(`Promo:        ${calc.isPromo}`);

// Step 3: Submit the loan request
const result = await client.loan.requestLoan({
  underlying: 'ETH',
  collateralAmount: '1.0',
  strike: selected.strike,
  expiryTimestamp: selected.expiry,
  minSettlementAmount: calc.finalLoanAmount,
  // keepOrderOpen is deprecated as of v0.2.1 (Base_r12) and ignored at the
  // contract level — the contract no longer supports converting an unfilled
  // RFQ into a limit order. The field remains in LoanRequest for source
  // compatibility but its value has no on-chain effect.
});

console.log(`TX: ${result.receipt.hash}`);
console.log(`Quotation ID: ${result.quotationId}`);
console.log(`Public Key: ${result.keyPair.compressedPublicKey}`);
```

---

## Auto-Wrapping ETH

When borrowing with ETH, `requestLoan()` automatically checks your WETH balance. If it's insufficient, it wraps the difference from native ETH before submitting the loan request.

```typescript
// If you have 0.5 WETH and request 1.0 ETH collateral,
// the SDK wraps 0.5 ETH → WETH automatically
const result = await client.loan.requestLoan({
  underlying: 'ETH',
  collateralAmount: '1.0',
  // ... other params
});
```

No auto-wrapping happens for BTC (cbBTC). You must hold sufficient cbBTC.

---

## Accept an Offer

When a market maker sends an encrypted offer during the RFQ auction, decrypt it and accept:

```typescript
// Decrypt the offer using the keypair from requestLoan()
const decrypted = await client.rfqKeys.decryptOffer(
  encryptedOfferData,
  offerorSigningKey
);

// Accept the offer
await client.loan.acceptOffer(
  quotationId,
  decrypted.offerAmount,
  BigInt(decrypted.nonce),
  offerorAddress
);
```

---

## Cancel a Loan Request

Cancel before any offer is accepted to reclaim your collateral:

```typescript
await client.loan.cancelLoan(quotationId);
```

---

## Query Loan State

### On-Chain State

```typescript
const state = await client.loan.getLoanRequest(quotationId);
console.log(state.requester);           // borrower address
console.log(state.collateralAmount);    // bigint
console.log(state.isSettled);           // true if an MM filled
console.log(state.settledOptionContract); // option address (if settled)
```

### From Indexer

```typescript
const userAddress = await signer.getAddress();
const loans = await client.loan.getUserLoans(userAddress);

for (const loan of loans) {
  console.log(`#${loan.quotationId} — ${loan.status}`);
  if (loan.optionAddress) {
    console.log(`  Option: ${loan.optionAddress}`);
  }
}
```

---

## At Expiry

Once the option reaches expiry, you have a 1-hour exercise window. Three choices:

### Exercise (Repay and Reclaim)

Repay the owed USDC amount and get your collateral back:

```typescript
// Ensure USDC is approved for the option contract
const optionInfo = await client.loan.getOptionInfo(optionAddress);
await client.erc20.ensureAllowance(
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  optionAddress,
  optionInfo.deliveryAmount
);

await client.loan.exerciseOption(optionAddress);
```

### Walk Away (Keep USDC)

If the collateral has dropped below the strike price, it may be better to keep the borrowed USDC:

```typescript
await client.loan.doNotExercise(optionAddress);
```

### Swap and Exercise

Swap collateral to USDC via a DEX aggregator, then exercise in one transaction. Useful when you want to repay without holding USDC:

```typescript
// Get swap data from a DEX aggregator (e.g., KyberSwap, 1inch)
const aggregatorAddress = '0x...';
const swapCalldata = '0x...';

await client.loan.swapAndExercise(
  optionAddress,
  aggregatorAddress,
  swapCalldata
);
```

---

## Encode for External Wallets

Generate transaction calldata for use with viem, wagmi, or any wallet library:

```typescript
const encoded = client.loan.encodeRequestLoan({
  underlying: 'ETH',
  collateralAmount: '1.0',
  strike: 1600,
  expiryTimestamp: 1780041600,
  minSettlementAmount: 1422410000n,
});

// Use with viem
await walletClient.sendTransaction({
  to: encoded.to as `0x${string}`,
  data: encoded.data as `0x${string}`,
});

// Also available:
client.loan.encodeAcceptOffer(quotationId, offerAmount, nonce, offeror);
client.loan.encodeCancelLoan(quotationId);
```

---

## See Also

- [Overview](overview.md) — Module overview and cost formula
- [Lending](lending.md) — Fill borrower limit orders
- [Pricing & Calculation](pricing.md) — Strike selection details
