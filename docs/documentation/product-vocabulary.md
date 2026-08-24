# Workbench product vocabulary

## Purpose

This document is the cross-domain language authority for productive Workbench UI. It gives client
advisers, portfolio managers, support teams, designers, engineers, and reviewers one business term
for each concept while preserving distinctions that matter for advice, valuation, performance,
reconciliation, and audit.

Runtime labels remain owned by their business-domain modules. This document governs meaning; it is
not a second application copy registry. API fields, source codes, routes, and identifiers may retain
their contract names at an adapter or support boundary, but they must not become the user's primary
reading path.

## Writing register

1. Use UK English and sentence case for headings, labels, actions, and links.
2. Put the decision-relevant words first. Use structure and progressive detail instead of routine
   block capitals, heavy emphasis, or repeated explanations.
3. Expand specialist acronyms at first meaningful use. Keep raw codes and identifiers in a labelled
   support disclosure unless the user must copy or reconcile them.
4. Name source-backed facts truthfully. Never infer a capability, status, currency restatement,
   performance method, or service model from missing data.
5. Say each fact once in the primary scan path. Supporting evidence may explain it without renaming
   it.

## Canonical vocabulary

| Concept | Productive UI term | Meaning and allowed context | Retire or restrict |
|---|---|---|---|
| One selected client asset record | **Portfolio** | The selected account or portfolio reviewed under its mandate. | Do not call one portfolio, its positions, or visible rows a book. |
| Adviser-level population | **Adviser book** | The source-backed set or aggregate of portfolios assigned to an adviser. | Do not shorten to book where the scope could be confused with a portfolio. Use **AUM** only for a source-backed adviser-book, relationship, team, or firm aggregate. |
| Selected portfolio value | **Portfolio value** | Source-backed base-currency market value at the stated valuation date. | Never label a selected portfolio value as AUM. |
| Invested inventory screen | **Positions** | The portfolio's source-backed security and cash positions. | Retire screen-level **Holdings**, **Booked holdings**, and **Available holdings**. **Contributing positions** is allowed for the subset explaining an allocation or result. |
| Forward cash screen | **Projected cash flow** | Source-backed dated expected inflows and outflows. These are movements, not projected cash balances. | Retire **Cashflow**, **Cash movements**, and **Projected cash movement** as screen names. |
| Reporting workspace | **Report centre** | The workspace for configuring, ordering, monitoring, and retrieving supported reports. | Retire navigation **Reporting** and title-case **Report Centre**. The `/reports` route is unchanged. |
| Prioritised work row | **Attention item**; state **Needs attention** | A source-backed item a user can prioritise, review, or act on. | Do not call every source exception, evidence gap, or issue an attention item. |
| Source exception record | **Exception** | An actual exception type returned by an owning source and shown as evidence for a decision or attention item. | Do not use **Active exceptions**, **Attention required**, and **Unresolved source issues** interchangeably in the primary path. |
| Presence of required data | **Availability** | Whether the required data exists and was returned. | Not a synonym for decision readiness, evidence breadth, or system supportability. |
| Sufficiency for a decision | **Review readiness** | Whether source evidence is sufficient for the stated review or action. | Do not collapse into availability. **Supportability** belongs in progressive support detail. |
| Breadth of supporting sources | **Evidence coverage** | Which required sources, records, or periods are represented. | Do not use as a synonym for availability or readiness. |
| User-requested review scope | **As-of date** | The requested date that scopes a review or comparison. | Use **Review date** only where requested scope is explicitly compared with source evidence. Do not label route or query state as valuation truth. |
| Source pricing date | **Valuation date** | The source-owned date at which market values and related figures were priced. | Never derive it from a requested as-of date. |
| Portfolio accounting denomination | **Base currency** | The currency in which portfolio totals and base-currency values are stated. | Retire **Portfolio currency** as a display alias. |
| Accepted user-requested restatement | **Reporting currency** | A requested currency restatement only after the owning source explicitly accepts it. | Never label an unrequested echo or base-currency fallback as reporting currency. |
| Security denomination | **Instrument currency** | The currency in which an instrument is denominated or quoted. | Retire bare **Currency** beside base-currency market values. |
| Booked transaction denomination | **Transaction currency** | The currency recorded on a booked transaction. | Use **Trade currency** only while entering a trade instruction whose contract gives it that meaning. |
| Manager or mandate performance | **Time-weighted return (TWR)** | The source-returned return measure that removes the effect of external cash flows. Compact **TWR** is allowed after expansion or with an accessible expansion. | Do not render bare **Return** where the method matters. NET/GROSS is a fee basis, not a method. |
| Cash-flow-sensitive client experience | **Money-weighted return (MWR)** | The distinct source-returned measure whose timing and size of external cash flows affect the result. Compact **MWR** is allowed after expansion or with an accessible expansion. | Retire unexplained **MWR supportability** and do not treat MWR as an interchangeable second TWR. |
| Advice artefact | **Proposal** | The governed advice record moving through evaluation, approval, discussion, and implementation. | **Lotus Ideas** may name the product queue; idea, opportunity, recommendation, and advice are not display aliases for proposal. |
| Suitability workflow | **Suitability review** | The business review of client circumstances, recommendation fit, evidence, and the next permitted action. | A policy or policy evaluation is supporting evidence; **Policy review** must not rename the workflow. |
| Portfolio-management hierarchy | **Rebalance instruction** → **rebalance wave** → **rebalance campaign** | An instruction is one proposed portfolio change; a wave is a controlled execution run; a campaign groups governed waves across a defined population and objective. | Retire unexplained **durable wave** and do not use wave and campaign interchangeably. |
| Benchmark identity | **Business benchmark label** | The source-provided business name is primary. | Put benchmark codes in support detail, not the primary rail or metric label. |
| Technical identity | **Reference** or a precise business reference label | Show a source identifier only when support, reconciliation, or audit needs it, with copy affordance where useful. | Raw correlation IDs, reason codes, hashes, endpoint names, and service names never lead the business path. |
| Mandate service model | **Discretionary**, **Advisory**, **Execution only** | Render only the exact service model supplied by the owning source. | Never infer execution-only from absent advice, data, or controls; current Workbench support remains limited to admitted source values. |

## Business-boundary rules

### Work versus evidence

An attention item is processable work. An exception is a source record that may explain why work is
needed. Availability answers whether data exists; evidence coverage answers how much of the required
source set is represented; review readiness answers whether the evidence is sufficient for the
stated decision. The same badge or label must not stand in for all four facts.

### Date truth

The as-of date is requested scope. The valuation date is returned source truth. Show a review date
only in a comparison that makes the requested-versus-returned distinction explicit. If the source
date differs, preserve both facts and explain the difference; never rewrite one as the other.

### Currency truth

Base, reporting, instrument, and transaction currency are four different facts. A reporting
currency exists only after a supported request is accepted by the source. The UI must fail closed
to base-currency wording when that acceptance is absent and must keep instrument and transaction
denominations explicit beside converted values.

### Performance truth

TWR and MWR are calculation methods. NET and GROSS are fee bases. Workbench presents returned
figures and methodology evidence; it does not calculate, infer, or relabel the source method in the
browser.

### Workflow truth

Suitability review is the adviser workflow; policy evidence supports that workflow. Proposal is the
advice artefact. Rebalance instruction, wave, and campaign express increasing operational scope.
Display actions remain governed by source capabilities and permissions, never by vocabulary alone.

## Engineering application

1. Add or change runtime terms in the domain module that owns their meaning.
2. Test semantic distinctions at view-model and component boundaries, including failure and
   fallback paths.
3. Update affected screen guides and this authority when product meaning changes.
4. Keep contract identifiers unchanged unless the owning API change is separately governed.
5. Treat new synonyms in a primary business path as review findings. The general copy-layer and
   broad jargon enforcement mechanism are owned separately by Workbench issue #798.

## Sources and decision record

The adopted and rejected research patterns are recorded in
`docs/product/WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md` under **Product vocabulary and business
language**. The governing implementation issue is Workbench #799.
