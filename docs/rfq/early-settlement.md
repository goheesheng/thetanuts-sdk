# Early Settlement

Accept a market maker's offer before the offer period ends by decrypting it with your ECDH private key and calling `settleQuotationEarly`.

## When to Use Early Settlement

Early settlement lets the requester skip the reveal auction and lock in a specific offer immediately. Use it when:

- You see a good offer and don't want to risk it being outbid or withdrawn
- You need the option contract deployed as quickly as possible
- You are testing or iterating and want deterministic settlement timing

If you want the auction to run its course and let all MMs compete, use normal settlement instead (see [RFQ Lifecycle — Normal Settlement](lifecycle.md#normal-settlement)).

## Settlement Paths Comparison

| | Early Settlement | Normal Settlement |
|--|-----------------|-------------------|
| When | During offer period | After reveal period ends |
| Who can call | Requester only | Anyone (permissionless) |
| Who decrypts | User (ECDH) | MM reveals on-chain |
| Speed | Immediate | Must wait for offer + reveal deadlines |
| Competition | Accept one specific offer | Best offer from all MMs wins |
| Typical caller | Requester | Often MM auto-settle bots |

---

## Full Example: Decrypt and Settle Early

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const quotationId = 784n;  // RFQ ID from requestForQuotation

// ─────────────────────────────────────────────────
// Step 1: Find the MM's offer from on-chain events
// ─────────────────────────────────────────────────
const currentBlock = await provider.getBlockNumber();
const offerEvents = await client.events.getOfferMadeEvents({
  quotationId,
  fromBlock: currentBlock - 1000,
});

if (offerEvents.length === 0) {
  throw new Error('No offers found yet — MMs may not have responded');
}

const offer = offerEvents[0];
console.log('MM address:', offer.offeror);
console.log('MM public key:', offer.signingKey);

// ─────────────────────────────────────────────────
// Step 2: Load the ECDH keypair used when creating the RFQ
//         Must be the same key — not a newly generated one
// ─────────────────────────────────────────────────
const keyPair = await client.rfqKeys.loadKeyPair();
// If you get KeyNotFoundError here, the key was lost or you're on a
// different machine. Create a new RFQ with a fresh key instead.

// ─────────────────────────────────────────────────
// Step 3: Decrypt the offer
// ─────────────────────────────────────────────────
const decrypted = await client.rfqKeys.decryptOffer(
  offer.signedOfferForRequester,  // encrypted blob from OfferMade event
  offer.signingKey                // MM's ephemeral public key
);

console.log('Offer amount:', ethers.formatUnits(decrypted.offerAmount, 6), 'USDC');
console.log('Nonce:', decrypted.nonce.toString());

// ─────────────────────────────────────────────────
// Step 4: Accept the offer (early settle)
// ─────────────────────────────────────────────────
// Option A: encode and send manually
const { to, data } = client.optionFactory.encodeSettleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offer.offeror
);
const tx = await signer.sendTransaction({ to, data });
await tx.wait();
console.log('Early settlement TX:', tx.hash);

// Option B: convenience method (sends the transaction for you)
const receipt = await client.optionFactory.settleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offer.offeror
);
console.log('Early settlement TX:', receipt.hash);
```

---

## Real Example: RFQ 784 — PUT Butterfly Early Settlement

- **Structure:** $1700 / $1800 / $1900 PUT BUTTERFLY
- **Offer deadline:** 04:10:34 UTC
- **MM offer submitted:** 04:05:45 UTC (0.000223 USDC)
- **Early settled:** 04:07:09 UTC (3 minutes before deadline)
- **Settlement TX:** `0x105f75cdfb64a3796100f6d667bc4f7fec3836d2b5aa5c43b66073a1b40964ee`

The requester decrypted the offer, verified the price was acceptable (0.000223 USDC total), and called `settleQuotationEarly` — locking in the trade without waiting for the auction to complete.

---

## What Happens at Settlement

When `settleQuotationEarly` is called:

1. Factory verifies the decrypted `(offerAmount, nonce)` matches the stored MM signature
2. Factory validates the offer is within the requester's `reservePrice`
3. Factory deploys a new option contract (EIP-1167 proxy) or transfers an existing one
4. Collateral is pulled from the seller and deposited into the option contract
5. Premium is transferred to the seller (minus protocol fees)
6. Any unused escrow deposit is returned to the requester

---

## Cancellation

If no offer is acceptable, the requester can cancel the RFQ at any time:

```typescript
// Cancel the whole RFQ (requester only)
await client.optionFactory.cancelQuotation(quotationId);

// A MM can also cancel their own offer
await client.optionFactory.cancelOfferForQuotation(quotationId);
```

---

## Troubleshooting

### "No offers found"

The MM has not responded yet, or you searched too few blocks. Increase the `fromBlock` range or wait longer. Offer events are emitted as `OfferMade`.

### "KeyNotFoundError: RFQ key not found"

Your ECDH private key is not in storage. This happens if:
- You switched to a different machine
- The key directory (`.thetanuts-keys/`) was deleted
- You used `MemoryStorageProvider` and the process restarted

If the key is lost, you cannot decrypt this RFQ's offers. Create a new RFQ with `getOrCreateKeyPair()` and back up the key this time. See [Key Management](key-management.md).

### "DecryptionError: Authentication failed"

The ECDH shared secret is wrong. Verify that the keypair you loaded was the one used when creating the specific RFQ. The requester's public key is stored in the on-chain `QuotationParameters` — compare it with `keyPair.compressedPublicKey`.

```typescript
const quotation = await client.optionFactory.getQuotation(rfqId);
const stored = quotation.requesterPublicKey;
const local = (await client.rfqKeys.loadKeyPair()).compressedPublicKey;
console.log('Match:', stored === local);
```

---

## See Also

- [RFQ Lifecycle](lifecycle.md) — Full four-phase lifecycle including normal settlement
- [Key Management](key-management.md) — How ECDH keys are stored, backed up, and imported
- [Create an RFQ](create-rfq.md) — Submitting a BUY or SELL RFQ
