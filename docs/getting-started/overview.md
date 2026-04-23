# Overview

TypeScript SDK for Thetanuts Finance V4 — options trading on EVM chains.

## Features

- **Complete Options Trading**: Fill orders, manage positions, handle RFQs
- **Settlement Types**: Cash-settled and physically settled options
- **Multi-Strategy Support**: Spreads, butterflies, condors, iron condors (cash-settled)
- **Real-time Data**: WebSocket subscriptions for live updates
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Modular Design**: Use only what you need
- **ESM and CJS builds**: Maximum compatibility

## OptionBook vs RFQ

The SDK supports two trading systems. Choose based on your use case:

|  | **OptionBook** | **RFQ (Factory)** |
|---|---|---|
| **What** | Fill existing market-maker orders | Create custom options via sealed-bid auction |
| **When to use** | Quick trades on listed options | Custom strikes, expiries, multi-leg structures |
| **Structures** | Vanilla only | Vanilla, spread, butterfly, condor, iron condor |
| **Key methods** | `fillOrder()`, `previewFillOrder()` | `buildRFQRequest()`, `requestForQuotation()` |
| **Pricing** | Order prices from `fetchOrders()` | MM pricing from `getAllPricing()` |
| **Data source** | Book indexer (`/api/v1/book/`) | Factory indexer (`/api/v1/factory/`) |
| **User data** | `getUserPositionsFromIndexer()` | `getUserRfqs()`, `getUserOptionsFromRfq()` |
| **Stats** | `getBookProtocolStats()`, `getBookDailyStats()` | `getFactoryProtocolStats()`, `getFactoryDailyStats()` |
| **Collateral** | Paid upfront by taker | `collateralAmount = 0` (held by factory) |
| **Settlement** | Cash-settled (payout in USDC/WETH/cbBTC based on price difference at expiry) | Cash-settled or physically settled (actual delivery of underlying at expiry) |

---

## See also

- [Installation](./installation.md)
- [Quick Start](./quick-start.md)
- [Supported Chains](./supported-chains.md)
