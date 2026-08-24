# Positions

Positions is the selected portfolio's booked inventory and holding-review workspace. It brings
securities, cash balances, valuation, cost, weight, position-status evidence, and recent activity
into one dense record view. It is not a trading blotter, valuation engine, reconciliation sign-off,
or investment recommendation.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/positions?portfolioId={portfolio_id}` |
| Navigation | **Positions** in the selected-portfolio rail |
| Supported scope | One source-backed portfolio and its booked security and cash inventory |
| Evidence posture | Deterministic state-matrix tests plus canonical `PB_SG_GLOBAL_BAL_001` runtime coverage |
| Primary next action | Review holdings needing attention, then open the owning Transactions or Portfolio Review workflow |

The screen uses the shared portfolio context. Changing the portfolio re-requests the selected
portfolio's source records; it does not combine holdings across clients, households, mandates, or
the advisor's whole book.

## Business Purpose

Positions helps a client advisor, portfolio manager, or investment specialist answer four daily
questions quickly:

1. What is currently booked in this mandate, including source-returned cash balances?
2. Which holdings contribute the portfolio value, cost, weight, and unrealized result?
3. Which valuation or source-status evidence is incomplete or requires review?
4. What recent booked activity explains a selected holding?

The information hierarchy follows a whole-portfolio review pattern: portfolio and date context
first, compact measures second, the sortable inventory as the working surface, and source evidence
alongside it. This supports exception-led review without hiding the full book.

## Who Uses This Screen

- **Client advisors and relationship managers** use it to prepare portfolio reviews and answer
  holding-level client questions from the selected mandate's booked evidence.
- **Portfolio managers and investment specialists** use it to inspect exposure, valuation, cost,
  holding status, and recent activity before opening the relevant analytical or operating workflow.
- **Operations and support teams** use the explicit pricing, inventory, reporting, and position
  status posture to identify which source evidence needs investigation.
- **Product and demonstration teams** use the canonical route and browser proof to verify that the
  visible inventory is Gateway-backed rather than a browser fixture.

These roles describe business use, not production entitlement. Authenticated principal and
portfolio-entitlement work remains governed separately.

## Workflow Position

1. Start from [Advisor Book](Advisor-Book-Workflow) or [Portfolio Review](Portfolio-Review-Screen-Guide)
   with a selected portfolio.
2. Confirm the mandate, client reference, currency, and as-of date before interpreting figures.
3. Use portfolio value, invested value, and cash to orient the inventory; these measures remain source-owned
   portfolio facts rather than totals recalculated from the visible grid.
4. Search by instrument, choose the business columns needed for the review, and inspect explicit
   **Current**, **Review required**, **Not reported**, or **Not applicable** status.
5. Select a holding to review overview, valuation, and recent booked activity without leaving the
   inventory.
6. Open Transactions for a broader activity investigation, Allocation for exposure analysis, or
   Portfolio Review to return to the daily decision checkpoint.

## Implemented Capabilities

- Presents booked securities and source-returned cash balances in one searchable, sortable,
  keyboard-operable data grid.
- Shows instrument, asset class, quantity, price, market value, cost basis, weight, unrealized P&L,
  currency, business status, sector, held-since date, and ISIN when the source supplies them.
- Keeps essential columns visible by default and supports an expanded or user-chosen column set
  without changing source data.
- Uses one fail-closed position-state projection across the grid, CSV export, and evidence rail:
  only an explicit source `CURRENT` state is shown as **Current**; another reported state becomes
  **Review required**; an absent state becomes **Not reported**; and a synthesized cash-balance row
  is **Not applicable**.
- Shows incomplete price or valuation evidence without dropping the holdings that remain usable.
- Opens a holding drawer with overview, valuation, and recent activity tabs plus a supported handoff
  to the Transactions screen.
- Exports the current visible business column policy to a local CSV. Export preserves the same
  business status semantics as the grid.
- Keeps the complete or partial inventory posture explicit when security, liquidity, or recent
  activity detail is unavailable.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Search holdings | A loaded booked inventory | None; this filters the current grid only |
| Choose or expand columns | A loaded grid | None; this changes presentation only |
| Review a holding | Select a visible booked security or cash balance | None; the detail drawer opens over current source evidence |
| Export holdings | Current rows and visible-column policy | A local CSV download only |
| Open Transactions | A selected portfolio; a selected holding is optional | None on Positions; the user enters the booked-activity workflow |
| Change portfolio | Select source-backed portfolio context through the shared switcher | None; Workbench re-requests the newly selected portfolio |

Positions has no command to trade, amend a booking, approve a valuation, mark a reconciliation
complete, or communicate with a client.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio identity, as-of date, currency, portfolio value, invested value, and cash | Presented from the selected workspace; not reconstructed from filtered grid rows | Gateway over Core portfolio book and summary contracts |
| Security positions, quantities, price, valuation, cost, weight, classification, dates, and identifiers | Formatted and arranged for review without recalculating source facts | Core booked position records composed by Gateway |
| Cash balances in the inventory | Added only from the source-returned liquidity detail and deduplicated by security id | Core liquidity records composed by Gateway |
| Position status | Mapped to stable business language; unknown non-empty states fail closed to **Review required** and raw codes remain out of primary UI/export | Core position source status and operations evidence composed by Gateway |
| Pricing and source evidence rail | Summarizes the returned records; any warning or failed source posture qualifies the overall rail as **Partial** | Workbench presentation over named Gateway/Core evidence, not reconciliation approval |
| Recent holding activity | Filtered from the source-returned transaction window by security or instrument id | Core booked transaction records composed by Gateway |
| CSV export | Browser serializes current projected rows and visible columns | Workbench local action; no report, archive, or source mutation |

Browser and server requests use the governed Gateway path. The screen does not call Core directly.
Shared endpoint detail remains in [API Surface](API-Surface) and ownership flow in
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | The shared route waits for the selected portfolio and bounded record requests | Wait for source evidence; no fallback inventory is fabricated |
| Ready | Context, measures, full inventory, controls, and evidence with no warning posture | Review the book and continue to the appropriate workflow |
| Empty portfolio | An explicit empty inventory state | Confirm booking/funding posture through the owning workflow; zero rows are not presented as a reconciled book |
| Partial inventory | Available security or cash records remain visible and the unavailable detail is named | Use only visible evidence and restore the missing source before treating the inventory as complete |
| Missing valuation | The affected holdings remain visible with a partial-valuation message and blank unavailable figures | Review the named holdings; do not infer zero price, value, or P&L |
| Position status not reported | The row and export say **Not reported** and the evidence rail becomes **Partial** | Confirm the source position status before relying on currency of the holding |
| Position status requires review | The row and export say **Review required**; source stale-key evidence also qualifies the rail | Investigate the source-owned position/valuation process; Workbench does not clear the state |
| Activity unavailable | Holding overview and valuation remain available while recent activity is explicitly unavailable | Open Transactions when ledger detail is restored |
| Portfolio records unavailable | A degraded screen replaces the inventory | Re-establish a valid source-backed portfolio selection; another portfolio is not substituted silently |

## Workbench Boundaries

Positions deliberately does not:

- combine an advisor book, household, relationship, or multiple mandates into one inventory,
- recalculate portfolio totals, valuation, P&L, cost basis, weight, currency conversion, or
  reconciliation status in the browser,
- infer **Current** from a missing or unrecognized source state,
- submit trades, amend positions, repair prices, restart source processing, or approve a
  reconciliation,
- create a governed report, archive artifact, client communication, recommendation, suitability
  decision, or order.

The adopted interaction pattern is dense whole-portfolio inventory plus in-context drill-down and
exception emphasis. A card mosaic, hidden exception-only list, direct-service call, or local status
inference was rejected because each would weaken comparison, source authority, or daily advisor
productivity. Technology certification and scalability evidence remain centralized in
[Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support); this guide is not a
claim of bank approval or competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) establishes the source-backed own-book entry point.
- [Portfolio Review](Portfolio-Review-Screen-Guide) provides the selected mandate's daily decision
  checkpoint.
- Allocation explains direct exposure contribution from the booked holdings.
- Transactions provides broader booked activity, settlement, component, and lineage review.
- Performance and Risk own calculated analytical interpretation; Positions does not calculate it.
- Report Centre owns reviewed report-data requests; a local positions CSV is not a report.

## Evidence And Validation

- Pure view-model tests prove all four business states, whitespace/case normalization, unknown-state
  fail-closed behavior, cash-balance semantics, and aggregate priority.
- Grid-helper tests prove the displayed and exported status language is identical.
- Evidence-rail tests prove missing or non-current status, pricing gaps, reporting limitations, and
  other warning source items cannot coexist with an overall **Ready** badge.
- Portfolio component and production-browser validation cover the shared grid, holding drawer,
  keyboard path, compact layouts, and degraded inventory posture.
- Canonical front-office validation uses `PB_SG_GLOBAL_BAL_001`; deliberately missing and unknown
  status cases use deterministic fixtures so negative-state proof is repeatable.
- Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
  governed local and exact-main validation sequence.

## First Support Step

Confirm the selected portfolio and as-of date, then identify whether the visible limitation is
inventory, pricing, position status, reporting, or activity. Retry one governed source read. If the
state persists, record the affected business scope and approved support reference from the owning
runtime evidence without copying client identifiers or payloads into a support channel. Do not
force **Current**, edit browser data, call Core directly, or restart a source process from this
screen.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Portfolio Review Workflow](Portfolio-Review-Workflow)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
