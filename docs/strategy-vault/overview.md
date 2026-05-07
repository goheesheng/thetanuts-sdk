# Strategy Vault Module

Deposit into Kairos fixed-strike call vaults and CLVEX directional/condor strategy vaults on Base. Each vault rolls weekly options against deposited collateral and pays accrued yield to share-holders.

## Chain

`client.strategyVault` is **Base only** (`chainId 8453`). Calls throw `NETWORK_UNSUPPORTED` when the client is configured for any other chain.

```typescript
const client = new ThetanutsClient({ chainId: 8453, provider, signer });
```

---

## How It Works

There are two vault families behind one module:

- **Kairos vaults** sell fixed-strike covered calls on aBasWETH (Aave-wrapped WETH on Base). The strike is encoded in the vault name (`ETH-3000`, `ETH-3500`, etc.). Each Friday, the vault writes a weekly call at its strike against deposited collateral; LPs collect premium.
- **CLVEX vaults** run pre-defined directional or condor strategies (`bull`, `bear`, `condor`). The vault decides which structure to write each week based on its strategy.

A vault has one share-class (no series), so depositors mix into a single pool and share gains/losses pro-rata.

1. **LPs deposit** the vault's base asset (e.g. aBasWETH) and receive shares
2. **Vault calls `createOption()`** when eligible (typically once per cycle, gated by `canCreateOption()`)
3. **At expiry**, the option is settled against the underlying price; LPs absorb gains or losses
4. **LPs withdraw** by burning shares for pro-rata vault assets

The module exposes shortcuts to enumerate the live vault rosters (`getKairosVaults`, `getClvexVaults`).

---

## Quick Start

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient, STRATEGY_VAULT_CONFIG } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

// 1. List all live vaults (both families)
const states = await client.strategyVault.getAllVaults();
states.forEach((s) => console.log(s.address, s.totalAssets));

// 2. Pick a Kairos vault (e.g. ETH-3000)
const vaultAddress = STRATEGY_VAULT_CONFIG.kairos.vaults[0].address;
const state = await client.strategyVault.getVaultState(vaultAddress);

// 3. Deposit (assetIndex 0 = base asset, e.g. aBasWETH for Kairos)
const result = await client.strategyVault.deposit(
  vaultAddress,
  ethers.parseUnits('1.0', 18),
  0,
);
console.log(`Deposit tx: ${result.receipt.hash}`);

// 4. Later: check share balance, then withdraw
const myAddress = await signer.getAddress();
const shares = await client.strategyVault.getShareBalance(vaultAddress, myAddress);
await client.strategyVault.withdraw(vaultAddress, shares);
```

---

## Method Overview

### Discovery

| Method | Description |
|--------|-------------|
| `getAllVaults()` | Live state of every Kairos + CLVEX vault |
| `getKairosVaults()` | Live state of Kairos fixed-strike vaults only |
| `getClvexVaults()` | Live state of CLVEX strategy vaults only |
| `getAllVaultStates(addresses[])` | Batch state lookup for an arbitrary vault list |

### State (read-only)

| Method | Description |
|--------|-------------|
| `getVaultState(vault)` | Full snapshot: assets, shares, next expiry, recovery state |
| `getTotalAssets(vault)` | Base + quote assets currently held |
| `getShareBalance(vault, address)` | Share balance for a user |
| `getNextExpiry(vault)` | Unix timestamp for the next option expiry |
| `canCreateOption(vault)` | Whether `createOption()` is eligible right now |
| `isRecoveryMode(vault)` | Whether the vault is paused for emergency withdrawals |

### Writes

| Method | Description | Signer |
|--------|-------------|--------|
| `deposit(vault, amount, assetIndex)` | Deposit base or quote asset, receive shares | Yes |
| `withdraw(vault, shares)` | Burn shares, receive pro-rata assets | Yes |
| `createOption(vault)` | Trigger the next option-selling cycle (anyone can call when eligible) | Yes |

`assetIndex` selects which side of the vault you're depositing — `0` = base asset, `1` = quote asset (vaults that accept both). For Kairos, base = aBasWETH and quote = aBasUSDC.

---

## Configuration

```typescript
import { STRATEGY_VAULT_CONFIG } from '@thetanuts-finance/thetanuts-client';

STRATEGY_VAULT_CONFIG.kairos.vaults;       // 5 fixed-strike ETH vaults
STRATEGY_VAULT_CONFIG.clvex.vaults;        // 3 strategy vaults (bull/bear/condor)
STRATEGY_VAULT_CONFIG.kairos.baseAsset;    // aBasWETH
STRATEGY_VAULT_CONFIG.kairos.quoteAsset;   // aBasUSDC
STRATEGY_VAULT_CONFIG.optionFactory;       // OptionFactory used by vaults
```

---

## Contract Addresses (Base)

### Kairos (fixed-strike ETH calls)

| Name | Address | Strike |
|------|---------|--------|
| ETH-3000 | `0x5189180C5Bb1bB54f8479a6aeFdFFEd66Ea0951b` | 3000 |
| ETH-3500 | `0xf70088De12E325562dEbfd7740089d894d5b23ce` | 3500 |
| ETH-4000 | `0xf4BeE19920B7672A763e40FAD720714B7B1cb7aa` | 4000 |
| ETH-4500 | `0x05701eE7269b5Cd36660e9A62C9Fc6B7B67FfF12` | 4500 |
| ETH-5000 | `0xE0f808f7717157627139dA38F1226E7011582b67` | 5000 |

Kairos base asset: aBasWETH `0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7`
Kairos quote asset: aBasUSDC `0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB`

### CLVEX (strategy vaults)

| Name | Address | Strategy |
|------|---------|----------|
| CLVEX Bull | `0xeD4c7897D5f1BD8cD00297B3348Fe558D2ABF2Ff` | bull |
| CLVEX Bear | `0x07E7a12D9CFc5bc18f578D7C400B26741fc699BE` | bear |
| CLVEX Condor | `0xFB073625088014fe4826ae4Ab7Cde12B922Ba5F2` | condor |

### Shared

| Contract | Address |
|----------|---------|
| OptionFactory (Base r12) | `0x1D1Fee494dDEAF32626dcd50e0Cd83890574730f` |

---

## See Also

- [Modules Overview](../reference/modules-overview.md) — All client modules at a glance
- [Wheel Vault](../wheel-vault/overview.md) — Ethereum-side wheel-strategy vaults
- [Token Operations](../guides/token-operations.md) — ERC20 approvals required before deposits
