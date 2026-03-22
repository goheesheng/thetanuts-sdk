# API Reference

Complete API documentation for the Thetanuts SDK.

## Table of Contents

- [ThetanutsClient](#thetanutsclient)
- [OptionFactory Module](#optionfactory-module)
- [RFQKeyManager Module](#rfqkeymanager-module)
- [Option Module](#option-module)
- [MM Pricing Module](#mm-pricing-module)
- [Utils Module](#utils-module)
- [ERC20 Module](#erc20-module)
- [API Module](#api-module)
- [Key Storage Providers](#key-storage-providers)
- [Data Types](#data-types)

---

## ThetanutsClient

The main client class for interacting with the Thetanuts protocol.

### Constructor

```typescript
import { ThetanutsClient } from '@thetanuts/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,              // Required: Chain ID (Base = 8453)
  provider?: Provider,        // Optional: ethers.js provider
  signer?: Signer,            // Optional: For write operations
  referrer?: string,          // Optional: Referrer address for fees
  apiBaseUrl?: string,        // Optional: Override API URL
  indexerApiUrl?: string,     // Optional: Override indexer URL
  pricingApiUrl?: string,     // Optional: Override pricing URL
  wsUrl?: string,             // Optional: Override WebSocket URL
  env?: 'dev' | 'prod',       // Optional: Environment (default: prod)
  logger?: ThetanutsLogger,   // Optional: Custom logger
});
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `chainConfig` | `ChainConfig` | Chain configuration with addresses |
| `provider` | `Provider` | ethers.js provider instance |
| `signer` | `Signer \| undefined` | Signer for transactions |
| `referrer` | `string \| undefined` | Default referrer address |

### Modules

Access SDK modules via the client instance:

```typescript
client.optionFactory  // RFQ lifecycle management
client.option         // Position management
client.mmPricing      // Market maker pricing
client.utils          // Utility functions
client.erc20          // Token operations
client.api            // API interactions
client.optionBook     // Order book operations
client.events         // Blockchain events
client.ws             // WebSocket subscriptions
client.pricing        // Option pricing calculations
```

### Chain Configuration

```typescript
const config = client.chainConfig;

// Tokens
config.tokens.USDC.address   // '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
config.tokens.USDC.decimals  // 6
config.tokens.WETH.address   // '0x4200000000000000000000000000000000000006'
config.tokens.WETH.decimals  // 18
config.tokens.cbBTC.address  // '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'
config.tokens.cbBTC.decimals // 8

// Option implementations - Cash-settled
config.implementations.PUT           // PUT option implementation
config.implementations.INVERSE_CALL  // CALL option implementation
config.implementations.PUT_SPREAD
config.implementations.CALL_SPREAD
config.implementations.PUT_FLY
config.implementations.CALL_FLY
config.implementations.PUT_CONDOR
config.implementations.CALL_CONDOR
config.implementations.IRON_CONDOR

// Option implementations - Physically settled
config.implementations.PHYSICAL_CALL        // Vanilla physical CALL
config.implementations.PHYSICAL_PUT         // Vanilla physical PUT
config.implementations.PHYSICAL_CALL_SPREAD // Physical CALL spread (2 strikes)
config.implementations.PHYSICAL_PUT_SPREAD  // Physical PUT spread (2 strikes)
config.implementations.PHYSICAL_CALL_FLY    // Physical CALL butterfly (3 strikes)
config.implementations.PHYSICAL_PUT_FLY     // Physical PUT butterfly (3 strikes)
config.implementations.PHYSICAL_CALL_CONDOR // Physical CALL condor (4 strikes)
config.implementations.PHYSICAL_PUT_CONDOR  // Physical PUT condor (4 strikes)
config.implementations.PHYSICAL_IRON_CONDOR // Physical iron condor (4 strikes)

// Price feeds
config.priceFeeds.ETH  // Chainlink ETH/USD feed
config.priceFeeds.BTC  // Chainlink BTC/USD feed

// Contracts
config.contracts.optionFactory
config.contracts.optionBook
```

---

## OptionFactory Module

Manages the RFQ (Request for Quotation) lifecycle.

**IMPORTANT:** `collateralAmount` must ALWAYS be 0 in RFQ params. Collateral is pulled at settlement, not at RFQ creation.

### buildRFQParams()

Build RFQ parameters with automatic address resolution and decimal handling. Enforces `collateralAmount = 0`. Supports multi-leg options (spreads, butterflies, condors).

```typescript
// Vanilla option (single strike)
const params = client.optionFactory.buildRFQParams({
  requester: '0x...',           // User wallet address
  underlying: 'ETH',            // 'ETH' | 'BTC'
  optionType: 'PUT',            // 'CALL' | 'PUT'
  strikes: 1850,                // Single strike or array for multi-leg
  expiry: 1741334400,           // Unix timestamp
  numContracts: 1.5,            // Human-readable
  isLong: true,                 // true = BUY, false = SELL
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',      // 'USDC' | 'WETH' | 'cbBTC'
});

// Spread (2 strikes) - auto-selects CALL_SPREAD or PUT_SPREAD
const spreadParams = client.optionFactory.buildRFQParams({
  ...baseParams,
  strikes: [1800, 2000],        // [lower, upper] - auto-sorted
});

// Butterfly (3 strikes)
const butterflyParams = client.optionFactory.buildRFQParams({
  ...baseParams,
  strikes: [1800, 1900, 2000],  // [lower, middle, upper]
});

// Condor (4 strikes)
const condorParams = client.optionFactory.buildRFQParams({
  ...baseParams,
  strikes: [1700, 1800, 1900, 2000],
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `requester` | `string` | User wallet address |
| `underlying` | `'ETH' \| 'BTC'` | Underlying asset |
| `optionType` | `'CALL' \| 'PUT'` | Option type |
| `strikes` | `number \| number[]` | Strike price(s). Single for vanilla, array for multi-leg (auto-sorted ascending) |
| `strike` | `number` | **Deprecated** - use `strikes` instead |
| `expiry` | `number` | Expiry timestamp (Unix seconds) |
| `numContracts` | `number` | Number of contracts |
| `isLong` | `boolean` | true = BUY, false = SELL |
| `offerDeadlineMinutes` | `number` | How long MMs can respond |
| `collateralToken` | `'USDC' \| 'WETH' \| 'cbBTC'` | Collateral token |
| `isIronCondor` | `boolean` | Optional. Set to `true` to use `IRON_CONDOR` implementation (requires 4 strikes) |

**Strike Count to Implementation:**

| Strike Count | Structure | Implementation |
|--------------|-----------|----------------|
| 1 | Vanilla | `INVERSE_CALL` or `PUT` |
| 2 | Spread | `CALL_SPREAD` or `PUT_SPREAD` |
| 3 | Butterfly | `CALL_FLY` or `PUT_FLY` |
| 4 | Condor | `CALL_CONDOR` or `PUT_CONDOR` |
| 4 + `isIronCondor` | Iron Condor | `IRON_CONDOR` |

**Returns:** `QuotationParameters`

### buildSpreadRFQ()

Convenience method for creating spreads with explicit parameter names.

```typescript
const request = client.optionFactory.buildSpreadRFQ({
  requester: '0x...',
  underlying: 'ETH',
  optionType: 'PUT',
  lowerStrike: 1800,            // Lower strike price
  upperStrike: 2000,            // Upper strike price
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

**Returns:** `RFQRequest`

### buildButterflyRFQ()

Convenience method for creating butterflies.

```typescript
const request = client.optionFactory.buildButterflyRFQ({
  requester: '0x...',
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

**Returns:** `RFQRequest`

### buildCondorRFQ()

Convenience method for creating condors.

```typescript
const request = client.optionFactory.buildCondorRFQ({
  requester: '0x...',
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

**Returns:** `RFQRequest`

### buildIronCondorRFQ()

Convenience method for creating iron condors. An iron condor combines a put spread (lower strikes) with a call spread (upper strikes), using out-of-the-money options for better liquidity.

```typescript
const request = client.optionFactory.buildIronCondorRFQ({
  requester: '0x...',
  underlying: 'ETH',
  strike1: 2200,   // Put spread lower strike (K1)
  strike2: 2400,   // Put spread upper strike (K2)
  strike3: 2600,   // Call spread lower strike (K3)
  strike4: 2800,   // Call spread upper strike (K4)
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

**Iron Condor Structure:**

```
         Put Spread          Call Spread
         (K1-K2)             (K3-K4)
    ┌─────────────┐     ┌─────────────┐
    │ Buy K1 Put  │     │ Buy K3 Call │
    │ Sell K2 Put │     │ Sell K4 Call│
    └─────────────┘     └─────────────┘
        $2200-$2400        $2600-$2800
```

**Key Differences: Iron Condor vs Call/Put Condor**

| Aspect | Call/Put Condor | Iron Condor |
|--------|-----------------|-------------|
| Option types | All calls OR all puts | Puts + Calls |
| Implementation | `CALL_CONDOR` or `PUT_CONDOR` | `IRON_CONDOR` |
| Moneyness | Mix of ITM/OTM legs | All OTM legs |
| Liquidity | Lower (ITM legs) | Higher (OTM legs) |

**Returns:** `RFQRequest`

### Using isIronCondor with buildRFQParams()

You can also create iron condors using the generic `buildRFQParams()` method with the `isIronCondor` flag:

```typescript
const params = client.optionFactory.buildRFQParams({
  requester: '0x...',
  underlying: 'ETH',
  optionType: 'PUT',           // Ignored for iron condors
  strikes: [2200, 2400, 2600, 2800],
  expiry: 1741334400,
  numContracts: 1,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  isIronCondor: true,          // Use IRON_CONDOR implementation
});
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `isIronCondor` | `boolean` | Set to `true` to use `IRON_CONDOR` implementation. Requires exactly 4 strikes. Default: `false` |

**Validation:**
- If `isIronCondor: true` and strike count ≠ 4, throws `INVALID_PARAMS` error

### Iron Condor Cost Breakdown

**For a SELL (short) position:**

| Item | Formula | Example (strikes 2200/2400/2600/2800) |
|------|---------|---------------------------------------|
| **Collateral** | wing_width × numContracts | $200 × 0.001 = **$0.20 USDC** |
| **Gas** | ~0.0003-0.001 ETH | ~**$0.50-1.50** |
| **Premium** | You RECEIVE from buyer | Depends on MM offer |
| **Fees** | min(0.06% notional, 12.5% premium) | Paid at settlement |

**Collateral Formula:**
```
Wing Width = strike2 - strike1 = $2400 - $2200 = $200
Collateral = Wing Width × numContracts = $200 × 0.001 = $0.20 USDC
```

**Important:** Collateral is NOT locked at RFQ creation - it's pulled at settlement.

### Iron Condor with Early Settlement Example

```typescript
// 1. Create iron condor RFQ with 6-minute deadline
const rfqRequest = client.optionFactory.buildIronCondorRFQ({
  requester: userAddress,
  underlying: 'ETH',
  strike1: 2200,
  strike2: 2400,
  strike3: 2600,
  strike4: 2800,
  expiry,
  numContracts: 0.001,
  isLong: false,              // SELL = provide collateral, receive premium
  offerDeadlineMinutes: 6,    // Short deadline for testing
  collateralToken: 'USDC',
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// 2. Send RFQ transaction
const receipt = await client.optionFactory.requestForQuotation(rfqRequest);
const rfqId = (await client.optionFactory.getQuotationCount()) - 1n;

// 3. Poll for offers
const quotation = await client.optionFactory.getQuotation(rfqId);
const winner = quotation.state.currentWinner;

// 4. When offer received, decrypt and early settle
if (winner !== '0x0000000000000000000000000000000000000000') {
  // Get encrypted offer from OfferMade event
  const decrypted = await client.rfqKeys.decryptOffer(encryptedOffer, signingKey);

  // Accept the offer before deadline
  await client.optionFactory.settleQuotationEarly(
    rfqId,
    decrypted.offerAmount,
    decrypted.nonce,
    winner
  );
}
```

### Physically Settled Options

Physically settled options differ from cash-settled options in how settlement occurs:

| Settlement Type | CALL Outcome (ITM) | PUT Outcome (ITM) |
|-----------------|-------------------|-------------------|
| **Cash-Settled** | Pay difference in USDC | Pay difference in USDC |
| **Physically Settled** | Buyer receives underlying (WETH/cbBTC), pays strike in USDC | Buyer delivers underlying, receives strike in USDC |

**Key Difference:** The `extraOptionsData` field must contain the ABI-encoded delivery token address.

> **Important:** Physical options are **vanilla-only** (single strike). Multi-leg structures (spreads, butterflies, condors) are only available for cash-settled options.

| Implementation | Type | Strikes | Multi-Leg? |
|---------------|------|---------|------------|
| `PHYSICAL_CALL` | VANILLA | 1 | No |
| `PHYSICAL_PUT` | VANILLA | 1 | No |
| `CALL_SPREAD` / `PUT_SPREAD` | SPREAD | 2 | Yes (cash only) |
| `CALL_FLY` / `PUT_FLY` | BUTTERFLY | 3 | Yes (cash only) |
| `CALL_CONDOR` / `PUT_CONDOR` | CONDOR | 4 | Yes (cash only) |
| `IRON_CONDOR` | IRON_CONDOR | 4 | Yes (cash only) |

### Buy vs Sell: Physical Options Comparison

| Option | Direction | Collateral | At ITM Expiry |
|--------|-----------|------------|---------------|
| **Physical PUT** | BUY | Premium only | You deliver WETH → receive strike in USDC |
| **Physical PUT** | SELL | USDC (strike × contracts) | You receive WETH → pay strike in USDC |
| **Physical CALL** | BUY | Premium only | You pay strike in USDC → receive WETH |
| **Physical CALL** | SELL | WETH (underlying) | You receive strike in USDC → deliver WETH |

**Use Cases:**
- **SELL Physical PUT:** "I want to buy ETH at $2500. If price drops below strike, I receive ETH at my target price."
- **SELL Physical CALL:** "I'm holding ETH and want to sell at $3000. If price rises above strike, I sell my ETH at my target price."

### Collateral and Delivery Token Rules

| Option Type | Collateral (Seller Provides) | Delivery Token | Description |
|-------------|------------------------------|----------------|-------------|
| PHYSICAL_CALL | BASE token (WETH for ETH, cbBTC for BTC) | USDC | Buyer pays strike in USDC at delivery |
| PHYSICAL_PUT | QUOTE token (USDC) | Underlying (WETH/cbBTC) | Buyer delivers underlying at settlement |

### Chain Config: Physical Implementations

```typescript
// Physical option implementations are available in chainConfig
config.implementations.PHYSICAL_CALL  // Physically settled call
config.implementations.PHYSICAL_PUT   // Physically settled put
```

### buildPhysicalOptionRFQ()

Build an RFQ request for a physically settled option. Automatically encodes the delivery token into `extraOptionsData` and selects the correct implementation.

```typescript
const physicalCallRFQ = client.optionFactory.buildPhysicalOptionRFQ({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'CALL',
  strike: 2500,
  expiry: 1741334400,
  numContracts: 0.1,
  isLong: false,                    // SELL = provide collateral, receive premium
  deliveryToken: client.chainConfig.tokens.USDC.address as `0x${string}`,
  collateralToken: 'WETH',          // Optional: auto-inferred if not provided
  offerDeadlineMinutes: 6,
  reservePrice: 0.0001,
  requesterPublicKey: keyPair.compressedPublicKey,
  referralId: 0n,                   // Optional
  eventCode: 0n,                    // Optional
});

// The extraOptionData is automatically encoded:
// ethers.AbiCoder.defaultAbiCoder().encode(['address'], [deliveryToken])
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `requester` | `0x${string}` | Yes | User wallet address |
| `underlying` | `'ETH' \| 'BTC'` | Yes | Underlying asset |
| `optionType` | `'CALL' \| 'PUT'` | Yes | Option type |
| `strike` | `number` | Yes | Strike price in USD |
| `expiry` | `number` | Yes | Expiry timestamp (Unix seconds) |
| `numContracts` | `number` | Yes | Number of contracts |
| `isLong` | `boolean` | Yes | true = BUY, false = SELL |
| `deliveryToken` | `0x${string}` | Yes | Token for physical delivery |
| `requesterPublicKey` | `string` | Yes | ECDH public key for offer encryption |
| `collateralToken` | `'USDC' \| 'WETH' \| 'cbBTC'` | No | Auto-inferred based on optionType |
| `offerDeadlineMinutes` | `number` | No | How long MMs can respond (default: 6) |
| `reservePrice` | `number` | No | Minimum acceptable price per contract |
| `referralId` | `bigint` | No | Referral tracking ID |
| `eventCode` | `bigint` | No | Event tracking code |

**Collateral Auto-Inference:**

If `collateralToken` is not provided, it is automatically inferred:
- `PHYSICAL_CALL` with `ETH` underlying -> `WETH`
- `PHYSICAL_CALL` with `BTC` underlying -> `cbBTC`
- `PHYSICAL_PUT` -> `USDC`

**Validation:**

The method validates that:
1. `optionType` is either `'CALL'` or `'PUT'`
2. `deliveryToken` is a valid address
3. Collateral token matches the option type (CALL requires BASE, PUT requires USDC)

**Returns:** `RFQRequest`

### Physical Option RFQ Example

```typescript
import { ThetanutsClient } from '@thetanuts/thetanuts-client';
import { ethers } from 'ethers';

const client = new ThetanutsClient({ chainId: 8453, provider, signer });
const keyPair = await client.rfqKeys.getOrCreateKeyPair();
const userAddress = await signer.getAddress();

// Create PHYSICAL_CALL: receive WETH at expiry, pay strike in USDC
const physicalCallRFQ = client.optionFactory.buildPhysicalOptionRFQ({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'CALL',
  strike: 2500,
  expiry: nextFridayExpiry,
  numContracts: 0.1,
  isLong: true,                     // BUY the option
  deliveryToken: client.chainConfig.tokens.USDC.address as `0x${string}`,
  collateralToken: 'WETH',          // Collateral is underlying for calls
  offerDeadlineMinutes: 6,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Verify implementation and extraOptionsData
console.log('Implementation:', physicalCallRFQ.params.implementation);
// Should match: client.chainConfig.implementations.PHYSICAL_CALL

console.log('extraOptionData:', physicalCallRFQ.params.extraOptionData);
// Contains ABI-encoded delivery token address (not empty '0x')

// Submit the RFQ
const receipt = await client.optionFactory.requestForQuotation(physicalCallRFQ);
console.log('TX Hash:', receipt.hash);
```

### Physical PUT Example

```typescript
// Create PHYSICAL_PUT: deliver WETH at expiry, receive strike in USDC
const physicalPutRFQ = client.optionFactory.buildPhysicalOptionRFQ({
  requester: userAddress as `0x${string}`,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 2500,
  expiry: nextFridayExpiry,
  numContracts: 0.1,
  isLong: false,                    // SELL the option
  deliveryToken: client.chainConfig.tokens.WETH.address as `0x${string}`,
  // collateralToken auto-inferred as 'USDC' for PUT
  offerDeadlineMinutes: 6,
  requesterPublicKey: keyPair.compressedPublicKey,
});

// Verify implementation
console.log('Implementation:', physicalPutRFQ.params.implementation);
// Should match: client.chainConfig.implementations.PHYSICAL_PUT
```

### extraOptionsData Encoding

For physically settled options, the `extraOptionsData` field contains the ABI-encoded delivery token address:

```typescript
// How it's encoded internally
import { AbiCoder } from 'ethers';

const extraOptionData = AbiCoder.defaultAbiCoder().encode(
  ['address'],
  [deliveryToken]
);

// Example output for USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913):
// '0x000000000000000000000000833589fcd6edb6e08f4c7c32d4f71b54bda02913'
```

This encoding is handled automatically by `buildPhysicalOptionRFQ()`.

### Physical Multi-Leg Options

In addition to vanilla physical options, the SDK supports physical multi-leg structures:

| Method | Strikes | Description |
|--------|---------|-------------|
| `buildPhysicalSpreadRFQ()` | 2 | Physical call/put spread |
| `buildPhysicalButterflyRFQ()` | 3 | Physical call/put butterfly |
| `buildPhysicalCondorRFQ()` | 4 | Physical call/put condor |
| `buildPhysicalIronCondorRFQ()` | 4 | Physical iron condor |

**Note:** Physical multi-leg contracts are not yet deployed. The SDK is ready but will throw an error until contracts are available.

#### buildPhysicalSpreadRFQ()

```typescript
const spreadRFQ = client.optionFactory.buildPhysicalSpreadRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  lowerStrike: 2400,
  upperStrike: 2600,
  expiry: 1774627200,
  numContracts: 0.1,
  isLong: true,
  deliveryToken: client.chainConfig.tokens.WETH.address,
  collateralToken: 'USDC',
  requesterPublicKey: keyPair.compressedPublicKey,
});
```

#### buildPhysicalButterflyRFQ()

```typescript
const butterflyRFQ = client.optionFactory.buildPhysicalButterflyRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  lowerStrike: 2400,
  middleStrike: 2500,
  upperStrike: 2600,
  expiry: 1774627200,
  numContracts: 0.1,
  isLong: true,
  deliveryToken: client.chainConfig.tokens.WETH.address,
  collateralToken: 'USDC',
  requesterPublicKey: keyPair.compressedPublicKey,
});
```

#### buildPhysicalCondorRFQ()

```typescript
const condorRFQ = client.optionFactory.buildPhysicalCondorRFQ({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike1: 2300,
  strike2: 2400,
  strike3: 2600,
  strike4: 2700,
  expiry: 1774627200,
  numContracts: 0.1,
  isLong: true,
  deliveryToken: client.chainConfig.tokens.WETH.address,
  collateralToken: 'USDC',
  requesterPublicKey: keyPair.compressedPublicKey,
});
```

#### buildPhysicalIronCondorRFQ()

```typescript
const ironCondorRFQ = client.optionFactory.buildPhysicalIronCondorRFQ({
  requester: userAddress,
  underlying: 'ETH',
  strike1: 2200,  // buy put
  strike2: 2400,  // sell put
  strike3: 2600,  // sell call
  strike4: 2800,  // buy call
  expiry: 1774627200,
  numContracts: 0.1,
  isLong: true,
  deliveryToken: client.chainConfig.tokens.WETH.address,
  collateralToken: 'USDC',
  requesterPublicKey: keyPair.compressedPublicKey,
});
```

### buildRFQRequest()

Build a complete RFQ request including tracking and reserve price.

```typescript
const request = client.optionFactory.buildRFQRequest({
  requester: '0x...',
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,
  expiry: 1741334400,
  numContracts: 1.5,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  reservePrice: 0.015,              // Optional: per-contract
  requesterPublicKey: '0x...',      // ECDH public key
  referralId: 0,                    // Optional
  eventCode: 0,                     // Optional
});
```

**Returns:** `RFQRequest`

### encodeRequestForQuotation()

Encode RFQ request for transaction submission.

```typescript
const { to, data } = client.optionFactory.encodeRequestForQuotation(request);

// Send with your wallet
const tx = await signer.sendTransaction({ to, data });
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `request` | `RFQRequest` | Complete RFQ request |

**Returns:** `{ to: string; data: string }`

### requestForQuotation()

Create an RFQ directly (requires signer).

```typescript
const receipt = await client.optionFactory.requestForQuotation(request);
```

**Returns:** `TransactionReceipt`

### getQuotation()

Get quotation details by ID.

```typescript
const quotation = await client.optionFactory.getQuotation(quotationId);
```

**Returns:** `Quotation`

### getQuotationCount()

Get total number of quotations created.

```typescript
const count = await client.optionFactory.getQuotationCount();
```

**Returns:** `bigint`

### makeOfferForQuotation()

Submit an encrypted offer for a quotation (market maker function).

```typescript
await client.optionFactory.makeOfferForQuotation({
  quotationId: 1n,
  signature: '0x...',
  signingKey: '0x...',
  encryptedOffer: '0x...',
});
```

### revealOffer()

Reveal an offer after the offer period ends.

```typescript
await client.optionFactory.revealOffer({
  quotationId: 1n,
  offerAmount: 50000000n,  // 50 USDC in 6 decimals
  nonce: 12345n,
  offeror: '0x...',
});
```

### settleQuotation()

Settle a quotation after reveal phase.

```typescript
await client.optionFactory.settleQuotation(quotationId);
```

### cancelQuotation()

Cancel an unfilled quotation (requester only).

```typescript
await client.optionFactory.cancelQuotation(quotationId);
```

### settleQuotationEarly()

Accept a specific offer before the offer period ends (requester only). Requires decrypting the offer first.

```typescript
// First decrypt the offer
const decrypted = await client.rfqKeys.decryptOffer(
  offer.signedOfferForRequester,
  offer.signingKey
);

// Then settle early
await client.optionFactory.settleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offerorAddress
);
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `quotationId` | `bigint` | The RFQ ID to settle |
| `offerAmount` | `bigint` | Offer amount from decrypted offer |
| `nonce` | `bigint` | Nonce from decrypted offer |
| `offeror` | `string` | Address of the market maker |

### cancelOfferForQuotation()

Cancel your offer for a quotation (market maker only).

```typescript
await client.optionFactory.cancelOfferForQuotation(quotationId);
```

### encodeSettleQuotation()

Encode settlement transaction for wallet integration.

```typescript
const { to, data } = client.optionFactory.encodeSettleQuotation(quotationId);

// Use with any wallet
await wallet.sendTransaction({ to, data });
```

### encodeSettleQuotationEarly()

Encode early settlement transaction for wallet integration.

```typescript
const { to, data } = client.optionFactory.encodeSettleQuotationEarly(
  quotationId,
  offerAmount,
  nonce,
  offeror
);
```

### encodeCancelQuotation()

Encode cancellation transaction for wallet integration.

```typescript
const { to, data } = client.optionFactory.encodeCancelQuotation(quotationId);
```

### encodeCancelOfferForQuotation()

Encode offer cancellation transaction for wallet integration.

```typescript
const { to, data } = client.optionFactory.encodeCancelOfferForQuotation(quotationId);
```

---

## RFQKeyManager Module

Manages ECDH keypairs for the sealed-bid auction RFQ workflow. Handles encryption and decryption of offer details.

Access via `client.rfqKeys`.

### getOrCreateKeyPair()

Get or create an ECDH keypair for the current chain.

```typescript
const keyPair = await client.rfqKeys.getOrCreateKeyPair();

console.log(keyPair.compressedPublicKey);  // Use in RFQ creation
console.log(keyPair.privateKey);           // Keep secret!
```

**Returns:**

```typescript
interface RFQKeyPair {
  privateKey: string;           // 32-byte hex private key
  compressedPublicKey: string;  // 33-byte hex compressed public key
  publicKey: string;            // 65-byte hex uncompressed public key
}
```

### encryptOffer()

Encrypt offer details for a requester (market maker function).

```typescript
const nonce = client.rfqKeys.generateNonce();
const encrypted = await client.rfqKeys.encryptOffer(
  offerAmount,           // bigint
  nonce,                 // bigint
  requesterPublicKey     // from RFQ event
);

// Use in makeOfferForQuotation
await client.optionFactory.makeOfferForQuotation({
  quotationId,
  signature,
  signingKey: encrypted.signingKey,
  encryptedOffer: encrypted.ciphertext,
});
```

### decryptOffer()

Decrypt an offer (requester function). Required for early settlement.

```typescript
const decrypted = await client.rfqKeys.decryptOffer(
  encryptedData,      // from OfferMade event
  offerorPublicKey    // signingKey from OfferMade event
);

console.log(decrypted.offerAmount);  // bigint
console.log(decrypted.nonce);        // bigint

// Now you can settle early
await client.optionFactory.settleQuotationEarly(
  quotationId,
  decrypted.offerAmount,
  decrypted.nonce,
  offerorAddress
);
```

### generateNonce()

Generate a random nonce for offer encryption.

```typescript
const nonce = client.rfqKeys.generateNonce();  // bigint
```

### importFromPrivateKey()

Import an existing keypair from a private key.

```typescript
const keyPair = await client.rfqKeys.importFromPrivateKey(
  '0x...',  // 32-byte hex private key
  true      // store in storage (default: true)
);
```

### exportPrivateKey()

Export the current keypair's private key (for backup).

```typescript
const privateKey = await client.rfqKeys.exportPrivateKey();
// Store securely - losing this means you can't decrypt offers!
```

---

## Option Module

Manages option positions and queries option state.

### getFullOptionInfo()

Get complete option information in a single call.

```typescript
const info = await client.option.getFullOptionInfo(optionAddress);

console.log(info.info);             // Basic option info
console.log(info.buyer);            // Buyer address
console.log(info.seller);           // Seller address
console.log(info.isExpired);        // boolean
console.log(info.isSettled);        // boolean
console.log(info.numContracts);     // bigint
console.log(info.collateralAmount); // bigint
```

**Returns:**

```typescript
interface FullOptionInfo {
  info: OptionInfo;
  buyer: string;
  seller: string;
  isExpired: boolean;
  isSettled: boolean;
  numContracts: bigint;
  collateralAmount: bigint;
}

interface OptionInfo {
  optionType: bigint;
  strikes: bigint[];
  expiryTimestamp: bigint;
  collateralToken: string;
  priceFeed: string;
  implementation: string;
}
```

### getOptionInfo()

Get basic option information.

```typescript
const info = await client.option.getOptionInfo(optionAddress);
```

### getBuyer() / getSeller()

Get buyer or seller address.

```typescript
const buyer = await client.option.getBuyer(optionAddress);
const seller = await client.option.getSeller(optionAddress);
```

### isExpired() / isSettled()

Check option state.

```typescript
const expired = await client.option.isExpired(optionAddress);
const settled = await client.option.isSettled(optionAddress);
```

### getNumContracts() / getCollateralAmount()

Get position details.

```typescript
const contracts = await client.option.getNumContracts(optionAddress);
const collateral = await client.option.getCollateralAmount(optionAddress);
```

### calculatePayout()

Calculate payout at a given settlement price.

```typescript
const payout = await client.option.calculatePayout(
  optionAddress,
  200000000000n  // $2000 in 8 decimals
);
```

### close()

Close a position (requires signer).

```typescript
const result = await client.option.close(optionAddress);
```

### payout()

Execute payout after expiry (requires signer).

```typescript
const result = await client.option.payout(optionAddress);
```

### transfer()

Transfer position to another address.

```typescript
const result = await client.option.transfer(
  optionAddress,
  true,           // isBuyer
  '0xNewOwner'
);
```

### split()

Split a position into two.

```typescript
const result = await client.option.split(
  optionAddress,
  splitCollateralAmount
);
```

---

## MM Pricing Module

Fetches and filters market maker pricing data. MM pricing includes fee adjustments and collateral costs, typically resulting in prices 10-20% different from raw exchange prices.

### Collateral APR Rates

The SDK uses these APR rates for collateral cost calculations. These values match the production `mm_bot.py` implementation.

| Collateral | Symbol | APR | Description |
|------------|--------|-----|-------------|
| Bitcoin | cbBTC | 1% | Lowest rate for BTC collateral |
| Ethereum | WETH | 4% | Medium rate for ETH collateral |
| US Dollar | USDC | 7% | Highest rate for stablecoin collateral |

**Source of truth:** `mm_bot.py` (thetanuts_rfq/scripts/mm_bot.py:789-794)

**Collateral Cost Formula:**

```
collateralCost = collateralAmount × APR × timeToExpiryYears
```

**Example:** For a $2000 PUT with 1-month expiry using USDC collateral:
- Collateral Amount: $2000
- APR: 7% (USD)
- Time to Expiry: 1/12 year
- Collateral Cost: $2000 × 0.07 × (1/12) = **$11.67 per contract**

See [RFQ Workflow - Collateral Handling](RFQ_WORKFLOW.md#collateral-handling) for more details on when collateral is required.

### Spread-Level Collateral Cost (Multi-Leg Structures)

For multi-leg structures (spreads, condors, butterflies), collateral cost is calculated differently than vanilla options. Instead of summing the per-leg collateral costs, the SDK uses a **spread-level** calculation based on the structure's width (maximum loss).

**Spread Collateral Cost Formula:**

```
spreadCollateralCost = width × USD_APR × timeToExpiryYears
```

Where:
- `width` = spread width in USD (difference between strikes, i.e., max loss per contract)
- `USD_APR` = 7% (0.07)
- `timeToExpiryYears` = time to expiry in years

**Why Width-Based?**

The collateral required for a spread is limited to the maximum loss (the width), not the full notional of each leg. Therefore, the collateral cost should be based on the actual capital at risk.

**Example: ETH Put Spread 2200/2000**

For a put spread with strikes $2200/$2000 and 11 days to expiry (T ≈ 0.03 years):

| Calculation Method | Formula | Result |
|-------------------|---------|--------|
| **Correct (Width-based)** | $200 × 0.07 × 0.03 | **$0.42** |
| ~~Incorrect (Sum of legs)~~ | ~~$2200 × 0.07 × 0.03 + $2000 × 0.07 × 0.03~~ | ~~$8.82~~ |

The width-based calculation correctly reflects that only $200 of capital is at risk per contract, not the full strike values.

### getAllPricing()

Get all option pricing for an underlying.

```typescript
const allETH = await client.mmPricing.getAllPricing('ETH');
const allBTC = await client.mmPricing.getAllPricing('BTC');

// Returns Record<ticker, MMVanillaPricing>
```

**Returns:**

```typescript
interface MMVanillaPricing {
  ticker: string;              // 'ETH-16FEB26-1800-P'
  underlying: string;          // 'ETH'
  expiry: number;              // Unix timestamp
  strike: number;              // Human-readable
  isCall: boolean;
  rawBidPrice: number;         // Exchange bid
  rawAskPrice: number;         // Exchange ask
  feeAdjustedBid: number;      // After fee adjustment
  feeAdjustedAsk: number;      // After fee adjustment
  bidIv: number;               // Bid implied volatility
  askIv: number;               // Ask implied volatility
  byCollateral: {              // Per-collateral pricing
    USDC: MMCollateralPricing;
    WETH?: MMCollateralPricing;
    cbBTC?: MMCollateralPricing;
  };
}
```

### getTickerPricing()

Get pricing for a specific option ticker.

```typescript
const pricing = await client.mmPricing.getTickerPricing('ETH-16FEB26-1800-P');
```

### getPositionPricing()

Get position pricing with collateral cost calculation.

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
console.log(position.perContractPrice);
```

### Filter & Sort Utilities

```typescript
const all = await client.mmPricing.getAllPricing('ETH');
const values = Object.values(all);

// Filter out expired options
const active = client.mmPricing.filterExpired(values);

// Sort by expiry then strike
const sorted = client.mmPricing.sortByExpiryAndStrike(values);

// Get unique expiry dates
const expiries = client.mmPricing.getUniqueExpiries(values);
// ['2025-02-16', '2025-03-16', ...]

// Filter by type
const puts = client.mmPricing.filterByType(values, false);
const calls = client.mmPricing.filterByType(values, true);

// Filter by expiry date
const feb16 = client.mmPricing.filterByExpiry(values, '2025-02-16');

// Filter by strike range
const nearATM = client.mmPricing.filterByStrikeRange(values, 1800, 2200);

// Convenience: sorted, non-expired array
const pricing = await client.mmPricing.getPricingArray('ETH');
```

### Spread/Condor/Butterfly Pricing

Multi-leg structures use spread-level collateral cost (see [Spread-Level Collateral Cost](#spread-level-collateral-cost-multi-leg-structures)).

```typescript
// Spread pricing
const spread = await client.mmPricing.getSpreadPricing({
  underlying: 'ETH',
  strikes: [180000000000n, 200000000000n],  // 8 decimals
  expiry: 1741334400,
  isCall: true,
});

// Access pricing breakdown
console.log(spread.netSpreadPrice);       // Fee-adjusted price (no CC)
console.log(spread.spreadCollateralCost); // Spread CC in USD
console.log(spread.widthUsd);             // Spread width (max loss)
console.log(spread.netMmAskPrice);        // Final ask (includes CC)
console.log(spread.netMmBidPrice);        // Final bid (excludes CC)

// Condor pricing
const condor = await client.mmPricing.getCondorPricing({
  underlying: 'ETH',
  strikes: [170000000000n, 180000000000n, 200000000000n, 210000000000n],
  expiry: 1741334400,
  type: 'iron',  // 'call' | 'put' | 'iron'
});

// Butterfly pricing
const butterfly = await client.mmPricing.getButterflyPricing({
  underlying: 'ETH',
  strikes: [180000000000n, 190000000000n, 200000000000n],
  expiry: 1741334400,
  isCall: true,
});
```

**MMSpreadPricing Response:**

| Field | Type | Description |
|-------|------|-------------|
| `nearLeg` | `MMVanillaPricing` | Pricing for near strike leg |
| `farLeg` | `MMVanillaPricing` | Pricing for far strike leg |
| `netSpreadPrice` | `number` | Fee-adjusted spread price WITHOUT collateral cost (in underlying terms) |
| `spreadCollateralCost` | `number` | Spread-level collateral cost in USD (width × 0.07 × T) |
| `widthUsd` | `number` | Spread width in USD (max loss per contract) |
| `netMmAskPrice` | `number` | Final MM ask price (netSpreadPrice + CC in underlying terms) |
| `netMmBidPrice` | `number` | Final MM bid price (netSpreadPrice - CC in underlying terms) |
| `maxLoss` | `number` | Maximum loss per contract (same as widthUsd) |
| `collateral` | `bigint` | Collateral required (6 decimals for USDC) |
| `type` | `string` | `'call_spread'` or `'put_spread'` |

**MMCondorPricing Response:**

| Field | Type | Description |
|-------|------|-------------|
| `legs` | `MMVanillaPricing[4]` | All four leg prices |
| `netCondorPrice` | `number` | Fee-adjusted condor price WITHOUT collateral cost |
| `spreadCollateralCost` | `number` | Spread-level collateral cost in USD |
| `netMmAskPrice` | `number` | Final MM ask price |
| `netMmBidPrice` | `number` | Final MM bid price |
| `spreadWidth` | `number` | Width of first spread in USD |
| `collateral` | `bigint` | Collateral required |
| `type` | `string` | `'call_condor'`, `'put_condor'`, or `'iron_condor'` |

**MMButterflyPricing Response:**

| Field | Type | Description |
|-------|------|-------------|
| `legs` | `MMVanillaPricing[3]` | All three leg prices |
| `netButterflyPrice` | `number` | Fee-adjusted butterfly price WITHOUT collateral cost |
| `spreadCollateralCost` | `number` | Spread-level collateral cost in USD |
| `netMmAskPrice` | `number` | Final MM ask price |
| `netMmBidPrice` | `number` | Final MM bid price |
| `width` | `number` | Wing width in USD |
| `collateral` | `bigint` | Collateral required |
| `type` | `string` | `'call_butterfly'` or `'put_butterfly'` |

---

## Utils Module

Utility functions for decimal conversions and calculations.

### toBigInt()

Convert human-readable value to bigint.

```typescript
const usdc = client.utils.toBigInt('100.5', 6);   // 100500000n
const weth = client.utils.toBigInt('1.5', 18);    // 1500000000000000000n
```

### fromBigInt()

Convert bigint to human-readable string.

```typescript
const display = client.utils.fromBigInt(100500000n, 6);  // '100.5'
```

### strikeToChain()

Convert strike price to on-chain format (8 decimals). Uses string-based parsing to avoid floating-point errors.

```typescript
const strikeOnChain = client.utils.strikeToChain(1850.5);
// Returns: 185050000000n
```

### strikeFromChain()

Convert on-chain strike to human-readable number.

```typescript
const strikeNumber = client.utils.strikeFromChain(185050000000n);
// Returns: 1850.5
```

### Convenience Methods

```typescript
// USDC conversions
client.utils.toUsdcDecimals('100.5');      // 100500000n
client.utils.fromUsdcDecimals(100500000n); // '100.5'

// Strike conversions
client.utils.toStrikeDecimals(1850);           // 185000000000n
client.utils.fromStrikeDecimals(185000000000n); // '1850'
```

### calculatePayout()

Calculate option payout.

```typescript
const payout = client.utils.calculatePayout({
  type: 'call',                    // 'call' | 'put' | 'call_spread' | 'put_spread'
  strikes: [200000000000n],        // Strike(s) in 8 decimals
  settlementPrice: 250000000000n,  // Settlement price in 8 decimals
  numContracts: 10000000000000000000n,  // In 18 decimals
});
```

### Decimal Constants

```typescript
import { DECIMALS } from '@thetanuts/thetanuts-client';

DECIMALS.USDC   // 6
DECIMALS.WETH   // 18
DECIMALS.cbBTC  // 8
DECIMALS.PRICE  // 8
DECIMALS.SIZE   // 18
```

---

## ERC20 Module

Token operations for approvals, balances, and transfers.

### approve()

Approve token spending.

```typescript
const receipt = await client.erc20.approve(
  tokenAddress,
  spenderAddress,
  amount  // In token's smallest unit
);
```

### encodeApprove()

Encode approval for external wallet submission.

```typescript
const { to, data } = client.erc20.encodeApprove(
  tokenAddress,
  spenderAddress,
  amount
);

// Send with viem/wagmi
const hash = await walletClient.sendTransaction({ to, data });
```

### getAllowance()

Check current allowance.

```typescript
const allowance = await client.erc20.getAllowance(
  tokenAddress,
  ownerAddress,
  spenderAddress
);
```

### ensureAllowance()

Approve if current allowance is insufficient.

```typescript
const result = await client.erc20.ensureAllowance(
  tokenAddress,
  spenderAddress,
  requiredAmount
);

if (result.approved) {
  console.log('Approval tx:', result.txHash);
} else {
  console.log('Allowance was already sufficient');
}
```

### getBalance()

Get token balance.

```typescript
const balance = await client.erc20.getBalance(tokenAddress, userAddress);
```

### getDecimals()

Get token decimals (cached).

```typescript
const decimals = await client.erc20.getDecimals(tokenAddress);
```

### transfer()

Transfer tokens (requires signer).

```typescript
const receipt = await client.erc20.transfer(
  tokenAddress,
  toAddress,
  amount
);
```

---

## API Module

Fetch data from Thetanuts APIs. Methods are organized by data source:
- **Indexer API**: `*FromIndexer` suffix
- **State/RFQ API**: `*FromRfq` suffix

### fetchOrders()

Fetch all available orders.

```typescript
const orders = await client.api.fetchOrders();
```

### filterOrders()

Fetch orders with filters.

```typescript
const callOrders = await client.api.filterOrders({
  isCall: true,
  minExpiry: Math.floor(Date.now() / 1000),
});
```

### getMarketData()

Get current market prices.

```typescript
const data = await client.api.getMarketData();

console.log(data.prices.BTC);
console.log(data.prices.ETH);
console.log(data.prices.SOL);
```

### getUserPositionsFromIndexer()

Get user positions from Indexer API.

```typescript
const positions = await client.api.getUserPositionsFromIndexer(address);
```

### getUserHistoryFromIndexer()

Get user trade history from Indexer API.

```typescript
const history = await client.api.getUserHistoryFromIndexer(address);
```

### getStatsFromIndexer()

Get protocol statistics.

```typescript
const stats = await client.api.getStatsFromIndexer();

console.log(stats.uniqueUsers);
console.log(stats.openPositions);
console.log(stats.totalOptionsTracked);
```

### getUserRFQsFromRfq()

Get user RFQs from State/RFQ API.

```typescript
const rfqs = await client.api.getUserRFQsFromRfq(address);
```

### getRFQFromRfq()

Get specific RFQ by ID.

```typescript
const rfq = await client.api.getRFQFromRfq(quotationId);
```

### getReferrerStatsFromIndexer()

Get referrer statistics.

```typescript
const stats = await client.api.getReferrerStatsFromIndexer(referrerAddress);
```

---

## Key Storage Providers

The SDK provides storage providers for persisting RFQ encryption keys across sessions.

### FileStorageProvider

File-based storage for Node.js environments. This is the **default** for Node.js applications.

```typescript
import { FileStorageProvider, ThetanutsClient } from '@thetanuts/thetanuts-client';

// Default location: ./.thetanuts-keys/
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
});

// Custom location
const storage = new FileStorageProvider('./my-custom-keys');
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: storage,
});
```

**Features:**
- Keys persist to disk across process restarts
- Directory created with `0o700` permissions (owner only)
- Key files have `0o600` permissions (owner read/write only)
- Atomic writes prevent corruption
- Path traversal protection via key ID sanitization

**Methods:**

| Method | Returns | Description |
|--------|---------|-------------|
| `get(keyId)` | `Promise<string \| null>` | Retrieve stored key |
| `set(keyId, privateKey)` | `Promise<void>` | Store a key |
| `remove(keyId)` | `Promise<void>` | Delete a key |
| `has(keyId)` | `Promise<boolean>` | Check if key exists |
| `getBasePath()` | `string` | Get storage directory path |

### LocalStorageProvider

Browser localStorage-based storage. This is the **default** for browser environments.

```typescript
import { LocalStorageProvider, ThetanutsClient } from '@thetanuts/thetanuts-client';

// Auto-selected in browser
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
});

// Or explicit
const storage = new LocalStorageProvider();
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: storage,
});
```

**Features:**
- Keys persist across browser sessions
- Requires `window.localStorage` availability
- Keys stored with chain-specific identifiers

### MemoryStorageProvider

In-memory storage for testing or ephemeral use.

```typescript
import { MemoryStorageProvider, ThetanutsClient } from '@thetanuts/thetanuts-client';

const storage = new MemoryStorageProvider();
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: storage,
});
```

**⚠️ Warning:** Keys are lost when the process exits. Only use for testing.

**Additional Methods:**

| Method | Description |
|--------|-------------|
| `clear()` | Remove all stored keys (useful for test cleanup) |

### Custom Storage Provider

Implement the `KeyStorageProvider` interface for custom storage backends:

```typescript
import type { KeyStorageProvider } from '@thetanuts/thetanuts-client';

class DatabaseStorageProvider implements KeyStorageProvider {
  async get(keyId: string): Promise<string | null> {
    // Fetch from database
    return await db.query('SELECT private_key FROM keys WHERE id = ?', [keyId]);
  }

  async set(keyId: string, privateKey: string): Promise<void> {
    // Store in database
    await db.query('INSERT INTO keys (id, private_key) VALUES (?, ?)', [keyId, privateKey]);
  }

  async remove(keyId: string): Promise<void> {
    await db.query('DELETE FROM keys WHERE id = ?', [keyId]);
  }

  async has(keyId: string): Promise<boolean> {
    const result = await db.query('SELECT 1 FROM keys WHERE id = ?', [keyId]);
    return result.length > 0;
  }
}
```

---

## Data Types

### Greeks

Option Greeks are included in order data from the API. Access via `order.rawApiData.greeks`.

```typescript
interface Greeks {
  /** Delta: Price sensitivity to underlying price changes (-1 to 1) */
  delta: number;
  /** Implied Volatility: Market's volatility expectation (0 to 1+) */
  iv: number;
  /** Gamma: Rate of change of delta */
  gamma: number;
  /** Theta: Time decay per day (negative for long options) */
  theta: number;
  /** Vega: Sensitivity to volatility changes */
  vega: number;
}
```

**Usage Example:**

```typescript
const orders = await client.api.fetchOrders();

for (const order of orders) {
  if (order.rawApiData?.greeks) {
    const { delta, iv, gamma, theta, vega } = order.rawApiData.greeks;

    console.log(`Delta: ${delta.toFixed(4)}`);
    console.log(`IV: ${(iv * 100).toFixed(1)}%`);
    console.log(`Gamma: ${gamma.toFixed(6)}`);
    console.log(`Theta: ${theta.toFixed(4)}/day`);
    console.log(`Vega: ${vega.toFixed(4)}`);
  }
}
```

**When Greeks are null:**
- Greeks may be unavailable for illiquid options
- Very short-dated options near expiry
- Options outside normal trading parameters

### PositionSettlement

Settlement details for closed or settled positions.

```typescript
interface PositionSettlement {
  /** Settlement price from oracle (8 decimals) */
  settlementPrice: bigint;
  /** Payout to buyer (collateral decimals) */
  payoutBuyer: bigint;
  /** Collateral returned to seller (collateral decimals) */
  collateralReturnedSeller: bigint;
  /** Whether the option was exercised (ITM at expiry) */
  exercised: boolean;
  /** Physical delivery amount (for physical settlement) */
  deliveryAmount: bigint;
  /** Collateral for physical delivery */
  deliveryCollateral: bigint;
  /** Whether settlement was an explicit user decision */
  explicitDecision: boolean;
  /** Whether oracle failed during settlement */
  oracleFailure: boolean;
  /** Reason for oracle failure if applicable */
  oracleFailureReason: string;
}
```

**Usage Example:**

```typescript
const positions = await client.api.getUserPositionsFromIndexer(address);

for (const position of positions) {
  if (position.settlement) {
    const s = position.settlement;

    console.log(`Settlement Price: $${Number(s.settlementPrice) / 1e8}`);
    console.log(`Exercised: ${s.exercised ? 'Yes' : 'No'}`);
    console.log(`Buyer Payout: ${s.payoutBuyer}`);
    console.log(`Seller Return: ${s.collateralReturnedSeller}`);

    if (s.oracleFailure) {
      console.log(`Oracle Failed: ${s.oracleFailureReason}`);
    }
  }
}
```

### Position

User position with full details from the Indexer API.

```typescript
interface Position {
  // Core fields
  id: string;                    // Position ID
  optionAddress: string;         // Option contract address
  side: 'buyer' | 'seller';      // Position side
  amount: bigint;                // Number of contracts (18 decimals)
  entryPrice: bigint;            // Entry price (collateral decimals)
  currentValue: bigint;          // Current market value
  pnl: bigint;                   // Unrealized PnL

  // Option details
  option: {
    underlying: string;          // 'ETH' or 'BTC'
    collateral: string;          // Collateral token address
    strikes: bigint[];           // Strike prices (8 decimals)
    expiry: number;              // Expiry timestamp
    optionType: number;          // Option type enum
  };

  // Status and participants
  status: string;                // 'open', 'closed', 'settled'
  buyer: string;                 // Buyer wallet address
  seller: string;                // Seller wallet address
  referrer: string;              // Referrer address
  createdBy: string;             // Position creator address

  // Entry details
  entryTimestamp: bigint;        // Entry timestamp
  entryTxHash: string;           // Entry transaction hash
  entryBlock: bigint;            // Entry block number
  entryFeePaid: bigint;          // Fee paid at entry

  // Collateral details
  collateralAmount: bigint;      // Collateral amount
  collateralSymbol: string;      // Collateral symbol ('USDC', etc.)
  collateralDecimals: number;    // Collateral decimals
  priceFeed: string;             // Chainlink price feed address

  // Close details (when closed/settled)
  closeTimestamp: bigint;        // Close timestamp
  closeTxHash: string;           // Close transaction hash
  closeBlock: bigint;            // Close block number
  explicitClose: boolean;        // Whether explicitly closed by user
  optionTypeRaw: number;         // Raw option type number

  // Settlement (present when settled)
  settlement?: PositionSettlement;
}
```

**Usage Example:**

```typescript
const positions = await client.api.getUserPositionsFromIndexer(address);

for (const position of positions) {
  console.log(`Position: ${position.id}`);
  console.log(`  Status: ${position.status}`);
  console.log(`  Side: ${position.side}`);
  console.log(`  Contracts: ${Number(position.amount) / 1e18}`);
  console.log(`  Collateral: ${position.collateralAmount} ${position.collateralSymbol}`);

  // Entry info
  console.log(`  Entry TX: ${position.entryTxHash}`);
  console.log(`  Entry Fee: ${position.entryFeePaid}`);

  // Participants
  console.log(`  Buyer: ${position.buyer}`);
  console.log(`  Seller: ${position.seller}`);

  // Settlement info
  if (position.settlement) {
    console.log(`  Settlement Price: ${position.settlement.settlementPrice}`);
    console.log(`  Exercised: ${position.settlement.exercised}`);
  }
}
```

### TradeHistory

Trade history entry with extended details.

```typescript
interface TradeHistory {
  // Core fields
  id: string;                    // Trade ID
  timestamp: number;             // Trade timestamp
  txHash: string;                // Transaction hash
  type: 'fill' | 'cancel' | 'exercise' | 'settle' | 'close';
  amount: bigint;                // Amount traded (18 decimals)
  price: bigint;                 // Price per contract

  // Option details
  option: {
    address: string;             // Option contract address
    underlying: string;          // 'ETH' or 'BTC'
    expiry: number;              // Expiry timestamp
  };

  // Extended fields
  status: string;                // Position status
  buyer: string;                 // Buyer address
  seller: string;                // Seller address
  referrer: string;              // Referrer address
  createdBy: string;             // Creator address
  entryBlock: bigint;            // Entry block number
  entryFeePaid: bigint;          // Entry fee paid

  // Collateral info
  collateralAmount: bigint;      // Collateral amount
  collateralSymbol: string;      // Collateral symbol
  collateralDecimals: number;    // Collateral decimals

  // Option info
  priceFeed: string;             // Price feed address
  optionTypeRaw: number;         // Raw option type
  strikes: bigint[];             // Strike prices

  // Close info
  explicitClose: boolean;        // Whether explicitly closed
  closeTimestamp: bigint;        // Close timestamp
  closeTxHash: string;           // Close tx hash
  closeBlock: bigint;            // Close block number

  // Settlement
  settlement?: PositionSettlement;
}
```

**Usage Example:**

```typescript
const history = await client.api.getUserHistoryFromIndexer(address);

for (const trade of history) {
  console.log(`Trade: ${trade.id}`);
  console.log(`  Type: ${trade.type}`);
  console.log(`  Amount: ${Number(trade.amount) / 1e18} contracts`);
  console.log(`  Price: ${trade.price}`);
  console.log(`  TX: ${trade.txHash}`);

  if (trade.settlement) {
    console.log(`  Settlement Price: ${trade.settlement.settlementPrice}`);
  }
}
```

---

## Type Exports

Import types for TypeScript projects:

```typescript
import type {
  // Client
  ThetanutsClientConfig,
  ChainConfig,

  // RFQ
  RFQBuilderParams,
  SpreadRFQParams,
  ButterflyRFQParams,
  CondorRFQParams,
  IronCondorRFQParams,
  PhysicalOptionRFQParams,
  PhysicalSpreadRFQParams,
  PhysicalButterflyRFQParams,
  PhysicalCondorRFQParams,
  PhysicalIronCondorRFQParams,
  RFQRequest,
  QuotationParameters,
  QuotationTracking,
  RFQUnderlying,
  RFQOptionType,
  RFQCollateralToken,

  // Option
  OptionInfo,
  FullOptionInfo,
  PayoutCalculation,

  // MM Pricing
  MMVanillaPricing,
  MMPositionPricing,
  MMCollateralPricing,
  MMSpreadPricing,
  MMCondorPricing,
  MMButterflyPricing,

  // Utils
  PayoutType,
  PayoutParams,

  // API
  OrderWithSignature,
  Position,
  PositionSettlement,
  TradeHistory,
  ProtocolStats,

  // Key Storage
  KeyStorageProvider,
  FileStorageProvider,
  LocalStorageProvider,
  MemoryStorageProvider,
} from '@thetanuts/thetanuts-client';
```

---

## See Also

- [SDK Quick Reference](SDK_QUICK_REFERENCE.md) - Quick reference for common operations
- [RFQ Workflow Guide](RFQ_WORKFLOW.md) - Complete RFQ lifecycle
- [Migration Guide](MIGRATION_GUIDE.md) - Upgrading from previous versions
- [Error Codes](ERROR_CODES.md) - Error handling reference
