# Construction Alternatives

Construction Alternatives helps a portfolio manager compare Manage-generated implementation paths
for one selected portfolio before recording a preferred path for further review.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/workbench/{portfolioId}?mode=construction` |
| Navigation | **Mandate management**, then **Construction** |
| Authority | `lotus-manage:RFC-0039` through Gateway |
| Request posture | Workbench sends source identity and context; Manage owns methods and construction policy |

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
- Leaves method choice, cash constraints, minimum trade policy, and valuation policy to Manage.
- Compares alternative measures, constraints, source readiness, and external-product evidence.
- Records a source-owned alternative selection and refreshes the returned set.
- Distinguishes not generated, generating, evidence available, partial evidence, blocked,
  unsupported, unavailable, and transport-failure posture.

## Decisions And Actions

| Action | Persisted effect |
| --- | --- |
| Generate alternatives | Requests Manage construction for the selected context |
| Select alternative | Records the chosen source alternative through Gateway |
| Open evidence pack | Moves to the adjacent evidence workflow; it does not create a pack by itself |

## Information And Source Authority

Manage owns alternatives, measures, constraints, readiness, selection, and acknowledgement
supportability. Workbench presents the typed response. Default generation sends the selected
portfolio, mandate, model, booking-centre, as-of, tenant, and requested source families. It does not
send a method list, cash band, minimum trade value, valuation mode, or other browser-owned policy.
Manage therefore remains the authority for governed construction methods and constraints.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Not generated | Review the request context before generation; no source alternative exists yet |
| Generating | Keep the action disabled until Gateway returns; no success confirmation is shown |
| Ready | Compare and select a supported alternative |
| Partial evidence | Compare available paths and resolve the named evidence gap before approval |
| Blocked | Resolve the named source or constraint gap; selection remains unavailable |
| Unsupported | Review the source limitation; selection remains unavailable |
| Unavailable or request failed | Retry through Gateway after the owning service recovers |

## Workbench Boundaries

Workbench does not calculate alternatives, mandate limits, hedge eligibility, suitability, orders,
fills, settlement, or execution evidence. An **Evidence available** badge appears only after a
source response contains comparable alternatives. A failed request does not create or preserve a
new success confirmation.

## Adjacent Handoffs

- [Mandate Health](Mandate-Health-Screen-Guide)
- [Rebalance Waves](Rebalance-Waves-Screen-Guide)
- [Evidence Pack](Evidence-Pack-Screen-Guide)

## Evidence And Validation

- `tests/unit/construction-alternatives-panel.test.tsx`
- `tests/unit/construction-alternatives-panel-helpers.test.ts`
- `tests/unit/construction-alternatives-view-model.test.ts`
- `tests/unit/use-construction-alternatives-actions.test.ts`
- `tests/unit/workbench-api.test.ts`
- `tests/live/construction-alternatives.live.spec.ts`
- `npm run live:validate:construction`

## First Support Step

Confirm the selected portfolio, source readiness, and returned alternative-set status. Do not treat
an in-progress or failed request as source evidence. Inspect the source reason codes when evidence
is partial, blocked, unsupported, or unavailable.

## Related Documentation

- [API Surface](API-Surface)
- [Supported Features](Supported-Features)
- [Operations Runbook](Operations-Runbook)
