# RFC-0022: Stateful Risk Workspace and lotus-risk UI Integration

- Status: PROPOSED
- Date: 2026-04-07
- Owners:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-risk maintainers
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-risk maintainers
  - lotus-platform maintainers

## Summary

`lotus-risk` now exposes a materially richer analytics surface than `lotus-workbench` consumes.

Current `lotus-risk` capabilities include:

1. stateful portfolio risk metrics,
2. stateful drawdown analytics,
3. stateful rolling risk diagnostics,
4. stateful and simulation-aware concentration analytics,
5. stateful historical risk attribution, with `TOTAL_RISK` available and `ACTIVE_RISK` gated by
   benchmark exposure-history support,
6. integration capability publication for platform capability aggregation.

`lotus-workbench` does not yet present these as a first-class front-office risk workspace.
`lotus-gateway` still has an older `risk_proxy` path that calls a removed legacy
`/analytics/workbench/risk-proxy` endpoint shape. That connection must be removed and replaced
with a clean Gateway BFF contract over the canonical `lotus-risk` APIs.

This RFC proposes a modular, micro-frontend-style Risk Workspace inside the Workbench product,
surfaced through shared UI primitives from RFC-0021 and backed only by stateful `lotus-risk`
execution modes in the UI.

The result should feel like a private-banking risk cockpit:

1. source-grounded,
2. stateful,
3. portfolio-context aware,
4. benchmark-aware where data is available,
5. simulation-aware for concentration,
6. auditable,
7. fast enough for front-office use,
8. modular enough for future independent risk panels.

## Why This RFC Is Needed

The Workbench product now has stable `Portfolio`, `Performance`, and `Advisor Brief` surfaces.
The next high-value analytical gap is risk.

Advisors and investment teams need to answer questions such as:

1. Is this portfolio taking appropriate risk for the mandate?
2. Did the portfolio underperform because it took too much, too little, or the wrong type of risk?
3. How severe was the worst drawdown path and is the book still underwater?
4. Are rolling risk conditions deteriorating?
5. Is the proposed trade increasing concentration risk?
6. Which contributors explain total risk?
7. Which risk facts are available, partial, unavailable, or blocked by upstream evidence?

Today, those answers are not presented coherently in Workbench. Existing UI mentions concentration
in a limited readiness panel, but it does not expose the full `lotus-risk` capability set.

## Current Source Reality

### lotus-risk

The current `lotus-risk` feature branch reviewed for this RFC is:

1. `fix/docker-upstream-runtime-validation`

Observed current state:

1. `POST /analytics/risk/calculate`
   - modes: `stateless`, `stateful`
   - portfolio metrics: volatility, drawdown, Sharpe, Sortino, beta, tracking error, information
     ratio, VaR
2. `POST /analytics/risk/drawdown`
   - modes: `stateless`, `stateful`
   - max drawdown, episodes, time-under-water, ulcer index, DaR/CDaR, optional underwater series,
     optional benchmark-relative summary
3. `POST /analytics/risk/rolling-metrics`
   - modes: `stateless`, `stateful`
   - rolling volatility, rolling Sharpe, rolling beta, rolling tracking error, rolling information
     ratio, rolling max drawdown
4. `POST /analytics/risk/concentration`
   - modes: `stateless`, `stateful`, `simulation`
   - portfolio HHI, single-position concentration, issuer concentration, coverage diagnostics,
     simulation session metadata
5. `POST /analytics/risk/historical-attribution`
   - modes: `stateless`, `stateful`
   - stateful `TOTAL_RISK` exists
   - stateful `ACTIVE_RISK` remains gated by benchmark exposure-history integration
6. `GET /integration/capabilities`
   - publishes `risk_snapshot`, `concentration_risk`, `drawdown_analytics`,
     `rolling_risk_analytics`, and `historical_risk_attribution`

Important working-tree note:

1. the reviewed `lotus-risk` branch had an existing uncommitted change in
   `src/app/integrations/lotus_core_client.py`,
2. that change adds benchmark assignment, benchmark market-series, and index catalog client methods,
3. this RFC does not assume that uncommitted work is merged, but it treats benchmark exposure and
   active-risk readiness as supportability-gated.

### lotus-gateway

Current Gateway posture:

1. `risk_analytics_base_url` exists,
2. platform capability aggregation already calls risk capabilities,
3. Workbench analytics still references an older `get_workbench_risk_proxy` path,
4. that client calls `/analytics/workbench/risk-proxy`,
5. `lotus-risk` endpoint matrix marks that endpoint removed.

This RFC requires removing that old connection fully.

### lotus-workbench

Current Workbench posture:

1. `Portfolio` has limited concentration/readiness copy,
2. `Workbench` has a narrow HHI signal,
3. `Performance` has strong summary, analysis, advisor brief, and evidence modes,
4. no first-class Risk mode exists,
5. RFC-0021 shared UI architecture is available and must be used for the new risk surface.

## Decision

Create a first-class `Risk` mode in the Workbench analytical experience, backed by a new
Gateway-owned Risk BFF contract.

The UI must only surface stateful risk execution:

1. no stateless payload authoring in the UI,
2. no raw return-series upload in the UI,
3. no user-supplied exposure histories in the UI,
4. no direct browser-to-`lotus-risk` calls.

Allowed execution modes by panel:

| Risk Panel | UI Execution Mode | Notes |
|---|---|---|
| Risk Snapshot | stateful | Uses portfolio ID, as-of, period, basis, benchmark context. |
| Drawdown | stateful | Benchmark-relative summary only when supportability allows it. |
| Rolling Risk | stateful | Risk-free and benchmark-dependent metrics are supportability-gated. |
| Concentration | stateful by default; simulation when sandbox session exists | Simulation is allowed only for concentration because `lotus-risk` supports it. |
| Historical Risk Attribution | stateful `TOTAL_RISK` first | `ACTIVE_RISK` must remain gated until benchmark exposure history is available. |

## Architectural Principles

### 1. Gateway BFF owns UI contract shaping

The browser must not call `lotus-risk` directly.

Target flow:

```text
lotus-workbench
  -> lotus-gateway /api/v1/workbench/{portfolioId}/risk/*
    -> lotus-risk /analytics/risk/*
```

Gateway responsibilities:

1. enforce the stateful-only UI contract,
2. construct canonical `lotus-risk` requests,
3. preserve correlation IDs,
4. normalize supportability and partial-failure states,
5. cache safe repeated reads,
6. map raw analytics into front-office display contracts,
7. hide stateless and low-level engine concerns from the UI.

### 2. Remove the old risk-proxy path

The current Gateway connection to `/analytics/workbench/risk-proxy` must be removed.

Removal means:

1. delete the legacy client method,
2. delete legacy fallback logic from Workbench analytics,
3. replace old HHI proxy mapping with the new stateful concentration BFF result,
4. update tests so no path references `/analytics/workbench/risk-proxy`,
5. update docs that still describe the old path.

No compatibility shim should be introduced for the removed legacy endpoint.

### 3. Risk UI is modular, not monolithic

Risk should be built as a set of independently testable modules:

1. Risk workspace shell,
2. risk snapshot module,
3. drawdown module,
4. rolling risk module,
5. concentration module,
6. historical risk attribution module,
7. supportability rail,
8. evidence/provenance strip.

Each module should have:

1. its own view model,
2. its own fixture-backed contract tests,
3. its own loading/empty/partial/unavailable/error states,
4. its own focused query boundary where appropriate,
5. a shared parent context for period, basis, benchmark, and portfolio identity.

This is a micro-frontend-style implementation within the Workbench codebase. It does not require a
separate deployable frontend bundle yet.

### 4. Shared UI system is mandatory

The Risk Workspace must use RFC-0021 shared primitives:

1. `AppPageShell`,
2. `WorkbenchPageFrame`,
3. `SectionBlock`,
4. `ModeTabs`,
5. `SemanticBadge`,
6. `ActionButton`,
7. `AnalyticsTable`,
8. `ScreenStatePanel`,
9. `CapabilityStatePanel`,
10. `WorkbenchSummaryMetricStrip`,
11. shared financial formatters,
12. shared query policy.

No page-local risk UI system should be created.

### 5. Business language over engine language

The UI must not expose raw model internals unless they are meaningful to an advisor.

Examples:

1. show `Volatility`, not `VOLATILITY`,
2. show `Tracking Error`, not `TRACKING_ERROR`,
3. show `Data coverage partial`, not only `quality_flags`,
4. show `Issuer coverage partial`, not only `coverage_status=partial`,
5. show `Active-risk attribution unavailable: benchmark exposure history not available`, not a
   generic failure.

### 6. Summary first, detail on demand

The first view must answer the advisor's question quickly:

1. risk level,
2. drawdown severity,
3. benchmark-relative risk,
4. concentration pressure,
5. coverage/supportability.

Detailed tables and series should be below the fold or behind module expansion.

## Proposed UX

### Navigation

Add `Risk` as a mode in the Performance workspace:

```text
Summary | Analysis | Advisor Brief | Risk | Evidence
```

Rationale:

1. risk is analytical and benchmark-aware,
2. it belongs next to Performance rather than inside Portfolio details,
3. Portfolio can link into Risk for concentration and readiness actions,
4. Advisor Brief can cite Risk as a future source once Risk BFF evidence exists.

### Risk Mode Layout

```text
Performance > Risk

Context Bar:
Portfolio | Benchmark | Period | Basis | As of | Risk supportability

Main:
Risk Snapshot
  - Volatility
  - Sharpe
  - Sortino
  - Beta
  - Tracking Error
  - Information Ratio
  - VaR / Expected Shortfall

Drawdown
  - Max Drawdown
  - Time Under Water
  - Ulcer Index
  - DaR / CDaR
  - Worst Episodes
  - Underwater Path

Rolling Risk
  - Window selector
  - Rolling Volatility
  - Rolling Sharpe
  - Rolling Beta
  - Rolling Tracking Error
  - Rolling Information Ratio

Concentration
  - HHI current
  - HHI proposed / delta when sandbox exists
  - Top position weight
  - Top-N cumulative weight
  - Issuer HHI
  - Issuer coverage

Historical Risk Attribution
  - Total risk attribution
  - Contributors by position / issuer / sector / asset class
  - Active risk attribution gated by supportability

Right Rail:
Supportability
  - Returns series
  - Benchmark series
  - Risk-free series
  - Issuer enrichment
  - Exposure history
  - Sandbox session

Provenance:
  - source service
  - contract version
  - methodology version
  - correlation ID
  - as-of / period
```

### Portfolio Integration

Portfolio should not duplicate the full Risk Workspace.

Portfolio should surface only decision-useful entry points:

1. `Open Risk` action,
2. concentration readiness status,
3. top concentration exception when HHI or top position pressure is high,
4. sandbox concentration delta when an active sandbox session exists.

## Gateway BFF Contract Direction

Add new Gateway endpoints under `workbench`:

```text
GET /api/v1/workbench/{portfolioId}/risk/summary
GET /api/v1/workbench/{portfolioId}/risk/drawdown
GET /api/v1/workbench/{portfolioId}/risk/rolling
GET /api/v1/workbench/{portfolioId}/risk/concentration
GET /api/v1/workbench/{portfolioId}/risk/attribution
```

The first implementation may also include an aggregate endpoint:

```text
GET /api/v1/workbench/{portfolioId}/risk
```

Use split endpoints for lower latency and module-level refresh. Use the aggregate endpoint only if
it is proven useful for first paint.

### Common Query Parameters

All endpoints should support:

1. `period`,
2. `detailBasis`,
3. `benchmarkCode`,
4. `reportStartDate`,
5. `reportEndDate`,
6. `reportingCurrency`,
7. `asOfDate`,
8. `sessionId`.

### Common Response Fields

Every endpoint should return:

1. `correlationId`,
2. `contractVersion`,
3. `portfolioId`,
4. `period`,
5. `asOfDate`,
6. `sourceService`,
7. `supportability`,
8. `warnings`,
9. `partialFailures`,
10. `metadata`.

### Supportability Model

Gateway must normalize raw risk availability into UI-safe supportability states:

```text
ready | partial | unavailable | blocked | loading
```

Example supportability dimensions:

1. portfolio returns,
2. benchmark returns,
3. risk-free series,
4. issuer enrichment,
5. exposure history,
6. sandbox session,
7. methodology metadata.

## lotus-risk Usage Rules

### Risk Snapshot

Call:

```text
POST /analytics/risk/calculate
```

Use:

1. `input_mode=stateful`,
2. `stateful_input.portfolio_id`,
3. `stateful_input.as_of_date`,
4. `stateful_input.periods`,
5. `stateful_input.net_or_gross`,
6. `stateful_input.reporting_currency`,
7. `stateful_input.metrics`.

Initial metrics:

1. `VOLATILITY`,
2. `SHARPE`,
3. `SORTINO`,
4. `BETA`,
5. `TRACKING_ERROR`,
6. `INFORMATION_RATIO`,
7. `VAR`.

### Drawdown

Call:

```text
POST /analytics/risk/drawdown
```

Use:

1. `input_mode=stateful`,
2. `analysis_options.include_episode_list=true`,
3. `analysis_options.include_underwater_series=false` for summary first,
4. `include_underwater_series=true` only for expanded detail.

### Rolling Risk

Call:

```text
POST /analytics/risk/rolling-metrics
```

Use:

1. `input_mode=stateful`,
2. default windows `[21, 63, 126, 252]`,
3. `include_time_series=false` for first paint,
4. `include_time_series=true` for detail charts on demand.

### Concentration

Call:

```text
POST /analytics/risk/concentration
```

Use:

1. `input_mode=stateful` when no sandbox session exists,
2. `input_mode=simulation` when the user has an active Workbench sandbox session and wants
   current/proposed concentration,
3. `issuer_grouping_level=ultimate_parent` by default,
4. `enrichment_policy=merge_caller_then_core` by default.

### Historical Risk Attribution

Call:

```text
POST /analytics/risk/historical-attribution
```

Initial use:

1. `input_mode=stateful`,
2. `attribution_types=["TOTAL_RISK"]`,
3. `metrics=["VOLATILITY"]`,
4. groupings: `POSITION`, `ISSUER`, `SECTOR`, `ASSET_CLASS` where supported.

Do not expose `ACTIVE_RISK` as enabled until Gateway supportability proves benchmark exposure
history is available.

## Risk Workspace Component Architecture

Proposed Workbench module structure:

```text
src/apps/performance/risk/
  api/
    risk-workspace-api.ts
    risk-query-keys.ts
  contracts/
    risk-workspace-contract.ts
  view-model/
    risk-summary-view-model.ts
    drawdown-view-model.ts
    rolling-risk-view-model.ts
    concentration-view-model.ts
    risk-attribution-view-model.ts
  components/
    performance-risk-mode.tsx
    risk-workspace-header.tsx
    risk-supportability-rail.tsx
    risk-snapshot-panel.tsx
    drawdown-panel.tsx
    rolling-risk-panel.tsx
    concentration-panel.tsx
    historical-risk-attribution-panel.tsx
    risk-provenance-strip.tsx
    risk-module-state.tsx
  fixtures/
    risk-workspace-fixtures.ts
```

Rules:

1. each panel owns only its display and view-model transformation,
2. query orchestration is centralized in `api/`,
3. cross-panel context is passed through a small typed context object,
4. no panel calls Gateway directly except through shared hooks/api functions,
5. all panels use shared screen state components,
6. all tables use `AnalyticsTable`,
7. all values use shared financial/risk formatters.

## Proposed Implementation Slices

### Slice 1: RFC approval and current-state inventory

Outcome:

1. approved RFC,
2. final inventory of lotus-risk endpoints and Gateway legacy risk usage,
3. no production behavior change.

Tasks:

1. approve this RFC,
2. confirm the `lotus-risk` feature branch baseline,
3. list all Gateway references to `/analytics/workbench/risk-proxy`,
4. list Workbench surfaces that currently mention concentration/risk,
5. confirm whether `Risk` should be a Performance mode or a top-level shell app.

Tests:

1. no code tests required,
2. RFC review checklist must be completed.

Acceptance:

1. stakeholders approve stateful-only UI scope,
2. stakeholders approve removal of the legacy Gateway risk-proxy path,
3. stakeholders approve Performance `Risk` mode placement.

### Slice 2: Gateway legacy risk-proxy removal

Outcome:

1. old Gateway risk-proxy connection is removed,
2. no Workbench UI depends on the removed `/analytics/workbench/risk-proxy` endpoint.

Tasks:

1. remove `get_workbench_risk_proxy`,
2. remove legacy risk-proxy fallback from `WorkbenchService`,
3. replace narrow HHI usage with either:
   - no risk data until the new BFF exists, or
   - a clearly marked placeholder state,
4. update tests to prove Gateway no longer calls `/analytics/workbench/risk-proxy`,
5. update docs if they reference the old path.

Tests:

1. Gateway unit tests for Workbench analytics without risk-proxy fallback,
2. Gateway integration tests proving no legacy path is called,
3. contract grep/guard test if appropriate.

Acceptance:

1. `rg "/analytics/workbench/risk-proxy"` returns no production references,
2. Gateway tests are green,
3. Workbench still renders controlled degraded risk state.

### Slice 3: Gateway Risk BFF foundation

Outcome:

1. Gateway exposes typed stateful risk BFF contracts,
2. Workbench can consume fixture-like live contracts without knowing lotus-risk internals.

Tasks:

1. add Gateway risk contracts,
2. add Gateway risk service,
3. add Gateway risk router endpoints,
4. implement `risk/summary` and `risk/concentration` first,
5. normalize supportability, warnings, and partial failures,
6. add bounded cache keys for repeated identical risk requests,
7. preserve correlation IDs and upstream metadata.

Tests:

1. request-shape unit tests for `lotus-risk` stateful payloads,
2. supportability mapping tests,
3. cache key tests,
4. router integration tests with fake `lotus-risk`,
5. failure-path tests for unavailable risk service.

Acceptance:

1. risk summary and concentration BFF endpoints return stable contracts,
2. no UI needs raw `lotus-risk` response fields,
3. failures are partial/degraded, not page-breaking.

### Slice 4: Workbench Risk mode shell and fixture-backed UI

Outcome:

1. `Risk` appears as a Performance mode,
2. fixture-backed UI proves final composition and interaction model.

Tasks:

1. add `Risk` to shared mode navigation,
2. add `PerformanceRiskMode`,
3. implement header/context/status rail/provenance shell,
4. implement fixture-backed Risk Snapshot and Concentration panels,
5. include all screen states: loading, ready, partial, empty, unavailable, error,
6. keep UI stateful-only in naming and copy.

Tests:

1. unit tests for mode navigation,
2. component tests for Risk shell and supportability rail,
3. view-model tests for fixture data,
4. integration test proving `Risk` mode renders and does not call raw risk endpoints from browser,
5. responsive smoke for no horizontal overflow.

Acceptance:

1. `Risk` mode is visually consistent with `Summary`, `Analysis`, and `Advisor Brief`,
2. no stateless UX is exposed,
3. state handling is complete.

### Slice 5: Live Workbench integration for Risk Snapshot and Concentration

Outcome:

1. Workbench calls Gateway for stateful Risk Snapshot and Concentration.

Tasks:

1. add Workbench API client functions,
2. add query keys and cache policy,
3. wire `RiskSnapshotPanel`,
4. wire `ConcentrationPanel`,
5. show issuer coverage diagnostics,
6. show sandbox concentration delta when `sessionId` exists,
7. add supportability-driven disabled/partial states.

Tests:

1. MSW/fake fetch or integration tests for successful BFF payloads,
2. partial-failure rendering tests,
3. query-key tests if query keys are generated separately,
4. sandbox concentration contract tests.

Acceptance:

1. Risk Snapshot is live through Gateway,
2. Concentration is live through Gateway,
3. portfolio/sandbox context changes invalidate only the relevant risk queries.

### Slice 6: Drawdown module

Outcome:

1. Workbench surfaces stateful drawdown analytics.

Tasks:

1. add Gateway `risk/drawdown`,
2. wire `DrawdownPanel`,
3. render max drawdown, time-under-water, ulcer index, DaR/CDaR,
4. render worst episodes table,
5. add optional underwater series detail on demand,
6. handle benchmark-relative drawdown supportability.

Tests:

1. Gateway request-shape tests,
2. drawdown view-model tests,
3. drawdown panel state tests,
4. table tests for episode sorting and numeric formatting.

Acceptance:

1. advisors can identify drawdown severity in seconds,
2. detailed episode evidence is available without cluttering first paint.

### Slice 7: Rolling Risk module

Outcome:

1. Workbench surfaces stateful rolling risk diagnostics.

Tasks:

1. add Gateway `risk/rolling`,
2. wire `RollingRiskPanel`,
3. render rolling window summaries,
4. add window selector,
5. render quality flags clearly,
6. make time-series detail optional to control payload size and latency.

Tests:

1. Gateway request-shape tests for benchmark/risk-free metric selection,
2. view-model tests for quality flags,
3. component tests for window switching,
4. latency-conscious query tests where practical.

Acceptance:

1. first paint does not request large rolling time series by default,
2. rolling detail is available on demand,
3. benchmark/risk-free unavailability is explicit.

### Slice 8: Historical Risk Attribution module

Outcome:

1. Workbench surfaces stateful total-risk attribution.

Tasks:

1. add Gateway `risk/attribution`,
2. wire `HistoricalRiskAttributionPanel`,
3. expose `TOTAL_RISK` initially,
4. keep `ACTIVE_RISK` disabled/blocked until supportability says benchmark exposure history is
   ready,
5. render contributors and residual diagnostics,
6. make grouping dimensions switchable when supported.

Tests:

1. Gateway request-shape tests for `TOTAL_RISK`,
2. blocked-state tests for `ACTIVE_RISK`,
3. contributor table tests,
4. residual formatting tests.

Acceptance:

1. total-risk contributors are visible,
2. active-risk is not falsely represented as available,
3. blocked-state copy explains the benchmark exposure-history dependency.

### Slice 9: Portfolio and Advisor Brief cross-links

Outcome:

1. Portfolio and Advisor Brief can reference the Risk Workspace without duplicating it.

Tasks:

1. add `Open Risk` actions from Portfolio readiness/concentration areas,
2. link concentration exceptions to Risk mode,
3. allow Advisor Brief source metrics to include risk facts only when Gateway evidence exists,
4. avoid duplicating full risk modules in Portfolio.

Tests:

1. Portfolio link tests,
2. Advisor Brief evidence gating tests,
3. route query parameter tests for opening Risk mode.

Acceptance:

1. Portfolio remains summary-first,
2. Risk remains the analytical drilldown home,
3. Advisor Brief cites risk only when evidence is source-grounded.

### Slice 10: Production hardening and RFC closeout

Outcome:

1. end-to-end risk UI is production-ready for the approved v1 scope.

Tasks:

1. run cross-repo validation,
2. update docs and capability matrix,
3. add runbook notes for risk supportability,
4. mark RFC implemented only after Gateway, Workbench, and relevant risk contracts are validated,
5. remove any fixture-only code paths not explicitly intended as degraded fallback.

Tests:

1. Workbench lint/typecheck/unit/integration/e2e smoke,
2. Gateway unit/integration tests,
3. lotus-risk existing branch tests as reference, without modifying uncommitted hardening work,
4. live local platform probe if services are available.

Acceptance:

1. all required CI checks pass,
2. no old risk-proxy references remain,
3. Risk mode supports stateful-only UI paths,
4. supportability behavior is explicit and auditable,
5. RFC status can move from `PROPOSED` to `IMPLEMENTED`.

## UI Quality Bar

The Risk Workspace must feel:

1. banking-grade,
2. sophisticated,
3. analytical,
4. calm,
5. evidence-led,
6. precise,
7. modular,
8. not a generic dashboard.

Required UI characteristics:

1. executive metric hierarchy,
2. dense but legible risk facts,
3. compact supportability rail,
4. clear provenance,
5. no decorative charting,
6. no consumer AI/chat styling,
7. strong empty/partial/unavailable states,
8. no unexplained technical flags in advisor-facing copy.

## Performance and Latency Requirements

Risk modules can become expensive if requested monolithically.

Rules:

1. first paint should request only summary-sized payloads,
2. drawdown underwater series is detail-on-demand,
3. rolling time-series output is detail-on-demand,
4. historical attribution is lazy-loaded after the main risk snapshot,
5. repeated identical Gateway requests should be cached briefly,
6. module refresh should be independent where possible,
7. a failed heavy module must not block the whole Risk mode.

## Accessibility Requirements

1. all tabbed navigation uses semantic tab roles,
2. every chart-like module has textual metric summaries,
3. supportability state is not color-only,
4. tables have meaningful headers and numeric alignment,
5. disabled/blocked `ACTIVE_RISK` has clear explanatory text,
6. focus states use the shared RFC-0021 focus treatment.

## Risks

1. building UI before Gateway contracts could create throwaway view models,
2. calling all risk endpoints at first paint could create high latency,
3. surfacing active-risk attribution too early could mislead users,
4. legacy risk-proxy compatibility could hide integration debt,
5. risk terms could become too technical for advisors if raw engine vocabulary leaks.

## Mitigations

1. Gateway BFF contract is mandatory before live UI integration,
2. initial UI shell can be fixture-backed but must match Gateway-shaped contracts,
3. heavy modules are lazy or detail-on-demand,
4. active-risk attribution is supportability-gated,
5. old risk-proxy endpoint is removed, not wrapped,
6. UI copy is reviewed for advisor-facing business language.

## Definition of Done

This RFC can be marked `IMPLEMENTED` only when:

1. old Gateway `/analytics/workbench/risk-proxy` usage is removed,
2. Gateway exposes new stateful Risk BFF endpoints,
3. Workbench has a first-class `Risk` mode,
4. UI surfaces only stateful risk execution, except concentration simulation linked to sandbox
   context,
5. Risk Snapshot, Drawdown, Rolling Risk, Concentration, and Total-Risk Attribution are rendered
   with supportability states,
6. active-risk attribution is blocked/gated until benchmark exposure history is available,
7. Portfolio links into Risk without duplicating full risk analytics,
8. all new panels use RFC-0021 shared primitives,
9. tests cover contracts, state handling, supportability, cache behavior, and navigation,
10. CI is green across affected repos,
11. docs and runbooks describe the v1 risk UI behavior and limitations.

## Approval Requested

Approve this RFC if the team agrees that:

1. Workbench should add a first-class `Risk` analytical mode,
2. the UI should surface only stateful risk API flows,
3. concentration simulation is allowed only when tied to an active sandbox/session context,
4. the old Gateway risk-proxy connection should be fully removed,
5. the implementation must proceed through modular, shared-system-aligned slices rather than a
   monolithic dashboard build.
