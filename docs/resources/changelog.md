# Changelog

Version history for the Thetanuts Finance SDK.

## Current Version

**v0.2.1** — [View all releases on GitHub](https://github.com/Thetanuts-Finance/thetanuts-sdk/releases)

This SDK follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`. Patch releases contain bug fixes and non-breaking improvements. Minor releases add new functionality in a backwards-compatible manner. Major releases may contain breaking changes and will be accompanied by a migration guide.

> **Looking for the full per-line release notes?** See [`CHANGELOG.md`](https://github.com/Thetanuts-Finance/thetanuts-sdk/blob/main/CHANGELOG.md) in the repo. The summaries below are the user-facing highlights.

---

## Release History

### v0.2.1 — Codex-found r12 fixes

Bugfix release on top of v0.2.0. Two adversarial code-review passes flagged 22 issues across the r12 cutover; all are fixed and verified. Pin to v0.2.0 only if you specifically need that surface, otherwise upgrade.

> **See the [full v0.2.1 release notes](../releases/0.2.1.md)** for per-commit detail, before/after migration code, and verification steps.

**Production-revert fixes:**
- `split` and `reclaimCollateral` are now correctly declared `payable`, and the SDK forwards `getSplitFee()` / `getReclaimFee(ownedOption)` as `msg.value`. Without this, calls would silently revert as soon as the contract owner set a non-zero fee.
- `RangerModule.reclaimCollateral` now passes the option being reclaimed (not the caller's address) to `getReclaimFee`. The fee is keyed on the option, not the caller.

**ABI shape corrections** (against the canonical r12 JSONs):
- `OptionBook.getValidNumContracts` returns the canonical tuple `result { validContracts, collateralRequired }`, not a single `uint256`.
- `BaseOption.optionType` is `view returns (uint256)`; `RangerOption.optionType` is `pure returns (uint256)`.
- `BaseOption.returnExcessCollateral` declares its `uint256` return.
- `LoanCoordinator.assetConfigs` returns the four-field tuple, not a single `bool`.

**Event shape corrections:**
- `OptionInitialized` (11 fields), `OptionSplit` (now includes `feePaid` and `counterparty`), `TransferApproval` (field order corrected), `OptionSettlementFailed` (no inputs), and `ExcessCollateralReturned` (renamed from `CollateralReturned`) all match r12.
- `client.events.getCollateralReturnedEvents` was **renamed to `getExcessCollateralReturnedEvents`** with the new field shape `{ seller, collateralToken, collateralReturned }`.

**Safety upgrades:**
- All RFQ entry points (`requestForQuotation`, `encodeRequestForQuotation`, `registerReferral`, `callStaticCreateRFQ`) now reject the seven undeployed `PHYSICAL_*_SPREAD/FLY/CONDOR/IRON_CONDOR` zero-address placeholders with a clear `INVALID_PARAMS` error before any transaction is built.
- `RangerModule` throws `NETWORK_UNSUPPORTED` up-front on chains where RangerOption is not deployed (e.g., Ethereum mainnet).

**Cosmetic but breaking:**
- `getOptionImplementationInfo(addr).name` for butterflies returns `'CALL_FLY'` / `'PUT_FLY'` (was `'CALL_FLYS'` / `'PUT_FLYS'`).
- `RangerModule.reclaimCollateral` parameter renamed from `recipient` to `ownedOption`.

**Newly-exposed surface:**
- `RANGER_OPTION_ABI` is now exported from the package root.
- `chainConfig.twapConsumer` (HistoricalPriceConsumerV3_TWAP) surfaced as a top-level chain-config field.

### v0.2.0 — Base_r12 deployment cutover

Switch every `chainId 8453` address to the Base_r12 deployment in place. v0.1.x users who need to keep talking to the prior deployment should pin `@^0.1.x`; users moving to r12 install `@^0.2.x`.

- New `client.ranger` module (RangerOption, zone-bound 4-strike payoff).
- New chain-config implementation keys: `RANGER`, `LINEAR_CALL`, `INVERSE_CALL_SPREAD`, `CALL_LOAN`.
- New OptionBook surface: `cancelOrders`, `cancelOrdersExpiringBefore`, `getValidNumContracts`, `makerCancellationCutoff`, `minNumContracts`, `minPremiumAmount` + `MakerCutoffUpdated` event.
- New OptionFactory surface: `claimEscrowedFunds`, `claimableTransfers`, `totalClaimableTransfers`, `activeRfqForOption`, `baseSplitFee`, `MAX_TRANSFER_DUST`, `MAX_ORACLE_STALENESS`, `settleQuotationEarlyByOrderBook`, `historicalTWAPConsumer`, `deprecationTime`, `settlementExtension` + 10 new events.
- LoanCoordinator signatures updated for r12: `requestLoan` no longer carries `convertToLimitOrder`; `loanRequests` returns `loanClaimed`; new `LoanClaimed` event.
- `LoanRequest.keepOrderOpen` is `@deprecated` — the r12 contract ignores the value.
- Historical reverse-lookup entries (`8453_v6`, `Base_r10`) preserved so events emitted before the cutover still decode.
- Ethereum mainnet (`chainId 1`) added as a vault-only chain.

> Several issues in the as-shipped 0.2.0 surface were caught and fixed in 0.2.1 — upgrade to 0.2.1 if you can.

### v0.1.6

- Added `getAllClaimableFees()` and `claimAllFees()` helpers on `optionBook` for batch fee claiming across all collateral tokens.

### v0.1.5

- Added `getFactoryReferrerStats()` for the `/factory/referrer/:address/state` endpoint.
- Narrowed catch-block errors from `any` to `unknown` for stricter type safety.

### v0.1.4

- Added Yarn Classic (v1) and Yarn Berry (v2+) publish support.
- Fixed `numContracts` precision handling and `existingOptionAddress` parameter defaults.
- Fixed `LINEAR_CALL` max contracts calculation.
- Fixed nonce null safety in transaction encoding.
- Fixed `toBigInt` handling of scientific notation and negative numbers.
- Fixed floating-point overflow in multi-leg MM pricing calculations.
- Added support for additional underlying assets and collateral tokens in the RFQ builder.

### v0.1.3 and earlier

- Initial public release of the Thetanuts Finance SDK.
- Core modules: `optionBook`, `optionFactory`, `option`, `mmPricing`, `erc20`, `api`, `utils`.
- `buildRFQParams()` and `buildRFQRequest()` high-level builders.
- `getFullOptionInfo()` aggregated option query.
- `strikeToChain()` / `strikeFromChain()` precision-safe strike conversion.
- MM pricing filter utilities: `filterExpired()`, `filterByType()`, `filterByExpiry()`, `filterByStrikeRange()`, `sortByExpiryAndStrike()`.
- Book position PnL fields added to `Position` type.
- Indexer method renames to clarify data source (`getUserPositionsFromIndexer()`, `getUserRFQsFromRfq()`, etc.).

---

## See Also

- [Migration Guide](./migration-guide.md) - Breaking changes and upgrade steps
- [Examples](./examples.md) - Runnable code examples
- [Quick Start](../getting-started/quick-start.md) - Installation and setup
