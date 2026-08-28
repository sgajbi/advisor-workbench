# UI Architecture Audit Ledger

- RFC: RFC-0021
- Slice: 1
- Date: 2026-04-05
- Scope: token baseline and shared foundation audit

## Purpose

This ledger records the concrete UI architecture gaps that RFC-0021 is intended to close.

It exists so later slices can:

1. point to a specific baseline,
2. close known inconsistencies deliberately,
3. prove that shared architecture replaced page-local drift.

## Current Foundation Reality

`lotus-workbench` already has:

1. a shell and shared product chrome under `src/shell/`,
2. a design-system package under `src/design-system/`,
3. shared CSS variables in `src/app/globals.css`,
4. two major surfaces, `Portfolio` and `Performance`, that now expose repeated UI patterns.

The foundation is real, but not yet governed tightly enough.

## Slice 1 Findings

### Closed in Slice 1

1. **Conflicting token sources**
   - `src/design-system/theme/tokens.ts` had drifted away from the actual product language in
     `src/app/globals.css`.
   - Colors, fonts, and overall palette posture no longer matched the shipped shell and workspace
     styling.
   - Slice 1 closes this by re-baselining the TypeScript token contract to the active CSS
     foundation and adding tests that detect drift.

2. **Missing grouped token semantics**
   - Token intent was too flat and harder to reason about.
   - Slice 1 groups tokens by product role:
     - surface
     - text
     - border
     - brand
     - semantic
     - status background
     - typography
     - spacing
     - radius
     - elevation
     - focus
     - layout
     - control
     - table
     - z-index

3. **No drift guard between CSS and theme tokens**
   - The repo had no automated proof that `globals.css` and the design-system theme remained
     aligned.
   - Slice 1 adds explicit tests for representative token parity.

### Still Open After Slice 1

1. **Typography is not yet enforced by primitives**
   - Many styles still rely on CSS classes rather than a reusable variant system.
   - Target slice: Slice 2.

2. **Spacing remains only partially governed**
   - The baseline scale exists, but page-level classes still consume some local values directly.
   - Target slices: Slice 2 and Slice 3.

3. **Surface roles remain partially duplicated**
   - Cards, rails, supportability panels, and data-display shells are converging, but not fully
     normalized.
   - Target slice: Slice 3.

4. **Navigation patterns remain split across components**
   - Shared mode tabs exist, but other navigation affordances still have route-local differences.
   - Target slice: Slice 4.

5. **Status semantics are still partially duplicated**
   - Ready/partial/unavailable/review patterns exist in more than one implementation form.
   - Target slices: Slice 4 and Slice 6.

6. **Table posture is not yet system-governed**
   - There are multiple table and data-grid patterns across `Portfolio` and `Performance`.
   - Target slice: Slice 5.

## Migration Priority

Priority order for RFC-0021:

1. shared layer and token baseline
2. `Performance`
3. `Portfolio`

This keeps migration focused on the product surfaces that already define the visible quality bar.

## Slice 1 Acceptance Evidence

Slice 1 is considered complete when:

1. the token contract is normalized and readable,
2. the MUI theme consumes the normalized token contract,
3. automated tests prove representative CSS and TypeScript token parity,
4. this ledger exists and records the remaining gaps for later slices.

## Slice 2 Findings

### Closed in Slice 2

1. **No shared typography variant contract**
   - Shared components such as page headers, section headers, KPI tiles, and metric strips relied
     on CSS classes alone rather than a reusable typography primitive.
   - Slice 2 closes this by introducing a shared `Text` primitive with semantic variants and by
     wiring the most reused header and metric components to that contract.

2. **Financial formatting logic duplicated across app surfaces**
   - `Portfolio` and `Performance` each implemented overlapping percent, currency, and date
     formatting logic.
   - Slice 2 closes this by introducing shared financial-formatting utilities and refactoring both
     app-local formatter modules to consume them.

3. **No explicit test guard for typography and formatting reuse**
   - There was no direct proof that typography variants and shared financial formatting behaved
     consistently.
   - Slice 2 adds focused tests for the typography primitive, shared formatting utilities, and the
     migrated `Portfolio` / `Performance` formatter entry points.

### Still Open After Slice 2

1. **Page composition still relies on feature-local structure**
   - Shared page and section shells exist, but page-level composition patterns are not yet unified
     enough.
   - Target slice: Slice 3.

2. **Surface/container roles remain only partially standardized**
   - Cards, rails, strips, and supportability panels still have overlapping implementations.
   - Target slice: Slice 3.

3. **Navigation and state semantics still drift**
   - Mode tabs improved, but badges, state notes, and drill-down behaviors are not yet fully
     system-governed.
   - Target slices: Slice 4 and Slice 6.

4. **Table posture is still not fully centralized**
   - Shared table shells exist, but table semantics and density are not yet universally enforced.
   - Target slice: Slice 5.

## Slice 3 Findings

### Closed in Slice 3

1. **Top-level route composition still depended on low-level layout primitives**
   - `Portfolio` and `Performance` both composed `WorkstationPage` and `WorkstationShell`
     directly.
   - That made page entry composition correct, but not explicit enough. Route code still had to
     understand the raw shell primitives instead of consuming a named product-level composition
     contract.
   - Slice 3 closes this by introducing:
     - `AppPageShell`
     - `MainWithSideRailLayout`
   - The `Portfolio` and `Performance` entry surfaces now consume those shared composition
     primitives directly.

2. **Section-level surface composition was still too ad hoc**
   - Some supporting surfaces still assembled panel + header structure manually.
   - Slice 3 closes the first part of that gap with `SectionBlock`, a thin explicit wrapper for a
     headed section surface without introducing a speculative “god card.”

3. **No test contract for product-level composition primitives**
   - Existing tests covered the raw workstation shell primitives, but not the product-level page
     shell contract now expected by routes.
   - Slice 3 adds tests proving:
     - the new page-shell primitives render correctly,
     - `Portfolio` and `Performance` now use them in real page entry flows,
     - unavailable portfolio surfaces consume the same section-block surface contract.

### Still Open After Slice 3

1. **Navigation and action hierarchy still need shared enforcement**
   - The product now has a stronger composition baseline, but navigation patterns and action
     prominence are still only partially standardized.
   - Target slice: Slice 4.

2. **Table posture is still not fully centralized**
   - Page composition is clearer, but tables and grid behavior still need a single shared system.
   - Target slice: Slice 5.

3. **State-system consistency still needs a shared contract**
   - Loading, partial, unavailable, stale, and no-results states still use more than one pattern.
   - Target slice: Slice 6.

4. **Naming and API cleanup remains**
   - The shared layer is clearer than before, but naming overlap and primitive/API consistency are
     not finished.
   - Target slice: Slice 7.

## Slice 4 Findings

### Closed in Slice 4

1. **Mode switching still drifted across product surfaces**
   - `Performance` and `Portfolio` both exposed segmented navigation, but the implementation was
     still split between shared workstation controls and feature-local wrappers.
   - Slice 4 closes this by introducing a shared `ModeTabs` primitive and migrating both
     workspaces to the same mode-switch contract.

2. **Semantic badges were only partially system-governed**
   - Advisor Brief introduced a more refined status language, but that logic still lived in
     feature-local components.
   - Slice 4 closes this by promoting shared semantic status treatment into `SemanticBadge` and by
     refactoring `StatusChip` to compose the same semantics instead of duplicating them.

3. **Action hierarchy still depended on route-local button choices**
   - Quiet utility actions and primary workflow actions were not expressed through a shared action
     vocabulary.
   - Slice 4 closes the first part of that gap with a reusable `ActionButton` primitive and by
     migrating representative `Portfolio` and `Performance` actions to the shared hierarchy.

4. **No explicit cross-screen test contract for navigation and semantic actions**
   - The repo had strong page tests, but no focused proof that shared navigation, badges, and
     action primitives exposed a stable class and accessibility contract.
   - Slice 4 adds and updates tests to prove shared semantics across design-system, unit, and
     integration layers.

### Still Open After Slice 4

1. **Table posture is still not fully centralized**
   - Tables and data-grid behavior are closer than before, but density, formatting posture, and
     row semantics still need a single governed contract.
   - Target slice: Slice 5.

2. **State-system consistency still needs a shared contract**
   - Loading, partial, unavailable, stale, and no-results states still use more than one pattern.
   - Target slice: Slice 6.

3. **Naming and API cleanup remains**
   - Shared primitives are converging, but some naming overlap and component API cleanup still
     remains.
   - Target slice: Slice 7.

## Slice 5 Findings

### Closed in Slice 5

1. **Shared table language was still too thin**
   - `AnalyticsTable` existed, but it still behaved mostly as a low-level wrapper around MUI
     tables.
   - Density, visual tone, and table-empty handling were not governed explicitly enough to stop
     feature-local drift.
   - Slice 5 closes this by introducing a stronger shared table contract with explicit:
     - density
     - variant
     - empty/loading table states

2. **Portfolio and Performance tables still carried duplicated styling intent**
   - Major financial tables on both surfaces still depended on route-local classes for visual
     posture.
   - Slice 5 closes the main part of that gap by migrating key table consumers to shared
     `variant="portfolio"`, `variant="analysis"`, and `variant="observation"` semantics and by
     moving repeated styling into shared global selectors keyed from the design-system contract.

3. **Table-state handling was not system-governed**
   - Modules that lacked detail rows still fell back to ad hoc empty-state blocks outside the
     table system.
   - Slice 5 closes the first part of that gap by allowing shared empty/loading table states and
     by migrating contribution-detail empty cases to the common contract.

4. **No test guard existed for table contract semantics**
   - The repo had table usage tests, but no direct proof that the shared table layer enforced
     variant, density, and table-state behavior.
   - Slice 5 adds focused tests for:
     - shared table variant and density classes
     - empty/loading state rendering
     - portfolio/performance consumer migration onto the new table contract

### Still Open After Slice 5

1. **State-system consistency still needs a shared contract**
   - Screen-level loading, partial, unavailable, stale, and no-results states still use more than
     one pattern.
   - Target slice: Slice 6.

2. **Naming and API cleanup remains**
   - Shared primitives are converging, but some naming overlap and component API cleanup still
     remains.
   - Target slice: Slice 7.

## Slice 6 Findings

### Closed in Slice 6

1. **Screen-state handling still split across Portfolio and Performance adapters**
   - Loading, partial, unavailable, empty, and error states were still routed through parallel
     feature-local wrappers.
   - Slice 6 closes this by introducing shared:
     - `ScreenStatePanel`
     - `CapabilityStatePanel`
   - The common state semantics now live in the shared layer instead of being repeated in feature
     adapters.

2. **Capability-state UX was not governed through one shared contract**
   - Capability-backed partial/unavailable surfaces still relied on multiple adapter paths with
     slightly different semantics.
   - Slice 6 closes this by refactoring the shared capability and status panels to compose the new
     state-system primitives instead of manually choosing between unrelated panel types.

3. **Performance still depended on feature-local state wrappers**
   - The analysis surface used local wrappers for capability notices and analysis-state panels even
     though the underlying state semantics matched the shared system.
   - Slice 6 closes that gap by migrating analysis and evidence surfaces onto the shared state
     primitives and removing the redundant feature-local wrappers.

4. **No direct tests existed for the new shared state contract**
   - Existing tests proved route behavior, but not the shared state seam itself.
   - Slice 6 adds focused tests for:
     - shared screen-state rendering
     - shared capability-state rendering
     - migrated portfolio/performance state consumers

### Still Open After Slice 6

1. **Naming and API cleanup remains**
   - Shared primitives are stronger and more coherent, but some naming overlap and API cleanup
     still remains.
   - Target slice: Slice 7.

## Slice 7 Findings

### Closed in Slice 7

1. **Legacy shared names still overlapped for the same product roles**
   - `AnalyticsSectionHeader` and `SectionHeader` described the same concept.
   - `StatusChip` and `SemanticBadge` described the same semantic status surface.
   - `PortfolioSectionHeader` was only an app-local alias around the shared section-header
     contract.
   - Slice 7 closes this by standardizing on:
     - `SectionHeader`
     - `SemanticBadge`
   - The legacy aliases are removed from real consumers so feature teams now have one obvious
     primitive for those roles.

2. **Some primary surfaces still bypassed shared composition primitives**
   - `Portfolio` still hand-built several section headers and one metric-strip variant.
   - `Performance` still had a custom hydration-only tab fallback in the workspace mode switch.
   - Slice 7 closes this by migrating those remaining route-local seams onto:
     - `SectionHeader`
     - `WorkbenchSummaryMetricStrip`
     - `ModeTabs`

3. **The design-system still carried typography drift in several shared components**
   - `AnalyticsModule`, `AnalyticsStat`, `AnalyticsEffectStrip`, and
     `WorkbenchSummaryVisual*` still relied on local `Typography` sizing instead of the shared
     text system.
   - Slice 7 closes this by moving those shared components onto `Text` variants and shared class
     semantics.

4. **Status semantics were still partially enforced by legacy CSS classes**
   - Some status styling and tests still targeted `.status-chip` even though the canonical shared
     primitive is `SemanticBadge`.
   - Slice 7 closes this by migrating status rows, strips, degraded states, and related tests to
     the semantic-badge contract.

### Still Open After Slice 7

1. **System documentation and rollout guidance remain**
   - The shared primitives are now materially clearer and less overlapping, but the product still
     needs the final governed usage guide and RFC closure artifacts.
   - Target slice: Slice 8.

## Pre-Slice 8 Closure Item

### Closed before Slice 8

1. **Panel disclosure behavior still drifted between portfolio modules**
   - `Holdings` and `Transactions` used a coherent disclosure seam, while several summary and
     drilldown modules still used feature-local expand/collapse actions and mismatched wording.
   - The shared behavior is now governed through:
     - `DisclosureToggleButton`
     - a shared `Expand / Collapse` vocabulary
     - a shared summary-card header contract that keeps disclosure actions aligned on the title row
   - This reduced one more repeated local pattern before RFC closure.

## Slice 8 Findings

### Closed in Slice 8

1. **No governed usage guide existed for the strengthened shared system**
   - Earlier slices created real shared primitives, but the repo still lacked a concise guide that
     told contributors which primitives to use, which naming rules apply, and which patterns are
     now product standards.
   - Slice 8 closes this with:
     - [workbench-ui-system-usage-guide.md](workbench-ui-system-usage-guide.md)

2. **RFC-0021 and the RFC index still showed the work as proposed**
   - The implementation had materially advanced, but the governance artifacts did not yet reflect
     that the planned slices had been executed.
   - Slice 8 closes this by updating the RFC status and index status to `IMPLEMENTED`.

3. **Closure evidence was present in code, but not summarized in governance artifacts**
   - The ledger recorded slice-by-slice findings, but there was no final closeout section stating
     what is now governed by the shared system.
   - Slice 8 closes this by recording the final governed areas and the expected contribution rules.

### Governed Areas After Slice 8

The following areas are now governed through the shared layer and documented as product standards:

1. token baseline and theme contract
2. typography variants and numeric presentation
3. page-shell and section composition primitives
4. navigation and action hierarchy
5. tables and table-state behavior
6. screen-state and capability-state handling
7. shared naming and primitive APIs
8. panel disclosure behavior and vocabulary

### Deferred Follow-Up

No additional RFC-0021 slices remain open.

Future work may extend the shared system, but those changes should be treated as incremental
follow-on work rather than unfinished RFC-0021 baseline delivery.

## Post-Closure Tightening Review

### Closed After Slice 8

1. **Performance Analysis still had local control-label and segmented-control drift**
   - `PerformanceAnalysisControlBar`, `PerformanceAnalysisContributionSection`, and
     `PerformanceAnalysisAttributionSection` still defined control labels through local MUI
     typography and still mixed shared segmented controls with route-local toggle groups.
   - This was tightened by introducing:
     - `FieldLabel`
     - shared segmented controls for `Horizon` and `Basis`
     - shared primary action treatment for the explicit-date `Apply` action

2. **Shared analytics primitives still carried inline spacing drift**
   - `AnalyticsModule`, `AnalyticsStat`, and `AnalyticsEffectStrip` still used inline fractional
     spacing and surface values rather than the governed token baseline.
   - This was tightened by moving those spacing and surface decisions onto
     `lotusThemeTokens`.

3. **One remaining chart-refresh overlay bypassed the shared text system**
   - The return-path refresh overlay still used route-local `Typography`.
   - This was tightened by moving the overlay copy onto the shared `Text` contract.

### Closure Assessment After Tightening

No additional RFC-0021 slice is required.

The remaining drift after Slice 8 was narrow and shared-layer focused. It was resolved through a
targeted tightening pass rather than a new architectural slice. At this point, the remaining work
for Workbench UI consistency is incremental evolution, not unfinished RFC-0021 foundation work.

## Whole-Product Closure Hardening

### Closed After Initial Closure Review

1. **`intake` still used route-local navigation, action, and typography seams**
   - The page had already adopted the shared frame, but it still relied on older route-local
     control vocabulary and action hierarchy around operation switching and row-level workflow
     controls.
   - This was closed by standardizing `intake` on:
     - `ModeTabs` for operation switching
     - `ActionButton` for governed workflow actions
     - shared `Text` variants for compact record headings and operational notes

2. **`suite` still presented older MUI-heavy page composition**
   - The route still used legacy `Paper`, `Chip`, and `ToggleButtonGroup` seams even though the
     same product concepts are now governed elsewhere through the shared layer.
   - This was closed by migrating `suite` onto:
     - `WorkbenchPageFrame`
     - `WorkbenchSectionStack`
     - `SectionBlock`
     - `ModeTabs`
     - `SemanticBadge`
     - `ActionLink`

3. **Whole-product closure evidence was incomplete**
   - Earlier closure language was honest for `Portfolio` and `Performance`, but it still left
     `intake` and `suite` as explicit exceptions.
   - This was closed by refactoring both routes and validating them against the same shared-system
     expectations as the main workstation surfaces.

### Final Closure Assessment

No additional RFC-0021 slice is required.

The Workbench product now uses the shared UI system across:

1. `Portfolio`
2. `Performance`
3. `Advisor Brief`
4. `Intake`
5. `Suite`

Any further work should be treated as incremental product evolution, not unfinished RFC-0021
delivery.

Post-closure note (issue #573): the historical Suite prototype was later found to publish
hard-coded business state and was retired. `/suite` is now a thin alias of the canonical Home
entry, so it is no longer an independently supported surface or design-system consumer. This does
not reopen RFC-0021; it removes unsupported product and styling debt.

Post-closure note (issue #575): Intake's earlier shared-component adoption still left the complete
business workflow, validation, responsive branches, and mutation orchestration inside one route.
The production screen also protected fabricated defaults, immediate mutation, percentage
readiness, wizard step copy, and static health. The route is now a thin composition over a bounded
`features/intake` workspace, blank domain drafts, review-intent workflow, task-specific editors,
source-confirmed receipt, and route-scoped CSS Module. Shared design-system adoption therefore no
longer masks route-local workflow and stylesheet ownership debt.

## Active Surface Audit After Closure

### Closed in the Active-Surface Audit

1. **`workbench` still diverged from the shared system in active operational flows**
   - The operations route still used older route-local seams for:
     - summary metrics
     - section shells
     - partial-failure messaging
     - analytics and reporting empty states
     - sandbox/analytics control layout
     - query caching defaults
   - This was closed by migrating the surfaced `workbench` route and its supporting components onto:
     - `WorkbenchPageFrame`
     - `WorkbenchSectionStack`
     - `SectionBlock`
     - `WorkbenchSummaryMetricStrip`
     - `AnalyticsTable`
     - `ScreenStatePanel`
     - `DegradedStatePanel`
     - shared query-policy defaults

2. **Query caching and refetch posture still drifted across route families**
   - `intake` and proposal-facing client views still managed query timing and cache posture locally.
   - This was closed by introducing a shared platform runtime query policy and migrating the
     affected query entry points to the shared defaults.

3. **Integration tests still asserted legacy route-local copy instead of shared-state contracts**
   - The active `workbench` integration suite expected concatenated fallback text from the older
     route-local implementation.
   - This was closed by aligning the tests to the governed state-panel and table-state contract.

### Explicitly Out of the Active Surface Baseline

1. **Proposal list/detail legacy components remain in the repo but are not currently shell-exposed**
   - `src/shell/app-registry.ts` defines the active shell surfaces as:
     - `Portfolio`
     - `Performance`
     - `Operations` (`/workbench`)
     - canonical Home (`/`; `/suite` is a compatibility alias)
   - The older proposal list/detail views remain as implementation artifacts and test fixtures, but
     they are not part of the active shell navigation baseline for RFC-0021 closure.
   - Any future modernization of those dormant views should be tracked as follow-on product work,
     not as unfinished RFC-0021 delivery.
