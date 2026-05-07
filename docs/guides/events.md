# Events

Query historical blockchain events from the Thetanuts protocol using the `client.events` module.

## Methods

| Method | Description | Signer |
|--------|-------------|--------|
| `getOrderFillEvents(filters?)` | OptionBook order fill events | No |
| `getOrderCancelledEvents(filters?)` | OptionBook order cancellation events | No |
| `getOptionCreatedEvents(filters?)` | New option contract creation events | No |
| `getQuotationRequestedEvents(filters?)` | RFQ quotation request events | No |
| `getOfferMadeEvents(filters?)` | RFQ encrypted offer submission events | No |
| `getOfferRevealedEvents(filters?)` | RFQ offer reveal events | No |
| `getQuotationSettledEvents(filters?)` | RFQ quotation settlement events | No |
| `getPositionClosedEvents(option, filters?)` | Position close events for a specific option | No |
| `getExcessCollateralReturnedEvents(option, filters?)` | Excess collateral returned to seller (per option) | No |
| `getOptionSplitEvents(option, filters?)` | Position split events (per option) | No |
| `getTransferApprovalEvents(option, filters?)` | Transfer-approval events (per option) | No |
| `getOptionSettlementFailedEvents(option, filters?)` | Settlement failures (per option) | No |

> **v0.2.1 rename:** `getCollateralReturnedEvents` was renamed to `getExcessCollateralReturnedEvents` and the event field shape changed to match the r12 contract (`{ seller, collateralToken, collateralReturned }`). See the [Migration Guide](../resources/migration-guide.md) for the full diff.

> All event queries auto-chunk block ranges into 10,000-block segments — no manual splitting needed.
>
> When `fromBlock` is omitted, the query searches backward from the latest block (most recent events first).

## Usage

### Filter Common Parameters

Most event methods accept an optional `filters` object:

```typescript
interface EventFilters {
  fromBlock?: number | bigint;  // Start block (default: searches backward from latest)
  toBlock?: number | bigint;    // End block
  quotationId?: bigint;         // Filter by RFQ ID (where applicable)
}
```

### Order Fill Events (OptionBook)

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

const currentBlock = await provider.getBlockNumber();

const fills = await client.events.getOrderFillEvents({
  fromBlock: currentBlock - 5000,
});

for (const fill of fills) {
  console.log('Fill event:', fill);
}
```

### Order Cancellation Events

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const cancellations = await client.events.getOrderCancelledEvents({
  fromBlock: currentBlock - 5000,
});
```

### Option Created Events (RFQ Settlement)

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const created = await client.events.getOptionCreatedEvents({
  fromBlock: currentBlock - 10000,
});

for (const event of created) {
  console.log('New option contract:', event);
}
```

### RFQ Lifecycle Events

Track the full RFQ lifecycle — from request through offer submission, reveal, and final settlement:

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const quotationId = 784n;

// RFQ was created
const requests = await client.events.getQuotationRequestedEvents({
  fromBlock: currentBlock - 50000,
});

// MM submitted encrypted offer
const offers = await client.events.getOfferMadeEvents({ quotationId });

// MM revealed their offer
const reveals = await client.events.getOfferRevealedEvents({ quotationId });

// Quotation was settled
const settlements = await client.events.getQuotationSettledEvents({ quotationId });
```

### Full RFQ History in One Call

`getRfqHistory(quotationId, filters?)` is a convenience that batches the four RFQ-lifecycle event queries (`requested`, `offerMade`, `offerRevealed`, `settled`) for a single quotation and returns them sorted in chronological order. Skips the bookkeeping you'd do manually:

```typescript
const history = await client.events.getRfqHistory(quotationId);
console.log(history.requested);   // single QuotationRequested event
console.log(history.offers);      // OfferMade events
console.log(history.reveals);     // OfferRevealed events
console.log(history.settlement);  // QuotationSettled event (or null if not settled)
```

### queryEvents — generic catch-all

If you need to scan the OptionBook or OptionFactory ABIs for an arbitrary event signature not covered by a typed helper, fall through to `queryEvents`:

```typescript
const events = await client.events.queryEvents({
  contract: 'optionBook',                    // or 'optionFactory'
  eventName: 'SomeUnusualEvent',
  fromBlock: currentBlock - 1000,
});
```

Most users should reach for the typed helpers above. `queryEvents` is the escape hatch for protocol introspection or custom indexers.

### Using OfferMade Events for Early Settlement

The `getOfferMadeEvents()` result includes the encrypted offer data needed for `settleQuotationEarly()`:

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const quotationId = 784n;

// Find the MM's offer
const offerEvents = await client.events.getOfferMadeEvents({
  quotationId,
  fromBlock: currentBlock - 1000,
});

const offer = offerEvents[0];

// Decrypt and accept early
const keyPair = await client.rfqKeys.loadKeyPair();
const decrypted = await client.rfqKeys.decryptOffer(
  offer.signedOfferForRequester,
  offer.signingKey
);

console.log('Offer amount:', ethers.formatUnits(decrypted.offerAmount, 6), 'USDC');

await client.optionFactory.settleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offer.offeror
);
```

### Position Closed Events

Query close events for a specific option contract:

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const optionAddress = '0x20D51d70A51Aa529eb9460a49aAC94910A1bc267';

const closedEvents = await client.events.getPositionClosedEvents(
  optionAddress,
  { fromBlock: currentBlock - 10000 }
);

for (const event of closedEvents) {
  console.log('Position closed:', event);
}
```

## See Also

- [WebSocket](./websocket.md) — real-time updates instead of historical queries
- [Position Management](./position-management.md) — position state queries via contract calls
- [Error Handling](./error-handling.md) — `HTTP_ERROR`, `CONTRACT_REVERT` error codes
