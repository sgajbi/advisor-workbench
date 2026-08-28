# Portfolio Memory

Portfolio Memory is a read-only timeline of source-persisted portfolio-management decisions and
evidence for the selected portfolio.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/workbench/{portfolioId}?mode=memory` |
| Authority | `lotus-manage:RFC-0040/RFC-0041/RFC-0042` through Gateway |
| Interaction | Filter event types and inspect one event; no note or timeline mutation |
| Known limitation | Static audit/guidance copy in unavailable states is tracked under #798 |

## Business Purpose

The screen helps a portfolio manager reconstruct what changed, why related workflow evidence was
recorded, and which source reference supports the event without searching across separate tools.

## Who Uses This Screen

- Portfolio managers review mandate, rebalance, evidence, outcome, quality, and campaign history.
- Investment control follows source lineage during oversight.
- Support teams distinguish missing history from source unavailability.

## Workflow Position

Open Portfolio Memory from Manage after identifying an exception, review, or evidence question.
Filter to the relevant event family, inspect the selected record, then continue to the owning
Manage mode using the source reference.

## Implemented Capabilities

- Reads a Manage-persisted timeline through Gateway.
- Filters known event types and selects one event for detail.
- Presents coverage, open follow-ups, and evidence links where returned.
- Preserves complete, partial, empty, unsupported, and unavailable states.

## Decisions And Actions

Portfolio Memory supports historical review only. Filter and event-selection controls change the
view; they do not persist a decision. Locally authored **Recommended Actions** are informational
Workbench guidance, not source-returned controls.

## Information And Source Authority

Manage owns event identity, timestamps, source family, references, evidence, and follow-up facts.
Search is bounded to persisted Manage lineage; it does not query source-owner stores or discover a
global portfolio history.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Complete | Review and follow the relevant source reference |
| Partial | Use available events and inspect the stated coverage gap |
| Empty | Confirm portfolio/date context; no history is inferred |
| Unsupported | Review the source supportability reason |
| Unavailable | Retry after Gateway/Manage recovery; static guidance is not source proof |

## Workbench Boundaries

Workbench does not create notes, alter history, infer missing events, search domain-service stores,
contact clients, approve decisions, or initiate execution. The static **Audit trail available** copy
does not prove availability when the response is unavailable; correction is tracked in #798.

## Adjacent Handoffs

- [Manage Overview](Manage-Overview-Screen-Guide)
- [Rebalance Waves](Rebalance-Waves-Screen-Guide)
- [Outcome reviews](Outcome-Reviews-Screen-Guide)
- [Evidence Pack](Evidence-Pack-Screen-Guide)

## Evidence And Validation

- `tests/unit/portfolio-memory-panel.test.tsx`
- `tests/unit/portfolio-memory-view-model.test.ts`
- `scripts/live/validation/browser-workflows.mjs`

## First Support Step

Confirm the selected portfolio and source status, then inspect the event reference and coverage
posture before treating the timeline as complete.

## Related Documentation

- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Troubleshooting](Troubleshooting)
