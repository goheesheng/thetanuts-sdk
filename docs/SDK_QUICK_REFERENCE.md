# Thetanuts SDK Quick Reference

> Quick reference for all SDK modules. For detailed documentation, see [API Reference](API_REFERENCE.md).

## Installation

```bash
npm install @thetanuts-finance/thetanuts-client
```

## Initialization

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

// Read-only client
const client = new ThetanutsClient({ chainId: 8453 });

// With signer (for transactions)
const client = new ThetanutsClient({
  chainId: 8453,
  signer: ethersWallet
});
```

---

## Key Concepts

| Concept | Description | Details |
|---------|-------------|---------|
| **Reserve Price** | Max (BUY) or min (SELL) acceptable price per contract | [RFQ Workflow](RFQ_WORKFLOW.md#reserve-price-explained) |
| **Collateral** | Funds locked by seller to secure the option; pulled at settlement | [RFQ Workflow](RFQ_WORKFLOW.md#collateral-handling) |
| **Collateral Cost** | Opportunity cost: `amount × APR × time` (BTC 1%, ETH 4%, USD 7%) | [API Reference](API_REFERENCE.md#collateral-apr-rates) |
| **Sealed-Bid Auction** | Encrypted offers prevent front-running; only requester can decrypt | [RFQ Workflow](RFQ_WORKFLOW.md#sealed-bid-auction-mechanism) |

---

## Methods Summary

### ERC20Module (Token operations)

| Method | Description | Signer |
|--------|-------------|--------|
| `getBalance(token, owner?)` | Get token balance | No |
| `getAllowance(token, owner, spender)` | Get spending allowance | No |
| `getDecimals(token)` | Get token decimals (cached) | No |
| `getSymbol(token)` | Get token symbol | No |
| `approve(token, spender, amount)` | Approve spending | Yes |
| `ensureAllowance(token, spender, amount)` | Approve if needed | Yes |
| `transfer(token, to, amount)` | Transfer tokens | Yes |

### OptionBookModule (Order execution)

| Method | Description | Signer |
|--------|-------------|--------|
| `previewFillOrder(order, amount?, referrer?)` | Dry-run fill preview | No |
| `calculateNumContracts(usdc, price)` | Calculate contracts from USDC | No |
| `encodeFillOrder(order, amount?, referrer?)` | Encode for viem/wagmi | No |
| `getFees(token, referrer)` | Get accumulated fees | No |
| `getAmountFilled(nonce)` | Get filled amount for nonce | No |
| `getReferrerFeeSplit(address)` | Get referrer fee % (bps) | No |
| `fillOrder(order, amount?, referrer?)` | Execute fill | Yes |
| `swapAndFillOrder(order, swapParams)` | Fill with swap | Yes |
| `cancelOrder(order)` | Cancel order | Yes |
| `claimFees(token)` | Claim accumulated fees | Yes |

### APIModule (Data fetching)

All methods are read-only. No signer required.

**Markets & prices:**

| Method | Description |
|--------|-------------|
| `getMarketData()` | Aggregated market data (prices, feeds, metadata) |
| `getMarketPrices()` | Raw price feed values for BTC, ETH, etc. |
| `getHealth()` | Indexer health check (lag, last indexed block) |

**OptionBook (book) endpoints:**

| Method | Description |
|--------|-------------|
| `fetchOrders()` | Fetch all available orders |
| `filterOrders(criteria)` | Fetch orders matching filter criteria |
| `getUserPositionsFromIndexer(address)` | User positions on the book side |
| `getUserHistoryFromIndexer(address)` | Trade history on the book side |
| `getBookOption(optionAddress)` | Book option detail with PnL |
| `getReferrerStatsFromIndexer(address)` | Referrer stats (book side) |
| `getStatsFromIndexer()` | Legacy protocol totals (uniqueUsers, openPositions, totalOptionsTracked) |
| `getBookState()` | Raw book state snapshot |

**OptionFactory (RFQ) endpoints:**

| Method | Description |
|--------|-------------|
| `getStateFromRfq()` | Full RFQ state snapshot (all RFQs, offers, options, stats) |
| `getRfq(id)` | Get a single RFQ by ID |
| `getFactoryRfqs(status?)` | RFQs, optionally filtered by status |
| `getAllFactoryRfqs(status?)` | Paginated fetch of all RFQs |
| `getFactoryOffers()` | All offers across all RFQs |
| `getAllFactoryOffers()` | Paginated fetch of all offers |
| `getFactoryOptions()` | All options created via RFQs |
| `getAllFactoryOptions()` | Paginated fetch of all factory options |
| `getFactoryOption(optionAddress)` | Single factory option with RFQs, events, PnL |
| `getFactoryStats()` | Factory indexer stats |
| `getUserRfqs(address)` | RFQs created by a user |
| `getUserOffersFromRfq(address)` | Offers made by a user |
| `getUserOptionsFromRfq(address)` | Options held by a user from RFQs |
| `getFactoryReferrerStats(address)` | Referrer stats (factory/RFQ side) |

**Protocol stats (time windows, per-implementation breakdowns):**

| Method | Description |
|--------|-------------|
| `getBookProtocolStats()` | Rich OptionBook stats with 24h/7d/30d windows |
| `getFactoryProtocolStats()` | Rich factory/RFQ stats with 24h/7d/30d windows |
| `getProtocolStats()` | Combined book + factory stats |
| `getBookDailyStats()` | OptionBook daily time series |
| `getFactoryDailyStats()` | Factory daily time series |
| `getDailyStats()` | Combined daily time series |

### OptionFactoryModule (RFQ lifecycle)

| Method | Description | Signer |
|--------|-------------|--------|
| `buildRFQParams(params)` | Build RFQ params (supports multi-leg) | No |
| `buildRFQRequest(params)` | Build complete RFQ request | No |
| `buildSpreadRFQ(params)` | Build 2-leg spread RFQ | No |
| `buildButterflyRFQ(params)` | Build 3-leg butterfly RFQ | No |
| `buildCondorRFQ(params)` | Build 4-leg condor RFQ | No |
| `buildIronCondorRFQ(params)` | Build 4-leg iron condor RFQ | No |
| `buildPhysicalOptionRFQ(params)` | Build physically settled option RFQ (vanilla only) | No |
| `encodeRequestForQuotation(request)` | Encode for viem/wagmi | No |
| `getQuotation(id)` | Get quotation by ID | No |
| `getQuotationCount()` | Total RFQ count | No |
| `calculateFee(contracts, premium, price)` | Calculate fee | No |
| `requestForQuotation(request)` | Create RFQ | Yes |
| `makeOfferForQuotation(params)` | Make encrypted offer | Yes |
| `revealOffer(params)` | Reveal offer | Yes |
| `settleQuotation(id)` | Settle after reveal | Yes |
| `settleQuotationEarly(id, amount, nonce, offeror)` | Early settle | Yes |
| `cancelQuotation(id)` | Cancel RFQ | Yes |
| `cancelOfferForQuotation(id)` | Cancel offer | Yes |

### OptionModule (Position management)

| Method | Description | Signer |
|--------|-------------|--------|
| `getOptionInfo(address)` | Get option details | No |
| `calculatePayout(address, price)` | Calculate payout | No |
| `calculateRequiredCollateral(address, strikes, contracts)` | Get collateral needed | No |
| `getStrikes(address)` | Get strike prices | No |
| `getExpiry(address)` | Get expiry timestamp | No |
| `isExpired(address)` | Check if expired | No |
| `isSettled(address)` | Check if settled | No |
| `getBuyer(address)` | Get buyer address | No |
| `getSeller(address)` | Get seller address | No |
| `getNumContracts(address)` | Get contract count | No |
| `getCollateralAmount(address)` | Get collateral amount | No |
| `close(address)` | Close position | Yes |
| `transfer(address, isBuyer, target)` | Transfer role | Yes |
| `split(address, amount)` | Split position | Yes |
| `payout(address)` | Execute payout | Yes |

### MMPricingModule (Market Maker pricing)

| Method | Description | Signer |
|--------|-------------|--------|
| `getAllPricing(underlying)` | All pricing for ETH/BTC | No |
| `getTickerPricing(ticker)` | Pricing for specific ticker | No |
| `getPositionPricing(params)` | Long/short with collateral cost | No |
| `getSpreadPricing(params)` | 2-leg spread pricing | No |
| `getButterflyPricing(params)` | 3-leg butterfly pricing | No |
| `getCondorPricing(params)` | 4-leg condor pricing | No |
| `filterExpired(pricing[])` | Filter out expired options | No |
| `sortByExpiryAndStrike(pricing[])` | Sort by expiry, then strike | No |
| `getUniqueExpiries(pricing[])` | Get unique expiry dates | No |
| `filterByType(pricing[], isCall)` | Filter calls/puts | No |

### RFQKeyManagerModule (Encryption)

| Method | Description | Signer |
|--------|-------------|--------|
| `generateKeyPair()` | Generate ECDH keypair | No |
| `getOrCreateKeyPair()` | Get/create stored key | No |
| `loadKeyPair()` | Load from storage | No |
| `hasStoredKey()` | Check if key exists | No |
| `storeKeyPair(keypair)` | Store keypair | No |
| `removeStoredKey()` | Remove stored keypair | No |
| `exportPrivateKey()` | Export private key for backup | No |
| `importFromPrivateKey(key, store?)` | Import keypair from private key | No |
| `encryptOffer(amount, nonce, pubKey)` | Encrypt offer | No |
| `decryptOffer(data, pubKey)` | Decrypt incoming offers | No |
| `generateNonce()` | Generate random nonce | No |
| `getPublicKeyFromPrivate(key)` | Derive public key | No |
| `isValidPublicKey(key)` | Validate public key format | No |
| `getStorageKeyId()` | Get storage key identifier | No |

### EventsModule (Blockchain events)

| Method | Description | Signer |
|--------|-------------|--------|
| `getOrderFillEvents(filters?)` | Order fill events | No |
| `getOrderCancelledEvents(filters?)` | Cancellation events | No |
| `getOptionCreatedEvents(filters?)` | New option events | No |
| `getQuotationRequestedEvents(filters?)` | RFQ request events | No |
| `getOfferMadeEvents(filters?)` | RFQ offer events | No |
| `getOfferRevealedEvents(filters?)` | Offer reveal events | No |
| `getQuotationSettledEvents(filters?)` | Settlement events | No |
| `getPositionClosedEvents(option, filters?)` | Position close events | No |

### WebSocketModule (Real-time)

| Method | Description | Signer |
|--------|-------------|--------|
| `connect(config?)` | Connect to WebSocket | No |
| `subscribe(options, callback)` | Subscribe to updates | No |
| `unsubscribe(id)` | Unsubscribe | No |
| `getState()` | Get connection state | No |
| `disconnect()` | Disconnect | No |

### UtilsModule (Calculations)

| Method | Description | Signer |
|--------|-------------|--------|
| `calculatePayout(params)` | Option payoff calculation | No |
| `calculateCollateral(params)` | Required collateral | No |
| `generatePayoffDiagram(params)` | Payoff chart data | No |
| `toBigInt(value, decimals)` | Convert to bigint | No |
| `fromBigInt(value, decimals)` | Convert from bigint | No |
| `strikeToChain(strike)` | Strike to 8 decimals | No |
| `strikeFromChain(value)` | Strike from 8 decimals | No |
| `toUsdcDecimals(value)` | Convert to USDC (6 dec) | No |
| `fromUsdcDecimals(value)` | Convert from USDC | No |

---

## Chain Configuration

Access all addresses from chain config (no hardcoding needed):

```typescript
const config = client.chainConfig;

// Tokens
config.tokens.USDC.address;  // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
config.tokens.USDC.decimals; // 6
config.tokens.WETH.address;  // 0x4200000000000000000000000000000000000006
config.tokens.WETH.decimals; // 18
config.tokens.cbBTC.address; // 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
config.tokens.cbBTC.decimals; // 8

// Implementations
config.implementations.PUT;           // PUT option implementation
config.implementations.INVERSE_CALL;  // CALL option implementation
config.implementations.PUT_SPREAD;
config.implementations.CALL_SPREAD;

// Price Feeds
config.priceFeeds.ETH;  // Chainlink ETH/USD feed
config.priceFeeds.BTC;  // Chainlink BTC/USD feed
```

---

## RFQ Creation

### Using buildRFQParams (Recommended)

```typescript
// Enforces collateralAmount = 0, handles all conversions
const params = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',         // 'ETH' | 'BTC'
  optionType: 'PUT',         // 'CALL' | 'PUT'
  strikes: 1850,             // Single strike or array for multi-leg
  expiry: 1741334400,        // Unix timestamp
  numContracts: 1.5,         // Human-readable
  isLong: true,              // true = BUY, false = SELL
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',   // 'USDC' | 'WETH' | 'cbBTC'
});
```

### Multi-Leg Options (Spreads, Butterflies, Condors)

```typescript
// PUT SPREAD (2 strikes) - auto-selects PUT_SPREAD implementation
const spreadParams = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1800, 2000],     // [lowerStrike, upperStrike] - auto-sorted
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});

// CALL BUTTERFLY (3 strikes)
const butterflyParams = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'CALL',
  strikes: [1800, 1900, 2000],  // [lower, middle, upper]
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'WETH',
});

// CONDOR (4 strikes)
const condorParams = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strikes: [1700, 1800, 1900, 2000],  // [s1, s2, s3, s4]
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

### Convenience Helper Methods

```typescript
// Spread helper - clearer parameter names
const spreadRFQ = client.optionFactory.buildSpreadRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  lowerStrike: 1800,
  upperStrike: 2000,
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});

// Butterfly helper
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

// Condor helper
const condorRFQ = client.optionFactory.buildCondorRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike1: 1700,
  strike2: 1800,
  strike3: 1900,
  strike4: 2000,
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

### Complete RFQ Request

```typescript
const request = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,
  expiry: 1741334400,
  numContracts: 1.5,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  reservePrice: 0.015,  // Optional: per-contract
  requesterPublicKey: keypair.compressedPublicKey,
});

const { to, data } = client.optionFactory.encodeRequestForQuotation(request);
```

### CRITICAL: collateralAmount = 0

```typescript
// ALWAYS use 0 - collateral pulled at settlement
collateralAmount: BigInt(0)
```

---

## Strike Conversion

Use precision-safe methods to avoid floating-point errors:

```typescript
// Number to on-chain (8 decimals)
const strikeOnChain = client.utils.strikeToChain(1850.5);
// Returns: 185050000000n

// On-chain to number
const strikeNumber = client.utils.strikeFromChain(185050000000n);
// Returns: 1850.5
```

---

## Decimal Conversions

```typescript
// To bigint
const usdc = client.utils.toBigInt('100.5', 6);   // 100500000n
const weth = client.utils.toBigInt('1.5', 18);    // 1500000000000000000n

// From bigint
const display = client.utils.fromBigInt(100500000n, 6);  // '100.5'

// Convenience methods
client.utils.toUsdcDecimals('100.5');      // 100500000n
client.utils.fromUsdcDecimals(100500000n); // '100.5'
client.utils.toStrikeDecimals(1850);       // 185000000000n
client.utils.fromStrikeDecimals(185000000000n); // '1850'
```

---

## Option Module

### Get Full Option Info (Single Call)

```typescript
const info = await client.option.getFullOptionInfo(optionAddress);

console.log(info.info);            // Basic info (type, strikes, expiry)
console.log(info.buyer);           // Current buyer address
console.log(info.seller);          // Current seller address
console.log(info.isExpired);       // boolean
console.log(info.isSettled);       // boolean
console.log(info.numContracts);    // bigint
console.log(info.collateralAmount);// bigint
```

### Individual Methods

```typescript
await client.option.getOptionInfo(address);
await client.option.getBuyer(address);
await client.option.getSeller(address);
await client.option.isExpired(address);
await client.option.isSettled(address);
await client.option.getNumContracts(address);
await client.option.getCollateralAmount(address);
await client.option.calculatePayout(address, settlementPrice);
```

---

## MM Pricing

### Get All Pricing

```typescript
const allETH = await client.mmPricing.getAllPricing('ETH');
const allBTC = await client.mmPricing.getAllPricing('BTC');
```

### Get Specific Ticker

```typescript
const pricing = await client.mmPricing.getTickerPricing('ETH-16FEB26-1800-P');

console.log(pricing.rawBidPrice);
console.log(pricing.rawAskPrice);
console.log(pricing.feeAdjustedBid);
console.log(pricing.feeAdjustedAsk);
console.log(pricing.byCollateral.USD.mmBidPrice);
console.log(pricing.byCollateral.ETH.mmAskPrice);
```

### Position Pricing (With Collateral Cost)

```typescript
const position = await client.mmPricing.getPositionPricing({
  ticker: 'ETH-16FEB26-1800-P',
  isLong: true,
  numContracts: 10,
  collateralToken: 'USDC',
});

console.log(position.totalPrice);      // Includes collateral cost
console.log(position.collateralCost);
console.log(position.basePremium);
```

### Spread Pricing

Multi-leg structures use spread-level collateral cost (width-based, not sum of per-leg CCs).

```typescript
// Get spread pricing
const spread = await client.mmPricing.getSpreadPricing({
  underlying: 'ETH',
  strikes: [220000000000n, 200000000000n],  // 8 decimals: $2200, $2000
  expiry: 1774627200,  // Unix timestamp
  isCall: false,       // Put spread
});

// Access breakdown fields
console.log('Width (USD):', spread.widthUsd);              // 200
console.log('Spread CC (USD):', spread.spreadCollateralCost);  // ~$0.42
console.log('Net spread price (ETH):', spread.netSpreadPrice);

// Convert to USD
const ethPrice = spread.nearLeg.underlyingPrice;
const askUsd = spread.netMmAskPrice * ethPrice;
const bidUsd = spread.netMmBidPrice * ethPrice;
console.log('Ask (USD):', askUsd.toFixed(2));  // ~$58.49
console.log('Bid (USD):', bidUsd.toFixed(2));  // ~$49.26
```

### Filter & Sort Utilities

```typescript
const all = await client.mmPricing.getAllPricing('ETH');
const values = Object.values(all);

// Filter expired
const active = client.mmPricing.filterExpired(values);

// Sort by expiry then strike
const sorted = client.mmPricing.sortByExpiryAndStrike(values);

// Get unique expiries
const expiries = client.mmPricing.getUniqueExpiries(values);
// ['2025-02-16', '2025-03-16', ...]

// Filter by type
const puts = client.mmPricing.filterByType(values, false);
const calls = client.mmPricing.filterByType(values, true);

// Filter by expiry
const feb16 = client.mmPricing.filterByExpiry(values, '2025-02-16');

// Filter by strike range
const nearATM = client.mmPricing.filterByStrikeRange(values, 1800, 2200);

// Convenience: sorted, non-expired array
const pricing = await client.mmPricing.getPricingArray('ETH');
```

---

## ERC20 Operations

```typescript
// Read
const balance = await client.erc20.getBalance(token, address);
const decimals = await client.erc20.getDecimals(token);
const allowance = await client.erc20.getAllowance(token, owner, spender);

// Write
await client.erc20.approve(token, spender, amount);
await client.erc20.transfer(token, to, amount);

// Encode (for external wallets)
const { to, data } = client.erc20.encodeApprove(token, spender, amount);
```

---

## API Module

```typescript
// Fetch orders
const orders = await client.api.fetchOrders();
const filtered = await client.api.filterOrders({ isCall: true });

// User data (Indexer API - OptionBook side)
const positions = await client.api.getUserPositionsFromIndexer(address);
const history = await client.api.getUserHistoryFromIndexer(address);

// Protocol stats (legacy totals)
const stats = await client.api.getStatsFromIndexer();

// Richer protocol stats with 24h/7d/30d windows
const bookStats = await client.api.getBookProtocolStats();
const factoryStats = await client.api.getFactoryProtocolStats();

// RFQ data (State/RFQ API)
const rfqs = await client.api.getUserRfqs(address);
const rfq = await client.api.getRfq(quotationId);
```

---

## Type Exports

```typescript
import type {
  // Client
  ThetanutsClientConfig,
  ChainConfig,

  // RFQ
  RFQBuilderParams,
  RFQRequest,
  QuotationParameters,
  QuotationTracking,
  RFQUnderlying,
  RFQOptionType,
  RFQCollateralToken,

  // Multi-leg RFQ helpers
  SpreadRFQParams,
  ButterflyRFQParams,
  CondorRFQParams,

  // Option
  OptionInfo,
  FullOptionInfo,
  PayoutCalculation,

  // MM Pricing
  MMVanillaPricing,
  MMPositionPricing,
  MMCollateralPricing,

  // Utils
  PayoutType,
  PayoutParams,

  // API
  Position,
  PositionSettlement,
  TradeHistory,
  ProtocolStats,

  // RFQ Key Manager
  RFQKeyPair,
  EncryptedOffer,
  DecryptedOffer,
  KeyStorageProvider,
} from '@thetanuts-finance/thetanuts-client';

// Storage Providers (classes)
import {
  FileStorageProvider,
  LocalStorageProvider,
  MemoryStorageProvider,
} from '@thetanuts-finance/thetanuts-client';
```

---

## Decimal Reference

| Type | Decimals | Example |
|------|----------|---------|
| USDC | 6 | `1000000` = 1 USDC |
| WETH | 18 | `1000000000000000000` = 1 WETH |
| cbBTC | 8 | `100000000` = 1 cbBTC |
| Strike/Price | 8 | `185000000000` = $1850 |
| numContracts | collateral decimals | Depends on token |

---

## Common Patterns

### Approval for SELL Position

```typescript
// 1. Calculate collateral needed
const strike = 1850;
const contracts = 1.5;
const decimals = 6;  // USDC

// PUT: strike * contracts
const approval = BigInt(Math.round(strike * contracts * 10 ** decimals));

// 2. Approve
await client.erc20.approve(USDC, optionFactory, approval);

// 3. Create RFQ with isLong: false
```

### Error Handling

```typescript
try {
  const result = await client.optionFactory.requestForQuotation(params);
} catch (error) {
  if (error.code === 'CONTRACT_REVERT') {
    console.log('Transaction reverted:', error.reason);
  } else if (error.code === 'INSUFFICIENT_FUNDS') {
    console.log('Not enough funds');
  }
}
```

---

## Physical Options

Physical options involve actual delivery of the underlying asset at expiry.

### Calculation Functions

```typescript
import {
  calculateDeliveryAmount,
  isPhysicalProduct,
  calculateNumContracts,
  calculateCollateralRequired,
} from '@thetanuts-finance/thetanuts-client';

// Check if a product is physical
isPhysicalProduct('PHYSICAL_CALL');  // true
isPhysicalProduct('PUT');            // false

// PHYSICAL_CALL: Seller posts WETH, buyer delivers USDC at strike
const callDelivery = calculateDeliveryAmount(10, 'PHYSICAL_CALL', [2000]);
// { deliveryAmount: 20000, deliveryToken: 'USDC' }

// PHYSICAL_PUT: Seller posts USDC, buyer delivers WETH
const putDelivery = calculateDeliveryAmount(10, 'PHYSICAL_PUT', [2000]);
// { deliveryAmount: 10, deliveryToken: 'WETH' }

// For BTC underlying
const btcDelivery = calculateDeliveryAmount(5, 'PHYSICAL_PUT', [50000], 'BTC');
// { deliveryAmount: 5, deliveryToken: 'cbBTC' }
```

### Physical Option Products

| Product | Collateral (Seller) | Delivery (Buyer) |
|---------|---------------------|------------------|
| `PHYSICAL_CALL` | numContracts (WETH) | strike × numContracts (USDC) |
| `PHYSICAL_PUT` | strike × numContracts (USDC) | numContracts (WETH) |
| `PHYSICAL_CALL_SPREAD` | width × numContracts (WETH) | width × numContracts (USDC) |
| `PHYSICAL_PUT_SPREAD` | width × numContracts (USDC) | width × numContracts (WETH) |

---

## See Also

- [API Reference](API_REFERENCE.md) - Complete API documentation
- [RFQ Workflow Guide](RFQ_WORKFLOW.md) - RFQ lifecycle explanation
- [RFQ Calculations Guide](rfq-calculations.md) - Position sizing and collateral calculations
- [Migration Guide](MIGRATION_GUIDE.md) - Upgrading from previous versions
- [Error Codes](ERROR_CODES.md) - Error handling reference
- [Code Examples](examples/) - Copy-paste ready examples
