# RFC-0023 Slice 9: Drawdown Episode Review Compaction

## Intent

Reduce the remaining first-paint height in the `Drawdown` module by tightening the `Episode review` block through shared compact-density contracts.

## Changes

- Applied compact detail-section density to the `Episode review` block in [risk-drawdown-detail.tsx](..\..\src\apps\performance\components\risk\risk-drawdown-detail.tsx).
- Applied the shared compact note-card treatment to the drawdown interpretation card.
- Applied compact analytical-table density to the drawdown episode table.
- Tightened drawdown detail stack spacing in [globals.css](..\..\src\app\globals.css).

## Why This Matters

- Drawdown remains one of the primary front-line review modules, but its deeper episode layer no longer dominates the visible page height.
- The same backend-backed drawdown episode content remains available and unchanged.
- The slice extends shared density rules instead of introducing a drawdown-only one-off layout.

## Acceptance Criteria

- `Episode review` uses the shared compact detail-section contract.
- The drawdown interpretation note uses the shared compact note-card treatment.
- The drawdown episode table uses the shared compact table treatment.
- No underwater drill-down behavior, methodology access, or Gateway-backed data contract changes.

## Validation

- `npm run test -- tests/unit/risk-drawdown-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
