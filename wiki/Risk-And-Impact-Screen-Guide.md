# Risk and Impact

Risk and Impact is the advisor's proposal comparison desk for understanding how one retained
proposal could change a selected portfolio before the proposal advances. It keeps the proposal
worklist, selected decision record, current-versus-proposed allocation evidence, risk observations,
workflow gates, and source limitations together without turning analysis into approval or advice.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals?portfolioId={portfolio_id}&mode=risk-impact` |
| Navigation | Direct bounded route; the global **Proposal** workspace remains capability-disabled |
| Supported scope | One selected portfolio, one cursor-bounded `RISK_REVIEW` proposal window, and one selected proposal evidence record |
| Evidence posture | Gateway `proposal-risk-impact.v1` projection over source-owned proposal, allocation, risk, gate, capability, and lineage evidence |
| Primary next action | Resolve material exceptions or open the full proposal review with portfolio and lifecycle context preserved |

The counts are **in this view**, not whole-book, household, client, or global workflow totals. The
overall evidence state describes supportability of the comparison; it is not suitability approval,
client consent, publication readiness, an instruction, or execution authority.

## Business Purpose

Risk and Impact helps an advisor answer five questions at the point of work:

1. Which proposals in the current source window are awaiting risk review?
2. What changes between the current and proposed portfolio allocation?
3. Which source-published risk observations require discussion or specialist review?
4. Which workflow gates or evidence limitations prevent the proposal from advancing safely?
5. Which full proposal record should be opened for governed review and action?

At wide desktop widths, the worklist and selected evidence remain visible together. The screen
uses progressive disclosure for capability and lineage detail so decision evidence leads while
technical support information remains available without dominating the advisor workflow.

## Who Uses This Screen

- **Client advisors and relationship managers** compare the current portfolio with the proposed
  outcome and prepare a clear, evidence-backed client discussion.
- **Portfolio and investment specialists** inspect source allocation changes and risk observations
  before supporting the proposal review.
- **Risk, compliance, and supervisory reviewers** identify unresolved evidence and workflow gates;
  their decisions remain in the owning source workflow.
- **Operations and support teams** use proposal identity, contract version, correlation reference,
  capability posture, and lineage to diagnose source issues without reconstructing analytics in the
  browser.

These roles describe business use, not authenticated production entitlement.

## Workflow Position

1. Enter from the selected portfolio's proposal lifecycle and confirm the portfolio scope.
2. Review the bounded **In view** and **Need attention** measures.
3. Move through proposals with pointer or Up/Down/Home/End keys.
4. Confirm the selected proposal identity, version, source stage, and evidence posture.
5. Compare current and proposed allocation values in the source-selected dimension.
6. Review risk observations, workflow gates, open exceptions, capability limitations, and lineage.
7. Retry or refresh the exact selected source record when evidence is unavailable or stale.
8. Select **Open proposal review** to continue with the full proposal evidence and action record.

Selection changes the visible browser context only. It does not mutate a proposal, record a risk
decision, clear a gate, approve suitability, or create an order.

## Adjacent Handoffs

| Direction | Adjacent workspace | Context preserved |
| --- | --- | --- |
| Inbound | Approval Queue, Suitability review, or another proposal lifecycle mode | Selected portfolio and bounded lifecycle context |
| Outbound | Proposal Detail through **Open proposal review** | Selected proposal, portfolio, and Risk and Impact origin |
| Return | Risk and Impact from Proposal Detail | Source proposal portfolio and originating lifecycle mode |
| Specialist review | Owning risk, allocation, policy, or workflow service | Source identity and support reference; no browser-created decision |

## Implemented Capabilities

- Requests only `RISK_REVIEW` proposal rows from the Gateway list contract.
- Keeps counts and attention posture bounded to the returned source window.
- Uses one reusable, keyboard-operable lifecycle worklist and one selected evidence record.
- Validates the full risk-impact contract, proposal identity, portfolio identity, selected proposal
  version, decimal transport, vocabulary, capability registry, and duplicate identifiers before
  rendering evidence.
- Keeps exact current and proposed allocation values separate and aligns only their display rows.
- Names expected allocation dimensions that are absent from a partial source response before showing
  the available comparisons.
- Presents risk observations, workflow gates, exceptions, limitations, capability posture, and
  lineage without promoting them into browser-authored conclusions.
- Preserves selection identity, refresh focus, and proposal-detail route context.
- Uses container-aware, worklist-first reflow without a second horizontal workflow axis.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Select a proposal | Proposal is present in the current source window | None; changes the visible decision context only |
| Change allocation dimension | Dimension is supplied by the selected source record | None; changes the comparison view only |
| Refresh selected evidence | Valid selected proposal and portfolio identity | None; replaces evidence only after matching source success |
| Retry failed evidence | Recoverable Gateway/source failure | None; repeats the exact selected-record query |
| Open proposal review | Valid selected proposal and portfolio context | None; opens the full source-backed record |

## Information And Source Authority

| Business fact | Workbench presentation | Source authority |
| --- | --- | --- |
| Proposal worklist, portfolio, lifecycle state, version, creator, and recorded time | Parsed from the cursor-bounded proposal-list contract using server-side `RISK_REVIEW` filtering | Gateway over Advise proposal lifecycle |
| Current and proposed allocation | Exact source decimal strings aligned by dimension member; missing sides remain explicitly unavailable | Gateway projection composing Advise proposal evidence with Core allocation authority or a bounded Advise fallback declared by the source |
| Risk observations and supportability | Source-provided summary and highlights, section supportability, and named source | Gateway over the risk authority named in the response, normally Lotus Risk |
| Workflow gates | Source gate state, coded reasons with severity and source, and recommended next step | Gateway over Advise workflow authority |
| Capability and lineage evidence | Contract support, provenance, fallback, correlation, and source references | Gateway projection over Advise, Core, and Risk evidence |
| Visual allocation bars | Relative display aid within the returned allocation set | Workbench presentation only; exact source values remain authoritative |

The browser calls Gateway only through
`/api/bff/api/v1/proposals/{proposal_id}/risk-impact`. The Gateway contract does not accept a
portfolio query parameter; Workbench instead requires the source-returned portfolio identity to
match the advisor's selected portfolio before it renders evidence. It requests one selected record
and never fans out risk-impact reads across the whole worklist. Workbench does not calculate risk,
allocation delta, mandate compliance, suitability, recommendation priority, or a portfolio-level
conclusion.

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Selected proposal evidence is being retrieved | Wait; no fallback figures or conclusions are shown |
| Ready | Exact allocation comparison, risk observations, gates, and source posture | Review exceptions and continue to Proposal Detail when appropriate |
| Partial | Available evidence remains visible beside explicit missing or unsupported capability statements | Resolve the named source limitation before relying on the missing decision dimension |
| Decision unavailable | Decision status, blocker count, and exception-register completeness remain explicitly unconfirmed | Restore the source decision record; do not interpret an empty array as zero blockers |
| Empty evidence | Source confirms no usable allocation or risk evidence for the selected record | Open Proposal Detail or engage the named source owner; do not infer no impact |
| Refreshing | Earlier evidence remains readable and is clearly awaiting source confirmation | Wait; duplicate refresh is fenced |
| Refresh failed | Earlier evidence remains with an explicit unconfirmed warning | Retry the same selected proposal; focus remains on the refresh control |
| Restricted | Source evidence is withheld and no retry is offered | Use an entitled portfolio or the bank's access process |
| Unavailable or invalid | No fabricated comparison, risk posture, or workflow conclusion appears | Retry after the owning source or contract issue is resolved |

An unsupported benchmark, mandate-limit comparison, scenario analysis, or valuation-as-of fact is
shown as a limitation. It is never silently replaced with a local assumption.

## Responsive And Accessible Use

- The worklist is a labelled single-selection control with visible focus and selected state.
- Up/Down keys move between proposals; Home and End move to the first and last enabled proposal.
- Selection is announced without moving focus into the evidence pane.
- Refresh and retry keep a stable control target and announce pending, failure, and source-confirmed
  replacement states.
- At wide desktop widths the worklist and evidence pane are simultaneous; at tablet, compact, and
  200%-zoom-equivalent widths the evidence follows the worklist in DOM and keyboard order.
- Container-aware reflow responds to the actual centre workspace and selected evidence pane beside
  the portfolio and workflow rails, with no viewport-coupled module breakpoint and no page-level
  horizontal overflow.
- Exact values do not depend on colour or bar length, and controls retain a bank-operable target.

## Workbench Boundaries

Risk and Impact deliberately does not:

- calculate risk, allocation change, benchmark comparison, suitability, or mandate compliance,
- turn a source risk observation into a breach, all-clear, recommendation, or approval,
- treat a workflow gate as proof that approval, consent, disclosure, or publication occurred,
- invent client, household, owner, SLA, urgency, materiality, limit, or whole-book priority facts,
- fan out selected-detail reads across every proposal in the worklist,
- hide missing benchmark, limit, scenario, valuation-date, capability, or lineage evidence,
- call Advise, Core, or Risk directly from the browser,
- establish production identity, entitlement, or global Proposal navigation support.

## Current-Product Research

The workflow direction was reviewed against official sources on 2026-08-21:

- [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
  informed the connected identify, construct, deliver, and implement lifecycle and whole-portfolio
  before-and-after comparison.
- [BlackRock Aladdin Risk and regulatory technology](https://www.blackrock.com/aladdin/products/aladdin-risk)
  informed integrated risk evidence, governance, and source transparency at the decision point.
- [Avaloq client management](https://www.avaloq.com/platform/client-management) informed the
  advisor worklist and integrated client-investment workflow rather than isolated stage pages.
- [Temenos Wealth Management](https://www.temenos.com/products/wealth-management/) informed the
  private-banking flow joining profiling, portfolio construction, risk, compliance, and review.
- [Salesforce Financial Services Cloud Action Plans](https://help.salesforce.com/s/articleView?id=ind.fsc_action_plans.htm&type=5)
  informed explicit next actions and reusable workflow patterns.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) informed keyboard access, focus visibility, target size,
  status communication, reading order, and responsive reflow.

Lotus adopts integrated decision flow, exact before-and-after evidence, exception-first attention,
action continuity, and progressive disclosure. It rejects decorative stage pages, gauge or heatmap
walls without decision authority, invented business facts, optimistic status, CSS-only content
reordering, and partial ARIA-grid behavior. This research is design input, not a claim of bank
approval or competitor superiority.

## Evidence And Validation

- `tests/unit/proposal-risk-impact-contract.test.ts` proves fail-closed identity, decimal,
  vocabulary, capability-registry, and contract-version parsing.
- `tests/unit/proposal-risk-impact-view-model.test.ts` proves business copy, exact-value formatting,
  current/proposed alignment, exception posture, and source boundaries.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves selected-only retrieval, no N+1
  fan-out, keyboard selection, identity fencing, refresh/retry, permission, failure, and business
  evidence rendering.
- `tests/e2e/proposal-workflow-context.spec.ts` runs against an optimized production Workbench and
  proves keyboard selection, selected-record retrieval, stable refresh focus, context-preserving
  drill-in, simultaneous desktop evidence, compact reflow, zero horizontal overflow, and a clean
  browser runtime.
- Canonical `PB_SG_GLOBAL_BAL_001` evidence remains a separate promotion gate; direct browser proof
  does not enable the capability-disabled global Proposal workspace.

## First Support Step

Confirm the visible portfolio and proposal identity, then retry the unchanged selected proposal
once. If the failure persists, record the proposal id, portfolio id, selected version, contract
version, correlation ID, source owner, and the separately labelled decision, workflow-gate, or
capability support reference. Do not copy client data or full payloads into support channels,
bypass Gateway, or inject browser identity headers.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Approval Queue](Approval-Queue-Screen-Guide)
- [Proposal Builder](Proposal-Builder-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Security and Governance](Security-and-Governance)
