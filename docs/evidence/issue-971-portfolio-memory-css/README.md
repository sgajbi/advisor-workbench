# Portfolio Memory presentation ownership proof

This evidence supports Workbench issues #971, #771, and #972. It was captured from the
repository-governed, optimized-build `manage/portfolio-memory` browser scenario using the
source-shaped Gateway fixture. It is deterministic regression evidence, not canonical runtime
certification.

## Business and interaction proof

The four screenshots cover 1440 px, 1024 px, 768 px, and 519 px viewports. The scenario proves:

- the latest event, coverage, follow-up, evidence, history, action, and selected-event detail
  remain in one decision path;
- the event filters use their distinct source-backed business labels;
- the first history row is reachable by keyboard and `Enter` refreshes its detail;
- recommended actions render the typed Workbench icon vocabulary without font or CDN ligatures;
- component-owned container rules keep the workspace usable without page-level horizontal
  overflow.

## Measured simplification

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Manage stylesheet lines | 3,446 | 3,072 | -374 |
| Governed global CSS escape arms | 605 | 551 | -54 |
| Global `portfolio-memory-` selector prefixes | 21 | 0 | -21 |
| Production Material Symbols font uses | 1 | 0 | -1 |
| Governed browser executions | 60 | 61 | +1 focused regression proof |

The replacement CSS Module owns Portfolio Memory presentation locally and contains no `:global`
escape. The browser continues to render Gateway/Manage facts; this change does not add browser-owned
policy or transport.

## Design and documentation decisions

The implementation adopts the established CSS Modules pattern documented by Next.js: local scope,
component ownership, and production bundling. A compatibility wrapper, new styling dependency, and
viewport-only responsive rules were rejected because they would retain global ownership or make the
component depend on the surrounding page rather than its available width.

No README, supported-features, repository context, or wiki update is required. The supported
Portfolio Memory workflow and its source authority are unchanged; this pack records presentation,
accessibility, and regression-test evidence only.
