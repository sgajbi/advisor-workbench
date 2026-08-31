# Opportunities And Ideas

Opportunities and Ideas is an adviser review queue for source-owned investment candidates on the
canonical portfolio.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Route | `/recommendations?mode=opportunities` |
| Navigation | Visible inside the Advisory lifecycle; top-level Advisory capability remains disabled |
| Portfolio | `PB_SG_GLOBAL_BAL_001` only |
| Authority | Lotus Idea through Gateway and the Workbench BFF |

## Business Purpose

The screen helps an adviser understand why a candidate is in the queue, inspect source signals,
and record a review decision, feedback, or conversion intent without fabricating a proposal or
downstream authority.

## Who Uses This Screen

- Client advisers triage source-ranked candidates.
- Investment specialists review signal and lineage context.
- Product and support teams validate persistence and refresh behavior.

## Workflow Position

Review the queue, select a candidate, inspect its source facts, then record one bounded action. A
successful action is shown only after source persistence succeeds and the queue/detail refresh has
completed or an explicit refresh-failed posture is shown.

## Implemented Capabilities

- Reads the Idea queue and candidate detail through Gateway.
- Presents rank, score, reasons, source signals, lineage, and support posture.
- Keeps the complete returned source window available in a compact, filterable worklist while
  rendering only the rows needed for the active viewport.
- Records review, governed adviser feedback, and conversion intent with idempotency.
- Records source-verifiable viewing evidence only for candidate rows at least half visible in both
  the browser viewport and the bounded worklist; fetching, filtering out, buffering, an off-screen
  worklist, or rendering in a background tab does not count as a presentation.
- Captures usefulness first, then the canonical business reason; candidate signals never become the
  adviser's feedback reason.
- Refreshes queue and detail after persistence and distinguishes refresh failure.

## Decisions And Actions

| Action | Persisted effect |
| --- | --- |
| Record review | Stores the source-owned candidate review |
| Record feedback | Stores useful/not-useful feedback and one governed reason; it does not approve, suppress, convert, or change policy |
| Record conversion intent | Stores intent only; it does not create a proposal |

## Information And Source Authority

Lotus Idea owns candidate identity, ranking, score, reasons, signals, detail, durable-storage
posture, action persistence, and `idea-feedback-taxonomy-v1`. Workbench formats those facts and
carries only BFF-governed calls. Useful feedback is recorded as relevant; not-useful feedback
requires one explicit source-owned reason. Workbench accepts success only when the returned feedback
event matches the submitted candidate, taxonomy, outcome, reason, and time.
For viewing evidence, Idea owns the global queue rank, queue and ranking policy versions, and
candidate material and evidence versions. Workbench measures the independently visible candidate
set, preserves the same observation and idempotency key on retry, and accepts success only when the
durable receipt returns the exact observation evidence. The BFF supplies entitled tenant scope;
the browser cannot submit or override it.
The current journey metadata that suggests direct proposal promotion is an overclaim tracked in
#798; Advise, Performance, and Risk are not sources for this screen's current queue/detail contract.

## Screen States And Recovery

| State | Recovery |
| --- | --- |
| Loading | Wait; no queue or action success is claimed |
| Empty | No candidate is fabricated |
| Unsupported portfolio | Return to the canonical supported portfolio |
| Queue or detail failure | Retry the failed source read |
| Viewing evidence unavailable | Continue reviewing; no viewing confirmation is claimed |
| Viewing evidence persistence failure | Continue reviewing or retry the unchanged observation |
| Mutation or evidence failure | Review the explicit error; no success is shown and the displayed opportunity remains unchanged |
| Persisted, refresh failed | Persistence is acknowledged while stale detail is withheld |
| Persisted and refreshed | Review the updated queue and detail posture |

## Workbench Boundaries

Workbench does not call Idea directly, invent fallback ideas, calculate ranking, create a proposal,
grant suitability or approval authority, contact a client, or create an order. The worklist keeps
the complete returned source window available without treating off-screen render-buffer rows as
viewed candidates.

## Adjacent Handoffs

- [Advisory Overview](Advisory-Overview-Screen-Guide)
- [Advisor Cockpit](Advisor-Cockpit-Screen-Guide)
- [Proposal Builder](Proposal-Builder-Screen-Guide), only as a separate supported workflow

## Evidence And Validation

- `tests/integration/advisory-opportunities-workspace.test.tsx`
- `tests/unit/use-idea-presentation-receipts.test.tsx`
- `tests/e2e/idea-candidate-presentation.spec.ts`
- `tests/e2e/idea-candidate-actions.spec.ts`
- `scripts/live/validation/browser-workflows.mjs`

## First Support Step

Confirm the canonical portfolio, candidate identifier, worklist evidence status, action response,
and refreshed queue/detail evidence. Distinguish viewing-evidence failure, action persistence
failure, and persistence followed by refresh failure.

## Related Documentation

- [API Surface](API-Surface)
- [Security and Governance](Security-and-Governance)
- [Supported Features](Supported-Features)
