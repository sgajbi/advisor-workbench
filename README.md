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

