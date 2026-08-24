# Discussion Pack Review

Discussion Pack Review is the advisor's portfolio-scoped conversation preparation desk. It keeps a
bounded proposal worklist beside one selected, source-backed evidence record and separates material
approved for internal advisor use from report preparation, client consent, client release, and
delivery. It does not describe a lifecycle stage as permission to meet, publish, send, or contact a
client.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals?portfolioId={portfolio_id}&mode=discussion-pack` |
| Navigation | Direct bounded route; the global **Proposal** workspace remains capability-disabled |
| Worklist scope | `AWAITING_CLIENT_CONSENT` proposals in one cursor-bounded Gateway source window |
| Evidence scope | One selected proposal and immutable version through `proposal-discussion-pack-review.v1` |
| Screen authority | Read-only internal conversation preparation and exception review |

**In view** is the number of matching records returned in the current source window, not a whole
book, client, household, or global total. Workbench never fans out discussion-pack reads across the
worklist. It asks for evidence only when an advisor selects a record.

## Business Purpose

The screen helps an advisor answer five separate questions before a client conversation:

1. Is the selected narrative recorded and reviewed for internal advisor use?
2. Is the advisor decision memo available and reviewed for the same proposal version?
3. Has a report package been requested or materialized, and does it reference this version?
4. Is client consent recorded for this version, declined, absent, or unavailable?
5. Does the platform currently support client release, publication, delivery, or communication?

Keeping these controls independent prevents an available narrative, memo, PDF, consent record, or
lifecycle state from being mistaken for authority that the source contract has not granted.

## Who Uses This Screen

- **Client advisors and relationship managers** prepare the conversation and identify unresolved
  controls before opening the governed proposal record.
- **Investment and advisory specialists** verify that rationale, material changes, risk discussion,
  suitability context, alternatives, approvals, and limitations are grounded to the selected
  proposal version.
- **Supervisors and compliance reviewers** inspect advisor-use review, disclosure policy, consent,
  and client-release boundaries without interpreting browser-owned status.
- **Support teams** use proposal version, Gateway correlation, capability, and lineage evidence to
  locate a source or contract failure.

These are business audiences, not browser-authored roles or entitlements.

## Workflow Position

1. A proposal reaches the client-consent gate through its governed advisory lifecycle.
2. Workbench requests only that state from the Gateway proposal list for the selected portfolio.
3. The advisor selects one proposal with pointer, Up/Down, Home, or End navigation.
4. Workbench requests one Gateway discussion-pack projection bound to proposal, portfolio, version,
   lifecycle state, and request correlation.
5. The advisor reviews the conversation-control ledger before reading narrative and memo detail.
6. Disclosures, limitations, capability posture, and lineage remain available without crowding the
   primary decision.
7. **Open full proposal review** preserves the portfolio and Discussion Pack origin for governed
   review or lifecycle actions.

## Implemented Capabilities

- Uses the reusable Workbench proposal selector in an explicit grid presentation: record identity
  and status remain readable without a one-off card stack.
- Uses a full-width selected-record desk when portfolio and workflow rails constrain the centre
  canvas; compact widths retain worklist-before-evidence order.
- Validates proposal, portfolio, immutable version, lifecycle, request correlation, closed enum,
  timestamp, capability, and client-release semantics before presentation.
- Presents five independent controls: advisor narrative, advisor memo, report package, client
  consent record, and client release/delivery.
- Labels deterministic and AI-assisted narrative generation explicitly. **AI-assisted draft** is
  provenance, not advice, approval, or client-ready authority.
- Reports narrative freshness as **Not reported** because the contract publishes proposal-version
  time, not a narrative freshness fact; Workbench does not upgrade that adjacent timestamp.
- Shows source-backed narrative sections with reference and limitation counts.
- Shows memo sections, policy disclosures, client-use blockers, and limitations without inventing
  owners, deadlines, priority, or completion.
- Keeps capability and lineage evidence in progressive disclosure.
- Preserves confirmed evidence while a refresh is pending; failure does not relabel older evidence
  as current.
- Announces success only after the selected source read succeeds and restores the initiating
  refresh control when focus has not deliberately moved.
- Uses only the same-origin Workbench BFF; the browser never calls Advise or Report directly.

## Decisions And Actions

| Decision or action | Required evidence | Persisted change |
| --- | --- | --- |
| Select a proposal | Proposal is in the current Gateway window | None; changes browser selection only |
| Use narrative internally | Narrative is supported and approved for advisor use | None; read-only evidence |
| Review decision memo | Memo evidence is supported for the selected version | None; read-only evidence |
| Interpret report-package posture | Package state and version correlation are source-confirmed | None; read-only evidence |
| Interpret client consent | Current-version consent record is supported and unambiguous | None; read-only evidence |
| Refresh conversation evidence | Current list and exact selected projection both succeed | None; replaces confirmed evidence |
| Open full proposal review | Selected proposal and preserved route context | None; navigates to governed actions |

There is no publish, release, deliver, contact-client, consent, report-generation, or approval
mutation on this screen.

## Information And Source Authority

| Business fact | Workbench boundary | Source authority |
| --- | --- | --- |
| Proposal identity, state, version, and recorded time | Strictly parsed and request-bound | Gateway over Advise |
| Narrative text and grounding references | Presented without regeneration or rewriting | Immutable Advise proposal-version narrative |
| Narrative advisor-use review | Kept separate from client-ready posture | Advise append-only narrative review |
| Disclosure policy and client-use blockers | Presented as selected source policy | Advise narrative policy |
| Advisor memo and memo review | Presented for internal decision support | Persisted Advise memo evidence |
| Report-package state and reference | Presented as preparation/materialization only | Advise summary over Report evidence through Gateway |
| Client consent | Selected only for the immutable current version | Advise approval ledger through Gateway |
| Client release, publication, delivery, communication | Explicit blocked/not-supported boundary | Gateway contract; no browser override |
| Correlation and immutable hashes | Secondary support evidence | Gateway and source lineage |

See [API Surface](API-Surface) and [Integrations](Integrations) for shared contract detail.

## Screen States And Recovery

| State | User-visible posture | Recovery |
| --- | --- | --- |
| Loading | Exact selected evidence is being checked | Wait; lifecycle stage is not substituted |
| Advisor evidence reviewed | Internal controls are confirmed, while client release remains separate | Prepare internally and respect the release boundary |
| Review required | One or more review, package, consent, or release controls need attention | Use the ledger and open the governed record |
| Partial | Some source evidence is missing or uncorrelated | Review only supported evidence; resolve named gaps |
| Restricted | Selected evidence is hidden and no retry bypass is offered | Use the bank's access process |
| Unavailable | No discussion posture is inferred | Retry through the same Gateway/BFF read |
| Refreshing | Prior confirmed evidence remains visible under its prior context | Wait for the selected read to settle |
| Refresh failed | Prior evidence remains visible but is not relabelled current | Retry the unchanged selection |
| Source contract invalid | Gateway or Workbench rejects contradictory identity or evidence | Escalate with bounded correlation and proposal version |

## Workbench Boundaries

Workbench validates and presents the Gateway experience contract. Advise remains the proposal,
narrative, memo, policy, review, and consent system of record; Report remains the report-package
source named by Gateway. Workbench does not generate or rewrite the narrative, calculate
suitability or risk, approve a proposal, approve consent, publish or release material, deliver a
document, communicate with a client, or claim execution.

An advisor-use narrative or memo is not client-ready material. A report reference is not delivery.
A consent record is not publication authority. An empty exception register cannot override the
explicit client-release boundary.

## Adjacent Handoffs

| Direction | Workspace | Preserved context |
| --- | --- | --- |
| Inbound | Risk and Impact, Suitability review, Approval Queue, or Proposal Detail | Selected portfolio and proposal lifecycle |
| Detail | Proposal Detail through **Open full proposal review** | Proposal, portfolio, and Discussion Pack origin |
| Return | Discussion Pack Review through the governed detail return link | Source proposal portfolio and Discussion Pack mode |
| Reporting | Report package evidence | Reference only; no direct browser-to-Report call or generation action |

## Responsive And Accessible Use

- The worklist exposes one visible selection and Up/Down/Home/End keyboard movement.
- Identity leads status in the reusable grid worklist so long proposal names do not collapse around
  badges.
- Worklist precedes selected evidence in DOM, visual, and focus order at every width.
- The selected record uses the whole centre canvas at wide desktop and reflows at 1280, 1024, 720,
  and 390 pixels without horizontal overflow.
- Native disclosures retain 44-pixel operable summaries and visible focus.
- Pending, confirmed, failed, restricted, and unavailable states use programmatic status semantics.
- Source ids and hashes remain secondary to business decisions and boundaries.

## Current-Product Research

- [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
  informed the whole-portfolio proposal-to-client-conversation flow and the need to keep narrative
  and implementation evidence in one lifecycle.
- [Avaloq client management](https://www.avaloq.com/platform/client-management) informed a single
  source-of-truth advisor workflow and context-preserving proposal review.
- [Temenos Wealth Management](https://www.temenos.com/products/wealth-management/) informed the
  separation of suitability, proposal, compliance, and client-engagement controls.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) informed reflow, status announcement, focus continuity,
  and target-size proof.

The screen adopts decision-first workflow, source truth, progressive evidence, and responsive
composition. It rejects competitor visual imitation, decorative card walls, inferred readiness,
and unsupported actions. These sources guide workflow principles; they are not a claim of bank
approval or competitor superiority.

## Evidence And Validation

- `tests/unit/proposal-discussion-pack-contract.test.ts` proves request identity, lifecycle,
  capability, closed-enum, correlation, and release-boundary parsing.
- `tests/unit/proposal-discussion-pack-view-model.test.ts` proves business language and independent
  advisor-use, package, consent, and release presentation.
- `tests/unit/proposals-api.test.ts` proves the browser uses the same-origin BFF with the selected
  portfolio and version query.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves selected-only reads, no N+1,
  server-side lifecycle filtering, source failure, refresh settlement, and focus restoration.
- `tests/e2e/proposal-workflow-context.spec.ts` proves optimized-production keyboard selection,
  AI provenance, unsupported-action absence, 1440/1280/1024/720/390 reflow, and zero overflow.
- Canonical runtime uses `PB_SG_GLOBAL_BAL_001`; screenshots do not replace API and contract proof.

## First Support Step

Read the selected proposal id, version, control status, and Gateway correlation, then retry the same
selection once. If the failure persists, record those bounded references and the visible source
state. Do not paste client material or full source payloads into support channels, call Advise or
Report directly from the browser, or bypass the release boundary.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Approval Queue](Approval-Queue-Screen-Guide)
- [Risk and Impact](Risk-And-Impact-Screen-Guide)
- [Implementation Status](Implementation-Status-Screen-Guide)
- [Proposal Detail](Proposal-Detail-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
