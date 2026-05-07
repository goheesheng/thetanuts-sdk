# Wheel Vault Module

Deposit into Gyro wheel-strategy vaults on Ethereum mainnet. Each vault sells covered calls and cash-secured puts on a single underlying (WBTC, XAUt, SPYon) and routes premiums back to LPs.

## Chain

`client.wheelVault` is **Ethereum mainnet only** (`chainId 1`). Calls throw `NETWORK_UNSUPPORTED` when the client is configured for any other chain. To use this module, instantiate the client with `chainId: 1`.

```typescript
const client = new ThetanutsClient({ chainId: 1, provider, signer });
```

---

## How It Works

A WheelVault holds a paired position (e.g. WBTC + USDC) and sells weekly options against it. Each vault has multiple "series" — each series is one cohort of LPs sharing one option-selling cycle.

1. **LPs deposit** the vault's two assets and receive shares pinned to a series
2. **Vault sells options** when triggered (calls when shares are quote-heavy, puts when base-heavy)
3. **Buyers fill** through the Markets contract, paying premium per contract
4. **At expiry**, options either expire worthless (LPs keep premium) or get exercised (LPs deliver underlying at the strike)
5. **LPs withdraw** their share of the post-cycle vault state

The Markets and Lens layers expose the order book, depth chart, and per-buyer/per-seller views.

---

## Quick Start

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient, WHEEL_VAULT_CONFIG } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 1, provider, signer });

const wbtcVault = WHEEL_VAULT_CONFIG.assets.WBTC.vault;

// Read state of the active series
const seriesId = (await client.wheelVault.getSeriesCount(wbtcVault)) - 1;
const state = await client.wheelVault.getVaultState(wbtcVault, seriesId);
console.log(state.baseBalance, state.quoteBalance, state.totalShares);

// Preview a deposit (returns expected shares minted)
const expectedShares = await client.wheelVault.previewDeposit(
  wbtcVault,
  seriesId,
  ethers.parseUnits('0.01', 8),  // 0.01 WBTC
  ethers.parseUnits('1000', 6),  // 1000 USDC
);

// Deposit (requires prior ERC20 approvals on both base and quote tokens)
const result = await client.wheelVault.deposit(
  wbtcVault,
  seriesId,
  ethers.parseUnits('0.01', 8),
  ethers.parseUnits('1000', 6),
  state.lastPrice,  // expectedPrice for slippage check
);
console.log(`Shares minted: ${result.sharesMinted}`);
```

---

## Method Overview

### Vault state (read-only)

| Method | Description |
|--------|-------------|
| `getVaultState(vault, seriesId)` | Full state snapshot: balances, shares, last price, options outstanding |
| `getSeries(vault, seriesId)` | Raw on-chain series struct |
| `getSeriesCount(vault)` | Number of series in the vault (use `count - 1` for the active one) |
| `getSnapshots(vault, seriesId)` | Historical share-value snapshots for accounting |
| `getEpochExpiries(vault, seriesId)` | Per-epoch option expiry timestamps |
| `getShareValueInQuote(vault, seriesId, shares)` | Mark a share balance to quote-asset value |
| `getSeriesAssets(vault, seriesId)` | Total base + quote held by the series |
| `bsBaseDelta(vault, seriesId, price?)` | Black-Scholes base delta for the active option |
| `previewDeposit(vault, seriesId, baseAmt, quoteAmt)` | Pre-flight: expected shares minted |
| `previewWithdraw(vault, seriesId, shares)` | Pre-flight: expected base/quote returned |
| `estimateDepositSplit(vault, seriesId, depositAmount)` | Suggest how to split a single-asset deposit |

### Vault writes

| Method | Description | Signer |
|--------|-------------|--------|
| `deposit(vault, seriesId, baseAmt, quoteAmt, expectedPrice)` | Deposit both assets, receive shares | Yes |
| `withdraw(vault, seriesId, shares)` | Burn shares, receive pro-rata assets | Yes |
| `withdrawIdle(vault, seriesId)` | Withdraw shares not deployed in current option | Yes |
| `depositSingle(params)` | Router-side single-asset deposit (auto-splits via swap) | Yes |
| `depositDual(params)` | Router-side dual-asset deposit | Yes |
| `withdrawSingle(params)` | Router-side single-asset withdraw | Yes |
| `withdrawSingleWithPermit(params)` | Same as `withdrawSingle` with EIP-2612 permit | Yes |
| `poke(vault)` | Settle expired options without triggering a new one | Yes |
| `trigger(vault)` | Settle expired options AND start the next option-selling cycle | Yes |

### Markets (option order book)

| Method | Description | Signer |
|--------|-------------|--------|
| `marketFill(markets, params)` | Buyer-side: fill outstanding sell orders at IV | Yes |
| `depositToBucket(markets, params)` | Place a buy order at a target IV bucket | Yes |
| `cancelDeposit(markets, entryId)` | Cancel an outstanding bucket deposit | Yes |
| `claim(markets, token)` | Claim accrued premium/payout in a token | Yes |
| `exercise(markets, optionId)` | Exercise an in-the-money option held as buyer | Yes |
| `expire(markets, optionId)` | Settle an expired option | Yes |
| `swapAndExercise(markets, params)` | Swap → exercise in one transaction | Yes |

### Lens helpers (read-only views)

| Method | Description |
|--------|-------------|
| `getDepthChart(lens, underlying, optionExpiry)` | Depth-chart data across IV buckets |
| `previewFillPremium(lens, premiumPerContract, trancheIndex)` | Preview premium for a partial fill |
| `getBuyerOptions(lens, buyer)` | All options held by a buyer address |
| `getSellerPositions(lens, seller)` | All seller exposures across markets |
| `getClaimableSummary(lens, address)` | Aggregate claimable amounts per token |
| `previewExercise(lens, optionId)` | Pre-flight: settlement amounts for an exercise |
| `getUniswapPositions(positionIds)` | Decode V3 NFT positions referenced by the vault |

`multicall(calls)` is also exposed for batching low-level reads.

---

## Configuration

The `WHEEL_VAULT_CONFIG` constant exports vault, markets, lens, router, and shared infrastructure addresses. Use it to look up addresses without hardcoding them.

```typescript
import { WHEEL_VAULT_CONFIG } from '@thetanuts-finance/thetanuts-client';

WHEEL_VAULT_CONFIG.assets.WBTC.vault;        // 0x77D5d8c8...
WHEEL_VAULT_CONFIG.assets.WBTC.markets;      // 0x38E7ab2D...
WHEEL_VAULT_CONFIG.assets.WBTC.marketsLens;  // 0x5C28f508...
WHEEL_VAULT_CONFIG.contracts.router;         // 0x53A14b15...
WHEEL_VAULT_CONFIG.contracts.lens;           // 0xf5b1D7B8...
```

---

## Contract Addresses (Ethereum)

### Vaults

| Asset | Vault | Markets | Markets Lens |
|-------|-------|---------|--------------|
| WBTC | `0x77D5d8c86cC66f95Fa8cdacFa7105dF0BC4d9AA9` | `0x38E7ab2D8b6c3e6149B8085f34E8C832c5eFDAD1` | `0x5C28f508529c097dc26c86f6b74D0249ae17eb6e` |
| XAUt | `0x6C8753ACCbB9d370D63d684c03D607C91b8E1602` | `0x249a7f751382Fc39A50bd5Dc0CC17f4d54af78Bc` | `0xbD42297982BA6A65aDA1D9B759fcF855395157C0` |
| SPYon | `0xAe3bae89890213c43FeEe4B98b7e34645652cFe1` | `0xe6656Fc4360023Af9a6d8917a74563B9ce2fe91F` | `0x0709b125936FAf0022a23CB295Cb298faf4d137a` |

### Shared infrastructure

| Contract | Address |
|----------|---------|
| Router | `0x53A14b15CaDBB02725B8ABf781a5e91bdB1bC1Ab` |
| Lens | `0xf5b1D7B8885B40676A9f27e979F8F6d8e7D4fcD1` |
| USDC (quote) | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Uniswap V3 NPM | `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` |

Markets constants: `ivMin = 2000` (20%), `ivMax = 20000` (200%), `ivTick = 500` (5%), `exerciseWindow = 3600s`.

---

## See Also

- [Modules Overview](../reference/modules-overview.md) — All client modules at a glance
- [Strategy Vault](../strategy-vault/overview.md) — Base-side fixed-strike + CLVEX vaults
- [Token Operations](../guides/token-operations.md) — ERC20 approvals required before deposits
