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
| Evidence posture | Gateway-backed Advise proposal summaries; detailed approval and evidence posture remains in Proposal Detail |
| Primary next action | Select a proposal, understand its source stage, then open the full review |

The number shown is **in this view**, not a whole book, client, household, or global approval-queue
total. A visible lifecycle stage does not itself prove suitability, approval, client consent,
publication, execution, or production entitlement.

## Business Purpose

Approval Queue helps an advisor answer four questions without opening every proposal:

1. Which proposals are present in the current source window?
2. Which visible proposal is not yet ready for downstream handoff?
3. What source stage, version, recorded date, posture, and next action belong to the selected item?
4. Which full proposal record must be opened to verify approvals and supporting evidence?

At wide desktop widths the worklist and selected proposal remain visible together. The worklist
stacks before the decision pane on tablet, narrow, and zoomed layouts so selection always precedes
the evidence and action handoff in document and keyboard order.

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
3. Review the visible **In view** and **Need action** measures.
4. Move through proposals with pointer or Up/Down/Home/End keys.
5. Read the selected proposal's source stage, readiness, version, recorded date, current posture,
   and next business action.
6. Select **Open proposal review** to inspect source-owned changes, impact, review gates,
   approvals, lineage, narrative, memo, and permitted actions.
7. Use **Return to Approval Queue** to restore the originating portfolio and worklist context.
8. Continue through later lifecycle modes only when their own source evidence supports that task.

## Adjacent Handoffs

| Direction | Adjacent workspace | Context preserved |
| --- | --- | --- |
| Inbound | Advisor Book, Advisory Overview, or Proposal Builder | Selected portfolio |
| Outbound | Proposal Detail through **Open proposal review** | Selected proposal, portfolio, and Approval Queue origin |
| Return | Approval Queue through **Return to Approval Queue** | Source proposal portfolio where available and Approval Queue mode |
| Later lifecycle | Suitability, Risk and Impact, Discussion Pack, or Implementation | Portfolio only; each workspace must prove its own source-backed decision evidence |

## Implemented Capabilities

- Reads proposal summaries only through the Workbench BFF and Gateway.
- Keeps proposal count and attention posture explicitly scoped to the current source window.
- Provides previous and next source-window navigation without claiming global completeness.
- Shows a keyboard-operable single-record worklist with visible selected state.
- Presents source-supported proposal title, identity, lifecycle stage, derived readiness, active
  version, recorded date, posture, and next action where supplied.
- Keeps the selected decision pane beside the worklist at desktop and after it at compact widths.
- Preserves portfolio and originating lifecycle mode when entering Proposal Detail.
- Uses the portfolio returned by Proposal Detail as the authority for the routine return path;
  route context does not replace source proposal identity.
- Keeps approval and evidence actions out of the summary queue.
- Preserves explicit loading, empty, partial-window, refreshing, refresh-failure, restricted, and
  unavailable states.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Select a proposal | Proposal is present in the current source window | None; changes the visible decision context only |
| Move to next or previous proposal window | Source supplies a cursor or a prior window is retained | None; reads another bounded Gateway window |
| Build Proposal | Selected portfolio context | Opens Proposal Builder; nothing is approved or executed |
| Open proposal review | Selected proposal identity and supported detail route | None; opens the full source-backed review record |
| Return to Approval Queue | Source proposal portfolio where available, otherwise bounded route context | None; restores the originating queue route |

## Information And Source Authority

| Business fact | Workbench presentation | Source authority |
| --- | --- | --- |
| Proposal, portfolio, lifecycle state, version, creator, and recorded time | Parsed from the proposal-list contract; creator is not exposed as a human identity without directory evidence | Gateway over Advise proposal lifecycle |
| Stage, readiness, posture, and next action | Bounded business copy derived from the source lifecycle state | Workbench presentation over the source state |
| In-view and attention counts | Count only rows in the current source window | Workbench view model over Gateway rows |
| More or earlier proposals | Shown only from source cursor and retained window history | Gateway cursor plus Workbench navigation history |
| Selected proposal | Advisor's current browser selection within the returned window | Workbench interaction state; not a source mutation |
| Detailed changes, allocation impact, approvals, workflow, lineage, narrative, memo, and actions | Available only after opening Proposal Detail | Gateway over Advise detail and evidence contracts |

The queue does not receive client name, household, assignee, due date, SLA, urgency, materiality,
whole-book count, or global sort authority. Workbench does not invent them.

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Proposal posture is being retrieved | Wait; no fallback proposal claims are shown |
| Ready | Current-window measures, worklist, selected decision, and source posture | Review and open the relevant proposal |
| Empty current window | No matching proposals, with explicit adjacent-window guidance where applicable | Move to the next or previous source window or build a draft |
| Partial source window | The visible count remains bounded and more/earlier proposals are disclosed | Continue window navigation before concluding the queue is clear |
| Refreshing | Earlier confirmed rows remain readable but are not labelled current | Wait for source settlement before relying on posture |
| Refresh failed | Earlier rows remain with an explicit unconfirmed warning | Retry the same source view; do not infer new status |
| Restricted | Proposal details are hidden by the source access boundary | Use an entitled portfolio or the bank's access process |
| Unavailable | No fallback queue or readiness values are shown | Retry after the source recovers |

## Responsive And Accessible Use

- The worklist is a labelled single-selection control with visible focus and selected state.
- Up/Down keys move between proposals; Home and End move to the first and last enabled proposal.
- Selection changes are announced without moving focus to the decision pane.
- At wide desktop widths, worklist and selected decision are simultaneous.
- At tablet, narrow, and 200%-zoom-equivalent widths, the decision pane follows the worklist in
  logical DOM order and the page has no two-dimensional workflow scroll.
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
- [W3C table and grid guidance](https://www.w3.org/WAI/ARIA/apg/patterns/table/) and
  [WCAG 2.2](https://www.w3.org/TR/WCAG22/) informed native semantics, managed selection, focus
  order, status evidence, target size, and responsive reflow.

These sources guide workflow principles only. Lotus retains its own contracts, design system,
private-banking vocabulary, access boundaries, and validation evidence.

## Evidence And Validation

- `tests/unit/proposal-lifecycle-workspace-view-model.test.ts` proves source metadata, business
  projection, filtering, bounded-empty wording, and context-preserving proposal links.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves worklist selection, keyboard
  focus, selected decision evidence, source-window transitions, and fail-closed states.
- `tests/integration/proposal-detail-view.test.tsx` proves routine return context uses the
  source-owned proposal portfolio rather than trusting the incoming query.
- `tests/e2e/proposal-workflow-context.spec.ts` runs against an optimized production Workbench and
  proves the split desktop desk, stacked compact flow, keyboard selection, context-preserving
  handoff, zero horizontal overflow, and clean browser runtime.
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
