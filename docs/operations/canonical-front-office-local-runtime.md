# Canonical Front-Office Local Runtime

This runbook defines the repeatable local operator flow for bringing up the front-office Lotus
stack, seeding governed portfolio data, and validating that the supported Workbench screens and
panels render live data through canonical hostnames.

## Scope

This flow covers the local experience for:

- `lotus-core`
- `lotus-performance`
- `lotus-risk`
- `lotus-ai`
- `lotus-advise`
- `lotus-manage`
- `lotus-report`
- `lotus-archive`
- `lotus-render`
- `lotus-gateway`
- `lotus-workbench`
- direct ingress via `*.dev.lotus`

Reference seeded portfolio:

- portfolio: `PB_SG_GLOBAL_BAL_001`
- benchmark: `BMK_PB_GLOBAL_BALANCED_60_40`

## Canonical local prerequisites

Required canonical host mappings on the host:

```txt
127.0.0.1 workbench.dev.lotus
127.0.0.1 gateway.dev.lotus
127.0.0.1 performance.dev.lotus
127.0.0.1 risk.dev.lotus
127.0.0.1 advise.dev.lotus
127.0.0.1 manage.dev.lotus
127.0.0.1 report.dev.lotus
127.0.0.1 archive.dev.lotus
127.0.0.1 render.dev.lotus
127.0.0.1 core-query.dev.lotus
127.0.0.1 core-control.dev.lotus
127.0.0.1 core-ingestion.dev.lotus
127.0.0.1 ai.dev.lotus
```

Important:

- The canonical host block should be managed from `lotus-platform`, not edited ad hoc.
- `ai.dev.lotus` must be present if you want full canonical hostname validation for direct AI
  probing.
- Workbench already enforces canonical BFF addressing. `BFF_BASE_URL` must not use `localhost`,
  `127.0.0.1`, or `0.0.0.0`.

Preview the managed hosts block:

```powershell
powershell -ExecutionPolicy Bypass -File ..\\..\\lotus-platform\\automation\\Sync-Dev-Ingress-Hosts.ps1
```

Apply the managed hosts block from an elevated shell:

```powershell
powershell -ExecutionPolicy Bypass -File ..\\..\\lotus-platform\\automation\\Sync-Dev-Ingress-Hosts.ps1 -Apply
```

If elevation is not available, the script stages a merged preview under `lotus-platform/output/hosts-preview/`
so the exact required block can still be reviewed and applied manually.

Direct Administrator fallback:

```powershell
powershell -ExecutionPolicy Bypass -Command "Add-Content -Path 'C:\Windows\System32\drivers\etc\hosts' -Value \"`n127.0.0.1 workbench.dev.lotus`n127.0.0.1 gateway.dev.lotus`n127.0.0.1 performance.dev.lotus`n127.0.0.1 risk.dev.lotus`n127.0.0.1 advise.dev.lotus`n127.0.0.1 manage.dev.lotus`n127.0.0.1 report.dev.lotus`n127.0.0.1 archive.dev.lotus`n127.0.0.1 render.dev.lotus`n127.0.0.1 core-query.dev.lotus`n127.0.0.1 core-control.dev.lotus`n127.0.0.1 core-ingestion.dev.lotus`n127.0.0.1 ai.dev.lotus\""
```

Workbench local environment:

```txt
BFF_BASE_URL=http://gateway.dev.lotus
```

For `-LocalApps workbench`, this value must win over any stale `.env.local` entry. If Workbench
BFF routes return `500` and the local dev log shows `ECONNREFUSED` against `127.0.0.1:8111` or
`localhost:8111`, restart the Workbench dev server with `BFF_BASE_URL=http://gateway.dev.lotus` or
correct `.env.local` before collecting evidence. Canonical proof must travel through the governed
`gateway.dev.lotus` ingress boundary.

## Canonical bring-up

From `lotus-workbench`:

```powershell
npm run live:stack:up
```

That script performs:

1. preview the canonical hosts block from `lotus-platform`
2. `docker compose up -d` for `lotus-core`, `lotus-performance`, `lotus-risk`, `lotus-ai`, `lotus-advise`, `lotus-manage`, `lotus-report`, `lotus-archive`, and `lotus-render`
3. `docker compose up -d` for `lotus-gateway`
4. direct ingress restart on port `80` using `lotus-platform/platform-stack/dev-ingress/Caddyfile.direct-host`
5. canonical `lotus-gateway` exposure on port `8100`
6. governed `lotus-core` seed for `PB_SG_GLOBAL_BAL_001`
7. `docker compose up -d` for `lotus-workbench` on port `3000`

Docker is the default for every canonical front-office app. The startup flow replaces stale local
listeners on canonical app ports before Docker startup, while leaving Docker-owned listeners in
place. This avoids stale local dev servers blocking Docker without terminating Docker port proxies.

For active RFC or UI development, pass `-LocalApps` with a comma-separated app list. Local apps use
the same canonical hostnames and public ports as Docker-backed apps, so live evidence remains
comparable:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/live/Start-LotusFrontOfficeCanonical.ps1 -LocalApps workbench
powershell -ExecutionPolicy Bypass -File scripts/live/Start-LotusFrontOfficeCanonical.ps1 -LocalApps workbench,gateway,manage
```

Workbench-focused development can also use:

```powershell
npm run live:stack:up:workbench-local
```

Core/manage RFC proof can use a narrower governed bring-up path:

```powershell
npm run live:stack:up:core-manage
```

This mode still uses the canonical hosts block, starts Docker-backed `lotus-core`, starts
`lotus-manage` on the canonical coexistence port `8001`, restarts direct ingress, and runs the
governed `PB_SG_GLOBAL_BAL_001` core seed in ingest-only mode. It intentionally skips `lotus-performance`,
`lotus-risk`, `lotus-ai`, `lotus-advise`, `lotus-report`, `lotus-archive`, `lotus-render`,
`lotus-gateway`, and `lotus-workbench`. Use it only for API-level RFC proof where the evidence
target is core source-data products plus manage APIs, not populated Workbench screenshots or
gateway-mediated product flows.

When the proof depends on local `lotus-manage` or `lotus-core` code that has changed since the
last Docker image build, use the build variant so the evidence cannot accidentally validate a stale
container image:

```powershell
npm run live:stack:up:core-manage:build
```

The core/manage proof mode starts Docker-backed `lotus-manage` with the explicit stateful sourcing
posture required by the validator:

- `DPM_CAP_INPUT_MODE_PORTFOLIO_ID_ENABLED=true`
- `DPM_STATEFUL_CORE_SOURCING_ENABLED=true`
- `DPM_CORE_BASE_URL=http://host.docker.internal:8202` and
  `DPM_CORE_QUERY_BASE_URL=http://host.docker.internal:8201` for Docker-backed manage

Local manage overrides use the canonical host URL `http://core-control.dev.lotus` for the same
source-data authority. This keeps capability truth aligned with the proof target: stateful mode
should be advertised only when the managed core source path is actually configured.

The command exits after the stack is usable. It does not block on browser validation.
Non-zero seed or upstream startup failures must fail the PowerShell command; a partial bring-up is
not considered success.

Use this path when you want to bring the product up quickly, inspect it manually, or restart the
runtime without waiting for the full validation lane to finish.

The canonical bring-up script also accepts `-SeedWaitSeconds` when the governed seed needs a longer
drain window than the default `900` seconds.

When validating after Workbench source changes or after a merge that changed Workbench routes,
panels, labels, or live-validation scripts, refresh the Workbench runtime before accepting evidence.
Use either the source-backed local app path:

```powershell
npm run live:stack:up:workbench-local
```

or rebuild the Docker-backed Workbench image when proving the containerized runtime:

```powershell
docker compose up -d --build
```

from `lotus-workbench` while the canonical backend stack is running. A stale Workbench container can
render old panel labels and create false live-validation failures or, worse, false proof against an
older UI. Diagnostic screenshots taken before this refresh must stay separate from demo-ready
evidence.

The canonical bring-up script accepts `-LotusAiEnvFile` to make the `lotus-ai` provider posture
explicit for proof runs. It defaults to `.env.example` for deterministic provider-disabled
front-office proof, even when the local `lotus-ai/.env` requests a live or local provider. Use
`canonical-stub.env.example` when the proof target includes RFC-0023/RFC-0024 workflow-pack
execution through `lotus-advise` and no local model server is intentionally running. Use the
repo-local `.env` only when the required live provider dependency, such as the `local-llm` Ollama
compose profile and model, is intentionally running.

When a prior local RFC-086 load/performance run has left stale `lotus-core` Kafka or Postgres
state behind, use `-CleanCoreState` on the startup script to run `docker compose down -v
--remove-orphans` in `lotus-core` before the canonical rebuild and reseed. This reset is explicit
because routine front-office bring-up only seeds the governed `PB_SG_GLOBAL_BAL_001` portfolio and
does not include the separate `1000`-portfolio load scenario.

## Canonical bring-up with validation

From `lotus-workbench`:

```powershell
npm run live:stack:up:validate
```

This runs the same bring-up flow and then executes the end-to-end validation lane once the stack
is live.

## One-command teardown

To stop the canonical local stack cleanly:

```powershell
npm run live:stack:down
```

That script:

1. stops canonical host processes on `3000`, `8001`, `8100`, `8111`, `8150`, and `8310` while preserving Docker-owned listeners
2. removes direct ingress if it is present
3. runs `docker compose down` for `lotus-core`, `lotus-performance`, `lotus-risk`, `lotus-ai`, `lotus-advise`, `lotus-manage`, `lotus-report`, `lotus-archive`, `lotus-render`, `lotus-gateway`, and `lotus-workbench`

## Canonical validation

To validate an already-running canonical stack:

```powershell
npm run live:validate
```

This is the preferred operator path after `npm run live:stack:up` because it keeps service startup
separate from readiness, browser, and screenshot evidence gathering.

To write demo screenshots to a caller-provided directory:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/live/Validate-LotusFrontOfficeCanonical.ps1 `
  -ScreenshotDirectory C:\Users\Sandeep\AppData\Local\Temp\lotus-risk-module-shots
```

Validation layers:

1. canonical hostname resolution
2. direct backend readiness and capability checks for:
   - `lotus-manage`
   - `lotus-report`
   - `lotus-archive`
   - `lotus-render`
   - `lotus-manage` action-register supportability summary through
     `GET /api/v1/rebalance/supportability/summary`
3. Gateway and Workbench route readiness
4. live Gateway contracts for:
   - foundation workspace
   - platform capabilities
   - workbench overview
   - performance summary
   - performance details
   - risk summary
   - risk concentration
   - risk drawdown
   - risk rolling
   - risk attribution
   - advisor brief
   - advisor-brief workflow-pack review actions for `ACCEPT`, `REVISE`, and `SUPERSEDE`
   - proposal creation with advisor-review narrative request
   - proposal narrative review and reviewed report-package request
5. browser-level validation for populated UI on:
   - Portfolio summary
   - Portfolio detailed
   - Performance summary
   - Performance analysis
   - Performance advisor brief
   - Proposal narrative posture
   - Performance risk
   - Performance evidence
   - DPM outcome review
   - DPM proof pack
   - DPM command center
   - DPM portfolio memory
   - DPM rebalance-wave command center
   - DPM Core candidate-source wave preview and no-caller-portfolio guard
   - DPM construction alternatives
   - DPM PM operating quality
   - DPM PM copilot workspace

Screenshots are written to:

```txt
output/playwright/live-canonical/
```

When `-ScreenshotDirectory` is supplied, screenshots and the live validation summary are written to
that directory instead. The summary records structured screenshot evidence for each capture:
stable file name, absolute path, route, panel identifier, portfolio ID, benchmark ID, as-of date,
and demo readiness state. The validator also writes `SHOT-INDEX.md` in the screenshot directory so
demo reviewers can quickly identify the captured product surfaces.

The machine-readable summary also records `workflowPackChecks` for the advisor-brief live path and
RFC-0023 proposal narrative proof. Advisor-brief checks prove initial workflow-pack run visibility
plus bounded `ACCEPT`, `REVISE`, and `SUPERSEDE` review transitions with replacement lineage
through the live `lotus-workbench` -> `lotus-gateway` -> `lotus-ai` contract chain. Proposal
narrative checks prove Gateway-backed proposal creation with an advisor-review narrative request,
Workbench advisor-use narrative review, reviewed report-package request, source narrative hash
visibility, and screenshot evidence for `proposal.narrative_posture`. Proposal memo checks prove
the RFC-0024 memo/evidence-pack surface can create or replay an advisor-use memo, record advisor-use
review, request memo report-package posture, request non-authoritative commentary, preserve replay
hash visibility, and capture governed screenshot evidence for `proposal.memo_evidence_pack`.

For DPM PM operating quality, validation creates and re-reads Manage-backed evidence through
Gateway before classifying the panel as ready: score run, source-defined fairness analysis,
bounded supervisory review action, and governed summary invocation. The browser proof then checks
the persisted summary-invocation detail and list surface. This prevents a false ready claim when
the PM quality endpoints are reachable but the canonical stack has no persisted operating-quality
evidence.

For bounded RFC37-WTBD-004 candidate-source proof, validation now previews a
`BULK_REVIEW_CAMPAIGN` wave through Gateway with
`campaign_candidate_source=CORE_DPM_PORTFOLIO_UNIVERSE`, requires lotus-core
`DpmPortfolioUniverseCandidate:v1` source refs and at least one candidate item, and separately
proves that a mixed Core-discovery/manual-portfolio request is rejected. This validates the
implemented source-consumer guard without claiming relationship householding, global portfolio
universe ownership, PM ranking, client communication workflow, OMS, fills, settlement, or
execution.

Machine-readable validation evidence is written to:

```txt
output/playwright/live-canonical/live-validation-summary.json
```

After validation passes, capture the companion operations and non-functional evidence pack:

```powershell
npm run live:evidence
```

This writes a timestamped pack under:

```txt
output/observability-live/<timestamp>/
```

The pack includes canonical DNS resolution, container inventory, readiness and representative API
outputs, Workbench Prometheus metrics, Prometheus/Grafana API samples, bounded container log tails,
and screenshots for Workbench evidence views plus Prometheus/Grafana entrypoints. Use this for
offline demo preparation and operational investigation documentation. It complements
`live-validation-summary.json`; it does not replace the governed validation pass. The manifest
records the validation summary path and whether it existed at capture time, and it separates
application API checks from metrics and dashboard HTTP samples so reviewers can audit the evidence
without guessing the directory layout.

Before presenting a pack, review `observability-evidence-manifest.json` and the captured Gateway
overview for warnings or partial failures. Manage supportability must return HTTP `200`; a freshly
started stack may report `supportability.state=empty` when no management actions have been
recorded, but an HTTP `503` indicates the Postgres-backed supportability store is not ready and the
pack is diagnostic only.

For RFC-0108 performance evidence review, pair the screenshots with bounded logs and timing
signals:

- Workbench BFF logs should show the performance BFF route and elapsed timing for summary,
  details, attribution trend, and related split endpoints.
- Gateway and performance logs should preserve `correlation_id`, `request_id`, and `trace_id`
  through `analytics_ui.gateway`, fanout, audit, and compute events.
- Gateway payloads may truthfully classify evidence lineage as partial when lineage materialization
  is pending or a lineage manifest is absent. In that state Workbench must show the Evidence panel
  as `PARTIAL`/`PENDING` rather than treating the route as fully certified.
- Use repeated lineage `404` entries as investigation evidence only when the canonical performance
  route, calculation outputs, and validation summary are otherwise green.

The machine-readable summary also records the governed canonical contract identity and version from
`lotus-platform/context/contracts/canonical-front-office-demo-data-contract.json`. If the
platform contract file is unavailable, the validator emits a deterministic fallback that still
identifies the run as governed by `RFC-0076`, instead of silently dropping contract provenance.

The validator also loads the governed panel registry from
`lotus-platform/context/contracts/workbench-panel-registry.json`. That registry controls the
expected panel identifiers, allowed panel states, and screenshot ownership under `RFC-0077`, so
new panel work must extend the registry instead of introducing ad hoc validator metadata.

The validator implementation is intentionally modular under `scripts/live/validation/`:
contract metadata, probe behavior, calculation sanity, browser workflows, and panel-governance
rules are separated so future changes extend the correct boundary instead of re-growing a single
monolithic validation script.

The validation script runs the browser validator from the `lotus-workbench` repository root so
these artifact paths are stable even when `lotus-platform` or another orchestrator calls the
script. Browser validation failures must fail the PowerShell command. The Manage action-register
supportability summary is recorded as source-supportability evidence, including stale state and
reason when present; DPM panel proof is gated by the command-center, wave, outcome-review, proof-pack,
portfolio-memory, construction-alternatives, PM operating-quality, and PM copilot workspace contracts
instead of failing on unrelated historical action-register freshness.

When validating active Workbench source changes, use `npm run live:stack:up:workbench-local` or
`Start-LotusFrontOfficeCanonical.ps1 -LocalApps workbench` before collecting final browser proof.
That path keeps the canonical backend stack but serves Workbench from the current branch, avoiding
stale Docker image evidence for newly added panels or selectors.

The DPM mandate command-center panel is screenshot-ready only when Gateway returns a canonical
populated `READY` supportability posture. Partial, degraded, blocked, and empty command-center
supportability must not collapse into a false ready panel. Do not treat partial screenshot output
as successful evidence.

The summary includes `calculationChecks` for canonical performance and risk sanity. These checks
assert numeric ranges, contribution reconciliation, governed attribution fallback posture, risk
observation coverage, concentration coverage, rolling-window availability, and historical risk
attribution residuals before screenshots are accepted as demo evidence.

The summary also includes `supportabilityChecks` for Gateway-backed source supportability evidence.
For performance and risk payloads, the validator records the bounded source service set, item count,
stale count, partial count, action-required count, and aggregate supportability state derived from
Gateway `source_supportability` arrays. Stale source supportability takes precedence over fresh
source supportability so browser proof cannot mask upstream freshness degradation.

The summary also includes `panelClassifications` for the product surfaces validated during the run.
Panels must be classified as `ready`, `partial`, `unavailable`, or another explicit governed state.
The validator fails if a supported panel is recorded as blank without a governed empty, partial, or
unavailable posture.
The summary also includes a `supportabilityMatrix` with registered versus classified panel counts,
required and observed supportability-state counts, owning-service counts, non-ready panel evidence,
and missing-panel evidence. Reviewers should inspect this matrix before accepting screenshots as
demo-ready proof, because it shows whether the run covered both ready panels and governed bounded
partial/degraded states.

The summary also includes `rfc3643FeatureCoverage`, a feature-by-feature evidence matrix for the
implemented RFC-0036 through RFC-0043 front-office product paths. Each row maps the RFC feature to
the API, workflow-pack, seeded entity, and Workbench panel evidence that made the feature
demo-ready. Rows that support adjacent front-office proposal proof, such as RFC-0024 proposal
memo/evidence-pack validation, are marked with `auditScope=adjacent-front-office` and counted
separately from the RFC36-43 feature totals. RFC36-43 validation fails only on rows with
`auditScope=rfc36-43`; adjacent proof gaps remain visible through the aggregate and adjacent gap
counts without being treated as RFC36-43 implementation regressions. The matrix is not a blanket future-scope
certification: it records the current scenario scope, now including the governed RFC-0041
multi-portfolio explicit-list wave preview from the canonical contract and the RFC-0037 bounded
Core `DpmPortfolioUniverseCandidate:v1` candidate-source preview/no-caller-portfolio guard. Broader
source-owner cohort products remain listed as scenario expansion until their source products and
downstream realization are proven.

## Gateway startup rule

Canonical local Gateway startup must use the governed script when `gateway` is listed in
`-LocalApps`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Start-CanonicalGateway.ps1 -Port 8100
```

Do not start the local Gateway with a bare:

```powershell
python -m uvicorn app.main:app --port 8100
```

without `--app-dir src`.

Failure mode:

- `/health/ready` returns `200`
- canonical Workbench data routes return `404`
- the wrong installed `app` package was loaded instead of the current repository checkout

The canonical Gateway start script fixes this by always launching:

```powershell
python -m uvicorn app.main:app --app-dir src --host 0.0.0.0 --port 8100
```

## lotus-manage coexistence rule

`lotus-advise` and `lotus-manage` both default to host port `8000` if started naively.

To keep the ecosystem up together:

- `lotus-advise` remains on `8000`
- Docker-backed `lotus-manage` publishes container port `8000` to host port `8001` through
  `LOTUS_MANAGE_HOST_PORT=8001`
- local override `lotus-manage` also runs on `8001`
- direct ingress maps `http://manage.dev.lotus` to `host.docker.internal:8001`

Use:

```powershell
powershell -ExecutionPolicy Bypass -File ..\\..\\lotus-manage\\scripts\\Start-CanonicalManage.ps1 -Port 8001
```

## What the browser validator checks

For `PB_SG_GLOBAL_BAL_001`, the validator confirms:

- Portfolio summary:
  - portfolio shell renders
  - top holdings chart contains ranked rows
  - allocation donut renders
- Portfolio detailed:
  - detailed mode opens
  - `Transactions` loads
  - `Projected Cashflow` loads
  - the transactions grid shell renders
  - the projected cashflow summary renders
- Performance summary:
  - `Net Return Path` loads
  - `Performance Drivers` loads
  - return path table has data rows
- Performance analysis:
  - `Attribution Over Time` renders
  - `Attribution Detail` table is populated
  - `Performance Drivers` table is populated
  - contribution rows reconcile to the net portfolio return
  - attribution detail is populated or carries a governed partial fallback
- Advisor Brief:
  - talking points render
  - source metrics render
  - source evidence actions render
  - the Workbench `Accept Brief` action records a bounded review transition through the live
    gateway and lotus-ai path
- Risk:
  - `Risk Snapshot`
  - `Drawdown`
  - `Concentration`
  - `Rolling Risk`
  - `Historical Risk Attribution`
  - attribution table is populated
  - summary metrics have sufficient observations and ready benchmark-relative metrics
  - concentration has issuer coverage and top-exposure evidence
  - drawdown has underwater-series evidence
  - rolling risk has all configured windows and enough computable windows for the current horizon
  - historical attribution contributors reconcile with a negligible residual
- Evidence:
  - Evidence mode opens
  - evidence support strip or truthful degraded state renders

## Current local limitation

If `ai.dev.lotus` is not mapped in the host DNS/hosts file, direct canonical probing of the AI
service from the host will fail even if:

- the `lotus-ai` container is healthy
- the Gateway advisor-brief route still succeeds through its configured runtime path

The validator warns about missing `ai.dev.lotus` hostname resolution so this gap is visible instead
of silently ignored.
