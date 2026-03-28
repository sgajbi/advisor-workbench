# RFC-0019: Modular Portfolio Book and Ledger Experience

- Status: IN_PROGRESS
- Date: 2026-03-27
- Owners: lotus-workbench
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-core maintainers
  - lotus-platform maintainers

## Summary

`RFC-0017` established the first production `Portfolio` surface. The next step is to expose the
full private-banking portfolio operating picture in a modular way:

1. AUM and core mandate summary
2. asset allocation by multiple reporting dimensions
3. cash balances and liquidity inventory
4. holdings and top positions
5. full transaction ledger
6. cashflow outlook
7. income and activity reporting
8. operational supportability and booked-state freshness

This RFC formalizes the next wave as a modular portfolio experience, not a single oversized
gateway response. The UI should behave like a bank-grade analytical workstation, while the gateway
should expose coherent sub-surfaces that map to real source-owned data contracts.

## Why This RFC Exists

`RFC-0017` is already implemented and was intentionally limited to the first production portfolio
surface. Since then, `lotus-core` has added PB/WM wealth reporting and ledger APIs that surface
stronger portfolio domain capabilities.

That creates a new opportunity:

1. upgrade the UI from overview-oriented portfolio context to a richer private-banking portfolio
   desk
2. align the gateway to a more modular portfolio contract family
3. clean up stale `foundation` naming and other transitional patterns along the way

This work is therefore a follow-on RFC, not a reopening of `RFC-0017`.

## Problem Statement

The current `Portfolio` UI still reflects first-wave constraints:

1. it favors one stitched workspace payload over modular sub-surfaces
2. it does not expose the full wealth-reporting capabilities now available in `lotus-core`
3. cash balances, allocation views, and full ledger workflows are still underrepresented
4. the gateway still contains legacy `foundation` concepts and older integration assumptions
5. the screen composition is not yet aligned with how private banks review a live portfolio book

## Goals

1. expose the new `lotus-core` PB/WM data capabilities in the UI
2. keep the gateway modular, with separate portfolio summary, liquidity, allocation, positions,
   and ledger endpoints
3. assemble the UI from those modular slices coherently from a private-banking perspective
4. remove stale naming and outdated integration patterns where touched
5. document the new portfolio app architecture clearly
6. keep the codebase more modular and readable than before the RFC started

## Non-Goals

1. rebuilding `Performance` inside this RFC
2. creating a single gateway endpoint for every portfolio concern
3. replacing source-owned PB/WM logic with gateway-only calculations
4. introducing long-lived compatibility aliases for old `foundation` naming

## Decision

The `Portfolio` experience will adopt a hybrid modular architecture:

1. a summary endpoint for mandate identity, AUM, high-level liquidity, readiness, and workflow
   launch cues
2. a liquidity endpoint for cash balances and short-horizon cashflow outlook
3. an allocation endpoint for portfolio composition across reporting dimensions
4. a positions endpoint for top positions and the full holdings book
5. a transaction ledger endpoint for full transaction history and filtering
6. reporting endpoints for income summary and activity summary

The workbench may assemble those sub-surfaces into one UI, but the gateway should keep them as
distinct contracts. A convenience `book` endpoint may still exist for coarse consumers, but the
flagship UI should consume the narrower slices directly.

## Source Boundaries

For this RFC, the approved source boundary is:

1. `lotus-core query_service` PB/WM reporting and ledger APIs for AUM, allocation, cash balances,
   holdings, and transactions
2. `lotus-core query_control_plane_service` support and evidence APIs for operational readiness and
   lineage-oriented support metadata

If later governance requires those wealth-reporting APIs to move behind `query_control_plane_service`,
that should be handled in `lotus-core` and then adopted here without changing the UI intent.

## Private-Banking Composition Rules

The UI should organize data in a way that matches private-banking and market-standard portfolio
review practices:

1. mandate and client context first
2. AUM, invested assets, and cash clearly separated
3. liquidity and cash inventory treated as a first-class operational surface
4. holdings and full book treated separately from transaction history
5. asset allocation available across several meaningful reporting dimensions
6. income and activity reporting visible as first-class PB/WM reporting modules
7. operational readiness visible without overwhelming the primary advisory flow

## Delivery Slices

### Slice 1: Gateway contract cleanup and modular portfolio endpoints

Outcome:

1. retire touched `foundation` naming in favor of `portfolio`
2. expose modular summary, liquidity, allocations, positions, ledger, and reporting contracts
3. align gateway calls to the real `lotus-core` PB/WM APIs

### Slice 2: Workbench modular data consumption

Outcome:

1. workbench consumes modular portfolio endpoints directly
2. UI assembles the screen from summary, book, ledger, and reporting slices
3. existing portfolio route remains stable while the internal data flow becomes more modular

### Slice 3: Private-banking-grade presentation pass

Outcome:

1. stronger book and ledger layout
2. better use of space and clearer hierarchy
3. more professional reporting and liquidity presentation
4. dedicated income and activity modules driven by `lotus-core` reporting APIs

## Acceptance Criteria

1. `Portfolio` can show AUM, cash, allocations, positions, top positions, ledger, and cashflow
   from the new `lotus-core` capabilities
2. `Portfolio` can show income and activity reporting from the newer `lotus-core` reporting APIs
3. gateway exposes modular portfolio APIs rather than one giant response
4. workbench assembles the portfolio desk from multiple coherent sub-surfaces instead of one
   oversized book payload
5. stale `foundation` naming is removed from the touched gateway path
6. tests validate real contract and assembly behavior
7. docs and RFC index reflect the delivered architecture

## Remaining Closure Gaps

The current implementation delivers the modular portfolio surface, but two source-owned gaps
remain before the toolbar can be considered fully source-backed:

1. true historical `as_of` portfolio snapshots across the portfolio workspace contracts
2. true reporting-currency restatement for portfolio reporting and book views

Until those are delivered in `lotus-core`, the workbench should not imply that historical snapshot
navigation or cross-currency restatement are fully operational. The current UI keeps those controls
visible but disabled with explicit product copy so the user is not misled.
