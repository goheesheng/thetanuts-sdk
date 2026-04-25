# Lending

Earn yield by filling borrowers' limit orders with USDC. You provide USDC now and receive the borrower's collateral (WETH or cbBTC) at expiry if the option is exercised.

## How Lending Works

When a borrower enables `keepOrderOpen: true` and no market maker fills during the initial auction, the request becomes a limit order. Any user can fill it by providing the requested USDC amount.

At expiry, if the borrower exercises (repays), you receive your USDC back plus the spread. If the borrower walks away, you receive the collateral instead.

---

## Browse Lending Opportunities

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

// Fetch all available limit orders
const opps = await client.loan.getLendingOpportunities();

for (const o of opps) {
  console.log(`#${o.quotationId} | ${o.underlying}`);
  console.log(`  Collateral: ${o.collateralFormatted} ${o.underlying}`);
  console.log(`  Provide:    ${o.lendAmountFormatted} USDC`);
  console.log(`  Strike:     $${o.strike}`);
  console.log(`  Expiry:     ${o.expiryFormatted}`);
  console.log(`  APR:        ${o.aprFormatted}%`);
}
```

### Filter by Underlying

```typescript
// Only ETH-collateralized loans
const ethOpps = await client.loan.getLendingOpportunities({
  underlying: 'ETH',
});

// Only BTC-collateralized loans
const btcOpps = await client.loan.getLendingOpportunities({
  underlying: 'BTC',
});
```

### Exclude Your Own Loans

```typescript
const userAddress = await signer.getAddress();
const opps = await client.loan.getLendingOpportunities({
  excludeAddress: userAddress,
});
```

---

## Fill a Limit Order

Filling a limit order calls `OptionFactory.settleQuotation()` under the hood. You must approve USDC to the OptionFactory contract first.

```typescript
const opp = opps[0]; // Pick an opportunity

// Approve USDC to OptionFactory
const factoryAddress = client.chainConfig.contracts.optionFactory;
await client.erc20.ensureAllowance(
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
  factoryAddress,
  opp.lendAmount
);

// Fill the loan
const receipt = await client.loan.lend(BigInt(opp.quotationId));
console.log(`Filled loan #${opp.quotationId}: ${receipt.hash}`);
```

---

## Lending Opportunity Fields

| Field | Type | Description |
|-------|------|-------------|
| `quotationId` | `string` | Quotation ID to pass to `lend()` |
| `requester` | `string` | Borrower's address |
| `underlying` | `string` | `'ETH'` or `'BTC'` |
| `collateralFormatted` | `string` | Collateral amount (e.g. `"1.5"`) |
| `lendAmountFormatted` | `string` | USDC to provide (e.g. `"1422.41"`) |
| `lendAmount` | `bigint` | Raw USDC amount (6 decimals) |
| `strike` | `number` | Strike price in USD |
| `expiryTimestamp` | `number` | Expiry Unix timestamp |
| `expiryFormatted` | `string` | Human-readable expiry date |
| `apr` | `number` | Estimated lender APR |
| `aprFormatted` | `string` | APR as string (e.g. `"12.50"`) |
| `raw` | `LoanIndexerLoan` | Full indexer response |

---

## See Also

- [Overview](overview.md) — Module overview and cost formula
- [Borrowing](borrowing.md) — Request loans as a borrower
