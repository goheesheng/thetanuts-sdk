## Project overview

TypeScript SDK for Thetanuts Finance V4 options trading on Base (chainId 8453) and Ethereum (chainId 1, vault-only).
Package: `@thetanuts-finance/thetanuts-client` — current version in `package.json`.

## Architecture

- 14 modules on ThetanutsClient: erc20, optionBook, api, optionFactory, option, ranger, events, ws, mmPricing, rfqKeys, utils, loan, wheelVault, strategyVault
- There is NO `client.pricing` module. The correct name is `client.mmPricing`.
- Chain config: `src/chains/index.ts` is the source of truth for all addresses, tokens, and implementations
- 8 tokens: USDC, WETH, cbBTC, aBasWETH, aBascbBTC, aBasUSDC, cbDOGE, cbXRP
- 8 price feeds: ETH, BTC, SOL, DOGE, XRP, BNB, PAXG, AVAX
- Canonical contract ABI JSONs (source of truth) live at `/Users/eesheng_eth/Desktop/thetaverse/abis/*.json` — NOT in this repo. Inline TS ABIs in `src/abis/` must be lifted verbatim from those JSONs.
- Never include admin-only contract functions (e.g. `setBaseSplitFee`, `transferOwnership`, `withdrawFees` on OptionFactory, internal `notify*`/`handle*` callbacks) in SDK ABIs — they revert for non-owner callers.

## Key domain facts

- OptionBook supports ALL structures (vanilla, spread, butterfly, condor, iron condor), not just vanilla
- OptionBook is cash-settled only
- RFQ is cash-settled by default via `buildRFQRequest()`. Physical settlement is optional via `buildPhysicalOptionRFQ()` (vanilla only)
- Both OptionBook and RFQ use the same cash-settled implementation contracts
- Physical multi-leg implementations are NOT deployed (zero addresses). Only PHYSICAL_CALL and PHYSICAL_PUT have real addresses
- Implementation names: `PUT_FLY` / `CALL_FLY` (not FLYS). Reconciled in v0.2.1 — both the `ImplementationAddresses` keys and the `optionImplementations` reverse-lookup `name` fields use the FLY form.
- Iron condor params: `strike1, strike2, strike3, strike4` (not putLowerStrike/callLowerStrike)
- RFQ expiry: any future Unix timestamp works (no Friday 8:00 UTC restriction at contract level)
- `reclaimCollateral(ownedOption)` and `getReclaimFee(ownedOption)`: the address arg is the option being reclaimed FROM, not a transfer destination. Reclaimed collateral goes to msg.sender. r12-only.
- `split` and `reclaimCollateral` are `payable` in r12 — modules must read `getSplitFee()` / `getReclaimFee(ownedOption)` and forward as `msg.value`.

## Documentation

- GitBook hosted at docs.thetanuts.finance/sdk, powered by `docs/SUMMARY.md`
- `.gitbook.yaml` at repo root points GitBook to `docs/` directory
- README.md is the GitHub landing page (keep as-is), GitBook sidebar comes from docs/
- When updating docs, always cross-reference `src/chains/index.ts` for addresses and `src/modules/*.ts` for method signatures
- User prefers commits without Co-Authored-By line

## Build & test

- `npm test` runs `npx tsx scripts/run-mainnet-tests.ts` (live mainnet tests, requires network)
- `npm run build` uses tsup (ESM + CJS + types)
- `npm run typecheck` for type checking
- `npm run lint` for linting

## Git remotes

- The repo was transferred from `goheesheng/thetanuts-sdk` to `Thetanuts-Finance/thetanuts-sdk`. GitHub auto-redirects the old URL.
- Local clones may have BOTH `origin` (old URL) and `upstream` (new URL) — both resolve to the same repo. Either works; PRs land in the same place. New clones should set just `origin = Thetanuts-Finance/thetanuts-sdk`.
- Never force-push to public release branches; ship additive patch PRs instead. User explicitly prefers this.

## Codex CLI quirks

- `codex review --base <branch>` and a positional prompt are mutually exclusive. For combined review+challenge with a custom prompt, use `codex exec "<prompt>" -C <repo> -s read-only` instead.
- High-context reviews against a 500+ line diff can stall the default 5min timeout. Bump to 600s+ via the timeout wrapper for those.

## Release & publish flow

- Release goes through PR(s) to `main`, then `npm publish --access public` from main.
- `prepublishOnly` re-runs the build. Don't manually edit `dist/`.
- First-time scoped publish needs `--access public`; safe to include every time.
- v0.2.0 was prepared internally but never shipped; v0.2.1 is the first 0.2.x on npm. v0.1.x stays for users on the prior Base deployment.
- Bumping `package.json` version on a PR ≠ shipping to npm. Those are separate decisions; only publish when there's a user-visible runtime change.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Independent 2nd opinion / adversarial pass on a diff → invoke codex (review or challenge mode)
- Live developer experience audit → invoke devex-review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
