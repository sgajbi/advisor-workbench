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
