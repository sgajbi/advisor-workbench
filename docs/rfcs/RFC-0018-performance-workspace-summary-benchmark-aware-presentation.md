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
9. Move the performance screen toward a hybrid composition model instead of a permanently
   monolithic gateway payload.

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

`lotus-gateway` currently still exposes one screen-shaped performance route. That is acceptable as
an initial integration boundary, but it should not become the permanent contract shape for every
interactive analytical panel.

### `lotus-workbench`

`lotus-workbench` currently:

1. renders benchmark options from a local constant,
2. duplicates some summary information,
3. still has panel spacing and layout gaps that feel transitional,
4. does not yet surface the full range of source-owned contribution and attribution context.

## Decision

`lotus-gateway` and `lotus-workbench` should align to the new source-owned performance model, but
they should do so with a hybrid composition architecture rather than assuming one gateway response
must serve the full workstation forever.

### Hybrid composition decision

The preferred target architecture is:

1. one `performance workspace summary` contract for first paint and shared screen context,
2. dedicated analytical sub-contracts for heavier or independently refreshed panels,
3. one shared URL and client state model so all panels remain synchronized on:
   - portfolio,
   - benchmark,
   - horizon,
   - basis,
   - segment,
   - explicit date window.

This means the long-term screen should not rely on a single oversized gateway response for:

1. contribution detail,
2. attribution detail,
3. attribution over time,
4. benchmark exploration,
5. future risk and policy comparison modules.

Instead, the gateway should evolve toward:

1. `summary` or `first-paint` APIs,
2. narrower analytical detail APIs,
3. clear ownership boundaries per sub-screen or heavy panel.

The immediate pattern for this RFC is:

1. `performance/summary` for first paint,
2. `performance/details` for the lower analytical canvas,
3. a dedicated `performance/horizon-comparison` module contract for compact comparative bars.

The presentation layer should also move toward a stronger design-system-led implementation:

1. prefer `MUI` layout and control primitives for analytical toolbars, segmented controls, form
   fields, and dense workstation headers,
2. keep `globals.css` focused on shell, responsive layout rails, and small visual bridges rather
   than bespoke control behavior,
3. evolve reusable design-system primitives for analytics screens instead of styling each module as
   a one-off surface,
4. standardize analytical sub-panels around shared module shells, table shells, and comparative
   section patterns so the lower canvas behaves like one workstation rather than several unrelated
   widgets,
5. standardize ranked contributor modules and attribution effect-strip visuals on shared analytical
   primitives instead of duplicating custom HTML/CSS for each panel.

The presentation target for the attribution canvas also includes a benchmark-relative segment
matrix that surfaces, for each selected segment:

1. portfolio weight,
2. benchmark weight,
3. active weight,
4. portfolio return,
5. benchmark return,
6. active return,
7. total effect context.

This RFC adopts that direction immediately, even if the first implementation slices still reuse
some shared upstream calls while the source contracts mature.

## Implementation Slices

This RFC should be executed in the following order:

1. enrich `lotus-core` demo data with one stronger flagship mandate, longer history, and two
   switchable benchmarks,
2. cut `lotus-gateway` over from stitched analytics calls to the source-owned
   `workspace-summary` contract plus Lotus Core benchmark catalog discovery,
3. move `lotus-workbench` from hard-coded benchmark options and partial attribution rendering to
   the richer benchmark-aware contract,
4. tighten chart spacing, panel rhythm, and analytical density once the richer data is live,
5. bring the runtime stack up together and validate benchmark switching and benchmark-aware
   contribution/attribution presentation end to end.

The active implementation rule is:

1. do not add fake UI data to compensate for missing source contracts,
2. keep the route boundary stable where possible,
3. reduce complexity while migrating rather than preserving transitional duplication.

### 1. Gateway should adopt `workspace-summary` as the primary first-paint performance contract

The initial performance workspace render should be backed by one primary analytics request:

1. `workspace-summary`

The gateway may still use bounded supplementary calls only when the source contract does not yet
provide a required screen element, but the old stitched path should not remain the default.

The gateway should also begin separating:

1. summary and shared-context shaping,
2. detail-panel shaping,
3. benchmark discovery and switching support.

The first implementation does not need to expose every split route immediately, but the internal
service structure should move in that direction.

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

Seed replay and reference-data hygiene rules:

1. repeated demo seed runs must not degrade benchmark switching or workspace-summary analytics,
2. superseded effective-dated benchmark rows must not leak duplicate definitions or duplicate
   component segments into benchmark catalog or composition-window payloads,
3. downstream contracts should resolve the latest valid benchmark definition and component set
   deterministically for the requested as-of date or window,
4. demo verification should prove benchmark catalog uniqueness and benchmark composition-window
   usability for the flagship mandate.

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

### Comparative analytical composition

The lower analytical canvas should move toward a denser comparative composition similar to
institutional portfolio analytics workstations:

1. active weights by segment,
2. top and bottom portfolio contributors with average weight, total return, and contribution,
3. multi-horizon portfolio-versus-benchmark return bars,
4. total attribution effect by segment,
5. benchmark and currency context visible at the analytical module level.

This pattern is preferred over:

1. isolated mini-cards,
2. repeated summary facts,
3. large empty gaps between analytical panels,
4. generic dashboard tiling.

Where the source contract supports it, the workstation should favor:

1. side-by-side portfolio and benchmark comparison,
2. effect ranking and contributor ranking,
3. explicit weight and return context,
4. compact tables paired with compact analytical bars.

### Professional analytics interaction model

The workstation should also learn from professional portfolio analytics applications that feel:

1. modular,
2. chart-first,
3. operational,
4. dense without feeling chaotic,
5. fast under repeated interaction.

Desired direction:

1. tabs or subviews for major analytical modes when the screen becomes too crowded,
2. compact module headers with contextual tools instead of oversized explanatory sections,
3. interactive comparative charts and bars that react quickly to control changes,
4. stronger use of the available canvas,
5. less visual dead space between analytical modules,
6. a workstation feel closer to an institutional analytics desk than a modern marketing dashboard.

Not every pattern in legacy analytics products should be copied literally, but the following
qualities are explicitly desirable:

1. seriousness,
2. density,
3. predictable interaction,
4. visible benchmark-relative comparison,
5. multiple analytical lenses within one coherent workspace.

### Multi-panel analytical workstation pattern

Another desirable reference pattern is the disciplined four-panel analytical desk:

1. cumulative return chart,
2. risk oversight comparison bars,
3. hierarchical performance table,
4. policy or target-band exposure comparison.

This matters because it shows how multiple analytical questions can live in one screen without the
UI collapsing into noise.

The `Performance` workspace should adopt the same principles where the source contracts support
them:

1. line-based comparative return history in a dedicated chart module,
2. ranked or comparative bar modules for oversight-style metrics,
3. expandable or hierarchy-aware performance tables,
4. target-band or benchmark-relative comparison modules where portfolio policy context exists.

Not all of these modules belong in the first implementation slice, but the RFC should explicitly
aim for:

1. a workstation that supports adjacent analytical modules,
2. cross-reading between charts, tables, and comparative bars,
3. a layout that uses the canvas efficiently instead of stacking every module vertically.

Panel spacing should be reviewed critically:

1. where spacing supports scanability, it should remain,
2. where spacing creates visual drift or the feeling of disconnected boxes, it should be reduced.

### Attribution over time

The workstation should also support an attribution-over-time visual treatment for users who need to
understand how active return accumulated through the selected window.

Target visual pattern:

1. stacked or grouped bars for period attribution effects,
2. one line for cumulative total effect or cumulative active return,
3. period labels anchored to the selected chart frequency,
4. consistent legend semantics and color mapping,
5. seamless switching between tabular and visual attribution analysis.

The first implementation should use source-owned effects already available from the current Lotus
contract:

1. `allocation`,
2. `selection`,
3. `interaction`,
4. `total_effect`.

If future `lotus-performance` contracts expose richer fixed-income attribution factors such as:

1. `shift`,
2. `twist`,
3. `spread`,
4. curve or carry components,

the same visual pattern can be extended without changing the workstation interaction model.

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
4. tests prove the contract mapping,
5. internal gateway shaping separates first-paint summary concerns from heavier analytical detail
   concerns.

### Slice 4: Workbench workstation upgrade

Outcome:

1. UI shows benchmark-aware analytics clearly,
2. spacing and composition are tightened,
3. benchmark selector is source-backed,
4. the page performs well and remains readable across screen sizes,
5. the workstation becomes structurally ready for panel-level or sub-screen analytical fetching.

Additional expectation:

1. attribution should have both a tabular detail treatment and an over-time visual treatment where
   source data supports it.
2. the detail region should support a denser institutional composition for active weights,
   contributors, horizon comparisons, and effect ranking.

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
8. the RFC explicitly governs how attribution-over-time should be surfaced, even if some richer
   factor families remain a later upstream enhancement.
9. the implementation direction is explicitly hybrid:
   - initial summary composition may stay consolidated,
   - heavier analytical panels should be able to split into dedicated APIs without redesigning the
     screen state model.

## Remaining Gaps Before RFC Closure

As of 2026-03-27, this RFC is materially advanced but not yet fully closed.

The main remaining closure slices are:

1. deliver attribution-over-time as a real benchmark-relative analytical module when the source
   contract and gateway surface are ready,
2. complete one final live-browser polish and responsive QA pass against the real runtime stack,
3. verify the final demo-data and benchmark-switching workflow documentation against the actual
   local bring-up path end to end.

Until those are complete, the RFC should remain `IN PROGRESS` rather than being treated as fully
implemented.

## Repository Impact

Expected touched repositories:

1. `lotus-workbench`
2. `lotus-gateway`
3. `lotus-core`
4. optionally `lotus-platform` if shared runtime or reusable seeding workflow documentation should
   be centralized there

`lotus-performance` is treated as the source-owned contract dependency for this RFC and should only
be changed here if new gaps are discovered that belong upstream.
