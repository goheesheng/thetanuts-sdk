# Ranger Options

Ranger is a 4-strike, zone-bound payoff that pays the buyer the maximum amount when the settlement price lands inside a configured zone, with linearly decaying payouts outside that zone. Available on Base mainnet via the `client.ranger` module (Base_r12 onwards).

## When you'd use a Ranger

- You expect the underlying to **stay within a range** at expiry (e.g., ETH between $2,300 and $2,500).
- A vanilla call/put or even a condor is too narrow — you want a clean way to express a range view with a single trade.
- You're comfortable with the seller side too: collecting premium when you expect the price to **break out** of the zone.

## Anatomy

A Ranger has 4 strikes: `[s1, s2, s3, s4]`.

- The **zone** is bounded by `s2` and `s3` — that's where the buyer earns the max payout.
- Outside the zone, the payout decays linearly toward zero between `s1`-to-`s2` and `s3`-to-`s4`.
- Below `s1` or above `s4`, the payout is zero.

The contract enforces equal **spread widths**: `s2 - s1 == s4 - s3`. This is what makes the payoff symmetric around the zone.

## Quick reference

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider, signer });

// Read a Ranger option's full state
const info = await client.ranger.getInfo(rangerAddress);
// {
//   buyer, seller, creator,
//   collateralToken, collateralAmount, numContracts, expiryTimestamp,
//   chainlinkPriceFeed, strikes,
//   zone: { zoneLower, zoneUpper },
//   spreadWidth,
//   optionSettled,
// }

// Read just the zone bounds
const { zoneLower, zoneUpper } = await client.ranger.getZone(rangerAddress);

// Read the per-leg spread width
const width = await client.ranger.getSpreadWidth(rangerAddress);

// Simulate the payout at a hypothetical settlement price
const payout = await client.ranger.simulatePayout(
  rangerAddress,
  client.utils.toPriceDecimals(2400),  // settlement price (8 decimals)
  await client.ranger.getStrikes(rangerAddress),
  await client.ranger.getInfo(rangerAddress).then(i => i.numContracts),
);

// On-chain payout at an exact settlement price (no off-chain math)
const exact = await client.ranger.calculatePayout(rangerAddress, settlementPrice);

// Current TWAP from the option's price-feed consumer
const twap = await client.ranger.getTWAP(rangerAddress);
```

## Lifecycle

```typescript
// After expiry, the buyer claims the settlement payout
await client.ranger.payout(rangerAddress);

// Either party can close before expiry (mutual cancellation paths)
await client.ranger.close(rangerAddress);

// Split the position by collateral amount (returns child option address)
await client.ranger.split(rangerAddress, splitCollateralAmount);

// Transfer the buyer or seller side
await client.ranger.transfer(rangerAddress, /* isBuyer */ true, recipientAddress);

// Reclaim collateral after settlement
// Note: ownedOption is the option being reclaimed FROM, not a transfer destination.
// The reclaimed collateral goes to the caller (the signer).
// The contract keys getReclaimFee on ownedOption — the SDK forwards it as msg.value.
await client.ranger.reclaimCollateral(rangerAddress, ownedOption);

// Return any excess collateral the contract still holds
await client.ranger.returnExcessCollateral(rangerAddress);
```

## Chain support

`client.ranger` is gated on the chain registry. On chains where `chainConfig.implementations.RANGER` is missing or set to the zero address (e.g., Ethereum mainnet today), every method throws `NETWORK_UNSUPPORTED` up front instead of failing deep inside `eth_call` with a cryptic error.

```typescript
const ethClient = new ThetanutsClient({ chainId: 1, provider });
await ethClient.ranger.getInfo('0x...');
// throws { code: 'NETWORK_UNSUPPORTED',
//          message: 'RangerModule requires a chain with RangerOption deployed; chainId 1 has no RANGER implementation.' }
```

## Fees

`split()` and `reclaimCollateral()` are **payable** in r12. The SDK reads the on-chain fee (`getSplitFee()` and `getReclaimFee(ownedOption)` respectively) and forwards it as `msg.value`. Callers don't need to do anything — just have a signer with enough native-token balance to cover the fee.

## Events

Ranger options emit the same events as every other BaseOption-derived contract: `OptionInitialized`, `OptionPayout`, `OptionClosed`, `OptionExpired`, `OptionSettlementFailed`, `OptionSplit`, `ExcessCollateralReturned`, `TransferApproval`. Query them via `client.events.*` — see the [Events guide](./events.md).

## See also

- [Modules Overview](../reference/modules-overview.md#clientranger--rangermodule) — full RangerModule API reference
- [Migration Guide](../resources/migration-guide.md) — what changed when moving from v0.1.x or v0.2.0
- [Events guide](./events.md) — querying historical Ranger activity
