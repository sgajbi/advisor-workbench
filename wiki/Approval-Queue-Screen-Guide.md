# Approval Queue

Approval Queue is the advisor's portfolio-scoped review desk for proposals already retained in the
governed advisory lifecycle. It brings the visible source window, one selected proposal, its
review-stage posture, and the next supported business action into one working view before the
advisor opens the full evidence and action record.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals?portfolioId={portfolio_id}`; `mode=approval-queue` is equivalent |
| Navigation | Direct bounded route; the global **Proposal** workspace remains capability-disabled |
| Supported scope | One selected portfolio and one cursor-bounded Gateway proposal window |
| Evidence posture | Gateway-backed proposal summaries plus selected-only detail, workflow, approval-register, and active-version lineage evidence |
| Primary next action | Select a proposal, resolve any source-backed approval exception, then open the governed full review |

The number shown is **in this view**, not a whole book, client, household, or global approval-queue
total. A visible lifecycle stage does not itself prove suitability, approval, client consent,
publication, execution, or production entitlement.

## Business Purpose

Approval Queue helps an advisor answer four questions without opening every proposal:

1. Which proposals are present in the current source window?
2. What maker-checker evidence is recorded for the selected proposal?
3. Do the selected worklist record, portfolio identity, lifecycle state, workflow evidence,
   approval register, and active-version lineage agree?
4. Which exception or next business action requires the full proposal record?

Where the working area can support both columns, the worklist and selected proposal remain visible
together. The shared workspace stacks before the decision pane when its own container becomes too
narrow, so shell width and zoom cannot reverse the evidence and action order.

## Who Uses This Screen

- **Client advisors and relationship managers** triage retained proposals for the selected
  portfolio and continue to the record that needs review.
- **Portfolio and investment specialists** identify the active proposal version and review stage
  before supporting the advisor in Proposal Detail.
- **Risk, compliance, and maker-checker reviewers** use this screen for orientation; their actual
  approval evidence and actions remain source-owned in the full proposal record.
- **Operations and support teams** use proposal identity, source-window posture, and recorded date
  to locate the relevant governed record without relying on browser-created status.

These roles describe business use, not authenticated production entitlement.

## Workflow Position

1. Start with a selected portfolio from [Advisor Book](Advisor-Book-Workflow),
   [Advisory Overview](Advisory-Overview-Screen-Guide), or
   [Proposal Builder](Proposal-Builder-Screen-Guide).
2. Confirm the portfolio and current source-window posture in the page and workflow context.
3. Review the visible **In view** and **Not execution-ready** measures. These are lifecycle-window
   orientation, not approval counts.
4. Move through proposals with pointer or Up/Down/Home/End keys. Press Enter to move into the
   selected decision evidence and Escape to return to that proposal in the worklist.
5. Read the selected proposal's source stage, version, creator-record posture, recorded date,
   approval register, workflow evidence, active-version lineage, and next business action.
6. Select **Open full proposal review** to inspect source-owned changes, impact, review gates,
   approvals, lineage, narrative, memo, and permitted actions.
7. Use **Return to Approval Queue** to restore the originating portfolio and worklist context.
8. Continue through later lifecycle modes only when their own source evidence supports that task.

## Adjacent Handoffs

| Direction | Adjacent workspace | Context preserved |
| --- | --- | --- |
| Inbound | Advisor Book, Advisory Overview, or Proposal Builder | Selected portfolio |
| Outbound | Proposal Detail through **Open proposal review** | Selected proposal, portfolio, URL-backed selection, active source window, and Approval Queue origin |
| Return | Approval Queue through **Return to Approval Queue** | Source proposal portfolio, selected proposal, active source window, and Approval Queue mode |
| Later lifecycle | Suitability, Risk and Impact, Discussion Pack, or [Implementation Status](Implementation-Status-Screen-Guide) | Portfolio only; each workspace must prove its own source-backed decision evidence |

## Implemented Capabilities

- Reads proposal summaries only through the Workbench BFF and Gateway.
- Keeps proposal count and attention posture explicitly scoped to the current source window.
- Provides previous and next source-window navigation without claiming global completeness.
- Persists the opaque page-local cursor and window ordinal when moving into Proposal Detail,
  then re-reads that exact Gateway window on return. Workbench validates the address shape but does
  not interpret the cursor as queue order or business evidence. Browser Back and Forward reconcile
  the worklist to the addressed window; a source-owned portfolio correction discards a cursor that
  belonged to the stale addressed portfolio.
- Uses the shared `WorkbenchWorklist` composition with one keyboard-operable source list, one
  selected decision region, stable accessibility relationships, and visible selected state.
- Admits a URL `selectedRecordId` only when the exact proposal is present in the current Gateway
  window. A stale or foreign identity falls back to the first source-ranked row and never triggers
  selected-evidence reads for the absent record.
- Presents source-supported proposal title, identity, lifecycle stage, active version,
  creator-record posture, recorded date, and bounded next action where supplied.
- Loads detail, workflow, approval records, and lineage for the selected proposal only; it does not
  fan detail requests across the visible worklist.
- Derives maker-checker posture from the complete selected evidence set, not lifecycle stage.
- Reconciles the selected worklist portfolio, lifecycle state, and version with current proposal
  detail before publishing maker-checker posture; an absent worklist portfolio is not replaced by
  route context.
- Hides approval records when the worklist record, proposal identity, workflow state, or
  active-version lineage conflicts.
- Treats an empty approval register as unconfirmed requirements, never as approval not required.
- Keeps prior confirmed evidence under its prior context when refresh fails, and announces success
  only after the worklist and every selected evidence source refresh and reconcile successfully.
  A version advance for the same selected proposal carries confirmation onto the reconciled new
  version; changing the selected proposal still fences the earlier completion.
- Rejects a failed compound refresh before cache promotion; if access is revoked, cached approval
  records and selected-record facts are hidden from both the decision pane and persistent workflow
  rail, and the selected posture becomes restricted rather than source-current.
- Keeps the selected decision pane beside the worklist where its container supports the dense
  two-column review, and after it in logical DOM order at compact widths.
- Preserves portfolio, selected proposal, active source window, and originating lifecycle mode when
  entering Proposal Detail and returning to the queue.
- Uses the portfolio returned by Proposal Detail as the authority for the routine return path;
  route context does not replace source proposal identity.
- Keeps approval and evidence actions out of the summary queue.
- Preserves explicit loading, empty, partial-window, refreshing, refresh-failure, restricted, and
  unavailable states.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Select a proposal | Proposal is present in the current source window | None; updates the URL-backed local decision context only |
| Move to next or previous proposal window | Source supplies a cursor or a prior window is retained | None; reads another bounded Gateway window |
| Build Proposal | Selected portfolio context | Opens Proposal Builder; nothing is approved or executed |
| Refresh evidence | Selected worklist record plus the four Gateway-backed selected-evidence reads | None; replaces posture only after every refreshed source agrees |
| Open full proposal review | Selected proposal identity and supported detail route | None; opens the full source-backed review record |
| Return to Approval Queue | Source proposal portfolio where available, otherwise bounded route context | None; restores the originating queue route and admitted selected proposal |

## Information And Source Authority

| Business fact | Workbench presentation | Source authority |
| --- | --- | --- |
| Proposal, portfolio, lifecycle state, version, creator-record presence, and recorded time | Parsed from the proposal-list contract; raw creator ids are not presented as verified human identity | Gateway over Advise proposal lifecycle |
| Stage and bounded next action | Business copy derived from source lifecycle state; not maker-checker proof | Workbench presentation over the source state |
| In-view and attention counts | Count only rows in the current source window | Workbench view model over Gateway rows |
| More or earlier proposals | Shown only from source cursor and retained window history | Gateway cursor plus Workbench navigation history |
| Selected proposal | Advisor's URL-backed selection, admitted only when present in the returned window | Workbench interaction state; not a source mutation |
| Selected worklist record, detail, workflow, approvals, and active-version lineage | Portfolio, proposal, lifecycle state, and active version are reconciled as one maker-checker evidence set | Gateway over Advise list, detail, and evidence contracts |
| Proposed changes, allocation impact, narrative, memo, and governed actions | Available only after opening Proposal Detail | Gateway over Advise detail, review, and evidence contracts |

The queue does not receive client name, household, assignee, due date, SLA, urgency, materiality,
whole-book count, or global sort authority. Workbench does not invent them.

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Proposal posture is being retrieved | Wait; no fallback proposal claims are shown |
| Ready | Current-window worklist plus one source-reconciled selected approval posture | Review the evidence and open the relevant proposal |
| Empty current window | No matching proposals, with explicit adjacent-window guidance where applicable | Move to the next or previous source window or build a draft |
| Partial source window | The visible count remains bounded and more/earlier proposals are disclosed | Continue window navigation before concluding the queue is clear |
| Selected evidence checking | Worklist remains visible while detail, workflow, approvals, and lineage settle | Wait; no state-derived maker-checker posture is substituted |
| Empty approval register | Explicit **No approval records** posture and boundary note | Open the full review to confirm the required maker-checker step |
| Evidence conflict | A stale worklist record or conflicting selected evidence is named and approval records are hidden | Recheck the queue and selected source set before relying on posture |
| Refreshing | Earlier confirmed evidence remains under its confirmed proposal context | Wait for the worklist and four selected-source reads to settle |
| Refresh failed | Earlier evidence remains visible but is not relabelled as refreshed | Retry the exact selected evidence set |
| Restricted | Selected approval evidence is hidden and the shared rail remains restricted | Use the bank's access process; no retry bypass is offered |
| Unavailable | Worklist remains, selected maker-checker posture is withheld, and exact retry is offered | Retry after the source recovers |

## Responsive And Accessible Use

- The worklist is a labelled single-selection control with visible focus and selected state.
- Up/Down keys move between proposals; Home and End move to the first and last enabled proposal.
- Arrow selection is announced without moving focus; Enter moves focus to the selected decision
  region and Escape returns it to the same source row.
- At 1440 pixels, available container capacity keeps worklist and decision simultaneous. The full
  navigation and context rails narrow that lane enough to stack at 1280 pixels; after those rails
  reflow at 1024 pixels, the main lane supports the split again. Narrower or 200%-zoom-equivalent
  container widths place the decision after the worklist in logical DOM order, and the page has no
  two-dimensional workflow scroll.
- Refresh restores the initiating control only when the advisor has not moved elsewhere; late
  results from another selection are discarded.
- The full-review and return links retain visible focus and an operable target.
- Reduced-motion users receive the same state, order, and source evidence without relying on
  animation.

## Workbench Boundaries

Approval Queue deliberately does not:

- certify maker-checker approval from a proposal stage alone,
- calculate suitability, risk, performance, allocation, or mandate conclusions,
- infer client consent, client readiness, publication, order, or execution completion,
- invent client, owner, urgency, SLA, due-date, or whole-book priority facts,
- mutate a proposal when the advisor changes the selected worklist record,
- replace Proposal Detail's source evidence and governed actions,
- establish production identity, role, portfolio entitlement, or unrestricted Proposal access.

## Current-Product Research

The workflow direction was reviewed against official sources on 2026-08-21:

- [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
  describes one identify, construct, deliver, and implement lifecycle with whole-portfolio,
  suitability, narrative, and downstream implementation evidence.
- [Avaloq client management](https://www.avaloq.com/platform/client-management) describes an
  integrated advisor interface that prioritizes proposals and compliance work while sourcing
  client-book facts from core banking.
- [Temenos Wealth Management](https://www.temenos.com/products/wealth-management/) describes
  structured front-office workflows joining profiling, risk, compliance, and performance.
- [W3C listbox guidance](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/),
  [keyboard-interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/),
  and [WCAG 2.2](https://www.w3.org/TR/WCAG22/) informed roving focus, separate focus and selected
  state, predictable focus return, target size, and responsive reflow.

These sources guide workflow principles only. Lotus retains its own contracts, design system,
private-banking vocabulary, access boundaries, and validation evidence.

## Evidence And Validation

- `tests/unit/proposal-lifecycle-workspace-view-model.test.ts` proves source metadata, business
  projection, filtering, bounded-empty wording, and context-preserving proposal links.
- `tests/unit/proposal-approval-evidence-view-model.test.ts` proves empty, approval-exception,
  ready, worklist portfolio/state/version drift, proposal-mismatch, workflow-mismatch,
  active-version-mismatch, incomplete posture, and refresh reconciliation.
- `tests/unit/use-source-refresh-action.test.tsx` proves source completion, compound-query failure,
  background refresh posture, and late-result fencing for the shared refresh lifecycle.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves selected-only reads, worklist
  selection, exact/stale URL identity admission, Enter/Escape focus continuity, approval-register
  truth, stale-worklist and selected-source conflict, restricted/failure states, refresh
  confirmation only after compound agreement, source-window transitions, and shared-rail
  consistency.
- `tests/integration/proposal-detail-view.test.tsx` proves routine return context uses the
  source-owned proposal portfolio rather than trusting the incoming query.
- `tests/e2e/proposal-workflow-context.spec.ts` runs against an optimized production Workbench and
  proves the shared split/stacked composition, URL-backed selection, complete keyboard focus loop,
  context-preserving handoff and return, zero horizontal overflow, and clean browser runtime.
- Canonical runtime validation uses `PB_SG_GLOBAL_BAL_001`; direct browser proof does not promote
  the capability-disabled global Proposal workspace.
- Use [Validation and CI](Validation-and-CI) for protected and exact-main evidence.

## First Support Step

Read the visible source-window and workflow-context posture, then retry one unchanged proposal
window. If the failure persists, record only the portfolio id, proposal id, current view number,
and displayed support reference. Do not copy client details or payloads into support channels, and
do not bypass Gateway or inject browser identity headers.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Advisory Overview](Advisory-Overview-Screen-Guide)
- [Proposal Builder](Proposal-Builder-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Security and Governance](Security-and-Governance)
