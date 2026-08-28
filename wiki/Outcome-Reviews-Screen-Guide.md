# Outcome reviews

Outcome reviews is the selected portfolio's post-rebalance comparison and evidence workspace. It
helps portfolio managers and advisers compare Manage-recorded expected and realised outcomes,
understand mandate impact, confirm the evidence available for review, and continue only through a
supported report or AI-assisted internal-review handoff. Workbench does not calculate the outcome,
infer mandate compliance, approve client communication, or report execution.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/workbench/{portfolioId}?mode=reviews` |
| Navigation | **Manage**, then **Outcome reviews** in the selected-portfolio workspace |
| Supported scope | One selected portfolio and the cursor-bounded outcome reviews returned by Manage through Gateway |
| Primary reading order | Review posture and comparison outcome, handoff readiness, review timeline, selected outcome detail, mandate impact, evidence sources, then supported actions |
| Evidence posture | Expected snapshot, realised snapshot, evidence pack, lineage, report preparation, AI-assisted review summary, and client-communication controls remain separate source-backed facts |

Route access is not proof that a review, evidence pack, report, AI-assisted output, client approval,
client communication, trade, or settlement record exists.

## Business Purpose

The screen helps an adviser, portfolio manager, or control specialist answer six questions:

1. Which source review and review window am I assessing?
2. Is the expected-versus-realised comparison within or outside the source-reported tolerance?
3. What improvement or variance did the source record, and which dimensions explain it?
4. What mandate impact and internal rationale did Manage publish for the selected review?
5. Are the expected snapshot, realised snapshot, evidence pack, and source lineage available?
6. Which next step is permitted now: inspect evidence, request report preparation, prepare an
   AI-assisted internal review summary, resolve a block, or stop?

**Within expected tolerance** is a comparison outcome, not a statement that the portfolio complies
with every mandate, suitability, policy, tax, risk, or client objective.

## Who Uses This Screen

- **Portfolio managers and discretionary mandate specialists** compare expected and realised
  outcomes, review dimension evidence, and decide whether the outcome is ready for review or needs
  escalation.
- **Client advisers and investment specialists** use the internal rationale and evidence posture to
  prepare for a human review without treating generated commentary as advice or client-ready text.
- **Investment operations and control teams** examine blocked actions, source lineage, retention,
  evidence availability, and client-communication controls before continuing the owning process.
- **Support teams** distinguish Workbench presentation defects from Gateway, Manage, Report, or
  Lotus AI source failures using the progressive evidence and supportability detail.

These uses do not imply production entitlement, supervisory approval, suitability completion,
client-delivery authority, trade approval, order-routing authority, or execution authority.

## Workflow Position

1. Enter from [Manage Overview](Manage-Overview-Screen-Guide) for the selected portfolio.
2. Read **Review posture** and **Comparison outcome** separately. Review posture states the next
   workflow condition; comparison outcome states what Manage recorded against expected tolerance.
3. Confirm the review window and whether report preparation, the AI-assisted review summary, and
   source evidence are ready or blocked.
4. Use **Review timeline** to compare returned reviews, then read the selected review detail. The
   current implementation presents the first source-ranked review; it does not invent a browser
   ranking.
5. Review updated time, retention date, mandate impact, expected and realised dimensions, variance,
   internal rationale, client-communication controls, and evidence availability.
6. Open the evidence pack only when Manage returned a proof-pack reference.
7. Request report preparation or an AI-assisted review summary only when the returned blocked-action
   posture permits it. Pending controls remain disabled until the current request settles.
8. Treat the returned report request or AI workflow result as a separate handoff outcome. An
   AI-assisted result remains internal and review-gated; it does not upgrade source evidence or
   authorise client use.

## Implemented Capabilities

- Reads outcome-review supportability and records through the same-origin Workbench BFF and Gateway.
- Presents Manage-owned review state, overall comparison outcome, review window, drift improvement,
  mandate impact, internal rationale, dimension results, source lineage, source facets, retention,
  and client-communication controls without recalculating them.
- Translates known source tolerance states to **Within expected tolerance**, **Outside expected
  tolerance**, **Review pending**, **Blocked**, or **Review required**. Unknown states fail closed to
  **Review required**.
- Keeps comparison outcome separate from **Ready for adviser review**, **Adviser review pending**,
  **Escalation required**, and **Needs attention** workflow posture.
- Preserves a source-authored business outcome summary when it is not a machine-state alias; the
  browser does not overwrite source narrative with a stronger mandate claim.
- Presents known handoff reason codes as **Report preparation ready**, **Report preparation
  blocked**, or **AI-assisted review summary blocked** while leaving unknown reasons readable.
- Uses one AI-assisted summary action and keeps source facets and blocked client-action detail behind
  explicit progressive disclosure, avoiding duplicated controls and always-on technical evidence.
- Shows expected snapshot, realised snapshot, evidence pack, and combined source-evidence
  availability separately; an available hash is not exposed as primary business copy.
- Loads Manage report input through Gateway before submitting a report request. Success is shown
  only from the returned source response.
- Requests an AI-assisted review summary through Gateway over Manage-owned evidence and presents the
  returned Lotus AI workflow result with preparation, availability, evidence, human-review,
  client-use, freshness, limitation, and diagnostic disclosure.
- Moves keyboard focus to the returned AI-assisted review heading in the same committed update that
  publishes the result, so an adviser does not remain on a now-completed action or lose the new
  review context below the current viewport.
- Fences report and AI responses to the selected outcome-review identity. A response for another
  review fails closed, and a late response cannot replace evidence for a newer selected source
  context.
- Keeps client communication and approval display-only. No client-contact, approval, delivery,
  order, execution, fill, or settlement action is rendered.

## Decisions And Actions

| Decision or action | Required source gate | Persisted effect |
| --- | --- | --- |
| Treat a comparison as within expected tolerance | Manage returned the known tolerance outcome for this review | None; read-only comparison evidence |
| Open evidence pack | Manage returned a proof-pack reference | Navigates to the selected portfolio's Evidence Pack workspace; no evidence mutation |
| Request report preparation | The selected review has report input available and no returned report-input block | Gateway loads Manage report input and submits the supported Report job; Workbench does not render or publish it |
| Prepare AI-assisted review summary | The selected review has AI evidence available and no returned AI block | Gateway requests a Lotus AI workflow over Manage-owned evidence; output remains internal and human-review gated |
| Continue to client communication | Not supported on this screen | No control is rendered; the returned boundary remains visible |

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Selected portfolio context | Preserves the selected route context; does not create portfolio identity | Gateway over the owning portfolio sources |
| Review records, window, state, comparison, dimensions, variance, rationale, retention, lineage, and evidence references | Validates, formats, identity-fences, and presents the returned contract | Manage through Gateway outcome-review contracts |
| Evidence-source facets and applied filters | Presents recorded provenance in progressive detail; does not query source-owner stores | Manage through Gateway supportability metadata |
| Report preparation | Loads the exact selected review input, submits the supported request, and displays returned status | Manage and Report through Gateway |
| AI-assisted review summary | Displays returned workflow material and its reusable AI-assistance disclosure | Manage and Lotus AI through Gateway |
| Client communication and approval controls | Displays the returned unsupported or blocked boundary; renders no action | Manage's client-communication boundary contract |

The browser calls only `/api/bff/api/v1/...`. Endpoint detail is documented in
[API Surface](API-Surface), and source ownership is documented in [Integrations](Integrations).

## Screen States And Recovery

| State | User-visible posture | Recovery |
| --- | --- | --- |
| Initial loading | Manage workspace loading; no positive outcome or action claim | Wait for the source response |
| Ready | Review posture, comparison outcome, timeline, selected evidence, and permitted actions are visible | Continue with the required human review |
| Partial or degraded | Returned evidence remains visible with named limitations | Resolve the stated source limitation before relying on the missing evidence |
| Blocked | Handoff controls are disabled and the source reason/owner remains visible | Resolve the source-owned review item; do not bypass the gate |
| Empty | No outcome review is returned for the selected portfolio | Confirm the portfolio and owning workflow before expecting post-rebalance evidence |
| Unsupported | Outcome review is not supported for the selected portfolio | Use the owning source process; Workbench does not fabricate a fallback |
| Unavailable or error | Outcome-review detail is withheld and the business-safe failure remains visible | Verify Gateway and Manage, then reload the route |
| Evidence partial | Each missing expected snapshot, realised snapshot, or evidence pack is named separately | Resolve or regenerate evidence through the owning source workflow |
| Report or AI request pending | The initiating and duplicate controls remain disabled | Wait for the current request to settle |
| Report or AI failure | The returned business-safe failure remains near the screen | Confirm the same review context, then retry only through the supported action |
| Selected source context changes | Prior pending/results no longer belong to the current review | Continue with the current source review; stale completion is discarded |

Reloading the route re-contacts the Workbench BFF. A screenshot, badge, request acceptance, or
generated narrative does not replace machine-readable source evidence.

## Workbench Boundaries

Outcome reviews deliberately does not:

- calculate expected or realised outcomes, variance, drift improvement, mandate impact, review
  posture, evidence readiness, or tolerance,
- translate **Within expected tolerance** into **Within mandate**, compliant, suitable, approved,
  client-ready, or execution-complete,
- infer a positive review from missing or unknown source state,
- expose source hashes, review ids, rebalance-run ids, or lineage references as the primary business
  path,
- query Manage, Report, Lotus AI, source-owner stores, an order-management system, broker,
  custodian, or settlement provider directly from the browser,
- generate, approve, publish, release, deliver, or archive client communication,
- generate orders, route trades, acknowledge fills, settle transactions, or reconcile accounting.

Official regulatory and platform research informed the comparison-first hierarchy, periodic-review
language, and human-review boundary. Lotus does not copy another product's layout, language, brand,
calculation, entitlement model, or unsupported feature, and this guide is not a claim of competitor
superiority.

## Adjacent Handoffs

- [Manage Overview](Manage-Overview-Screen-Guide) owns the selected-portfolio operating checkpoint.
- [Mandate Health](Mandate-Health-Screen-Guide) owns mandate health and source exception review.
- [Rebalance Waves](Rebalance-Waves-Screen-Guide) owns the proposed rebalance and governed handoff.
- Evidence Pack owns the broader selected-portfolio proof record.
- [Report centre](Report-Centre-Screen-Guide) owns supported report ordering and monitoring; Outcome
  reviews only submits the bounded report request.

## Evidence And Validation

- `tests/unit/outcome-review-view-model.test.ts` proves known comparison and review-posture states,
  unknown-state failure, source-authored narrative preservation, identity, dimensions, lineage, and
  unavailable/partial/blocked projection.
- The focused `tests/unit/outcome-review-*.test.tsx` component family proves status hierarchy,
  timeline, selected detail, expected/realised evidence, client-communication controls, disabled and
  pending actions, unknown support reasons, and absence of unsupported controls.
- `tests/unit/use-outcome-review-handoffs.test.tsx` proves exact-review identity fencing, pending and
  superseded requests, report submission, AI workflow requests, explicit failures, and blocked
  no-call posture.
- `tests/integration/workbench-page.test.tsx` proves the selected Manage route reads Outcome reviews
  through Gateway and renders the source comparison without exposing review ids or hashes.
- `tests/e2e/manage-outcome-reviews-workspace.spec.ts` proves the optimized production screen at
  1440, 1024, 768, and 519 pixels with one screen heading, one AI-assisted action, readable
  two-column decision summaries, progressive source/client-control detail, no page-level overflow,
  no raw known source commands or contract names in the business path, and keyboard activation that
  hands focus to the returned AI-assisted review heading.
- Reviewable rendered evidence is committed under
  `docs/evidence/issue-799-product-vocabulary/outcome-reviews/`.
- `scripts/live/validation/browser-workflows.mjs` remains the governed canonical Manage browser
  entrypoint. Protected PR, exact-main, and canonical populated evidence remain separate release
  controls and must not be inferred from fixture-backed optimized-production proof.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Confirm the selected portfolio, review posture, comparison outcome, review window, and whether the
missing fact is the expected snapshot, realised snapshot, evidence pack, lineage, report input, or
AI evidence. Record only business-safe failure and correlation evidence through the approved
support process; do not copy hashes, client data, generated text, or raw payloads into a ticket.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Product vocabulary](Product-Vocabulary)
- [Manage Overview](Manage-Overview-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
