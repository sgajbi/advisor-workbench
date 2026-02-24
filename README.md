# advisor-workbench

Unified UI for advisor workflows, currently scoped to DPM proposal simulation.

## Contribution Standards

- Contribution process: `CONTRIBUTING.md`
- Docs-with-code standard: `docs/documentation/implementation-documentation-standard.md`
- PR checklist template: `.github/pull_request_template.md`
- Platform-wide architecture governance source: `https://github.com/sgajbi/pbwm-platform-docs`

## Standard Frontend Stack

- Next.js (App Router)
- React + TypeScript
- TanStack Query
- MUI
- AG Grid
- ECharts
- React Hook Form
- Zod

## Quickstart

```bash
npm install
npm run dev
```

Open `http://localhost:3000/proposals/simulate`.

Set `BFF_BASE_URL` to point to `advisor-experience-api`.

## Current Routes

- `/proposals/simulate` - simulate and save draft proposal
- `/proposals` - proposal workspace list
- `/proposals/[proposalId]` - proposal detail with submit/approval/consent actions and workflow timeline
- `/workbench/[portfolioId]` - portfolio 360, sandbox projections, backend analytics, and reporting snapshot

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
- Targeted PAS refresh: `npm run auto:refresh:pas -- query_service demo_data_loader`
