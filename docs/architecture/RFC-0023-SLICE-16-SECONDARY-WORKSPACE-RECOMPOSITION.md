## Slice 16: Secondary Workspace Recomposition

### Why

The previous secondary risk row was still behaving like two compressed report cards. That created two visible failures:

- `Rolling Risk` was forced into a cramped table-heavy frame.
- `Historical Risk Attribution` shrank inside its column and left dead white space beside and below the analytical content.

This slice corrects the layout contract rather than adding more local compaction rules.

### What Changed

- Replaced the old equal-weight secondary row with a workstation-style split:
  - `Rolling Risk` now occupies the analytical main pane.
  - `Historical Risk Attribution` now occupies an analytical sidecar.
- Removed the previous secondary-row panel styling that still implied two peer report cards.
- Removed artificial compact-table height caps from the secondary modules.
- Tightened secondary shell padding and detail spacing so content density comes from structure rather than clipping.
- Rebalanced rolling and attribution table column widths for the new pane sizes.

### Reusable Contract

The secondary workspace now has explicit structural hooks:

- `.performance-risk-secondary-workspace`
- `.performance-risk-secondary-main`
- `.performance-risk-secondary-sidecar`

These classes define the supported split between the main analytical review and the sidecar contributor review. Future secondary modules should conform to this split instead of introducing new two-card layouts.

### Tests

- `tests/unit/risk-panel-groups.test.tsx`
- `tests/unit/performance-risk-mode.test.tsx`

These tests now assert the secondary workspace structure so the layout cannot silently regress back to equal-weight report cards.

### Validation

- `npm run test -- tests/unit/risk-panel-groups.test.tsx tests/unit/performance-risk-mode.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx`
- `npm run lint`
- `npm run typecheck`
