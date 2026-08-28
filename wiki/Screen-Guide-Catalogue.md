# Workbench Screen Guide Catalogue

This catalogue is the business-facing map of the Lotus Workbench. It helps client advisors,
portfolio managers, investment specialists, operations teams, product owners, and support teams
understand which screens exist, where each screen sits in the private-banking workflow, and where
to find its operating guide.

## Current Scope

The checked-in screen registry records **21 route entrypoints, 36 active business screens or modes,
and two compatibility aliases**. All 36 active surfaces map to one implementation-backed guide and
there are no documentation coverage exceptions. The catalogue is therefore both a business reader
map and an executable delivery control.

The route-to-guide relationship, implementation evidence, source owners, and governed coverage
exceptions are governed by
[`workbench-screen-registry.v1.json`](https://github.com/sgajbi/lotus-workbench/blob/main/docs/documentation/workbench-screen-registry.v1.json).
The corresponding
[`screen guide template`](https://github.com/sgajbi/lotus-workbench/blob/main/docs/documentation/workbench-screen-guide-template.md) defines the
minimum content required before an exception can be removed.

## How To Read Availability

Availability and implementation are deliberately recorded as two separate facts:

| Posture             | Business meaning                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Active              | Available through the current Workbench navigation or a supported portfolio workflow.                                                                           |
| Runtime-gated       | Implemented and navigable only when the selected portfolio and as-of context publish the required capability.                                                   |
| Compatibility-only  | A maintained route that preserves an established entry path; use the canonical destination for normal work.                                                     |
| Capability-disabled | The screen or mode is implemented for bounded validation, but its top-level shell entry remains unavailable until the capability gate is intentionally enabled. |
| Alias               | A route or mode that takes the user to an existing canonical screen and therefore does not receive a duplicate guide.                                           |

“Capability-disabled” does not mean “roadmap mock-up.” It means implementation exists while the
ordinary shell entry remains deliberately closed. It must not be used to imply production
entitlement, identity, approval, publication, order, or execution authority.

## Advisor Book And Portfolio Records

These screens support the daily path from choosing a relationship or portfolio context to
reviewing holdings, activity, income, liquidity, and source-record detail.

| Business screen                                                 | Route or mode   | Posture | Guide status    | Source authority                       |
| --------------------------------------------------------------- | --------------- | ------- | --------------- | -------------------------------------- |
| [Advisor Book](Advisor-Book-Workflow)                           | `/book`         | Active  | Guide available | Gateway and Core                       |
| [Portfolio Review](Portfolio-Review-Screen-Guide)               | `/portfolio`    | Active  | Guide available | Gateway, Core, Performance, and Manage |
| [Portfolio Allocation](Portfolio-Allocation-Screen-Guide)       | `/allocation`   | Active  | Guide available | Gateway and Core                       |
| [Positions](Positions-Screen-Guide)                             | `/positions`    | Active  | Guide available | Gateway and Core                       |
| [Transactions](Transactions-Screen-Guide)                       | `/transactions` | Active  | Guide available | Gateway and Core                       |
| [Income and activity](Income-And-Activity-Screen-Guide)         | `/income`       | Active  | Guide available | Gateway and Core                       |
| [Projected cash flow](Projected-Cash-Movement-Screen-Guide) | `/cashflow`     | Active  | Guide available | Gateway and Core                       |
| [Portfolio Intake](Portfolio-Intake-Screen-Guide)               | `/intake`       | Active  | Guide available | Gateway and Core                       |

The `client-context` advisory mode resolves to Portfolio Review. It is an alias, not an additional
client profile or suitability screen, and it reuses the canonical Portfolio Review guide.

## Performance And Risk Review

The Performance workspace keeps return interpretation, benchmark-relative analysis, advisor
preparation, risk review, and supporting evidence in one route with explicit modes. These are
separate decision contexts and will receive separate guides even though they share the
`/performance` route.

The supported `advisor-brief` mode value is a compatibility alias of `advisor`; both resolve to the
single Performance Advisor Brief surface and guide.

| Business screen                                                     | Route or mode                | Posture       | Guide status    | Source authority                                 |
| ------------------------------------------------------------------- | ---------------------------- | ------------- | --------------- | ------------------------------------------------ |
| [Performance Summary](Performance-Summary-Screen-Guide)             | `/performance?mode=summary`  | Active        | Guide available | Gateway, Core, and Performance                   |
| [Performance Analysis](Performance-Analysis-Screen-Guide)           | `/performance?mode=analysis` | Runtime-gated | Guide available | Gateway and Performance                          |
| [Performance Advisor Brief](Performance-Advisor-Brief-Screen-Guide) | `/performance?mode=advisor`  | Active        | Guide available | Gateway, Core, Performance, Advise, and Lotus AI |
| [Risk Review](Risk-Review-Screen-Guide)                             | `/performance?mode=risk`     | Runtime-gated | Guide available | Gateway, Core, Performance, Risk, and Manage     |
| [Performance Evidence](Performance-Evidence-Screen-Guide)           | `/performance?mode=evidence` | Runtime-gated | Guide available | Gateway and Performance                          |

Performance Summary and Performance Analysis share one source-selection surface for horizon,
basis, explicit review window, frequency, and benchmark. Return-view presentation remains local to
Summary, while attribution and contribution segment controls remain local to Analysis. Performance
Evidence reviews the current source-confirmed context; it does not own a second selection or
approval workflow.

Risk Review compares exact source measures with Gateway-owned mandate evidence while keeping
suitability and house-policy judgement outside the browser. It preserves benchmark, as-of-date,
supportability, partial, unavailable, undefined-limit, measure-unavailable, and access-restricted
posture without inventing a limit, headroom, breach, all-clear, or universal severity band.

## Portfolio Management

The Manage workspace supports mandate monitoring and portfolio-manager operating workflows for a
selected portfolio. Its modes share `/workbench/{portfolioId}` and retain the portfolio context
while the user moves from attention posture into construction, review, and evidence.

| Business screen           | Route or mode                                | Posture | Guide status         | Source authority              |
| ------------------------- | -------------------------------------------- | ------- | -------------------- | ----------------------------- |
| [Manage Overview](Manage-Overview-Screen-Guide) | `/workbench/{portfolioId}?mode=overview` | Active | Guide available | Gateway, Core, and Manage |
| [Mandate Health](Mandate-Health-Screen-Guide) | `/workbench/{portfolioId}?mode=mandate` | Active | Guide available | Gateway, Core, and Manage |
| [Rebalance Waves](Rebalance-Waves-Screen-Guide) | `/workbench/{portfolioId}?mode=waves` | Active | Guide available | Gateway, Core, Manage, Report, and Lotus AI |
| [Construction Alternatives](Construction-Alternatives-Screen-Guide) | `/workbench/{portfolioId}?mode=construction` | Active  | Guide available | Gateway and Manage            |
| [Portfolio Memory](Portfolio-Memory-Screen-Guide) | `/workbench/{portfolioId}?mode=memory`       | Active  | Guide available | Gateway and Manage            |
| [PM Copilot](PM-Copilot-Screen-Guide) | `/workbench/{portfolioId}?mode=copilot` | Active | Guide available | Gateway, Manage, and Lotus AI |
| [PM Operating Quality](PM-Operating-Quality-Screen-Guide) | `/workbench/{portfolioId}?mode=quality`      | Active  | Guide available | Gateway, Manage, and Lotus AI |
| [Outcome reviews](Outcome-Reviews-Screen-Guide) | `/workbench/{portfolioId}?mode=reviews` | Active | Guide available | Gateway, Manage, Report, and Lotus AI |
| [Evidence Pack](Evidence-Pack-Screen-Guide) | `/workbench/{portfolioId}?mode=proof`        | Active  | Guide available | Gateway, Manage, and Lotus AI |

The presence of an AI-assisted mode does not make generated content authoritative. Its guide must
identify the source evidence, human review boundary, persistence posture, and prohibited downstream
uses. Manage remains the authority for portfolio-management workflow state.

## Advisory Journey

The advisory compatibility workspace presents bounded Gateway-backed modes over source-owned
advisory facts. The top-level Advisory shell entry remains capability-disabled, so these entries
describe implemented validation surfaces rather than a promise of unrestricted production access.

| Business screen                                     | Route or mode                         | Posture             | Guide status         | Source authority              |
| --------------------------------------------------- | ------------------------------------- | ------------------- | -------------------- | ----------------------------- |
| [Advisory Overview](Advisory-Overview-Screen-Guide) | `/recommendations?mode=overview`      | Capability-disabled | Guide available      | Gateway and Advise            |
| [Advisor Cockpit](Advisor-Cockpit-Screen-Guide)     | `/recommendations?mode=cockpit`       | Capability-disabled | Guide available      | Gateway and Advise            |
| [Advisory Copilot](Advisory-Copilot-Screen-Guide)   | `/recommendations?mode=copilot`       | Capability-disabled | Guide available      | Gateway, Advise, and Lotus AI |
| [Opportunities And Ideas](Opportunities-And-Ideas-Screen-Guide) | `/recommendations?mode=opportunities` | Capability-disabled | Guide available | Gateway and Lotus Idea        |
| [Bank Demo Proof](Bank-Demo-Proof-Screen-Guide) | `/recommendations?mode=proof`         | Capability-disabled | Guide available | Gateway and Advise            |

The guides will distinguish read-only decision support, persisted review actions, and human-owned
decisions. No guide may claim suitability approval, client publication, or order execution unless
the supporting service contract and runtime evidence prove that authority.

## Proposals

Proposal screens move from draft construction and impact simulation through suitability, risk,
discussion preparation, approval posture, and implementation tracking. Their top-level Proposal
shell entry remains capability-disabled even where bounded direct routes are implemented.

| Business screen                                               | Route or mode                     | Posture             | Guide status    | Source authority                      |
| ------------------------------------------------------------- | --------------------------------- | ------------------- | --------------- | ------------------------------------- |
| [Proposal Builder](Proposal-Builder-Screen-Guide)             | `/proposals/simulate`             | Capability-disabled | Guide available | Gateway, Advise, and Core             |
| [Approval Queue](Approval-Queue-Screen-Guide)                 | `/proposals?mode=approval-queue`  | Capability-disabled | Guide available | Gateway and Advise                    |
| [Suitability review](Suitability-Review-Screen-Guide)         | `/proposals?mode=suitability`     | Capability-disabled | Guide available | Gateway and Advise                    |
| [Risk and Impact](Risk-And-Impact-Screen-Guide)               | `/proposals?mode=risk-impact`     | Capability-disabled | Guide available | Gateway, Advise, Core, and Risk       |
| [Discussion pack review](Discussion-Pack-Review-Screen-Guide) | `/proposals?mode=discussion-pack` | Capability-disabled | Guide available | Gateway, Advise, and Report           |
| [Implementation Status](Implementation-Status-Screen-Guide)   | `/proposals?mode=implementation`  | Capability-disabled | Guide available | Gateway and Advise                    |
| [Proposal Detail](Proposal-Detail-Screen-Guide)               | `/proposals/{proposalId}`         | Capability-disabled | Guide available | Gateway, Advise, Report, and Lotus AI |

Simulation is an in-screen Proposal Builder result state, not a separately addressable mode, so it
belongs in the Proposal Builder guide. Each proposal guide must explain what is only evaluated,
what is persisted, which checks remain source-owned,
and where the workflow stops. A visible readiness label is not itself an approval, instruction, or
execution event.

## Reporting And Platform Discovery

These screens support document-ordering and data-product discovery without replacing the owning
reporting or service contracts.

| Business screen                                               | Route or mode    | Posture | Guide status    | Source authority                                   |
| ------------------------------------------------------------- | ---------------- | ------- | --------------- | -------------------------------------------------- |
| [Report centre](Report-Centre-Screen-Guide)                   | `/reports`       | Active  | Guide available | Gateway and Report                                 |
| [Data Product Catalogue](Data-Product-Catalogue-Screen-Guide) | `/data-products` | Active  | Guide available | Gateway, lotus-platform, and Lotus domain services |

The Report centre guide covers approved report choices, reviewed single-portfolio requests,
source-backed portfolio-bundle selection, separate per-portfolio outcomes, archive and delivery
boundaries, and failure recovery only where currently implemented. The Data Product Catalogue
guide covers accountable ownership, approved use, live assurance, dependency impact, and
independent recovery without treating catalogue metadata as proof that a downstream business
workflow is ready.

## Workflow Use

A business user normally starts with Advisor Book or an established portfolio context, moves into
Portfolio Review, and opens the specialist screen required by the decision: records, performance,
risk, portfolio management, advisory, proposals, or reports. Modes within a shared route preserve
context but represent different jobs; the individual guides will state the expected predecessor,
decision, action, and next handoff.

Support and product teams should use this catalogue before documenting or changing a route. A new
entrypoint or source-owned mode must be added to the registry with implementation evidence. A new
active screen must also have a guide or an explicit issue-backed exception. Aliases link to the
canonical guide to prevent duplicate, divergent documentation.

## Evidence And Governance

The repository quality gate compares the registry with every `src/app/**/page.tsx` entrypoint and
the source-owned Performance, Manage, Advisory Journey, and Proposal Lifecycle mode definitions.
It also checks evidence paths, guide ownership, required headings, wiki navigation, and governed
exceptions. This means a route or mode can no longer be added silently without a durable
documentation decision.

Shared contract and operating truth remains in the canonical pages below and should be linked from
individual guides instead of copied:

- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Troubleshooting](Troubleshooting)

## Coverage Governance

Issue #605 established the registry, template, and complete guide set. New routes or independently
navigable modes must update the registry, provide implementation evidence, map to one canonical
guide (or a justified issue-backed exception), pass `npm run quality:screen-docs`, and preserve wiki
source/publication parity. Aliases continue to reuse the canonical guide rather than duplicate it.
