# RFC-0018: Performance Workspace Summary and Benchmark-Aware Presentation

- Status: IN PROGRESS
- Date: 2026-03-27
- Owners:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-core maintainers
  - lotus-performance maintainers
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-core maintainers
  - lotus-performance maintainers
  - lotus-platform maintainers

## Summary

The `Performance` experience in `lotus-workbench` should move from a stitched analytics screen to a
source-aligned, benchmark-aware performance workstation built on the `lotus-performance`
`workspace-summary` contract.

This RFC defines the next implementation wave:

1. use `lotus-performance` `POST /performance/workspace-summary` as the primary analytics source,
2. use `lotus-core` benchmark catalog and assignment contracts for benchmark discovery and
   switching,
3. surface comparative returns, contribution, attribution, position contributors, money-weighted
   return, annualized return, and explicit economics clearly and efficiently,
4. tighten layout spacing and panel rhythm so the screen reads like one institutional workstation,
   not a collection of loosely placed panels,
5. seed one stronger demo mandate and two benchmarks with longer history so the UI can show real
   switching and real benchmark-relative analytics,
6. make the seeded-data approach reusable through shared tooling and documented runtime workflow.

## Why This RFC Exists

`lotus-performance` has now implemented the source-owned improvements requested in issue `#113` and
issue `#114`:

1. richer attribution and contribution payloads,
2. a workspace-summary contract designed for interactive workbench refreshes,
3. benchmark-aware attribution fields including portfolio and benchmark weights and returns,
4. first-class position contribution output,
5. capability advertisement for the new surface.

`lotus-workbench` and `lotus-gateway` are still shaped around an older stitched call pattern:

1. separate TWR `NET`,
2. separate TWR `GROSS`,
3. separate MWR,
4. separate contribution,
5. separate attribution,
6. hard-coded benchmark options.

That older integration path now creates unnecessary complexity, slower interaction behavior, and a
less coherent UI than the source contract can support.

## Problem Statement

The current performance workspace has four material weaknesses:

1. it does not consume the new source-owned `workspace-summary` contract,
2. it still hard-codes benchmark choices instead of discovering them from Lotus Core,
3. seeded analytics data is not yet rich enough for benchmark switching and longer-horizon
   comparative analysis,
4. visual spacing and panel composition still expose transitional layout behavior rather than a
   gold-standard front-office workstation.

These are now solvable with cleaner source-aligned contracts and stronger demo data.

## Goals

1. Replace the old stitched gateway analytics flow with a cleaner `workspace-summary` integration.
2. Remove hard-coded benchmark selector values from `lotus-workbench`.
3. Expose benchmark-relative attribution and contribution data truthfully and clearly.
4. Surface two selectable benchmarks in the UI for the demo mandate.
5. Create a longer-history, more realistic seeded portfolio for performance demonstrations.
6. Make seeded benchmark and portfolio creation reusable and documented.
7. Tighten UI spacing, rhythm, and responsiveness so the performance screen uses the canvas more
   intelligently across screen sizes.
8. Keep naming, APIs, and documentation aligned to Lotus vocabulary and platform standards.

## Non-Goals

1. Replacing the deeper detailed `lotus-performance` endpoints.
2. Rebuilding the full shell or the full portfolio workspace in this RFC.
3. Introducing fake benchmark or attribution data in `gateway` or `workbench`.
4. Preserving old stitched analytics contracts after the new path is live.

## Current Source Reality

### `lotus-performance`

`lotus-performance` now provides:

1. `POST /performance/workspace-summary`
2. `GET /performance/workspace-summary/results/{calculation_id}`
3. multi-period workspace summaries,
4. benchmark summaries and active return blocks,
5. money-weighted return summary,
6. optional contribution block with:
   - levels,
   - total contribution,
   - position contributions,
   - weight and return context,
7. optional attribution block with:
   - portfolio and benchmark weights,
   - portfolio and benchmark returns,
   - allocation,
   - selection,
   - interaction,
   - total effect,
   - reconciliation.

### `lotus-core`

`lotus-core` already provides the benchmark source contracts needed for a real UI:

1. `POST /integration/portfolios/{portfolio_id}/benchmark-assignment`
2. `POST /integration/benchmarks/catalog`
3. `POST /integration/benchmarks/{benchmark_id}/composition-window`
4. `POST /integration/benchmarks/{benchmark_id}/return-series`

### `lotus-gateway`

`lotus-gateway` currently still orchestrates the older detailed flow and maintains a UI-shaped
contract that does not yet fully mirror the richer source-owned workspace summary.

### `lotus-workbench`

`lotus-workbench` currently:

1. renders benchmark options from a local constant,
2. duplicates some summary information,
3. still has panel spacing and layout gaps that feel transitional,
4. does not yet surface the full range of source-owned contribution and attribution context.

## Decision

`lotus-gateway` and `lotus-workbench` should align to the new source-owned performance model.

### 1. Gateway should adopt `workspace-summary` as the primary performance workspace contract

The main performance workspace route should be backed by one primary analytics request:

1. `workspace-summary`

The gateway may still use bounded supplementary calls only when the source contract does not yet
provide a required screen element, but the old stitched path should not remain the default.

### 2. Workbench should render benchmark-aware analytics directly from the richer response

The UI should surface:

1. portfolio and benchmark return side-by-side,
2. active return,
3. annualized return when applicable,
4. market-value and cash-flow context,
5. position contributor rankings,
6. contribution segmentation,
7. attribution segmentation,
8. benchmark-relative attribution with portfolio and benchmark weight/return context,
9. benchmark switching using real source-owned benchmark identifiers.

### 3. Benchmark switching should use real benchmark catalog data

The benchmark selector should be populated from Lotus Core catalog data for the demo mandate’s
currency and effective date, not from hard-coded local constants.

### 4. Demo analytics data should become stronger and reusable

The seeded analytics path should provide:

1. one flagship demo performance mandate,
2. at least two valid benchmarks,
3. multi-year history,
4. realistic holdings, transactions, valuation path, and benchmark compositions,
5. a reusable ingestion/seed mechanism documented for local demo bring-up.

## UX Direction

The `Performance` workspace should feel like one analytical workstation.

It should emphasize:

1. one dominant chart stage,
2. compact but clear control placement,
3. strong summary hierarchy without duplicate facts,
4. denser analytical tables,
5. explicit legends and benchmark context,
6. tighter vertical rhythm between sections,
7. graceful responsiveness across laptop, tablet, and smaller viewport widths.

Panel spacing should be reviewed critically:

1. where spacing supports scanability, it should remain,
2. where spacing creates visual drift or the feeling of disconnected boxes, it should be reduced.

## Delivery Slices

### Slice 1: RFC and contract alignment

Outcome:

1. this RFC exists,
2. benchmark and workspace-summary source contracts are reviewed,
3. target gateway and UI contract changes are explicit.

### Slice 2: Reusable seeded demo analytics path

Outcome:

1. one stronger demo portfolio exists with longer history,
2. two benchmarks exist for the same mandate context,
3. local bring-up instructions are documented,
4. tests prove the seeded bundle shape.

### Slice 3: Gateway workspace-summary integration

Outcome:

1. gateway adopts `workspace-summary`,
2. hard-coded benchmark behavior is removed,
3. gateway contract exposes richer comparative, contribution, attribution, and benchmark data,
4. tests prove the contract mapping.

### Slice 4: Workbench workstation upgrade

Outcome:

1. UI shows benchmark-aware analytics clearly,
2. spacing and composition are tightened,
3. benchmark selector is source-backed,
4. the page performs well and remains readable across screen sizes.

### Slice 5: Live stack validation

Outcome:

1. `lotus-core`, `lotus-performance`, `lotus-gateway`, and `lotus-workbench` are brought up
   together,
2. the stronger seeded data is visible end to end,
3. benchmark switching works live,
4. RFC/docs are updated to reflect actual implementation state.

## Acceptance Criteria

The RFC can be marked implemented only when:

1. gateway performance workspace no longer defaults to the old stitched path,
2. workbench benchmark selector is fed by real benchmark catalog data,
3. two benchmarks can be selected live for the seeded flagship mandate,
4. contribution and attribution surfaces show the richer source-owned fields where available,
5. seeded demo data covers a longer realistic history window,
6. local bring-up and seeding documentation exists,
7. meaningful tests protect gateway mapping, UI rendering, and demo-data ingestion.

## Repository Impact

Expected touched repositories:

1. `lotus-workbench`
2. `lotus-gateway`
3. `lotus-core`
4. optionally `lotus-platform` if shared runtime or reusable seeding workflow documentation should
   be centralized there

`lotus-performance` is treated as the source-owned contract dependency for this RFC and should only
be changed here if new gaps are discovered that belong upstream.
