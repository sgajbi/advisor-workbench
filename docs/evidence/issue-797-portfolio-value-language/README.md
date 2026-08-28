# Issue #797 Portfolio Value Language Evidence

## Evidence Classification

This pack proves the selected-portfolio terminology correction on the Portfolio Review screen.
It contains two deliberately separate evidence classes:

| Evidence | Runtime | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Optimized-production fixture at 1440 and 519 pixels | Checkout-owned Workbench and deterministic Gateway fixture | Exact rendered copy, responsive layout and absence of page overflow across seven governed widths, plus keyboard/focus evidence at the compact 519-pixel width | Live Gateway state, canonical readiness, demo readiness, or production identity |
| Read-only live diagnostic at 1440 pixels | Existing shared Workbench development runtime over the real Workbench BFF and Gateway | `PB_SG_GLOBAL_BAL_001` renders **Portfolio value** from live source data with confirmed identity and successful BFF reads | Full canonical validation, all-panel readiness, demo readiness, or bank certification |

All screenshots retain the required `diagnostic-` prefix. The shared stack was neither restarted nor
stopped for this proof.

## Reviewer Evidence

| Surface | 1440px workstation | 519px compact |
| --- | --- | --- |
| Deterministic Portfolio Review | [Open render](diagnostic-fixture-portfolio-review-1440.png) | [Open render](diagnostic-fixture-portfolio-review-519.png) |
| Live source-backed Portfolio Review | [Open render](diagnostic-live-portfolio-review-1440.png) | Not captured; the seven-width fixture matrix owns compact layout proof |

Machine-readable evidence:

- [Seven-width fixture evidence](fixture-responsive-evidence.json)
- [Live DOM evidence](live-portfolio-value-evidence.json)
- [Live BFF request evidence](live-network-requests.txt)

## Result

- The primary metric accessible name is **Portfolio value: 1,325,241 USD** on the live portfolio.
- The live rendered page contains zero visible `AUM` occurrences.
- Invested assets and cash are described as shares **of portfolio value**.
- The live Review Context is `confirmed`, the governed business date and base currency are visible,
  and page overflow is zero.
- The live book, workflow, performance, income, activity, and capability reads complete through the
  Workbench BFF; the captured network record shows HTTP 200 for the completed reads.
- The deterministic production proof records no page overflow at 1440, 1024, 768, 721, 720, 561,
  and 519 pixels. Focus-visible keyboard traversal is recorded at the compact 519-pixel width.

The Gateway field `assets_under_management_base` and reason code
`PORTFOLIO_AUM_UNAVAILABLE` remain raw contract identifiers at the adapter boundary. They are not
presented as business terminology. This evidence does not claim that adviser-book AUM exists;
Gateway #573 and Workbench #470 own that future aggregate.

## Reproduction

```powershell
$env:PORTFOLIO_E2E_EVIDENCE_DIR = `
  "<lotus-workbench>/output/playwright/issue-797-portfolio-value-language"
$env:PORTFOLIO_E2E_FIXTURE_PORT = "18797"
$env:PORTFOLIO_E2E_WORKBENCH_PORT = "31797"
npm run test:e2e:portfolio:review-matrix
```

The live diagnostic was captured read-only from:

```text
http://workbench.dev.lotus/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-04-10&reportingCurrency=USD
```

The Workbench server continued returning HTTP 200 after both evidence passes.
