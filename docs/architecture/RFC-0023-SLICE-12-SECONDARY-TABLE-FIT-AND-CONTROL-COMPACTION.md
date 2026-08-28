# RFC-0023 Slice 12: Secondary Table Fit And Control Compaction

## Intent

Tighten the last remaining high-noise surfaces in the secondary analytical row by improving table fit and compressing the review controls above those tables.

## Changes

- Added compact segmented-control styling in [globals.css](../../src/app/globals.css).
- Applied the compact segmented-control treatment to:
  - [risk-rolling-window-detail.tsx](../../src/apps/performance/components/risk/risk-rolling-window-detail.tsx)
  - [risk-attribution-panel.tsx](../../src/apps/performance/components/risk/risk-attribution-panel.tsx)
- Tightened analytical-table fit in [globals.css](../../src/app/globals.css):
  - smaller cell sizing for rolling and attribution detail tables
  - fixed-width table layout retained
  - attribution toolbar spacing compressed

## Why This Matters

- The secondary row now spends less vertical space on controls and table chrome.
- Rolling and attribution tables remain fully backed by the same Gateway responses, but fit the analytical band more cleanly on first paint.
- The compact control treatment is reusable for future analytical review modules.

## Acceptance Criteria

- Rolling review window controls use the compact segmented-control contract.
- Attribution contributor-review controls use the compact segmented-control contract.
- Rolling and attribution detail tables retain the stabilized analytical-table classes and use the tighter fit treatment.
- No change to data contract, control semantics, or on-demand detail fetch behavior.

## Validation

- `npm run test -- tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
