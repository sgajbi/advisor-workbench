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

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Set `BFF_BASE_URL` to point to `lotus-gateway`.

## Current Routes

- `/proposals/simulate` - simulate and save draft proposal
- `/proposals` - proposal workspace list
- `/proposals/[proposalId]` - proposal detail with submit/approval/consent actions and workflow timeline
- `/workbench/[portfolioId]` - portfolio 360, sandbox projections, backend analytics, and reporting snapshot

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

