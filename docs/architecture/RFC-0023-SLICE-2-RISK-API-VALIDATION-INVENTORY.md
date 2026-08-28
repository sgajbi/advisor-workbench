# RFC-0023 Slice 2 Risk API Validation Inventory

- Date: 2026-04-08
- Scope: endpoint inventory, live contract validation, and Workbench request-shape coverage
- Workbench branch: `feat/risk-concentration-upgrade`
- Production behavior change: none

## Slice 2 Decision Record

Slice 2 closes the contract-validation gap that remained after the RFC and UI-architecture guardrails:

1. record the exact Workbench-to-Gateway risk routes,
2. record the exact Gateway-to-`lotus-risk` stateful payload builders,
3. identify which details are intentionally first-paint versus drill-down only,
4. validate the live Gateway mappings against live `lotus-risk` responses,
5. add direct request-shape tests for every Workbench risk client helper.

This slice does not change UI behavior or backend contracts.

It hardens the delivery baseline so later UX slices cannot drift away from the real risk API surface.

## Canonical Endpoint Inventory

| Workspace module | Workbench client helper | Gateway route | Canonical `lotus-risk` route | First-paint posture | Drill-down posture |
|---|---|---|---|---|---|
| Risk Snapshot | `getWorkbenchRiskSummaryClient` | `GET /api/v1/workbench/{portfolio_id}/risk/summary` | `POST /analytics/risk/calculate` | first paint | no extra detail flag |
| Concentration | `getWorkbenchRiskConcentrationClient` | `GET /api/v1/workbench/{portfolio_id}/risk/concentration` | `POST /analytics/risk/concentration` | first paint | no extra detail flag |
| Drawdown | `getWorkbenchRiskDrawdownClient` | `GET /api/v1/workbench/{portfolio_id}/risk/drawdown` | `POST /analytics/risk/drawdown` | first paint excludes underwater series | `include_underwater_series=true` |
| Rolling Risk | `getWorkbenchRiskRollingClient` | `GET /api/v1/workbench/{portfolio_id}/risk/rolling` | `POST /analytics/risk/rolling-metrics` | first paint excludes rolling series | `include_time_series=true` |
| Historical Risk Attribution | `getWorkbenchRiskAttributionClient` | `GET /api/v1/workbench/{portfolio_id}/risk/attribution` | `POST /analytics/risk/historical-attribution` | first paint | no extra detail flag in current UI |

## Gateway Request Builders

Canonical builders are in [risk_workspace_service.py](https://github.com/sgajbi/lotus-gateway/blob/main/src/app/services/risk_workspace_service.py):

| Builder | Key request rules |
|---|---|
| `_build_summary_request` | Stateful only; `detail_basis` maps to `net_or_gross`; emits summary metrics plus historical VaR with `risk_free_mode=ZERO` |
| `_build_concentration_request` | Stateful only; no `detail_basis`; sets `issuer_grouping_level=ultimate_parent` and `enrichment_policy=merge_caller_then_core` |
| `_build_drawdown_request` | Stateful only; benchmark-relative behavior controlled by `benchmark_policy.include_benchmark`; underwater series stays opt-in via `analysis_options.include_underwater_series` |
| `_build_rolling_request` | Stateful only; windows fixed to `21, 63, 126, 252`; time series stays opt-in via `rolling_options.include_time_series`; benchmark metrics are only requested when benchmark context exists |
| `_build_attribution_request` | Stateful only; `ACTIVE_RISK` maps to `TRACKING_ERROR` and sets `benchmark_id`; `TOTAL_RISK` maps to `VOLATILITY` |

## Supportability and Latency-Sensitive Dependencies

| Workspace module | Backend dependencies that drive supportability | Heavy detail kept off first paint |
|---|---|---|
| Risk Snapshot | portfolio returns, benchmark alignment for beta/tracking error/information ratio, zero risk-free mode for Sharpe | none |
| Concentration | issuer enrichment coverage, valuation basis, reporting currency normalization | none |
| Drawdown | portfolio returns, benchmark-relative alignment, underwater series availability | underwater path |
| Rolling Risk | portfolio returns, benchmark returns, risk-free series, rolling time-series availability | rolling series |
| Historical Risk Attribution | portfolio returns, exposure history, benchmark context for `ACTIVE_RISK` | none in current UI |

Operational rule:

1. drawdown underwater detail and rolling time-series detail remain opt-in because they are materially heavier than first-read summary data,
2. later UX slices must not regress these back into default first-paint fetches,
3. supportability must stay business-safe in Workbench even when upstream quality flags or dependency failures occur.

## Live Validation Evidence

Validated on 2026-04-08 against:

1. `lotus-risk` running at `http://127.0.0.1:8130`
2. `lotus-gateway` running at `http://gateway.dev.lotus`

Validation portfolio context:

```text
portfolio_id=PB_SG_GLOBAL_BAL_001
period=YTD
detail_basis=NET
benchmark_code=BMK_GLOBAL_BALANCED_60_40
as_of_date=2026-02-24
reporting_currency=USD
```

### Summary validation

Compared live `lotus-risk` `POST /analytics/risk/calculate` to live Gateway `GET /risk/summary`.

Verified exact value matches for:

1. `VOLATILITY`
2. `SHARPE`
3. `BETA`
4. `TRACKING_ERROR`

Observed live values:

| Metric | `lotus-risk` | Gateway |
|---|---|---|
| Volatility | `10.536294930735048` | `10.536294930735048` |
| Sharpe | `2.2557195443220137` | `2.2557195443220137` |
| Beta | `2.4007121503593494` | `2.4007121503593494` |
| Tracking Error | `10.455478982970876` | `10.455478982970876` |

### Concentration validation

Compared live `lotus-risk` `POST /analytics/risk/concentration` to live Gateway `GET /risk/concentration`.

Verified exact value matches for:

1. top position weight
2. issuer coverage ratio

Observed live values:

| Field | `lotus-risk` | Gateway |
|---|---|---|
| `top_position_weight_current` | `0.236382` | `0.236382` |
| `coverage_ratio_current` | `1.0` | `1.0` |

### Drawdown validation

Compared live `lotus-risk` `POST /analytics/risk/drawdown` to live Gateway `GET /risk/drawdown`.

Verified exact value matches for:

1. `summary.max_drawdown`
2. `relative_to_benchmark.max_drawdown`
3. underwater-series emitted count when `include_underwater_series=true`

Observed live values:

| Field | `lotus-risk` | Gateway |
|---|---|---|
| `summary.max_drawdown` | `0.0` | `0.0` |
| `relative_to_benchmark.max_drawdown` | `-0.02641392155124589` | `-0.02641392155124589` |
| underwater series count | `55` | `55` |

Observed supportability behavior:

1. first paint without `include_underwater_series` returns `state=partial`,
2. detail request with `include_underwater_series=true` returns `state=ready`,
3. the `underwater_series` supportability item moves from `partial` to `ready`.

### Rolling validation

Compared live `lotus-risk` `POST /analytics/risk/rolling-metrics` to live Gateway `GET /risk/rolling`.

Verified exact value matches for the 21D window:

1. `ROLLING_VOLATILITY.latest`
2. `ROLLING_TRACKING_ERROR.latest`
3. `ROLLING_BETA.latest`
4. `ROLLING_MAX_DRAWDOWN.latest`
5. rolling-series emitted count when `include_time_series=true`

Observed live values:

| Field | `lotus-risk` | Gateway |
|---|---|---|
| 21D rolling volatility | `0.000005720217359377212` | `0.000005720217359377212` |
| 21D rolling tracking error | `0.004787111801115435` | `0.004787111801115435` |
| 21D rolling beta | `0.0001933184609293902` | `0.0001933184609293902` |
| 21D rolling max drawdown | `0.0` | `0.0` |
| 21D rolling series count | `55` | `55` |

Observed supportability behavior:

1. first paint without `include_time_series` returns `state=partial`,
2. detail request with `include_time_series=true` returns `state=ready`,
3. the `rolling_time_series` supportability item moves from `partial` to `ready`.

### Historical attribution validation

Compared live `lotus-risk` `POST /analytics/risk/historical-attribution` to live Gateway `GET /risk/attribution` for `ACTIVE_RISK` by `SECTOR`.

Verified exact value matches for:

1. attribution type
2. grouping dimension
3. total value
4. top contributor label

Observed live values:

| Field | `lotus-risk` | Gateway |
|---|---|---|
| attribution type | `ACTIVE_RISK` | `ACTIVE_RISK` |
| grouping dimension | `SECTOR` | `SECTOR` |
| total value | `0.10455478982970874` | `0.10455478982970874` |
| top contributor | `Government` | `Government` |

## Workbench Test Gaps Closed In This Slice

Updated [workbench-api.test.ts](..\..\tests\unit\workbench-api.test.ts) to add direct request-shape coverage for:

1. risk summary with and without benchmark context,
2. concentration omitting `detail_basis`,
3. drawdown default request excluding `include_underwater_series`,
4. drawdown detail request explicitly including `include_underwater_series=true`,
5. rolling default request excluding `include_time_series`,
6. rolling detail request explicitly including `include_time_series=true`,
7. attribution request including `attribution_type` and `grouping_dimension`.

These tests are intentionally direct because the UI now relies on on-demand detail patterns, and the risk request URL shape is part of the production contract.

## Slice 2 Exit Criteria

| Criteria | Result |
|---|---|
| Workbench risk endpoint inventory recorded | Done |
| Gateway request-builder rules recorded | Done |
| Supportability and heavy-detail dependencies recorded | Done |
| Live `lotus-risk` to Gateway validation completed for all five risk modules | Done |
| Direct Workbench request-shape tests added for all five risk client helpers | Done |
| Production behavior unchanged | Done |

Next slice:

```text
Slice 3: shared risk panel shell and interaction standardization
```
