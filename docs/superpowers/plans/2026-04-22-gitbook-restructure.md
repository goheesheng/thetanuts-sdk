# GitBook Documentation Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the Thetanuts SDK docs from monolithic markdown files into ~32 focused GitBook pages with a proper left sidebar navigation.

**Architecture:** Create a `docs/` directory hierarchy mirroring the approved sidebar structure (7 top-level sections). Each page is a standalone markdown file extracted from existing content. A `SUMMARY.md` file defines the GitBook sidebar, and `.gitbook.yaml` at the repo root points GitBook at `docs/`.

**Tech Stack:** Markdown, GitBook (SUMMARY.md format), YAML config

**Source files to read before any task:**
- `README.md` (959 lines, main content source)
- `docs/API_REFERENCE.md` (2,530 lines, module API docs)
- `docs/RFQ_WORKFLOW.md` (1,700 lines, RFQ lifecycle)
- `docs/SDK_QUICK_REFERENCE.md` (768 lines, method tables)
- `docs/ERROR_CODES.md` (617 lines, error handling)
- `docs/MIGRATION_GUIDE.md` (386 lines)
- `docs/mm-pricing.md` (340 lines)
- `docs/product-types.md` (289 lines)
- `docs/rfq-calculations.md` (475 lines)
- `docs/rfq-pricing-integration.md` (398 lines)
- `docs/validation.md` (252 lines)
- `docs/indexer-migration-issues.md` (322 lines)
- `mcp-server/README.md`
- `src/client/README.md`
- `src/chains/README.md`

**Design spec:** `docs/superpowers/specs/2026-04-22-gitbook-restructure-design.md`

---

### Task 1: Create directory structure, .gitbook.yaml, and SUMMARY.md

**Files:**
- Create: `.gitbook.yaml`
- Create: `docs/SUMMARY.md`
- Create directories: `docs/getting-started/`, `docs/optionbook/`, `docs/rfq/`, `docs/pricing/`, `docs/guides/`, `docs/reference/`, `docs/resources/`

- [ ] **Step 1: Create all directories**

```bash
mkdir -p docs/getting-started docs/optionbook docs/rfq docs/pricing docs/guides docs/reference docs/resources
```

- [ ] **Step 2: Create .gitbook.yaml**

Create `.gitbook.yaml` at repo root with:

```yaml
root: ./docs/

structure:
  summary: SUMMARY.md
```

- [ ] **Step 3: Create docs/SUMMARY.md**

Create `docs/SUMMARY.md` with the full sidebar structure. Copy the exact content from the design spec's "SUMMARY.md Format" section (lines 239-300 of the design spec). This is the complete sidebar definition.

- [ ] **Step 4: Commit**

```bash
git add .gitbook.yaml docs/SUMMARY.md
git commit -m "docs: add GitBook config and sidebar structure"
```

---

### Task 2: Create Getting Started section (5 pages)

**Files:**
- Create: `docs/getting-started/overview.md`
- Create: `docs/getting-started/installation.md`
- Create: `docs/getting-started/quick-start.md`
- Create: `docs/getting-started/configuration.md`
- Create: `docs/getting-started/supported-chains.md`

**Source files to read:** `README.md`

- [ ] **Step 1: Create overview.md**

Extract from README.md:
- Lines 1-2 (title, description) as intro
- Lines 30-38 ("Features" section) as feature list
- Lines 40-56 ("OptionBook vs RFQ" comparison table)

Page structure: H1 "Overview", one-line intro, features list, comparison table, "See also" links to Installation and Quick Start.

- [ ] **Step 2: Create installation.md**

Extract from README.md:
- Lines 57-68 ("Installation" section with npm/yarn)
- Lines 777-793 ("Compatibility" section: Node.js >= 18, ethers v6, TypeScript >= 5.0)
- Lines 793-797 ("Build Formats" section)

Page structure: H1 "Installation", package manager commands, requirements table, build format note.

- [ ] **Step 3: Create quick-start.md**

Extract from README.md:
- Lines 69-107 ("Quick Start" section, the full code example with provider, fetchOrders, getMarketData, previewFillOrder, getAllPricing)

Page structure: H1 "Quick Start", intro sentence, full code example, "Next step" callout linking to OptionBook and RFQ sections.

- [ ] **Step 4: Create configuration.md**

Extract from README.md:
- Lines 266-281 ("Configuration Options" with ThetanutsClientConfig interface)
- Lines 796-819 ("Custom Logger" section with consoleLogger and custom logger examples)

Page structure: H1 "Configuration", interface definition, each option explained, logger section.

- [ ] **Step 5: Create supported-chains.md**

Extract from README.md:
- Lines 260-264 ("Supported Chains" table)
- Lines 109-133 ("Key Concepts > Chain Configuration" with config.tokens, config.implementations, config.priceFeeds examples)

Page structure: H1 "Supported Chains", chains table, chain config access patterns.

- [ ] **Step 6: Commit**

```bash
git add docs/getting-started/
git commit -m "docs: add Getting Started section (5 pages)"
```

---

### Task 3: Create OptionBook section (6 pages)

**Files:**
- Create: `docs/optionbook/overview.md`
- Create: `docs/optionbook/browse-filter-orders.md`
- Create: `docs/optionbook/preview-fills.md`
- Create: `docs/optionbook/fill-orders.md`
- Create: `docs/optionbook/referrer-fees.md`
- Create: `docs/optionbook/encode-external-wallets.md`

**Source files to read:** `README.md`, `docs/API_REFERENCE.md`, `docs/SDK_QUICK_REFERENCE.md`

- [ ] **Step 1: Create overview.md**

Write a new overview page explaining:
- What OptionBook is (fill existing market-maker orders for vanilla options)
- When to use it vs RFQ (quick trades on listed options)
- The core flow: fetchOrders → previewFillOrder → ensureAllowance → fillOrder
- Data source: Book indexer (`/api/v1/book/`)
- Link to Browse & Filter Orders as next step

Use the comparison row from README.md lines 44-56 for the "OptionBook" column.

- [ ] **Step 2: Create browse-filter-orders.md**

Extract from:
- API_REFERENCE.md: `fetchOrders()` and `filterOrders()` documentation
- SDK_QUICK_REFERENCE.md lines 86-93: OptionBook API methods table (the fetch/filter rows)
- README.md lines 403-406: the `fetchOrders` + `find` example

Page should show: how to fetch orders, what an OrderWithSignature looks like, how to filter by asset/type/expiry.

- [ ] **Step 3: Create preview-fills.md**

Extract from:
- README.md lines 611-649: "Understanding Collateral vs Contracts" section (collateral formulas table, previewFillOrder examples)
- API_REFERENCE.md: `previewFillOrder()` docs (parameters table, return type)
- README.md lines 93-99: Quick Start preview example

- [ ] **Step 4: Create fill-orders.md**

Extract from:
- README.md lines 175-204: "With Signer" section (provider + signer setup, ensureAllowance, fillOrder)
- README.md lines 387-424: "OptionBook: Browse and Fill" complete workflow
- API_REFERENCE.md: `fillOrder()` docs, `swapAndFillOrder()` docs, `cancelOrder()` docs

- [ ] **Step 5: Create referrer-fees.md**

Extract from:
- README.md lines 206-252: "Referrer (Fee Sharing)" section (all 3 options, query fees, getAllClaimableFees, claimAllFees)
- API_REFERENCE.md: `getFees()`, `getReferrerFeeSplit()`, `getAllClaimableFees()`, `claimAllFees()`, `claimFees()` docs
- Reference the `docs/examples/claim-fees.ts` example

- [ ] **Step 6: Create encode-external-wallets.md**

Extract from:
- API_REFERENCE.md: `encodeFillOrder()` docs, `encodeSwapAndFillOrder()` docs
- README.md lines 225-231: encode example with walletClient.sendTransaction

Page explains: when to use encode methods (viem, wagmi, Account Abstraction wallets), the `{ to, data }` pattern.

- [ ] **Step 7: Commit**

```bash
git add docs/optionbook/
git commit -m "docs: add OptionBook section (6 pages)"
```

---

### Task 4: Create RFQ section (7 pages)

**Files:**
- Create: `docs/rfq/overview.md`
- Create: `docs/rfq/create-rfq.md`
- Create: `docs/rfq/multi-leg-structures.md`
- Create: `docs/rfq/lifecycle.md`
- Create: `docs/rfq/early-settlement.md`
- Create: `docs/rfq/key-management.md`
- Create: `docs/rfq/physical-options.md`

**Source files to read:** `README.md`, `docs/RFQ_WORKFLOW.md`, `docs/API_REFERENCE.md`, `docs/SDK_QUICK_REFERENCE.md`, `docs/product-types.md`

- [ ] **Step 1: Create overview.md**

Extract from:
- RFQ_WORKFLOW.md lines 1-35: Overview section (sealed-bid auction, key features, timeline)
- README.md lines 44-56: the RFQ column from the comparison table

Page explains: what RFQ/Factory is, sealed-bid auction mechanism, when to use it vs OptionBook.

- [ ] **Step 2: Create create-rfq.md**

Extract from:
- README.md lines 427-463: "RFQ: Create a Custom Option" example
- README.md lines 156-173: "collateralAmount is ALWAYS 0" section
- SDK_QUICK_REFERENCE.md lines 269-398: "RFQ Creation" section (buildRFQParams, buildRFQRequest, convenience helpers)
- RFQ_WORKFLOW.md Phase 1 content

Include both the `buildRFQRequest` approach and the `buildRFQParams` approach. Cover SELL position approval.

- [ ] **Step 3: Create multi-leg-structures.md**

Extract from:
- README.md lines 467-567: Butterfly and Condor examples with real TX hashes
- README.md lines 568-576: "All Option Structures Summary" table
- SDK_QUICK_REFERENCE.md lines 288-378: Multi-leg RFQ helpers (buildSpreadRFQ, buildButterflyRFQ, buildCondorRFQ)
- docs/product-types.md: product type reference

- [ ] **Step 4: Create lifecycle.md**

Extract from:
- RFQ_WORKFLOW.md: Phases 1-4 content, collateral handling section, sealed-bid auction mechanism
- This is the bulk of RFQ_WORKFLOW.md reorganized into a single lifecycle page

This will be the longest page in the RFQ section (~400-500 lines). Include the flow diagram, phase descriptions, and settlement paths.

- [ ] **Step 5: Create early-settlement.md**

Extract from:
- README.md lines 495-566: "RFQ: Early Settlement" section with full decrypt + settle example and real TX
- RFQ_WORKFLOW.md: "Settlement Paths: Early vs Normal" section

- [ ] **Step 6: Create key-management.md**

Extract from:
- README.md lines 284-332: "RFQ Key Management" section (storage providers, auto-management, backup warning, memory storage)
- RFQ_WORKFLOW.md: Key Management and Encryption Technical Details sections
- SDK_QUICK_REFERENCE.md lines 183-200: RFQKeyManagerModule method table

- [ ] **Step 7: Create physical-options.md**

Extract from:
- SDK_QUICK_REFERENCE.md lines 719-758: "Physical Options" section (calculation functions, product table)
- README.md lines 914-915: physical-option-rfq.ts example reference

- [ ] **Step 8: Commit**

```bash
git add docs/rfq/
git commit -m "docs: add RFQ (Factory) section (7 pages)"
```

---

### Task 5: Create Pricing section (4 pages)

**Files:**
- Create: `docs/pricing/mm-pricing.md`
- Create: `docs/pricing/position-spread-pricing.md`
- Create: `docs/pricing/filters-utilities.md`
- Create: `docs/pricing/collateral-cost.md`

**Source files to read:** `docs/mm-pricing.md`, `docs/SDK_QUICK_REFERENCE.md`, `docs/rfq-calculations.md`, `docs/rfq-pricing-integration.md`

- [ ] **Step 1: Create mm-pricing.md**

Extract from:
- docs/mm-pricing.md (full content, this is the primary source)
- SDK_QUICK_REFERENCE.md lines 475-496: getAllPricing, getTickerPricing examples
- SDK_QUICK_REFERENCE.md lines 168-181: MMPricingModule method table

- [ ] **Step 2: Create position-spread-pricing.md**

Extract from:
- SDK_QUICK_REFERENCE.md lines 498-536: Position pricing and spread pricing examples
- docs/rfq-pricing-integration.md: how rfqCalculations, mmPricing, and optionFactory fit together

- [ ] **Step 3: Create filters-utilities.md**

Extract from:
- SDK_QUICK_REFERENCE.md lines 538-566: Filter & Sort Utilities (filterExpired, sortByExpiryAndStrike, getUniqueExpiries, filterByType, filterByExpiry, filterByStrikeRange, getPricingArray)

- [ ] **Step 4: Create collateral-cost.md**

Extract from:
- docs/rfq-calculations.md: collateral cost formula, APR rates (BTC 1%, ETH 4%, USD 7%)
- SDK_QUICK_REFERENCE.md lines 30-36: Key Concepts table (reserve price, collateral, collateral cost)

- [ ] **Step 5: Commit**

```bash
git add docs/pricing/
git commit -m "docs: add Pricing section (4 pages)"
```

---

### Task 6: Create Guides section (7 pages)

**Files:**
- Create: `docs/guides/position-management.md`
- Create: `docs/guides/token-operations.md`
- Create: `docs/guides/websocket.md`
- Create: `docs/guides/events.md`
- Create: `docs/guides/error-handling.md`
- Create: `docs/guides/production-checklist.md`
- Create: `docs/guides/mcp-server.md`

**Source files to read:** `docs/API_REFERENCE.md`, `docs/ERROR_CODES.md`, `README.md`, `mcp-server/README.md`

- [ ] **Step 1: Create position-management.md**

Extract from:
- API_REFERENCE.md: OptionModule section (getOptionInfo, getFullOptionInfo, calculatePayout, calculateRequiredCollateral, close, transfer, split, payout)
- SDK_QUICK_REFERENCE.md lines 148-166: OptionModule method table
- SDK_QUICK_REFERENCE.md lines 444-471: Option Module usage examples

- [ ] **Step 2: Create token-operations.md**

Extract from:
- API_REFERENCE.md: ERC20Module section
- SDK_QUICK_REFERENCE.md lines 41-51: ERC20Module method table
- SDK_QUICK_REFERENCE.md lines 570-584: ERC20 Operations examples

- [ ] **Step 3: Create websocket.md**

Extract from:
- README.md lines 577-609: "Monitor Positions with WebSocket" example
- API_REFERENCE.md: WebSocketModule section
- SDK_QUICK_REFERENCE.md lines 215-223: WebSocketModule method table

- [ ] **Step 4: Create events.md**

Extract from:
- API_REFERENCE.md: EventsModule section (getOrderFillEvents, getOrderCancelledEvents, getOptionCreatedEvents, getQuotationRequestedEvents, getOfferMadeEvents, getOfferRevealedEvents, getQuotationSettledEvents, getPositionClosedEvents)
- SDK_QUICK_REFERENCE.md lines 202-213: EventsModule method table

- [ ] **Step 5: Create error-handling.md**

Extract from:
- docs/ERROR_CODES.md (full content, this is the primary source)
- README.md lines 652-753: Error Handling section (error codes table, instanceof examples, retry pattern)

Merge both sources. ERROR_CODES.md has the complete reference; README.md has the user-friendly examples. Combine them.

- [ ] **Step 6: Create production-checklist.md**

Extract from:
- README.md lines 755-776: "Production Checklist" section (RPC provider, referrer, error logging, gas buffer, collateral approval, WebSocket reconnection, order expiry)

- [ ] **Step 7: Create mcp-server.md**

Extract from:
- mcp-server/README.md: summarize the available tools tables and setup instructions
- Link to the full mcp-server/README.md and mcp-server/SPEC.md for details

- [ ] **Step 8: Commit**

```bash
git add docs/guides/
git commit -m "docs: add Guides section (7 pages)"
```

---

### Task 7: Create SDK Reference section (6 pages)

**Files:**
- Create: `docs/reference/client.md`
- Create: `docs/reference/modules-overview.md`
- Create: `docs/reference/utilities.md`
- Create: `docs/reference/type-exports.md`
- Create: `docs/reference/chain-config.md`
- Create: `docs/reference/decimals.md`

**Source files to read:** `docs/API_REFERENCE.md`, `docs/SDK_QUICK_REFERENCE.md`, `README.md`, `src/client/README.md`, `src/chains/README.md`

- [ ] **Step 1: Create client.md**

Extract from:
- API_REFERENCE.md lines 22-113: ThetanutsClient constructor, properties, modules list, chain config
- src/client/README.md: additional client details

- [ ] **Step 2: Create modules-overview.md**

Extract from:
- README.md lines 246-259: Modules table (the updated version with mmPricing and rfqKeys)
- Brief description of each module with links to the relevant section page (e.g., OptionBook module links to `/optionbook/overview`)

- [ ] **Step 3: Create utilities.md**

Extract from:
- API_REFERENCE.md: UtilsModule section
- SDK_QUICK_REFERENCE.md lines 225-238: UtilsModule method table
- SDK_QUICK_REFERENCE.md lines 409-439: Decimal conversions and strike conversion examples

- [ ] **Step 4: Create type-exports.md**

Extract from:
- SDK_QUICK_REFERENCE.md lines 612-668: Type Exports section (full import example grouped by domain)

- [ ] **Step 5: Create chain-config.md**

Extract from:
- API_REFERENCE.md lines 71-113: Chain configuration (tokens, implementations including physical, price feeds, contracts)
- SDK_QUICK_REFERENCE.md lines 241-265: Chain Configuration section
- src/chains/README.md: additional chain config details

- [ ] **Step 6: Create decimals.md**

Extract from:
- SDK_QUICK_REFERENCE.md lines 672-680: Decimal Reference table (USDC 6, WETH 18, cbBTC 8, Strike 8)
- README.md lines 138-154: Decimal Handling section with conversion examples

- [ ] **Step 7: Commit**

```bash
git add docs/reference/
git commit -m "docs: add SDK Reference section (6 pages)"
```

---

### Task 8: Create Resources section (3 pages)

**Files:**
- Create: `docs/resources/migration-guide.md`
- Create: `docs/resources/examples.md`
- Create: `docs/resources/changelog.md`

**Source files to read:** `docs/MIGRATION_GUIDE.md`, `README.md`

- [ ] **Step 1: Create migration-guide.md**

Copy `docs/MIGRATION_GUIDE.md` content to `docs/resources/migration-guide.md`. Also fold in key notes from `docs/indexer-migration-issues.md` as an appendix section if relevant.

- [ ] **Step 2: Create examples.md**

Extract from:
- README.md lines 908-919: "Code Examples" section listing all example files with descriptions

Create an index page listing each example with its description and a link to the `.ts` file. The example files themselves (`docs/examples/*.ts`) stay where they are.

- [ ] **Step 3: Create changelog.md**

Create a simple page with:
- Current version: 0.1.6
- Link to GitHub releases page
- Note that this SDK follows semver

- [ ] **Step 4: Commit**

```bash
git add docs/resources/
git commit -m "docs: add Resources section (3 pages)"
```

---

### Task 9: Delete old files and update README

**Files:**
- Delete: `docs/API_REFERENCE.md`
- Delete: `docs/ERROR_CODES.md`
- Delete: `docs/MIGRATION_GUIDE.md`
- Delete: `docs/RFQ_WORKFLOW.md`
- Delete: `docs/SDK_QUICK_REFERENCE.md`
- Delete: `docs/indexer-migration-issues.md`
- Delete: `docs/mm-pricing.md`
- Delete: `docs/product-types.md`
- Delete: `docs/rfq-calculations.md`
- Delete: `docs/rfq-pricing-integration.md`
- Delete: `docs/validation.md`
- Modify: `README.md` (add docs link at top)

- [ ] **Step 1: Delete old doc files**

```bash
git rm docs/API_REFERENCE.md docs/ERROR_CODES.md docs/MIGRATION_GUIDE.md docs/RFQ_WORKFLOW.md docs/SDK_QUICK_REFERENCE.md docs/indexer-migration-issues.md docs/mm-pricing.md docs/product-types.md docs/rfq-calculations.md docs/rfq-pricing-integration.md docs/validation.md
```

- [ ] **Step 2: Add docs link to README.md**

Add this line after line 2 of README.md (after the description):

```markdown

> **Full documentation:** [docs.thetanuts.finance/sdk](https://docs.thetanuts.finance/sdk)
```

- [ ] **Step 3: Update README Documentation section**

The README.md "Documentation" section (lines ~896-920) references the old file paths. Update it to point to the new GitBook sections instead:

Replace the two doc tables (Core references and Deep-dive guides) with:

```markdown
**Core references:**

| Document | Description |
|----------|-------------|
| [Getting Started](https://docs.thetanuts.finance/sdk/getting-started/overview) | Installation, quick start, configuration |
| [OptionBook](https://docs.thetanuts.finance/sdk/optionbook/overview) | Browse orders, preview fills, execute trades |
| [RFQ (Factory)](https://docs.thetanuts.finance/sdk/rfq/overview) | Create custom options, multi-leg structures, RFQ lifecycle |
| [Pricing](https://docs.thetanuts.finance/sdk/pricing/mm-pricing) | MM pricing, spreads, collateral cost |
| [Guides](https://docs.thetanuts.finance/sdk/guides/error-handling) | Error handling, WebSocket, production checklist |
| [SDK Reference](https://docs.thetanuts.finance/sdk/reference/client) | Client, modules, types, utilities |
```

- [ ] **Step 4: Commit**

```bash
git add -A docs/ README.md
git commit -m "docs: delete old files, update README links to GitBook"
```

---

### Task 10: Final verification and push

- [ ] **Step 1: Verify all SUMMARY.md links resolve**

```bash
cd docs && grep -oP '\(([^)]+\.md)\)' SUMMARY.md | tr -d '()' | while read f; do [ -f "$f" ] && echo "OK: $f" || echo "MISSING: $f"; done
```

Expected: all 32 files show "OK", zero "MISSING".

- [ ] **Step 2: Verify no broken cross-references in new pages**

```bash
grep -r 'docs/API_REFERENCE\|docs/ERROR_CODES\|docs/RFQ_WORKFLOW\|docs/SDK_QUICK_REFERENCE\|docs/mm-pricing\|docs/rfq-calculations\|docs/product-types\|docs/rfq-pricing-integration\|docs/validation\|docs/indexer-migration-issues\|docs/MIGRATION_GUIDE' docs/ --include="*.md" -l
```

Expected: no results (no new page links to deleted old files).

- [ ] **Step 3: Count pages and verify structure**

```bash
find docs -name "*.md" -not -path "*/superpowers/*" -not -path "*/examples/*" | wc -l
```

Expected: 33 (SUMMARY.md + 32 content pages).

- [ ] **Step 4: Push**

```bash
git push
```

- [ ] **Step 5: Commit plan**

```bash
git add docs/superpowers/plans/
git commit -m "docs: add GitBook restructure implementation plan"
git push
```
