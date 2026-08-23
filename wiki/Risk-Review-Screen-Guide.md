# Risk Review

Risk Review is the selected portfolio's source-backed downside, concentration, rolling-risk, and
risk-contribution workspace. It gives an advisor or investment specialist exact measures and the
evidence needed to decide what requires professional review. It deliberately keeps a measured risk
fact separate from a client-mandate, suitability, or house-policy conclusion.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/performance?portfolioId={portfolio_id}&mode=risk` |
| Navigation | **Performance** in global navigation, then **Risk Review** in the selected-portfolio rail |
| Availability | Runtime-gated by the selected portfolio's source capability |
| Supported scope | One selected portfolio, source-confirmed reporting window, basis, benchmark, as-of date, and reporting currency |
| Primary reading order | Exact executive evidence, mandate-comparison boundary, snapshot, drawdown, concentration, rolling risk, historical risk attribution, then supportability |
| Primary next action | Qualify the portfolio discussion, inspect a source limitation or methodology, or continue to an implemented adjacent workspace |

This is a portfolio-level analytical review. It is not an advisor-book risk aggregation, household
risk score, enterprise limit monitor, suitability assessment, or pre-trade control.

## Business Purpose

Risk Review helps a private-banking professional answer six bounded questions:

1. What source-confirmed volatility, drawdown, largest-position, and coverage evidence is available?
2. What reporting period, basis, benchmark, currency, and as-of date define those measures?
3. How deep was the portfolio's drawdown, and had it recovered by the period end?
4. Where is exposure concentrated by position and issuer, and how complete is issuer coverage?
5. How have rolling measures behaved across the source-supported observation windows?
6. Which source-supported groups contribute most to total or active risk?

The first scan leads with exact measures and factual source state. Exact source measures are
evidence, not a mandate conclusion. The user must compare them with the approved client mandate,
risk profile, constraints, and house policy outside this screen unless a future governed source
contract supplies that comparison.

## Who Uses This Screen

- **Client advisors and relationship managers** prepare a bounded explanation of portfolio risk
  before a review or client conversation.
- **Portfolio managers and investment specialists** inspect downside, concentration, rolling
  behavior, and contribution evidence before deciding whether deeper analysis is required.
- **Risk, performance, and investment-operations teams** investigate source limitations,
  observation coverage, benchmark alignment, methodology, and calculation supportability.
- **Product, control, and support teams** distinguish a Workbench presentation defect from a
  Gateway, Performance-context, or Lotus Risk source-contract defect.

These uses do not imply production entitlement, delegated authority, suitability approval,
mandate-waiver authority, investment advice, order approval, or client-publication permission.

## Workflow Position

1. Enter from [Advisor Book](Advisor-Book-Workflow),
   [Portfolio Review](Portfolio-Review-Screen-Guide), or Performance Summary with one selected
   portfolio.
2. Confirm the portfolio, reporting window, return basis, benchmark, currency, and as-of date in
   the one shared Performance analysis bar. Exact dates appear only for a Custom dates review;
   Risk does not render a second **Risk context** control group.
3. Read the exact executive measures and the visible **Mandate comparison — Not supplied by
   source** boundary before drawing a policy conclusion.
4. Review snapshot and drawdown evidence, then position and issuer concentration with coverage and
   methodology.
5. Inspect rolling windows and request available detail only when the analytical question needs it.
6. Select only source-supported attribution type and grouping controls, then review the returned
   contributors and reconciliation evidence.
7. Continue to Performance Evidence, Portfolio Review, Advisor Brief, or Report Centre only where
   that implemented handoff fits the business task.

## Implemented Capabilities

- Reuses the same source-confirmed Horizon, Basis, Frequency, Benchmark, and Custom window control
  bar as Performance Summary and Analysis. Risk modules inherit that selection once; they do not
  duplicate context or introduce a screen-local selector.
- Presents source-returned realized volatility, max drawdown, largest-position weight and driver,
  and source coverage in a compact executive evidence strip.
- States whether the principal drawdown was recovered before period end or remained below its prior
  peak, using the source-returned recovery flag rather than a browser severity threshold.
- Presents risk snapshot measures, their units, definitions, observation context, and source state.
- Presents exact position and issuer concentration indices, largest position and issuer, top-N
  cumulative weight, issuer coverage, source driver identity, and methodology access.
- Presents drawdown depth, duration, episodes, benchmark-relative context, and an on-demand
  underwater series only when the source contract supports them.
- Presents rolling-risk windows with exact latest, typical, range, coverage, and source-supported
  series detail; it does not extrapolate a missing series.
- Presents source-admitted total- or active-risk attribution controls and contributor evidence. A
  disabled source option stays disabled with its reason.
- Preserves ready, partial, unavailable, blocked, warning, partial-failure, methodology-version,
  cache, and correlation posture from the Gateway/Risk contract family.
- Keeps the policy boundary visible: **No approved client mandate or house risk limit is available
  in this workspace**, so Workbench does not infer a breach or an all-clear.
- Reflows the exact evidence and boundary at desktop, tablet, and 519-pixel widths without requiring
  two-dimensional page scrolling.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Explain current measured risk | Exact source measure, period, as-of date, basis, currency, and usable source state | None; read-only review |
| Discuss drawdown recovery | Source-returned drawdown summary and recovery flag | None |
| Review concentration | Exact position/issuer measures plus issuer coverage and methodology | None; no mandate conclusion |
| Inspect underwater or rolling detail | Source capability and an explicit detail request | None; read-only request |
| Change rolling window | A source-returned supported window | None; local evidence selection |
| Change attribution type or grouping | A source-admitted enabled control combination | None; requests source analytics |
| Decide whether a mandate exception exists | Approved mandate or house-policy evidence not supplied by this screen | Not supported in Workbench Risk Review |

No Risk Review control records advice, approves a mandate exception, creates a proposal, changes a
portfolio, submits an order, publishes a report, or communicates with a client.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Selected portfolio, period, basis, benchmark, currency, and as-of context | Reuses the confirmed Performance workspace context and sends it through the BFF | Gateway over Performance context contracts |
| Snapshot measures and observation context | Formats exact measures and source states; does not recalculate or classify them | Gateway `GET /api/v1/workbench/{portfolio_id}/risk/summary` over Lotus Risk |
| Position and issuer concentration, drivers, coverage, enrichment and grouping methodology | Presents exact values and methodology without inventing limits or bands | Gateway `GET /api/v1/workbench/{portfolio_id}/risk/concentration` over Lotus Risk |
| Drawdown summary, episodes, recovery, relative context, and optional underwater series | Requests and presents the source contract; detail is loaded on demand | Gateway `GET /api/v1/workbench/{portfolio_id}/risk/drawdown` over Lotus Risk |
| Rolling metric summaries, coverage, windows, and optional time series | Presents source-supported windows and requests series detail on demand | Gateway `GET /api/v1/workbench/{portfolio_id}/risk/rolling` over Lotus Risk |
| Risk attribution controls, contributors, totals, residuals, and methodology | Enables only source-admitted combinations and preserves source warnings | Gateway `GET /api/v1/workbench/{portfolio_id}/risk/attribution` over Lotus Risk |
| Mandate limit, client risk tolerance, house-policy threshold, breach, waiver, and all-clear | Not supplied and not inferred | Approved client/mandate and policy authority outside the current contract |

Workbench calls these contracts through its same-origin BFF and Gateway. It does not call Lotus Risk
or Performance directly. Shared contract detail remains in [API Surface](API-Surface), and service
ownership remains in [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Bounded Risk loading state without synthetic measures | Wait for the selected source context |
| Ready | Exact evidence, methodology access, and the mandate-comparison boundary | Continue the professional review |
| Partial | Usable modules remain visible with named source limitations, warnings, and partial failures | Qualify any discussion and inspect the affected module |
| Unavailable | Risk source evidence is not available for the selected context | Confirm portfolio/context and use the approved support path |
| Access restricted | Explicit permission-blocked posture without restricted data | Use an entitled role or approved access-support process |
| Deferred detail idle | Headline evidence remains visible; no unrequested detail is fabricated | Request detail only when needed |
| Deferred detail loading | The requested underwater or rolling series is pending | Keep the current headline evidence; do not infer the result |
| Deferred detail unavailable | Exact detail is absent while the parent source evidence remains qualified | Continue with available facts or investigate source supportability |
| Attribution blocked or unavailable | Source controls and reason remain explicit; no contributor rows are fabricated | Choose a supported source option or follow support guidance |

Module-level source states remain independent. One partial or unavailable module does not turn
another source-confirmed module into a synthetic success or erase its exact evidence.

## Workbench Boundaries

Risk Review deliberately does not:

- classify risk as contained, moderate, elevated, high, severe, acceptable, or diversified from
  Workbench-authored numeric thresholds,
- define a mandate limit, client risk tolerance, capacity for loss, suitability outcome, house
  alert policy, breach, waiver, remediation priority, or all-clear,
- calculate volatility, tracking error, drawdown, concentration, rolling metrics, covariance,
  attribution, benchmark alignment, or residuals in the browser,
- convert a missing measure to zero, colour an exact value as a warning solely because of a local
  threshold, or turn a source failure into an empty success,
- recommend a rebalance, security sale, hedge, proposal, order, execution, settlement, report
  publication, or client communication,
- claim advisor-book, household, team, enterprise-limit, stress-scenario, or pre-trade coverage
  that the current contracts do not publish.

Official CFA and wealth-platform research informed the separation of measured evidence from
client-specific and policy judgement. Lotus does not copy another product's layout, wording,
visual identity, thresholds, calculations, or unsupported capability. This guide is not a claim of
bank approval or competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns source-backed portfolio selection across the advisor's
  book.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the selected mandate's daily review and
  source-reported attention posture.
- [Performance Summary](Performance-Summary-Screen-Guide) owns return and benchmark-relative
  outcome.
- [Performance Analysis](Performance-Analysis-Screen-Guide) owns deeper performance attribution
  and contribution diagnostics.
- [Performance Evidence](Performance-Evidence-Screen-Guide) owns calculation and lineage assurance
  for the selected Performance context.
- [Performance Advisor Brief](Performance-Advisor-Brief-Screen-Guide) owns a separately reviewed
  internal working narrative.
- [Report Centre](Report-Centre-Screen-Guide) owns reviewed report ordering and source lifecycle;
  Risk Review does not publish a report.

## Evidence And Validation

- Focused view-model tests prove exact volatility, max drawdown, largest-position, source-coverage,
  partial-coverage, unavailable, and blocked states without browser-authored severity labels.
- Component tests prove the executive evidence, mandate-comparison boundary, exact concentration
  measures, supportability, and absence of the retired concentration scale.
- A deterministic source-authority guard prohibits the retired threshold helpers and scale type
  from returning and requires the visible absent-policy boundary.
- CSS governance removes the retired concentration-scale and side-stack selectors, prohibits their
  return, and lowers the exact legacy-global size ratchet.
- Canonical browser validation uses `PB_SG_GLOBAL_BAL_001`, confirms all five Risk modules and
  populated attribution evidence, asserts the exact executive labels and policy boundary, rejects
  retired first-scan classifications, and proves page reflow at 1440, 1024, and 519 pixels.
- Canonical screenshots remain evidence only after API and calculation validation pass; a
  screenshot alone is not source, entitlement, mandate, identity, suitability, or readiness proof.
- Protected PR checks, exact-main releasability, wiki publication, strict parity, and clean branch
  hygiene remain release controls.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Record the selected portfolio, period, basis, benchmark, reporting currency, as-of date, and which
module says **Partial**, **Unavailable**, or **Access restricted**. Open the module's methodology or
supportability detail and record the correlation id and source reason without copying client data
or raw payloads into an unapproved channel. Do not invent a mandate threshold or reword a missing
policy comparison as a breach or all-clear.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
