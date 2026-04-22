# GitBook Documentation Restructure

**Date:** 2026-04-22
**Status:** Design approved, pending implementation
**Goal:** Restructure the Thetanuts SDK documentation into a Uniswap-style GitBook sidebar with focused, navigable pages.

## Problem

The current docs are monolithic markdown files (README.md at 959 lines, API_REFERENCE.md at 2,530 lines) rendered as single long pages on GitBook. The sidebar at docs.thetanuts.finance/sdk shows a flat list of anchors from the README's table of contents. There's no real navigation hierarchy. Developers can't quickly find what they need for their specific use case (OptionBook taker vs RFQ market maker).

## Decisions

1. **Approach:** Full Uniswap-style hierarchy with ~32 focused pages across 7 top-level sections.
2. **Audience:** Both traders/DeFi developers and market makers. Sidebar separates OptionBook and RFQ as peer sections so each persona can find their path.
3. **Platform:** GitBook.com (existing site at docs.thetanuts.finance/sdk).
4. **Source of truth:** README.md stays as the GitHub landing page. GitBook sidebar is powered by `docs/SUMMARY.md` and the restructured `docs/` directory.
5. **Old files:** Existing docs like `RFQ_WORKFLOW.md`, `ERROR_CODES.md` are moved into the new hierarchy. Old files are deleted (not kept as redirects).

## Sidebar Structure

```
Getting Started
  ├── Overview
  ├── Installation
  ├── Quick Start
  ├── Configuration
  └── Supported Chains

OptionBook
  ├── Overview
  ├── Browse & Filter Orders
  ├── Preview Fills
  ├── Fill Orders
  ├── Referrer Fees
  └── Encode for External Wallets

RFQ (Factory)
  ├── Overview
  ├── Create an RFQ
  ├── Multi-Leg Structures
  ├── RFQ Lifecycle
  ├── Early Settlement
  ├── Key Management
  └── Physical Options

Pricing
  ├── MM Pricing Overview
  ├── Position & Spread Pricing
  ├── Filters & Utilities
  └── Collateral Cost Reference

Guides
  ├── Position Management
  ├── Token Operations
  ├── WebSocket Subscriptions
  ├── Blockchain Events
  ├── Error Handling
  ├── Production Checklist
  └── MCP Server

SDK Reference
  ├── Client
  ├── Modules Overview
  ├── Utilities
  ├── Type Exports
  ├── Chain Config
  └── Decimal Reference

Resources
  ├── Migration Guide
  ├── Examples
  └── Changelog
```

## File Layout

```
docs/
├── SUMMARY.md
├── getting-started/
│   ├── overview.md
│   ├── installation.md
│   ├── quick-start.md
│   ├── configuration.md
│   └── supported-chains.md
├── optionbook/
│   ├── overview.md
│   ├── browse-filter-orders.md
│   ├── preview-fills.md
│   ├── fill-orders.md
│   ├── referrer-fees.md
│   └── encode-external-wallets.md
├── rfq/
│   ├── overview.md
│   ├── create-rfq.md
│   ├── multi-leg-structures.md
│   ├── lifecycle.md
│   ├── early-settlement.md
│   ├── key-management.md
│   └── physical-options.md
├── pricing/
│   ├── mm-pricing.md
│   ├── position-spread-pricing.md
│   ├── filters-utilities.md
│   └── collateral-cost.md
├── guides/
│   ├── position-management.md
│   ├── token-operations.md
│   ├── websocket.md
│   ├── events.md
│   ├── error-handling.md
│   ├── production-checklist.md
│   └── mcp-server.md
├── reference/
│   ├── client.md
│   ├── modules-overview.md
│   ├── utilities.md
│   ├── type-exports.md
│   ├── chain-config.md
│   └── decimals.md
├── resources/
│   ├── migration-guide.md
│   ├── examples.md
│   └── changelog.md
└── examples/
    ├── fill-order.ts
    ├── claim-fees.ts
    ├── create-rfq.ts
    ├── fetch-pricing.ts
    ├── option-management.ts
    ├── physical-option-rfq.ts
    └── query-stats.ts
```

## Content Migration Map

Each new page and where its content comes from:

### Getting Started
| New page | Source |
|----------|--------|
| `overview.md` | README.md "Features" + "OptionBook vs RFQ" table |
| `installation.md` | README.md "Installation" + "Compatibility" sections |
| `quick-start.md` | README.md "Quick Start" section |
| `configuration.md` | README.md "Configuration Options" + "Custom Logger" + "env" |
| `supported-chains.md` | README.md "Supported Chains" |

### OptionBook
| New page | Source |
|----------|--------|
| `overview.md` | New: what OptionBook is, data flow, when to use it |
| `browse-filter-orders.md` | README.md "OptionBook: Browse and Fill" (fetch part) + API_REFERENCE.md fetchOrders/filterOrders |
| `preview-fills.md` | README.md "Understanding Collateral vs Contracts" + previewFillOrder docs |
| `fill-orders.md` | README.md "With Signer" + "OptionBook: Browse and Fill" (fill part) |
| `referrer-fees.md` | README.md "Referrer (Fee Sharing)" + API_REFERENCE.md fee methods + getAllClaimableFees/claimAllFees |
| `encode-external-wallets.md` | API_REFERENCE.md encodeFillOrder, encodeSwapAndFillOrder |

### RFQ (Factory)
| New page | Source |
|----------|--------|
| `overview.md` | RFQ_WORKFLOW.md "Overview" + "Timeline" |
| `create-rfq.md` | README.md "RFQ: Create a Custom Option" + RFQ_WORKFLOW.md Phase 1 + collateralAmount=0 rule |
| `multi-leg-structures.md` | README.md butterfly/condor examples + SDK_QUICK_REFERENCE.md multi-leg + product-types.md |
| `lifecycle.md` | RFQ_WORKFLOW.md Phases 1-4, sealed-bid mechanism, collateral handling |
| `early-settlement.md` | README.md "RFQ: Early Settlement" + RFQ_WORKFLOW.md settlement paths |
| `key-management.md` | README.md "RFQ Key Management" + RFQ_WORKFLOW.md key/encryption sections |
| `physical-options.md` | SDK_QUICK_REFERENCE.md "Physical Options" section |

### Pricing
| New page | Source |
|----------|--------|
| `mm-pricing.md` | mm-pricing.md + SDK_QUICK_REFERENCE.md "MM Pricing" section |
| `position-spread-pricing.md` | SDK_QUICK_REFERENCE.md position/spread pricing examples |
| `filters-utilities.md` | SDK_QUICK_REFERENCE.md filter/sort utilities |
| `collateral-cost.md` | rfq-calculations.md collateral cost section + APR rates |

### Guides
| New page | Source |
|----------|--------|
| `position-management.md` | API_REFERENCE.md OptionModule section |
| `token-operations.md` | API_REFERENCE.md ERC20Module section |
| `websocket.md` | README.md "Monitor Positions with WebSocket" + API_REFERENCE.md WebSocketModule |
| `events.md` | API_REFERENCE.md EventsModule section |
| `error-handling.md` | ERROR_CODES.md (full content) |
| `production-checklist.md` | README.md "Production Checklist" |
| `mcp-server.md` | mcp-server/README.md (summarize, link to full) |

### SDK Reference
| New page | Source |
|----------|--------|
| `client.md` | API_REFERENCE.md ThetanutsClient section + src/client/README.md |
| `modules-overview.md` | README.md "Modules" table (updated) + src/modules/README.md overview |
| `utilities.md` | API_REFERENCE.md Utils section |
| `type-exports.md` | SDK_QUICK_REFERENCE.md "Type Exports" section |
| `chain-config.md` | README.md "Chain Configuration" + src/chains/README.md |
| `decimals.md` | SDK_QUICK_REFERENCE.md "Decimal Reference" table |

### Resources
| New page | Source |
|----------|--------|
| `migration-guide.md` | MIGRATION_GUIDE.md (moved as-is) |
| `examples.md` | README.md "Code Examples" listing + descriptions |
| `changelog.md` | New: version history or link to GitHub releases |

## Files to Delete After Migration

These files will be superseded by the new structure:
- `docs/API_REFERENCE.md` (split across optionbook/, rfq/, guides/, reference/)
- `docs/ERROR_CODES.md` (moved to guides/error-handling.md)
- `docs/MIGRATION_GUIDE.md` (moved to resources/migration-guide.md)
- `docs/RFQ_WORKFLOW.md` (split across rfq/ section)
- `docs/SDK_QUICK_REFERENCE.md` (split across all sections)
- `docs/indexer-migration-issues.md` (reference-only, fold into migration-guide.md or drop)
- `docs/mm-pricing.md` (moved to pricing/mm-pricing.md)
- `docs/product-types.md` (folded into rfq/multi-leg-structures.md)
- `docs/rfq-calculations.md` (folded into pricing/ and rfq/ sections)
- `docs/rfq-pricing-integration.md` (folded into pricing/ section)
- `docs/validation.md` (fold into relevant pages or reference/)

Files to keep:
- `docs/examples/*.ts` (moved to `docs/examples/`, same content)
- `README.md` (GitHub landing page, add "Full docs" link at top)
- `src/**/*.md` files (internal source documentation, not part of GitBook)

## GitBook Configuration

Add `.gitbook.yaml` at repo root:

```yaml
root: ./docs/
structure:
  summary: SUMMARY.md
```

This tells GitBook to look in `docs/` for all content and use `SUMMARY.md` for the sidebar.

## SUMMARY.md Format

```markdown
# Table of contents

## Getting Started

* [Overview](getting-started/overview.md)
* [Installation](getting-started/installation.md)
* [Quick Start](getting-started/quick-start.md)
* [Configuration](getting-started/configuration.md)
* [Supported Chains](getting-started/supported-chains.md)

## OptionBook

* [Overview](optionbook/overview.md)
* [Browse & Filter Orders](optionbook/browse-filter-orders.md)
* [Preview Fills](optionbook/preview-fills.md)
* [Fill Orders](optionbook/fill-orders.md)
* [Referrer Fees](optionbook/referrer-fees.md)
* [Encode for External Wallets](optionbook/encode-external-wallets.md)

## RFQ (Factory)

* [Overview](rfq/overview.md)
* [Create an RFQ](rfq/create-rfq.md)
* [Multi-Leg Structures](rfq/multi-leg-structures.md)
* [RFQ Lifecycle](rfq/lifecycle.md)
* [Early Settlement](rfq/early-settlement.md)
* [Key Management](rfq/key-management.md)
* [Physical Options](rfq/physical-options.md)

## Pricing

* [MM Pricing Overview](pricing/mm-pricing.md)
* [Position & Spread Pricing](pricing/position-spread-pricing.md)
* [Filters & Utilities](pricing/filters-utilities.md)
* [Collateral Cost Reference](pricing/collateral-cost.md)

## Guides

* [Position Management](guides/position-management.md)
* [Token Operations](guides/token-operations.md)
* [WebSocket Subscriptions](guides/websocket.md)
* [Blockchain Events](guides/events.md)
* [Error Handling](guides/error-handling.md)
* [Production Checklist](guides/production-checklist.md)
* [MCP Server](guides/mcp-server.md)

## SDK Reference

* [Client](reference/client.md)
* [Modules Overview](reference/modules-overview.md)
* [Utilities](reference/utilities.md)
* [Type Exports](reference/type-exports.md)
* [Chain Config](reference/chain-config.md)
* [Decimal Reference](reference/decimals.md)

## Resources

* [Migration Guide](resources/migration-guide.md)
* [Examples](resources/examples.md)
* [Changelog](resources/changelog.md)
```

## Page Style Guidelines

Each page follows this structure:
1. **Title** (H1) matching the sidebar entry name
2. **One-line description** of what this page covers
3. **Content** with code examples inline (not "see example X")
4. **See also** footer linking to 2-3 related pages

Page length target: 100-400 lines. If a page exceeds 500 lines, it should be split.

Code examples should be copy-paste ready with imports included.

## README.md Changes

Add a docs link near the top of README.md:

```markdown
> **Full documentation:** [docs.thetanuts.finance/sdk](https://docs.thetanuts.finance/sdk)
```

Keep all existing README content. It serves as the GitHub landing page and npm package page.

## Implementation Order

1. Create directory structure and `.gitbook.yaml`
2. Write `SUMMARY.md`
3. Create all pages in `getting-started/` (extract from README)
4. Create all pages in `optionbook/` (extract from README + API_REFERENCE)
5. Create all pages in `rfq/` (extract from README + RFQ_WORKFLOW + API_REFERENCE)
6. Create all pages in `pricing/` (extract from mm-pricing, rfq-calculations, SDK_QUICK_REFERENCE)
7. Create all pages in `guides/` (extract from ERROR_CODES, API_REFERENCE, README)
8. Create all pages in `reference/` (extract from API_REFERENCE, SDK_QUICK_REFERENCE)
9. Create all pages in `resources/` (move MIGRATION_GUIDE, create examples index, changelog)
10. Move `docs/examples/` (already in place)
11. Delete old files
12. Add docs link to README.md
13. Commit and push

## Out of Scope

- No changes to source code or `src/**/*.md` internal docs
- No new content creation (only restructuring existing content)
- No custom GitBook theme or styling
- No CI/CD for docs deployment (GitBook syncs from GitHub automatically)
- No versioned docs (single version for now)
