# Chain Config

The chain configuration bundles all on-chain addresses, token metadata, price feeds, and API endpoints for a supported network. Access it via `client.chainConfig`.

Currently supported: **Base Mainnet** (chain ID `8453`).

## Accessing Chain Config

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });
const config = client.chainConfig;
```

## Tokens

| Symbol | Address | Decimals |
|--------|---------|----------|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| WETH | `0x4200000000000000000000000000000000000006` | 18 |
| cbBTC | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` | 8 |

```typescript
config.tokens.USDC.address;   // '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
config.tokens.USDC.decimals;  // 6
config.tokens.WETH.address;   // '0x4200000000000000000000000000000000000006'
config.tokens.WETH.decimals;  // 18
config.tokens.cbBTC.address;  // '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf'
config.tokens.cbBTC.decimals; // 8
```

## Option Implementations

### Cash-Settled

| Key | Address | Description |
|-----|---------|-------------|
| `PUT` | `0xF480F636301d50Ed570D026254dC5728b746A90F` | Vanilla PUT |
| `INVERSE_CALL` | `0x3CeB524cBA83D2D4579F5a9F8C0D1f5701dd16FE` | Vanilla CALL |
| `CALL_SPREAD` | `0x4D75654bC616F64F6010d512C3B277891FB52540` | Call spread (2 strikes) |
| `PUT_SPREAD` | `0xC9767F9a2f1eADC7Fdcb7f0057E829D9d760E086` | Put spread (2 strikes) |
| `CALL_FLY` | `0xD8EA785ab2A63a8a94C38f42932a54A3E45501c3` | Call butterfly (3 strikes) |
| `PUT_FLY` | `0x1fE24872Ab7c83BbA26Dc761ce2EA735c9b96175` | Put butterfly (3 strikes) |
| `CALL_CONDOR` | `0xbb5d2EB2D354D930899DaBad01e032C76CC3c28f` | Call condor (4 strikes) |
| `PUT_CONDOR` | `0xbdAcC00Dc3F6e1928D9380c17684344e947aa3Ec` | Put condor (4 strikes) |
| `IRON_CONDOR` | `0x494Cd61b866D076c45564e236D6Cb9e011a72978` | Iron condor (4 strikes) |

### Physically Settled

| Key | Description |
|-----|-------------|
| `PHYSICAL_CALL` | Vanilla physically settled CALL |
| `PHYSICAL_PUT` | Vanilla physically settled PUT |
| `PHYSICAL_CALL_SPREAD` | Physical CALL spread (2 strikes) |
| `PHYSICAL_PUT_SPREAD` | Physical PUT spread (2 strikes) |
| `PHYSICAL_CALL_FLY` | Physical CALL butterfly (3 strikes) |
| `PHYSICAL_PUT_FLY` | Physical PUT butterfly (3 strikes) |
| `PHYSICAL_CALL_CONDOR` | Physical CALL condor (4 strikes) |
| `PHYSICAL_PUT_CONDOR` | Physical PUT condor (4 strikes) |
| `PHYSICAL_IRON_CONDOR` | Physical iron condor (4 strikes) |

```typescript
// Cash-settled
config.implementations.PUT;
config.implementations.INVERSE_CALL;
config.implementations.PUT_SPREAD;
config.implementations.CALL_SPREAD;
config.implementations.PUT_FLY;
config.implementations.CALL_FLY;
config.implementations.PUT_CONDOR;
config.implementations.CALL_CONDOR;
config.implementations.IRON_CONDOR;

// Physically settled
config.implementations.PHYSICAL_CALL;
config.implementations.PHYSICAL_PUT;
config.implementations.PHYSICAL_CALL_SPREAD;
config.implementations.PHYSICAL_PUT_SPREAD;
config.implementations.PHYSICAL_CALL_FLY;
config.implementations.PHYSICAL_PUT_FLY;
config.implementations.PHYSICAL_CALL_CONDOR;
config.implementations.PHYSICAL_PUT_CONDOR;
config.implementations.PHYSICAL_IRON_CONDOR;
```

## Price Feeds (Chainlink)

| Asset | Feed Address |
|-------|-------------|
| ETH | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |
| BTC | `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F` |

```typescript
config.priceFeeds.ETH;  // Chainlink ETH/USD feed
config.priceFeeds.BTC;  // Chainlink BTC/USD feed
```

## Contracts

| Contract | Address |
|----------|---------|
| `optionBook` | `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1` |
| `optionFactory` | `0x1aDcD391CF15Fb699Ed29B1D394F4A64106886e5` |

```typescript
config.contracts.optionBook;     // '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1'
config.contracts.optionFactory;  // '0x1aDcD391CF15Fb699Ed29B1D394F4A64106886e5'
```

## API Endpoints

| Field | Purpose | Default URL |
|-------|---------|-------------|
| `apiBaseUrl` | Orders API | `https://round-snowflake-9c31.devops-118.workers.dev` |
| `indexerApiUrl` | Book indexer (positions, stats) | `https://optionbook-indexer.thetanuts.finance/api/v1` |
| `pricingApiUrl` | Greeks and IV surfaces | `https://pricing.thetanuts.finance` |
| `stateApiUrl` | RFQ state indexer | `https://dry-cake-8c44.devops-118.workers.dev` |
| `wsBaseUrl` | WebSocket server | `wss://ws.thetanuts.finance/v4` |

## ChainConfig Interface

```typescript
interface ChainConfig {
  chainId: number;
  name: string;

  contracts: {
    optionBook: string;
    optionFactory: string;
  };

  implementations: {
    PUT: string;
    INVERSE_CALL: string;
    CALL_SPREAD: string;
    PUT_SPREAD: string;
    CALL_FLY: string;
    PUT_FLY: string;
    CALL_CONDOR: string;
    PUT_CONDOR: string;
    IRON_CONDOR: string;
    // Physical implementations also included
  };

  tokens: {
    [symbol: string]: {
      address: string;
      symbol: string;
      decimals: number;
    };
  };

  priceFeeds: {
    ETH: string;
    BTC: string;
  };

  apiBaseUrl: string;
  indexerApiUrl: string;
  pricingApiUrl: string;
  wsBaseUrl: string;
  stateApiUrl: string;

  defaultRpcUrls: string[];
}
```

## Helper Functions

These exported functions let you access chain config without a client instance:

```typescript
import {
  getChainConfigById,
  getTokenConfigById,
  getSupportedTokensById,
  isChainIdSupported,
} from '@thetanuts-finance/thetanuts-client';

// Full config
const config = getChainConfigById(8453);
console.log(config.name);                    // 'Base'
console.log(config.contracts.optionBook);    // '0xd58b814...'

// Single token
const usdc = getTokenConfigById(8453, 'USDC');
console.log(usdc.address);   // '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
console.log(usdc.decimals);  // 6

// All tokens
const tokens = getSupportedTokensById(8453);
// ['USDC', 'WETH', 'cbBTC']

// Chain support check
isChainIdSupported(8453);  // true
isChainIdSupported(1);     // false
```

## Never Hardcode Addresses

Always read addresses from `client.chainConfig` rather than hardcoding them. This ensures your code works correctly if addresses change in a future SDK release:

```typescript
// Preferred
const usdcAddress = client.chainConfig.tokens.USDC.address;
const optionBook  = client.chainConfig.contracts.optionBook;

// Then use in approvals and transactions
await client.erc20.ensureAllowance(usdcAddress, optionBook, amount);
```

---

## See Also

- [Decimal Reference](./decimals.md) — Token decimal table
- [Client](./client.md) — ThetanutsClient properties
- [../getting-started/configuration.md](../getting-started/configuration.md) — Getting started with configuration
