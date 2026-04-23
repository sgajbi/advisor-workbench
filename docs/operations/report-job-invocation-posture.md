# Report Job Invocation Posture

This note records the RFC-0100 Workbench adoption decision.

## Current State

`lotus-workbench` does not currently initiate portfolio review report-generation jobs.

Current reporting usage is limited to gateway-owned reporting snapshot reads:

- `src/features/workbench/api.ts`
  calls `/reports/{portfolioId}/snapshot` through the Workbench BFF/gateway path.
- `src/app/workbench/[portfolioId]/page.tsx`
  renders the reporting snapshot panel when the gateway snapshot call succeeds.

Code search on the RFC-0100 branch found no Workbench calls to:

- `report.dev.lotus`
- `/reports/portfolio-reviews`
- `/api/v1/report-jobs`
- `/reports/portfolios/{portfolio_id}/review`

## Decision

No Workbench code change is required for RFC-0100.

When Workbench later adds a user-facing portfolio review generation action, it must call
`lotus-gateway` only:

- `POST /api/v1/reports/portfolio-reviews`
- `GET /api/v1/report-jobs/{job_id}`
- `POST /api/v1/report-jobs/{job_id}/cancel` when cancellation is exposed

Workbench must not call `lotus-report` directly for report job creation, status, cancellation,
rendering, or archive retrieval.

## Validation Evidence

Validation performed for this decision:

```powershell
rg -n "portfolio.*review|report job|report_job|reports/portfolio|lotus-report|report\\.dev|/reports|portfolio-reviews|report-jobs" src tests docs README.md REPOSITORY-ENGINEERING-CONTEXT.md
```

The search showed reporting snapshot consumption through gateway, but no report-generation job
submission flow to migrate.
