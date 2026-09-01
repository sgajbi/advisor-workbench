# Issue #978 Outcome Review ownership evidence

This pack records the optimized-production browser proof for the bounded Outcome Review convergence slice. The fixture reproduces Gateway-owned Manage outcome-review facts for `PB_SG_GLOBAL_BAL_001`; it does not claim canonical live-stack evidence.

## Decision and simplification result

- Replaced two repeated summary/readiness bands with one three-fact decision summary.
- Kept comparison evidence, client-communication controls, source lineage, and report/AI handoffs explicit at their point of use.
- Moved Outcome Review presentation from broad Manage/global styles into the owning component module with zero `:global(...)` escapes.
- Ratcheted `manage-workspace.module.css` from 408 to 325 escapes and removed 31 stale global override lines.

## Rendered result

| Viewport | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| 1440px | 2,500px | 2,283px | 217px (8.7%) |
| 1024px | 2,678px | 2,453px | 225px (8.4%) |
| 768px | 2,771px | 2,548px | 223px (8.0%) |
| 519px | 3,269px | 3,202px | 67px (2.0%) |

The decision summary precedes the timeline and selected-review detail at every viewport. The production-browser loop covers 1440, 1024, 768, 721, 561, and 519 CSS pixels, including both governed sides of the shell content-capacity transition. Each run also proves `documentWidth <= clientWidth`; the timeline remains an explicitly named horizontal scroll region when its exact business columns exceed available width.

## Reproduce

```powershell
$env:OUTCOME_REVIEW_EVIDENCE_DIR='<lotus-workbench>\docs\evidence\issue-978-outcome-review-ownership'
npm run test:e2e:manage:outcome-reviews
```

The run writes six full-page screenshots and `rendered-measurements.json` under `outcome-reviews/`.
