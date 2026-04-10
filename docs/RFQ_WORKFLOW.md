# RFQ (Request for Quotation) Workflow

> Complete guide to the RFQ lifecycle. For quick SDK usage, see [SDK Quick Reference](SDK_QUICK_REFERENCE.md).

This document explains the complete RFQ lifecycle in the Thetanuts options protocol - from user request to option settlement.

## Table of Contents

1. [Overview](#overview)
2. [Option Structures](#option-structures)
3. [User Flow Diagram](#user-flow-diagram)
4. [Phase 1: User Creates RFQ](#phase-1-user-creates-rfq)
5. [Phase 2: Market Makers Respond](#phase-2-market-makers-respond)
6. [Phase 3: Reveal Phase](#phase-3-reveal-phase)
7. [Settlement Paths: Early vs Normal](#settlement-paths-early-vs-normal)
8. [Phase 4: Settlement](#phase-4-settlement)
9. [Collateral Handling](#collateral-handling)
10. [Sealed-Bid Auction Mechanism](#sealed-bid-auction-mechanism)
11. [Key Management](#key-management)
12. [Encryption Technical Details](#encryption-technical-details)
13. [Decryption Troubleshooting](#decryption-troubleshooting)
14. [SDK Usage Examples](#sdk-usage-examples)

---

## Overview

The RFQ system is a **sealed-bid auction** mechanism for trading options. Key features:

- **Privacy**: Offers are encrypted until reveal phase (prevents front-running)
- **Competitive Pricing**: Market makers compete to provide best prices
- **Full Collateralization**: All options are 100% collateralized
- **Atomic Settlement**: Option creation and fund transfer happen atomically

### Timeline

---

## Reserve Price Explained

Reserve price is a critical RFQ parameter that protects you from unfavorable fills. It sets the maximum (for BUY) or minimum (for SELL) acceptable price per contract.

### For BUY Positions (isLong: true)

When buying options:
- **Reserve price** = Maximum you're willing to pay per contract
- **Total escrow** = `reservePrice × numContracts`
- If best MM offer exceeds your reserve price, the RFQ **fails** (funds returned)
- Setting `reservePrice: 0` means no price protection (accept any offer)

```typescript
// Example: Willing to pay at most $0.015 per contract
const params = client.optionFactory.buildRFQParams({
  isLong: true,
  numContracts: 10,
  // ...
});

// When building RFQ request:
const request = {
  ...params,
  reservePrice: 0.015,  // Max $0.015 per contract
};
// Total escrow required: 0.015 × 10 = 0.15 USDC
```

### For SELL Positions (isLong: false)

When selling options:
- **Reserve price** = Minimum you're willing to accept per contract
- Acts as a **floor price protection**
- If best MM offer is below your reserve price, the RFQ **fails**
- Setting `reservePrice: 0` means accept any offer (not recommended for sells)

```typescript
// Example: Accept at least $0.010 per contract
const params = client.optionFactory.buildRFQParams({
  isLong: false,
  numContracts: 5,
  // ...
});

const request = {
  ...params,
  reservePrice: 0.010,  // Min $0.010 per contract
};
```

### Reserve Price Calculation Example

| Parameter | Value |
|-----------|-------|
| Reserve Price | 0.015 (per contract) |
| Number of Contracts | 10 |
| **Total Escrow Required** | **0.15** (in collateral token) |

For a BUY position with USDC collateral:
- Reserve price: 0.015 USDC per contract
- Contracts: 10
- Escrow: 0.015 × 10 = **0.15 USDC** locked until settlement

### When Reserve Price is Checked

1. **At Settlement**: The winning offer is compared against reserve price
2. **BUY**: If `offerPrice > reservePrice` → RFQ fails
3. **SELL**: If `offerPrice < reservePrice` → RFQ fails
4. **Success**: User pays/receives the actual offer price (not reserve price)

---

## Option Structures

The RFQ system supports four option structures, determined by the number of strikes provided.

### How the SDK Detects Structure

```
strikes.length = 1  →  VANILLA (single option)
strikes.length = 2  →  SPREAD (2-leg)
strikes.length = 3  →  BUTTERFLY (3-leg)
strikes.length = 4  →  CONDOR (4-leg)
```

> **Settlement Types:** All multi-leg structures (spreads, butterflies, condors) are **cash-settled only**. Physically settled options are available only for vanilla (single-strike) options. See [Physically Settled Options](API_REFERENCE.md#physically-settled-options) for details.

### Vanilla Options (Single Leg)

```
                    VANILLA PUT                          VANILLA CALL

Strike: $1800       ────────────────────────            ────────────────────────

Payoff:                    ╱                                          ╱
                          ╱                                          ╱
                    ─────╱                               ────────────╱
                        $1800                                     $2000

Structure:          1 strike                             1 strike
isCall:             false                                true
strikes[]:          [1800]                               [2000]
```

### Spread Options (2 Legs)

```
                    PUT SPREAD                           CALL SPREAD
                    (Buy low, Sell high)                 (Buy low, Sell high)

                         ╱────                                    ────╲
                        ╱                                              ╲
                    ───╱                                                ╲───
                    $1700  $1900                                   $1800  $2000

Structure:          2 strikes                            2 strikes
isCall:             false                                true
strikes[]:          [1700, 1900]                         [1800, 2000]
Max Profit:         strike2 - strike1                    strike2 - strike1
Collateral:         (1900 - 1700) = $200                 (2000 - 1800) = $200
```

### Butterfly Options (3 Legs)

```
                    PUT BUTTERFLY                        CALL BUTTERFLY

                         ╱╲                                    ╱╲
                        ╱  ╲                                  ╱  ╲
                    ───╱    ╲───                          ───╱    ╲───
                    $1700 $1800 $1900                      $1800 $1900 $2000

Structure:          3 strikes                            3 strikes
isCall:             false                                true
strikes[]:          [1700, 1800, 1900]                   [1800, 1900, 2000]
Legs:               +1 @ low, -2 @ mid, +1 @ high        +1 @ low, -2 @ mid, +1 @ high
Max Profit:         At middle strike                     At middle strike
Collateral:         (middle - low) = $100                (middle - low) = $100
```

### Condor Options (4 Legs)

```
                    PUT CONDOR                           CALL CONDOR

                       ╱────╲                                ╱────╲
                      ╱      ╲                              ╱      ╲
                    ─╱        ╲─                          ─╱        ╲─
                 $1600 $1700 $1800 $1900              $1800 $1900 $2000 $2100

Structure:          4 strikes                            4 strikes
isCall:             false                                true
strikes[]:          [1600, 1700, 1800, 1900]             [1800, 1900, 2000, 2100]
Legs:               +1 @ s1, -1 @ s2, -1 @ s3, +1 @ s4   Same pattern
Max Profit:         Between strike2 and strike3          Between strike2 and strike3
Collateral:         (strike2 - strike1) = $100           (strike2 - strike1) = $100
```

### RFQ Parameters Comparison

| Parameter | Vanilla | Spread | Butterfly | Condor |
|-----------|---------|--------|-----------|--------|
| `strikes[]` | 1 value | 2 values | 3 values | 4 values |
| `isCall` | true/false | true/false | true/false | true/false |
| `numContracts` | N | N | N | N |
| Collateral (PUT) | strike × N | (s2-s1) × N | (s2-s1) × N | (s2-s1) × N |
| Collateral (CALL) | N contracts | (s2-s1) × N | (s2-s1) × N | (s2-s1) × N |
| Max Loss | Full strike | Spread width | Wing width | Wing width |

### Creating Each Structure

```typescript
// VANILLA PUT
const vanilla = client.optionFactory.buildRFQParams({
  strikes: [1800],           // 1 strike
  isCall: false,
  // ...
});

// PUT SPREAD
const spread = client.optionFactory.buildRFQParams({
  strikes: [1700, 1900],     // 2 strikes
  isCall: false,
  // ...
});

// PUT BUTTERFLY
const butterfly = client.optionFactory.buildRFQParams({
  strikes: [1700, 1800, 1900],  // 3 strikes
  isCall: false,
  // ...
});

// PUT CONDOR
const condor = client.optionFactory.buildRFQParams({
  strikes: [1600, 1700, 1800, 1900],  // 4 strikes
  isCall: false,
  // ...
});
```

### Risk/Reward Comparison

```
VANILLA:     Unlimited profit potential, higher premium cost
             Risk: Full strike (PUT) or unlimited (CALL)

                    ╱
                   ╱
             ─────╱

SPREAD:      Capped profit, lower premium cost
             Risk: Limited to spread width

                  ╱────
                 ╱
             ───╱

BUTTERFLY:   Max profit at middle strike, very low premium
             Risk: Limited to wing width

                  ╱╲
                 ╱  ╲
             ───╱    ╲───

CONDOR:      Profit zone between middle strikes, low premium
             Risk: Limited to wing width

                 ╱────╲
                ╱      ╲
             ──╱        ╲──
```

---

### Timeline

```
┌─────────────────┬─────────────────┬─────────────────┐
│  OFFER PERIOD   │  REVEAL PERIOD  │   SETTLEMENT    │
│                 │                 │                 │
│ MMs submit      │ MMs reveal      │ Option created  │
│ encrypted       │ actual offer    │ or transferred  │
│ offers          │ amounts         │                 │
└─────────────────┴─────────────────┴─────────────────┘
     offerEndTimestamp    + REVEAL_WINDOW
```

---

## User Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USER CREATES RFQ                                             │
│    - Select option: underlying, strike, expiry, type            │
│    - Choose direction: BUY (long) or SELL (short)               │
│    - Set offer deadline (e.g., 60 minutes)                      │
│    - Optionally set reserve price (max/min acceptable)          │
│    - Generate ECDH keypair for encrypted offers                 │
│                                                                 │
│    For BUY: Deposit reserve price (max you'll pay)              │
│    For SELL: Approve collateral tokens                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. MARKET MAKERS RESPOND (during offer period)                  │
│    - MM sees RFQ event on-chain                                 │
│    - MM calculates price from exchange data                     │
│    - MM creates EIP-712 signed offer                            │
│    - MM encrypts offer with ECDH (only requester can decrypt)   │
│    - MM submits signature on-chain (amount NOT revealed)        │
└────────────────────────┬────────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
          ▼                             ▼
┌─────────────────────┐    ┌─────────────────────────────────────┐
│ EARLY SETTLEMENT    │    │ 3. REVEAL PHASE                     │
│ (Optional)          │    │    - After offer period ends        │
│                     │    │    - MMs reveal actual amounts      │
│ User can accept     │    │    - Best offer wins                │
│ any offer early     │    │    - Losers get refunds             │
│ by decrypting and   │    │                                     │
│ calling settle      │    │                                     │
└─────────┬───────────┘    └─────────────────┬───────────────────┘
          │                                  │
          └──────────────┬───────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SETTLEMENT                                                   │
│                                                                 │
│    For NEW options:                                             │
│    - Clone option implementation contract                       │
│    - Set buyer and seller addresses                             │
│    - Transfer collateral to option contract                     │
│    - Transfer premium to seller                                 │
│                                                                 │
│    For EXISTING options:                                        │
│    - Transfer position ownership                                │
│    - Handle collateral/premium exchange                         │
│                                                                 │
│    Fees: 0.06% of notional, capped at 12.5% of premium          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. OPTION EXPIRY                                                │
│                                                                 │
│    - Oracle provides settlement price                           │
│    - Option contract calculates payout                          │
│    - If ITM: Buyer receives payout from collateral              │
│    - If OTM: Seller gets full collateral back                   │
└─────────────────────────────────────────────────────────────────┘
```

### Sequence of Events

```
    User                OptionFactory           Market Maker         Option Contract
      │                      │                       │                     │
      │  1. Create RFQ       │                       │                     │
      │─────────────────────>│                       │                     │
      │                      │                       │                     │
      │                      │  2. RFQ Event         │                     │
      │                      │──────────────────────>│                     │
      │                      │                       │                     │
      │                      │  3. Encrypted Offer   │                     │
      │                      │<──────────────────────│                     │
      │                      │                       │                     │
      │  4a. Early Settle    │                       │                     │
      │─────────────────────>│                       │                     │
      │         OR           │                       │                     │
      │                      │  4b. Reveal Offer     │                     │
      │                      │<──────────────────────│                     │
      │  4b. Normal Settle   │                       │                     │
      │─────────────────────>│                       │                     │
      │                      │                       │                     │
      │                      │  5. Deploy Option     │                     │
      │                      │────────────────────────────────────────────>│
      │                      │                       │                     │
      │                      │  6. Transfer Collateral                     │
      │                      │────────────────────────────────────────────>│
      │                      │                       │                     │
      │                      │  7. Pay Premium       │                     │
      │                      │──────────────────────>│                     │
      │                      │                       │                     │
      │                      │        ... time passes until expiry ...     │
      │                      │                       │                     │
      │  8. Claim Payout     │                       │                     │
      │───────────────────────────────────────────────────────────────────>│
      │<───────────────────────────────────────────────────────────────────│
      │                      │                       │                     │
```

### Fund Flow

```
AT SETTLEMENT:

  Seller ──── Collateral ────> OptionFactory ──── Collateral ────> Option Contract
                                     │                                   │
  Buyer ───── Premium ──────>        │                                   │
                                     │                                   │
                                     └──── Premium - Fees ────> Seller   │
                                                                         │
                                                                         │
AT EXPIRY:                                                               │
                                                                         │
  If ITM (in the money):                                                 │
       Option Contract ──── Payout ────> Buyer                           │
       Option Contract ──── Remaining ────> Seller                       │
                                                                         │
  If OTM (out of the money):                                             │
       Option Contract ──── Full Collateral ────> Seller                 │
```

### Summary Table

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | User | Create RFQ | RFQ published on-chain |
| 2 | MM | See RFQ event | Calculate pricing |
| 3 | MM | Submit encrypted offer | Offer stored (hidden) |
| 4a | User | Early settle (optional) | Accept offer immediately |
| 4b | MM | Reveal offer | Amount becomes visible |
| 4b | User | Normal settle | Accept best offer |
| 5 | Factory | Deploy option | New contract created |
| 6 | Factory | Transfer collateral | Locked in option |
| 7 | Factory | Transfer premium | Seller receives payment |
| 8 | User/MM | Claim at expiry | Payout distributed |

---

## Phase 1: User Creates RFQ

### What the User Provides

| Parameter | Description | Example |
|-----------|-------------|---------|
| `underlying` | Asset (ETH or BTC) | `'ETH'` |
| `optionType` | CALL or PUT | `'PUT'` |
| `strike` | Strike price | `1850` |
| `expiry` | Expiry timestamp | `1741334400` |
| `numContracts` | Number of contracts | `1.5` |
| `isLong` | BUY (true) or SELL (false) | `true` |
| `collateralToken` | USDC, WETH, or cbBTC | `'USDC'` |
| `offerDeadlineMinutes` | How long MMs can respond | `60` |
| `reservePrice` | Max/min acceptable price (optional) | `0.015` |

### Critical: collateralAmount is ALWAYS 0

When creating an RFQ, the `collateralAmount` parameter must **always be 0**:

```typescript
// CORRECT - collateralAmount is always 0
const params = {
  // ... other params
  collateralAmount: BigInt(0),  // ALWAYS 0
  // ...
};
```

**Why?** Collateral is NOT locked at RFQ creation. It's pulled at settlement time from both parties.

### For BUY Positions (isLong = true)

When buying an option:
- User deposits `reservePrice` as escrow (maximum they'll pay)
- No collateral needed (MM provides collateral as seller)
- Factory holds deposit until settlement

### For SELL Positions (isLong = false)

When selling an option:
- User must **approve** collateral tokens for the OptionFactory
- Approval amount calculation:
  - **CALL (inverse)**: `approval = numContracts` (1:1 with underlying)
  - **PUT**: `approval = strike * numContracts / 10^8`
- Collateral pulled at settlement, not at RFQ creation

---

## Phase 2: Market Makers Respond

### How MMs Process an RFQ

1. **Monitor Chain**: MMs listen for `QuotationRequested` events
2. **Validate RFQ**: Check implementation, collateral token, strikes, expiry
3. **Fetch Prices**: Get bid/ask from exchanges (Deribit, etc.)
4. **Calculate Offer**: Apply collateral cost and fees
5. **Sign Offer**: Create EIP-712 signature
6. **Encrypt Details**: Use ECDH to encrypt for requester only
7. **Submit On-Chain**: Call `makeOfferForQuotation()`

### Offer Calculation

Market makers calculate offers based on:

```
Base Price = Exchange bid/ask price

Collateral Cost = collateral_amount * APR * time_to_expiry
  - BTC: 1% APR
  - ETH: 4% APR
  - USD: 7% APR

For SELLING to user (MM is short):
  Total = Base Ask + Collateral Cost

For BUYING from user (MM is long):
  Total = Base Bid - Collateral Cost
```

### What's Stored On-Chain

During offer period, **only the signature** is stored:

```solidity
offerSignatures[quotationId][maker] = signature;
```

The actual offer amount is:
- Encrypted with ECDH (only requester can decrypt)
- NOT stored on-chain (privacy)
- Revealed in Phase 3

---

## Phase 3: Reveal Phase

### Timeline

```
offerEndTimestamp ────┬─────────────────────┐
                      │   REVEAL_WINDOW     │
                      │   (typically 1hr)   │
                      └─────────────────────┘
```

### Reveal Process

Market makers call `revealOffer()` with:

```solidity
revealOffer(
  quotationId,    // Which RFQ
  offerAmount,    // Actual price offered
  nonce,          // Random value used in signature
  offeror         // MM's address
)
```

### Winner Selection

The factory validates and selects the best offer:

```
For BUY RFQs (user buying):
  - First offer: Always accepted
  - Subsequent: Must be LOWER than current best
  - Winner: Lowest offer (best for buyer)

For SELL RFQs (user selling):
  - First offer: Always accepted
  - Subsequent: Must be HIGHER than current best
  - Winner: Highest offer (best for seller)
```

---

## Settlement Paths: Early vs Normal

There are two ways to settle an RFQ - early settlement or normal settlement.

### Early Settlement

User decrypts an offer and accepts it immediately, before the offer period ends.

```
Timeline:
├── RFQ Created
├── MM submits encrypted offer
├── User decrypts offer (using ECDH)
├── User calls settleQuotationEarly()    ← BEFORE offer period ends
└── Option created immediately
```

**When to use:** You see a good offer and want to lock it in immediately.

**Requirements:**
- Must decrypt the offer yourself (get offerAmount + nonce)
- Must call `settleQuotationEarly` with decrypted values
- Can happen anytime during offer period

**Code Example:**

```typescript
// 1. Get the encrypted offer from OfferMade event
const offerEvent = /* from event logs */;
const encryptedOffer = offerEvent.encryptedOffer;
const mmPublicKey = offerEvent.signingKey;
const mmAddress = offerEvent.offeror;

// 2. Decrypt the MM's offer
const decrypted = await client.rfqKeys.decryptOffer(
  encryptedOffer,      // from OfferMade event
  mmPublicKey          // signingKey from event
);

console.log('Offer amount:', decrypted.offerAmount);
console.log('Nonce:', decrypted.nonce);

// 3. Settle early with decrypted values
const { to, data } = client.optionFactory.encodeSettleQuotationEarly({
  quotationId,
  offerAmount: decrypted.offerAmount,
  nonce: decrypted.nonce,
  offeror: mmAddress
});

const tx = await signer.sendTransaction({ to, data });
await tx.wait();
console.log('Option created!');
```

### Normal Settlement

Wait for the reveal period, let MMs reveal their offers, then settle with the best offer.

```
Timeline:
├── RFQ Created
├── MM submits encrypted offer
├── Offer period ends (offerEndTimestamp)
├── REVEAL PERIOD begins
├── MM calls revealOffer() with actual amount + nonce
├── Anyone calls settleQuotation()    ← AFTER reveal period
└── Option created with best offer
```

**When to use:** Let all MMs compete, auction determines best price.

**Requirements:**
- Wait until offer period ends
- MM must reveal their offer on-chain
- Call `settleQuotation` (no decryption needed)

**Code Example:**

```typescript
// After reveal period, just settle (no decryption needed)
const { to, data } = client.optionFactory.encodeSettleQuotation({
  quotationId
});

const tx = await signer.sendTransaction({ to, data });
await tx.wait();
console.log('Option created with best offer!');
```

### Who Can Call Settlement?

> **Important:** Settlement is **NOT automatic**. Someone must call `settleQuotation()` on-chain.

| Settlement Type | Who Can Call | When |
|-----------------|--------------|------|
| **Early Settlement** | Only the requester | During offer period |
| **Normal Settlement** | **Anyone** (permissionless) | After reveal period ends |

#### Why is Normal Settlement Permissionless?

After the reveal period:
- All offers are public on-chain (no longer encrypted)
- The winning offer is deterministic (best price wins)
- No special permissions needed to execute

#### Who Typically Settles?

In practice, **MMs often settle RFQs they've won** because:
1. MM bots auto-reveal and auto-settle after deadlines
2. MMs want to lock in their winning position immediately
3. It's in the MM's interest to complete the trade quickly

**Example from RFQ 781:**
```
1. Requester created RFQ 781 (PUT SPREAD)
2. MM submitted encrypted offer
3. Offer deadline passed (03:28:32 UTC)
4. MM's bot revealed the offer
5. MM's bot called settleQuotation(781)  ← MM settled, not requester
6. Option minted, trade completed
```

#### What if Nobody Settles?

If neither the requester nor MMs call `settleQuotation()`:
- The RFQ remains in "settleable" state indefinitely
- Collateral approvals remain in place
- Either party can settle at any time
- There is no expiration on the settlement window (only the option itself expires)

### Settlement Paths Comparison

```
                    EARLY SETTLEMENT              NORMAL SETTLEMENT

When:               During offer period           After reveal period

Who can call:       Requester only                Anyone (permissionless)

Who decrypts:       User (requester)              MM reveals on-chain

Speed:              Immediate                     Must wait for deadlines

Competition:        Accept one offer              Best offer wins

Use case:           Good price, lock it in        Let MMs compete

Typical caller:     Requester                     Often MM (auto-settle bots)
```

### Settlement Flow Diagram

```
    ┌─────────────────────────────────────────────────────────────┐
    │                      OFFER PERIOD                           │
    │                                                             │
    │  MM1 submits encrypted offer                                │
    │  MM2 submits encrypted offer                                │
    │  MM3 submits encrypted offer                                │
    │                                                             │
    │  Requester can:                                             │
    │    → Decrypt any offer                                      │
    │    → Call settleQuotationEarly() ──────────┐                │
    │                                            │                │
    └─────────────────────────────────────────────│────────────────┘
                                                 │
                         OR wait...              │
                                                 │
    ┌─────────────────────────────────────────────│────────────────┐
    │                     REVEAL PERIOD          │                │
    │                                            │                │
    │  MM1 calls revealOffer()                   │                │
    │  MM2 calls revealOffer()                   │                │
    │  MM3 calls revealOffer()                   │                │
    │                                            ▼                │
    │  ANYONE calls settleQuotation() ───────> OPTION             │
    │  (user, MM, or third party)              CREATED            │
    └─────────────────────────────────────────────────────────────┘
```

### SDK Settlement Methods

| Action | Method | When | Who Can Call |
|--------|--------|------|--------------|
| Early settle | `encodeSettleQuotationEarly()` | During offer period | Requester only |
| Normal settle | `encodeSettleQuotation()` | After reveal period | Anyone |
| Decrypt offer | `client.rfqKeys.decryptOffer()` | For early settlement | Requester only |
| Cancel RFQ | `encodeCancelQuotation()` | Before settlement | Requester only |

---

## Phase 4: Settlement

### New Option Creation

When `existingOptionAddress == address(0)`:

1. **Clone Contract**: Factory creates option using EIP-1167 minimal proxy
2. **Initialize**: Set buyer, seller, strikes, expiry, collateral
3. **Transfer Collateral**: Move collateral from factory to option contract
4. **Pay Premium**: Transfer premium to seller (minus fees)
5. **Return Excess**: Refund any unused deposit to requester

### Existing Option Transfer

When `existingOptionAddress != address(0)`:

1. **Validate State**: Option not settled, parameters match
2. **Transfer Ownership**: Change buyer/seller addresses
3. **Handle Collateral**: Return collateral if applicable
4. **Exchange Premium**: Transfer between parties

### Fee Structure

```
Fee = min(collateral_fee, max_fee)

Where:
  collateral_fee = numContracts * 6 * price / 1e8 / 10000  (0.06%)
  max_fee = premium * 125 / 1000  (12.5% of premium)

Distribution:
  - With referral: 50% to referrer, 50% to protocol
  - Without referral: 100% to protocol
```

---

## Collateral Handling

### Key Principle: SELLER Always Provides Collateral

In every RFQ trade, the **seller** (the party going short) provides collateral. This is true regardless of who created the RFQ:

| RFQ Type | Who is Seller | Who Provides Collateral |
|----------|---------------|-------------------------|
| BUY (isLong: true) | Market Maker | Market Maker |
| SELL (isLong: false) | User/Requester | User/Requester |

### Where Collateral is Stored

Collateral is **NOT** held by users, MMs, or the OptionFactory. It flows to a dedicated **Option Contract**:

1. **OptionFactory** - Only routes collateral, never holds it
2. **Option Contract (BaseOption)** - Holds collateral from settlement until expiry
3. **At Payout** - Option Contract distributes based on settlement price

### Collateral Lifecycle

| Stage | Action | Where Funds Are |
|-------|--------|-----------------|
| Pre-RFQ | Seller approves OptionFactory | In seller's wallet |
| Settlement | OptionFactory pulls collateral | Transferred to Option Contract |
| During Life | Option is active | Locked in Option Contract |
| At Expiry | Settlement triggered | Option Contract calculates payout |
| Payout | Distribution | Sent to buyer/seller based on outcome |

### Payout Distribution at Expiry

| Scenario | Buyer Receives | Seller Receives |
|----------|----------------|-----------------|
| Option expires worthless (OTM) | 0 | Full collateral returned |
| Option expires ITM | Intrinsic value | Collateral minus payout |
| Option exercised maximally | Full collateral | 0 |

### Example: BUY PUT Option Flow

User wants to BUY a PUT (go long). MM becomes seller:

1. **User creates RFQ** with `isLong: true`
2. **MM submits offer** (encrypted)
3. **At settlement:**
   - MM's collateral (strike × contracts) → Option Contract
   - User's premium → MM (minus fees)
4. **At expiry:**
   - If PUT is ITM: Option Contract pays user
   - If PUT is OTM: Option Contract returns collateral to MM

### Example: SELL PUT Option Flow

User wants to SELL a PUT (go short). User becomes seller:

1. **User creates RFQ** with `isLong: false`
2. **User approves collateral** for OptionFactory
3. **MM submits offer** (encrypted)
4. **At settlement:**
   - User's collateral (strike × contracts) → Option Contract
   - MM's premium → User (minus fees)
5. **At expiry:**
   - If PUT is ITM: Option Contract pays MM
   - If PUT is OTM: Option Contract returns collateral to user

### Collateral Amount by Option Type

| Option Type | Collateral Formula | Example |
|-------------|-------------------|---------|
| CALL (inverse) | `numContracts` | 1 ETH per contract |
| PUT | `strike × numContracts / 10^8` | $1850 × 1 = 1850 USDC |
| CALL SPREAD | `(strikeHigh - strikeLow) × contracts` | ($2000 - $1800) × 1 = $200 |
| PUT SPREAD | `(strikeHigh - strikeLow) × contracts` | ($1900 - $1700) × 1 = $200 |
| BUTTERFLY | `(strikeMiddle - strikeLow) × contracts` | Max loss width |
| CONDOR | `(strike2 - strike1) × contracts` | Inner spread width |

### Premium vs Collateral

These are two separate concepts:

| Concept | Who Pays | When | Purpose |
|---------|----------|------|---------|
| **Premium** | Buyer | At settlement | Price for the option |
| **Collateral** | Seller | At settlement | Backs the option payout |

- **Premium** is the cost to buy an option (like an insurance premium)
- **Collateral** is the security deposit that ensures seller can pay if option is exercised

### Collateral Cost (Opportunity Cost)

When market makers quote prices, they factor in the **cost of locking up collateral**. This is calculated using APR rates that represent the opportunity cost of capital.

| Collateral Type | Symbol | APR Rate |
|-----------------|--------|----------|
| Bitcoin | cbBTC | 1% |
| Ethereum | WETH | 4% |
| US Dollar | USDC | 7% |

**Collateral Cost Formula:**

```
collateralCost = collateralAmount × APR × timeToExpiryYears
```

**Example:** Selling a $2000 PUT with 3-month expiry, USDC collateral:
- Collateral Amount: $2000
- APR: 7% (USDC)
- Time to Expiry: 0.25 years (3 months)
- **Collateral Cost: $2000 × 0.07 × 0.25 = $35.00**

This cost is factored into MM pricing. For detailed pricing information, see [MM Pricing Module - Collateral APR Rates](API_REFERENCE.md#collateral-apr-rates).

**Source of truth:** These APR rates match the production `mm_bot.py` implementation (thetanuts_rfq/scripts/mm_bot.py:789-794).

---

## Sealed-Bid Auction Mechanism

### Why Sealed Bids?

Traditional auctions have problems:
- **Front-running**: Bots see bids and outbid by $0.01
- **Sniping**: Wait until last second to bid
- **Collusion**: MMs can coordinate prices

Sealed-bid auction prevents these:
- Offers encrypted until reveal
- Only requester can decrypt (ECDH)
- No one knows others' bids during offer period

### ECDH Encryption Flow

```
1. Requester generates keypair:
   - requester_private_key (kept secret)
   - requester_public_key (shared in RFQ)

2. MM generates ephemeral keypair:
   - mm_private_key (kept secret)
   - mm_public_key (shared with offer)

3. Both compute shared secret:
   Requester: shared = ECDH(requester_private, mm_public)
   MM:        shared = ECDH(mm_private, requester_public)

   Both get SAME shared secret!

4. MM encrypts offer:
   encrypted = AES-GCM(shared_secret, {nonce, offerAmount})

5. Only requester can decrypt:
   - Has requester_private_key
   - Can compute same shared secret
   - Can decrypt offer details
```

---

## Key Management

The RFQ system uses ECDH (Elliptic Curve Diffie-Hellman) key pairs for encrypting offers. Proper key management is essential for decrypting offers from market makers.

### Storage Providers

| Environment | Default Provider | Persistence | Location |
|-------------|-----------------|-------------|----------|
| **Node.js** | `FileStorageProvider` | ✅ Persistent | `.thetanuts-keys/` directory |
| **Browser** | `LocalStorageProvider` | ✅ Persistent | Browser localStorage |
| **Testing** | `MemoryStorageProvider` | ❌ Lost on exit | In-memory only |

### Key Persistence Example

```typescript
import { ThetanutsClient, FileStorageProvider } from '@thetanuts-finance/thetanuts-client';

// Default: Keys automatically persist based on environment
const client = new ThetanutsClient({ chainId: 8453, provider });
const keyPair = await client.rfqKeys.getOrCreateKeyPair();
// Keys saved to .thetanuts-keys/ with 0o600 permissions (Node.js)

// Custom storage location
const customStorage = new FileStorageProvider('./my-keys');
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: customStorage,
});
```

### Key Backup Warning

> ⚠️ **CRITICAL**: Back up your RFQ private keys! If you lose your private key, you **cannot** decrypt offers made to your public key. There is no recovery mechanism.
>
> - **Node.js**: Keys stored in `.thetanuts-keys/` with secure permissions
> - **Browser**: Keys stored in localStorage (cleared if user clears browser data)

### Custom Storage Provider

Implement `KeyStorageProvider` for custom storage (database, cloud, etc.):

```typescript
import { KeyStorageProvider } from '@thetanuts-finance/thetanuts-client';

class MyCustomStorage implements KeyStorageProvider {
  async get(keyId: string): Promise<string | null> {
    return await myDatabase.get(keyId);
  }

  async set(keyId: string, privateKey: string): Promise<void> {
    await myDatabase.set(keyId, privateKey);
  }

  async remove(keyId: string): Promise<void> {
    await myDatabase.delete(keyId);
  }

  async has(keyId: string): Promise<boolean> {
    return await myDatabase.exists(keyId);
  }
}
```

---

## Encryption Technical Details

### ECDH Key Exchange

The SDK uses secp256k1 ECDH for secure key exchange:

```
1. Requester generates keypair:
   - Private key: 32 random bytes
   - Public key: Compressed (33 bytes, 0x02/0x03 prefix)

2. Market Maker generates ephemeral keypair:
   - Same process, new keypair per offer

3. Shared secret computation:
   ECDH produces: 0x04 || x-coordinate (32 bytes) || y-coordinate (32 bytes)

4. AES key derivation:
   AES-256 key = x-coordinate (first 32 bytes after 0x04 prefix)

   Note: The SDK uses the raw x-coordinate, NOT a hash.
   This matches the MM bot's key derivation.

5. Encryption:
   - Algorithm: AES-256-GCM
   - IV: 12 random bytes
   - Plaintext: JSON { "offerAmount": "...", "nonce": "..." }
   - Output: IV (12) + ciphertext + auth tag (16)
```

### Nonce Format

The `nonce` field in encrypted offers can be in two formats:

| Source | Format | Example |
|--------|--------|---------|
| **MM Bot** | 16-char hex string | `"987563ef5fde9655"` |
| **SDK** | Decimal string | `"391788778684598574"` |

The SDK automatically detects and handles both formats during decryption.

### Why X-Coordinate (Not Hash)?

The SDK uses the raw x-coordinate as the AES key (not SHA256 hash) because:
- MM bots use `shared_secret[:32]` (Python) which is the x-coordinate
- Ethers.js `computeSharedSecret()` returns `0x04 + x (32) + y (32)`
- Using x-coordinate directly ensures compatibility

---

## Decryption Troubleshooting

### Common Issues

#### 1. "KeyNotFoundError: RFQ key not found"

**Cause**: Private key not in storage (lost or different machine)

**Solution**:
- Ensure you're using the same storage provider as when creating the RFQ
- Check `.thetanuts-keys/` directory exists (Node.js)
- If key is lost, you cannot decrypt - create a new RFQ with a new key

#### 2. "DecryptionError: Invalid ciphertext"

**Cause**: Using wrong private key or corrupted data

**Solution**:
- Verify the public key in the RFQ matches your stored keypair
- Check that `encryptedOffer` data is complete (not truncated)

#### 3. "DecryptionError: Authentication failed"

**Cause**: Key mismatch or tampered data

**Solution**:
- Ensure you're using the keypair from when you created the RFQ
- AES-GCM authentication failure means the shared secret is wrong

### Debugging Decryption

```typescript
// Check if your key matches the RFQ
const keyPair = await client.rfqKeys.loadKeyPair();
console.log('Your public key:', keyPair.compressedPublicKey);

// Get RFQ to see what public key was used
const quotation = await client.optionFactory.getQuotation(rfqId);
// Compare with the key you used when creating the RFQ

// If keys don't match, you cannot decrypt offers for this RFQ
```

### Key Mismatch Prevention

1. **Always use `getOrCreateKeyPair()`** - automatically loads existing or creates new
2. **Don't regenerate keys** between creating RFQ and decrypting offers
3. **Back up keys** if running in production

---

## SDK Usage Examples

### Creating an RFQ (BUY Position)

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

// provider is required; signer is required for sending the RFQ transaction
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();

// Step 1: Generate ECDH keypair for encrypted offers
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

// Step 2: Build RFQ params using helper (enforces collateralAmount = 0)
const quotationParams = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,              // Human-readable
  expiry: 1741334400,        // Unix timestamp
  numContracts: 1.5,         // Human-readable
  isLong: true,              // BUY position
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});

// Step 3: Encode and send transaction
const { to, data } = client.optionFactory.encodeRequestForQuotation({
  params: quotationParams,
  tracking: { referralId: BigInt(0), eventCode: BigInt(0) },
  reservePrice: BigInt(0),  // Or set max price in USDC decimals
  requesterPublicKey: keyPair.compressedPublicKey,
});

const tx = await signer.sendTransaction({ to, data });
console.log(`RFQ created: ${tx.hash}`);
```

### Creating an RFQ (SELL Position)

```typescript
// Assumes the client, signer, userAddress, and keyPair from the BUY example above.
const USDC_ADDRESS = client.chainConfig.tokens.USDC.address;

// Step 1: Calculate required collateral for approval
const strike = 1850;
const numContracts = 1.5;
const collateralDecimals = 6;  // USDC

// For PUT: approval = strike * numContracts
const approvalAmount = BigInt(
  Math.round(strike * numContracts * 10 ** collateralDecimals)
);

// Step 2: Approve collateral tokens. `ensureAllowance` is a no-op if
// the current allowance already covers `approvalAmount`.
await client.erc20.ensureAllowance(
  USDC_ADDRESS,
  client.optionFactory.contractAddress,
  approvalAmount
);

// Step 3: Build RFQ params
const quotationParams = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,
  expiry: 1741334400,
  numContracts: 1.5,
  isLong: false,              // SELL position
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});

// Step 4: Encode and send the RFQ transaction (same shape as buy)
const { to, data } = client.optionFactory.encodeRequestForQuotation({
  params: quotationParams,
  tracking: { referralId: BigInt(0), eventCode: BigInt(0) },
  reservePrice: BigInt(0),  // Or set min price
  requesterPublicKey: keyPair.compressedPublicKey,
});

const tx = await signer.sendTransaction({ to, data });
console.log(`SELL RFQ created: ${tx.hash}`);
```

### Using buildRFQRequest (Complete Helper)

```typescript
// One-liner that builds everything
const rfqRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,
  expiry: 1741334400,
  numContracts: 1.5,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  reservePrice: 0.015,  // Optional: max price per contract
  requesterPublicKey: keyPair.compressedPublicKey,
});

const { to, data } = client.optionFactory.encodeRequestForQuotation(rfqRequest);
```

### Creating a Spread RFQ (Complete Example)

Spreads use **2 strikes** instead of 1. The SDK automatically:
- Detects spread structure from `strikes.length === 2`
- Sorts strikes correctly (PUT: descending, CALL: ascending)
- Selects the correct implementation (PUT_SPREAD or CALL_SPREAD)
- Calculates collateral as `(upperStrike - lowerStrike) × numContracts`

```typescript
import 'dotenv/config';
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

async function createSpreadRFQ() {
  // Setup
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const client = new ThetanutsClient({
    chainId: 8453,  // Base mainnet
    provider,
    signer: wallet,
  });

  const userAddress = await wallet.getAddress();

  // ============================================================
  // Step 1: Generate/load ECDH keypair for encrypted offers
  // ============================================================
  const keyPair = await client.rfqKeys.getOrCreateKeyPair();
  console.log('ECDH Public Key:', keyPair.compressedPublicKey);

  // ============================================================
  // Step 2: Calculate Deribit-compatible expiry (Friday 8:00 UTC)
  // ============================================================
  const now = new Date();
  const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7 || 7;
  const nextFriday = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + daysUntilFriday,
    8, 0, 0  // 8:00 UTC
  ));

  // If less than 2 days away, use following Friday
  if (nextFriday.getTime() - now.getTime() < 2 * 86400 * 1000) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }

  const expiry = Math.floor(nextFriday.getTime() / 1000);
  console.log('Expiry:', nextFriday.toISOString());

  // ============================================================
  // Step 3: Define spread parameters
  // ============================================================
  const lowerStrike = 1800;  // Buy PUT at $1800
  const upperStrike = 2000;  // Sell PUT at $2000
  const spreadWidth = upperStrike - lowerStrike;  // $200

  // For SELL position, collateral = spreadWidth × numContracts
  // Example: 0.1 USDC collateral → numContracts = 0.1 / 200 = 0.0005
  const targetCollateral = 0.1;  // USDC
  const numContracts = targetCollateral / spreadWidth;

  console.log('Spread:', `$${lowerStrike} / $${upperStrike}`);
  console.log('Contracts:', numContracts);
  console.log('Collateral:', targetCollateral, 'USDC');

  // ============================================================
  // Step 4: Check and approve USDC (for SELL positions)
  // ============================================================
  const usdcAddress = client.chainConfig.tokens.USDC.address;
  const collateralNeeded = BigInt(Math.round(targetCollateral * 1e6));

  const balance = await client.erc20.getBalance(usdcAddress, userAddress);
  if (balance < collateralNeeded) {
    throw new Error(`Insufficient USDC. Need ${targetCollateral} USDC`);
  }

  // Approve OptionFactory to pull collateral at settlement
  await client.erc20.ensureAllowance(
    usdcAddress,
    client.optionFactory.contractAddress,
    collateralNeeded
  );
  console.log('USDC approved');

  // ============================================================
  // Step 5: Build spread RFQ request
  // ============================================================
  // Key difference from vanilla: pass 2 strikes instead of 1
  const spreadRequest = client.optionFactory.buildRFQRequest({
    requester: userAddress as `0x${string}`,
    underlying: 'ETH',
    optionType: 'PUT',
    strikes: [lowerStrike, upperStrike],  // 2 strikes = SPREAD
    expiry,
    numContracts,
    isLong: false,  // SELL (short) - we provide collateral
    offerDeadlineMinutes: 3,  // MMs have 3 minutes to respond
    collateralToken: 'USDC',
    reservePrice: 0.001,  // Minimum acceptable price per contract
    requesterPublicKey: keyPair.compressedPublicKey,
  });

  // Verify the request (SDK auto-sorted strikes for PUT: descending)
  console.log('Strikes in request:', spreadRequest.params.strikes);
  // Should be [2000, 1800] for PUT spread (descending order)

  // ============================================================
  // Step 6: Submit RFQ transaction
  // ============================================================
  const receipt = await client.optionFactory.requestForQuotation(spreadRequest);
  console.log('TX Hash:', receipt.hash);
  console.log('Block:', receipt.blockNumber);

  // ============================================================
  // Step 7: Get the new RFQ ID
  // ============================================================
  const rfqCount = await client.optionFactory.getQuotationCount();
  const rfqId = rfqCount - 1n;
  console.log('Created RFQ ID:', rfqId.toString());

  // Verify
  const quotation = await client.optionFactory.getQuotation(rfqId);
  console.log('Requester:', quotation.params.requester);
  console.log('Strikes:', quotation.params.strikes.map(s =>
    '$' + (Number(s) / 1e8).toString()
  ).join(' / '));

  return rfqId;
}

createSpreadRFQ().catch(console.error);
```

### Spread vs Vanilla: Key Differences

| Aspect | Vanilla | Spread |
|--------|---------|--------|
| `strikes` param | `[1800]` (1 value) | `[1800, 2000]` (2 values) |
| Implementation | `PUT` or `INVERSE_CALL` | `PUT_SPREAD` or `CALL_SPREAD` |
| Collateral | `strike × numContracts` | `(upper - lower) × numContracts` |
| Max Loss | Full strike value | Spread width |
| Strike Order | N/A | PUT: descending, CALL: ascending |

### Strike Ordering (Important!)

The SDK automatically sorts strikes based on option type:

```
PUT SPREAD:  [1800, 2000] → sorted to [2000, 1800] (DESCENDING)
CALL SPREAD: [1800, 2000] → kept as   [1800, 2000] (ASCENDING)
```

This is required by the smart contract. You can pass strikes in any order - the SDK handles sorting.

### Multi-Leg Structures

The SDK supports 4 structures based on strike count:

```typescript
// VANILLA (1 strike)
strikes: [1800]

// SPREAD (2 strikes)
strikes: [1800, 2000]

// BUTTERFLY (3 strikes)
strikes: [1700, 1800, 1900]

// CONDOR (4 strikes)
strikes: [1600, 1700, 1800, 1900]
```

---

## Common Pitfalls

### 1. Setting collateralAmount != 0

```typescript
// WRONG - Will cause issues
collateralAmount: BigInt(1000000),

// CORRECT - Always 0
collateralAmount: BigInt(0),
```

### 2. Not Approving Tokens for SELL

```typescript
// WRONG - Forgot to approve
const rfq = client.optionFactory.buildRFQParams({ isLong: false, ... });
await sendTransaction(rfq);  // Will fail at settlement!

// CORRECT - Approve first
await client.erc20.approve(token, factory, amount);
const rfq = client.optionFactory.buildRFQParams({ isLong: false, ... });
await sendTransaction(rfq);
```

### 3. Reserve Price in Wrong Decimals

```typescript
// WRONG - Using 8 decimals for USDC
reservePrice: BigInt(15000000),  // This is 150.00 in 8 decimals

// CORRECT - Use collateral token decimals (USDC = 6)
reservePrice: BigInt(15000000),  // This is 15.00 in 6 decimals
```

### 4. Expiry Before Offer Deadline

```typescript
// WRONG - Offer deadline after expiry
expiry: now + 3600,
offerDeadlineMinutes: 120,  // 2 hours > 1 hour to expiry

// CORRECT - Expiry must be after offer deadline
expiry: now + 86400,  // 24 hours
offerDeadlineMinutes: 60,   // 1 hour
```

---

## Settlement & Cancellation

### Early Settlement

Requesters can accept a specific offer **before** the offer period ends. This requires decrypting the offer first.

```typescript
// 1. Get your keypair (used when creating the RFQ)
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

// 2. Decrypt the offer you want to accept
const decrypted = await client.rfqKeys.decryptOffer(
  offer.signedOfferForRequester,  // from OfferMade event
  offer.signingKey                // offeror's public key
);

// 3. Accept the offer early
const receipt = await client.optionFactory.settleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offerorAddress
);
```

### Normal Settlement

After the reveal phase, **anyone** can settle the RFQ with the winning offer:

```typescript
// Settlement is permissionless after reveal phase
await client.optionFactory.settleQuotation(quotationId);
```

### Cancellation

**Requester** can cancel their RFQ at any time:

```typescript
await client.optionFactory.cancelQuotation(quotationId);
```

**Market maker** can cancel their offer:

```typescript
await client.optionFactory.cancelOfferForQuotation(quotationId);
```

### Timing Constraints

| Action | When |
|--------|------|
| Make Offer | Before `offerEndTimestamp` |
| Cancel Offer | Before reveal period ends |
| Cancel RFQ | Any time (requester only) |
| Early Settlement | Before `offerEndTimestamp` |
| Reveal Offer | After `offerEndTimestamp`, before reveal period ends |
| Normal Settlement | After reveal period ends |

---

## Physically Settled Options (Vanilla Only)

Physical options involve actual delivery of the underlying asset rather than cash settlement. They are only available for vanilla (single-strike) options.

### Physical Option Settlement Behavior

| Option | Direction | Collateral | At ITM Expiry |
|--------|-----------|------------|---------------|
| **Physical PUT** | SELL | USDC | Receive WETH, pay strike in USDC |
| **Physical CALL** | SELL | WETH | Receive strike in USDC, deliver WETH |

### Creating a Physical PUT RFQ

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const keyPair = await client.rfqKeys.getOrCreateKeyPair();
const userAddress = await signer.getAddress();

// SELL Physical PUT: "I want to buy ETH at $2500"
// If price drops below strike, I receive ETH at my target price
const physicalPutRFQ = client.optionFactory.buildPhysicalOptionRFQ({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 2500,
  expiry: nextFridayExpiry,
  numContracts: 0.1,
  isLong: false,                    // SELL
  deliveryToken: client.chainConfig.tokens.WETH.address as `0x${string}`,
  collateralToken: 'USDC',          // Auto-inferred for PUT
  offerDeadlineMinutes: 6,
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Verify correct implementation
console.log('Implementation:', physicalPutRFQ.params.implementation);
// Should match: client.chainConfig.implementations.PHYSICAL_PUT

// extraOptionData contains ABI-encoded delivery token (not empty '0x')
console.log('extraOptionData:', physicalPutRFQ.params.extraOptionData);

// Submit RFQ
const receipt = await client.optionFactory.requestForQuotation(physicalPutRFQ);
```

> **Note:** Physical options are vanilla-only. Multi-leg structures (spreads, butterflies, condors) are cash-settled only.

---

## Closing Existing Positions

When closing an existing position via RFQ, precision is critical. The `numContracts` value must match **exactly** with the on-chain value. Floating-point arithmetic can introduce tiny errors that cause position closes to fail.

### The Precision Problem

```typescript
// Problem: Floating-point conversion can lose precision
const humanReadable = 1.5;
const decimals = 18;

// This may introduce tiny errors for 18-decimal tokens
console.log(humanReadable * 10 ** decimals);
// Could be: 1500000000000000000 or 1499999999999999999

// If on-chain value is 1500000000000000000n but we send 1499999999999999999n
// The position close FAILS because values don't match exactly!
```

### Solution: Use BigInt for Exact Precision

The SDK accepts `numContracts` as `number | bigint | string`:

| Input Type | Behavior | Use Case |
|------------|----------|----------|
| `number` | Converted using token decimals | New positions with human-readable values |
| `bigint` | Used directly, no conversion | **Closing positions** - exact on-chain value |
| `string` | Parsed as BigInt | API/JSON responses where value is a string |

### Position Closing Example

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const walletAddress = await signer.getAddress();

// Step 1: Get your existing position from the API
const positions = await client.api.getUserPositionsFromIndexer(walletAddress);
const position = positions.find(p => p.optionAddress === targetOptionAddress);

// position.numContracts is already a BigInt from the chain!
console.log('Position numContracts:', position.numContracts);
// e.g., 40n (BigInt)

// Step 2: Generate keypair for the closing RFQ
const keypair = client.rfqKeys.generateKeyPair();

// Step 3: Build closing RFQ using EXACT BigInt from chain
const closeRfq = client.optionFactory.buildRFQRequest({
  requester: walletAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: position.strike,
  expiry: position.expiry,

  // CRITICAL: Pass BigInt directly - no precision loss!
  numContracts: position.numContracts,

  // To close a SELL position, you BUY it back
  // To close a BUY position, you SELL it
  isLong: !position.isBuyer,  // Opposite of original position

  offerDeadlineMinutes: 30,
  collateralToken: 'USDC',
  requesterPublicKey: keypair.compressedPublicKey,

  // IMPORTANT: Link to the existing option being closed
  existingOptionAddress: position.optionAddress,
});

// Step 4: Submit the closing RFQ
const { to, data } = client.optionFactory.encodeRequestForQuotation(closeRfq);
const tx = await signer.sendTransaction({ to, data });
await tx.wait();

console.log('Closing RFQ created! Waiting for MM offers...');
```

### Key Points for Position Closing

1. **Always use BigInt** for `numContracts` when closing positions
2. **Set `existingOptionAddress`** to link the RFQ to the option being closed
3. **Opposite direction**: Use `isLong: true` to close a short, `isLong: false` to close a long
4. **Expiry must match**: Use the same expiry as the original option (must be 8:00 UTC for MM acceptance)

### String Input (from API/JSON)

If `numContracts` comes as a string from an API response:

```typescript
// From API response (JSON serializes BigInt as string)
const apiResponse = { numContracts: "40000000" };

// SDK handles string input correctly
const closeRfq = client.optionFactory.buildRFQRequest({
  // ...
  numContracts: apiResponse.numContracts,  // String is parsed as BigInt
  // ...
});
```

---

## Summary

1. **User creates RFQ** with option parameters and ECDH public key
2. **MMs respond** with encrypted, signed offers during offer period
3. **MMs reveal** actual amounts after offer period ends
4. **Best offer wins** and settlement creates/transfers the option
5. **Collateral flows** at settlement, not at RFQ creation
6. **Always use collateralAmount = 0** in RFQ params
7. **Early settlement** is possible by decrypting and accepting a specific offer

---

## See Also

- [SDK Quick Reference](SDK_QUICK_REFERENCE.md) - Quick reference for all SDK methods
- [API Reference](API_REFERENCE.md) - Complete API documentation
- [Migration Guide](MIGRATION_GUIDE.md) - Breaking changes and new patterns
- [Error Codes](ERROR_CODES.md) - Error handling reference
- [RFQ Creation Example](examples/create-rfq.ts) - Copy-paste ready example
