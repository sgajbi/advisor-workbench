# lotus-workbench

Unified product workspace for the Lotus ecosystem, evolving from proposal-first slices into a
world-class multi-application operating surface for portfolio, analytics, risk, proposal,
management, and reporting workflows.

## Contribution Standards

- Contribution process: `CONTRIBUTING.md`
- Docs-with-code standard: `docs/documentation/implementation-documentation-standard.md`
- PR checklist template: `.github/pull_request_template.md`
- Platform-wide architecture governance source: `https://github.com/sgajbi/lotus-platform`

## Standard Frontend Stack

- Next.js (App Router)
- React + TypeScript
- TanStack Query
- MUI
- AG Grid
- ECharts
- React Hook Form
- Zod

## Architecture Direction

- Product architecture blueprint:
  `docs/documentation/product-architecture-blueprint.md`
- Platform-wide architecture governance source:
  `https://github.com/sgajbi/lotus-platform`
- Current RFC history:
  `docs/rfcs/README.md`

## Design System Foundation

- Shared frontend primitives live in `src/design-system/`
- Shared shell composition lives in `src/shell/`
- New product surfaces should prefer design-system primitives over page-local structural markup
- The current reference implementation is the `Portfolio` surface under `src/apps/portfolio/`

## App Package Direction

- `src/app/` owns route mounting only
- `src/apps/home/` owns the home entry redirect
- `src/apps/portfolio/` owns the portfolio workspace
- `src/apps/performance/` owns the performance entry behavior
- `src/apps/recommendations/` owns the recommendations entry behavior

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `BFF_BASE_URL` to point to `lotus-gateway`.

## Quality Gate

Frontend changes are expected to pass a hard CI gate before merge.

Required layers:

- unit and integration tests through Vitest coverage
- Playwright smoke checks against a built Next.js app
- lint, typecheck, and production build validation

Current enforced coverage thresholds in `vitest.config.ts`:

- lines: `99`
- statements: `99`
- functions: `99`
- branches: `95`

The current protected coverage surface is intentionally explicit and limited to core route entrypoints,
shell composition, and shared design-system primitives that already have meaningful tests. Future UI
refactors are expected to expand that protected surface rather than dilute the gate.

Local commands:

```bash
make test-coverage
make test-e2e
make check
```

CI must pass before merge.

## Live Performance Demo

The current flagship demo path is the benchmark-aware performance workstation:

- UI: `http://127.0.0.1:3000/performance`
- Gateway: `http://127.0.0.1:8100`
- Required upstreams:
  - `lotus-core` query: `http://127.0.0.1:8201`
  - `lotus-core` control plane: `http://127.0.0.1:8202`
  - `lotus-performance`: `http://127.0.0.1:8002`

Flagship seeded mandate and benchmarks:

- portfolio: `DEMO_ADV_USD_001`
- assigned benchmark: `BMK_GLOBAL_BALANCED_60_40` (`Global Balanced 60/40`)
- alternate benchmark: `BMK_GLOBAL_GROWTH_80_20` (`Global Growth 80/20`)

Expected live behavior:

- the `Performance` route first paints benchmark-aware summary context immediately
- the chart stage supports horizon, explicit dates, basis, frequency, and benchmark switching
- the lower analytical canvas refreshes independently for heavy analytical modules
- the multi-horizon comparison module shows `MTD`, `QTD`, `YTD`, and `1Y`
- attribution-over-time, contribution, and relative segment analytics use real gateway data

## Current Routes

- `/portfolio` - primary portfolio review surface for holdings, allocation, readiness, and next actions
- `/performance` - front-office entry route for performance review
- `/recommendations` - front-office entry route for investment recommendations
- `/proposals/simulate` - recommendation drafting flow
- `/proposals` - recommendation workspace list
- `/proposals/[proposalId]` - recommendation detail with submit/approval/consent actions and workflow timeline
- `/workbench/[portfolioId]` - legacy operational console compatibility route

These routes are the current implementation baseline, not the final product topology. The target
future direction is an app-shell model documented in
`docs/documentation/product-architecture-blueprint.md`.

## Docker

```bash
make docker-up
make docker-down

make ci-local-docker
make ci-local-docker-down
```

## Demo Pack

- `docs/demo/README.md`
- `docs/demo/scripts/demo-ui-approval-chain.md`

## Automation

- Automation runbook: `docs/automation/Automation-Ecosystem.md`
- One-shot pulse (sync + PR monitor): `npm run auto:pulse`
- Sync all repositories: `npm run auto:sync`
- Monitor open PRs (`author:@me`): `npm run auto:pr`
- Continuous agent loop with status feed: `npm run auto:agent`
- Single agent iteration: `npm run auto:agent:once`
- Targeted lotus-core refresh: `npm run auto:refresh:pas -- query_service demo_data_loader`

