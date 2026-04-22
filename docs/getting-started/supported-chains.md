# Supported Chains

The chains where the Thetanuts SDK is currently available, and how to access per-chain contract addresses from the SDK.

## Supported Chains

| Chain | Chain ID | Status |
|-------|----------|--------|
| Base Mainnet | 8453 | Supported |

## Chain Configuration

Access all contract addresses and token configs from the client — no hardcoding required:

```typescript
const config = client.chainConfig;

// Tokens
config.tokens.USDC.address;  // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
config.tokens.USDC.decimals; // 6
config.tokens.WETH.address;  // 0x4200000000000000000000000000000000000006
config.tokens.cbBTC.address; // 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf

// Option implementations
config.implementations.PUT;           // PUT option implementation
config.implementations.INVERSE_CALL;  // CALL option implementation
config.implementations.PHYSICAL_PUT;  // Physically settled PUT
config.implementations.PHYSICAL_CALL; // Physically settled CALL

// Price feeds
config.priceFeeds.ETH;  // Chainlink ETH/USD feed
config.priceFeeds.BTC;  // Chainlink BTC/USD feed
```

---

## See also

- [Overview](./overview.md)
- [Installation](./installation.md)
- [Configuration](./configuration.md)
