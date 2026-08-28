# RFC-0023 Slice 3 Risk Panel Standardization

- Date: 2026-04-08
- Scope: shared panel utility row and explicit primary versus secondary shell variants
- Workbench branch: `feat/risk-concentration-upgrade`
- Production behavior change: low-risk presentation refactor only

## Slice 3 Decision Record

The workspace already had the right business content and the right drill-down direction, but panel
composition was still too panel-local.

This slice standardizes the shared panel grammar by moving repeated header-utility composition into
reusable primitives and by making primary versus secondary module intent explicit at the shell
layer.

## Changes

### Shared panel utility row

Added:

1. [risk-methodology-access.tsx](..\..\src\apps\performance\components\risk\risk-methodology-access.tsx)
2. [risk-panel-utility-row.tsx](..\..\src\apps\performance\components\risk\risk-panel-utility-row.tsx)

The utility row now standardizes:

1. methodology and coverage access,
2. drill-down action placement,
3. consistent utility grouping and accessibility naming.

This removes repeated panel-local composition in:

1. [risk-snapshot-panel.tsx](..\..\src\apps\performance\components\risk\risk-snapshot-panel.tsx)
2. [risk-drawdown-panel.tsx](..\..\src\apps\performance\components\risk\risk-drawdown-panel.tsx)
3. [risk-concentration-panel.tsx](..\..\src\apps\performance\components\risk\risk-concentration-panel.tsx)
4. [risk-rolling-panel.tsx](..\..\src\apps\performance\components\risk\risk-rolling-panel.tsx)
5. [risk-attribution-panel.tsx](..\..\src\apps\performance\components\risk\risk-attribution-panel.tsx)

### Explicit shell priority variants

Updated [risk-module-shell.tsx](..\..\src\apps\performance\components\risk\risk-module-shell.tsx) to support:

1. `priority="primary"`
2. `priority="secondary"`

These variants are now applied intentionally:

1. primary: Snapshot, Drawdown, Concentration
2. secondary: Rolling Risk, Historical Risk Attribution

The shell now emits shared priority classes so future visual hardening can target the shell rather
than panel-local selectors.

## Why This Slice Matters

This is a maintainability and consistency slice, not a decorative redesign.

It improves the workspace by:

1. reducing duplicated utility composition logic,
2. standardizing methodology and drill-down placement,
3. making primary versus secondary panel intent explicit in code,
4. creating a safer base for later density and styling work without more panel drift.

## Test Coverage

Added:

1. [risk-panel-utility-row.test.tsx](..\..\tests\unit\risk-panel-utility-row.test.tsx)
2. [risk-module-shell.test.tsx](..\..\tests\unit\risk-module-shell.test.tsx)

These tests prove:

1. utilities render through the shared grouped pattern,
2. drill-down and methodology controls coexist in the same reusable row,
3. panels without utilities do not render dead shell chrome,
4. primary and secondary shell variants are explicit and stable,
5. shell body layout appears only when detail/context content exists.

## Validation

```text
npm run test -- tests/unit/risk-panel-utility-row.test.tsx tests/unit/risk-module-shell.test.tsx tests/unit/risk-rolling-panel.test.tsx tests/unit/risk-drawdown-panel.test.tsx tests/unit/performance-risk-mode.test.tsx
npm run lint
npm run typecheck
```

## Slice 3 Exit Criteria

| Criteria | Result |
|---|---|
| Shared utility row exists | Done |
| Primary versus secondary shell variants are explicit | Done |
| Repeated panel utility composition removed | Done |
| Focused component tests added | Done |
| Existing risk interaction behavior preserved | Done |

Next slice:

```text
Slice 4: risk table and metric-card standardization
```
