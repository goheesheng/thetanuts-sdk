# Changelog

All notable changes to `@thetanuts-finance/thetanuts-client` are documented here.

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
