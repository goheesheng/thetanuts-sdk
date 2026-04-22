# Multi-Leg Structures

Build spreads, butterflies, and condors through the RFQ system using the SDK's multi-leg helpers.

## How the SDK Detects Structure

The structure is determined entirely by the number of strikes you pass. You do not need to specify the implementation address manually.

```
strikes.length === 1  →  VANILLA    (single option)
strikes.length === 2  →  SPREAD     (2-leg)
strikes.length === 3  →  BUTTERFLY  (3-leg)
strikes.length === 4  →  CONDOR     (4-leg)
```

Pass strikes to `buildRFQParams` or `buildRFQRequest` as a `strikes` array (or use the named helpers). The SDK auto-sorts strikes for the correct implementation, selects the right contract implementation, and calculates collateral.

> **Settlement types:** All multi-leg structures are **cash-settled only**. Physical delivery is available only for vanilla (single-strike) options.

---

## All Option Structures Summary

| Structure | Strikes | Implementation | Strike Order | Collateral Formula |
|-----------|---------|----------------|--------------|--------------------|
| Vanilla | 1 | `PUT` / `INVERSE_CALL` | N/A | PUT: `strike × N` / CALL: `N` |
| Spread | 2 | `PUT_SPREAD` / `CALL_SPREAD` | PUT: desc, CALL: asc | `(upper − lower) × N` |
| Butterfly | 3 | `PUT_FLYS` / `CALL_FLYS` | PUT: desc, CALL: asc | `(middle − lower) × N` |
| Condor | 4 | `PUT_CONDOR` / `CALL_CONDOR` | Always ascending | `(strike2 − strike1) × N` |
| Iron Condor | 4 | `IRON_CONDOR` | `[putLower, putUpper, callLower, callUpper]` | `max(putWidth, callWidth) × N` |

---

## Spread (2 Legs)

A spread limits both max profit and max loss compared to a vanilla option.

```
PUT SPREAD                         CALL SPREAD
(Buy high put, sell low put)       (Buy low call, sell high call)

     ╱────                              ────╲
    ╱                                       ╲
───╱                                         ╲───
$1700  $1900                           $1800  $2000

Collateral: (1900 − 1700) × N = $200 × N
```

### buildRFQParams with strikes array

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

// PUT SPREAD: 2 strikes — SDK auto-sorts to descending for PUT
const spreadRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1800, 2000],    // 2 values = SPREAD; auto-sorted to [2000, 1800]
  expiry: 1741334400,
  numContracts: 1,
  isLong: false,            // SELL — you provide collateral
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  reservePrice: 0.001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Collateral for SELL spread: (2000 − 1800) × 1 = 200 USDC
await client.erc20.ensureAllowance(
  client.chainConfig.tokens.USDC.address,
  client.optionFactory.contractAddress,
  200_000000n  // 200 USDC in 6 decimals
);

const receipt = await client.optionFactory.requestForQuotation(spreadRequest);
console.log('Spread RFQ TX:', receipt.hash);
```

### buildSpreadRFQ (named helper)

```typescript
const spreadRFQ = client.optionFactory.buildSpreadRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  lowerStrike: 1800,
  upperStrike: 2000,
  expiry: 1741334400,
  numContracts: 1,
  isLong: false,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

---

## Butterfly (3 Legs)

A butterfly profits most when the underlying expires near the middle strike, with limited risk on either side.

```
PUT BUTTERFLY                      CALL BUTTERFLY

     ╱╲                                 ╱╲
    ╱  ╲                               ╱  ╲
───╱    ╲───                       ───╱    ╲───
$1700 $1800 $1900                  $1800 $1900 $2000

Legs: +1@lower, −2@middle, +1@upper
Collateral: (middle − lower) × N = $100 × N
```

### Full example with real TX hash

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

// PUT BUTTERFLY: 3 strikes
const butterflyRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1700, 1800, 1900],  // 3 values = BUTTERFLY
  expiry: 1741334400,
  numContracts: 0.001,
  isLong: false,                // SELL (short) butterfly
  offerDeadlineMinutes: 6,
  collateralToken: 'USDC',
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Collateral = (middle − lower) × numContracts = (1800 − 1700) × 0.001 = 0.1 USDC
await client.erc20.ensureAllowance(
  client.chainConfig.tokens.USDC.address,
  client.optionFactory.contractAddress,
  100000n  // 0.1 USDC in 6 decimals
);

const receipt = await client.optionFactory.requestForQuotation(butterflyRequest);
console.log('Butterfly RFQ TX:', receipt.hash);
```

**Real example (RFQ 784 — PUT BUTTERFLY):**
- Structure: $1700 / $1800 / $1900 PUT BUTTERFLY
- Offer deadline: 04:10:34 UTC
- MM offer: 0.000223 USDC at 04:05:45 UTC
- Early settlement: 04:07:09 UTC (3 min before deadline)
- TX: `0x105f75cdfb64a3796100f6d667bc4f7fec3836d2b5aa5c43b66073a1b40964ee`

### buildButterflyRFQ (named helper)

```typescript
const butterflyRFQ = client.optionFactory.buildButterflyRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'CALL',
  lowerStrike: 1800,
  middleStrike: 1900,
  upperStrike: 2000,
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'WETH',
});
```

---

## Condor (4 Legs)

A condor provides a profit zone between the two middle strikes, combining two spreads.

```
PUT CONDOR                         CALL CONDOR

   ╱────╲                               ╱────╲
  ╱      ╲                             ╱      ╲
─╱        ╲─                         ─╱        ╲─
$1600 $1700 $1800 $1900         $1800 $1900 $2000 $2100

Legs: +1@s1, −1@s2, −1@s3, +1@s4
Collateral: (strike2 − strike1) × N = $100 × N
```

### Full example with real TX hash

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

// PUT CONDOR: 4 strikes
const condorRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1600, 1700, 1800, 1900],  // 4 values = CONDOR
  expiry: 1741334400,
  numContracts: 0.001,
  isLong: false,                       // SELL (short) condor
  offerDeadlineMinutes: 6,
  collateralToken: 'USDC',
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Collateral = (strike2 − strike1) × numContracts = (1700 − 1600) × 0.001 = 0.1 USDC
await client.erc20.ensureAllowance(
  client.chainConfig.tokens.USDC.address,
  client.optionFactory.contractAddress,
  100000n  // 0.1 USDC in 6 decimals
);

const receipt = await client.optionFactory.requestForQuotation(condorRequest);
console.log('Condor RFQ TX:', receipt.hash);
```

**Real example (RFQ 785 — PUT CONDOR):**
- Structure: $1600 / $1700 / $1800 / $1900 PUT CONDOR
- MM offer: 0.003248 USDC
- Early settlement: 04:15:00 UTC (4 min before deadline)
- TX: `0xa89fb6dbad43b430399bbdec878927185e602b7df9b5390f71d2d11c33e4d850`
- Option deployed: `0x20D51d70A51Aa529eb9460a49aAC94910A1bc267`

### buildCondorRFQ (named helper)

```typescript
const condorRFQ = client.optionFactory.buildCondorRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike1: 1600,
  strike2: 1700,
  strike3: 1800,
  strike4: 1900,
  expiry: 1741334400,
  numContracts: 1,
  isLong: false,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

---

## Iron Condor (4 Legs, Mixed)

An iron condor combines a put spread and a call spread with different underlying directions, straddling a range.

```typescript
// buildIronCondorRFQ uses [putLower, putUpper, callLower, callUpper] ordering
const ironCondorRFQ = client.optionFactory.buildIronCondorRFQ({
  requester: userAddress,
  underlying: 'ETH',
  putLowerStrike: 1700,
  putUpperStrike: 1800,
  callLowerStrike: 2000,
  callUpperStrike: 2100,
  expiry: 1741334400,
  numContracts: 1,
  isLong: false,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
// Collateral = max(putWidth, callWidth) × N = max(100, 100) × 1 = 100 USDC
```

---

## Collateral by Structure

| Structure | Collateral Formula | Example (N=1) |
|-----------|--------------------|---------------|
| Vanilla PUT | `strike × N` | $2000 × 1 = 2000 USDC |
| Vanilla CALL | `N` (underlying) | 1 × 1 = 1 WETH |
| Spread | `(upper − lower) × N` | ($2000 − $1800) × 1 = 200 USDC |
| Butterfly | `(middle − lower) × N` | ($1900 − $1800) × 1 = 100 USDC |
| Condor | `(strike2 − strike1) × N` | ($1700 − $1600) × 1 = 100 USDC |
| Iron Condor | `max(putWidth, callWidth) × N` | max(100, 100) × 1 = 100 USDC |

---

## Strike Ordering

The SDK automatically sorts strikes in the order the contract requires. You can pass them in any order.

```
PUT structures:    sorted DESCENDING  (e.g. [2000, 1800])
CALL structures:   sorted ASCENDING   (e.g. [1800, 2000])
CONDOR:            always ASCENDING
IRON_CONDOR:       [putLower, putUpper, callLower, callUpper]
```

---

## Product Type Reference

For collateral formulas, max loss calculations, and validation rules for each product type, see the full [Product Types Reference](../reference/product-types.md).

---

## See Also

- [Create an RFQ](create-rfq.md) — Single-leg vanilla RFQ walkthrough
- [RFQ Lifecycle](lifecycle.md) — Offer period, reveal phase, and settlement
- [Early Settlement](early-settlement.md) — Accept a multi-leg offer before the deadline
