## Slice 21: Secondary Business Reading Headline-Only Contract

### Why

The secondary risk modules were still opening with too much prose before the numerical review:

- `Rolling Risk` business reading repeated explanatory detail that overlapped with the headline metrics and the table.
- `Historical Risk Attribution` business reading repeated contributor context that was already visible in the highlight strip and contributor table.

That made the secondary panels feel more like commentary cards than analytical workstations.

### What Changed

- Added a reusable `detailMode` contract to `RiskExecutiveSummary`.
- Applied `detailMode="hidden"` to the secondary business-reading blocks in:
  - `Rolling Risk`
  - `Historical Risk Attribution`
- Kept the headline and next-step cue, but removed the extra explanatory sentence from those panels.

### Reusable Contract

`RiskExecutiveSummary` now supports:

- `detailMode="full"` for primary panels where a fuller interpretation block is appropriate
- `detailMode="hidden"` for secondary panels where the page should move straight from the conclusion to the numbers

This keeps the component reusable without forcing every panel into the same narration density.

### Validation

- `npm run test -- tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
