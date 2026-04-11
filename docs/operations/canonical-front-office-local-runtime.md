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
powershell -ExecutionPolicy Bypass -Command "Add-Content -Path 'C:\Windows\System32\drivers\etc\hosts' -Value \"`n127.0.0.1 workbench.dev.lotus`n127.0.0.1 gateway.dev.lotus`n127.0.0.1 performance.dev.lotus`n127.0.0.1 risk.dev.lotus`n127.0.0.1 advise.dev.lotus`n127.0.0.1 manage.dev.lotus`n127.0.0.1 report.dev.lotus`n127.0.0.1 core-query.dev.lotus`n127.0.0.1 core-control.dev.lotus`n127.0.0.1 core-ingestion.dev.lotus`n127.0.0.1 ai.dev.lotus\""
```

Workbench local environment:

```txt
BFF_BASE_URL=http://gateway.dev.lotus
```

## One-command bring-up

From `lotus-workbench`:

```powershell
npm run live:stack:up
```

That script performs:

1. preview the canonical hosts block from `lotus-platform`
2. `docker compose up -d` for `lotus-core`, `lotus-performance`, `lotus-risk`, `lotus-ai`, and `lotus-advise`
3. `docker compose up -d` for `lotus-report`
4. direct ingress restart on port `80` using `lotus-platform/platform-stack/dev-ingress/Caddyfile.direct-host`
5. canonical `lotus-gateway` startup on port `8111`
6. governed `lotus-core` seed for `PB_SG_GLOBAL_BAL_001`
7. canonical host-process startup for `lotus-manage` on `8001`
8. canonical `lotus-workbench` startup on port `3000`
9. end-to-end validation of canonical routes and populated UI panels

## One-command teardown

To stop the canonical local stack cleanly:

```powershell
npm run live:stack:down
```

That script:

1. stops canonical host processes on `3000`, `8001`, and `8111`
2. removes direct ingress if it is present
3. runs `docker compose down` for `lotus-core`, `lotus-performance`, `lotus-risk`, `lotus-ai`, `lotus-advise`, `lotus-manage`, and `lotus-report`

## One-command validation

To validate an already-running stack:

```powershell
npm run live:validate
```

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
5. browser-level validation for populated UI on:
   - Portfolio summary
   - Portfolio detailed
   - Performance summary
   - Performance analysis
   - Performance advisor brief
   - Performance risk
   - Performance evidence

Screenshots are written to:

```txt
output/playwright/live-canonical/
```

When `-ScreenshotDirectory` is supplied, screenshots and the live validation summary are written to
that directory instead. The summary records structured screenshot evidence for each capture:
stable file name, absolute path, route, panel identifier, portfolio ID, benchmark ID, as-of date,
and demo readiness state. The validator also writes `SHOT-INDEX.md` in the screenshot directory so
demo reviewers can quickly identify the captured product surfaces.

Machine-readable validation evidence is written to:

```txt
output/playwright/live-canonical/live-validation-summary.json
```

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
script. Browser validation failures must fail the PowerShell command; do not treat stale summaries
or partial screenshot output as successful evidence.

The summary includes `calculationChecks` for canonical performance and risk sanity. These checks
assert numeric ranges, contribution reconciliation, governed attribution fallback posture, risk
observation coverage, concentration coverage, rolling-window availability, and historical risk
attribution residuals before screenshots are accepted as demo evidence.

The summary also includes `panelClassifications` for the product surfaces validated during the run.
Panels must be classified as `ready`, `partial`, `unavailable`, or another explicit governed state.
The validator fails if a supported panel is recorded as blank without a governed empty, partial, or
unavailable posture.

## Gateway startup rule

Canonical local Gateway startup must use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/Start-CanonicalGateway.ps1
```

Do not start the local Gateway with a bare:

```powershell
python -m uvicorn app.main:app --port 8111
```

without `--app-dir src`.

Failure mode:

- `/health/ready` returns `200`
- canonical Workbench data routes return `404`
- the wrong installed `app` package was loaded instead of the current repository checkout

The canonical Gateway start script fixes this by always launching:

```powershell
python -m uvicorn app.main:app --app-dir src --host 0.0.0.0 --port 8111
```

## lotus-manage coexistence rule

`lotus-advise` and `lotus-manage` both default to host port `8000` if started naively.

To keep the ecosystem up together:

- `lotus-advise` remains on `8000`
- `lotus-manage` runs as a host process on `8001`
- direct ingress maps `http://manage.dev.lotus` to `host.docker.internal:8001`

Use:

```powershell
powershell -ExecutionPolicy Bypass -File ..\\..\\lotus-manage\\scripts\\Start-CanonicalManage.ps1
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
