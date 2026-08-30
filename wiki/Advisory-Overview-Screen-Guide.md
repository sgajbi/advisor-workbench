# Advisory Overview

Advisory Overview is the selected portfolio's proposal-prioritisation workspace. It brings the
current proposal window, control-review handoffs, client-discussion readiness, implementation follow-up,
and next adviser action into one dense worklist. It does not establish a complete adviser book,
calculate suitability, approve advice, publish client material, or authorize an order.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/recommendations?portfolioId={portfolio_id}`; `mode=overview` is the explicit equivalent |
| Navigation | **Advice** and **Overview** in the selected-portfolio rail; the global Advisory app entry remains capability-disabled |
| Supported scope | One selected portfolio and one cursor-bounded proposal window at a time |
| Evidence posture | Focused component tests, optimized-browser 1440/1024/519 proof, and canonical browser coverage for `PB_SG_GLOBAL_BAL_001` |
| Primary next action | Resolve the highest-priority visible control or client-discussion handoff, or open the proposal record that owns it |

The route is an implemented compatibility surface, not an unrestricted production-identity,
entitlement, suitability, client-publication, or bank-readiness claim.

## Business Purpose

The screen helps a client adviser or relationship manager answer five questions before moving a
recommendation forward:

1. Which visible proposal requires attention first?
2. Is the next handoff construction, control review, client discussion, or implementation follow-up?
3. Does the current window contain every proposal returned for the selected portfolio?
4. Which exact proposal record owns the next action and supporting evidence?
5. Were proposal priorities updated, or is the earlier worklist being retained after a failed update?

The page header states **Prioritise open proposals and continue the next permitted advisory
action**. The reading order is selected portfolio, adviser decision, proposal-window boundary, proposal
worklist, and selected next action. Stage and readiness are combined into one business status per
proposal, and the needs-action count appears once in the primary scan path. On tablets and compact
layouts, the **Proposal coverage** boundary remains available while the worklist and decision pane
stack. This keeps routine triage fast without presenting a partial list as a complete portfolio or
book.

## Shared Review Context

The shell-owned **Review portfolio** strip confirms the selected mandate once before the advisory
queue. Portfolio and client references remain under **Support details**; mandate type, booking
centre, business date, and currency stay visible in the compact band. Advisory obtains these facts
through the Workbench BFF and Gateway portfolio-shell response and never turns the URL portfolio
reference into visible source truth.

The shared shell marks the workspace **Internal adviser use** without implying approval, client use,
or publication readiness. The right rail therefore describes decision posture only; it does not
repeat portfolio identity.
If supporting portfolio context is unavailable, previously loaded advisory evidence may remain
usable, but the strip is explicitly unavailable and does not show the unconfirmed route value.

## Who Uses This Screen

- **Client advisers and relationship managers** prioritise visible proposal work before a client
  meeting, internal review, or implementation follow-up.
- **Portfolio managers and investment specialists** use the lifecycle handoffs to open the source
  record that needs construction, review, or execution evidence.
- **Risk, compliance, operations, and support teams** distinguish an updated worklist from an
  unavailable, retained-earlier, partial-window, empty, or permission-blocked state.
- **Product and demonstration teams** use deterministic browser proof to verify the Gateway-only
  workflow and its responsive recovery behavior.

These roles describe business use; they do not grant authority or replace source entitlements.

## Workflow Position

1. Select one entitled portfolio from [Advisor Book](Advisor-Book-Workflow) or the shared portfolio
   switcher.
2. Review the decision statement, then scan the source-window boundary and highest-priority visible
   proposals.
3. Open the proposal that owns the next control review, client discussion, construction, or
   implementation action.
4. Use the row's combined business status and the selected decision pane to understand the current
   stage, readiness, evidence, and next permitted action without interpreting separate badge
   columns.
5. Move to the next or previous source window before concluding the selected portfolio has no open
   proposal work.
6. Use **Refresh advisory priorities** or **Retry advisory priorities** when the current proposal
   information needs to be checked.
7. Continue to Proposal Builder only when a new adviser-use draft is appropriate.

## Implemented Capabilities

- Loads portfolio-scoped proposal summaries through the Workbench BFF and Gateway; the browser does
  not call Advise directly.
- Groups source states into Identify, Construct, Review and discuss, and Implement handoffs without
  calculating suitability, approval, client consent, or execution truth.
- Orders the current source window by a documented Workbench attention projection: control review,
  client consent, draft, implementation-ready, then other source states.
- Combines stage and readiness into one closed business status for each visible row; the selected
  pane owns the next action and proposal-detail navigation.
- Labels cursor-based result windows explicitly and keeps earlier/later navigation visible. The
  shared navigation authority permits a retained forward window after returning, rejects cycles
  through any other visited cursor, and disables movement at the governed maximum before changing
  visible state.
- Withholds the queue on initial source failure and never substitutes fallback proposals.
- Retains earlier proposals after a background refresh failure, labels the failed update, and keeps
  an exact source retry available.
- Keeps one shared source-refresh action mounted during retry, prevents duplicate activation,
  preserves keyboard focus, and announces **Update complete** only after the proposal query succeeds.
- Keeps permission failure fail-closed without exposing proposal evidence or an inappropriate retry.
- Uses the shared decision-first worklist with addressable row/detail association, Arrow-key row
  movement, Enter detail transfer, and responsive stacking without hiding exact proposal evidence.
- States the visible needs-action count once, removes repeated metric and lifecycle summaries, and
  keeps the source-window boundary adjacent to the worklist.
- Keeps only unique proposal-coverage evidence from the former supplementary workflow context and
  presents it inline under **Proposal coverage** so the selected decision retains the full operating
  width.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Review a proposal | A visible returned proposal summary | None; opens the proposal record |
| Move to the next source window | A next-window cursor returned for the current window | None; requests another bounded proposal window |
| Return to the previous source window | An earlier cursor remains in the local navigation history | None; reopens that source query identity |
| Refresh advisory priorities | A non-restricted screen state | None; requests the current proposal window again |
| Retry an unavailable window | The proposal request failed and the user remains entitled | None unless a successful response is returned |
| Build a proposal | A selected portfolio and the supported Proposal Builder route | Opens an adviser-use draft workflow; Overview persists nothing |

The screen does not acknowledge, approve, reject, waive, publish, order, execute, settle, or amend a
proposal.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Proposal id, title, portfolio, and current state | Presented from the returned proposal summary | Advise proposal lifecycle composed by Gateway |
| Creator reference and recorded time | Preserved exactly when present; missing evidence remains **Not reported** | Returned proposal summary |
| Combined business status, next action, and visible-window order | Closed Workbench presentation mapping over source state | Workbench view model; no source state is changed |
| Visible proposals needing action | Counted once inside the loaded cursor window | Workbench projection over Gateway-returned summaries |
| Complete or partial source-window posture | Uses Gateway `next_cursor` plus the local previous-window history | Gateway cursor contract and Workbench navigation state |
| Refresh or retry | Repeats the current BFF query identity; no local success is assumed | Gateway `GET /api/v1/proposals` through `/api/bff/api/v1/proposals` |
| Proposal detail | Routes to the selected proposal id | Gateway proposal detail over Advise |

Shared request families remain summarized in [API Surface](API-Surface), with ownership boundaries in
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | A shaped loading state under stable Adviser priorities context | Wait; no substitute worklist is shown |
| Ready | Decision, worklist and window boundary, selected evidence, and supported next action | Review the proposal record or refresh the window |
| Complete empty | No open proposals in the complete window | Review available investment ideas or start a draft; this is not an approval all-clear |
| Partial empty | No proposals in this window while another window remains | Review adjacent windows before concluding the portfolio is clear |
| Background checking | Earlier worklist remains visible with a checking status | Wait or continue reading earlier evidence; duplicate refresh is suppressed |
| Background refresh failed | Earlier proposals remain visible under **Proposal priorities could not be updated** | Use **Retry advisory priorities** before relying on the worklist |
| Initial source unavailable | No substitute proposal, review, or implementation status is shown | Use **Retry advisory priorities**; persistent failure stays explicit |
| Later window unavailable | The unavailable window is withheld | Retry that window or return to the previous proposals |
| Updated recovery | Returned rows replace the failed or earlier evidence and **Update complete** is announced | Continue from the refreshed worklist; keyboard focus remains on the refresh control |
| Permission blocked | Protected queue evidence is hidden | Use an entitled portfolio or the bank's access-support process; no retry is offered |

## Workbench Boundaries

Advisory Overview deliberately does not:

- claim a household, relationship, team, delegate, supervisor, or complete adviser-book worklist,
- infer that a partial or empty window means all proposal work is clear,
- calculate suitability, mandate compliance, client consent, risk approval, publication readiness,
  implementation completion, execution, settlement, or client contact authority,
- turn lifecycle counts or colors into policy decisions, SLAs, recommendations, or alerts,
- invent proposals, fallback states, source timestamps, approval evidence, or successful recovery,
- call Advise directly or expose raw source errors in the business workflow.

Official BlackRock Aladdin Wealth, SAP Fiori responsive design, and W3C Reflow and meaningful-order
guidance informed the task-first worklist, information-priority, responsive disclosure, and
accessible-order principles. Lotus does not copy another product's visual identity, wording,
calculations, or unsupported capability.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns own-book portfolio selection.
- Proposal Detail owns record-specific lifecycle, evidence, approvals, narrative, and implementation
  posture.
- Proposal Builder owns construction and source evaluation of an adviser-use draft.
- Opportunities and Ideas owns Idea-sourced candidate review rather than Advise proposal state.
- Risk Review and Performance own their source-calculated analytical evidence.
- [Report Centre](Report-Centre-Screen-Guide) owns governed report requests and lifecycle tracking.

## Evidence And Validation

- `tests/unit/advisory-overview-view-model.test.ts` proves source-state grouping, visible-window
  counts, ranking, copy, and partial-window boundaries.
- `tests/integration/advisory-overview-workspace.test.tsx` proves loading/ready/empty/partial/error,
  permission, initial and background recovery, duplicate-request fencing, focus stability, and
  support-safe failure copy. It also pins the single needs-action count, combined status,
  selected-decision association, and worklist order.
- `tests/e2e/advisory-overview-worklist.spec.ts` proves the optimized-production route at
  1440/1150/1024/519 pixels, including the shell's responsive stacking boundary, source-window
  navigation, deliberate Gateway failure-to-ready recovery,
  exact request count, focus continuity, worklist precedence, row/detail association, action
  containment, compact de-duplication, source-boundary visibility, the first decision row above 900
  pixels at 1440, and zero page overflow.
- `docs/evidence/issue-811-decision-worklists/advisory-overview/` contains reviewed diagnostic
  desktop, intermediate, tablet, and compact evidence for the decision-first slice. It is not
  canonical runtime proof.
- `docs/evidence/issue-798-product-copy/advisory-overview/` contains the final business-copy review
  renders for this slice at desktop, intermediate, tablet, and compact widths. It is deterministic
  diagnostic evidence, not canonical source proof.
- `scripts/live/validation/browser-workflows.mjs` covers the canonical Advisory Overview panel in
  the governed front-office runtime.
- `output/issue-731/` contains reviewed desktop, tablet, and compact hierarchy screenshots;
  `output/issue-729/` retains source-recovery evidence. They are branch evidence, not
  production readiness, independent certification, bank approval, or competitor-superiority proof.
- Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
  protected PR, exact-main, and canonical runtime sequence.

## First Support Step

Confirm the selected portfolio and source-window number, then use the visible refresh or retry once.
If the queue remains unavailable or earlier evidence remains unconfirmed, record the route, window,
time, and approved support reference and inspect the Workbench BFF/Gateway/Advise path. Do not copy
client identifiers or proposal payloads into support channels, call Advise directly, force a local
ready state, or treat a browser screenshot as source proof.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Security and Governance](Security-and-Governance)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
