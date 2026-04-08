## Slice 20: Secondary Metric Number-First Contract

### Why

The secondary analytical panels were still too text-heavy in the metric strip itself:

- `Rolling Risk` headline cards repeated typical/range metadata that was already present in the detail table.
- `Historical Risk Attribution` highlight cards carried support lines that restated the same idea as the label and value.

That made the secondary row feel over-explained and reduced the prominence of the numbers.

### What Changed

- Added a reusable support-density control to `RiskHeadlineMetricGrid`.
- Applied `supportMode="hidden"` to the attribution highlight cards so they render as number-first review tiles.
- Added a reusable `showMetadata` control to `RiskRollingHeadlineMetrics`.
- Disabled rolling headline metadata in the secondary workspace so the table remains the place for typical/range context.
- Tightened secondary metric-card density in CSS.

### Reusable Contract

Secondary analytical metric strips now support a clearer number-first presentation:

- hide support text when the card should act as a compact KPI tile
- suppress metadata when the same diagnostic context already appears in the detail layer

This keeps the grid reusable while preventing repeated explanatory text from accumulating inside the secondary workspace.

### Validation

- `npm run test -- tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
