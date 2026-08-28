# RFC-0023 Slice 10: Snapshot Briefing Compaction

> Historical delivery record. The named executive-summary and snapshot-business-reading
> components were later retired; use the current Risk composition and architecture index for new
> work.

## Intent

Reduce the remaining first-paint height in `Risk Snapshot` by tightening its business-reading surface through a shared compact executive-summary contract.

## Changes

- Added a reusable compact density mode to the then-current `risk-executive-summary.tsx`.
- Applied the compact executive-summary mode to the then-current `risk-snapshot-business-reading.tsx`.
- Added shared compact briefing styling in [globals.css](..\..\src\app\globals.css) for:
  - tighter briefing padding
  - tighter headline line-height
  - slightly denser secondary text
  - tighter action-cue spacing

## Why This Matters

- `Risk Snapshot` is the first primary panel and now reads faster without losing any business context.
- The compaction is implemented as a reusable primitive rather than panel-local CSS, so the same density mode can be reused in other places when appropriate.
- No backend-backed risk interpretation or methodology behavior changes.

## Acceptance Criteria

- `Risk Snapshot` business reading uses the shared compact executive-summary contract.
- Snapshot headline metrics, supporting measures, methodology access, and Gateway-backed content remain unchanged.
- No risk contract, loading behavior, or drill-down behavior regresses.

## Validation

- `npm run test -- tests/unit/risk-snapshot-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
