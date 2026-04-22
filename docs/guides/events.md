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
