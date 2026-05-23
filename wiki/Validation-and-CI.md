# Validation and CI

## Lane model

`lotus-workbench` uses:

1. `Remote Feature Lane`
2. `Pull Request Merge Gate`
3. `Main Releasability Gate`

## Local command mapping

- `make check`
  lint, typecheck, coverage-backed test gate, build
- `make test-e2e`
  Playwright smoke validation
- `make ci-local-docker`
  Docker parity
- `npm run live:validate`
  canonical integrated product validation
- `npm run live:validate:construction`
  focused RFC-0039 construction alternatives proof against the running canonical stack
- `npm run live:evidence`
  post-validation observability, logging, metrics, API, and dashboard evidence capture
- `npm audit --json`
  dependency advisory posture for the Workbench runtime and test toolchain; canonical proof logs
  should not carry unresolved critical or high dependency findings

## What the gates protect

- real app-surface coverage across the active product paths
- browser smoke for supported front-office flows
- Docker parity for production-like runtime assumptions
- canonical seeded-data validation for integrated product proof
- dependency posture for browser-delivered code and the Node-based build/test toolchain

## Evidence posture

- canonical browser validation writes screenshots and structured summary output under
  `output/playwright/live-canonical/`
- construction alternatives live proof writes focused machine-readable evidence and a panel
  screenshot under `output/rfc39-wtbd002-construction-lab/construction-live/`
- observability evidence capture writes local non-functional proof packs under
  `output/observability-live/<timestamp>/`
- final visual review should use canonical validated captures, not pre-validation diagnostics

## Canonical live validation coverage

The governed front-office validation flow checks the seeded `PB_SG_GLOBAL_BAL_001` runtime across:

- portfolio summary and detailed surfaces
- performance summary and analysis surfaces
- advisor-brief and risk modes inside the performance experience
- evidence-oriented product validation paths that are part of the current governed runtime
