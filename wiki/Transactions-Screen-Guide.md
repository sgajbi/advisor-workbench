# Transactions

Transactions is the selected portfolio's booked-activity and settlement-review workspace. It
combines economic events, transaction components, amounts, linkage identifiers, source lineage,
and applicable settlement state in one dense operating view. It is not an order-entry screen, an
OMS, a settlement engine, or confirmation that a booking has reconciled.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/transactions?portfolioId={portfolio_id}` |
| Navigation | **Transactions** in the selected-portfolio rail |
| Supported scope | One source-backed portfolio and a bounded booked-activity window |
| Evidence posture | Deterministic settlement-state proof plus canonical `PB_SG_GLOBAL_BAL_001` runtime coverage |
| Primary next action | Investigate a genuine settlement exception or follow a linked booking group |

Changing the portfolio or date window requests a new Gateway-backed ledger slice. The screen does
not combine clients, households, mandates, or an advisor's whole book into one transaction ledger.

## Business Purpose

Transactions helps advisors, portfolio managers, operations specialists, and support teams answer:

1. What activity was booked for this mandate and over which trade-date window?
2. Which amounts are in transaction currency and which are in portfolio currency?
3. Which entries carry an applicable settlement lifecycle, and which require investigation?
4. Which rows belong to the same economic event, FX contract, swap event, or linked group?

The screen follows an exception-led operating pattern: scope and currency context first, a compact
ledger as the primary working surface, applicable settlement posture beside the row action, and
source evidence alongside the ledger. This makes exceptions visible without hiding normal booked
activity.

## Who Uses This Screen

- **Client advisors and relationship managers** review recent activity before a client meeting and
  answer booking questions without interpreting raw lifecycle codes.
- **Portfolio managers and investment specialists** trace economic events and multi-leg activity
  before opening the owning portfolio or analytical workflow.
- **Operations specialists** focus on reported settlement exceptions and missing applicable status
  without treating ordinary non-settlement events as breaks.
- **Support and product teams** use source, component, linkage, and deterministic browser evidence
  to distinguish a UI defect from a Gateway or source-contract defect.

These are business uses, not production entitlement statements.

## Workflow Position

1. Enter from [Advisor Book](Advisor-Book-Workflow), [Portfolio Review](Portfolio-Review-Screen-Guide),
   or a holding in [Positions](Positions-Screen-Guide).
2. Confirm mandate, client reference, portfolio currency, as-of date, and ledger coverage.
3. Review the visible business state: **Settled**, **Review required**, **Not reported**, or
   **Not applicable**.
4. Filter by activity type, booking component, or trade-date window; search by transaction,
   instrument, or business status.
5. Open a row for lifecycle and linkage evidence, then follow a supported related-group handoff.
6. Export the current ledger projection when a local working extract is needed; use Report Centre
   for governed report generation, archive, and delivery workflows.

## Implemented Capabilities

- Loads a bounded, paged transaction ledger through Gateway for the selected portfolio and window.
- Restores an addressed transaction beyond the loaded ledger page through Gateway's exact-record
  endpoint, binding the request to the selected portfolio, as-of date, reporting currency, and
  non-projected posture. It never scans ledger pages or substitutes a nearby booking.
- Keeps gross transaction-currency amounts distinct from net cost and realized P&L in portfolio
  currency.
- Supports activity-type, booking-component, date, and quick-search refinement.
- Uses one typed settlement projection across grid, summary, evidence rail, detail drawer, and CSV:
  explicit `SETTLED` is **Settled**; any other reported state is **Review required**; absent status
  on an FX cash-settlement component is **Not reported**; other absent lifecycle status is
  **Not applicable**.
- Pins the settlement control beside Review so exception posture remains visible at working widths.
- Opens lifecycle and linkage detail for economic events, linked transaction groups, FX contracts,
  swap events, and near- or far-leg groups when identifiers are source supplied.
- Exports the current projected rows with the same business settlement language as the screen.
- Names loading, empty, partial, failed, and refresh posture without substituting fixture data.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Refine the ledger | Selected portfolio and valid date window | None; Gateway returns a bounded read projection |
| Search or change columns | Loaded ledger rows | None; presentation only |
| Review a transaction | Source-returned row | None; opens current detail evidence |
| Reopen a transaction link | Exact portfolio and transaction identity confirmed by Gateway | None; restores the addressed detail without changing the ledger |
| Follow related activity | Source-supplied linkage identifier | None; narrows the ledger to a linked source group |
| Export transactions | Current projected rows | Local CSV download only |
| Change portfolio | Source-backed portfolio selection | None; Workbench requests the new mandate's ledger |

The screen cannot settle, cancel, amend, approve, reconcile, communicate, route, or execute a
transaction.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio, client reference, currency, and as-of context | Presented from selected context; not inferred from rows | Gateway over Core portfolio contracts |
| Transaction identity, dates, type, instrument, quantities, prices, amounts, and currency | Formatted for review without recalculation | Core booked ledger composed by Gateway |
| Component role and settlement lifecycle | Jointly projected to stable business language; arbitrary raw status is not primary UI | Core transaction component/status contract composed by Gateway |
| Applicable settlement denominator | Includes explicit source status and FX cash-settlement buy/sell components; excludes unrelated missing lifecycle fields | Workbench projection over the documented Gateway/Core joint-field contract |
| Economic-event and linked-group identifiers | Displayed and used only when source supplied | Core lineage records composed by Gateway |
| Evidence rail | Summarizes returned source, settlement, component, and reporting posture | Workbench presentation; not an operational sign-off |
| CSV export | Browser serializes current business rows | Local Workbench action; not a governed report or archive artifact |

Workbench calls Gateway, never Core directly. API detail is centralized in [API Surface](API-Surface)
and ownership flow in [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading or refresh | Existing usable rows remain with an explicit refresh note when applicable | Wait for the bounded Gateway request; do not infer completion |
| Ready | Ledger, controls, row actions, and evidence | Continue the business review |
| Empty | No ledger entries in the selected scope | Check portfolio and window; zero rows are not a settlement sign-off |
| Review required | Reported non-settled or unknown source state | Investigate in the owning settlement/source process; Workbench does not clear it |
| Not reported | Applicable FX cash-settlement component lacks source status | Restore or confirm source lifecycle evidence before relying on settlement posture |
| Not applicable | No reported status and the component does not carry the documented cash-settlement lifecycle | No settlement exception is manufactured for that row |
| Partial evidence | Available rows remain visible while a named source posture needs attention | Use only returned evidence and restore the affected source |
| Ledger unavailable | Explicit unavailable state replaces the ledger | Retry through the governed read path or use the approved support process |
| Addressed transaction not found | The source no longer returns that identity in the selected review context | Clear the transaction review; no substitute booking is opened |
| Addressed transaction restricted | Access to the exact source record is denied | Continue with the permitted ledger and follow the approved access process |
| Addressed evidence inconsistent | Portfolio/transaction identity or required contract evidence does not agree | Do not display the returned record; retry or escalate with the request reference |
| Addressed source unavailable | The exact read cannot reach its source | The ledger stays usable while the addressed detail remains unavailable |

## Workbench Boundaries

Transactions deliberately does not:

- infer settlement success from dates, amounts, component names, or absence of a status,
- mark every nullable status as an exception,
- expose arbitrary source codes as the primary business state,
- calculate cash positions, P&L, FX conversion, settlement obligations, reconciliation, or fails,
- mutate source bookings or create orders, confirmations, communications, or client reports.

The adopted pattern is exception-led lifecycle monitoring with stable business states and explicit
applicability. Industry references from DTCC settlement monitoring, ESMA settlement-fail controls,
and SWIFT settlement status/reason separation support monitoring real lifecycle exceptions rather
than ambiguous nulls. A raw-code blotter, card mosaic, browser-inferred success state, or
all-nullable-fields-are-warnings pattern was rejected because it weakens comparison, source truth,
or operational productivity. Technology certification remains in
[Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support); this guide is not a
claim of bank approval or competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) establishes own-book portfolio selection.
- [Portfolio Review](Portfolio-Review-Screen-Guide) is the daily mandate decision checkpoint.
- [Positions](Positions-Screen-Guide) connects booked positions to recent activity.
- Income And Activity owns income and transaction-activity interpretation.
- Projected Cash Movement owns forward movement projection; Transactions does not derive it.
- Report Centre owns governed report generation, archive, and retrieval.
- External source and settlement operations own booking repair, confirmation, and reconciliation.

## Evidence And Validation

- Pure view-model tests prove case/whitespace normalization, future-state fail-closed behavior,
  applicable missing status, inapplicable missing status, and aggregate priority.
- Grid-helper and drawer tests prove grid, summary, detail, evidence, and CSV use the same business
  state rather than duplicating mapping logic.
- Exact-record tests prove one direct request, strict response parsing, portfolio/transaction
  identity agreement, distinct source failures, and stale-response fencing. The owned browser
  scenario proves page-two selection, direct-link reload, Back/Forward behavior, and focus return
  at desktop and compact widths.
- The owned production-browser matrix proves all four states, raw-code suppression, explicit
  applicable denominator, detail parity, CSV parity, and no page-level overflow at desktop,
  tablet, and narrow widths.
- Browser evidence waits for the exact AG Grid state count before collection; it does not rely on
  sleeps or a race-prone immediate read.
- Canonical front-office validation remains anchored to `PB_SG_GLOBAL_BAL_001`; deliberately
  missing and future states use a deterministic negative-state fixture.
- Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
  protected PR and exact-main validation sequence.

## First Support Step

Confirm the selected portfolio, trade-date window, transaction id, component role, and displayed
business settlement state. Retry one governed Gateway read. If the state persists, record the
approved support reference and owning source without copying client payloads into an unapproved
channel. Do not replace **Not reported** with **Settled**, call Core directly, or change the booking
from Workbench.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Positions](Positions-Screen-Guide)
- [Portfolio Review Workflow](Portfolio-Review-Workflow)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
