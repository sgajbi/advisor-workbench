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
| Primary next action | Resolve evidenced exceptions when present or open the owning specialist workflow |

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
4. Read **Review focus** before the secondary evidence. Workbench composes this focus from the
   loaded source facts and keeps source limitations visible when they affect the review.
5. Review **Source Limitations** and the evidence rail when the decision depends on reporting,
   valuation, benchmark, or source coverage. Healthy reviews do not repeat all-clear readiness and
   exception panels.
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
- Presents one primary review focus with reporting coverage and only the open-exception evidence
  that exists. The current summary screen loads the workspace shell, dated book/summary details,
  and performance snapshots; it does not request detailed workflow or insight endpoints. Its
  review label is a Workbench presentation projection over loaded source facts, not a source-owned
  action, approval, recommendation, or mandate decision. A recommended next step appears only when
  a loaded source workflow supplies one; the screen does not fabricate a completion action.
- Keeps workspace-shell failures, source-owned performance warnings and partial failures, and
  supporting-request outages visible instead of treating them as zero or clear. A failed income,
  activity, selected-period, MTD, QTD, or YTD request does not discard successfully returned dated
  book evidence; the affected analytical scope is named and its unavailable return remains blank.
- Exposes period, as-of, reporting-currency, export, and additional-workflow controls only within
  current source capability. Unsupported historical review or currency restatement is disabled and
  explained. Record filters stay on the record screens where their effect is visible; Portfolio
  Review does not imply that a record filter restates whole-portfolio measures or readiness.
- Shows book context, available benchmark label/code, reporting coverage, actual valuation date,
  and only the evidence sources present in the loaded workspace. A missing benchmark is labelled
  **Not supplied** rather than implying an assignment. The rail is orientation and evidence
  context, not proof of source assignment or downstream readiness.
- Exports the current Workbench review projection as a local JSON file. Export does not create a
  report, archive record, approval, communication, or source-side business event.

Portfolio Review deliberately excludes record-oriented filters because their results are not
visible in this decision checkpoint. Use Positions or Transactions for filtered record review;
headline portfolio measures remain whole-portfolio source facts.

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

Portfolio Review exposes no mutation that marks a review complete and does not present a completion
command unless an owning source workflow supplies a supported next action.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio catalogue and selected portfolio | Requested through the Workbench BFF; Workbench does not substitute an unrelated global book when selection is unavailable | Gateway portfolio APIs over Core portfolio identity |
| Portfolio identity, profile, AUM, invested assets, cash, readiness inputs, and partial failures | Gateway workspace response is shaped for the review; Workbench formats but does not recalculate the underlying source facts | Core portfolio state composed by Gateway |
| Overall review label | Workbench deterministically projects the review posture from source-returned position coverage, reporting status, publication permission, blocking controls, and visible source/supporting-evidence limitations. Reporting `READY` and `COMPLETE` use one canonical resolved-state mapping | Workbench presentation classification; not source-owned readiness, approval, or suitability authority |
| Review focus and next step | Source partial failures remain evidenced when present; a next step is shown only when the loaded workspace supplies a workflow action | Workbench presentation guidance over source facts; not a persisted approval or browser-invented action |
| Positions, allocation, income, activity, and supporting book detail | Loaded through Gateway portfolio book and summary-detail contracts; record screens remain their owning presentation | Core portfolio book and transaction sources through Gateway |
| MTD, QTD, YTD, selected-period return, and available benchmark label/code | Requested through Gateway performance-snapshot contracts; missing return evidence remains unavailable and a generic benchmark fallback is not treated as identity evidence | Performance calculation authority composed by Gateway |
| Reporting coverage and generation posture | Rendered as readiness evidence; row count is not treated as a generation timestamp or publication event | Core source-readiness evidence composed by Gateway; not a Report service publication event |
| Performance warnings and partial failures | Promoted into the decision brief and **Source Limitations** so a usable book cannot be presented with an unqualified healthy analytical posture | Performance-owned warning/failure evidence composed by Gateway; Workbench does not invent severity or a return |
| Supporting request availability | Workbench records the exact income, activity, selected-period, MTD, QTD, or YTD request scope that could not be retrieved through Gateway; independently returned book and performance evidence remains usable | Workbench transport observation over Gateway requests; not a source calculation or fallback result |
| Rebalance and supportability payload | Successful data is retained in the shell response but not consumed by the current Portfolio Review components; Manage failures carried in `partial_failures` are rendered as **Monitoring** exceptions | Manage owns the conditional failure evidence, not a visible healthy rebalance or supportability posture |
| Review Evidence source list | Includes Portfolio book and only the Performance, Cashflow, or Reporting evidence actually present in the loaded workspace | Workbench orientation over loaded contracts; not calculation lineage or supportability certification |
| Export | Browser serializes the confirmed current Workbench projection | Workbench local action; no source-side report or archive authority |

Browser requests use the same-origin BFF and server composition uses the governed Gateway endpoint;
neither path calls Core, Performance, Report, or Manage directly. Source ownership in the catalogue
describes facts actually presented on this screen; retained but unrendered payload fields do not
become visible evidence merely because the shell contract contains them.
Shared endpoint detail remains in [API Surface](API-Surface) and ownership flow in
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Initial load | Server-backed page loading, followed by a bounded toolbar placeholder until client controls mount | Wait for portfolio and workspace evidence; no fabricated summary is shown |
| Ready | Identity, metrics, one review focus, controls, evidence, and handoffs without repeated all-clear panels | Use the review focus and source evidence before continuing |
| No selectable portfolio | **Portfolio context unavailable** and **Selection unavailable**; no global portfolio list is substituted | Open **My book** to re-establish source-backed portfolio membership |
| Selected workspace unavailable | One automatic shell request is made for the selected portfolio; a terminal unavailable response is not re-requested in a render loop | Return through the visible **My book** action; broader recovery telemetry remains tracked by [#651](https://github.com/sgajbi/lotus-workbench/issues/651) |
| Partial or degraded | Available book facts remain visible with the affected source or supporting analytical scope in **Source Limitations**; a ready book is qualified to **Partial** when supporting review evidence is limited | Use the dated book evidence that remains visible; do not use an unavailable return and open the owning specialist screen if the analytical scope is required |
| Warning without partial failure | The source warning is visible as qualified performance evidence and prevents an unqualified ready posture | Review the exact warning and use only the evidenced return/benchmark scope |
| Stale or unsupported scope | Historical/currency controls are disabled or qualified when the source does not support the requested scope. While dated details load, existing totals retain their actual valuation date; successful dated book evidence replaces both totals and valuation date together | Keep the effective source scope; do not relabel latest evidence as historical or restated |
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
- Focused tests prove the single healthy decision hierarchy, conditional source limitations,
  conditional evidence sources, absent-benchmark language, visible-date integrity, removal of
  misleading summary filters, and finite selected-shell request lifecycle.
- Focused mixed-success tests prove a failed standard-period request leaves dated book, income,
  selected-period, and other standard-period evidence usable; the failed return remains blank,
  recovery clears the limitation, and source-owned performance warnings qualify the review.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed commands and evidence locations.

## First Support Step

Confirm the selected portfolio, visible as-of date, base/reporting currency, readiness state,
reporting coverage, and exact limitation shown on screen. Record whether the limitation affects the
book or only income, activity, selected-period, MTD, QTD, or YTD supporting evidence. Do not paste
client or portfolio identifiers, exported JSON, or raw response payloads into a support channel. If
portfolio context is unavailable, open **My book** once to re-establish source-backed selection. If
the same scope remains unavailable or partial, follow [Operations Runbook](Operations-Runbook) and
record only the business-date scope, state classification, affected work area, and a displayed
correlation or support reference when its semantics are explicitly labelled.

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
