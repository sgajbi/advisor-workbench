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
| Screen authority | Read-only handoff review and exception follow-up |

The screen never claims a whole-book total. Its **In view** measure covers only the returned source
window. It makes no production identity or entitlement claim.

## Business Purpose

The screen helps an advisor answer: what is the latest source-confirmed implementation handoff
posture, which exception needs follow-up, does the evidence relate to the current proposal version,
and when was the status last observed? It keeps these facts beside the selected proposal so the
advisor does not have to open each full record for routine follow-up.

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
   handoff evidence.
5. The advisor monitors a pending handoff, investigates an exception, or confirms that this source
   reports implementation complete.
6. **Open full proposal record** preserves portfolio and Implementation origin context for governed
   proposal or handoff actions.

## Implemented Capabilities

- Retains `EXECUTION_READY`, `EXECUTED`, `REJECTED`, `CANCELLED`, and `EXPIRED` proposals from the
  cursor-bounded Gateway source window so completed and exception follow-up does not disappear.
- Uses the shared keyboard-operable proposal worklist and selected-record decision pattern.
- Performs one selected-record implementation-status read; it never fans out across the worklist.
- Distinguishes handoff not requested, requested, accepted, partially implemented, reported
  complete, rejected, cancelled, and expired.
- Shows source observation time and whether it comes from the latest implementation event or latest
  proposal event; v1 invents no freshness threshold.
- Distinguishes current-version, earlier-version, and uncorrelated evidence.
- Keeps missing request, provider, version, or event references explicitly partial.
- Shows the latest source event and correlation evidence in progressive disclosure.
- Preserves visible confirmed evidence when a refresh fails, without relabelling it current.
- Announces success only after the worklist and selected evidence both refresh and still identify
  the same proposal, portfolio, version, and lifecycle state.
- Reflows worklist before evidence at compact and 200%-zoom-equivalent widths without page overflow.

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
| Not requested | No handoff reference is expected and no execution progress is inferred | Request handoff only through the governed full record |
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
  1280, 1024, 720, and 390 pixels.
- Refresh status is programmatically announced and restores the initiating control only when focus
  has not deliberately moved.
- Raw provider, request, event, and correlation identifiers stay secondary to business decisions.

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

These sources guide workflow principles. They are not a claim of bank approval or competitor
superiority.

## Evidence And Validation

- `tests/unit/proposal-implementation-status-contract.test.ts` proves identity, status semantics,
  version, capability, freshness, and lineage fail-closed behavior.
- `tests/unit/proposal-implementation-status-view-model.test.ts` proves business language,
  earlier-version warning, partial evidence, and non-ownership boundaries.
- `tests/integration/proposal-lifecycle-workspace.test.tsx` proves selected-only reads, no N+1,
  permission and partial states, context-preserving detail, and atomic refresh confirmation.
- `tests/e2e/proposal-workflow-context.spec.ts` proves optimized-production rendering, Gateway/BFF
  use, focus-stable refresh, 1440/1280/1024/720/390 reflow, and zero horizontal overflow.
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
