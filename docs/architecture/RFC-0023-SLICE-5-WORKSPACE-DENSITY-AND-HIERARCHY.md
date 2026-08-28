# RFC-0023 Slice 5 Workspace Density and Hierarchy

- Date: 2026-04-08
- Scope: executive briefing densification and page-level hierarchy tightening
- Workbench branch: `feat/risk-concentration-upgrade`
- Production behavior change: low-risk layout and spacing refinement only

## Slice 5 Decision Record

After panel-shell, utility, table, and metric-card standardization, the main remaining weakness was
page density.

The workspace still spent too much vertical space above the fold because:

1. the executive posture and `What matters now` reading were stacked instead of composed as one
   briefing surface,
2. the context strip still used more spacing than its decision value justified,
3. primary and secondary groups were visually coherent but not yet tight enough.

This slice tightens those page-level surfaces without changing panel contracts or backend usage.

## Changes

### Executive briefing densification

Updated [risk-executive-overview.tsx](../../src/apps/performance/components/risk/risk-executive-overview.tsx) so:

1. posture cards and `What matters now` now live in one shared executive band,
2. the right-hand briefing column holds both posture support cards and the cross-panel reading,
3. the overview reads more like one workstation briefing surface and less like stacked report cards.

### Page-level spacing tightening

Updated [globals.css](../../src/app/globals.css) to:

1. reduce shell padding and inter-section gaps,
2. tighten the context strip row,
3. compress executive-card spacing,
4. slightly reduce primary/secondary group padding and internal gaps,
5. preserve the existing responsive breakpoints and panel ordering.

## Why This Slice Matters

This is the first slice that directly improves above-the-fold usefulness after the structural
standardization work.

It makes the page more front-office useful by:

1. putting more decision value into the first screen,
2. reducing the feeling of a long stacked report,
3. keeping posture, urgency, and next focus in one coordinated briefing zone,
4. improving workspace rhythm without adding new content or new backend dependency.

## Test Coverage

Added:

1. [risk-executive-overview.test.tsx](../../tests/unit/risk-executive-overview.test.tsx)

This test proves:

1. executive posture and `What matters now` render inside one dense overview band,
2. the briefing still keeps one primary posture card,
3. secondary posture cards remain present,
4. the cross-panel action list remains intact.

Existing page tests in [performance-risk-mode.test.tsx](../../tests/unit/performance-risk-mode.test.tsx) continue to guard live request behavior, panel ordering, and interaction flows.

## Validation

```text
npm run test -- tests/unit/risk-executive-overview.test.tsx tests/unit/performance-risk-mode.test.tsx
npm run lint
npm run typecheck
```

## Slice 5 Exit Criteria

| Criteria | Result |
|---|---|
| Executive briefing is denser | Done |
| `What matters now` no longer consumes separate stacked space | Done |
| Context strip is tighter | Done |
| Primary/secondary group spacing reduced without layout regressions | Done |
| Focused executive-overview test added | Done |

Next slice:

```text
Slice 6: first-paint panel compaction and quieter secondary analysis
```
