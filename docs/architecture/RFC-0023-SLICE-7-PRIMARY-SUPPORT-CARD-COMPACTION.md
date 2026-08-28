# RFC-0023 Slice 7: Primary Support Card Compaction

> Historical delivery record. `risk-snapshot-supporting-measures.tsx` was later retired; use the
> current Risk composition and architecture index for new work.

## Intent

Reduce first-paint height in the primary risk review without removing information. This slice compacts supporting metric surfaces in `Risk Snapshot`, `Drawdown`, and `Concentration` by moving them onto a shared dense card contract.

## Changes

- Added a reusable compact density mode to [risk-metric-card.tsx](../../src/apps/performance/components/risk/risk-metric-card.tsx).
- Migrated the then-current `risk-snapshot-supporting-measures.tsx` from panel-local markup onto the shared metric-card primitive.
- Applied compact metric-card density to:
  - the then-current `risk-snapshot-supporting-measures.tsx`
  - [risk-drawdown-detail.tsx](../../src/apps/performance/components/risk/risk-drawdown-detail.tsx)
  - [risk-concentration-indicator-strip.tsx](../../src/apps/performance/components/risk/risk-concentration-indicator-strip.tsx)
- Applied compact detail-section density to the supporting-measures sections in Snapshot and Drawdown.
- Updated [globals.css](../../src/app/globals.css) with a shared `.performance-risk-metric-card-compact` treatment and tighter concentration indicator spacing.

## Why This Matters

- Primary panels keep more decision-useful content visible without feeling stretched.
- Snapshot and Drawdown now share the same supporting-metric card treatment instead of carrying panel-specific markup.
- Concentration indicators remain prominent, but they stop consuming unnecessary vertical space.

## Acceptance Criteria

- Snapshot supporting measures render through the shared metric-card primitive.
- Drawdown supporting measures and concentration indicators use the shared compact density.
- Methodology access and backend-backed panel behavior remain unchanged.
- No new data is fabricated and no existing Gateway contract is changed.

## Validation

- `npm run test -- tests/unit/risk-metric-card.test.tsx tests/unit/risk-snapshot-panel.test.tsx tests/unit/risk-drawdown-panel.test.tsx tests/unit/risk-concentration-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
