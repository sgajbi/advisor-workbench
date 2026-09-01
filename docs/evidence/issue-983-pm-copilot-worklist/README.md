# PM Copilot decision-worklist evidence

Issue #983 applies the Workbench convergence pattern to PM Copilot: real component ownership,
global-authority deletion, a simpler decision composition, and measured rendered proof.

## Measured outcome

| Measure | Before | After |
| --- | ---: | ---: |
| Equal workflow cards | 6 | 0 |
| Visible Prepare actions | 6 | 1 |
| Separate governance/context summaries | 10 | 2 |
| `dpm-copilot-*` global escape arms | 12 | 0 |
| Manage module global escapes | 271 | 259 |
| Manage module lines | 1,523 | 1,468 |
| Product-copy findings | 230 | 227 |
| Page height at 1440px | 2,477px | 2,093px (-15.5%) |
| Page height at 1024px | 3,635px | 2,087px (-42.6%) |
| Page height at 768px | 3,819px | 2,840px (-25.6%) |
| Page height at 519px | 4,644px | 3,556px (-23.4%) |

The separate governance/context count is explicit: three header badges, six status metrics and one
boundary panel became one availability badge and one compact operating-boundary line. Portfolio
and mandate identity remain in the shell-owned review context. Requests are unchanged. The default
workflow remains one click; preparing another workflow now requires selection and then Prepare so
the source and blocker are reviewed before submission.

## Rendered proof

The source-confirmed fixture prepares and publishes evidence pack B, navigates to PM Copilot,
submits the memo request with that exact identity, opens the review disclosure with the keyboard,
and captures the complete decision worklist.

| Width | Current evidence | Source-shaped baseline |
| ---: | --- | --- |
| 1440px | [Desktop workstation](proof-copilot/proof-copilot-1440.png) | [Before](../issue-967-pm-ai-result-css-ownership/proof-copilot/proof-copilot-1440.png) |
| 1024px | [Compact workstation](proof-copilot/proof-copilot-1024.png) | [Before](../issue-967-pm-ai-result-css-ownership/proof-copilot/proof-copilot-1024.png) |
| 768px | [Tablet](proof-copilot/proof-copilot-768.png) | [Before](../issue-967-pm-ai-result-css-ownership/proof-copilot/proof-copilot-768.png) |
| 519px | [Narrow workstation](proof-copilot/proof-copilot-519.png) | [Before](../issue-967-pm-ai-result-css-ownership/proof-copilot/proof-copilot-519.png) |

[`rendered-measurements.json`](proof-copilot/rendered-measurements.json) records exact workspace,
queue, selected decision, primary action, result and document geometry. The browser gate requires
six workflow options, one Prepare action, selected action before result, desktop side-by-side
composition, narrow-width stacking, and zero page-level horizontal overflow.

## Validation

```text
npx vitest run tests/unit/dpm-copilot-workspace.test.tsx tests/unit/dpm-copilot-workspace-css-ownership.test.ts tests/unit/live-canonical-validation-script.test.ts --coverage=false
Result: 3 files, 43 tests passed

npm run typecheck
Result: passed

npm run lint:css-global
Result: passed; Manage exact escape budget 259

$env:ISSUE_983_EVIDENCE_DIR='docs/evidence/issue-983-pm-copilot-worklist'
npm run test:e2e:manage:proof-copilot
Result: 1 executed, 1 passed, 0 skipped
```

Full repository, protected-PR, wiki-publication and exact-main evidence is recorded on Workbench
#983 as the issue advances through the governed delivery loop.
