# advisor-workbench

Unified UI for advisor workflows, currently scoped to DPM proposal simulation.

## Contribution Standards

- Contribution process: `CONTRIBUTING.md`
- Docs-with-code standard: `docs/documentation/implementation-documentation-standard.md`
- PR checklist template: `.github/pull_request_template.md`

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
- `/proposals/[proposalId]` - proposal detail and submit-for-review action
