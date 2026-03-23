# Chain Configuration

This directory contains network configuration for supported blockchain networks.

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base Mainnet | 8453 | Supported |

## Configuration Structure

### ChainConfig Interface

```typescript
interface ChainConfig {
  // Basic info
  chainId: number;
  name: string;

  // Contract addresses
  contracts: {
    optionBook: string;
    optionFactory: string;
  };

  // Implementation addresses for option strategies
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
  };

  // Token configurations
  tokens: {
    [symbol: string]: {
      address: string;
      symbol: string;
      decimals: number;
    };
  };

  // API endpoints
  apiBaseUrl: string;
  indexerApiUrl: string;
  pricingApiUrl: string;
  wsBaseUrl: string;
  stateApiUrl: string;   // RFQ state indexer

  // RPC endpoints
  defaultRpcUrls: string[];
}
```

## Base Mainnet Configuration (8453_v6)

```typescript
const baseMainnet: ChainConfig = {
  chainId: 8453,
  name: 'Base',

  contracts: {
    optionBook: '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1',
    optionFactory: '0x1aDcD391CF15Fb699Ed29B1D394F4A64106886e5',
  },

  implementations: {
    PUT: '0xF480F636301d50Ed570D026254dC5728b746A90F',
    INVERSE_CALL: '0x3CeB524cBA83D2D4579F5a9F8C0D1f5701dd16FE',
    CALL_SPREAD: '0x4D75654bC616F64F6010d512C3B277891FB52540',
    PUT_SPREAD: '0xC9767F9a2f1eADC7Fdcb7f0057E829D9d760E086',
    CALL_FLY: '0xD8EA785ab2A63a8a94C38f42932a54A3E45501c3',
    PUT_FLY: '0x1fE24872Ab7c83BbA26Dc761ce2EA735c9b96175',
    CALL_CONDOR: '0xbb5d2EB2D354D930899DaBad01e032C76CC3c28f',
    PUT_CONDOR: '0xbdAcC00Dc3F6e1928D9380c17684344e947aa3Ec',
    IRON_CONDOR: '0x494Cd61b866D076c45564e236D6Cb9e011a72978',
  },

  tokens: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      decimals: 6,
    },
    WETH: {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      decimals: 18,
    },
    cbBTC: {
      address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
      symbol: 'cbBTC',
      decimals: 8,
    },
  },

  apiBaseUrl: 'https://round-snowflake-9c31.devops-118.workers.dev',
  indexerApiUrl: 'https://optionbook-indexer.thetanuts.finance/api/v1',
  pricingApiUrl: 'https://pricing.thetanuts.finance',
  wsBaseUrl: 'wss://ws.thetanuts.finance/v4',
  stateApiUrl: 'https://dry-cake-8c44.devops-118.workers.dev',
  defaultRpcUrls: ['https://mainnet.base.org', 'https://base.llamarpc.com'],
};
```

## Exported Functions

### getChainConfigById

Get the full chain configuration for a given chain ID.

```typescript
import { getChainConfigById } from '@thetanuts-finance/thetanuts-client';

const config = getChainConfigById(8453);
console.log(config.name); // 'Base'
console.log(config.contracts.optionBook); // '0xd58b814...'
```

### getTokenConfigById

Get token configuration for a specific chain and token symbol.

```typescript
import { getTokenConfigById } from '@thetanuts-finance/thetanuts-client';

const usdc = getTokenConfigById(8453, 'USDC');
console.log(usdc.address);  // '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
console.log(usdc.decimals); // 6
```

### getSupportedTokensById

Get list of all supported tokens for a chain.

```typescript
import { getSupportedTokensById } from '@thetanuts-finance/thetanuts-client';

const tokens = getSupportedTokensById(8453);
// Returns: ['USDC', 'WETH', 'cbBTC']
```

### isChainIdSupported

Check if a chain ID is supported.

```typescript
import { isChainIdSupported } from '@thetanuts-finance/thetanuts-client';

isChainIdSupported(8453);  // true
isChainIdSupported(1);     // false (Ethereum mainnet not supported)
```

## Price Feeds

The SDK uses Chainlink price feeds for BTC and ETH pricing:

| Asset | Price Feed Address |
|-------|-------------------|
| BTC | `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F` |
| ETH | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` |

## Adding New Chains

To add support for a new chain:

1. Add chain configuration to `chains/index.ts`
2. Update the `SupportedChainId` type in `types/client.ts`
3. Add contract addresses for the new chain
4. Add token configurations

```typescript
// Example: Adding Arbitrum
const arbitrum: ChainConfig = {
  chainId: 42161,
  name: 'Arbitrum',
  contracts: {
    optionBook: '0x...',
    optionFactory: '0x...',
  },
  // ... rest of config
};
```

## API Endpoints

| Endpoint | Purpose | URL Pattern |
|----------|---------|-------------|
| Orders API | Fetch available orders | `{apiBaseUrl}/` |
| Indexer API | User positions, stats | `{indexerApiUrl}/...` |
| Pricing API | Greeks, IV surfaces | `{pricingApiUrl}/...` |
| State API | RFQ state indexer | `{stateApiUrl}/api/state` |
| WebSocket | Real-time updates | `{wsBaseUrl}` |
