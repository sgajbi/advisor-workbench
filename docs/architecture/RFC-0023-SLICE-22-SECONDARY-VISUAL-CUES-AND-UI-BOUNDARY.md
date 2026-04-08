## Slice 22: Secondary Visual Cues and UI Boundary

### Why

The secondary analytical panels still leaned too heavily on text and tables. They needed compact, decision-useful visuals, but without pushing parsing or derived analytical logic into the React layer.

### What Changed

- Added a reusable `RiskRangeIndicator` for rolling metrics so the current reading can be seen relative to the observed range at a glance.
- Added a reusable `RiskShareBar` for attribution rows so contributor share is visually ranked inside the table.
- Moved visual input derivation into the view model:
  - rolling row position percentages
  - attribution absolute share percentages and panel-level max share

### Boundary Rule

The UI components now receive already-shaped visual inputs from the view model. They do not parse percentages, ranges, or numeric strings to derive their own signals.

This keeps:

- domain and derivation logic in the view-model layer
- rendering logic in the component layer

### Validation

- `npm run test -- tests/unit/risk-range-indicator.test.tsx tests/unit/risk-share-bar.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
