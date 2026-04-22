# Changelog

Version history for the Thetanuts Finance SDK.

## Current Version

**v0.1.6** — [View all releases on GitHub](https://github.com/Thetanuts-Finance/thetanuts-sdk/releases)

This SDK follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`. Patch releases contain bug fixes and non-breaking improvements. Minor releases add new functionality in a backwards-compatible manner. Major releases may contain breaking changes and will be accompanied by a migration guide.

---

## Release History

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
