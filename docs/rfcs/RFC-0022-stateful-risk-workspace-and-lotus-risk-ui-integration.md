# RFC-0022: Stateful Risk Workspace and lotus-risk UI Integration

- Status: APPROVED
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

This RFC is intentionally not a dashboard request. It is a cross-repo integration and UI
architecture proposal. The implementation must create a durable risk capability seam that future
Workbench, Advisor Brief, Portfolio, Reporting, and Suitability surfaces can consume without
reintroducing direct service calls, page-local risk vocabulary, or bespoke risk panels.

## Approval Posture

Approval should be treated as approval for these hard decisions:

1. `Risk` becomes a first-class Performance workspace mode for v1.
2. Workbench surfaces only stateful risk execution, except sandbox-linked concentration simulation.
3. Gateway owns the front-office Risk BFF contract.
4. The old Gateway `/analytics/workbench/risk-proxy` integration is removed, not wrapped.
5. `ACTIVE_RISK` attribution is blocked until benchmark exposure-history supportability is proven.
6. Each risk module is delivered as an independently testable slice using RFC-0021 shared primitives.

Approval should not be treated as approval for:

1. a top-level standalone `Risk` app in this RFC,
2. direct browser-to-`lotus-risk` calls,
3. stateless request builders or user-uploaded return series in Workbench,
4. fixture-only risk panels that remain after live Gateway contracts exist,
5. speculative charting or decorative visuals without advisor decision value.

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

Verified legacy-removal inventory at RFC time:

| Area | Current reference | Required disposition |
|---|---|---|
| Gateway client | `src/app/clients/lotus_analytics_client.py#get_workbench_risk_proxy` | Delete and replace with typed risk client methods for canonical `lotus-risk` routes. |
| Gateway service | `src/app/services/workbench_service.py` `riskProxy` merge/fallback logic | Remove legacy proxy merge. Replace downstream HHI usage with new concentration BFF contract. |
| Gateway contract | `src/app/contracts/workbench.py` `WorkbenchRiskProxy` | Retire only when no active Workbench contract needs the field; otherwise mark as legacy/degraded until new contract cutover. |
| Gateway tests | `tests/integration/test_workbench_router.py`, `tests/unit/test_workbench_service*.py` risk-proxy assertions | Replace with degraded-state and new Risk BFF assertions. |
| Workbench app | `src/app/workbench/[portfolioId]/page.tsx` reads `analytics.risk_proxy` | Remove after Risk BFF concentration source is available. |
| Workbench types/tests | `src/features/workbench/types.ts`, `tests/integration/workbench-page.test.tsx`, `tests/unit/workbench-api.test.ts` | Replace `risk_proxy` display assumptions with new BFF risk contracts or controlled unavailable state. |
| lotus-risk docs | `docs/domain-apis/legacy-endpoints.md` marks endpoint removed | Keep as historical source of truth; do not reintroduce compatibility. |

### lotus-workbench

Current Workbench posture:

1. `Portfolio` has limited concentration/readiness copy,
2. `Workbench` has a narrow HHI signal,
3. `Performance` has strong summary, analysis, advisor brief, and evidence modes,
4. no first-class Risk mode exists,
5. RFC-0021 shared UI architecture is available and must be used for the new risk surface.

## Non-Goals

This RFC explicitly does not cover:

1. building a new standalone top-level Risk application shell,
2. changing `lotus-risk` analytics formulas or methodology,
3. exposing stateless or caller-supplied data entry in Workbench,
4. replacing Performance attribution with risk attribution,
5. adding AI-generated risk commentary before source-grounded risk facts exist,
6. building a charting system independent of RFC-0021 shared primitives,
7. changing portfolio valuation, transaction, or benchmark source-of-truth ownership,
8. shipping a compatibility shim for `/analytics/workbench/risk-proxy`.

## Cross-Repo Ownership

| Concern | Owning repo | Rule |
|---|---|---|
| Risk analytics computation | `lotus-risk` | Workbench and Gateway must not recompute metrics. |
| Front-office BFF contracts | `lotus-gateway` | Gateway owns stateful request construction, supportability, caching, and display-shaped contracts. |
| UI composition and interaction | `lotus-workbench` | Workbench owns presentation, navigation, module state, and shared design-system conformance. |
| Capability aggregation and runtime wiring | `lotus-platform` | Platform owns service routing and local/deployed capability health. |
| Benchmark and exposure source data | `lotus-core` / `lotus-performance` via service contracts | Risk UI must gate unavailable benchmark/exposure facts rather than infer them. |

Any implementation that moves computation into Workbench, bypasses Gateway, or duplicates risk
methodology in the UI violates this RFC.

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

The preferred implementation is split-first:

1. `risk/summary` and `risk/concentration` are first-paint candidates,
2. `risk/drawdown`, `risk/rolling`, and `risk/attribution` are module-level queries,
3. an aggregate endpoint may exist only if it reuses the same services and does not become a second
   contract dialect.

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

Parameter rules:

1. `period` must map to a bounded, documented reporting period, not an arbitrary free-form label.
2. `detailBasis` must align with existing Workbench performance basis naming where possible.
3. `benchmarkCode` is optional in request shape but required for benchmark-relative metrics to be
   `ready`.
4. `sessionId` must only affect concentration simulation; it must not silently change other risk
   modules.
5. `asOfDate` and reporting period must be echoed back by Gateway after normalization.

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

Contract envelope direction:

```ts
type WorkbenchRiskModuleState = "ready" | "partial" | "unavailable" | "blocked";

type WorkbenchRiskSupportabilityState =
  | "ready"
  | "partial"
  | "unavailable"
  | "blocked";

type WorkbenchRiskSupportabilityItem = {
  key: string;
  label: string;
  state: WorkbenchRiskSupportabilityState;
  reason?: string;
  sourceService?: "lotus-risk" | "lotus-performance" | "lotus-core" | "lotus-gateway";
};

type WorkbenchRiskModuleEnvelope<TPayload> = {
  contractVersion: "risk-workspace.v1";
  correlationId: string;
  portfolioId: string;
  period: string;
  asOfDate: string;
  benchmarkCode?: string | null;
  sourceService: "lotus-risk";
  state: WorkbenchRiskModuleState;
  payload: TPayload | null;
  supportability: WorkbenchRiskSupportabilityItem[];
  warnings: string[];
  partialFailures: Array<{
    sourceService: string;
    code: string;
    message: string;
  }>;
  metadata: {
    generatedAt: string;
    methodologyVersion?: string | null;
    inputMode: "stateful" | "simulation";
    cacheStatus?: "hit" | "miss" | "bypass";
  };
};
```

The exact language may evolve during implementation, but the shape must preserve these principles:

1. one envelope per module,
2. state and supportability are first-class,
3. `payload` can be absent without the page failing,
4. raw engine enum leakage is mapped before reaching display components,
5. input mode is auditable.

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

### Micro-Frontend-Style Boundaries

Each risk module must be independently movable and testable:

1. `api/` owns BFF calls, query keys, and cache/refetch rules.
2. `contracts/` owns TypeScript DTOs matching Gateway responses.
3. `view-model/` owns risk-specific display mapping and business copy.
4. `components/` owns rendering and shared primitive composition.
5. `fixtures/` owns representative BFF-shaped payloads for tests and Storybook-like future usage.

Forbidden dependencies:

1. panel components importing raw Gateway fetch helpers directly,
2. panels importing other panel view models,
3. view models importing React,
4. Gateway DTO parsing inside JSX,
5. risk-specific CSS classes that duplicate RFC-0021 primitives without an explicit reason.

### Risk-Specific Shared Formatters

Add shared risk formatters only when existing financial formatters do not cover the domain:

1. volatility and tracking error as percentages,
2. Sharpe, Sortino, beta, and information ratio as ratios,
3. VaR and expected shortfall with currency/percentage mode based on Gateway contract,
4. HHI as an index score with optional interpretation band,
5. time-under-water as duration,
6. attribution contribution as percentage contribution or risk units based on metric.

Formatter tests must include negative values, missing values, zero, extreme concentration values,
and precision expectations.

## Common Quality Gates for Every Slice

Every implementation slice after approval must provide:

1. a small, meaningful commit or commit set scoped to that slice,
2. unit tests for transformed business logic, not only render smoke tests,
3. at least one failure/partial/unavailable-state test for any new runtime path,
4. no direct browser-to-`lotus-risk` URL references,
5. no production reference to `/analytics/workbench/risk-proxy` after Slice 2,
6. `npm run lint` and `npm run typecheck` for Workbench slices,
7. Gateway lint and focused unit/integration tests for Gateway slices,
8. documentation update when behavior, supportability, or operator workflow changes,
9. explicit branch-clean status before moving to the next slice.

Do not move to the next slice if the current slice has uncommitted changes, failing focused tests,
or hidden fixture-only behavior that will block live integration.

## Proposed Implementation Slices

### Slice 1: RFC approval and current-state inventory

Status: completed on 2026-04-07.

Evidence:

1. Slice 1 inventory artifact:
   `docs/architecture/RFC-0022-SLICE-1-RISK-WORKSPACE-INVENTORY.md`
2. Workbench architectural guard:
   `tests/unit/rfc0022-risk-architecture-guard.test.ts`
3. Approval scope captured in this RFC's `Approval Posture`, `Non-Goals`,
   `Cross-Repo Ownership`, and `Requirement Traceability` sections.

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
2. RFC review checklist must be completed,
3. inventory grep evidence must be recorded in the implementation notes before Slice 2 starts.

Acceptance:

1. stakeholders approve stateful-only UI scope,
2. stakeholders approve removal of the legacy Gateway risk-proxy path,
3. stakeholders approve Performance `Risk` mode placement.
4. stakeholders accept that `ACTIVE_RISK` remains blocked unless supportability proves readiness.

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
3. contract grep/guard test if appropriate,
4. Workbench tests proving old HHI panels degrade cleanly if the new BFF is not yet wired.

Acceptance:

1. `rg "/analytics/workbench/risk-proxy"` returns no production references,
2. Gateway tests are green,
3. Workbench still renders controlled degraded risk state,
4. no compatibility shim or alias endpoint is introduced.

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
3. failures are partial/degraded, not page-breaking,
4. supportability explains missing benchmark, risk-free, issuer, or sandbox dependencies.

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
5. responsive smoke for no horizontal overflow,
6. accessibility assertions for tab semantics and blocked-state explanatory copy.

Acceptance:

1. `Risk` mode is visually consistent with `Summary`, `Analysis`, and `Advisor Brief`,
2. no stateless UX is exposed,
3. state handling is complete,
4. first-paint panels remain useful when detail modules are still loading.

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
4. sandbox concentration contract tests,
5. cache/refetch tests proving portfolio, period, basis, benchmark, and session changes invalidate
   the correct query scope.

Acceptance:

1. Risk Snapshot is live through Gateway,
2. Concentration is live through Gateway,
3. portfolio/sandbox context changes invalidate only the relevant risk queries,
4. concentration simulation is impossible without an explicit sandbox/session context.

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
4. table tests for episode sorting and numeric formatting,
5. detail-on-demand tests proving underwater series is not requested for first paint.

Acceptance:

1. advisors can identify drawdown severity in seconds,
2. detailed episode evidence is available without cluttering first paint,
3. benchmark-relative drawdown is gated when benchmark series is unavailable.

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
4. latency-conscious query tests where practical,
5. tests proving time-series detail is opt-in and not loaded by default.

Acceptance:

1. first paint does not request large rolling time series by default,
2. rolling detail is available on demand,
3. benchmark/risk-free unavailability is explicit,
4. window switching does not refresh unrelated risk modules.

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
4. residual formatting tests,
5. grouping selector tests proving unavailable groupings are disabled with clear rationale.

Acceptance:

1. total-risk contributors are visible,
2. active-risk is not falsely represented as available,
3. blocked-state copy explains the benchmark exposure-history dependency,
4. contributor sorting and residual rows are deterministic.

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
3. route query parameter tests for opening Risk mode,
4. tests proving Advisor Brief does not cite risk facts when Gateway risk evidence is absent.

Acceptance:

1. Portfolio remains summary-first,
2. Risk remains the analytical drilldown home,
3. Advisor Brief cites risk only when evidence is source-grounded,
4. no duplicated risk tables appear in Portfolio.

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
4. live local platform probe if services are available,
5. cross-repo grep guard for old risk-proxy path and browser-to-risk direct calls.

Acceptance:

1. all required CI checks pass,
2. no old risk-proxy references remain,
3. Risk mode supports stateful-only UI paths,
4. supportability behavior is explicit and auditable,
5. RFC status can move from `PROPOSED` to `IMPLEMENTED`,
6. all affected repos are left on clean branches after merge.

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

Target latency posture:

1. Risk mode shell should render immediately from existing Performance context.
2. Risk Snapshot and Concentration should be optimized for first useful paint.
3. Drawdown, Rolling Risk, and Attribution should not block first useful paint.
4. Detail expansions should use module-level queries and preserve existing module content during
   refresh.
5. Cache TTLs must be short and explicit because risk data is as-of and portfolio-context sensitive.
6. Cache keys must include portfolio, period, basis, benchmark, as-of date, reporting currency, and
   sandbox session where relevant.

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
5. risk terms could become too technical for advisors if raw engine vocabulary leaks,
6. partial benchmark/risk-free/source-data coverage could make the UI look broken if supportability
   is not designed first,
7. a monolithic risk endpoint could become slow and hard to reason about,
8. duplicated Portfolio and Performance risk displays could create inconsistent decisions.

## Mitigations

1. Gateway BFF contract is mandatory before live UI integration,
2. initial UI shell can be fixture-backed but must match Gateway-shaped contracts,
3. heavy modules are lazy or detail-on-demand,
4. active-risk attribution is supportability-gated,
5. old risk-proxy endpoint is removed, not wrapped,
6. UI copy is reviewed for advisor-facing business language,
7. supportability rail is implemented before complex detail modules,
8. Portfolio only links to Risk and surfaces minimal exceptions,
9. module-level query boundaries are preserved.

## Requirement Traceability

| Requirement | RFC decision | Primary implementation evidence expected |
|---|---|---|
| Use all `lotus-risk` features | Risk Snapshot, Drawdown, Rolling Risk, Concentration, Historical Risk Attribution panels | Gateway BFF endpoints and Workbench modules for all five panels. |
| UI is stateful-only | Browser exposes no stateless request builders; Gateway constructs stateful requests | Gateway request-shape tests and Workbench copy/tests. |
| Remove old risk-proxy | Delete old Gateway client/service path and Workbench consumers | Grep guard plus Gateway/Workbench tests. |
| Micro-frontend-style UI | `src/apps/performance/risk/*` isolated api/contracts/view-model/components/fixtures | Folder structure and panel-level tests. |
| Shared UI system | RFC-0021 primitives mandatory | Component imports and integration tests. |
| Banking-grade UX | Summary first, supportability rail, provenance, detail on demand | Risk mode browser/integration tests and visual review. |
| Simulation support | Concentration simulation only with sandbox session | Concentration Gateway and Workbench session tests. |
| Active-risk safety | `ACTIVE_RISK` blocked until exposure-history supportability is ready | Attribution blocked-state tests. |
| Performance | Split queries, lazy heavy modules, bounded cache | Query-key/cache tests and live probe evidence. |
| Advisor Brief/Portfolio integration | Links/evidence only, no duplicated full risk workspace | Route/evidence gating tests. |

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
