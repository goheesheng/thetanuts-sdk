# Type Exports

All TypeScript types and classes exported from `@thetanuts-finance/thetanuts-client`, grouped by domain.

## Full Import Example

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
  IronCondorRFQParams,
  PhysicalOptionRFQParams,
  PhysicalSpreadRFQParams,
  PhysicalButterflyRFQParams,
  PhysicalCondorRFQParams,
  PhysicalIronCondorRFQParams,

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

  // RFQ Key Manager
  RFQKeyPair,
  EncryptedOffer,
  DecryptedOffer,
  KeyStorageProvider,
} from '@thetanuts-finance/thetanuts-client';

// Storage Providers (concrete classes, not just types)
import {
  FileStorageProvider,
  LocalStorageProvider,
  MemoryStorageProvider,
} from '@thetanuts-finance/thetanuts-client';
```

## Grouped by Domain

### Client

| Export | Kind | Description |
|--------|------|-------------|
| `ThetanutsClientConfig` | `type` | Constructor options for `ThetanutsClient` |
| `ChainConfig` | `type` | Chain configuration shape (contracts, tokens, feeds, URLs) |

### RFQ

| Export | Kind | Description |
|--------|------|-------------|
| `RFQBuilderParams` | `type` | Parameters for `buildRFQParams()` |
| `RFQRequest` | `type` | Complete RFQ request ready for submission |
| `QuotationParameters` | `type` | On-chain quotation parameters |
| `QuotationTracking` | `type` | Tracking fields (referralId, eventCode) |
| `RFQUnderlying` | `type` | `'ETH' \| 'BTC'` |
| `RFQOptionType` | `type` | `'CALL' \| 'PUT'` |
| `RFQCollateralToken` | `type` | `'USDC' \| 'WETH' \| 'cbBTC'` |

### Multi-leg RFQ Helpers

| Export | Kind | Description |
|--------|------|-------------|
| `SpreadRFQParams` | `type` | Parameters for `buildSpreadRFQ()` (2 strikes) |
| `ButterflyRFQParams` | `type` | Parameters for `buildButterflyRFQ()` (3 strikes) |
| `CondorRFQParams` | `type` | Parameters for `buildCondorRFQ()` (4 strikes) |
| `IronCondorRFQParams` | `type` | Parameters for `buildIronCondorRFQ()` (4 strikes) |
| `PhysicalOptionRFQParams` | `type` | Parameters for `buildPhysicalOptionRFQ()` |
| `PhysicalSpreadRFQParams` | `type` | Parameters for `buildPhysicalSpreadRFQ()` |
| `PhysicalButterflyRFQParams` | `type` | Parameters for `buildPhysicalButterflyRFQ()` |
| `PhysicalCondorRFQParams` | `type` | Parameters for `buildPhysicalCondorRFQ()` |
| `PhysicalIronCondorRFQParams` | `type` | Parameters for `buildPhysicalIronCondorRFQ()` |

### Option

| Export | Kind | Description |
|--------|------|-------------|
| `OptionInfo` | `type` | Basic option info (type, strikes, expiry, collateral, priceFeed, implementation) |
| `FullOptionInfo` | `type` | Full option state including buyer, seller, contracts, collateral, expiry/settlement flags |
| `PayoutCalculation` | `type` | Return type of payout calculation methods |

### MM Pricing

| Export | Kind | Description |
|--------|------|-------------|
| `MMVanillaPricing` | `type` | Pricing for a single vanilla option (bid/ask, IV, collateral breakdown) |
| `MMPositionPricing` | `type` | Position pricing including collateral cost and total price |
| `MMCollateralPricing` | `type` | Per-collateral-token pricing details |
| `MMSpreadPricing` | `type` | Spread pricing with width, collateral cost, MM bid/ask |
| `MMCondorPricing` | `type` | Condor pricing with four legs and spread collateral cost |
| `MMButterflyPricing` | `type` | Butterfly pricing with three legs and wing width |

### Utils

| Export | Kind | Description |
|--------|------|-------------|
| `PayoutType` | `type` | `'call' \| 'put' \| 'call_spread' \| 'put_spread'` |
| `PayoutParams` | `type` | Parameters for `calculatePayout()` |

### API

| Export | Kind | Description |
|--------|------|-------------|
| `OrderWithSignature` | `type` | Order as returned from `client.api.fetchOrders()` |
| `Position` | `type` | User position with full details from the indexer |
| `PositionSettlement` | `type` | Settlement details (price, payouts, exercised flag, oracle status) |
| `TradeHistory` | `type` | Trade history entry |
| `ProtocolStats` | `type` | Protocol-wide statistics |

### RFQ Key Manager

| Export | Kind | Description |
|--------|------|-------------|
| `RFQKeyPair` | `type` | ECDH key pair (privateKey, compressedPublicKey, publicKey) |
| `EncryptedOffer` | `type` | Encrypted offer ciphertext and signing key |
| `DecryptedOffer` | `type` | Decrypted offer (offerAmount, nonce) |
| `KeyStorageProvider` | `interface` | Interface for implementing custom key storage backends |

### Storage Providers (classes)

| Export | Kind | Description |
|--------|------|-------------|
| `FileStorageProvider` | `class` | File-based storage for Node.js (default in Node.js) |
| `LocalStorageProvider` | `class` | Browser localStorage storage (default in browser) |
| `MemoryStorageProvider` | `class` | In-memory storage for testing only (keys lost on exit) |

## Usage in TypeScript Projects

When building integrations, import only the types you need:

```typescript
import type { RFQBuilderParams, RFQCollateralToken } from '@thetanuts-finance/thetanuts-client';

function buildMyRFQ(
  strike: number,
  collateral: RFQCollateralToken,
): RFQBuilderParams {
  return {
    requester: '0x...',
    underlying: 'ETH',
    optionType: 'PUT',
    strikes: strike,
    expiry: Math.floor(Date.now() / 1000) + 86400 * 7,
    numContracts: 1,
    isLong: true,
    offerDeadlineMinutes: 60,
    collateralToken: collateral,
  };
}
```

---

## See Also

- [Modules Overview](./modules-overview.md) — All 10 modules at a glance
- [Client](./client.md) — ThetanutsClient constructor and properties
- [../rfq/overview.md](../rfq/overview.md) — RFQ module and workflow
