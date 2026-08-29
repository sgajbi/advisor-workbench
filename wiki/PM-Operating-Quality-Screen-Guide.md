# PM Operating Quality

PM Operating Quality is a supervisory workspace for reviewing Manage-owned policy, score-run,
fairness-review, review-action, and summary-invocation evidence.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/workbench/{portfolioId}?mode=quality` |
| Authority | Manage through Gateway; Lotus AI provides bounded review-required support |
| Use | Internal supervision and operating-quality review |
| Validation | Canonical proof matches the selected Manage records and explicit screen state |

## Business Purpose

The screen helps supervisory users review operating-quality evidence and record bounded review
steps without turning analytical or generated material into autonomous personnel decisions.

## Who Uses This Screen

- Portfolio-management supervisors review policy and score runs.
- Investment control inspects fairness segments and persisted analyses.
- Support teams diagnose blocked actions and missing source context.

## Workflow Position

Select a current policy and quality run, inspect source-defined fairness segments, preview before
persistence, record the bounded supervisory action, and retain human review over any AI-assisted
summary.

## Implemented Capabilities

- Reviews policies, score runs, fairness analyses, supervisory actions, and invocation history.
- Previews and persists fairness analysis using source-defined segments.
- Previews and records bounded supervisory review actions.
- Requests review-required AI support summaries and records reviewed invocation evidence.

## Decisions And Actions

Actions are available only when Manage returns the required policy, run, segment, and readiness
facts. Preview and persistence are distinct. A generated support summary remains internal decision
support and requires human review.

## Information And Source Authority

Manage owns policy, score, segment, fairness, action, and invocation records. Lotus AI supplies
bounded generated support through the governed source workflow. Workbench does not calculate
scores or fairness and does not expose raw prompts or generated model output as authority.
Canonical proof creates and reads these caller-scoped records under the same Workbench tenant;
command-centre query scope remains a separate contract value.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Ready | Review source evidence before preview or persistence |
| Partial | Continue with available records; resolve the stated gap |
| Blocked | Resolve the Manage action-register condition |
| Empty | Select or create the required source record in the owning workflow |
| Unavailable | Retry after Gateway/Manage recovery |

## Workbench Boundaries

No protected-class inference, autonomous PM ranking, compensation, HR, conduct, trade approval,
client contact, or order action is supported. The screen is supervisory evidence, not a personnel
decision engine.

## Adjacent Handoffs

- [Manage Overview](Manage-Overview-Screen-Guide)
- [Portfolio Memory](Portfolio-Memory-Screen-Guide)
- [PM Copilot](PM-Copilot-Screen-Guide)
- [Evidence Pack](Evidence-Pack-Screen-Guide)

## Evidence And Validation

- `tests/unit/pm-operating-quality-panel.test.tsx`
- `tests/unit/pm-operating-quality-view-model.test.ts`
- `tests/integration/pm-operating-quality-create.integration.test.tsx`
- `scripts/live/validation/browser-workflows.mjs` verifies the exact seeded quality run and
  fairness review, Manage authority, source state, and absence of an active failure posture.

## First Support Step

Confirm policy, selected quality run, source-defined segments, and Manage action readiness before
retrying a preview or persistence action.

## Related Documentation

- [Security and Governance](Security-and-Governance)
- [Validation and CI](Validation-and-CI)
- [Supported Features](Supported-Features)
