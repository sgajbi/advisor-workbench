# RFC-0023 Slice 22: Risk Panel Deduplication And Methodology Consolidation

## Goal

Remove repeated figures and repeated explanatory text from the Risk workspace so the page reads as numbers-first review instead of duplicated commentary.

## Changes

- Removed the remaining attribution highlight strip from the main panel and kept `Reconciled sum` and `Evidence posture` inside the shared methodology drawer.
- Removed inline rolling supportability rows and moved rolling caution/trust notes into the shared methodology drawer context.
- Limited the rolling detail table to secondary measures so the top-line headline metrics are not repeated in two display styles.
- Removed the drawdown episode interpretation card when episode rows already exist; the inline note remains only for the no-episode case.
- Reduced concentration duplication by removing the scale interpretation sentence from the main panel and keeping the scale visual as context only.
- Kept key-figure rendering on the shared `RiskMetricCard` and shared tooltip-backed `RiskTermLabel` path.

## Acceptance Criteria

- `Historical Risk Attribution` does not repeat `Selected lens` or `Top contributor` outside the contributor review controls and table.
- `Historical Risk Attribution` shows `Reconciled sum` and `Evidence posture` only in methodology and coverage.
- `Rolling Risk` does not show supportability warnings inline on first paint.
- `Rolling Risk` first-paint detail does not repeat the four headline measures in the summary table.
- `Drawdown` does not render an extra interpretation card when the episode table already provides the review content.
- `Concentration` does not restate scale interpretation as an additional paragraph below the scale visual.
- Shared key figures continue to render through one tooltip-capable metric-card path.

## Validation

- `npm run test -- tests/unit/risk-metric-card.test.tsx tests/unit/risk-snapshot-panel.test.tsx tests/unit/risk-drawdown-panel.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/risk-concentration-panel.test.tsx tests/unit/performance-risk-view-model.test.ts`
- `npm run lint`
- `npm run typecheck`
