# Changelog

All notable changes to `@thetanuts-finance/thetanuts-client` are documented here.

## 0.2.1 — codex-found r12 fixes

Bugfix release on top of 0.2.0. An adversarial review run identified 15 issues
in the as-shipped 0.2.0 surface — eight of them production-critical (silent
reverts, wrong ABI shapes, broken event decoding). All fixed here. 0.2.0 is
unchanged on npm; pin to 0.2.0 if you need that exact surface, otherwise
upgrade.

### Fixes

- **`split` and `reclaimCollateral` are now correctly declared `payable`** in
  `option.ts`, `ranger.ts`, and `loan.ts` ABIs. The r12 contracts collect
  `getSplitFee()` and `getReclaimFee(caller)` as `msg.value`. With the prior
  `nonpayable` declaration, every call would silently revert as soon as the
  contract owner set a non-zero fee.
- **`OptionModule.split` and `RangerModule.split`** now read `getSplitFee()`
  and forward the value with the transaction.
- **`RangerModule.reclaimCollateral`** now reads `getReclaimFee(callerAddress)`
  and forwards the value. Parameter renamed from `recipient` to `ownedOption`
  to match the on-chain semantics — the address is the option being reclaimed
  from, not a transfer destination.
- **Raw `requestForQuotation` / `encodeRequestForQuotation` zero-address
  guard.** Both entry points now reject `params.implementation ===
  0x000…000` with a clear `INVALID_PARAMS` error before producing calldata
  or sending a transaction. The previous v0.2.0 guard only fired inside the
  high-level physical-RFQ builders; raw callers passing
  `chainConfig.implementations.PHYSICAL_*` directly bypassed it entirely.
- **`OptionBook.getValidNumContracts`** ABI return corrected from
  `uint256` to the actual r12 tuple `(uint256 validContracts,
  uint256 collateralRequired)`. Input name corrected from `collateral` to
  `implementation`.
- **`optionType()`** ABI corrected to `pure returns (uint256)` in
  `option.ts` and `ranger.ts`. Was `view returns (bytes32)` in
  `ranger.ts`; was `view returns (uint256)` in `option.ts`.
- **`returnExcessCollateral()`** ABI now declares `returns (uint256)`. Was
  no-output.
- **`LOAN_COORDINATOR_ABI.assetConfigs(bytes32)`** ABI now declares the
  full r12 tuple return `(address collateralToken, address priceFeed,
  address settlementToken, bool isActive)`. Was a single `bool`.
- **`OptionInitialized` event** added to `BASE_OPTION_ABI` (was missing
  entirely in 0.2.0) and corrected in `RANGER_OPTION_ABI`. r12 emits
  11 fields; the 0.2.0 ranger ABI declared 3.
- **`OptionSplit` event** corrected in both `BASE_OPTION_ABI` and
  `RANGER_OPTION_ABI`. r12 shape is `(address indexed newOption,
  uint256 collateralAmount, uint256 feePaid, address indexed
  counterparty)`. The 0.2.0 ABIs were missing `feePaid` and `counterparty`.
- **`TransferApproval` event** corrected in `RANGER_OPTION_ABI`. r12 shape
  is `(address indexed target, address indexed from, bool isBuyer,
  bool isApproved)`. The 0.2.0 ranger ABI had the first two fields
  swapped. (`option.ts` was already correct.)
- **`OptionSettlementFailed` event** corrected in `RANGER_OPTION_ABI` to
  no inputs. The 0.2.0 ranger ABI declared `(address, string)`.
- **`CollateralReturned` event renamed to `ExcessCollateralReturned`** in
  both `BASE_OPTION_ABI` and `RANGER_OPTION_ABI`. r12 reshaped fields
  to `(address indexed seller, address indexed collateralToken,
  uint256 collateralReturned)`.
- **`client.events.getCollateralReturnedEvents` renamed to
  `getExcessCollateralReturnedEvents`** with the new field shape.
- **`getOptionSplitEvents`** field extraction now includes `feePaid` and
  `counterparty`.
- **`getLendingOpportunities` filter** at `src/modules/loan.ts` now treats
  a missing `convertToLimitOrder` indexer field as eligible (only skips
  when explicitly `false`). The r12 indexer is expected to drop the field;
  without this, the lender opportunity list would always be empty against
  an r12 indexer.
- **`RangerModule` chain guard.** Every public method now throws
  `NETWORK_UNSUPPORTED` up-front on chains where `RANGER` isn't
  registered in `chainConfig.implementations`. Previously the module
  constructed cleanly on Ethereum mainnet and other chains, then failed
  deep in ethers with a cryptic `eth_call` error.
- **`CALL_FLYS` / `PUT_FLYS` reverse-lookup names renamed to
  `CALL_FLY` / `PUT_FLY`** for both historical and r12 entries, matching
  the public `ImplementationAddresses` keys. The `ProductName` union in
  `src/utils/rfqCalculations.ts` follows.

### Breaking changes from 0.2.0

These are real source-breaking changes for anyone who already integrated
0.2.0. v0.2.0 has been on npm only briefly; the breakage window is
intentionally short.

- `client.events.getCollateralReturnedEvents` — **removed**. Replaced by
  `client.events.getExcessCollateralReturnedEvents`. The returned event
  type is now `ExcessCollateralReturnedEvent` with fields
  `{ seller, collateralToken, collateralReturned }` (was
  `{ optionAddress, seller, amountReturned }`).
- `OptionSplitEvent` — added `feePaid: bigint` and `counterparty: string`
  fields.
- `getOptionImplementationInfo(addr).name` for butterfly options returns
  `'CALL_FLY'` / `'PUT_FLY'` (was `'CALL_FLYS'` / `'PUT_FLYS'`).
- `ProductName` union no longer includes `'CALL_FLYS'` / `'PUT_FLYS'`;
  use `'CALL_FLY'` / `'PUT_FLY'`.
- `RangerModule.reclaimCollateral` — second parameter renamed from
  `recipient` to `ownedOption`. Positional callers unaffected; named
  callers using a TypeScript object-shape will break.
- `RangerModule.optionType()` typed return is `Promise<bigint>` (was
  `Promise<string>`).

## 0.2.0 — Base_r12 deployment

The Thetanuts protocol shipped a fresh v4 deployment on Base (chain ID 8453)
under the `Base_r12` tag (deployed 2026-05-05, block 45601440). This SDK
release switches every chainId-8453 address to r12 in place. There is no
runtime version selector; users still pointed at the prior deployment should
pin `@thetanuts-finance/thetanuts-client@^0.1.x`, which remains published on
npm and is unchanged.

### Added

- **RangerOption**: new zone-bound option implementation.
  - Address registered under `implementations.RANGER` for chainId 8453.
  - New module `client.ranger` (`RangerModule`) with reads (`getInfo`,
    `getZone`, `getSpreadWidth`, `getStrikes`, `getTWAP`, `calculatePayout`,
    `simulatePayout`, `calculateRequiredCollateral`) and user-facing writes
    (`payout`, `close`, `split`, `transfer`, `reclaimCollateral`,
    `returnExcessCollateral`).
  - `RANGER_OPTION_ABI` exported from `@thetanuts-finance/thetanuts-client`.
- **HistoricalPriceConsumerV3_TWAP**: surfaced as `chainConfig.twapConsumer`
  (Chainlink TWAP consumer used at settlement). `null` on chains where it is
  not deployed.
- **New implementation keys** in `ImplementationAddresses`:
  `INVERSE_CALL_SPREAD`, `LINEAR_CALL`, `RANGER`, `CALL_LOAN`.
- **OptionBook ABI** (additive, user-facing only): `cancelOrders(Order[])`,
  `cancelOrdersExpiringBefore(uint256)`, `getValidNumContracts`,
  `makerCancellationCutoff`, `minNumContracts`, `minPremiumAmount`, plus the
  `MakerCutoffUpdated` event.
- **OptionFactory ABI** (additive, user-facing only):
  `claimEscrowedFunds`, `claimableTransfers`, `totalClaimableTransfers`,
  `activeRfqForOption`, `baseSplitFee`, `MAX_TRANSFER_DUST`,
  `MAX_ORACLE_STALENESS`, `settleQuotationEarlyByOrderBook`,
  `historicalTWAPConsumer`, `deprecationTime`, `settlementExtension`, plus
  the `BaseSplitFeeUpdated`, `CollateralDeposited`, `CollateralReturned`,
  `EscrowClaimed`, `ExpiredReferralSwept`, `FactoryDeprecation`,
  `MaxRfqValueUpdated`, `OfferAcceptedFromOrderBook`,
  `SettlementFailedDueToStateChange`, and `TransferEscrowed` events.
- **BaseOption ABI** (additive): `creator`, `paramsHash`, `splitGeneration`,
  `optionParent`, `optionChildren`, `getReclaimFee`, `getSplitFee`,
  `calculateNumContractsForCollateral`, plus user-facing writes
  `reclaimCollateral` and `returnExcessCollateral`.
- **Historical reverse-lookup** preserved: prior `8453_v6` and `Base_r10`
  implementation entries remain in `optionImplementations` so the SDK can
  still decode events emitted before the cutover. New `Base_r12` entries
  appended.

### Changed

- **All chainId-8453 contract addresses** point at the r12 deployment.
  - `contracts.optionBook` → `0x1bDff855d6811728acaDC00989e79143a2bdfDed`
  - `contracts.optionFactory` → `0x8118daD971dEbffB49B9280047659174128A8B94`
  - All implementation addresses replaced.
  - `deploymentBlock` → `45601440`.
- **LoanCoordinator** address bumped to `0x9FB75b24d9d6f7c29D6BdE2870697A4FE0395994`;
  loan handler to `0x7c444A2375275DaB925b32493B64a407eE955DEd`.
- **`LOAN_COORDINATOR_ABI`** updated for r12: `requestLoan` parameter tuple
  no longer carries `convertToLimitOrder` (the field was removed at the
  contract level), `loanRequests` view now returns 9 fields including
  `loanClaimed`, and `LoanRequested` event lost its `convertToLimitOrder`
  param. New `LoanClaimed` event added.
- **`LoanRequest.keepOrderOpen`** is now `@deprecated` — the r12 contract
  ignores the value. The field remains in the public type to keep existing
  caller code compiling.
- **`OptionImplementationInfo.type`** union: `'RANGE'` replaced by
  `'RANGER'` to match the on-chain `RangerOption` naming and the existing
  `rfqCalculations.ts` `'RANGER'` usages. The single prior `RANGE` entry
  for the `Base_r10` ranger address has been retagged to `'RANGER'`.

### Skipped on purpose

These admin-only and internal-only contract functions are deliberately
*not* added to the SDK ABIs, even though they exist in r12:

- OptionFactory: `setBaseSplitFee`, `setMaxRfqValue`, `deprecateFactory`.
- OptionBook: `setMinimumThresholds`.
- LoanCoordinator: `setAssetConfig`, `removeAssetConfig`, `setFee`,
  `transferOwnership`, `renounceOwnership`, `acceptOwnership`,
  `rescueToken`, `handleSettlement`, `handleSettlementComplete`.
- BaseOption / RangerOption: `notifyCreationComplete`, `notifyTradeSettled`,
  `executeCollateralReclaim`, `exerciseInternal`, `exerciseOnOracleFailure`.
- `partnerFeeBrokerFactory` is deployed at `0x0843078cAF4B5B8732e723AA8f22381cd7e9f186`
  but is not exposed by the SDK in 0.2.0 — the upstream artifacts directory
  ships no public ABI for it.

Already-shipped admin-ish methods on existing modules (`sweepProtocolFees`,
`setReferrerFeeSplit`, `withdrawFees`, `claimFees`, `rescueERC20`,
`approveTransfer`) are left untouched; removing them is a separate concern.

### Notes for users

- **Pin to the deployment you want.** v0.1.x tracks the prior deployment;
  v0.2.x tracks Base_r12. Don't mix.
- The seven physical multi-leg implementation slots
  (`PHYSICAL_CALL_SPREAD`, `PHYSICAL_PUT_SPREAD`, `PHYSICAL_*_FLY`,
  `PHYSICAL_*_CONDOR`, `PHYSICAL_IRON_CONDOR`) remain `0x000…000` in r12.
  The runtime guard in `optionFactory.ts` continues to throw a clear
  `INVALID_PARAMS` error if an RFQ flow tries to route through one.
