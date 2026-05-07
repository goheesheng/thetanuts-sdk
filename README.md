# @thetanuts-finance/thetanuts-client

TypeScript SDK for Thetanuts Finance V4 - Options trading on EVM chains.

> **Full documentation:** [docs.thetanuts.finance/sdk](https://docs.thetanuts.finance/sdk)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Key Concepts](#key-concepts)
- [With Signer (for transactions)](#with-signer-for-transactions)
- [Referrer (Fee Sharing)](#referrer-fee-sharing)
- [Modules](#modules)
- [Supported Chains](#supported-chains)
- [Configuration Options](#configuration-options)
- [RFQ Key Management](#rfq-key-management)
- [Examples](#examples)
- [Common Workflows](#common-workflows)
- [Error Handling](#error-handling)
- [Production Checklist](#production-checklist)
- [Compatibility](#compatibility)
- [Custom Logger](#custom-logger)
- [Directory Structure](#directory-structure)
- [Development](#development)
- [Documentation](#documentation)
- [API Reference](#api-reference)
- [License](#license)
- [Links](#links)

## Features

- **Complete Options Trading**: Fill orders, manage positions, handle RFQs
- **Settlement Types**: Cash-settled and physically settled options
- **Multi-Strategy Support**: Spreads, butterflies, condors, iron condors (cash-settled)
- **Real-time Data**: WebSocket subscriptions for live updates
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modular Design**: Use only what you need
- **ESM and CJS builds**: Maximum compatibility

### OptionBook vs RFQ (Factory)

The SDK supports two trading systems. Choose based on your use case:

| | **OptionBook** | **RFQ (Factory)** |
|---|---|---|
| **What** | Fill existing market-maker orders | Create custom options via sealed-bid auction |
| **When to use** | Quick trades on listed options (vanilla and multi-leg) | Custom options via sealed-bid auction: any strike, any expiry, cash-settled or physically settled |
| **Structures** | Vanilla, spread, butterfly, condor, iron condor (cash-settled) | Vanilla, spread, butterfly, condor, iron condor (cash-settled or physically settled for vanilla) |
| **Key methods** | `fillOrder()`, `previewFillOrder()` | `buildRFQRequest()`, `requestForQuotation()` |
| **Pricing** | Order prices from `fetchOrders()` | MM pricing from `getAllPricing()` |
| **Data source** | Book indexer (`/api/v1/book/`) | Factory indexer (`/api/v1/factory/`) |
| **User data** | `getUserPositionsFromIndexer()` | `getUserRfqs()`, `getUserOptionsFromRfq()` |
| **Stats** | `getBookProtocolStats()`, `getBookDailyStats()` | `getFactoryProtocolStats()`, `getFactoryDailyStats()` |
| **Collateral** | Paid upfront by taker | `collateralAmount = 0` (held by factory) |
| **Settlement** | Cash-settled (payout in USDC/WETH/cbBTC based on price difference at expiry) | Cash-settled by default; physically settled optional via `buildPhysicalOptionRFQ()` |

## Installation

Using npm:
```bash
npm install @thetanuts-finance/thetanuts-client
```

Using yarn:
```bash
yarn add @thetanuts-finance/thetanuts-client
```

## Quick Start

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

// Initialize with provider (read-only — no signer needed for any of this)
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({
  chainId: 8453, // Base mainnet
  provider,
});

// 1. Fetch available orders from the book
const orders = await client.api.fetchOrders();
console.log(`Found ${orders.length} orders`);

// 2. Get market data
const marketData = await client.api.getMarketData();
console.log(`BTC: $${marketData.prices.BTC}`);
console.log(`ETH: $${marketData.prices.ETH}`);

// 3. Preview what a fill would actually cost (no transaction, no signer)
//    For PUTs and spreads, contract count is NOT the same as premium —
//    previewFillOrder runs the same collateral math the contract uses.
if (orders.length > 0) {
  const preview = client.optionBook.previewFillOrder(orders[0], 10_000000n); // 10 USDC
  console.log(`Contracts: ${preview.numContracts}`);
  console.log(`Collateral: ${preview.collateralToken}`);
  console.log(`Price per contract: ${preview.pricePerContract}`);
}

// 4. Get MM pricing for custom RFQ options
const pricing = await client.mmPricing.getAllPricing('ETH');
const active = client.mmPricing.filterExpired(Object.values(pricing));
console.log(`${active.length} active ETH options available for RFQ`);
```

**Next step:** to actually execute a fill you need a signer. Jump to [OptionBook: Browse and Fill an Order](#optionbook-browse-and-fill-an-order), or to create a custom option jump to [RFQ: Create a Custom Option](#rfq-create-a-custom-option).

## Key Concepts

### Chain Configuration

Access all contract addresses and token configs from the client -- no hardcoding required:

```typescript
const config = client.chainConfig;

// Tokens
config.tokens.USDC.address;  // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
config.tokens.USDC.decimals; // 6
config.tokens.WETH.address;  // 0x4200000000000000000000000000000000000006
config.tokens.cbBTC.address; // 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf

// Cash-settled implementations (OptionBook)
config.implementations.PUT;            // Vanilla PUT
config.implementations.INVERSE_CALL;   // Vanilla CALL
config.implementations.PUT_SPREAD;     // Put spread (2 strikes)
config.implementations.CALL_SPREAD;    // Call spread (2 strikes)
config.implementations.PUT_FLY;        // Put butterfly (3 strikes)
config.implementations.CALL_FLY;       // Call butterfly (3 strikes)
config.implementations.PUT_CONDOR;     // Put condor (4 strikes)
config.implementations.CALL_CONDOR;    // Call condor (4 strikes)
config.implementations.IRON_CONDOR;    // Iron condor (4 strikes)

// Physically settled implementations (RFQ/Factory)
config.implementations.PHYSICAL_PUT;          // Vanilla physical PUT
config.implementations.PHYSICAL_CALL;         // Vanilla physical CALL

// Price feeds
config.priceFeeds.ETH;  // Chainlink ETH/USD feed
config.priceFeeds.BTC;  // Chainlink BTC/USD feed
```

### Decimal Handling

The SDK provides utilities for safe decimal conversions:

| Type | Decimals | Example |
|------|----------|---------|
| USDC | 6 | `1000000` = 1 USDC |
| WETH | 18 | `1000000000000000000` = 1 WETH |
| cbBTC | 8 | `100000000` = 1 cbBTC |
| Strike/Price | 8 | `185000000000` = $1850 |

```typescript
// Convert to on-chain values
const usdc = client.utils.toBigInt('100.5', 6);   // 100500000n
const strike = client.utils.strikeToChain(1850);  // 185000000000n

// Convert from on-chain values
const display = client.utils.fromBigInt(100500000n, 6);  // '100.5'
const price = client.utils.strikeFromChain(185000000000n); // 1850
```

### RFQ: collateralAmount is ALWAYS 0

When creating RFQs, the `collateralAmount` parameter must **always be 0**:

```typescript
// ✅ CORRECT - collateralAmount is always 0
const params = client.optionFactory.buildRFQParams({
  // ... other params
});
// buildRFQParams automatically sets collateralAmount = 0

// ❌ WRONG - never set collateralAmount manually
collateralAmount: BigInt(1000000)  // This will cause issues!
```

**Why?** Collateral is NOT locked at RFQ creation. It's pulled at settlement time from both parties. The `buildRFQParams` helper enforces this pattern automatically.

For **SELL positions**, you must separately approve tokens for the OptionFactory contract before creating the RFQ. See the [RFQ Workflow Guide](docs/RFQ_WORKFLOW.md) for complete details.

## With Signer (for transactions)

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

// Initialize with signer for write operations
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer,
  referrer: '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567', // Optional: referrer for fee sharing
});

// Approve collateral token spending
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
await client.erc20.ensureAllowance(
  usdcAddress,
  client.chainConfig.contracts.optionBook,
  1000000000n // 1000 USDC
);

// Fill an order (pass full OrderWithSignature)
const order = orders[0];
const result = await client.optionBook.fillOrder(order);
console.log(`Trade executed: ${result.hash}`);
```

## Referrer (Fee Sharing)

The SDK supports a **referrer address** for fee sharing on order fills. When a referrer is set, a portion of the trading fees is allocated to the referrer.

```typescript
// Option 1: Set referrer at client initialization (applies to all fills)
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer,
  referrer: '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567',
});

// All fillOrder calls will use this referrer automatically
await client.optionBook.fillOrder(order);

// Option 2: Pass referrer per fill call (overrides client default)
await client.optionBook.fillOrder(order, undefined, '0xYourReferrerAddress');

// Option 3: Use encode methods (for viem/wagmi/AA wallets)
const { to, data } = client.optionBook.encodeFillOrder(
  order,
  collateralAmount,
  '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567'
);
const hash = await walletClient.sendTransaction({ to, data });

// Query referrer fee split
const feeBps = await client.optionBook.getReferrerFeeSplit('0x...');
console.log(`Referrer fee: ${feeBps} bps`);

// Query accumulated fees for a single token
const fees = await client.optionBook.getFees(usdcAddress, '0x...');
console.log(`Accumulated fees: ${fees}`);

// Check all claimable fees across every collateral token at once
const claimable = await client.optionBook.getAllClaimableFees('0x...');
for (const fee of claimable) {
  console.log(`${fee.symbol}: ${ethers.formatUnits(fee.amount, fee.decimals)}`);
}

// Claim all non-zero fee balances in one call
const results = await client.optionBook.claimAllFees();
for (const r of results) {
  if (r.receipt) console.log(`Claimed ${r.symbol}: tx ${r.receipt.hash}`);
}
```

If no referrer is provided, the zero address (`0x000...`) is used (no fee sharing).

## Modules

| Module | Purpose | Requires Signer |
|--------|---------|-----------------|
| `client.erc20` | Token approvals, balances, transfers | Write ops only |
| `client.optionBook` | Fill/cancel orders, get fees, claim fees | Write ops only |
| `client.api` | Fetch orders, positions, stats | No |
| `client.optionFactory` | RFQ lifecycle management | Write ops only |
| `client.option` | Position management, payouts | Write ops only |
| `client.ranger` | RangerOption (zone-bound, 4-strike) position management | Write ops only |
| `client.events` | Query blockchain events | No |
| `client.ws` | Real-time subscriptions | No |
| `client.mmPricing` | Market maker pricing, Greeks | No |
| `client.rfqKeys` | ECDH key management, offer encryption | No |
| `client.utils` | Decimal conversions, payoffs | No |
| `client.loan` | Non-liquidatable lending | Write ops only |
| `client.wheelVault` | WheelVault (Ethereum mainnet) interactions | Write ops only |
| `client.strategyVault` | StrategyVault (Base) interactions | Write ops only |

See [src/modules/README.md](src/modules/README.md) for detailed module documentation (14 modules total).

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base Mainnet | 8453 | Supported |

## Configuration Options

```typescript
interface ThetanutsClientConfig {
  chainId: 8453;                    // Required: Chain ID
  provider: Provider;               // Required: ethers.js provider
  signer?: Signer;                  // Optional: For transactions
  referrer?: string;                // Optional: Referrer address for fees
  apiBaseUrl?: string;              // Optional: Override API URL
  indexerApiUrl?: string;           // Optional: Override indexer URL
  pricingApiUrl?: string;           // Optional: Override pricing URL
  wsUrl?: string;                   // Optional: Override WebSocket URL
  env?: 'dev' | 'prod';             // Optional: Environment (default: prod)
  logger?: ThetanutsLogger;         // Optional: Custom logger
}
```

## RFQ Key Management

The SDK uses ECDH (Elliptic Curve Diffie-Hellman) key pairs for encrypted offers in the RFQ system. Keys are automatically persisted based on your environment:

| Environment | Default Storage | Persistence |
|-------------|-----------------|-------------|
| **Node.js** | `FileStorageProvider` | Keys saved to `.thetanuts-keys/` directory |
| **Browser** | `LocalStorageProvider` | Keys saved to localStorage |

### Automatic Key Management

```typescript
// Keys are automatically persisted - no configuration needed
const keyPair = await client.rfqKeys.getOrCreateKeyPair();
console.log('Public Key:', keyPair.compressedPublicKey);
// Keys are saved automatically and survive process restarts
```

### Custom Storage Location (Node.js)

```typescript
import { ThetanutsClient, FileStorageProvider } from '@thetanuts-finance/thetanuts-client';

// Custom storage directory
const customStorage = new FileStorageProvider('./my-keys');
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: customStorage,
});
```

### Key Backup Warning

> **IMPORTANT**: Back up your RFQ private keys! Keys are stored in `.thetanuts-keys/` with secure permissions (0o600). If lost, you **cannot** decrypt offers made to your public key. There is no recovery mechanism.

### Memory Storage (Testing Only)

```typescript
import { ThetanutsClient, MemoryStorageProvider } from '@thetanuts-finance/thetanuts-client';

// ⚠️ WARNING: Keys are LOST when process exits!
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: new MemoryStorageProvider(),
});
```

The SDK logs a warning when using `MemoryStorageProvider` since keys won't persist.

## Examples

### Check Token Balance

```typescript
const balance = await client.erc20.getBalance(usdcAddress, userAddress);
console.log(`Balance: ${ethers.formatUnits(balance, 6)} USDC`);
```

### Get Protocol Stats

```typescript
// Lightweight legacy stats: totals only
const stats = await client.api.getStatsFromIndexer();
console.log(`Unique Users: ${stats.uniqueUsers}`);
console.log(`Open Positions: ${stats.openPositions}`);
console.log(`Total Options Tracked: ${stats.totalOptionsTracked}`);

// Richer protocol stats with time windows and per-implementation breakdowns:
//   client.api.getBookProtocolStats()     // OptionBook side
//   client.api.getFactoryProtocolStats()  // RFQ/Factory side
//   client.api.getProtocolStats()         // Combined
```

### Subscribe to Real-time Updates

```typescript
await client.ws.connect();

client.ws.subscribe({ type: 'orders' }, (update) => {
  console.log('Order update:', update);
});

client.ws.subscribe({ type: 'prices' }, (update) => {
  console.log('Price update:', update);
});
```

### Calculate Option Payoff

```typescript
const payoff = client.utils.calculatePayout({
  structure: 'call_spread',
  strikes: [100000n, 105000n],
  size: 1000000n,
  price: 102000n,
  isLong: true,
});
console.log(`Payoff: ${payoff}`);
```

## Common Workflows

### OptionBook: Browse and Fill an Order

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer,
  referrer: '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567',
});

// 1. Fetch available orders
const orders = await client.api.fetchOrders();
const order = orders.find((o) => o.order.expiry > BigInt(Math.floor(Date.now() / 1000)));

if (!order) throw new Error('No active orders found');

// 2. Preview the fill (dry-run, no transaction)
const preview = client.optionBook.previewFillOrder(order, 10_000000n); // 10 USDC
console.log(`Contracts: ${preview.numContracts}, Collateral: ${preview.collateralToken}`);

// 3. Approve collateral spending
const usdcAddress = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
await client.erc20.ensureAllowance(
  usdcAddress,
  client.chainConfig.contracts.optionBook,
  10_000000n,
);

// 4. Fill the order
const receipt = await client.optionBook.fillOrder(order, 10_000000n);
console.log(`Trade executed: ${receipt.hash}`);
```

### RFQ: Create a Custom Option

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);

const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const userAddress = await signer.getAddress();

// 1. Build RFQ params using helper (enforces collateralAmount = 0)
const rfqRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',           // 'ETH' | 'BTC'
  optionType: 'PUT',           // 'CALL' | 'PUT'
  strike: 2000,                // Human-readable
  expiry: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  numContracts: 1.5,           // Human-readable
  isLong: true,                // true = BUY, false = SELL
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  reservePrice: 0.015,         // Optional: max price per contract
  requesterPublicKey: '0xYourECDHPublicKey',
});

// 2. Encode and send transaction
const { to, data } = client.optionFactory.encodeRequestForQuotation(rfqRequest);
const tx = await signer.sendTransaction({ to, data });
console.log(`RFQ created: ${tx.hash}`);

// For SELL positions, approve tokens BEFORE creating RFQ:
// const strike = 2000;
// const numContracts = 1.5;
// const approval = BigInt(Math.round(strike * numContracts * 1e6)); // PUT: strike * contracts
// await client.erc20.approve(USDC, client.optionFactory.contractAddress, approval);
```

See [RFQ Workflow Guide](docs/RFQ_WORKFLOW.md) for the complete RFQ lifecycle including MM offers, reveal phase, and settlement.

### RFQ: Create a Butterfly

```typescript
// Butterfly uses 3 strikes: lower, middle, upper
// Structure: +1 PUT @lower, -2 PUT @middle, +1 PUT @upper
const butterflyRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1700, 1800, 1900],  // 3 strikes = BUTTERFLY
  expiry,
  numContracts: 0.001,
  isLong: false,                // SELL (short) butterfly
  offerDeadlineMinutes: 6,
  collateralToken: 'USDC',
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Collateral for butterfly = (middleStrike - lowerStrike) × numContracts
// $100 wing width × 0.001 contracts = 0.1 USDC
await client.erc20.ensureAllowance(USDC, factoryAddress, 100000n); // 0.1 USDC

const receipt = await client.optionFactory.requestForQuotation(butterflyRequest);
```

### RFQ: Early Settlement (Accept MM Offer Before Deadline)

```typescript
// After MM submits an encrypted offer, decrypt and accept it early
const quotationId = 784n;

// 1. Find the MM's offer from events
const offerEvents = await client.events.getOfferMadeEvents({
  quotationId,
  fromBlock: currentBlock - 1000,
});

const offer = offerEvents[0];

// 2. Decrypt the offer using your ECDH keypair
const keyPair = await client.rfqKeys.loadKeyPair();
const decrypted = await client.rfqKeys.decryptOffer(
  offer.signedOfferForRequester,
  offer.signingKey
);

console.log('Offer Amount:', ethers.formatUnits(decrypted.offerAmount, 6), 'USDC');

// 3. Accept the offer (settle early)
const { to, data } = client.optionFactory.encodeSettleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offer.offeror
);

const tx = await signer.sendTransaction({ to, data });
console.log('Early settlement TX:', tx.hash);
```

**Real example (RFQ 784 - PUT BUTTERFLY):**
- Structure: $1700 / $1800 / $1900 PUT BUTTERFLY
- Offer Deadline: 04:10:34 UTC
- MM Offer: 0.000223 USDC at 04:05:45 UTC
- Early Settle: 04:07:09 UTC (3 min before deadline)
- TX: `0x105f75cdfb64a3796100f6d667bc4f7fec3836d2b5aa5c43b66073a1b40964ee`

### RFQ: Create a Condor

```typescript
// Condor uses 4 strikes
// Structure: +1 PUT @strike1, -1 PUT @strike2, -1 PUT @strike3, +1 PUT @strike4
const condorRequest = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1600, 1700, 1800, 1900],  // 4 strikes = CONDOR
  expiry,
  numContracts: 0.001,
  isLong: false,                       // SELL (short) condor
  offerDeadlineMinutes: 6,
  collateralToken: 'USDC',
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Collateral for condor = (strike2 - strike1) × numContracts
// $100 wing width × 0.001 contracts = 0.1 USDC
await client.erc20.ensureAllowance(USDC, factoryAddress, 100000n); // 0.1 USDC

const receipt = await client.optionFactory.requestForQuotation(condorRequest);
```

**Real example (RFQ 785 - PUT CONDOR):**
- Structure: $1600 / $1700 / $1800 / $1900 PUT CONDOR
- MM Offer: 0.003248 USDC
- Early Settle: 04:15:00 UTC (4 min before deadline)
- TX: `0xa89fb6dbad43b430399bbdec878927185e602b7df9b5390f71d2d11c33e4d850`
- Option: `0x20D51d70A51Aa529eb9460a49aAC94910A1bc267`

### All Option Structures Summary

| Structure | Strikes | Implementation | Strike Order |
|-----------|---------|----------------|--------------|
| Vanilla | 1 | PUT / INVERSE_CALL | N/A |
| Spread | 2 | PUT_SPREAD / CALL_SPREAD | PUT: desc, CALL: asc |
| Butterfly | 3 | PUT_FLY / CALL_FLY | PUT: desc, CALL: asc |
| Condor | 4 | PUT_CONDOR / CALL_CONDOR | Always ascending |

### Both: Monitor Positions with WebSocket

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

// 1. Connect
await client.ws.connect();

// 2. Subscribe to order updates
const unsubOrders = client.ws.subscribeOrders((update) => {
  console.log(`Order ${update.event}:`, update);
});

// 3. Subscribe to price updates for ETH
const unsubPrices = client.ws.subscribePrices((update) => {
  console.log(`ETH price: $${update.price}`);
}, 'ETH');

// 4. Handle connection state changes
const unsubState = client.ws.onStateChange((state) => {
  console.log(`WebSocket state: ${state}`);
});

// 5. Disconnect when done
// unsubOrders();
// unsubPrices();
// unsubState();
// client.ws.disconnect();
```

## Understanding Collateral vs Contracts

When viewing orders, `availableAmount` represents the **maker's collateral budget**, not the number of contracts. The actual number of purchasable contracts depends on the option type and collateral requirements.

### Collateral Formulas by Option Type

| Option Type | # Strikes | Formula | Example |
|-------------|-----------|---------|---------|
| **Vanilla PUT** | 1 | `(collateral × 1e8) / strike` | 10,000 USDC at $95k strike = 0.105 contracts |
| **Inverse CALL** | 1 | `collateral / 1e12` | 1 WETH = 1 contract |
| **SPREAD** | 2 | `(collateral × 1e8) / spreadWidth` | 10,000 USDC / $10k spread = 1 contract |
| **BUTTERFLY** | 3 | `(collateral × 1e8) / maxSpread` | Based on widest strike range |
| **CONDOR** | 4 | `(collateral × 1e8) / maxSpread` | Based on widest strike range |

### Using previewFillOrder

Always use `previewFillOrder()` to see the actual contract count before filling:

```typescript
const order = orders[0];

// Preview shows calculated max contracts based on collateral requirements
const preview = client.optionBook.previewFillOrder(order);
console.log(`Max contracts: ${preview.maxContracts}`);
console.log(`Collateral token: ${preview.collateralToken}`);
console.log(`Price per contract: ${preview.pricePerContract}`);

// Preview with specific premium amount
const preview10 = client.optionBook.previewFillOrder(order, 10_000000n); // 10 USDC premium
console.log(`Contracts for 10 USDC: ${preview10.numContracts}`);
```

### Why This Matters

For a PUT option with a $95,000 strike:
- **Maker provides**: 10,000 USDC collateral
- **Max contracts**: 10,000 / 95,000 ≈ **0.105 contracts** (not 10,000!)

The `previewFillOrder()` method handles these calculations automatically for all option types.

## Error Handling

All SDK methods throw `ThetanutsError` with typed error codes:

```typescript
import { isThetanutsError } from '@thetanuts-finance/thetanuts-client';

try {
  await client.optionBook.fillOrder(orderWithSig);
} catch (error) {
  if (isThetanutsError(error)) {
    switch (error.code) {
      case 'ORDER_EXPIRED':
        console.log('Order has expired');
        break;
      case 'SLIPPAGE_EXCEEDED':
        console.log('Price moved too much');
        break;
      case 'INSUFFICIENT_ALLOWANCE':
        console.log('Need to approve tokens first');
        break;
      case 'SIGNER_REQUIRED':
        console.log('Signer required for this operation');
        break;
    }
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `ORDER_EXPIRED` | Order has expired or will expire soon |
| `SLIPPAGE_EXCEEDED` | Price moved beyond tolerance |
| `INSUFFICIENT_ALLOWANCE` | Token approval needed |
| `INSUFFICIENT_BALANCE` | Not enough tokens |
| `NETWORK_UNSUPPORTED` | Network not supported |
| `HTTP_ERROR` | API request failed |
| `CONTRACT_REVERT` | Smart contract call failed |
| `INVALID_PARAMS` | Invalid parameters provided |
| `ORDER_NOT_FOUND` | Order not found |
| `SIZE_EXCEEDED` | Fill size exceeds available |
| `SIGNER_REQUIRED` | Signer needed for transaction |
| `WEBSOCKET_ERROR` | WebSocket connection error |

### Using `instanceof` for Typed Error Handling

The SDK exports typed error classes for precise error handling:

```typescript
import {
  ThetanutsError,
  RateLimitError,
  ContractRevertError,
  InsufficientAllowanceError,
  OrderExpiredError,
} from '@thetanuts-finance/thetanuts-client';

try {
  await client.optionBook.fillOrder(order, 10_000000n);
} catch (error) {
  if (error instanceof OrderExpiredError) {
    console.log('Order expired, fetching fresh orders...');
    const freshOrders = await client.api.fetchOrders();
    // retry with a fresh order
  } else if (error instanceof InsufficientAllowanceError) {
    console.log('Approving tokens first...');
    await client.erc20.ensureAllowance(usdcAddress, optionBookAddress, amount);
    // retry the fill
  } else if (error instanceof ContractRevertError) {
    console.log('Contract reverted:', error.message);
    console.log('Cause:', error.cause);
  } else if (error instanceof ThetanutsError) {
    console.log(`SDK error [${error.code}]: ${error.message}`);
  }
}
```

### Retry Pattern for Transient Errors

```typescript
import { RateLimitError, ThetanutsError } from '@thetanuts-finance/thetanuts-client';

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError) {
        const delay = Math.pow(2, attempt) * 1000; // exponential backoff
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error; // non-retryable error
    }
  }
  throw new Error('Max retries exceeded');
}

const orders = await withRetry(() => client.api.fetchOrders());
```

## Production Checklist

Before deploying to production, verify the following:

- **RPC Provider**: Use a reliable RPC provider instead of the public `https://mainnet.base.org` endpoint. Public endpoints have strict rate limits and may be unreliable under load.

  ```typescript
  // ❌ Not recommended for production
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');

  // ✅ Recommended: Use your own RPC provider
  const provider = new ethers.JsonRpcProvider('https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY');
  // Or: https://base-mainnet.infura.io/v3/YOUR_PROJECT_ID
  // Or: https://base.quiknode.pro/YOUR_ENDPOINT
  ```
- **Referrer Configuration**: Set the `referrer` address in the client config to earn fee-sharing revenue on order fills.
- **Error Logging**: Pass a custom `logger` to the client to capture errors in your monitoring system (Sentry, Datadog, etc.).
- **Gas Buffer**: The SDK adds a 20% gas buffer for Account Abstraction wallets (Coinbase Smart Wallet, Safe). If you use a standard EOA wallet, this buffer still applies for safety.
- **Collateral Approval Flow**: Always call `client.erc20.ensureAllowance()` before `fillOrder()`. The SDK does not auto-approve.
- **WebSocket Reconnection**: The WebSocket module auto-reconnects by default (up to 10 attempts). Configure `maxReconnectAttempts` and `reconnectInterval` for your use case.
- **Order Expiry Checks**: Always check `order.expiry` before filling. The SDK throws `OrderExpiredError` but checking upfront avoids wasted gas estimates.

## Compatibility

| Requirement | Minimum Version |
|-------------|----------------|
| Node.js | >= 18 |
| ethers.js | v6 |
| TypeScript | >= 5.0 |

### Supported Chains

| Chain | Chain ID | Network |
|-------|----------|---------|
| Base Mainnet | 8453 | Base |

### Build Formats

The SDK ships as both ESM and CJS with TypeScript declarations (`.d.ts`), built with [tsup](https://tsup.egoist.dev/).

## Custom Logger

Pass a custom logger for debugging:

```typescript
import { ThetanutsClient, consoleLogger } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  logger: consoleLogger, // Use built-in console logger
});

// Or use your own logger
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  logger: {
    debug: (msg, meta) => myLogger.debug(msg, meta),
    info: (msg, meta) => myLogger.info(msg, meta),
    warn: (msg, meta) => myLogger.warn(msg, meta),
    error: (msg, meta) => myLogger.error(msg, meta),
  },
});
```

## Directory Structure

```
src/
├── abis/       # Smart contract ABIs (ERC20, OptionBook, OptionFactory, BaseOption)
├── chains/     # Chain configurations
├── client/     # Main client class
├── modules/    # Feature modules (11 modules)
├── types/      # TypeScript definitions (16 type files)
├── utils/      # Utility functions
└── index.ts    # Main entry point

scripts/
├── run-mainnet-tests.ts       # Live mainnet integration tests
├── benchmark-indexer.ts       # Indexer performance benchmark
└── test-indexer-endpoints.ts  # Indexer endpoint validation
```

See [src/README.md](src/README.md) for detailed source documentation.

## Development

```bash
# Install dependencies
npm install
# or
yarn install

# Build
npm run build
# or
yarn build

# Run mainnet integration tests (requires network access)
npm test
# or
yarn test

# Run indexer benchmark
npm run test:benchmark
# or
yarn test:benchmark

# Lint
npm run lint
# or
yarn lint

# Type check
npm run typecheck
# or
yarn typecheck
```

### Package Manager Support

This project supports both **npm** and **Yarn** (including Yarn Berry/v2+). The CI pipeline automatically detects which package manager to use based on the lock file present:

- If `yarn.lock` exists: Uses `yarn install --frozen-lockfile` and `yarn <script>`
- If only `package-lock.json` exists: Uses `npm ci` and `npm run <script>`

**For contributors**: Please use the same package manager consistently to avoid lock file conflicts. If you're adding dependencies, ensure the lock file you're using is committed.

## Documentation

Detailed guides and references:

| Section | Description |
|---------|-------------|
| [Getting Started](https://docs.thetanuts.finance/sdk/getting-started/overview) | Installation, quick start, configuration |
| [OptionBook](https://docs.thetanuts.finance/sdk/optionbook/overview) | Browse orders, preview fills, execute trades |
| [RFQ (Factory)](https://docs.thetanuts.finance/sdk/rfq/overview) | Create custom options, multi-leg structures, RFQ lifecycle |
| [Pricing](https://docs.thetanuts.finance/sdk/pricing/mm-pricing) | MM pricing, spreads, collateral cost |
| [Guides](https://docs.thetanuts.finance/sdk/guides/error-handling) | Error handling, WebSocket, production checklist |
| [Loan](https://docs.thetanuts.finance/sdk/loan/overview) | Non-liquidatable lending (borrow USDC against ETH/BTC) |
| [SDK Reference](https://docs.thetanuts.finance/sdk/reference/client) | Client, modules, types, utilities |
| [MCP Server](mcp-server/README.md) | Read-only MCP server for AI agents |

### Code Examples

Copy-paste ready examples in `docs/examples/`:

- [`fill-order.ts`](docs/examples/fill-order.ts) - Complete OptionBook fill flow with preview, approval, and error handling
- [`claim-fees.ts`](docs/examples/claim-fees.ts) - Check and claim referrer fees across all collateral tokens
- [`create-rfq.ts`](docs/examples/create-rfq.ts) - Complete RFQ creation flow (BUY and SELL)
- [`physical-option-rfq.ts`](docs/examples/physical-option-rfq.ts) - Physically settled option RFQ (vanilla only)
- [`fetch-pricing.ts`](docs/examples/fetch-pricing.ts) - MM pricing with filters
- [`option-management.ts`](docs/examples/option-management.ts) - Option queries and operations
- [`query-stats.ts`](docs/examples/query-stats.ts) - Protocol and referrer statistics

## API Reference

- [Source Overview](src/README.md) - Source code structure
- [Client](src/client/README.md) - ThetanutsClient initialization
- [Modules](src/modules/README.md) - All module documentation
- [Types](src/types/README.md) - Type definitions
- [Utils](src/utils/README.md) - Utility functions
- [ABIs](src/abis/README.md) - Smart contract ABIs
- [Chains](src/chains/README.md) - Chain configuration
- [Scripts](scripts/README.md) - Available scripts

## License

MIT

## Links

- [Thetanuts Finance](https://thetanuts.finance)
- [Documentation](https://docs.thetanuts.finance)
- [GitHub](https://github.com/goheesheng/thetanuts-sdk)
