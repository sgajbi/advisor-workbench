# RFC-0017: Foundation App First-Production Surface

- Status: PROPOSED
- Date: 2026-03-26
- Owners: lotus-workbench
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-core maintainers
  - lotus-performance maintainers
  - lotus-report maintainers
  - lotus-platform maintainers

## Summary

The first production-grade application to be built on the new `lotus-workbench` shell should be
the `Foundation` app.

`Foundation` is the internal implementation name for the universal portfolio entry point of the
Lotus product ecosystem. In the UI, this surface should present itself as `Portfolio`.

It should give users a premium, trustworthy, portfolio-first workspace before they move into
Performance, Risk & Suitability, Recommendations, Operations, or Reporting flows.

This RFC defines `Foundation` as the first real app surface on the new shell and design-system
foundation.

It also establishes an execution rule:

1. if `Foundation` exposes missing or weak domain-owned rendering inputs,
2. those issues must be filed in the owning repository,
3. and fixed at the source rather than hidden in long-lived `lotus-gateway` or frontend
   workarounds.

## Why This Is Next

After the shell and design-system foundation, the first product surface should be the one that:

1. every later workflow depends on,
2. exercises multiple upstream integrations,
3. reveals product-input gaps early,
4. provides a portfolio-first operating model for the rest of the suite.

That surface is `Foundation`.

It is the right first app because:

1. Proposal, Manage, Performance, and Risk all depend on strong portfolio context,
2. the current `/portfolios` and `/workbench` experiences prove useful data but not yet a
   world-class product baseline,
3. `Foundation` will expose where `lotus-core`, `lotus-performance`, `lotus-report`, and
   `lotus-gateway` contracts need to improve for premium UI quality.

## Problem Statement

The current portfolio-facing surfaces show valuable data, but they are still transitional.

Current issues:

1. portfolio selection, overview, and decision entry are split across route-centric slices,
2. the current presentation is useful but not yet cohesive enough to be the universal entry point
   for the ecosystem,
3. trust metadata, evidence cues, degraded states, and navigation patterns are not yet productized
   as one coherent experience,
4. cross-service inputs are good enough for current screens but not yet governed as the first-class
   rendering contract for a premium portfolio foundation workspace.

`Foundation` therefore needs to become:

1. the portfolio-first landing application,
2. the source of portfolio context for the rest of the shell,
3. the first product-grade proof of the new workbench architecture.

The user-facing product name for that app should be `Portfolio`, not `Foundation`.

## Goals

1. Build `Foundation` as the first production-grade app on the new shell.
2. Make portfolio selection and overview the universal entry point for later workflows.
3. Present portfolio health, composition, readiness, and evidence in a premium and resilient way.
4. Identify upstream contract gaps early and route them to the owning repos.
5. Create a reusable product template for later app waves.

## Non-Goals

1. Solving full Performance analysis in this RFC.
2. Solving full Risk analysis in this RFC.
3. Building the full Proposal or Manage workflows in this RFC.
4. Fixing upstream data-quality or contract issues inside `lotus-workbench` by default.
5. Introducing AI product features in this first app wave.

## Decision

`Foundation` will be the first product-grade app built on the shell foundation.

### 1. `Foundation` is the internal implementation name for the `Portfolio` app

Users should enter the Lotus ecosystem through a portfolio-first application that answers:

1. what portfolios exist,
2. which one am I looking at,
3. what is its current health and posture,
4. what workflows is it ready for,
5. where should I go next.

### 2. `Foundation` should unify the current fragmented baseline

The new `Foundation` app should absorb and improve the intent behind current routes such as:

1. portfolio list and selection,
2. portfolio overview,
3. top positions and allocation summaries,
4. reporting summary cues,
5. workflow entry actions.

### 3. `Foundation` should expose trust and evidence clearly

The app should surface:

1. as-of date,
2. source freshness,
3. valuation readiness,
4. partial failures,
5. warnings,
6. workflow entry readiness,
7. links into deeper experiences.

### 4. Source issues must be fixed upstream

If `Foundation` implementation reveals missing rendering inputs such as:

1. missing freshness metadata,
2. missing asset classification detail,
3. poor warning semantics,
4. weak supportability or lineage hooks,
5. insufficient portfolio summary fields,

those gaps should be filed as GitHub issues in the owning repositories and resolved there where
possible.

The gateway may provide bounded orchestration and shaping, but should not become a permanent hiding
layer for weak upstream contracts.

## Proposed Product Scope

The initial `Foundation` surface should include:

1. portfolio catalog and selection,
2. portfolio summary and health,
3. holdings and top-position overview,
4. allocation overview,
5. valuation and reporting readiness,
6. workflow launch points into later apps.

### Initial navigation targets

`Foundation` should lead users naturally to:

1. Performance app,
2. Risk & Suitability app,
3. Recommendations app,
4. Operations app where relevant,
5. Reporting app.

## UX Direction

The `Foundation` app should feel:

1. calm,
2. premium,
3. information-dense but readable,
4. operationally trustworthy,
5. clearly portfolio-first,
6. structured like a working desk rather than a marketing page.

It should also read like a refined advisory product rather than a collection of internal system
modules.

It should not feel like:

1. a raw data table,
2. a generic dashboard,
3. a temporary staging page,
4. a center-column experience padded with explanatory copy.

## Technical Direction

### Workbench structure

`Foundation` should be built in the new app-oriented structure, not as another legacy page-first
addition.

Target direction:

1. `src/apps/foundation/`
2. shell-owned route mounting in `src/app/`
3. design-system primitives for panels, status, evidence, and layout

### Gateway integration

`Foundation` should consume gateway contracts shaped for product entry and portfolio context.

Because the platform is pre-live:

1. if current gateway contracts are not the right shape,
2. they should be replaced,
3. old gateway APIs should be removed when the new contract is ready,
4. the program should not preserve stale endpoint families by default.

### Upstream contract discipline

The following repositories are likely to need improvements as `Foundation` matures:

1. `lotus-core` for portfolio truth and readiness metadata,
2. `lotus-performance` for summary analytics and comparison inputs,
3. `lotus-report` for report-ready summary signals,
4. `lotus-gateway` for experience shaping and degradation behavior.

Any issue discovered should be logged in the owning repo with product impact clearly explained.

## Delivery Slices

### Slice 1: Foundation app information architecture

Outcome:

1. the `Foundation` app structure and page model are explicit,
2. portfolio-first entry becomes the top-level product baseline.

Acceptance gate:

1. the app has a clear route and layout model,
2. it fits naturally into the new shell.

### Slice 2: Foundation portfolio catalog and summary

Outcome:

1. portfolio list and selection are product-grade,
2. summary and health panels are product-grade,
3. current top-level trust metadata is visible.

Acceptance gate:

1. the app is already a better ecosystem entry point than the current route mix,
2. degraded states are clear and usable.

### Slice 3: Foundation holdings, allocation, and readiness

Outcome:

1. the app shows portfolio composition clearly,
2. it expresses readiness for later workflows,
3. reporting and valuation posture are legible.

Acceptance gate:

1. users can confidently decide where to go next,
2. evidence and readiness are understandable without reading raw backend data.

### Slice 4: Upstream issue-routing and cleanup

Outcome:

1. upstream gaps discovered during implementation are documented,
2. issues are filed in owning repos,
3. temporary gateway or UI shaping remains bounded and reviewable.

Acceptance gate:

1. the implementation improves the ecosystem rather than only the local surface,
2. ownership discipline is preserved.

## Risks

1. the first app could become too broad if later domain concerns are pulled in too early.
2. teams may try to fix upstream problems locally for speed.
3. the current route structure may tempt a partial uplift instead of a true productization pass.

## Alternatives Considered

### Alternative 1: Build Proposal or Manage first

Rejected.

Reason:

1. those workflows depend on strong portfolio context,
2. `Foundation` is the better universal base.

### Alternative 2: Treat current `/portfolios` as good enough and move on

Rejected.

Reason:

1. it proves the concept but not the product standard,
2. later apps would inherit a weak ecosystem entry point.

## Initial Implementation Focus

The first implementation work after approval should be:

1. define the `Portfolio` app route and layout on the new shell,
2. replace the current fragmented portfolio entry experience with a coherent app surface,
3. identify gateway contract changes needed for the first production-grade version,
4. file upstream issues immediately when domain-owned gaps are discovered.

## Acceptance Criteria

This RFC is complete when:

1. `Foundation` exists as the first production-grade app in `lotus-workbench`,
2. it provides a clearly superior portfolio-first entry point,
3. it proves the shell and design-system foundation in a real workflow,
4. upstream gaps discovered during the work are routed to the owning repos rather than hidden
   locally,
5. the app becomes the product template for later Performance, Risk, Proposal, Manage, and
   Reporting waves.

## Approval Requested

Approve this RFC if the team agrees that:

1. `Foundation` should be the first product-grade app built on the new shell,
2. it should serve as the universal portfolio-first entry point for the Lotus ecosystem,
3. upstream contract and rendering-input gaps discovered during this work must be fixed at the
   right source repository whenever feasible,
4. implementation should proceed in the slices defined here.
