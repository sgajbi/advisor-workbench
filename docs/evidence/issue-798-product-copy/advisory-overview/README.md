# Advisory Overview business-copy review evidence

This pack records the rendered review of the #798 Advisory Overview copy slice at implementation
head `16108b61`. It proves the deterministic Workbench fixture presentation only. It is not
canonical populated-runtime evidence, source persistence proof, production identity evidence, or a
claim that every Advisory surface has completed the #798 vocabulary programme.

## Reviewed outcome

- The page leads with the next advisory decision rather than transport or source-system posture.
- Shared proposal context uses **Proposal coverage**, **Workflow status**, **Worklist**, and
  **Internal adviser use**.
- Refresh success is shown only after the replacement proposal request succeeds; a failed refresh
  retains and labels the earlier worklist.
- Exact returned proposal creator evidence is shown under **Created by**; missing evidence remains
  **Not reported**.
- The decision, visible-window boundary, worklist, selected next action, and proposal navigation
  retain their reading order without horizontal page overflow at every governed width.

## Browser proof

```powershell
$env:PLAYWRIGHT_PORT='3341'
$env:PLAYWRIGHT_E2E_FIXTURE_PORT='18341'
$env:ISSUE_811_EVIDENCE_DIR='output/issue-798-product-copy'
npx playwright test tests/e2e/advisory-overview-worklist.spec.ts --workers=1
```

Result: 6/6 scenarios passed in 2.9 minutes against an isolated optimized-production Workbench
server. The matrix covered 1440px desktop, 1150px intermediate, 1024px tablet, and 519px compact
layouts, cursor-window navigation, deliberate Gateway failure-to-ready recovery, focus continuity,
row/detail association, action containment, duplicate-context prevention, and zero page overflow.
The build emitted only the existing AG Grid autoprefixer warning about `end` versus `flex-end`.

## Reviewer-visible renders

- [Desktop — 1440px](advisory-overview-desktop.png)
- [Intermediate — 1150px](advisory-overview-intermediate.png)
- [Tablet — 1024px](advisory-overview-tablet.png)
- [Compact — 519px](advisory-overview-compact.png)

These captures deliberately show a proposal with missing creator and recorded-time evidence so the
fail-closed **Not reported** state is reviewable. They do not fabricate a source actor or timestamp.
