# Report Job Invocation Posture

This note records the RFC-0100 and RFC-0104 Workbench adoption decisions.

## Current State

`lotus-workbench` does not directly initiate standalone portfolio review report-generation jobs.
It now exposes a bounded RFC-0104 batch operation for the current portfolio through the governed
gateway batch API.

Current reporting usage is:

- `src/features/workbench/api.ts`
  calls `/reports/{portfolioId}/snapshot` and `/report-batches` through the Workbench BFF/gateway
  path, and calls `/documents/{documentId}` plus `/documents/{documentId}/download` through the
  same BFF/gateway boundary for archived report retrieval.
- `src/app/workbench/[portfolioId]/page.tsx`
  renders the reporting snapshot panel when the gateway snapshot call succeeds and the report batch
  operations panel for explicit single-portfolio PDF batch materialization/status/run-once plus
  archived document metadata/download lookup.
  The optional route query `?asOfDate=YYYY-MM-DD` selects the report date for snapshot and batch
  operations; `?benchmark=<backend benchmark code>` is passed into the batch request options.

Code search on the RFC-0104 Workbench branch found no direct Workbench calls to:

- `report.dev.lotus`
- `/reports/portfolios/{portfolio_id}/review`

## Decision

No direct `lotus-report` Workbench integration is allowed.

Workbench reporting actions must call `lotus-gateway` only:

- `POST /api/v1/report-batches`
- `GET /api/v1/report-batches/{batch_id}`
- `POST /api/v1/report-batches/{batch_id}:run-once`
- `GET /api/v1/documents/{document_id}`
- `GET /api/v1/documents/{document_id}/download`
- `POST /api/v1/reports/portfolio-reviews`
- `GET /api/v1/report-jobs/{job_id}`
- `POST /api/v1/report-jobs/{job_id}/cancel` when cancellation is exposed

Workbench must not call `lotus-report` directly for report job creation, status, cancellation,
rendering, or archive retrieval. Workbench must also not call `lotus-archive` directly; archived
document metadata and binary downloads remain Gateway-owned product routes.

For canonical RFC-0104 proof, use an implemented report date and backend benchmark identity such as
`/workbench/PB_SG_GLOBAL_BAL_001?asOfDate=2026-04-22&benchmark=BMK_PB_GLOBAL_BALANCED_60_40`.
The page distinguishes portfolio data date from report date when they differ.

## Validation Evidence

Validation performed for this decision:

```powershell
rg -n "portfolio.*review|report batch|report-batches|report job|report_job|reports/portfolio|lotus-report|report\\.dev|/reports|portfolio-reviews|report-jobs" src tests docs README.md REPOSITORY-ENGINEERING-CONTEXT.md
```

The search shows reporting snapshot and batch operation consumption through gateway, with no direct
`lotus-report` service invocation from Workbench.
