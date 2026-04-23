# RFQ (Factory) Overview

Create custom options through a sealed-bid auction — choose any strike, expiry, and structure, then let market makers compete to fill your request.

## What is RFQ / Factory?

The RFQ (Request for Quotation) system, also called the **Factory**, lets you create fully custom options that are not listed on the OptionBook. You specify exactly what you want — underlying asset, strike(s), expiry, direction, and structure — and market makers respond with encrypted, competitive offers. The best offer wins and an option contract is deployed atomically at settlement.

Under the hood the OptionFactory contract acts as both auctioneer and deployer: it collects encrypted MM offers, runs the reveal auction, and mints a fresh EIP-1167 proxy option contract (or transfers an existing one) when the trade settles.

## Key Features

- **Privacy via sealed-bid auction** — Offers are encrypted with ECDH until the reveal phase. No MM can see a competitor's bid, preventing front-running and last-second sniping.
- **Competitive pricing** — Multiple market makers respond to each RFQ; the best price (lowest for BUY, highest for SELL) wins.
- **Full collateralization** — Every option created through the factory is 100% collateralized. Collateral is pulled at settlement, not at RFQ creation.
- **Atomic settlement** — Option deployment and collateral/premium transfer happen in a single transaction.
- **Multi-leg structures** — Vanilla, spreads (2-leg), butterflies (3-leg), condors and iron condors (4-leg), plus physically settled variants.
- **Cash or physical settlement** — Cash-settled options pay out the price difference in the collateral token (USDC for PUTs, WETH/cbBTC for CALLs). Physically settled options involve actual delivery of the underlying asset at expiry. Use `buildRFQRequest()` for cash-settled, `buildPhysicalOptionRFQ()` for physically settled (vanilla only).

## OptionBook vs RFQ (Factory)

| | **OptionBook** | **RFQ (Factory)** |
|---|---|---|
| **What** | Fill existing market-maker orders | Create custom options via sealed-bid auction |
| **When to use** | Quick trades on listed options | Custom strikes, expiries, multi-leg structures |
| **Structures** | Vanilla only | Vanilla, spread, butterfly, condor, iron condor |
| **Key methods** | `fillOrder()`, `previewFillOrder()` | `buildRFQRequest()`, `requestForQuotation()` |
| **Pricing** | Order prices from `fetchOrders()` | MM pricing from `getAllPricing()` |
| **Data source** | Book indexer (`/api/v1/book/`) | Factory indexer (`/api/v1/factory/`) |
| **User data** | `getUserPositionsFromIndexer()` | `getUserRfqs()`, `getUserOptionsFromRfq()` |
| **Collateral** | Paid upfront by taker | `collateralAmount = 0` (held by factory) |
| **Settlement** | Cash-settled (payout in USDC/WETH/cbBTC based on price difference at expiry) | Cash-settled or physically settled (actual delivery of underlying at expiry) |

## When to Use RFQ

Choose the RFQ system when you need:

- A **non-standard strike** or expiry not listed in the OptionBook
- A **multi-leg structure** such as a spread, butterfly, or condor
- A **physically settled** option (vanilla only)
- **Price competition** — you want multiple MMs to bid rather than taking a single listed price
- To **close an existing position** by specifying `existingOptionAddress`

Choose the OptionBook when you want a quick fill on a standard listed option and don't need custom parameters.

## High-Level Flow

```
1. You call requestForQuotation() with your ECDH public key
        ↓
2. Market makers see the on-chain event and submit encrypted offers
        ↓
3a. Early settlement: you decrypt an offer and accept it immediately
        — OR —
3b. Offer period ends → MMs reveal their amounts → anyone calls settleQuotation()
        ↓
4. OptionFactory deploys option contract, transfers collateral and premium atomically
        ↓
5. Option expires → oracle provides price → payout distributed
```

## Supported Structures

| Strikes | Structure | Settlement | Implementation | SDK Method |
|---------|-----------|------------|----------------|------------|
| 1 | Vanilla | Cash | `PUT` / `INVERSE_CALL` | `buildRFQRequest()` |
| 1 | Vanilla | Physical | `PHYSICAL_PUT` / `PHYSICAL_CALL` | `buildPhysicalOptionRFQ()` |
| 2 | Spread | Cash | `PUT_SPREAD` / `CALL_SPREAD` | `buildRFQRequest()` or `buildSpreadRFQ()` |
| 3 | Butterfly | Cash | `PUT_FLY` / `CALL_FLY` | `buildRFQRequest()` or `buildButterflyRFQ()` |
| 4 | Condor | Cash | `PUT_CONDOR` / `CALL_CONDOR` | `buildRFQRequest()` or `buildCondorRFQ()` |
| 4 | Iron Condor | Cash | `IRON_CONDOR` | `buildRFQRequest()` or `buildIronCondorRFQ()` |

The SDK detects the structure automatically from the length of the `strikes` array passed to `buildRFQParams()` or `buildRFQRequest()`.

---

## See Also

- [Create an RFQ](create-rfq.md) — Step-by-step guide to submitting your first RFQ
- [RFQ Lifecycle](lifecycle.md) — Detailed phases, collateral handling, and settlement paths
- [Multi-Leg Structures](multi-leg-structures.md) — Spreads, butterflies, and condors with examples
