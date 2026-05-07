# RFQ Lifecycle

Complete walkthrough of the four phases of an RFQ — from creation through settlement and expiry.

---

## High-Level Timeline

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
│    - Select: underlying, strike(s), expiry, type                │
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
│ User decrypts offer │    │    - Best offer wins                │
│ and calls           │    │    - Losers get refunds             │
│ settleQuotationEarly│    │                                     │
└─────────┬───────────┘    └─────────────────┬───────────────────┘
          │                                  │
          └──────────────┬───────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. SETTLEMENT                                                   │
│                                                                 │
│    For NEW options:                                             │
│    - Clone option implementation (EIP-1167 proxy)              │
│    - Set buyer and seller addresses                             │
│    - Transfer collateral to option contract                     │
│    - Transfer premium to seller (minus fees)                    │
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

---

## Phase 1: User Creates RFQ

### What You Provide

| Parameter | Description | Example |
|-----------|-------------|---------|
| `underlying` | Asset (ETH or BTC) | `'ETH'` |
| `optionType` | CALL or PUT | `'PUT'` |
| `strike` / `strikes` | Strike price(s) | `1850` or `[1700, 1800, 1900]` |
| `expiry` | Expiry unix timestamp | `1741334400` |
| `numContracts` | Number of contracts | `1.5` |
| `isLong` | BUY (true) or SELL (false) | `true` |
| `collateralToken` | USDC, WETH, or cbBTC | `'USDC'` |
| `offerDeadlineMinutes` | How long MMs can respond | `60` |
| `reservePrice` | Max/min acceptable price per contract (optional) | `0.015` |

### Example: Create a Vanilla PUT RFQ

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

const rfqRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 2000,
  expiry: Math.floor(Date.now() / 1000) + 86400 * 7,  // 7 days
  numContracts: 1.5,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  reservePrice: 0.015,
  requesterPublicKey: keyPair.compressedPublicKey,
});

const { to, data } = client.optionFactory.encodeRequestForQuotation(rfqRequest);
const tx = await signer.sendTransaction({ to, data });
console.log('RFQ created:', tx.hash);
```

### Critical: collateralAmount is ALWAYS 0

`collateralAmount` in the on-chain parameters must always be `0`. Collateral is NOT locked at RFQ creation — it is pulled from the seller at settlement. The `buildRFQParams` helper enforces this automatically.

### For BUY Positions (isLong: true)

- User deposits `reservePrice × numContracts` as escrow (maximum total payment)
- No collateral needed from user (MM provides collateral as the seller)
- Factory holds the deposit until settlement

### For SELL Positions (isLong: false)

- User must **approve** collateral tokens for the OptionFactory before submitting
- Approval amount:
  - **PUT**: `strike × numContracts` (in USDC decimals)
  - **CALL (inverse)**: `numContracts` (in WETH/cbBTC decimals)
  - **Spreads/Butterflies/Condors**: `(upperStrike − lowerStrike) × numContracts` (width × contracts)
- Collateral is pulled at settlement, not at RFQ creation

---

## Phase 2: Market Makers Respond

### How MMs Process an RFQ

1. **Monitor chain**: MMs listen for `QuotationRequested` events
2. **Validate RFQ**: Check implementation, collateral token, strikes, expiry
3. **Fetch prices**: Get bid/ask from exchanges (Deribit, etc.)
4. **Calculate offer**: Apply collateral cost and fees
5. **Sign offer**: Create EIP-712 signature
6. **Encrypt details**: Use ECDH to encrypt for requester only
7. **Submit on-chain**: Call `makeOfferForQuotation()`

### Offer Calculation

Market makers factor in both the market price and the opportunity cost of locking up collateral:

```
Base Price = Exchange bid/ask price

Collateral Cost = collateral_amount × APR × time_to_expiry
  - cbBTC: 1% APR
  - WETH:  4% APR
  - USDC:  7% APR

For SELLING to user (MM is short):
  Total = Base Ask + Collateral Cost

For BUYING from user (MM is long):
  Total = Base Bid − Collateral Cost
```

### What Is Stored On-Chain

During the offer period, **only the signature** is stored on-chain. The actual offer amount is:
- Encrypted with ECDH (only the requester can decrypt)
- Not stored on-chain (privacy)
- Revealed in Phase 3

### MM-Side SDK Calls

Three SDK methods cover the MM side of the offer flow. All require a signer.

```typescript
// 1. Submit an encrypted offer during the offer period.
//    The SDK does the EIP-712 signing and ECDH encryption for you.
await client.optionFactory.makeOfferForQuotation({
  quotationId,
  offerAmount: ethers.parseUnits('25', 6),  // raw bid in token units
  requesterPublicKey,                        // pulled from QuotationRequested event
  // Optional: pass a pre-generated nonce. SDK auto-generates one if omitted.
});

// 2. Cancel an outstanding offer before the reveal period ends.
//    Refunds any deposit the MM posted.
await client.optionFactory.cancelOfferForQuotation(quotationId);

// 3. Reveal the offer once the offer period closes.
//    Must match the signature submitted in step 1.
await client.optionFactory.revealOffer({
  quotationId,
  offerAmount,   // same value as in makeOfferForQuotation
  nonce,         // same nonce
});
```

The reveal pairs with the keypair flow described in [Key Management](key-management.md). MMs that miss the reveal window forfeit any chance of winning the RFQ even if they had the best offer.

---

## Phase 3: Reveal Phase

After `offerEndTimestamp`, market makers call `revealOffer()` with their actual amounts. The factory validates each reveal against the stored signature and selects the best offer:

```
For BUY RFQs (user buying):
  - First offer: always accepted as current best
  - Subsequent offers: must be LOWER than current best
  - Winner: lowest offer (cheapest for buyer)

For SELL RFQs (user selling):
  - First offer: always accepted as current best
  - Subsequent offers: must be HIGHER than current best
  - Winner: highest offer (most valuable for seller)
```

Losing offers get their deposits refunded during this phase.

---

## Settlement Paths: Early vs Normal

### Early Settlement

The requester decrypts an offer and accepts it immediately, before the offer period ends.

```
Timeline:
├── RFQ Created
├── MM submits encrypted offer
├── Requester decrypts offer (using ECDH private key)
├── Requester calls settleQuotationEarly()    ← BEFORE offer period ends
└── Option created immediately
```

**When to use:** You see a good offer and want to lock it in before the deadline.

**Who can call:** Only the requester (permissioned).

```typescript
// Decrypt an MM's offer and settle early
const quotationId = 784n;
const offerEvents = await client.events.getOfferMadeEvents({
  quotationId,
  fromBlock: currentBlock - 1000,
});

const offer = offerEvents[0];
const keyPair = await client.rfqKeys.loadKeyPair();
const decrypted = await client.rfqKeys.decryptOffer(
  offer.signedOfferForRequester,
  offer.signingKey,
);

console.log('Offer amount:', ethers.formatUnits(decrypted.offerAmount, 6), 'USDC');

// Accept the offer
const { to, data } = client.optionFactory.encodeSettleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offer.offeror,
);
const tx = await signer.sendTransaction({ to, data });
console.log('Early settlement TX:', tx.hash);
```

See [Early Settlement](early-settlement.md) for a complete code example.

### Normal Settlement

Wait for the reveal period, let MMs reveal their offers, then settle with the best offer.

```
Timeline:
├── RFQ Created
├── MMs submit encrypted offers
├── Offer period ends (offerEndTimestamp)
├── REVEAL PERIOD begins
├── MMs call revealOffer() with actual amounts + nonces
├── Anyone calls settleQuotation()    ← AFTER reveal period
└── Option created with best offer
```

**When to use:** Let all MMs compete; auction determines the best price automatically.

**Who can call:** Anyone — settlement is permissionless after the reveal period.

```typescript
// After reveal period, no decryption needed
const { to, data } = client.optionFactory.encodeSettleQuotation({ quotationId });
const tx = await signer.sendTransaction({ to, data });
await tx.wait();
// — or use the convenience method —
await client.optionFactory.settleQuotation(quotationId);
```

### Why Is Normal Settlement Permissionless?

After the reveal period all offers are public on-chain. The winning offer is deterministic (best price wins), so no special permissions are needed to execute. In practice, **MM bots often settle their own winning RFQs** because they want to lock in the trade immediately.

### Settlement Paths Comparison

| | Early Settlement | Normal Settlement |
|--|-----------------|-------------------|
| When | During offer period | After reveal period ends |
| Who can call | Requester only | Anyone (permissionless) |
| Who decrypts | User (via ECDH) | MM reveals on-chain |
| Speed | Immediate | Must wait for deadlines |
| Competition | Accept one specific offer | Best offer from all MMs wins |

---

## Phase 4: Settlement — New Option Creation

When `existingOptionAddress == address(0)` (creating a new option):

1. **Clone contract**: Factory deploys option using EIP-1167 minimal proxy
2. **Initialize**: Set buyer, seller, strikes, expiry, collateral token
3. **Transfer collateral**: Pull from seller, deposit into option contract
4. **Pay premium**: Transfer premium from buyer to seller, minus protocol fees
5. **Return excess**: Refund any unused escrow deposit to requester

### Existing Option Transfer

When `existingOptionAddress != address(0)` (closing/transferring an existing position):

1. **Validate state**: Option not yet settled, parameters match exactly
2. **Transfer ownership**: Change buyer/seller addresses
3. **Handle collateral**: Return or re-lock collateral as applicable
4. **Exchange premium**: Transfer between parties

### Fee Structure

```
Fee = min(collateral_fee, max_fee)

Where:
  collateral_fee = numContracts × 6 × price / 1e8 / 10000   (0.06%)
  max_fee        = premium × 125 / 1000                      (12.5% of premium)

Distribution:
  With referral:    50% to referrer, 50% to protocol
  Without referral: 100% to protocol
```

---

## Collateral Handling

### Key Principle: SELLER Always Provides Collateral

| RFQ Type | Who Is Seller | Who Provides Collateral |
|----------|---------------|------------------------|
| BUY (`isLong: true`) | Market Maker | Market Maker |
| SELL (`isLong: false`) | User/Requester | User/Requester |

### Where Collateral Lives

1. **Before settlement**: In the seller's wallet (approved for OptionFactory)
2. **At settlement**: OptionFactory pulls it and transfers to the Option Contract
3. **During option life**: Locked in the Option Contract (not OptionFactory)
4. **At expiry**: Option Contract distributes based on settlement price

### Collateral Lifecycle

| Stage | Action | Where Funds Are |
|-------|--------|-----------------|
| Pre-RFQ | Seller approves OptionFactory | In seller's wallet |
| Settlement | OptionFactory pulls collateral | Transferred to Option Contract |
| Option active | Collateral locked | In Option Contract |
| At expiry | Settlement triggered | Option Contract calculates payout |
| Payout | Distribution | Sent to buyer/seller based on outcome |

### Payout Distribution at Expiry

| Scenario | Buyer Receives | Seller Receives |
|----------|----------------|-----------------|
| Expires OTM (worthless) | 0 | Full collateral returned |
| Expires ITM (partially) | Intrinsic value | Collateral minus payout |
| Maximally exercised | Full collateral | 0 |

### Fund Flow Diagram

```
AT SETTLEMENT:

  Seller ─── Collateral ───> OptionFactory ─── Collateral ───> Option Contract
                                   │
  Buyer ──── Premium ────>         │
                                   └──── Premium − Fees ────> Seller

AT EXPIRY:

  If ITM:
       Option Contract ─── Payout ────> Buyer
       Option Contract ─── Remaining ─> Seller

  If OTM:
       Option Contract ─── Full Collateral ────> Seller
```

### Collateral Amount by Option Type

| Option Type | Collateral Formula | Example |
|-------------|-------------------|---------|
| CALL (inverse) | `numContracts` (WETH/cbBTC) | 1 WETH per contract |
| PUT | `strike × numContracts / 10^8` | $1850 × 1 = 1850 USDC |
| Spread | `(upper − lower) × numContracts` | ($2000 − $1800) × 1 = 200 USDC |
| Butterfly | `(middle − lower) × numContracts` | ($1900 − $1800) × 1 = 100 USDC |
| Condor | `(strike2 − strike1) × numContracts` | ($1700 − $1600) × 1 = 100 USDC |

---

## Sealed-Bid Auction Mechanism

### Why Sealed Bids?

Traditional auctions suffer from:
- **Front-running**: Bots see bids and outbid by the minimum increment
- **Sniping**: Waiting until the last second to bid
- **Collusion**: MMs can coordinate if they see each other's prices

Sealed-bid auction prevents all three:
- Offers are encrypted until the reveal phase
- Only the requester can decrypt (ECDH)
- No MM knows competitors' bids during the offer period

### ECDH Encryption Flow

```
1. Requester generates keypair:
   - private key (kept secret, stored in .thetanuts-keys/)
   - public key (shared in RFQ on-chain)

2. MM generates ephemeral keypair per offer:
   - mm_private_key (kept secret)
   - mm_public_key (shared with offer)

3. Both compute the same shared secret:
   Requester: shared = ECDH(requester_private, mm_public)
   MM:        shared = ECDH(mm_private, requester_public)

4. MM encrypts offer:
   encrypted = AES-256-GCM(shared_secret, { nonce, offerAmount })

5. Only requester can decrypt:
   - Has requester_private_key
   - Computes same shared secret
   - Decrypts offer details
```

---

## Sequence of Events

```
    User                OptionFactory           Market Maker         Option Contract
      │                      │                       │                     │
      │  1. Create RFQ       │                       │                     │
      │─────────────────────>│                       │                     │
      │                      │  2. RFQ Event         │                     │
      │                      │──────────────────────>│                     │
      │                      │  3. Encrypted Offer   │                     │
      │                      │<──────────────────────│                     │
      │  4a. Early Settle    │                       │                     │
      │─────────────────────>│                       │                     │
      │         OR           │                       │                     │
      │                      │  4b. Reveal Offer     │                     │
      │                      │<──────────────────────│                     │
      │  4b. Normal Settle   │                       │                     │
      │─────────────────────>│                       │                     │
      │                      │  5. Deploy Option     │                     │
      │                      │────────────────────────────────────────────>│
      │                      │  6. Transfer Collateral                     │
      │                      │────────────────────────────────────────────>│
      │                      │  7. Pay Premium       │                     │
      │                      │──────────────────────>│                     │
      │                      │        ... time passes until expiry ...     │
      │  8. Claim Payout     │                       │                     │
      │───────────────────────────────────────────────────────────────────>│
      │<───────────────────────────────────────────────────────────────────│
```

---

## Summary Table

| Step | Actor | Action | Result |
|------|-------|--------|--------|
| 1 | User | Create RFQ | RFQ published on-chain |
| 2 | MM | See RFQ event | Calculate pricing |
| 3 | MM | Submit encrypted offer | Offer stored (hidden) |
| 4a | User | Early settle (optional) | Accept offer immediately |
| 4b | MM | Reveal offer | Amount becomes visible |
| 4b | User/MM/anyone | Normal settle | Accept best offer |
| 5 | Factory | Deploy option | New contract created |
| 6 | Factory | Transfer collateral | Locked in option |
| 7 | Factory | Transfer premium | Seller receives payment |
| 8 | User/MM | Claim at expiry | Payout distributed |

---

## Timing Constraints

| Action | When |
|--------|------|
| Make offer | Before `offerEndTimestamp` |
| Early settlement | Before `offerEndTimestamp` (requester only) |
| Reveal offer | After `offerEndTimestamp`, before reveal period ends |
| Normal settlement | After reveal period ends (anyone) |
| Cancel RFQ | Any time (requester only) |
| Cancel offer | Before reveal period ends (MM only) |

---

## See Also

- [Create an RFQ](create-rfq.md) — Submitting a BUY or SELL request
- [Early Settlement](early-settlement.md) — Decrypt and accept an offer before the deadline
- [Key Management](key-management.md) — ECDH keypair storage and encryption details
