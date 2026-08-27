# Performance Analysis

Performance Analysis is the selected portfolio's source-backed contribution and attribution
workspace. It helps an advisor, portfolio manager, or investment specialist explain which holdings
and portfolio segments influenced the confirmed return and how allocation, selection, interaction,
and residual effects were reported. It does not calculate attribution, recommend a transaction, or
turn incomplete evidence into an investment conclusion.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/performance?portfolioId={portfolio_id}&mode=analysis` |
| Navigation | **Performance** in the global workspace navigation, then **Performance Analysis** in the selected-portfolio rail |
| Availability | Runtime-gated by the selected portfolio's published analysis capability |
| Supported scope | One portfolio and one source-confirmed reporting context at a time |
| Primary reading order | Analysis snapshot, attribution history evidence, attribution detail, then contribution drivers |
| Primary next action | Explain a confirmed driver, qualify a limitation, change an available segment, or continue to evidence review |

The current mode exposes one compact governed analysis bar beside the evidence it controls.
Summary and Analysis reuse the same horizon, return-basis, observation-frequency, benchmark, and
custom-window selection path. Risk reuses the component for its supported horizon, basis,
benchmark, and custom-window subset but omits Frequency because current governed Risk requests do
not consume it. No mode renders a second local context. Exact dates appear only when **Custom
dates** is selected. **Absolute**, **Relative**, and **Combined** remain Return History display
choices in Summary and deliberately do not appear as attribution source selectors.

## Business Purpose

Performance Analysis helps answer four bounded questions:

1. Is the selected analytical evidence available and sufficiently supported for explanation?
2. Which positions or portfolio segments contributed positively or negatively?
3. Which source-reported allocation, selection, interaction, and residual effects explain active
   outcome?
4. Is historical attribution a real time series, one published observation, a valid absence, or an
   unconfirmed source request?

The screen supports investment-review preparation and analytical investigation. It keeps exact
evidence and its limitations together so a user does not mistake an attractive chart for stronger
source coverage than was actually published.

## Who Uses This Screen

- **Client advisors and relationship managers** investigate the drivers behind a confirmed
  portfolio outcome before an internal or client conversation.
- **Portfolio managers and investment specialists** review contribution and benchmark-relative
  attribution by available segment and position.
- **Performance and investment operations teams** distinguish valid absence, partial evidence,
  access restriction, and source failure during investigation.
- **Product and support teams** use the visible evidence state and source response status to route
  a presentation problem separately from a calculation or contract problem.

These uses do not imply production entitlement, performance sign-off, investment suitability,
advice approval, or client-publication authority.

## Workflow Position

1. Open Performance Analysis for the selected portfolio and confirm horizon, basis, review window,
   frequency, and benchmark in the primary workspace.
2. Change the governing source context directly when a different analytical question is required;
   remain in Analysis while Workbench requests and confirms the matching source view.
3. Read the Analysis Snapshot as orientation, not as a substitute for exact detail.
4. Inspect historical attribution. A chart appears only when at least two source observations exist;
   one observation remains exact tabular evidence.
5. Review allocation, selection, interaction, total, active-return, and residual evidence at the
   available attribution level.
6. Review leading positive and negative contribution at position or segment level.
7. Continue to Performance Evidence when calculation, lineage, coverage, or limitation support is
   required; use Summary when the headline outcome or return path is the next business question.

## Implemented Capabilities

- Presents Gateway-backed contribution and attribution detail without calculating effects in the
  browser.
- Exposes source-backed horizon, basis, frequency, benchmark, and a compact **Review window**
  control through the same reusable selection component and request-shaping path as Summary. The
  complete confirmed range stays visible while exact-date drafting is contained in a focused,
  validated dialog. Risk uses that component only for its supported subset and does not expose
  Frequency.
- Applies the selection as one source transaction; downstream analysis inherits the confirmed
  context and does not repeat horizon or benchmark controls.
- Keeps the prior confirmed view under its original labels while a new selection is pending or
  failed; commits controls, Review Context, analytics, and canonical URL only after source success.
- Locks conflicting source changes while pending, announces pending and confirmation without moving
  focus, and restores the initiating control only when the user has not moved to another task.
- Supports source-admitted attribution and contribution segment changes and explains source
  normalisation when a requested segment is not supported.
- Presents exact allocation, selection, interaction, total, active-return, residual, exposure, and
  contribution fields only where returned by the source contracts.
- Renders historical attribution as a chart plus exact table only when two or more observations are
  published.
- Renders one observation as an exact table with an explicit statement that a time trend cannot yet
  be established.
- Keeps valid source-confirmed empty evidence distinct from recoverable request failure and
  permission-blocked posture.
- Offers one persistent **Refresh history** action after a recoverable history failure; it repeats
  the exact selection, becomes natively unavailable while pending, and restores keyboard focus
  after the request settles.
- Fences obsolete attribution-history completions so a slower earlier selection cannot overwrite a
  newer one, caches only successful source responses, and evicts matching history after a later
  access denial.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Explain contribution drivers | Confirmed contribution detail and source capability | None; read-only review |
| Explain attribution effects | Confirmed attribution totals or detail with visible supportability posture | None |
| Interpret a history pattern | At least two published historical observations | None |
| Use one observation as evidence | Exactly one source-published observation; no trend inference | None |
| Change contribution or attribution segment | Source-admitted segment returned for the same confirmed workspace context | None; requests new analytics |
| Retry historical attribution | Explicit recoverable history failure | None; re-contacts source authority |
| Change horizon, basis, review window, frequency, or benchmark | Source-supported option and successful matching summary/detail transaction | None; confirms a new analytical view and canonical URL |
| Escalate an evidence limitation | Named unavailable, partial, warning, access, or failure posture | None from Workbench |

Analysis does not create a recommendation, proposal, report order, portfolio instruction, trade,
order, execution, settlement, approval, or client communication.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Selected portfolio and confirmed reporting context | Preserves and presents the current Performance workspace selection | Gateway-selected portfolio context and Performance analytics |
| Requested source selection and confirmed analytical view | Keeps requested context separate, locks conflicting controls, and publishes the new controls, evidence, Review Context, and URL atomically after success | Gateway summary and details contracts over Core context and Performance analytics |
| Contribution positions, segments, coverage, and rankings | Groups and formats returned detail without inventing missing rows | Gateway `GET /api/v1/workbench/{portfolio_id}/performance/details` over Performance authority |
| Attribution levels, effects, exposures, residual, status, warnings, and partial failures | Presents returned analytical evidence and its qualifications | Gateway performance details contract over Performance authority |
| Historical attribution observations and source supportability | Chooses a truthful zero-, one-, or multi-observation presentation | Gateway `GET /api/v1/workbench/{portfolio_id}/performance/attribution-trend` over Performance authority |
| Recoverable failure, access restriction, exact retry, cache, and obsolete-request fencing | Owns browser request state; never converts rejection into an empty success contract | Workbench over the matching Gateway response |

Workbench uses the BFF and Gateway. It does not call Performance directly. Shared contract detail
remains in [API Surface](API-Surface), and ownership flow remains in [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Bounded analysis loading with no fabricated effects | Wait for the selected request |
| Source selection pending | Prior evidence remains under its prior labels; requested context and confirmation progress are announced | Wait for the matching source contracts; conflicting source controls remain locked |
| Source selection failed | Prior confirmed evidence remains labelled, with requested versus confirmed context and exact retry | Retry the same selection or continue using only the prior confirmed view |
| Source selection confirmed | Controls, Review Context, analytics, and URL identify one matching source-confirmed context | Continue the investigation without a mode change |
| Ready, multiple observations | Exact history chart and table plus attribution and contribution detail | Continue the analysis |
| Ready, one observation | **Attribution Observation**, exact table, and a visible no-trend qualification | Use the observation without inferring a pattern |
| Ready, no observations | Source-confirmed unavailable explanation | Qualify the review using the returned reason or evidence posture |
| Partial or warning | Usable analytical facts with named limitation evidence | Use only the supported facts and investigate the limitation |
| Normalised segment | Visible explanation of the source-selected supported segment | Continue with the confirmed segment |
| History request failed | Persistent **Attribution history could not be refreshed**, source response status when known, and **Refresh history** | Retry the exact request; do not describe this as no data |
| Permission blocked | **Attribution history restricted** without restricted details | Use an entitled role or approved support path |

Historical attribution has its own source state. Confirmation of contribution and attribution detail
does not imply that the independent history request succeeded.

## Workbench Boundaries

Performance Analysis deliberately does not:

- calculate or reconcile return, contribution, allocation, selection, interaction, active-return,
  residual, linking, exposure, currency, or benchmark economics,
- convert a failed request into zero rows, a supported flag, a blank source identifier, or generic
  no-data copy,
- draw a time-series chart from one observation or interpolate missing periods,
- infer a recommendation, target weight, trade, suitability decision, breach, approval, or client
  narrative from positive or negative effects,
- claim composite, household, relationship, advisor-book, official performance-control, production
  entitlement, client-publication, bank-certification, or competitor-superiority posture.

Official wealth-platform and accessibility research informed the connected analytical context,
exception-led recovery, exact-evidence, and focus-preserving interaction principles. Lotus does not
copy another product's layout, visual identity, wording, calculations, or unsupported capability.

## Adjacent Handoffs

- [Performance Summary](Performance-Summary-Screen-Guide) presents headline outcome and return path;
  it shares the same source-selection contract with Analysis.
- Performance Evidence owns deeper calculation, lineage, coverage, and limitation inspection.
- Performance Advisor Brief owns the separately reviewed internal working narrative.
- Risk Review owns downside and risk interpretation.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the selected-mandate daily checkpoint.
- [Report Centre](Report-Centre-Screen-Guide) owns reviewed report ordering and lifecycle.
- Performance operations own source calculation repair and official control processes.

## Evidence And Validation

- Focused component tests prove multi-, single-, and zero-observation presentation; recoverable 503
  failure versus valid absence; permission-blocked posture; exact retry; focus restoration; and stale
  request fencing.
- Integration tests prove the Analysis mode uses the one-observation contract without rendering a
  false trend chart and keeps detail confirmation separate from historical evidence.
- The owned optimized-production `PB_SG_GLOBAL_BAL_001` journey deliberately receives a 503 for
  historical attribution, proves explicit failure instead of no data, retries the same selection,
  and then proves one exact observation with no chart.
- Browser proof verifies native pending disablement and post-request focus restoration,
  head-managed styles, the single expected BFF error, and
  no page overflow at 1024, 768, and 519 pixels.
- The owned optimized-production Analysis-controls journey changes horizon and benchmark without a
  mode hop, proves pending then source-confirmed status, canonical URL and Review Context truth,
  stable focus, 44px narrow touch targets, head-managed styles, and no overflow at 1800, 1280,
  1024, 768, and 519 pixels.
- Canonical live validation accepts only source-confirmed one- or multi-observation evidence and
  records the exact evidence posture in machine-readable UI checks.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Confirm the selected portfolio, horizon, reporting window, return basis, frequency, benchmark,
contribution segment, and attribution segment. If a source selection fails, record its requested
and last-confirmed contexts and retry only through the visible exact-selection action. Then record
whether history shows multiple observations, one
observation, source-confirmed unavailability, a partial limitation, **Attribution history could not
be refreshed**, or **Attribution history restricted**. Retry once only through **Refresh history**;
do not copy client data or raw payloads into an unapproved channel.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Performance Summary](Performance-Summary-Screen-Guide)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Report Centre](Report-Centre-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
