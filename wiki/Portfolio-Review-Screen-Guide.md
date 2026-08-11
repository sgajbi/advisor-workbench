# Portfolio Review

Portfolio Review is the selected portfolio's daily decision checkpoint. It brings identity,
valuation context, current return measures, source-reported exceptions, a Workbench-composed review
posture, and the next supported handoff into one review. It is not a client profile, recommendation engine, mandate
approval, or trading screen.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/portfolio` |
| Navigation | **Portfolio** in the portfolio review rail; current Home destination |
| Supported scope | One selected portfolio and its current Gateway-backed review evidence |
| Evidence posture | Active and covered by canonical `PB_SG_GLOBAL_BAL_001` browser validation |
| Primary next action | Resolve the source-reported review focus or open the owning specialist workflow |

`/`, `/suite`, and `/portfolios` resolve to this canonical screen, and advisory
`client-context` resolves here as a compatibility alias. Those entry paths do not create separate
client, household, suitability, or portfolio-review authority.

## Business Purpose

Portfolio Review helps an advisor or portfolio manager answer: **is this portfolio evidence usable
for today's review, what needs attention, and where should I continue?** It establishes the book,
business date, currency, mandate context, value, cash, returns, readiness, and exception posture
before the user enters Allocation, Positions, Transactions, Cashflow, Performance, Risk, reporting,
or mandate operations.

The screen is deliberately a decision checkpoint rather than a dashboard of every available
metric. Detailed records and analytical methods stay in their owning screens.

## Who Uses This Screen

- **Relationship managers and client advisors** use it after selecting an assigned portfolio to
  prepare a review and choose the relevant specialist handoff.
- **Portfolio managers and investment specialists** use it to confirm the selected mandate,
  valuation scope, reporting posture, exceptions, and adjacent analytical work.
- **Operations and support teams** use source failures, readiness, business date, portfolio
  identity, and evidence context to distinguish a usable review from an incomplete one.
- **Product and demonstration teams** use canonical browser evidence to verify that the visible
  portfolio is Gateway-backed and not a browser fixture.

These roles describe business use, not production entitlement. Authenticated principal and
portfolio-entitlement work remains governed by
[Workbench #436](https://github.com/sgajbi/lotus-workbench/issues/436).

## Workflow Position

1. Start from [Advisor Book](Advisor-Book-Workflow) or an already selected portfolio context.
2. Confirm portfolio, client reference, booking centre, mandate status, base currency, and as-of
   date before comparing figures.
3. Review AUM, invested assets, cash, and source-returned MTD, QTD, and YTD net returns.
4. Read **Review focus** before the secondary evidence: it carries the primary source-reported
   attention item or supported next step plus a Workbench-composed readiness label.
5. Review exceptions and the evidence rail when the decision depends on reporting, valuation,
   benchmark, or source coverage.
6. Continue to the owning record, analytics, reporting, advisory, or mandate workflow. Returning to
   Portfolio Review does not record completion, approval, or client communication.

The broader sequence across Allocation, Positions, Transactions, Income, and Cashflow remains in
[Portfolio Review Workflow](Portfolio-Review-Workflow).

## Implemented Capabilities

- Shows the selected portfolio name or mandate label, portfolio and client references, booking
  centre, lifecycle status, base currency, and governed as-of date.
- Presents source-backed AUM, invested assets, cash, cash weight, and MTD/QTD/YTD net returns.
- Opens supporting drawers for AUM, invested-assets, and cash evidence without turning those
  drawers into recommendations.
- Presents one source-backed review focus, reporting coverage, open exceptions, and the recommended
  source workflow action. Its visible **Ready**, **Partial**, or **Not Ready** label is a Workbench
  presentation projection over source-returned positions, reporting status, publication permission,
  blocking controls, and partial failures; it is not a source-owned approval or mandate decision.
- Keeps partial failures and source-reported exception detail visible instead of treating missing
  evidence as zero or clear.
- Exposes period, as-of, reporting-currency, filter, export, and additional-workflow controls only
  within current source capability. Unsupported historical review or currency restatement is
  disabled and explained.
- Shows readiness, book context, benchmark, source scope, reporting coverage, and adjacent
  Gateway-backed work areas in the secondary rail.
- Exports the current Workbench review projection as a local JSON file. Export does not create a
  report, archive record, approval, communication, or source-side business event.

The current summary filter menu includes record-oriented controls whose visible scope is limited;
headline portfolio measures remain whole-portfolio source facts. Consolidating those controls and
the repeated all-clear hierarchy is tracked by
[Workbench #649](https://github.com/sgajbi/lotus-workbench/issues/649). Do not interpret an active
filter chip as restating AUM, returns, readiness, or exceptions.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Judge whether the review is usable | Portfolio identity, as-of scope, readiness, reporting, and exception evidence | None |
| Change period | Select a supported 7D, 30D, MTD, QTD, YTD, 1Y, or since-inception view | None; Workbench requests the relevant supporting performance evidence |
| Change as-of date or reporting currency | The workspace capability must explicitly support that control | None; unsupported controls remain disabled |
| Open a metric drawer | Select AUM, Invested Assets, or Cash | None; this reveals supporting evidence only |
| Export the review projection | A selected source-backed workspace must be present | A local JSON download only |
| Continue to Performance, Risk, Advisor Brief, Evidence, Reports, or Mandate Operations | Select an implemented adjacent workflow for the same portfolio | None on Portfolio Review |
| Change portfolio | Select source-backed portfolio context through the shared switcher | None; the destination re-requests the selected portfolio |

Portfolio Review exposes no mutation that marks a review complete. The phrase **Complete portfolio
review** is guidance, not a persisted workflow state or approval command.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio catalogue and selected portfolio | Requested through the Workbench BFF; Workbench does not substitute an unrelated global book when selection is unavailable | Gateway portfolio APIs over Core portfolio identity |
| Portfolio identity, profile, AUM, invested assets, cash, readiness inputs, workflow cues, warnings, and exceptions | Gateway workspace response is shaped for the review; Workbench formats but does not recalculate the underlying source facts | Core portfolio state composed by Gateway |
| Overall review label | Workbench deterministically projects **Ready**, **Partial**, or **Not Ready** from source-returned position coverage, reporting status, publication permission, blocking controls, and partial failures | Workbench presentation classification; not source-owned readiness, approval, or suitability authority |
| Positions, allocation, income, activity, and supporting book detail | Loaded through Gateway portfolio book and summary-detail contracts; record screens remain their owning presentation | Core portfolio book and transaction sources through Gateway |
| MTD, QTD, YTD, selected-period return, benchmark identity, and availability | Requested through Gateway performance-snapshot contracts; missing return evidence remains unavailable | Performance calculation authority composed by Gateway |
| Reporting coverage and generation posture | Rendered as readiness evidence; row count is not treated as a generation timestamp or publication event | Core source-readiness evidence composed by Gateway; not a Report service publication event |
| Rebalance and operating supportability | Displayed only where the workspace publishes it; no browser-owned monitoring decision | Manage operating evidence composed by Gateway |
| Export | Browser serializes the confirmed current Workbench projection | Workbench local action; no source-side report or archive authority |

Browser requests use the same-origin BFF and server composition uses the governed Gateway endpoint;
neither path calls Core, Performance, Report, or Manage directly.
Shared endpoint detail remains in [API Surface](API-Surface) and ownership flow in
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Initial load | Server-backed page loading, followed by a bounded toolbar placeholder until client controls mount | Wait for portfolio and workspace evidence; no fabricated summary is shown |
| Ready | Identity, metrics, review focus, controls, exceptions/readiness, evidence, and handoffs | Use the review focus and source evidence before continuing |
| No selectable portfolio | **Portfolio context unavailable** and **Selection unavailable**; no global portfolio list is substituted | Open **My book** to re-establish source-backed portfolio membership |
| Selected workspace unavailable | An automatic bounded client fetch attempts to recover the selected shell; persistent failure leaves the explicit unavailable workspace | Return through **My book** or follow the first support step |
| Partial or degraded | Available facts remain visible with source failure, warning, readiness, or exception detail | Use only evidenced facts and continue to the owning workflow or support path |
| Stale or unsupported scope | Historical/currency controls are disabled or qualified when the source does not support the requested scope | Keep the effective current scope; do not relabel latest evidence as historical or restated |
| Empty supporting detail | Source-backed zero or unavailable supporting detail remains distinct from the portfolio headline | Open the owning record screen before concluding that activity or exposure is absent |
| Permission blocked | Portfolio Review has no dedicated authenticated-principal permission panel today; a failed catalogue or workspace read remains unavailable | Do not add browser authority headers; follow #436 and the operations runbook |
| Error | Catalogue or workspace failures fail closed to unavailable context; partial source failures remain visible within an otherwise usable review | Re-enter through **My book** or retry the owning specialist screen; escalate if the same scope persists |

The screen does not promise a universal Retry button. Recovery text names only controls that
currently re-contact source authority.

## Workbench Boundaries

Portfolio Review does not:

- calculate portfolio valuation, performance, benchmark return, reporting coverage, mandate breach,
  risk, suitability, or priority in the browser. Workbench does project the disclosed overall review
  label from exact source-returned readiness inputs;
- aggregate households, external assets, delegated books, or a relationship manager's whole book;
- recommend a trade, rebalance, product, proposal, or client action;
- approve a mandate, suitability outcome, proposal, report, or client communication;
- create orders, route execution, claim fills, settle transactions, or reconcile custody;
- create a governed report, archive artifact, evidence pack, or client delivery from local export;
- infer production identity or entitlement from a visible portfolio reference.

Technology certification, resilience, scalability, dependency support, and explicit non-claims are
owned in [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support). This guide does
not claim bank approval, procurement acceptance, production identity, HA/DR, or capacity
certification.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns source-backed book selection.
- [Portfolio Review Workflow](Portfolio-Review-Workflow) explains Allocation, Positions,
  Transactions, Income, and Cashflow as a connected record-review sequence.
- **Performance**, **Risk**, **Advisor Brief**, and **Evidence** retain the selected portfolio and
  pass available benchmark context to their owning modes.
- **Reports** opens the portfolio-scoped Report Centre; Portfolio Review export is not a report
  order.
- **Mandate Operations** opens the selected Manage workspace; Portfolio Review does not perform
  operational actions itself.
- **Source Catalog** opens Data-Product Discovery for ownership and trust evidence; catalogue
  presence does not prove a business workflow ready.

Compatibility routes and aliases reuse this guide and must not fork the business workflow.

## Evidence And Validation

- Component and view-model tests cover portfolio identity/KPIs, decision-brief readiness and
  attention, exceptions, evidence/benchmark handoffs, toolbar capability behavior, API fan-out,
  source-key request ordering, and automatic selected-shell recovery.
- `tests/e2e/portfolio-workbench.smoke.spec.ts` covers populated Portfolio behavior and record-screen
  handoffs; `scripts/live/validation/browser-workflows.mjs` owns canonical browser proof.
- Canonical validation selects `PB_SG_GLOBAL_BAL_001`, verifies the exact Portfolio Review heading
  and **Review Evidence** landmark, and captures `portfolio-summary-live.png` only after API and
  panel checks pass.
- Runtime evidence must preserve canonical contract identity, source business date, portfolio
  identity, benchmark/evidence posture, and declared limitations. A screenshot alone is not
  readiness, production, or bank-certification proof.
- The repeated all-clear hierarchy, record-filter scope, and desktop rail utilisation found in the
  screen audit remain explicitly open under #649; this guide does not mark that UI work complete.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed commands and evidence locations.

## First Support Step

Confirm the selected portfolio, visible as-of date, base/reporting currency, readiness state,
reporting coverage, and exact source failure or warning shown on screen. Do not paste client or
portfolio identifiers, exported JSON, or raw response payloads into a support channel. If portfolio
context is unavailable, open **My book** once to re-establish source-backed selection. If the same
scope remains unavailable or partial, follow [Operations Runbook](Operations-Runbook) and record
only the business-date scope, state classification, affected work area, and a displayed correlation
or support reference when its semantics are explicitly labelled.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Portfolio Review Workflow](Portfolio-Review-Workflow)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Security and Governance](Security-and-Governance)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
