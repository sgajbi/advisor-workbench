# Mandate Health presentation ownership proof

This evidence supports Workbench issue #974 and the incremental CSS ownership programme #492. It
was captured from the repository-governed, optimized-build `manage/mandate-health` browser
scenario using the source-shaped Manage Gateway fixture and canonical portfolio identifier
`PB_SG_GLOBAL_BAL_001`. It is deterministic regression evidence, not canonical runtime
certification.

## Business and interaction proof

The four screenshots cover 1440 px, 1024 px, 768 px, and 519 px viewports. The scenario proves:

- mandate context and posture precede the attention queue, selected review item, next step, and
  source-owned dimensions;
- partial source windows cannot be presented as complete or as a zero-attention conclusion;
- queue continuation preserves portfolio scope and source correlation, while a portfolio switch
  rejects a delayed response from the prior scope;
- keyboard focus moves through the source-window controls and follows the confirmed source view;
- complete, partial, empty, and unavailable states remain distinct;
- the four-card summary and two-pane review workspace collapse without page-level horizontal
  overflow.

## Measured simplification

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Manage legacy stylesheet lines | 3,072 | 2,731 | -341 |
| Governed Manage global escape arms | 551 | 485 | -66 |
| Mandate Health CSS Module escape arms | N/A | 0 | zero-escape owner |
| Net CSS lines across the migrated files | 3,072 | 3,062 | -10 |
| Raw `mandate-*` / `manage-mandate-panel` selectors in the legacy module | 46+ | 0 | retired |

The migration also deletes unused `manage-mandate-panel` summary-metric overrides: the production
Mandate Health component has no summary-metric-strip consumer. No request, transport, browser-side
policy, score, threshold, state machine, or product claim was added.

## Research and documentation decisions

The implementation adopts Next.js CSS Modules for local component ownership and retains the W3C
semantic table structure already used for source-owned evidence. A new styling dependency, a
nominal module containing global selectors, inferred mandate policy, and a broad visual redesign
were rejected.

The Mandate Health screen guide remains accurate because business purpose, data sources, actions,
states, and limitations did not change. No README, supported-features, repository-context, or wiki
source change is required; this pack records the presentation boundary and regression evidence.
