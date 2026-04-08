## Slice 19: Secondary De-duplication and Dead Code Removal

### Why

The secondary analytical panels still had too much repeated narration and retained a dead shared review-frame abstraction that was no longer justified after simplifying the UI. That left the codebase with:

- duplicate review text before the numbers
- a now-unused `RiskAnalyticalReviewFrame` component
- stale tests still asserting the removed review-frame structure

### What Changed

- Removed the extra selected-window summary block from `Rolling Risk`.
- Removed the extra reconciliation summary block from `Historical Risk Attribution`.
- Kept only the quieter caution/supportability rows where they still add decision value.
- Deleted the unused `RiskAnalyticalReviewFrame` component.
- Removed the dead CSS contract associated with that component.
- Updated tests to assert the simplified, number-first secondary panel behavior.

### Outcome

The secondary analytical modules now get to the numbers and tables faster, repeat less of the same conclusion, and carry less dead code in the component layer.

### Validation

- `npm run test -- tests/unit/risk-secondary-copy-guard.test.ts tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-attribution-panel.test.tsx tests/unit/performance-risk-mode.test.tsx`
- `npm run lint`
- `npm run typecheck`
