# Error Codes Reference

This document covers all SDK error codes, common contract revert reasons, and troubleshooting guidance.

## Table of Contents

- [Error Handling Overview](#error-handling-overview)
- [SDK Error Codes](#sdk-error-codes)
- [Error Classes](#error-classes)
- [Contract Revert Reasons](#contract-revert-reasons)
- [Common Issues & Solutions](#common-issues--solutions)
- [Debugging Tips](#debugging-tips)

---

## Error Handling Overview

All SDK methods throw `ThetanutsError` or its subclasses. Use `instanceof` or the error `code` property for handling:

```typescript
import {
  ThetanutsError,
  isThetanutsError,
  ContractRevertError,
  InsufficientAllowanceError,
  OrderExpiredError,
  KeyNotFoundError,
  InvalidKeyError,
  EncryptionError,
  DecryptionError,
} from '@thetanuts-finance/thetanuts-client';

try {
  await client.optionBook.fillOrder(order);
} catch (error) {
  // Option 1: Check error code
  if (isThetanutsError(error)) {
    switch (error.code) {
      case 'INSUFFICIENT_ALLOWANCE':
        console.log('Need to approve tokens first');
        break;
      case 'ORDER_EXPIRED':
        console.log('Order has expired');
        break;
    }
  }

  // Option 2: Use instanceof for typed handling
  if (error instanceof InsufficientAllowanceError) {
    await client.erc20.approve(token, spender, amount);
    // Retry...
  }

  if (error instanceof OrderExpiredError) {
    const freshOrders = await client.api.fetchOrders();
    // Retry with fresh order...
  }
}
```

---

## SDK Error Codes

| Code | Description | Typical Cause |
|------|-------------|---------------|
| `ORDER_EXPIRED` | Order has expired | Order's expiry timestamp has passed |
| `SLIPPAGE_EXCEEDED` | Price moved beyond tolerance | Market moved during transaction |
| `INSUFFICIENT_ALLOWANCE` | Token approval needed | Haven't approved tokens for contract |
| `INSUFFICIENT_BALANCE` | Not enough tokens | Wallet balance too low |
| `NETWORK_UNSUPPORTED` | Chain not supported | Using unsupported chain ID |
| `HTTP_ERROR` | API request failed | Network issues, API downtime |
| `BAD_REQUEST` | Invalid API request | Malformed parameters |
| `NOT_FOUND` | Resource not found | Invalid order ID, address, etc. |
| `RATE_LIMIT` | Rate limit exceeded | Too many API requests |
| `CONTRACT_REVERT` | Contract call failed | Transaction reverted on-chain |
| `INVALID_PARAMS` | Invalid parameters | Wrong types, missing required fields |
| `INVALID_ORDER` | Order validation failed | Malformed order structure |
| `ORDER_NOT_FOUND` | Order doesn't exist | Order ID not in orderbook |
| `SIZE_EXCEEDED` | Fill size too large | Requested more than available |
| `SIGNER_REQUIRED` | Signer needed | Write operation without signer |
| `WEBSOCKET_ERROR` | WebSocket error | Connection issues |
| `KEY_NOT_FOUND` | RFQ key missing | No ECDH keypair generated |
| `INVALID_KEY` | Invalid key format | Corrupted or wrong key format |
| `ENCRYPTION_FAILED` | Encryption failed | ECDH encryption error |
| `DECRYPTION_FAILED` | Decryption failed | Wrong key or corrupted data |
| `UNKNOWN` | Unknown error | Unexpected error |

---

## Error Classes

The SDK provides typed error classes for precise handling:

### Base Class

```typescript
class ThetanutsError extends Error {
  readonly code: ThetanutsErrorCode;
  readonly cause?: unknown;
  readonly meta?: Record<string, unknown>;
}
```

### API Errors

```typescript
// Base API error
class APIError extends ThetanutsError {
  readonly status: number;  // HTTP status code
}

// HTTP 400
class BadRequestError extends APIError {}

// HTTP 404
class NotFoundError extends APIError {}

// HTTP 429
class RateLimitError extends APIError {}
```

### Contract Errors

```typescript
class ContractRevertError extends ThetanutsError {}
class InsufficientAllowanceError extends ThetanutsError {}
class InsufficientBalanceError extends ThetanutsError {}
class OrderExpiredError extends ThetanutsError {}
class SlippageExceededError extends ThetanutsError {}
```

### Client Errors

```typescript
class SignerRequiredError extends ThetanutsError {}
class InvalidParamsError extends ThetanutsError {}
class NetworkUnsupportedError extends ThetanutsError {}
class WebSocketError extends ThetanutsError {}
```

### RFQ Key Errors

```typescript
class KeyNotFoundError extends ThetanutsError {}
class InvalidKeyError extends ThetanutsError {}
class EncryptionError extends ThetanutsError {}
class DecryptionError extends ThetanutsError {}
```

**Error Details:**

| Error Class | Code | Description |
|-------------|------|-------------|
| `KeyNotFoundError` | `KEY_NOT_FOUND` | No ECDH keypair found in storage for this chain |
| `InvalidKeyError` | `INVALID_KEY` | Key format is corrupted or incompatible |
| `EncryptionError` | `ENCRYPTION_FAILED` | Failed to encrypt offer with ECDH/AES-GCM |
| `DecryptionError` | `DECRYPTION_FAILED` | Failed to decrypt offer - wrong key or corrupted data |

---

## Contract Revert Reasons

Common smart contract revert messages and their meanings:

### OptionFactory Contract

| Revert Reason | Cause | Solution |
|---------------|-------|----------|
| `InvalidImplementation` | Unknown option implementation | Use valid implementation from `chainConfig.implementations` |
| `InvalidCollateral` | Unsupported collateral token | Use USDC, WETH, or cbBTC |
| `InvalidExpiry` | Expiry in the past or too far | Set expiry between now and reasonable future |
| `InvalidStrikes` | Strike price invalid | Ensure strikes are positive and properly scaled |
| `OfferPeriodEnded` | Offer period has ended | Cannot make offer after `offerEndTimestamp` |
| `OfferPeriodNotEnded` | Offer period not over | Wait for offer period to end before reveal |
| `RevealPeriodEnded` | Reveal window closed | Reveal within the reveal window |
| `NoOffersToReveal` | No offers submitted | At least one MM offer required |
| `QuotationAlreadySettled` | Already settled | Cannot settle twice |
| `NotRequester` | Wrong caller | Only requester can cancel their RFQ |
| `InvalidSignature` | Bad offer signature | Check EIP-712 signature |

### OptionBook Contract

| Revert Reason | Cause | Solution |
|---------------|-------|----------|
| `OrderExpired` | Order has expired | Fetch fresh orders |
| `OrderCancelled` | Order was cancelled | Use a different order |
| `InsufficientSize` | Not enough to fill | Reduce fill amount |
| `InvalidOrder` | Malformed order | Check order structure |
| `SignatureInvalid` | Bad order signature | Order signature doesn't match |

### ERC20 Errors

| Revert Reason | Cause | Solution |
|---------------|-------|----------|
| `ERC20: insufficient allowance` | Not approved | Call `approve()` first |
| `ERC20: transfer amount exceeds balance` | Not enough tokens | Check balance before transaction |
| `ERC20: approve to the zero address` | Invalid spender | Use valid spender address |

### Option Contract

| Revert Reason | Cause | Solution |
|---------------|-------|----------|
| `NotExpired` | Option not expired yet | Wait for expiry before payout |
| `AlreadySettled` | Already settled | Cannot payout twice |
| `NotBuyer` | Caller is not buyer | Only buyer can execute payout |
| `NotBuyerOrSeller` | Wrong caller | Only buyer/seller can close |
| `TransferNotApproved` | Transfer not approved | Call `approveTransfer()` first |

---

## Common Issues & Solutions

### Issue 1: INSUFFICIENT_ALLOWANCE

**Symptom:** Transaction fails with "insufficient allowance" error

**Cause:** Haven't approved tokens for the contract

**Solution:**

```typescript
// Before filling orders or creating RFQs
await client.erc20.approve(
  tokenAddress,
  client.chainConfig.contracts.optionBook,  // or optionFactory
  amount
);

// Or use ensureAllowance for automatic handling
await client.erc20.ensureAllowance(
  tokenAddress,
  spenderAddress,
  requiredAmount
);
```

### Issue 2: ORDER_EXPIRED

**Symptom:** "Order has expired" error

**Cause:** Order's expiry timestamp has passed

**Solution:**

```typescript
// Check expiry before filling
const now = Math.floor(Date.now() / 1000);
const validOrders = orders.filter(o => Number(o.order.expiry) > now + 60); // 60s buffer

// Always fetch fresh orders
const freshOrders = await client.api.fetchOrders();
```

### Issue 3: SIGNER_REQUIRED

**Symptom:** "Signer is required for this operation"

**Cause:** Attempting write operation without signer

**Solution:**

```typescript
// Initialize client with signer
const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  signer: wallet,  // Add signer for write ops
});

// Or use encode methods for external wallet
const { to, data } = client.optionBook.encodeFillOrder(order);
const tx = await walletClient.sendTransaction({ to, data });
```

### Issue 4: RFQ collateralAmount Error

**Symptom:** RFQ fails or behaves unexpectedly

**Cause:** Setting `collateralAmount` to non-zero value

**Solution:**

```typescript
// WRONG
const params = {
  collateralAmount: BigInt(1000000),  // DON'T DO THIS
};

// CORRECT - Always use 0
const params = {
  collateralAmount: BigInt(0),
};

// BEST - Use buildRFQParams which enforces this
const params = client.optionFactory.buildRFQParams({
  // collateralAmount automatically set to 0
});
```

### Issue 5: Strike Precision Errors

**Symptom:** Incorrect strike prices, transactions failing

**Cause:** Floating-point precision issues

**Solution:**

```typescript
// WRONG - May have precision issues
const strike = BigInt(Math.round(1850.5 * 1e8));

// CORRECT - Use precision-safe helper
const strike = client.utils.strikeToChain(1850.5);
```

### Issue 6: Rate Limiting

**Symptom:** HTTP 429 errors

**Cause:** Too many API requests

**Solution:**

```typescript
// Implement retry with exponential backoff
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

const orders = await withRetry(() => client.api.fetchOrders());
```

### Issue 7: WebSocket Disconnection

**Symptom:** Real-time updates stop

**Cause:** Network issues, server restart

**Solution:**

```typescript
// SDK auto-reconnects by default (up to 10 attempts)
// Monitor connection state
client.ws.onStateChange((state) => {
  if (state === 'disconnected') {
    console.log('WebSocket disconnected, will auto-reconnect...');
  }
});

// Manual reconnect if needed
await client.ws.connect();
```

### Issue 8: KEY_NOT_FOUND Error

**Symptom:** `KeyNotFoundError: No RFQ key found in storage`

**Cause:** No ECDH keypair has been generated, or keys were lost (using MemoryStorageProvider)

**Solution:**

```typescript
// Generate a new keypair
const keyPair = await client.rfqKeys.getOrCreateKeyPair();
console.log('Public Key:', keyPair.compressedPublicKey);

// If using MemoryStorageProvider (non-persistent), keys are lost on restart
// Switch to FileStorageProvider for Node.js
import { FileStorageProvider, ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  keyStorageProvider: new FileStorageProvider('./.thetanuts-keys'),
});

// Keys now persist across restarts
```

**Prevention:**
- Use `FileStorageProvider` in Node.js (default)
- Use `LocalStorageProvider` in browsers (default)
- Back up the `.thetanuts-keys/` directory for critical applications

### Issue 9: DECRYPTION_FAILED Error

**Symptom:** `DecryptionError: Failed to decrypt offer data`

**Cause:** Key mismatch between RFQ creation and decryption, or corrupted data

**Solution:**

```typescript
// 1. Verify you're using the same keypair that was used for RFQ creation
const currentKeyPair = await client.rfqKeys.getOrCreateKeyPair();
console.log('Current Public Key:', currentKeyPair.compressedPublicKey);

// 2. Check if the RFQ's requester public key matches
const rfq = await client.api.getRFQFromRfq(quotationId);
console.log('RFQ Public Key:', rfq.requesterPublicKey);

// Keys must match - if they don't, the original private key is needed
if (currentKeyPair.compressedPublicKey !== rfq.requesterPublicKey) {
  console.error('Key mismatch! You need the private key for:', rfq.requesterPublicKey);
  // If you have a backup, import it:
  // await client.rfqKeys.importFromPrivateKey(backupPrivateKey, true);
}

// 3. Verify the offer data is complete
const offers = rfq.offers || [];
for (const offer of offers) {
  console.log('Offeror:', offer.offeror);
  console.log('Has encrypted data:', !!offer.signedOfferForRequester);
  console.log('Has signing key:', !!offer.signingKey);
}

// 4. Attempt decryption
try {
  const decrypted = await client.rfqKeys.decryptOffer(
    offer.signedOfferForRequester,
    offer.signingKey
  );
  console.log('Offer Amount:', decrypted.offerAmount);
  console.log('Nonce:', decrypted.nonce);
} catch (error) {
  if (error instanceof DecryptionError) {
    console.error('Decryption failed - possible causes:');
    console.error('  - Different keypair than used for RFQ creation');
    console.error('  - Corrupted encrypted data');
    console.error('  - Wrong MM public key (signingKey)');
  }
}
```

**Troubleshooting Checklist:**

1. ✅ Is the keypair the same one used when creating the RFQ?
2. ✅ Was the keypair backed up before process restart?
3. ✅ Does `client.rfqKeys.compressedPublicKey` match `rfq.requesterPublicKey`?
4. ✅ Is the `signingKey` from the correct offer?
5. ✅ Is the `signedOfferForRequester` data complete (not truncated)?

### Issue 10: INVALID_KEY Error

**Symptom:** `InvalidKeyError: Invalid key format`

**Cause:** Corrupted key, wrong format, or incompatible key type

**Solution:**

```typescript
// 1. Check if the key file exists and is readable
import { FileStorageProvider } from '@thetanuts-finance/thetanuts-client';

const storage = new FileStorageProvider('./.thetanuts-keys');
const keyId = `rfq-key-8453`;  // Pattern: rfq-key-{chainId}
const hasKey = await storage.has(keyId);
console.log('Key exists:', hasKey);

// 2. If corrupted, regenerate (WARNING: loses ability to decrypt old RFQs!)
if (!hasKey) {
  const newKeyPair = await client.rfqKeys.generateKeyPair();
  console.log('Generated new keypair:', newKeyPair.compressedPublicKey);
}

// 3. Import from backup if available
const backupPrivateKey = '0x...'; // Your backed-up private key
try {
  await client.rfqKeys.importFromPrivateKey(backupPrivateKey, true);
  console.log('Restored from backup');
} catch (error) {
  if (error instanceof InvalidKeyError) {
    console.error('Backup key is also invalid');
  }
}
```

**Key Format Requirements:**
- Private key: 32 bytes, hex string with `0x` prefix
- Compressed public key: 33 bytes, hex string with `0x` prefix (starts with `02` or `03`)
- Uncompressed public key: 65 bytes, hex string with `0x` prefix (starts with `04`)

### Issue 11: ENCRYPTION_FAILED Error

**Symptom:** `EncryptionError: Failed to encrypt offer data`

**Cause:** Invalid requester public key or ECDH computation failure

**Solution:**

```typescript
// This typically happens when the requester's public key is invalid
// Market makers: verify the RFQ's requester public key format

const rfq = await client.optionFactory.getQuotation(quotationId);
const requesterPubKey = rfq.requesterPublicKey;

// Verify format (should be 33-byte compressed key)
if (!requesterPubKey || !requesterPubKey.startsWith('0x')) {
  console.error('Invalid requester public key format');
}

// Length check: 0x + 66 hex chars = 33 bytes
if (requesterPubKey.length !== 68) {
  console.error(`Expected 68 chars, got ${requesterPubKey.length}`);
}

// First byte should be 02 or 03 (compressed point prefix)
const prefix = requesterPubKey.slice(2, 4);
if (prefix !== '02' && prefix !== '03') {
  console.error(`Invalid compressed key prefix: ${prefix}`);
}
```

---

## Debugging Tips

### 1. Enable Debug Logging

```typescript
import { consoleLogger } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({
  chainId: 8453,
  provider,
  logger: consoleLogger,  // Enable debug output
});
```

### 2. Inspect Error Details

```typescript
try {
  await client.optionBook.fillOrder(order);
} catch (error) {
  if (error instanceof ThetanutsError) {
    console.log('Code:', error.code);
    console.log('Message:', error.message);
    console.log('Cause:', error.cause);  // Original error
    console.log('Meta:', error.meta);    // Additional context
  }
}
```

### 3. Verify Contract State

```typescript
// Check option state before operations
const info = await client.option.getFullOptionInfo(optionAddress);
console.log('Expired:', info.isExpired);
console.log('Settled:', info.isSettled);
console.log('Buyer:', info.buyer);
console.log('Seller:', info.seller);
```

### 4. Verify Token State

```typescript
// Check before transactions
const balance = await client.erc20.getBalance(token, userAddress);
const allowance = await client.erc20.getAllowance(token, userAddress, spender);

console.log('Balance:', balance);
console.log('Allowance:', allowance);
console.log('Sufficient:', allowance >= requiredAmount);
```

### 5. Use callStatic for Simulation

```typescript
// Simulate transaction without sending
const result = await client.optionFactory.requestForQuotationCallStatic(request);

if (result.success) {
  // Safe to execute
  await client.optionFactory.requestForQuotation(request);
} else {
  console.log('Would revert:', result.error);
}
```

### 6. Check Gas Estimation

```typescript
// If transaction keeps failing, check gas
try {
  const { to, data } = client.optionBook.encodeFillOrder(order);
  const gasEstimate = await provider.estimateGas({ to, data, from: userAddress });
  console.log('Estimated gas:', gasEstimate);
} catch (error) {
  console.log('Gas estimation failed - transaction would revert');
  console.log('Reason:', error.message);
}
```

---

## See Also

- [SDK Quick Reference](SDK_QUICK_REFERENCE.md) - Quick reference guide
- [API Reference](API_REFERENCE.md) - Complete API documentation
- [RFQ Workflow Guide](RFQ_WORKFLOW.md) - RFQ lifecycle explanation
- [Migration Guide](MIGRATION_GUIDE.md) - Upgrading guide
