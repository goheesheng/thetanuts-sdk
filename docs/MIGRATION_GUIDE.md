# Migration Guide

This guide helps existing users upgrade to the latest SDK patterns and APIs.

## Table of Contents

- [Breaking Changes](#breaking-changes)
- [New Helper Methods](#new-helper-methods)
- [Code Migration Examples](#code-migration-examples)
- [Deprecation Notices](#deprecation-notices)

---

## Breaking Changes

### collateralAmount Parameter

**The most critical change:** `collateralAmount` must now **always be 0** when creating RFQs.

#### Before (Incorrect Pattern)

```typescript
// ❌ OLD: Calculating and passing collateralAmount
const strike = 1850;
const numContracts = 1.5;
const collateralAmount = BigInt(Math.round(strike * numContracts * 1e6));

const params = {
  // ...
  collateralAmount: collateralAmount,  // WRONG!
  // ...
};
```

#### After (Correct Pattern)

```typescript
// ✅ NEW: collateralAmount is always 0
const params = {
  // ...
  collateralAmount: BigInt(0),  // ALWAYS 0
  // ...
};

// Or use buildRFQParams which enforces this automatically
const params = client.optionFactory.buildRFQParams({
  // ... collateralAmount is set to 0 internally
});
```

#### Why This Changed

Collateral is **NOT** locked at RFQ creation time. It is pulled from both parties at **settlement** time. The `collateralAmount` parameter in RFQ was misleading and should always be 0.

**For SELL positions:** You still need to calculate collateral, but only for **token approval**:

```typescript
// For SELL positions, approve tokens before creating RFQ
const strike = 1850;
const numContracts = 1.5;

// PUT: approval = strike * numContracts
const approval = BigInt(Math.round(strike * numContracts * 1e6));
await client.erc20.approve(USDC, optionFactoryAddress, approval);

// Then create RFQ with collateralAmount = 0
const params = client.optionFactory.buildRFQParams({
  isLong: false,  // SELL
  // ...
});
```

---

## New Helper Methods

### buildRFQParams()

High-level RFQ builder that:
- **Enforces `collateralAmount = 0`** automatically
- Resolves addresses from chain config (no hardcoding)
- Handles decimal conversions

```typescript
// Before: Manual address lookup and decimal handling
const params = {
  requester: userAddress,
  existingOptionAddress: '0x0000000000000000000000000000000000000000',
  collateral: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',  // Hardcoded USDC
  collateralPriceFeed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',  // Hardcoded
  implementation: '0xF480F636301d50Ed570D026254dC5728b746A90F',  // Hardcoded
  strikes: [BigInt(1850) * BigInt(1e8)],
  numContracts: BigInt(Math.round(1.5 * 1e6)),
  // ... more manual conversions
};

// After: Clean, type-safe builder
const params = client.optionFactory.buildRFQParams({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,           // Human-readable
  numContracts: 1.5,      // Human-readable
  expiry: 1741334400,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
});
```

### buildRFQRequest()

Complete RFQ request builder including tracking and reserve price:

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
  reservePrice: 0.015,        // Optional: max per-contract price
  requesterPublicKey: '0x...', // ECDH public key
});

const { to, data } = client.optionFactory.encodeRequestForQuotation(request);
```

### strikeToChain() / strikeFromChain()

Precision-safe strike conversion using string-based parsing (avoids floating-point errors):

```typescript
// Before: Potential floating-point issues
const strike = BigInt(Math.round(1850.5 * 1e8));  // May have precision errors

// After: Safe conversion
const strike = client.utils.strikeToChain(1850.5);  // 185050000000n
const display = client.utils.strikeFromChain(185050000000n);  // 1850.5
```

### getFullOptionInfo()

Aggregated option info in a single call (replaces multiple Promise.all patterns):

```typescript
// Before: Multiple individual calls
const [info, buyer, seller, isExpired, isSettled, numContracts, collateralAmount] =
  await Promise.all([
    client.option.getOptionInfo(optionAddress),
    client.option.getBuyer(optionAddress),
    client.option.getSeller(optionAddress),
    client.option.isExpired(optionAddress),
    client.option.isSettled(optionAddress),
    client.option.getNumContracts(optionAddress),
    client.option.getCollateralAmount(optionAddress),
  ]);

// After: Single aggregated call
const fullInfo = await client.option.getFullOptionInfo(optionAddress);
console.log(fullInfo.info);
console.log(fullInfo.buyer);
console.log(fullInfo.seller);
console.log(fullInfo.isExpired);
console.log(fullInfo.isSettled);
console.log(fullInfo.numContracts);
console.log(fullInfo.collateralAmount);
```

### MM Pricing Filter Utilities

New utilities for filtering and sorting pricing data:

```typescript
const all = await client.mmPricing.getAllPricing('ETH');
const values = Object.values(all);

// Filter expired
const active = client.mmPricing.filterExpired(values);

// Sort by expiry then strike
const sorted = client.mmPricing.sortByExpiryAndStrike(values);

// Get unique expiries
const expiries = client.mmPricing.getUniqueExpiries(values);

// Filter by type
const puts = client.mmPricing.filterByType(values, false);

// Filter by expiry
const feb16 = client.mmPricing.filterByExpiry(values, '2025-02-16');

// Filter by strike range
const nearATM = client.mmPricing.filterByStrikeRange(values, 1800, 2200);

// Convenience: sorted, non-expired array
const pricing = await client.mmPricing.getPricingArray('ETH');
```

---

## Code Migration Examples

### Example 1: RFQ Creation for BUY Position

```typescript
// ========== BEFORE ==========
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PUT_IMPL = '0xF480F636301d50Ed570D026254dC5728b746A90F';
const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';

const strike = 1850;
const numContracts = 1.5;
const strikeScaled = BigInt(strike) * BigInt(1e8);
const numContractsScaled = BigInt(Math.round(numContracts * 1e6));

const params = {
  requester: userAddress,
  existingOptionAddress: ethers.ZeroAddress,
  collateral: USDC,
  collateralPriceFeed: ETH_FEED,
  implementation: PUT_IMPL,
  strikes: [strikeScaled],
  numContracts: numContractsScaled,
  requesterDeposit: BigInt(0),
  collateralAmount: BigInt(1000000),  // WRONG - was calculated
  expiryTimestamp: BigInt(expiry),
  offerEndTimestamp: BigInt(Math.floor(Date.now() / 1000) + 3600),
  isRequestingLongPosition: true,
  convertToLimitOrder: false,
  extraOptionData: '0x',
};

const { to, data } = client.optionFactory.encodeRequestForQuotation({
  params,
  tracking: { referralId: BigInt(0), eventCode: BigInt(0) },
  reservePrice: BigInt(0),
  requesterPublicKey: publicKey,
});

// ========== AFTER ==========
const request = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,
  numContracts: 1.5,
  expiry: expiry,
  isLong: true,
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  requesterPublicKey: publicKey,
});

const { to, data } = client.optionFactory.encodeRequestForQuotation(request);
```

### Example 2: RFQ Creation for SELL Position

```typescript
// ========== BEFORE ==========
// Calculate approval manually
const strike = 1850;
const numContracts = 1.5;
const approval = BigInt(Math.round(strike * numContracts * 1e6));

await client.erc20.approve(USDC, optionFactory, approval);

const params = {
  // ... same as BUY but with incorrect collateralAmount
  collateralAmount: approval,  // WRONG!
  isRequestingLongPosition: false,
};

// ========== AFTER ==========
// Step 1: Approve tokens (still required for SELL)
const strike = 1850;
const numContracts = 1.5;
const approval = BigInt(Math.round(strike * numContracts * 1e6));
await client.erc20.approve(
  client.chainConfig.tokens.USDC.address,
  client.optionFactory.contractAddress,
  approval
);

// Step 2: Build RFQ (collateralAmount = 0 enforced automatically)
const request = client.optionFactory.buildRFQRequest({
  requester: userAddress,
  underlying: 'ETH',
  optionType: 'PUT',
  strike: 1850,
  numContracts: 1.5,
  expiry: expiry,
  isLong: false,  // SELL
  offerDeadlineMinutes: 60,
  collateralToken: 'USDC',
  requesterPublicKey: publicKey,
});

const { to, data } = client.optionFactory.encodeRequestForQuotation(request);
```

### Example 3: Option Position Queries

```typescript
// ========== BEFORE ==========
// Multiple separate calls
const buyer = await client.option.getBuyer(optionAddress);
const seller = await client.option.getSeller(optionAddress);
const isExpired = await client.option.isExpired(optionAddress);
const numContracts = await client.option.getNumContracts(optionAddress);

// Or Promise.all pattern
const [buyer, seller, isExpired, numContracts] = await Promise.all([
  client.option.getBuyer(optionAddress),
  client.option.getSeller(optionAddress),
  client.option.isExpired(optionAddress),
  client.option.getNumContracts(optionAddress),
]);

// ========== AFTER ==========
// Single aggregated call
const info = await client.option.getFullOptionInfo(optionAddress);

console.log(info.buyer);
console.log(info.seller);
console.log(info.isExpired);
console.log(info.numContracts);
```

### Example 4: Strike Price Conversion

```typescript
// ========== BEFORE ==========
// Manual conversion with potential precision issues
const strikeNumber = 1850.5;
const strikeOnChain = BigInt(Math.round(strikeNumber * 1e8));

// Parsing back
const strikeDisplay = Number(strikeOnChain) / 1e8;

// ========== AFTER ==========
// Safe string-based conversion
const strikeOnChain = client.utils.strikeToChain(1850.5);
const strikeDisplay = client.utils.strikeFromChain(strikeOnChain);
```

---

## Deprecation Notices

### Deprecated Patterns

| Pattern | Status | Replacement |
|---------|--------|-------------|
| Hardcoded contract addresses | Deprecated | Use `client.chainConfig` |
| Manual `collateralAmount` calculation | Deprecated | Always use `BigInt(0)` or `buildRFQParams()` |
| Multiple Promise.all for option info | Deprecated | Use `getFullOptionInfo()` |
| Manual strike scaling | Deprecated | Use `strikeToChain()` / `strikeFromChain()` |

### API Method Renames

To clarify data sources, some API methods have been renamed:

| Old Method | New Method | Data Source |
|------------|------------|-------------|
| `getUserPositions()` | `getUserPositionsFromIndexer()` | Indexer API |
| `getUserHistory()` | `getUserHistoryFromIndexer()` | Indexer API |
| `getStats()` | `getStatsFromIndexer()` | Indexer API |
| `getUserRFQs()` | `getUserRFQsFromRfq()` | State/RFQ API |
| `getRFQ()` | `getRFQFromRfq()` | State/RFQ API |

The old method names are still available as aliases but may be removed in a future version.

---

## See Also

- [SDK Quick Reference](SDK_QUICK_REFERENCE.md) - Quick reference guide
- [API Reference](API_REFERENCE.md) - Complete API documentation
- [RFQ Workflow Guide](RFQ_WORKFLOW.md) - RFQ lifecycle explanation
- [Error Codes](ERROR_CODES.md) - Error handling reference
