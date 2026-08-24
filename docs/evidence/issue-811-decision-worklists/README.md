# Issue 811 Decision-First Worklist Evidence

This directory contains deterministic, optimized-production browser evidence for the reusable
decision-first worklist and the four daily Workbench surfaces changed under issue #811.

## Evidence status

- Status: **diagnostic implementation evidence**
- Source: checkout-owned Playwright fixtures over the Workbench BFF boundary
- Canonical portfolio identity used by the fixtures: `PB_SG_GLOBAL_BAL_001`
- Canonical-runtime status: pending the separately owned runtime blocker in Workbench #846
- Non-claim: these images are not canonical populated-runtime, production-readiness, bank approval,
  or competitor-superiority evidence

## Screen sets

| Surface | Evidence | What the browser proof establishes |
| --- | --- | --- |
| Advisor Cockpit | `advisor-cockpit/` | One action title per worklist row, complete reasons in selected detail, addressable keyboard flow, decision above the fold, responsive stacking, and no page overflow |
| Manage Overview | `manage-overview/` | Left-rail-only workflow navigation, centre-only operating posture, distinct right-rail source evidence, selected pane containment, at least 40% desktop-height reduction, responsive stacking, and no page overflow |
| Advisory Overview | `advisory-overview/` | Needs-action count stated once, combined stage/readiness status, selected next-action pane, source-window truth, action containment, responsive stacking, and recovery |
| Advisor Book | `advisor-book/` | Horizontal desktop measures, first portfolio row above 900 pixels, one collapsed support disclosure, raw references excluded from the primary path, responsive reflow, and failure/date recovery |

## Reproduction

Set `ISSUE_811_EVIDENCE_DIR=docs/evidence/issue-811-decision-worklists` and run the relevant
checkout-owned Playwright command. Advisor Cockpit capture additionally sets
`LOTUS_CAPTURE_DIAGNOSTIC_SCREENSHOTS=1`.

Validated on 2026-08-24:

- Advisor Book: 6/6 passed at 1440, 1024, 720, and 519 pixels plus failure and recovery.
- Advisory Overview: 6/6 passed at 1440, 1150, 1024, and 519 pixels plus source-window and recovery.
- Manage Overview: 1/1 scenario passed across 1440, 1024, 768, and 519 pixels, with page-origin
  geometry and capture after keyboard interaction.
- Advisor Cockpit: 3/3 scenarios passed, including its 1800, 1440, 1024, and 519 matrix.
- Shared-layout regression after the visual containment fix: Advisor Cockpit and Advisory Overview
  passed 9/9 together; Manage Overview passed again with an explicit panel-boundary assertion.

The shared canonical runtime was not started, stopped, rebuilt, or otherwise disturbed while this
evidence was generated.
