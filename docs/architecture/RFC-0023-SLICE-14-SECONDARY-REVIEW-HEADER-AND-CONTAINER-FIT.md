# RFC-0023 Slice 14: Secondary Review Header And Container Fit

## Intent

Remove the remaining dead white space in the secondary analytical band by tightening the review header area and ensuring the secondary panel containers collapse more closely to their visible content.

## Changes

- Tightened secondary analytical container behavior in [globals.css](../../src/app/globals.css):
  - secondary grid items explicitly size to content
  - secondary band items no longer preserve unnecessary height below shorter tables
- Tightened review controls and table headers in:
  - [risk-rolling-window-detail.tsx](../../src/apps/performance/components/risk/risk-rolling-window-detail.tsx)
  - [risk-attribution-panel.tsx](../../src/apps/performance/components/risk/risk-attribution-panel.tsx)
- Added reusable compact table text rendering with [risk-table-text.tsx](../../src/apps/performance/components/risk/risk-table-text.tsx) and enabled React-node cells in [risk-analytical-table.tsx](../../src/apps/performance/components/risk/risk-analytical-table.tsx).

## Why This Matters

- The secondary row now follows content height more closely instead of leaving empty white slabs under rolling or attribution review.
- Review headers, controls, and table labels consume less vertical space before the user reaches the actual analytical rows.
- The fix is structural and reusable, not a one-off visual patch.

## Acceptance Criteria

- Secondary panel containers collapse to content height more cleanly.
- Rolling and attribution review headers remain fully functional and keyboard accessible.
- Rolling and attribution tables remain backed by the same Gateway contracts with improved readability and fit.
- No detail-fetch or methodology behavior changes.

## Validation

- `npm run test -- tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/risk-panel-groups.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
