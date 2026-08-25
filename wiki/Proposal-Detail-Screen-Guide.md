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
6. Treat success as confirmed only after Gateway persistence and the owning source reads reconcile.
7. Use the business-labelled return link to restore the originating portfolio and lifecycle view.

## Implemented Capabilities

- Retrieves primary proposal detail through the Workbench BFF and Gateway.
- Retrieves workflow events, approval records, and lineage independently so one ancillary failure
  does not erase usable primary proposal evidence.
- Reconciles proposal identity, workflow state, and active-version lineage before enabling a
  lifecycle action or announcing its success.
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
- Enables **Request discussion pack** only after the current source read confirms advisor-review
  evidence. Review and pack success are announced only after the action response and refreshed
  proposal evidence agree; refresh disagreement remains an explicit failure.
- Presents memo work as **memo evidence → advisor review → discussion material → record and
  audience**. The advisor reference is always explicit, the active proposal version is read-only,
  and unknown source states fail closed rather than becoming a permissive browser default.
- Enables memo review, discussion material, and optional commentary only when their exact upstream
  evidence is current. A successful mutation is not announced until memo, projection, lineage,
  replay, review, report, and commentary reads reconcile where the action requires them.
- Treats generated commentary as an optional working aid. It never upgrades the retained memo,
  advisor review, suitability evidence, client-release posture, or proposal lifecycle state.
- Creates a next proposal version only from the current source proposal's retained simulation
  request and refreshes the active record after source success.
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
| Prepare advisor memo | Current proposal version and explicit advisor or reviewer reference are available | Gateway records the current-version working memo; this is not advisor approval or client release |
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
| Advisor narrative review and package posture | Submitted and refreshed through proposal narrative endpoints | Gateway over Advise; Report owns downstream materialization |
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
| Partial supporting evidence | Available proposal evidence remains visible and the missing source family is named | Restore the missing evidence before a lifecycle action |
| Action pending | The initiating action remains fenced and conflicting controls are unavailable | Wait for persistence and coherent refresh |
| Action confirmation failed | No success is shown; prior evidence remains under its prior context | Review current posture and retry deliberately |
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
  portfolio return, and routine/restricted/unavailable/not-found return context.
- `tests/unit/proposal-narrative-posture-panel.test.tsx` and
  `tests/unit/proposal-memo-posture-panel.test.tsx` prove the two advisor-review modes and their
  fail-closed action posture.
- `tests/e2e/proposal-memo-posture.spec.ts` provides optimized-production browser proof for proposal
  detail, memo, source-confirmed narrative review, discussion-pack gating, safe action failure,
  refresh disagreement, keyboard, responsive container reflow, and exact visible-overflow behavior.
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
