# Changelog

Version history for the Thetanuts Finance SDK.

## Current Version

**v0.2.1** — [View all releases on GitHub](https://github.com/Thetanuts-Finance/thetanuts-sdk/releases)

This SDK follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`. Patch releases contain bug fixes and non-breaking improvements. Minor releases add new functionality in a backwards-compatible manner. Major releases may contain breaking changes and will be accompanied by a migration guide.

> **Looking for the full per-line release notes?** See [`CHANGELOG.md`](https://github.com/Thetanuts-Finance/thetanuts-sdk/blob/main/CHANGELOG.md) in the repo. The summaries below are the user-facing highlights.

---

## Release History

### v0.2.1 — Base_r12 deployment + codex-found fixes

The first 0.2.x release published to npm. Bundles the **Base_r12 deployment cutover** with **22 fixes** that three adversarial code-review passes found in the staged surface. v0.2.0 was prepared internally but never published; everything ships in this single release.

> **See the [full v0.2.1 release notes](../releases/0.2.1.md)** for per-commit detail, before/after migration code, and verification steps.

**Base_r12 cutover:**
- All chainId-8453 contract addresses point at the r12 deployment (`optionBook`, `optionFactory`, all 13 implementations, LoanCoordinator, LoanHandler).
- `deploymentBlock` → `45601440` (deployed 2026-05-05).
- Historical reverse-lookup entries (`8453_v6`, `Base_r10`) preserved so events emitted before the cutover still decode.
- Ethereum mainnet (`chainId 1`) added as a vault-only chain.

**New surface:**
- New `client.ranger` module — RangerOption (zone-bound, 4-strike payoff). Module is chain-gated; throws `NETWORK_UNSUPPORTED` on chains where RangerOption is not deployed (Ethereum mainnet today).
- `RANGER_OPTION_ABI` exported from the package root.
- `chainConfig.twapConsumer` (HistoricalPriceConsumerV3_TWAP) surfaced as a top-level chain-config field.
- New chain-config implementation keys: `RANGER`, `LINEAR_CALL`, `INVERSE_CALL_SPREAD`, `CALL_LOAN`.
- New OptionBook surface: `cancelOrders`, `cancelOrdersExpiringBefore`, `getValidNumContracts`, `makerCancellationCutoff`, `minNumContracts`, `minPremiumAmount` + `MakerCutoffUpdated` event.
- New OptionFactory surface: `claimEscrowedFunds`, `claimableTransfers`, `totalClaimableTransfers`, `activeRfqForOption`, `baseSplitFee`, `MAX_TRANSFER_DUST`, `MAX_ORACLE_STALENESS`, `settleQuotationEarlyByOrderBook`, `historicalTWAPConsumer`, `deprecationTime`, `settlementExtension` + 10 new events.

**Production-revert fixes** (would have silently reverted once the protocol enabled non-zero fees):
- `split` and `reclaimCollateral` declared `payable`; the SDK forwards `getSplitFee()` / `getReclaimFee(ownedOption)` as `msg.value`.
- `RangerModule.reclaimCollateral` passes the option being reclaimed (not the caller's address) to `getReclaimFee`. The fee is keyed on the option, not the caller.

**ABI shape corrections** (against canonical r12 JSONs):
- `OptionBook.getValidNumContracts` returns the canonical tuple `result { validContracts, collateralRequired }`, not a single `uint256`.
- `BaseOption.optionType` is `view returns (uint256)`; `RangerOption.optionType` is `pure returns (uint256)`.
- `BaseOption.returnExcessCollateral` declares its `uint256` return.
- `LoanCoordinator.assetConfigs` returns the four-field tuple.

**Event shape corrections:**
- `OptionInitialized` (11 fields), `OptionSplit` (adds `feePaid` and `counterparty`), `TransferApproval` (field order corrected), `OptionSettlementFailed` (no inputs), and `ExcessCollateralReturned` (renamed from `CollateralReturned`) all match r12.
- `client.events.getCollateralReturnedEvents` is **`getExcessCollateralReturnedEvents`** with field shape `{ seller, collateralToken, collateralReturned }`.

**Safety upgrades:**
- All four RFQ entry points (`requestForQuotation`, `encodeRequestForQuotation`, `registerReferral`, `callStaticCreateRFQ`) reject the seven undeployed `PHYSICAL_*_SPREAD/FLY/CONDOR/IRON_CONDOR` zero-address placeholders with `INVALID_PARAMS` before any transaction is built.

**Loan changes:**
- `LOAN_COORDINATOR_ABI` updated for r12: `requestLoan` no longer carries `convertToLimitOrder`; `loanRequests` returns `loanClaimed`; new `LoanClaimed` event.
- `LoanRequest.keepOrderOpen` is `@deprecated` — the r12 contract ignores the value.
- `getLendingOpportunities` filter treats a missing `convertToLimitOrder` indexer field as eligible — only skips when explicitly `false`.

**Naming reconciliation:**
- `getOptionImplementationInfo(addr).name` for butterflies returns `'CALL_FLY'` / `'PUT_FLY'` (was `'CALL_FLYS'` / `'PUT_FLYS'`).
- `OptionImplementationInfo.type` union: `'RANGE'` replaced by `'RANGER'`.

**Breaking changes from v0.1.x:**
- `client.events.getCollateralReturnedEvents` removed; replaced by `getExcessCollateralReturnedEvents` with new fields.
- `OptionSplitEvent` adds `feePaid` and `counterparty`.
- `getOptionImplementationInfo(addr).name` for butterflies renamed (above).
- `LoanCoordinator.requestLoan` no longer accepts `convertToLimitOrder`.

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
