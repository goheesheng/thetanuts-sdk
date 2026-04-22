# Physical Options

Create physically settled options through the RFQ system — at expiry, the underlying asset is delivered rather than cash being paid out.

## Overview

Physical options involve actual delivery of the underlying asset at expiry rather than a cash settlement based on price difference. They are only available for **vanilla (single-strike) options**. Multi-leg structures (spreads, butterflies, condors) are cash-settled only.

| Option | Seller Posts | At ITM Expiry — Buyer Delivers | At ITM Expiry — Buyer Receives |
|--------|-------------|-------------------------------|-------------------------------|
| **Physical PUT** | USDC (strike × contracts) | WETH (contracts) | USDC (strike × contracts) |
| **Physical CALL** | WETH (contracts) | USDC (strike × contracts) | WETH (contracts) |

---

## Creating a Physical PUT RFQ

A physical PUT means: "I want to sell WETH at `strike` price." If the option expires ITM, the buyer delivers WETH and receives USDC at the strike price.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();

const keyPair = await client.rfqKeys.getOrCreateKeyPair();

// Next Friday 8:00 UTC (Deribit-compatible expiry)
const now = new Date();
const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7 || 7;
const nextFriday = new Date(Date.UTC(
  now.getUTCFullYear(), now.getUTCMonth(),
  now.getUTCDate() + daysUntilFriday,
  8, 0, 0
));
const nextFridayExpiry = Math.floor(nextFriday.getTime() / 1000);

// SELL Physical PUT: "I want to buy ETH at $2500"
// If ETH falls below $2500, you receive ETH at your target price
const physicalPutRFQ = client.optionFactory.buildPhysicalOptionRFQ({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 2500,
  expiry: nextFridayExpiry,
  numContracts: 0.1,
  isLong: false,                    // SELL — you post USDC collateral
  deliveryToken: client.chainConfig.tokens.WETH.address as `0x${string}`,
  collateralToken: 'USDC',          // Auto-inferred for PUT: USDC
  offerDeadlineMinutes: 6,
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Verify the implementation is PHYSICAL_PUT (not regular PUT)
console.log('Implementation:', physicalPutRFQ.params.implementation);
// Should match: client.chainConfig.implementations.PHYSICAL_PUT

// extraOptionData contains the ABI-encoded delivery token address
// (non-empty '0x' distinguishes physical from cash-settled)
console.log('extraOptionData:', physicalPutRFQ.params.extraOptionData);

// For SELL: approve USDC collateral (strike × numContracts)
const collateral = BigInt(Math.round(2500 * 0.1 * 1e6)); // 250 USDC
await client.erc20.ensureAllowance(
  client.chainConfig.tokens.USDC.address,
  client.optionFactory.contractAddress,
  collateral
);

const receipt = await client.optionFactory.requestForQuotation(physicalPutRFQ);
console.log('Physical PUT RFQ TX:', receipt.hash);
```

---

## Creating a Physical CALL RFQ

A physical CALL means: "I want to sell WETH above `strike` price." If the option expires ITM, the seller delivers WETH and receives USDC at the strike price.

```typescript
// SELL Physical CALL: "I'm willing to sell ETH at $3000"
// If ETH rises above $3000, you deliver ETH and receive USDC at strike
const physicalCallRFQ = client.optionFactory.buildPhysicalOptionRFQ({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'CALL',
  strike: 3000,
  expiry: nextFridayExpiry,
  numContracts: 0.1,
  isLong: false,                    // SELL — you post WETH collateral
  deliveryToken: client.chainConfig.tokens.USDC.address as `0x${string}`,
  collateralToken: 'WETH',          // Auto-inferred for CALL: WETH
  offerDeadlineMinutes: 6,
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// For SELL CALL: approve WETH collateral (numContracts WETH)
const wethCollateral = BigInt(Math.round(0.1 * 1e18)); // 0.1 WETH
await client.erc20.ensureAllowance(
  client.chainConfig.tokens.WETH.address,
  client.optionFactory.contractAddress,
  wethCollateral
);

const receipt = await client.optionFactory.requestForQuotation(physicalCallRFQ);
console.log('Physical CALL RFQ TX:', receipt.hash);
```

---

## Calculation Functions

The SDK exports standalone helpers for physical option math:

```typescript
import {
  calculateDeliveryAmount,
  isPhysicalProduct,
  calculateNumContracts,
  calculateCollateralRequired,
} from '@thetanuts-finance/thetanuts-client';

// Check if a product type is physically settled
isPhysicalProduct('PHYSICAL_CALL');  // true
isPhysicalProduct('PHYSICAL_PUT');   // true
isPhysicalProduct('PUT');            // false
isPhysicalProduct('CALL_SPREAD');    // false

// PHYSICAL_CALL: seller posts WETH, buyer delivers USDC at expiry
const callDelivery = calculateDeliveryAmount(10, 'PHYSICAL_CALL', [2000]);
// { deliveryAmount: 20000, deliveryToken: 'USDC' }
// (10 contracts × $2000 strike = $20,000 USDC delivered by buyer)

// PHYSICAL_PUT: seller posts USDC, buyer delivers WETH at expiry
const putDelivery = calculateDeliveryAmount(10, 'PHYSICAL_PUT', [2000]);
// { deliveryAmount: 10, deliveryToken: 'WETH' }
// (10 contracts × 1 = 10 WETH delivered by buyer)

// For BTC underlying — delivery token becomes cbBTC
const btcDelivery = calculateDeliveryAmount(5, 'PHYSICAL_PUT', [50000], 'BTC');
// { deliveryAmount: 5, deliveryToken: 'cbBTC' }
```

---

## Physical Option Product Table

| Product | Collateral (Seller Posts) | Delivery (Buyer Delivers at ITM Expiry) |
|---------|--------------------------|----------------------------------------|
| `PHYSICAL_CALL` | `numContracts` WETH | `strike × numContracts` USDC |
| `PHYSICAL_PUT` | `strike × numContracts` USDC | `numContracts` WETH |
| `PHYSICAL_CALL_SPREAD` | `width × numContracts` WETH | `width × numContracts` USDC |
| `PHYSICAL_PUT_SPREAD` | `width × numContracts` USDC | `width × numContracts` WETH |

For BTC-underlying options, substitute `cbBTC` for `WETH`.

---

## Collateral vs Delivery

Physical options involve two distinct asset transfers:

| Concept | Who | When | What |
|---------|-----|------|------|
| **Collateral** | Seller | At settlement | Posted to secure the option payout |
| **Delivery** | Buyer (if exercised) | At ITM expiry | Asset exchanged for collateral |

- For **Physical PUT**: Seller posts USDC (collateral); if ITM, buyer delivers WETH and receives USDC
- For **Physical CALL**: Seller posts WETH (collateral); if ITM, buyer delivers USDC and receives WETH

If the option expires OTM, no delivery occurs and the seller's collateral is returned in full.

---

## Limitations

- Physical settlement is available for **vanilla (single-strike) options only**
- Multi-leg structures (spreads, butterflies, condors) are cash-settled
- The `deliveryToken` address must be passed in `buildPhysicalOptionRFQ` and is ABI-encoded into `extraOptionData`

---

## See Also

- [Create an RFQ](create-rfq.md) — General RFQ creation (cash-settled vanilla and multi-leg)
- [Multi-Leg Structures](multi-leg-structures.md) — Spreads, butterflies, condors (cash-settled only)
- [RFQ Lifecycle](lifecycle.md) — Full lifecycle from creation to expiry
