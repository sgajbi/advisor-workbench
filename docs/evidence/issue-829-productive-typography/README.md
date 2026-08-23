# Issue #829 Productive Typography Evidence

## Evidence Classification

These are isolated optimized-production diagnostic renders for typography and responsive geometry.
They use the governed Portfolio Playwright fixture for `PB_SG_GLOBAL_BAL_001`; they do not prove a
live Gateway/source runtime, canonical readiness, demo readiness, production identity, or bank
certification.

The product implementation under test was `650d3935`. The evidence pack is committed separately so
reviewers can inspect it in GitHub without treating generated `output/` as durable repository truth.

## Reviewer Comparison

| Candidate | 1440px workstation | 519px compact |
| --- | --- | --- |
| IBM Plex Sans 1.1.0 | [Open render](diagnostic-ibm-plex-sans-portfolio-review-1440.png) | [Open render](diagnostic-ibm-plex-sans-portfolio-review-519.png) |
| Inter 4.1 | [Open render](diagnostic-inter-portfolio-review-1440.png) | [Open render](diagnostic-inter-portfolio-review-519.png) |

The complete four-width computed-style and containment record is
[typography-comparison.json](typography-comparison.json). It covers 1440, 1024, 768, and 519 pixels.

## Result

- Both candidates rendered the six Portfolio metrics on one line with zero page overflow.
- The wide workstation uses a three-column-by-two-row metric composition; narrower capacity
  reflows to two and then one column before a financial value can collide.
- IBM Plex Sans rendered the longest tested AUM/Invested value at 168px; Inter rendered it at
  177px, approximately 5% wider.
- The governed IBM Plex Sans static 400/500/600 asset set is 196,820 bytes; the prior Inter variable
  asset was 352,240 bytes.
- IBM Plex Sans was selected for the operational UI. Cormorant remains wordmark-only and IBM Plex
  Mono remains technical-evidence-only.

## Reproduction

```bash
npm run test:e2e:typography:compare
```

The harness verifies the pinned upstream candidate checksums, injects each family independently in
the same optimized Workbench build, and fails on candidate substitution, page overflow, metric
overflow, or wrapped financial values. Production asset licensing, checksums, loader coverage, and
same-origin delivery remain independently protected by `npm run quality:font-assets` and
`tests/e2e/typography-delivery.spec.ts`.

## Prior Defect Evidence

The merged PR #826 diagnostic evidence records the original six-column collision:

- [1440 defect render](https://github.com/sgajbi/lotus-workbench/blob/bccfc2043d4212373a661820d5bc6fec00099999/docs/evidence/issue-814-review-context/diagnostic-portfolio-review-1440.png)
- [519 prior compact render](https://github.com/sgajbi/lotus-workbench/blob/bccfc2043d4212373a661820d5bc6fec00099999/docs/evidence/issue-814-review-context/diagnostic-portfolio-review-519.png)

Those captures and this pack are diagnostic evidence. Fresh canonical source-backed validation is
still governed separately and cannot be inferred from either screenshot set.
