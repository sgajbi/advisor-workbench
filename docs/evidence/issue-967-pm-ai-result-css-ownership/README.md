# Issue 967 PM AI Result Presentation Evidence

## Purpose

This pack proves that the reusable PM decision-support result retains its source-backed business
hierarchy, explainability, keyboard behavior, and responsive composition after its presentation
moves from the Manage-wide global selector contract to a component-owned CSS Module.

## Measured architecture movement

| Measure | Before | After |
| --- | ---: | ---: |
| `manage-workspace.module.css` `:global(...)` escapes | 622 | 605 |
| `dpm-ai-workflow-*` escape arms | 17 | 0 |
| raw production class identities | 3 | 0 |
| component-owned CSS Module escapes | Not applicable | 0 |
| governed rendered widths | 2 | 4 |

The reusable `DpmAiWorkflowResult` remains the one rendering owner across PM Copilot, evidence
packs, rebalance decision support, outcome review, and PM operating-quality consumers. Gateway,
Manage, and AI contracts remain unchanged. The browser does not derive availability, evidence,
human-review, client-use, freshness, model, or lineage truth.

## Rendered proof

The source-confirmed fixture first publishes evidence pack B, navigates to PM Copilot, submits the
memo request with that exact pack identity, waits for the result, opens **How this was prepared**
with the keyboard, and verifies human-review and client-use evidence before capture.

| Width | Evidence |
| ---: | --- |
| 1440 px | [Desktop workstation](proof-copilot/proof-copilot-1440.png) |
| 1024 px | [Compact workstation](proof-copilot/proof-copilot-1024.png) |
| 768 px | [Tablet](proof-copilot/proof-copilot-768.png) |
| 519 px | [Narrow workstation](proof-copilot/proof-copilot-519.png) |

Reviewed properties:

- the result state, scope, summary, material, explainability, and next workflow actions remain in
  the business reading order;
- disclosure facts remain readable and keyboard accessible;
- material definition rows reflow without truncating evidence;
- no page-level horizontal overflow occurs at any governed width;
- runtime console, page errors, request failures, hydration, and stylesheet ownership remain clean;
- no decorative AI claim, reassuring fallback, or browser-owned policy was introduced.

## Validation

```text
npm test -- --run tests/unit/dpm-ai-workflow-result.test.tsx tests/unit/dpm-ai-workflow-result-css-ownership.test.ts tests/unit/dpm-copilot-workspace.test.tsx tests/unit/css-global-governance.test.ts
Result: 4 files, 58 tests passed

npm run lint:css-global
Result: passed; Manage CSS Module exact escape budget 605

$env:ISSUE_967_EVIDENCE_DIR='<repo>/docs/evidence/issue-967-pm-ai-result-css-ownership'
npm run test:e2e:manage:proof-copilot
Result: 1 executed, 1 passed, 0 skipped
```

Full repository, protected-PR, and exact-main evidence is recorded on Workbench #967 as the issue
advances through the governed delivery loop.

## Documentation decision

Repository engineering context, the experience research ledger, and the review ledger change
because presentation ownership and regression policy changed. The PM Copilot screen guide remains
implementation-accurate: its purpose, source contracts, workflow, capabilities, limitations, and
business behavior did not change. Repo-local wiki source therefore does not change for this slice.
