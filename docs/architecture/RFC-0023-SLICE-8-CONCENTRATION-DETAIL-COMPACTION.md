# RFC-0023 Slice 8: Concentration Detail Compaction

## Intent

Tighten the `Concentration` module’s lower-detail area so the panel remains primary and decision-useful without consuming unnecessary vertical space.

## Changes

- Applied the shared compact detail-section density to both detail blocks in [risk-concentration-panel.tsx](../../src/apps/performance/components/risk/risk-concentration-panel.tsx):
  - `Driver analysis`
  - `Concentration scale`
- Tightened concentration-specific layout and copy density in [globals.css](../../src/app/globals.css):
  - smaller module-body gap
  - denser driver row spacing
  - tighter scale-card spacing
  - smaller compact section padding
  - slightly reduced body-copy scale inside concentration detail sections

## Why This Matters

- Concentration remains one of the primary modules, but its lower-detail stack now scans faster and occupies less first-paint height.
- The panel keeps the same backend-backed business content and methodology access while presenting it in a more disciplined front-office layout.
- The change reinforces the primary review path without adding new surfaces or one-off behavior.

## Acceptance Criteria

- `Driver analysis` uses the shared compact detail-section contract.
- `Concentration scale` uses the shared compact detail-section contract.
- Concentration indicators, driver rows, and scale cards remain present and backed by the same Gateway response.
- No contract, drill-down, or methodology behavior changes.

## Validation

- `npm run test -- tests/unit/risk-concentration-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
