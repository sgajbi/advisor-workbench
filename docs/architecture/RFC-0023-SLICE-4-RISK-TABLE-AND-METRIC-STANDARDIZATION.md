# RFC-0023 Slice 4 Risk Table and Metric Standardization

- Date: 2026-04-08
- Scope: shared risk analytical table and metric-card primitives
- Workbench branch: `feat/risk-concentration-upgrade`
- Production behavior change: low-risk presentation refactor only

## Slice 4 Decision Record

After panel-shell standardization, the next source of drift was inside the panel bodies:

1. secondary/supporting metric tiles were still panel-local,
2. analytical tables were still instantiated directly in multiple places,
3. the workspace was at risk of growing several slightly different risk-card and risk-table styles.

This slice standardizes those patterns before more panel polish lands.

## Changes

### Shared risk analytical table

Added [risk-analytical-table.tsx](..\..\src\apps\performance\components\risk\risk-analytical-table.tsx).

It standardizes:

1. `AnalyticsTable` variant and density for risk review,
2. shared risk-table class naming,
3. explicit empty-state handling without fabricated fallback rows.

Current adopters:

1. [risk-drawdown-detail.tsx](..\..\src\apps\performance\components\risk\risk-drawdown-detail.tsx)
2. [risk-rolling-window-detail.tsx](..\..\src\apps\performance\components\risk\risk-rolling-window-detail.tsx)
3. [risk-drawdown-detail-drawer.tsx](..\..\src\apps\performance\components\risk\risk-drawdown-detail-drawer.tsx)
4. [risk-rolling-detail-drawer.tsx](..\..\src\apps\performance\components\risk\risk-rolling-detail-drawer.tsx)
5. [risk-attribution-panel.tsx](..\..\src\apps\performance\components\risk\risk-attribution-panel.tsx)

### Shared risk metric card

Added [risk-metric-card.tsx](..\..\src\apps\performance\components\risk\risk-metric-card.tsx).

It standardizes:

1. label/value/support layout for supporting and indicator tiles,
2. optional term-definition handling via `RiskTermLabel`,
3. calm risk tone variants for `warn` and `danger`,
4. card-level accessibility naming.

Current adopters:

1. drawdown supporting metrics in [risk-drawdown-detail.tsx](..\..\src\apps\performance\components\risk\risk-drawdown-detail.tsx)
2. concentration indicator tiles in [risk-concentration-indicator-strip.tsx](..\..\src\apps\performance\components\risk\risk-concentration-indicator-strip.tsx)

## Why This Slice Matters

This slice improves maintainability and consistency by making risk tables and metric cards a shared
workspace concern instead of a panel-by-panel concern.

That gives later UX work a safer base for:

1. denser visual tuning,
2. stronger front-office table hierarchy,
3. calmer supportability styling,
4. reduced CSS drift across panels and drawers.

## Test Coverage

Added:

1. [risk-analytical-table.test.tsx](..\..\tests\unit\risk-analytical-table.test.tsx)
2. [risk-metric-card.test.tsx](..\..\tests\unit\risk-metric-card.test.tsx)

These tests prove:

1. the shared risk table preserves the analysis-density contract,
2. empty states remain explicit and truthful,
3. the shared metric card supports both plain labels and definition-backed labels,
4. tone variants are applied through the shared primitive rather than panel-local markup.

## Validation

```text
npm run test -- tests/unit/risk-analytical-table.test.tsx tests/unit/risk-metric-card.test.tsx tests/unit/risk-drawdown-panel.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/performance-risk-mode.test.tsx
npm run lint
npm run typecheck
```

## Slice 4 Exit Criteria

| Criteria | Result |
|---|---|
| Shared risk analytical table exists | Done |
| Shared risk metric card exists | Done |
| Direct repeated risk table instantiation reduced | Done |
| Supporting/indicator metric drift reduced | Done |
| Focused component tests added | Done |

Next slice:

```text
Slice 5: workspace density and visual hierarchy tightening
```
