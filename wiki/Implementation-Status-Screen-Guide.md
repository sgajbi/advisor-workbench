# Implementation Status

Implementation Status is the advisor's portfolio-scoped follow-up desk for proposals ready to
enter, or already moving through, an implementation handoff. It combines one bounded proposal
worklist with source-confirmed handoff posture for one selected proposal. It does not turn the
browser into an order-management or settlement system.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals?portfolioId={portfolio_id}&mode=implementation` |
| Navigation | Direct bounded route; the global **Proposal** workspace remains capability-disabled |
| Worklist scope | Handoff, completion, and exception proposals in one cursor-bounded Gateway source window |
| Evidence scope | One selected proposal and one `proposal-implementation-status.v1` read |
| Screen authority | Read-only implementation monitoring and exception follow-up |

The screen never claims a whole-book total. Its **In view** measure covers only the returned source
window. It makes no production identity or entitlement claim.

## Business Purpose

The screen helps an advisor answer four questions in order: which proposal needs attention, what is
its current implementation status, does that status relate to the proposal version being reviewed,
and what should happen next? The selected decision stays beside the bounded worklist so routine
monitoring and material-difficulty follow-up do not require opening every full proposal record.

## Who Uses This Screen

- **Client advisors and relationship managers** monitor handoff acceptance and follow exceptions.
- **Portfolio and investment specialists** verify which proposal version the handoff references.
- **Operations and implementation partners** use source references to reconcile the handoff with
  the owning execution provider.
- **Support teams** use proposal identity, observation time, and correlation evidence to locate a
  failed or inconsistent source read.

These roles describe business use. They do not create browser-owned roles or entitlements.

## Workflow Position

1. A governed proposal reaches implementation handoff after its prior review and client-consent gates.
2. Implementation Status lists matching proposals in the current Gateway window.
3. The advisor selects one proposal; Workbench reads implementation status only for that record.
4. Workbench reconciles proposal, portfolio, lifecycle state, and current version before showing
   the implementation status.
5. The advisor sees business status, version relationship, latest update, and next action first;
   provider and correlation values remain in optional support detail.
6. The advisor monitors a pending handoff, investigates an exception, or confirms that this source
   reports implementation complete.
7. **Open full proposal record** preserves portfolio and Implementation origin context for governed
   proposal or handoff actions.

## Implemented Capabilities

- Retains `EXECUTION_READY`, `EXECUTED`, `REJECTED`, `CANCELLED`, and `EXPIRED` proposals from the
  cursor-bounded Gateway source window so completed and exception follow-up does not disappear.
- Uses the shared keyboard-operable proposal worklist and selected-record decision pattern.
- Uses one typed copy authority for every supported handoff, next-action, version, event, evidence,
  loading, failure, and recovery state; unknown states fail closed instead of becoming generic
  productive language.
- Performs one selected-record implementation-status read; it never fans out across the worklist.
- Distinguishes handoff not requested, requested, accepted, partially implemented, reported
  complete, rejected, cancelled, and expired.
- Shows source observation time and whether it comes from the latest implementation event or latest
  proposal event; v1 invents no freshness threshold.
- Distinguishes current-version, earlier-version, and uncorrelated evidence.
- Keeps missing request, request time, provider, version, or event references explicitly partial.
- Lets the advisor recheck an unversioned proposal in place; evidence remains withheld until the
  refreshed worklist supplies a version that can be correlated safely, then focus returns to the
  same proposal's newly mounted evidence-refresh control.
- Leads with implementation status, requested and latest-update times, proposal-version
  relationship, and next business action.
- Keeps the latest event, provider, request, contract, correlation, downstream, and reason values in
  **Implementation support details** so business users are not asked to interpret system topology.
- Preserves visible confirmed evidence when a refresh fails, without relabelling it current.
- Announces success only after the worklist and selected evidence both refresh and still identify
  the same proposal, portfolio, version, and lifecycle state.
- Keeps the refresh action, status announcement, and shared workflow rail in the same pending or
  failed posture for the complete worklist-plus-detail transaction, including version changes.
- Discards a late refresh transaction when a newer refresh, selection, portfolio, or source window
  has superseded it, so an older worklist cannot replace newer selected evidence.
- Uses the shared supplementary-context posture because the selected-record panel already owns the
  decision; only the source-coverage boundary remains in the rail instead of repeating status,
  version, timestamps, counts, and next action.
- Uses selected-pane container queries, rather than viewport guesses, to reflow facts and actions
  when the three-rail workstation gives the panel limited inline space.
- Reflows worklist before evidence at compact and 200%-zoom-equivalent widths without visible page
  or panel overflow.

## Decisions And Actions

| Decision or action | Required evidence | Persisted change |
| --- | --- | --- |
| Select a proposal | Proposal is in the current source window | None; changes browser selection only |
| Interpret handoff posture | Selected identity and contract semantics reconcile | None; read-only evidence |
| Refresh implementation evidence | Current worklist plus exact selected status read both succeed and reconcile | None; replaces confirmed evidence |
| Follow an exception | Source status requires attention | None in this screen; coordinate through the governed owning workflow |
| Open full proposal record | Selected proposal and preserved route context | None; navigates to the governed record |

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Proposal identity, state, and current version | Parsed from the bounded proposal-list contract | Gateway over Advise |
| Handoff status and supporting references | Validated and translated into business copy | Advise handoff/reconciliation through Gateway |
| Status family and next action | Presentation classification over preserved source status | Gateway contract, presented by Workbench |
| Execution provider | Named source reference; not a verified owner or user identity | Advise handoff evidence |
| Execution system of record | Displayed as an ownership boundary | Named downstream execution provider |
| Observation time and latest event | Displayed without an invented ageing threshold | Advise source evidence through Gateway |
| Order, fill, allocation, settlement, custody, and accounting detail | Explicitly unavailable and never inferred | Not supported by v1; remains downstream-owned |

See [API Surface](API-Surface) and [Integrations](Integrations) for shared contract detail.

## Screen States And Recovery

| State | User-visible posture | Recovery |
| --- | --- | --- |
| Loading | Exact selected handoff evidence is being checked | Wait; lifecycle state is not substituted |
| Ready | Source-confirmed handoff, version, currentness, references, and next action | Review or open the full proposal |
| Partial | Handoff status remains visible, but missing source references are named | Confirm the missing evidence with the owning workflow |
| Earlier version | Handoff evidence is visibly tied to a prior proposal version | Do not assume the current version is implemented |
| Proposal version unavailable | Detail evidence is withheld because it cannot be correlated safely | Recheck the proposal version in place; do not reload or infer status |
| Not requested | Request, provider, downstream, version, time, and event references must be absent; no execution progress is inferred | Request handoff only through the governed full record |
| Refreshing | Prior confirmed evidence remains visible under its prior context | Wait for both reads to reconcile |
| Refresh failed | Prior evidence remains visible but is not relabelled current | Retry the same selected evidence |
| Restricted | Handoff evidence is hidden and no retry bypass is offered | Use the bank's access process |
| Unavailable | No handoff status is inferred from lifecycle stage | Retry when Gateway or the source recovers |

## Workbench Boundaries

Workbench validates and presents evidence; it does not mutate implementation state here. Advise
owns the advisory handoff and reconciliation record. The named downstream provider remains the
execution system of record. `external_execution_id` is a downstream reference, not an order, fill,
or settlement record. `order_fill_settlement_detail` is explicitly `not_supported` in v1.

**Implementation reported complete** means this source contract reports the handoff complete. It
does not prove fill completeness, settlement, reconciliation, custody booking, or accounting
completion. Workbench does not invent owner, assignee, SLA, due date, urgency, or priority.

## Adjacent Handoffs

| Direction | Workspace | Preserved context |
| --- | --- | --- |
| Inbound | Approval Queue, Risk and Impact, or Proposal Detail | Selected portfolio and governed proposal identity |
| Detail | Proposal Detail through **Open full proposal record** | Proposal, portfolio, and Implementation origin |
| Return | Implementation Status through the governed detail return link | Source proposal portfolio and Implementation mode |
| Operational | Named execution provider | Reference only; no direct browser-to-provider call |

## Responsive And Accessible Use

- The worklist implements visible single selection and Up/Down/Home/End keyboard movement.
- Selection precedes evidence in document and focus order.
- Worklist and decision pane remain simultaneous at wide desktop widths and stack without overlap at
  1280, 1024, 720, 519, and 390 pixels.
- Refresh status is programmatically announced and restores the initiating control only when focus
  has not deliberately moved.
- The implementation decision is not repeated in a lower-priority responsive rail; source scope is
  retained once after the main workflow.
- Raw provider, request, contract, event, correlation, downstream, and reason identifiers stay in a
  keyboard-operable disclosure and remain secondary to business decisions.

## Current-Product Research

- [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
  informed the explicit proposal-to-implementation handoff.
- [Salesforce Financial Services action plans](https://help.salesforce.com/s/articleView?id=sf.fsc_admin_action_plans_overview.htm&language=en_US&type=5)
  informed explicit task status while reinforcing that owner and deadline cannot be invented.
- [FIX Trading Community](https://fixtrading.org/standards/fix-protocol/) informed the separation of
  execution-report truth from proposal lifecycle status.
- [Swift settlement and reconciliation](https://www.swift.com/securities/settlement-and-reconciliation)
  informed the separate downstream settlement boundary.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) informed reflow, focus, target, and status evidence.
- [FCA COBS 11.3.2A](https://handbook.fca.org.uk/handbook/COBS/11/3.html) informed the requirement to
  surface material implementation difficulty without claiming unsupported execution detail.
- [FCA COBS 11.2A](https://handbook.fca.org.uk/handbook/COBS/11/2A.html) informed the clear
  client-interest boundary around implementation decisions.
- [FINRA 2024 Regulation Best Interest and Form CRS report](https://www.finra.org/rules-guidance/guidance/reports/2024-finra-annual-regulatory-oversight-report/reg-bi-form-crs)
  reinforced accurate record, recommendation, and disclosure language without turning an internal
  handoff screen into an approval or execution claim.

These sources guide workflow principles. They are not a claim of bank approval or competitor
superiority.

## Evidence And Validation

- `tests/unit/proposal-implementation-status-contract.test.ts` proves identity, status semantics,
  version, capability, freshness, and lineage fail-closed behavior.
- `tests/unit/proposal-implementation-status-view-model.test.ts` proves business language,
  earlier-version warning, partial evidence, and non-ownership boundaries.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves selected-only reads, no N+1,
  permission and partial states, context-preserving detail, atomic refresh confirmation,
  superseded-transaction fencing, unversioned-proposal recovery, and non-duplicated supplementary
  context.
- `tests/e2e/proposal-workflow-context.spec.ts` proves optimized-production rendering, Gateway/BFF
  use, focus-stable refresh, 1440/1280/1024/720/519/390 reflow, exact visible-overflow diagnostics,
  and review-image generation.
- [Rendered desktop and compact evidence](https://github.com/sgajbi/lotus-workbench/tree/main/docs/evidence/issue-798-product-copy/implementation-follow-up)
  is generated by the same optimized-production browser journey.
- Canonical runtime uses `PB_SG_GLOBAL_BAL_001`; route screenshots alone are not source proof.

## First Support Step

Read the visible proposal id, version-evidence label, observation time, and evidence correlation,
then retry the unchanged selection once. If the failure persists, record those bounded references
and the displayed source state. Do not copy client data or raw payloads into support channels, call
Advise directly from the browser, or bypass Gateway.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Approval Queue](Approval-Queue-Screen-Guide)
- [Proposal Detail](Proposal-Detail-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
