# WebSocket

Subscribe to real-time order book and price updates using the `client.ws` module.

## Methods

| Method | Description | Signer |
|--------|-------------|--------|
| `connect(config?)` | Open the WebSocket connection | No |
| `subscribe(options, callback)` | Subscribe to a topic | No |
| `unsubscribe(id)` | Cancel a subscription | No |
| `subscribeOrders(callback)` | Convenience: subscribe to order updates | No |
| `subscribePrices(callback, asset?)` | Convenience: subscribe to price updates | No |
| `onStateChange(callback)` | Listen for connection state changes | No |
| `getState()` | Get current connection state | No |
| `disconnect()` | Close the connection | No |

## Usage

### Monitor Orders and Prices

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

// 1. Open the connection
await client.ws.connect();

// 2. Subscribe to order book updates
const unsubOrders = client.ws.subscribeOrders((update) => {
  console.log(`Order ${update.event}:`, update);
});

// 3. Subscribe to ETH price updates
const unsubPrices = client.ws.subscribePrices((update) => {
  console.log(`ETH price: $${update.price}`);
}, 'ETH');

// 4. Monitor connection state
const unsubState = client.ws.onStateChange((state) => {
  console.log(`WebSocket state: ${state}`);
  // state: 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
});

// 5. Clean up when done
unsubOrders();
unsubPrices();
unsubState();
client.ws.disconnect();
```

### Generic subscribe()

Use `subscribe()` directly when you need more control over the subscription topic.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

await client.ws.connect();

const subscriptionId = client.ws.subscribe({ type: 'orders' }, (update) => {
  console.log('Order update:', update);
});

// Later, cancel using the returned subscription ID
client.ws.unsubscribe(subscriptionId);
```

### Reconnection Behavior

The WebSocket module auto-reconnects by default (up to 10 attempts). You can observe reconnections via `onStateChange`:

```typescript
client.ws.onStateChange((state) => {
  if (state === 'disconnected') {
    console.log('Connection lost — SDK will auto-reconnect...');
  }
  if (state === 'connected') {
    console.log('Reconnected successfully');
  }
});
```

To manually reconnect after complete disconnection:

```typescript
await client.ws.connect();
```

### Checking Connection State

```typescript
const state = client.ws.getState();
// 'connecting' | 'connected' | 'disconnecting' | 'disconnected'

if (state !== 'connected') {
  await client.ws.connect();
}
```

## Configuration

Pass a custom WebSocket URL at client initialization if you need to override the default endpoint:

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  wsUrl: 'wss://your-custom-ws-endpoint',  // Optional override
});
```

## See Also

- [Events](./events.md) — query historical blockchain events when real-time data is not needed
- [Production Checklist](./production-checklist.md) — WebSocket reconnection configuration
- [Error Handling](./error-handling.md) — `WEBSOCKET_ERROR` error code
