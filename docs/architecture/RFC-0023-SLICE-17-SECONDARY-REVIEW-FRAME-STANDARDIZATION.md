## Slice 17: Secondary Review Frame Standardization

### Why

The secondary risk modules were still carrying duplicated pre-table scaffolding:

- `Rolling Risk` used a panel-local selected-window note card plus a separate supportability block.
- `Historical Risk Attribution` used a separate reconciliation block plus warning row above the table.

That repeated the same analytical framing pattern in different markup, increased hardcoded UI structure, and made the lower-half composition harder to maintain.

### What Changed

- Added a shared `RiskAnalyticalReviewFrame` component for compact analytical review content that sits above secondary tables.
- Moved `Rolling Risk` selected-window summary and supportability notes onto the shared frame.
- Moved `Historical Risk Attribution` reconciliation and warning content onto the same shared frame.
- Kept existing view-model-derived review text and supportability data; this slice does not invent new business copy or change contracts.

### Reusable Contract

The shared frame provides one standard secondary review pattern:

- `summary` for the main analytical review message
- `supplementary` for trust, caution, or supportability context

This reduces UI-local duplication and keeps secondary-panel framing consistent without adding more report-style blocks.

### Tests

- `tests/unit/risk-rolling-panel.test.tsx`
- `tests/unit/risk-attribution-panel.test.tsx`

These now assert that both panels use the shared analytical review frame.

### Validation

- `npm run test -- tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
