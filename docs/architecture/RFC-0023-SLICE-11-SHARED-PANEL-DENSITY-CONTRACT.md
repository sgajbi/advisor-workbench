# RFC-0023 Slice 11: Shared Panel Density And Secondary Band Stabilization

> Historical delivery record. `risk-rolling-business-reading.tsx` was later retired; use the
> current Risk composition and architecture index for new work.

## Intent

Move panel-density tightening out of panel-local CSS and into the shared risk shell, while fixing the secondary-band layout so `Rolling Risk` and `Historical Risk Attribution` behave like independent analytical follow-through panels instead of equal-height report slabs.

## Changes

- Added a reusable `density` prop to [risk-module-shell.tsx](../../src/apps/performance/components/risk/risk-module-shell.tsx).
- Added the shared compact shell styling to [globals.css](../../src/app/globals.css):
  - tighter shell body gaps
  - tighter header/action spacing
  - tighter module-body gap
- Fixed the rolling headline strip by making [globals.css](../../src/app/globals.css) treat `.performance-risk-metric-strip` as a real grid, so rolling headline metrics no longer collapse into a vertical stack.
- Reworked the secondary analytical row in [globals.css](../../src/app/globals.css) so it uses independent-width flex columns instead of equal-height grid tracks.
- Applied compact executive-summary density to:
  - the then-current `risk-rolling-business-reading.tsx`
  - [risk-attribution-panel.tsx](../../src/apps/performance/components/risk/risk-attribution-panel.tsx)
- Tightened attribution analytical detail density in [globals.css](../../src/app/globals.css) by further capping the compact attribution table and note spacing.
- Applied `density="compact"` to all five risk modules:
  - [risk-snapshot-panel.tsx](../../src/apps/performance/components/risk/risk-snapshot-panel.tsx)
  - [risk-drawdown-panel.tsx](../../src/apps/performance/components/risk/risk-drawdown-panel.tsx)
  - [risk-concentration-panel.tsx](../../src/apps/performance/components/risk/risk-concentration-panel.tsx)
  - [risk-rolling-panel.tsx](../../src/apps/performance/components/risk/risk-rolling-panel.tsx)
  - [risk-attribution-panel.tsx](../../src/apps/performance/components/risk/risk-attribution-panel.tsx)

## Why This Matters

- Panel density is now standardized through a shared shell primitive rather than accumulated one-off spacing edits.
- The workspace becomes more consistent and easier to maintain because future module changes inherit the same compact baseline automatically.
- The secondary row no longer behaves like two equal-height report cards, which removes the most obvious dead-white-space failure mode in the current risk cockpit.
- The slice improves first-paint density without touching any data contract or drill-down behavior.

## Acceptance Criteria

- All risk panels render through the shared compact shell contract.
- Rolling headline metrics render in a proper grid instead of stacking vertically.
- The secondary analytical band uses independent-height columns and no longer forces attribution into a full-height white slab when rolling content is taller.
- Existing panel ordering, methodology access, and Gateway-backed interactions remain unchanged.
- No loading, caching, or detail-fetch behavior regresses.

## Validation

- `npm run test -- tests/unit/risk-module-shell.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/risk-panel-groups.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
