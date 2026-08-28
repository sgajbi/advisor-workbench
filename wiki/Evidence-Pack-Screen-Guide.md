# Evidence Pack

Evidence Pack prepares and reviews Manage-owned decision evidence for a selected portfolio and
rebalance context.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/workbench/{portfolioId}?mode=proof` |
| Authority | `lotus-manage:RFC-0040` through Gateway; bounded Lotus AI memo support |
| Handoff | Retrieves report-ready input but does not generate or deliver a report |
| Known wording gap | **Generate client report** overstates the current GET handoff; tracked in #798 |

## Business Purpose

The screen assembles source-owned evidence needed to review a portfolio-management decision,
assess coverage, and prepare bounded downstream material without rebuilding proof in the browser.

## Who Uses This Screen

- Portfolio managers prepare and review decision evidence.
- Investment control inspects source coverage and readiness.
- Operations and reporting teams use source-ready handoff inputs.
- Support teams trace source records and missing sections.

## Workflow Position

Prepare a pack from a source rebalance run, load the current pack, review sections and coverage,
then retrieve report-ready input or request a review-required PM memo only where the source says the
handoff is available.

## Implemented Capabilities

- Prepares and loads a Manage proof pack.
- Presents sections, coverage, source references, documents, and handoff readiness.
- Loads source Markdown and report-ready input.
- Requests a governed, review-required PM memo over the exact source pack.

## Decisions And Actions

| Action | Current effect |
| --- | --- |
| Prepare evidence pack | Requests Manage to materialise source-owned evidence |
| Load source detail | Retrieves the selected pack or source Markdown |
| Retrieve report input | Gets Manage report-ready input; no report is generated |
| Prepare PM memo | Requests bounded AI support over the exact source pack |

## Information And Source Authority

Manage owns pack identity, sections, hashes, coverage, documents, Markdown, and report-ready input.
Lotus AI supplies bounded memo material through Gateway. Report, Render, and Archive are adjacent
owners only when a later supported handoff invokes them; this screen currently does not.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Ready | Review the exact pack and handoff readiness |
| Empty | Prepare or load a source pack |
| Partial | Resolve the named missing section or source dependency |
| Blocked or unsupported | Review the source restriction; downstream action stays unavailable |
| Unavailable | Retry after Gateway/Manage recovery |

## Workbench Boundaries

Workbench does not construct hashes, sections, Markdown, report input, prompts, or source evidence.
It does not approve, publish, render, archive, deliver, contact clients, create orders, or claim
execution. Report-input retrieval is not client-report generation.

## Adjacent Handoffs

- [Rebalance Waves](Rebalance-Waves-Screen-Guide)
- [PM Copilot](PM-Copilot-Screen-Guide)
- [Outcome reviews](Outcome-Reviews-Screen-Guide)
- [Report centre](Report-Centre-Screen-Guide)

## Evidence And Validation

- `tests/unit/proof-pack-panel.test.tsx`
- `tests/unit/proof-pack-workspace.test.tsx`
- `tests/unit/proof-pack-view-model.test.ts`
- `tests/e2e/manage-proof-copilot-workspace.spec.ts`

## First Support Step

Confirm the selected rebalance reference, pack identifier, source coverage, and handoff readiness.
Do not use the current report action label as proof that a report exists.

## Related Documentation

- [API Surface](API-Surface)
- [Report centre](Report-Centre-Screen-Guide)
- [Validation and CI](Validation-and-CI)
