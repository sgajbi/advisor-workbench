# Construction Alternatives

Construction Alternatives helps a portfolio manager compare Manage-generated implementation paths
for one selected portfolio before recording a preferred path for further review.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/workbench/{portfolioId}?mode=construction` |
| Navigation | **Mandate management**, then **Construction** |
| Authority | `lotus-manage:RFC-0039` through Gateway |
| Current limitation | Browser-owned request defaults and an idle success badge are tracked in #910 |

## Business Purpose

The screen compares source-returned alternatives, mandate constraints, source readiness, external
hedge eligibility, and order-acknowledgement supportability. It helps a portfolio manager decide
which alternative merits source-owned selection; it does not decide suitability or execution.

## Who Uses This Screen

- Portfolio managers compare implementation paths and constraints.
- Investment control reviews source readiness and policy evidence.
- Operations teams inspect whether an external order acknowledgement can be evidenced.

## Workflow Position

1. Review mandate attention in [Mandate Health](Mandate-Health-Screen-Guide).
2. Generate alternatives only when the selected portfolio has adequate source context.
3. Compare source facts and record a selection through Gateway.
4. Continue to [Evidence Pack](Evidence-Pack-Screen-Guide) for review evidence.

## Implemented Capabilities

- Requests an alternative set through the Workbench BFF and Gateway.
- Compares alternative measures, constraints, source readiness, and external-product evidence.
- Records a source-owned alternative selection and refreshes the returned set.
- Distinguishes idle, ready, partial, blocked, unsupported, and unavailable posture.

## Decisions And Actions

| Action | Persisted effect |
| --- | --- |
| Generate alternatives | Requests Manage construction for the selected context |
| Select alternative | Records the chosen source alternative through Gateway |
| Open evidence pack | Moves to the adjacent evidence workflow; it does not create a pack by itself |

## Information And Source Authority

Manage owns alternatives, measures, constraints, readiness, selection, and acknowledgement
supportability. Workbench presents the typed response. Current request defaults for methods, cash
band, and minimum trade value are browser-supplied and must not be interpreted as mandate policy;
their removal or source governance is tracked in #910.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Idle | Review the request context before generation; no source alternative exists yet |
| Ready | Compare and select a supported alternative |
| Partial or blocked | Resolve the named source or constraint gap |
| Unsupported | Review the source limitation; selection remains unavailable |
| Unavailable or error | Retry through Gateway after the owning service recovers |

## Workbench Boundaries

Workbench does not calculate alternatives, mandate limits, hedge eligibility, suitability, orders,
fills, settlement, or execution evidence. The current static **Evidence Available** idle badge is a
known presentation defect, not proof of source evidence.

## Adjacent Handoffs

- [Mandate Health](Mandate-Health-Screen-Guide)
- [Rebalance Waves](Rebalance-Waves-Screen-Guide)
- [Evidence Pack](Evidence-Pack-Screen-Guide)

## Evidence And Validation

- `tests/unit/construction-alternatives-panel.test.tsx`
- `tests/unit/construction-alternatives-view-model.test.ts`
- `tests/live/construction-alternatives.live.spec.ts`
- `npm run live:validate:construction`

## First Support Step

Confirm the selected portfolio, source readiness, and returned alternative-set status. Do not treat
the idle badge or browser request defaults as source evidence.

## Related Documentation

- [API Surface](API-Surface)
- [Supported Features](Supported-Features)
- [Operations Runbook](Operations-Runbook)
