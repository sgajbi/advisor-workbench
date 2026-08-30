# Issue 958 Rebalance CSS Ownership Evidence

This evidence proves that removing the obsolete `dpm-wave-command-center-*` presentation authority
does not remove or reorder the current Gateway-fixture-backed Rebalance workflow.

## Governed scenario

```text
$env:MANAGE_REBALANCE_EVIDENCE_DIR="docs/evidence/issue-958-rebalance-css"
npm run test:e2e:manage:rebalance-waves
```

Result: one expected Chromium scenario executed, one passed, zero skipped, zero failed. The scenario
used the isolated Manage fixture Gateway and Workbench proof ports. It is deterministic UI evidence,
not canonical live-service or production evidence.

## Proven behavior

- stable `rebalance-workspace` product-surface identity;
- source-backed mandate, currency, date, evidence, wave, and campaign rendering;
- decision order from active rebalance through proposed changes, decision support, and campaign
  administration;
- proposed-change loading and durable campaign launch controls;
- keyboard campaign selection and retained focus;
- clean browser runtime and stylesheet ownership;
- no page-level horizontal overflow.

## Viewport matrix

| Width | Purpose | Evidence |
| ---: | --- | --- |
| 1440 | Primary workstation composition | [rebalance-waves-1440.png](rebalance-waves-1440.png) |
| 1024 | Compact workstation composition | [rebalance-waves-1024.png](rebalance-waves-1024.png) |
| 768 | Tablet composition | [rebalance-waves-768.png](rebalance-waves-768.png) |
| 721 | Wide side of the governed capacity boundary | [rebalance-waves-721.png](rebalance-waves-721.png) |
| 720 | Stacked side of the governed capacity boundary | [rebalance-waves-720.png](rebalance-waves-720.png) |
| 519 | Compact review composition | [rebalance-waves-519.png](rebalance-waves-519.png) |

The full-page captures are diagnostic review evidence. The Playwright assertions, not visual
inspection alone, are the regression gate.

## Repository gate

`make check` passed after the browser scenario:

- zero npm audit vulnerabilities at the governed thresholds;
- runtime, BFF, source-authority, dependency, font, product-copy, E2E registration, CSS,
  architecture, and screen-documentation fitness functions passed;
- ESLint and TypeScript passed;
- 448 test files / 4,289 tests passed on the corrected review head;
- 94.16% statements and lines, 86.38% branches, and 93.6% functions;
- optimized 25-route production build and portfolio-record bundle budgets passed.

The build retains the existing AG Grid autoprefixer warning for the dependency's `align-items: end`
declaration. This issue does not suppress, reclassify, or modify that third-party stylesheet.

Exact-head review found that the first retired-prefix ratchet covered only imported global layers.
The corrected gate now scans fully retired selector contracts across every discovered CSS Module as
well, and includes a regression proving that a same-count `:global(...)` substitution cannot hide
their return. Component-owned selector families remain permitted only behind their reviewed local
module scope and continue to be prohibited from the imported global layers.
