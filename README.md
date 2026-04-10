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

Open `http://workbench.dev.lotus`.

Preferred local entry points follow the RFC-0071 service identity model:

- Workbench: `http://workbench.dev.lotus`
- Gateway: `http://gateway.dev.lotus`

Set `BFF_BASE_URL` to the environment-scoped gateway URL, for example `http://gateway.dev.lotus`.

Canonical local runtime and live validation:

- Runbook: `docs/operations/canonical-front-office-local-runtime.md`
- Manage the canonical `*.dev.lotus` hosts block from `lotus-platform` with
  `automation/Sync-Dev-Ingress-Hosts.ps1`
- Bring up the full front-office stack and validate it:

```bash
npm run live:stack:up
```

- Bring the canonical stack down cleanly:

```bash
npm run live:stack:down
```

- Validate an already-running canonical stack:

```bash
npm run live:validate
```

The live validator writes browser screenshots and a machine-readable validation artifact to:

```txt
output/playwright/live-canonical/
```

## Quality Gate

Frontend changes are expected to pass a hard CI gate before merge.

Lane model:

- `Remote Feature Lane`: lint, typecheck, and fast `npm run test`
- `Pull Request Merge Gate`: lint, typecheck, coverage, build, Playwright smoke, Docker validation, and local Docker parity
- `Main Releasability Gate`: reruns the PR-grade gate on `main` with retained artifacts

Required layers:

- unit and integration tests through Vitest coverage
- Playwright smoke checks against a built Next.js app
- lint, typecheck, and production build validation

Current enforced coverage thresholds in `vitest.config.ts`:

- lines: `86`
- statements: `86`
- functions: `70`
- branches: `74`

Coverage is enforced against the real application surface, not a hand-picked subset. The Vitest
coverage include set spans:

- `src/app/**/*.ts`
- `src/app/**/*.tsx`
- `src/apps/**/*.ts`
- `src/apps/**/*.tsx`
- `src/design-system/**/*.ts`
- `src/design-system/**/*.tsx`
- `src/features/**/*.ts`
- `src/features/**/*.tsx`
- `src/shell/**/*.ts`
- `src/shell/**/*.tsx`

This is a temporary baseline for the broadened real-app surface. Future refactors are expected to
raise it from here, not narrow the protected surface.

Local commands:

```bash
make test-coverage
make test-e2e
make check
```

CI must pass before merge.

## Live Performance Demo

The current flagship demo path is the benchmark-aware performance workstation:

- UI: `http://workbench.dev.lotus/performance`
- Gateway: `http://gateway.dev.lotus`
- Required upstreams:
  - `lotus-core` query: `http://core-query.dev.lotus`
  - `lotus-core` control plane: `http://core-control.dev.lotus`
  - `lotus-core` ingestion: `http://core-ingestion.dev.lotus`
  - `lotus-performance`: `http://performance.dev.lotus`
  - `lotus-ai`: `http://ai.dev.lotus`

Flagship seeded mandate and benchmarks:

- portfolio: `PB_SG_GLOBAL_BAL_001`
- assigned benchmark: `BMK_PB_GLOBAL_BALANCED_60_40` (`Private Banking Global Balanced 60/40`)
- alternate benchmark: `BMK_GLOBAL_BALANCED_60_40` (`Global Balanced 60/40`)

Expected live behavior:

- the `Performance` route first paints benchmark-aware summary context immediately
- the chart stage supports horizon, explicit dates, basis, frequency, and benchmark switching
- the lower analytical canvas refreshes independently for heavy analytical modules
- the multi-horizon comparison module shows `MTD`, `QTD`, `YTD`, and `1Y`
- attribution-over-time, contribution, and relative segment analytics use real gateway data
- `Advisor Brief` is a third Performance mode that fetches a source-grounded brief from Gateway,
  shows evidence-backed talking points and drill-down actions, and degrades to truthful partial
  or unavailable states when `lotus-ai` or source analytics are not ready

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

