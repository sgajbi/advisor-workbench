# RFC-0023 Slice 6: Secondary Panel Compaction

## Intent

Tighten the first-paint footprint of the secondary risk modules so `Rolling Risk` and `Historical Risk Attribution` read like analytical follow-through, not peer report cards beside the primary risk review.

## Changes

- Added a shared compact density contract to [risk-detail-section.tsx](../../src/apps/performance/components/risk/risk-detail-section.tsx).
- Added a shared compact density contract to [risk-analytical-table.tsx](../../src/apps/performance/components/risk/risk-analytical-table.tsx).
- Applied the compact contract to:
  - [risk-rolling-window-detail.tsx](../../src/apps/performance/components/risk/risk-rolling-window-detail.tsx)
  - [risk-attribution-panel.tsx](../../src/apps/performance/components/risk/risk-attribution-panel.tsx)
- Tightened secondary-panel styling in [globals.css](../../src/app/globals.css):
  - 2-column secondary headline metrics instead of 4-up metric strips
  - lower minimum card height for rolling and attribution highlight cards
  - compact table max-height for secondary review tables
  - denser rolling supportability note layout

## Why This Matters

- The page keeps more useful information above the fold.
- Rolling and Attribution remain fully backed by the same Gateway contracts, but they stop competing visually with Snapshot, Drawdown, and Concentration.
- The compaction rules are reusable and can be applied to future secondary analytical modules without panel-local CSS forks.

## Acceptance Criteria

- Secondary panels use the shared compact detail-section contract.
- Secondary analytical tables use the shared compact table contract.
- Rolling Risk and Historical Risk Attribution preserve existing business content and controls.
- No inline detail expansion or contract behavior regresses.

## Validation

- `npm run test -- tests/unit/risk-analytical-table.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
