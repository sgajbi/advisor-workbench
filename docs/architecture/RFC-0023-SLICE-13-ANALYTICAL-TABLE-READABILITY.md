# RFC-0023 Slice 13: Analytical Table Readability

## Intent

Improve first-paint readability of the secondary analytical tables by reducing header noise and controlling long-text wrapping inside table cells.

## Changes

- Added a reusable table-text wrapper in [risk-table-text.tsx](..\..\src\apps\performance\components\risk\risk-table-text.tsx).
- Updated [risk-analytical-table.tsx](..\..\src\apps\performance\components\risk\risk-analytical-table.tsx) to accept React nodes in cells so panels can render controlled table text.
- Updated [risk-rolling-window-detail.tsx](..\..\src\apps\performance\components\risk\risk-rolling-window-detail.tsx):
  - shorter table headers
  - clamped review-note cell rendering
- Updated [risk-attribution-panel.tsx](..\..\src\apps\performance\components\risk\risk-attribution-panel.tsx):
  - shorter table headers
  - truncated group-cell rendering
- Tightened the corresponding table text styles in [globals.css](..\..\src\app\globals.css).

## Why This Matters

- The secondary tables now fit the analytical band more cleanly without changing the underlying Gateway-backed values.
- Long contributor names and review notes no longer spill into awkward multi-line blocks on first paint.
- The table text wrapper is reusable for other analytical tables where readability needs to be controlled without changing the data contract.

## Acceptance Criteria

- Rolling detail headers use the shorter `Measure / Current / Typical / Range / Review note` labels.
- Attribution detail headers use shorter contributor-review labels while preserving the same numeric content.
- Long rolling review notes and attribution group names render through the shared table-text wrapper.
- No change to table semantics, data content, or backend contracts.

## Validation

- `npm run test -- tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/risk-panel-groups.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
