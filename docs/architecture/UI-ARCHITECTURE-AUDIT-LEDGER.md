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
