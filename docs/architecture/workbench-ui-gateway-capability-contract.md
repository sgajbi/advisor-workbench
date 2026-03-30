# Workbench UI-to-Gateway Capability Contract

## Purpose

Portfolio and Performance pages now use explicit UI capability maps at the API/view-model
boundary. The goal is to make feature supportability intentional instead of scattering `if data
exists` checks across rendering components.

This contract does **not** move domain business logic into the UI. It only answers a narrower UI
question:

- is a feature supported by the current payload?
- is it partially supported?
- should it render an unavailable state?
- should it remain hidden for the current mode?

## Capability state vocabulary

Every workspace feature resolves to one of:

- `supported`: render the normal feature
- `partial`: render a partial-state explanation
- `unavailable`: render a compact unavailable state
- `hidden`: do not render the feature for the current mode/context

The shared vocabulary lives in [`src/shell/workspace-capabilities.ts`](../../src/shell/workspace-capabilities.ts).

## Portfolio feature dependencies

`PortfolioWorkspaceCapabilities` is built in
[`src/apps/portfolio/capabilities.ts`](../../src/apps/portfolio/capabilities.ts).

Feature dependencies:

- `summaryKpis`
  - portfolio workspace summary payload
- `readinessIndicators`
  - source `readiness_indicators` when available
  - otherwise UI falls back to source-backed summary evidence already present in the workspace
- `allocation`
  - `allocation_views`
  - partial if holdings exist but allocation views are missing
- `topHoldings`
  - `top_positions`
  - partial if holdings exist but ranked output is missing
- `income`
  - `income_summary`
  - partial if transactions exist but no income aggregation is available
- `activity`
  - `activity_summary`
  - partial if transactions exist but no activity aggregation is available
- `projectedCashflow`
  - `cashflow_outlook`
  - hidden outside detailed mode
- `holdingsDrilldown`
  - `positions`
  - hidden outside detailed mode
- `transactionsDrilldown`
  - `recent_transactions`
  - hidden outside detailed mode
- `performanceSnapshot`
  - portfolio `performance` snapshot payload

## Performance feature dependencies

`PerformanceWorkspaceCapabilities` is built in
[`src/apps/performance/capabilities.ts`](../../src/apps/performance/capabilities.ts).

Feature dependencies:

- `summaryKpis`
  - performance summary payload
- `returnPath`
  - chart observations in the selected series
- `benchmarkComparison`
  - benchmark context plus benchmark-relative returns
- `multiHorizonReturns`
  - horizon comparison contract
  - may remain partial when benchmark-relative comparison is unavailable
- `contributionRanking`
  - contribution payload
  - position ranking when available
- `attributionDetail`
  - attribution payload
- `contributionDetail`
  - contribution payload
- `evidence`
  - future execution / lineage / calculation evidence surfaces
  - currently unavailable by contract

## Current live Gateway-backed usage

The current `lotus-workbench` UI consumes these Performance contracts directly:

- `GET /workbench/{portfolio_id}/performance/summary`
- `GET /workbench/{portfolio_id}/performance/details`
- `GET /workbench/{portfolio_id}/performance/horizon-comparison`
- `GET /workbench/{portfolio_id}/performance/attribution-trend`

The UI no longer consumes a monolithic `GET /workbench/{portfolio_id}/performance` helper path.
Any retirement decision for that endpoint belongs to Gateway governance and requires consumer
verification outside this repository first.

The current Portfolio UI consumes a decomposed workspace contract shape:

- `GET /portfolio/portfolios/{portfolio_id}/workspace`
- `GET /portfolio/portfolios/{portfolio_id}/allocations`
- `GET /portfolio/portfolios/{portfolio_id}/positions`
- `GET /portfolio/portfolios/{portfolio_id}/income-summary`
- `GET /portfolio/portfolios/{portfolio_id}/activity-summary`
- `GET /portfolio/portfolios/{portfolio_id}/liquidity`
- `GET /portfolio/portfolios/{portfolio_id}/transactions`
- `GET /portfolio/portfolios/{portfolio_id}/readiness`
- `GET /portfolio/portfolios/{portfolio_id}/insights`
- `GET /portfolio/portfolios/{portfolio_id}/workflow`
- `GET /portfolio/portfolios/{portfolio_id}/projected-cashflow`

## High-value upstream-backed attributes now surfaced

The UI now explicitly exposes these contract fields because they improve front-office trust without
expanding the API surface:

- Performance benchmark provenance
  - `net_performance.benchmark_return_source`
  - `gross_performance.benchmark_return_source`
  - shown in the return-path benchmark context
- Performance benchmark option context
  - `benchmark_options`
  - used for benchmark label resolution and benchmark selection controls
- Performance money-weighted return
  - `money_weighted_return`
  - shown only when the contract actually provides it
- Portfolio reporting freshness
  - `readiness.reporting.generated_at_utc`
  - `readiness.reporting.row_count`
  - shown in the summary-first readiness signal
- Portfolio operational trust signals
  - `operations.controls_blocking`
  - `operations.publish_allowed`
  - `operations.latest_booked_transaction_date`
  - used in readiness support messaging with explicit precedence

## Keep-or-retire decisions still open

These items still need an explicit governance decision rather than silent drift:

- Gateway monolithic Performance endpoint
  - keep only if another consumer still depends on it
  - otherwise retire after cross-repo confirmation
- Performance Evidence contract
  - currently unavailable by design
  - add only when Gateway can expose real lineage/evidence data
- Portfolio historical snapshots and reporting-currency restatement
  - UI remains explicit that these are pending source support
  - do not fake support from client-side transforms

## Ownership boundaries

Backend ownership:

- `lotus-core` owns domain truth and calculations
- `lotus-performance` owns performance analytics computation and analytical contracts
- `lotus-gateway` owns UI-appropriate contract shaping and aggregation

UI ownership:

- consume payloads
- build capability maps from current contract supportability
- render supported / partial / unavailable / hidden states consistently

UI does **not** own:

- domain readiness rules
- portfolio or performance calculation logic
- benchmark methodology
- business reconciliation logic

## Why this matters

Without an explicit capability contract, the UI drifts toward:

- duplicated support checks
- inconsistent empty and partial states
- hidden coupling between component trees and raw payload shape

The capability map keeps page orchestrators thinner and makes missing Gateway support visible as an
explicit follow-up item rather than an accidental UI behavior.

## Known follow-up gaps

Current gaps are intentionally represented as unavailable or partial capability states:

- portfolio performance snapshot remains unavailable when the portfolio workspace contract does not
  include performance data
- performance evidence / lineage surfaces are not yet exposed by Gateway
- some portfolio readiness indicators still degrade to UI supportability when source-backed
  readiness indicators are absent
