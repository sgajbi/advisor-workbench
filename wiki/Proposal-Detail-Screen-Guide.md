# Proposal Detail

Proposal Detail is the governed full-record workspace for one retained advisory proposal. It brings
proposal identity, proposed change evidence, workflow gates, approvals, active-version lineage,
advisor narrative, memo preparation, and the currently admitted lifecycle action into one
decision-first review.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals/{proposalId}` with optional `portfolioId` and `fromMode` return context |
| Navigation | Bounded direct route; the global **Proposal** workspace remains capability-disabled |
| Supported scope | One Gateway-backed proposal record and its independently retrieved supporting evidence |
| Action posture | Lifecycle actions, narrative review, memo preparation, and advisor-use package requests only where the returned state and evidence admit them |
| Return posture | Returns to the originating proposal lifecycle view with the source proposal portfolio where available |

This route is an internal advisor and reviewer workspace. Its presence does not establish
production identity, entitlement, client-release approval, report delivery, order routing, or
execution authority.

## Business Purpose

Proposal Detail helps the user decide whether one proposal has enough coherent evidence for its
next governed review step. The primary scan is:

1. confirm the proposal, portfolio, active version, and lifecycle stage;
2. understand proposed changes, allocation impact, and open review gates;
3. inspect workflow, approval, and lineage evidence;
4. review advisor narrative or memo preparation posture;
5. perform only the action admitted by current source state and complete evidence; and
6. return to the originating portfolio-scoped worklist without reconstructing context.

## Who Uses This Screen

- **Client advisors and relationship managers** review the proposal rationale, supporting evidence,
  advisor-use narrative, memo posture, and next source-admitted step.
- **Investment specialists** inspect proposed changes, allocation impact, version history, and
  calculation or source references before supporting the review.
- **Risk, compliance, and maker-checker reviewers** inspect workflow and approval evidence and use
  the action available for the current lifecycle stage.
- **Operations and support teams** use exact proposal, version, workflow, lineage, and return-context
  evidence to diagnose a bounded record without relying on browser-created status.

These use cases do not substitute for authenticated production-role or portfolio-entitlement proof.

## Workflow Position

1. Enter from [Approval Queue](Approval-Queue-Screen-Guide),
   [Risk and Impact](Risk-And-Impact-Screen-Guide),
   [Implementation Status](Implementation-Status-Screen-Guide), Suitability review, Discussion Pack
   Review, or another supported proposal handoff.
2. Confirm the proposal header and active version before reviewing supporting evidence.
3. Review the decision-first change, impact, gate, approval, and lineage sections.
4. Use **Narrative review** or **Memo & evidence pack** as peer advisor-review modes; narrative
   review follows recommendation rationale → advisor review → discussion pack → delivery record,
   and neither mode changes the proposal lifecycle merely by being opened.
5. Perform a lifecycle, narrative, memo, or package action only after its visible prerequisites are
   satisfied.
6. Treat success as confirmed only after Gateway persistence and the owning source reads reconcile
   the same proposal and resulting posture identified by the action response.
7. Use the business-labelled return link to restore the originating portfolio and lifecycle view.

## Implemented Capabilities

- Retrieves primary proposal detail through the Workbench BFF and Gateway.
- Retrieves workflow events, approval records, and lineage independently so one ancillary failure
  does not erase usable primary proposal evidence.
- Reconciles proposal identity, workflow state, and active-version lineage before enabling a
  lifecycle action or announcing its success.
- Confirms the exact action-specific workflow event returned by Gateway against refreshed workflow
  history. Risk, compliance, and consent also require the exact returned approval record, so their
  shared target posture cannot substitute for proof of the action the reviewer actually took.
- Keeps detail, workflow, approvals, and lineage under stable proposal-scoped Query identities.
  Lifecycle and version commands are serialized, invalidate those exact records, and remain pending
  until all four refreshed sources agree; refresh never creates a parallel revision cache.
- Keeps the latest lifecycle or version command's progress and outcome with its proposal when the
  advisor opens another record and returns. An uncertain command therefore remains visibly fenced
  instead of becoming available for accidental resubmission; a later admitted command of the same
  kind replaces the prior settled message.
- Retains the exact admitted lifecycle or version request and idempotency key in the current browser
  tab before submission. If persistence cannot be confirmed, **Recheck earlier action** survives a
  reload and repeats only that exact request. Invalid or unavailable recovery storage blocks a new
  action, and impossible action/prior-state combinations are rejected; authentication and
  entitlement material is never stored there.
- Describes a completed action as a historical outcome without labelling its resulting posture as
  current. Current posture remains the independently refreshed Gateway/Advise record.
- Keeps full-evidence and historical-version reads independent from ancillary action-source
  readiness. Missing workflow, approval, or lineage evidence blocks writes, while the available
  read controls remain usable for investigation. A live persisted command still fences changes to
  its evidence context.
- Presents proposed changes, allocation comparison, evidence hashes, review gates, and source
  history already returned by the proposal contracts.
- Presents proposal version, lineage, narrative review, implementation, and other exact audit
  instants through the shared UTC authority. Calendar-semantic proposal dates remain separate;
  missing, malformed, or unzoned audit values are **Not reported**, never raw source text.
- Provides peer **Narrative review** and **Memo & evidence pack** work areas with explicit
  advisor-use, discussion-pack, commentary, delivery, replay, and client-use boundaries.
- Binds narrative review to the active proposal version rather than asking the advisor to edit the
  version in the review flow. Reviewer reference, policy identity, rationale hash, and latest exact
  delivery time remain in progressive **Review record details**.
- Enables **Request discussion pack** only after the authoritative current-version narrative read
  confirms the persisted review identity, actor, time, state, and narrative hash. Delivery summary
  remains downstream package posture, not review authority. Review and pack success are announced
  only after the action response and the action-specific refreshed reads agree; disagreement
  remains an explicit failure. When persistence succeeds but confirmation does not, the screen
  retains the exact action response, locks both narrative submission controls, and offers
  **Refresh record** until source-owned evidence confirms that original action. The lock begins
  when the source request starts and survives a newer active version, preventing a second review or
  discussion-pack request while the original transaction is still in flight. Its success or failure
  is delivered to the current proposal screen even if the active version changes before the source
  request or confirmation refresh completes.
- When the proposal has advanced, confirmation uses the original report-request identity, reviewed
  narrative version, and latest same-version delivery-request event. The proposal-wide envelope may report
  the newer active version; it cannot substitute that version, reuse the request identity on another
  version, or present duplicate canonical request events as proof.
- Treats delivery activity as current only when the complete returned history is chronological,
  has unique record identities, belongs to the active proposal version, and agrees with the latest
  source record. Discussion-pack success additionally requires the latest pack-request record to
  carry the exact request identity returned by the action. The screen translates governed delivery
  states into business language such as **Discussion pack requested**, **Implementation accepted**,
  and **Implementation completed** rather than exposing source codes.
- Presents memo work as **memo evidence → advisor review → discussion material → record and
  audience**. The advisor reference is always explicit, the active proposal version is read-only,
  and unknown source states fail closed rather than becoming a permissive browser default.
- Treats a source-confirmed current-version absence as **Memo not prepared**, not as an outage.
  Workbench enables only **Prepare advisor memo** after the memo, projection, and replay reads all
  report not found and complete lineage confirms that no current-version memo exists. Permission,
  transport, malformed response, incomplete lineage, or contradictory memo evidence remains
  unavailable and does not expose the action.
- Enables memo review, discussion material, and optional commentary only when their exact upstream
  evidence is current. A successful mutation is not announced until memo, projection, lineage,
  replay, review, report, and commentary reads reconcile where the action requires them.
- When a memo action persists but those reads remain stale or fail, the screen retains the exact
  persisted action as **Awaiting confirmation** and offers one read-only **Refresh record** action.
  Recovery follows the original proposal version and audience; a later proposal version is a
  normal lifecycle transition, not source disagreement. The historical receipt reconciles only
  against that version's memo, projection, replay, event, and retained-lineage identity. It never
  repeats the mutation, substitutes the current version, or creates a new idempotency key.
- An unconfirmed receipt fences another memo action for the same proposal version. If the proposal
  advances, the earlier receipt remains visible and recoverable but does not disable the current
  version's advisor reference, audience, rationale, or admitted action. A complete lineage record
  that no longer contains the earlier memo is presented as retained evidence unavailable; an
  impossible receipt version later than the source current version still fails closed.
- Treats generated commentary as an optional working aid. It never upgrades the retained memo,
  advisor review, suitability evidence, client-release posture, or proposal lifecycle state.
- Creates a next proposal version only from the current source proposal's retained simulation
  request. The returned version must be newer than the pre-command active version; success is shown
  only after refreshed detail identifies that returned version and workflow, approvals, and lineage
  agree with the active record.
- Preserves a deterministic return to Approval Queue, Suitability, Risk and Impact, Discussion Pack,
  or Implementation when valid originating context is supplied.
- Preserves that return path in routine, invalid-id, not-found, restricted, and unavailable states.

## Decisions And Actions

| Decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Submit for risk or compliance review | Current proposal is a draft and detail, workflow, approvals, and active-version lineage agree | Gateway records the lifecycle transition |
| Approve risk or compliance review | Current lifecycle state admits that review and the complete action-evidence set agrees | Gateway records the approval transition and evidence |
| Record client consent | Source lifecycle is awaiting client consent and the action-evidence set agrees | Gateway records the consent transition |
| Create next version | Current version contains a usable retained simulation request and no conflicting action is active | Gateway creates a new proposal version |
| Record advisor review | Current version, reviewer reference, and rationale are available | Gateway records advisor-use narrative review; it does not approve client release |
| Request discussion pack | Refreshed current-version evidence confirms advisor review and a reviewer reference is available | Gateway records a discussion-pack request; rendering, archive, and delivery remain downstream |
| Prepare advisor memo | Current proposal version, explicit advisor or reviewer reference, three matching not-found memo reads, and complete lineage proving no current-version memo | Gateway records the current-version working memo; this is not advisor approval or client release |
| Record advisor review | Refreshed memo evidence matches the current version; advisor reference and rationale are present | Gateway records approval for advisor use against that memo hash |
| Request discussion material | Refreshed advisor-review evidence matches the current memo | Gateway records the package request; rendering, archive, delivery, and client use remain downstream |
| Request advisor commentary | Current memo and advisor-review evidence admit the bounded request | Gateway records the request; generated commentary remains optional and non-authoritative |

The screen prevents concurrent conflicting lifecycle and version actions. A button label or HTTP
success alone is not proof that the refreshed proposal posture agrees.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Proposal, portfolio, stage, version, proposed change, and retained evidence | Presented from the Gateway proposal-detail envelope | Gateway over Advise |
| Workflow history and current workflow state | Retrieved independently and reconciled with detail | Gateway over Advise workflow |
| Approval decisions | Retrieved independently; absence remains explicit | Gateway over Advise approval register |
| Active-version lineage and hashes | Used to confirm that actions apply to the current version | Gateway over Advise lineage |
| Advisor narrative review | Submitted through the version review endpoint and confirmed from the authoritative current-version narrative read | Gateway over Advise review evidence |
| Discussion-pack and delivery posture | Requested through proposal report endpoints and refreshed independently from delivery summary and events | Gateway over Advise; Report owns downstream materialization |
| Memo, projection, replay, review, package, and commentary posture | Presented through proposal memo endpoints | Gateway over Advise, Report, and Lotus AI where the response identifies them |
| Return portfolio | Source proposal portfolio after successful detail load; bounded route context otherwise | Gateway proposal identity, then Workbench route context |

Shared endpoint families and integration boundaries are documented in [API Surface](API-Surface)
and [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Proposal record is being retrieved | Wait; no action posture is inferred |
| Ready | Decision-first proposal record with supporting evidence and source-admitted actions | Review before acting |
| Supporting evidence checking | Primary detail remains visible while workflow, approvals, or lineage settle | Actions remain unavailable until the complete evidence set agrees |
| Memo not prepared | Gateway confirms that memo, projection, and replay are absent while complete lineage confirms no memo for the current proposal version | Enter the advisor or reviewer reference, then use **Prepare advisor memo** |
| Partial supporting evidence | Available proposal evidence remains visible and the missing source family is named | Restore the missing evidence before a lifecycle action |
| Action pending | The initiating action remains fenced across same-proposal version changes and conflicting controls are unavailable | Wait for persistence and coherent refresh |
| Lifecycle or version action awaiting confirmation | No success is shown; current source posture remains visible and **Recheck earlier action** is available | Recheck the exact stored request and idempotency identity; do not start a replacement action |
| Recovery record unavailable or invalid | The screen cannot prove a safe exact retry and all proposal-changing actions remain unavailable | Keep the record open and use the support path; do not reconstruct or resubmit the action |
| Current-version action confirmation failed | No success is shown; the persisted receipt remains under the current proposal version and conflicting same-version memo actions are fenced | Use **Refresh record** to reconcile the original action; the mutation is not repeated |
| Historical action awaiting confirmation | The earlier version and its recovery remain explicit while the current proposal workflow stays usable | Continue current-version work where its own source evidence admits it; recheck the earlier record before relying on that historical action |
| Historical evidence unavailable | The persisted earlier action remains identified, but complete source lineage no longer supplies that version's retained memo evidence | Do not interpret it as confirmed or as source disagreement; use the support path for the named earlier version |
| Restricted | Proposal review is withheld with no inferred approval posture | Return to the originating worklist and use the bank's access process |
| Unavailable | Source proposal record is unavailable | Return to the originating worklist and retry after Gateway recovers |
| Not found or invalid id | No proposal evidence is shown | Return to the originating worklist or create a new draft where appropriate |

## Workbench Boundaries

Proposal Detail deliberately does not:

- calculate suitability, risk, performance, mandate compliance, or execution outcomes;
- infer that an empty approval register means approval is unnecessary;
- approve client publication, render or archive a report, contact a client, or distribute material;
- create orders, route trades, claim execution, settlement, or downstream implementation;
- treat generated narrative, memo, or commentary as source authority without its required review;
- trust incoming route context over the portfolio returned by the source proposal;
- establish authenticated production actor, role, or entitlement from development references.

## Adjacent Handoffs

| Direction | Workspace | Context preserved |
| --- | --- | --- |
| Inbound and return | [Approval Queue](Approval-Queue-Screen-Guide) | Proposal, portfolio, and Approval Queue origin |
| Inbound and return | [Risk and Impact](Risk-And-Impact-Screen-Guide) | Proposal, portfolio, and Risk and Impact origin |
| Inbound and return | [Implementation Status](Implementation-Status-Screen-Guide) | Proposal, portfolio, and Implementation origin |
| Earlier construction | [Proposal Builder](Proposal-Builder-Screen-Guide) | Selected portfolio; retained proposal identity exists only after Gateway draft creation |
| Downstream packaging | Report-owned materialization after a reviewed package request | Source request identity only; Workbench does not claim document completion |

## Evidence And Validation

- `tests/unit/proposal-detail-evidence-view-model.test.ts` proves the decision-evidence projection.
- `tests/integration/proposal-detail-view.test.tsx` proves source reconciliation, positive and
  negative lifecycle actions, no premature success, independent ancillary failure, source-owned
  portfolio return, stable query identity without revision caches, and
  routine/restricted/unavailable/not-found return context.
- `tests/unit/proposal-narrative-posture-panel.test.tsx` and
  `tests/unit/proposal-memo-posture-panel.test.tsx` prove the two advisor-review modes and their
  fail-closed action posture. The memo proof distinguishes source-confirmed absence from permission,
  transport, contract, lineage, and contradictory-evidence failures. It retains one persisted receipt across a same-proposal
  version change, resets it only at proposal identity, and proves refresh success and failure without
  a second same-version mutation. It also proves that an earlier receipt remains recoverable without
  locking an advanced proposal version, that future-version evidence fails closed, and that a
  missing historical lineage item has a distinct unavailable posture. Discussion-pack state must match the active reviewed narrative hash; repeat
  commentary succeeds only when the exact returned event appears in refreshed memo or replay evidence.
- `tests/e2e/proposal-memo-posture.spec.ts` provides optimized-production browser proof for proposal
  detail, source-confirmed first memo preparation, explicit preparation failure, memo review,
  source-confirmed narrative review, discussion-pack gating, safe action failure,
  refresh disagreement, exact four-source lifecycle confirmation, keyboard, responsive container
  reflow, and exact visible-overflow behavior.
- Reviewed Proposal Detail narrative screenshots are published under
  `docs/evidence/issue-798-product-copy/narrative-review/`; they support visual review but do not
  replace Gateway action and refreshed-read proof.
- Reviewed Proposal Detail memo screenshots are published under
  `docs/evidence/issue-798-product-copy/memo-evidence-pack/`. The optimized browser proof covers
  source-aligned success, persistence failure, refresh disagreement, sanitized failure copy,
  audience switching, keyboard operation, 1440/768/640/519 reflow, and zero horizontal overflow.
- `tests/e2e/proposal-workflow-context.spec.ts` proves Approval Queue drill-in and deterministic
  return context in the optimized Workbench.
- Canonical validation uses `PB_SG_GLOBAL_BAL_001`; screenshots are supporting evidence, not proof
  of production identity, entitlement, action persistence, or bank acceptance.

## First Support Step

Read the visible proposal id, active version, source state, and named missing evidence family. Return
to the originating worklist and retry the unchanged proposal once. If the failure persists, record
the displayed support reference without copying client details, proposal payloads, narrative, or
memo content into support channels.

## Related Documentation

- [Approval Queue](Approval-Queue-Screen-Guide)
- [Risk and Impact](Risk-And-Impact-Screen-Guide)
- [Implementation Status](Implementation-Status-Screen-Guide)
- [Proposal Builder](Proposal-Builder-Screen-Guide)
- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Security and Governance](Security-and-Governance)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
