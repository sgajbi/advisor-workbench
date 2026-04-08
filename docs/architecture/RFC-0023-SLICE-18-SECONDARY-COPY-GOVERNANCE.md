## Slice 18: Secondary Copy Governance

### Why

The secondary risk workspace still depended on scattered UI-local literals for titles, subtitles, action labels, detail labels, and empty-state text. That created two problems:

- duplicated framing copy across `Rolling Risk`, `Historical Risk Attribution`, and the secondary-group shell
- copy drift risk, where a wording change would need to be manually repeated in multiple components

### What Changed

- Added a shared secondary workspace copy contract in `risk-secondary-copy.ts`.
- Moved the secondary-group framing copy onto the shared contract.
- Moved `Rolling Risk` title, subtitle, drill-down label, detail labels, and empty-state text onto the shared contract.
- Moved `Historical Risk Attribution` title, subtitle, control labels, status-panel copy, reconciliation label, warnings label, and empty-state text onto the shared contract.

### Reusable Contract

The new shared contract keeps secondary analytical copy in one place:

- `riskSecondaryGroupCopy`
- `riskRollingPanelCopy`
- `riskAttributionPanelCopy`

This is not a localization layer. It is a governance layer for stable product language inside the secondary risk workspace.

### Tests

- `tests/unit/risk-secondary-copy-guard.test.ts`

This guard verifies:

- the shared copy contract exists for the secondary workspace
- the affected components import it
- the old duplicated local literals do not reappear in component bodies

### Validation

- `npm run test -- tests/unit/risk-secondary-copy-guard.test.ts tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
