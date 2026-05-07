## Project overview

TypeScript SDK for Thetanuts Finance V4 options trading on Base (chain ID 8453).
Package: `@thetanuts-finance/thetanuts-client` (v0.1.6)

## Architecture

- 11 modules on ThetanutsClient: erc20, optionBook, api, optionFactory, option, events, ws, mmPricing, rfqKeys, utils, loan
- There is NO `client.pricing` module. The correct name is `client.mmPricing`.
- Chain config: `src/chains/index.ts` is the source of truth for all addresses, tokens, and implementations
- 8 tokens: USDC, WETH, cbBTC, aBasWETH, aBascbBTC, aBasUSDC, cbDOGE, cbXRP
- 8 price feeds: ETH, BTC, SOL, DOGE, XRP, BNB, PAXG, AVAX

## Key domain facts

- OptionBook supports ALL structures (vanilla, spread, butterfly, condor, iron condor), not just vanilla
- OptionBook is cash-settled only
- RFQ is cash-settled by default via `buildRFQRequest()`. Physical settlement is optional via `buildPhysicalOptionRFQ()` (vanilla only)
- Both OptionBook and RFQ use the same cash-settled implementation contracts
- Physical multi-leg implementations are NOT deployed (zero addresses). Only PHYSICAL_CALL and PHYSICAL_PUT have real addresses
- Implementation names: `PUT_FLY` / `CALL_FLY` (not FLYS). Reconciled in v0.2.1 — both the `ImplementationAddresses` keys and the `optionImplementations` reverse-lookup `name` fields use the FLY form.
- Iron condor params: `strike1, strike2, strike3, strike4` (not putLowerStrike/callLowerStrike)
- RFQ expiry: any future Unix timestamp works (no Friday 8:00 UTC restriction at contract level)

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
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
