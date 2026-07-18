# Report Ordering And Job Invocation Posture

This note records the supported Workbench reporting boundary after issues #449 and #458.

## Supported Business Workflow

The portfolio-scoped Report Centre is mounted at:

```text
/reports?portfolioId=PB_SG_GLOBAL_BAL_001
```

It supports an advisor or portfolio manager who needs to:

1. review firm-approved report choices for the selected portfolio,
2. set the report date and optional reporting currency,
3. choose supported sections and an output that is currently ready,
4. review the complete request before submission,
5. submit one idempotent portfolio-review request,
6. monitor recent report-data jobs without treating completion as archive or client delivery.

Workbench calls only Gateway-backed routes through its same-origin BFF:

- `GET /api/v1/report-ordering/options`
- `POST /api/v1/reports/portfolio-reviews`
- `GET /api/v1/report-jobs`

The BFF removes browser-supplied reporting authority headers, derives the development caller role
and portfolio entitlement from server configuration, and rejects unentitled scopes before calling
Gateway. Outside explicit development environments, report ordering fails closed until an
authenticated-principal resolver is available.

## Output And Lifecycle Truth

Output readiness is source-owned and independent by format:

- structured report data can be available while a governed PDF is unavailable,
- an unavailable format remains visible with business-facing support copy,
- `completed` means report data is complete,
- archive, retention, advisor approval, client delivery, and client communication remain separate
  downstream states.

Reports created by advisory or portfolio-management source workflows are shown as workflow-managed
evidence. Workbench does not present them as directly orderable reports.

## Unsupported Browser Controls

Workbench does not expose browser controls for:

- report-batch materialization,
- report worker `:run-once` execution,
- browser-defined worker capacity or runtime load,
- ad hoc archive-document lookup,
- direct document download,
- client distribution or communication.

The obsolete technical panel, client helpers, response types, metrics, and self-referential tests
were retired under #449 and #458.

## Authority Configuration

Canonical local development uses:

```text
LOTUS_ENVIRONMENT=dev
WORKBENCH_REPORTING_AUTH_MODE=development_configured
WORKBENCH_REPORTING_CALLER_ROLE=client_advisor
WORKBENCH_REPORTING_CALLER_PORTFOLIO_IDS=PB_SG_GLOBAL_BAL_001
```

Allowed configured roles are `client_advisor` and `portfolio_manager`. Browser headers never
grant reporting authority.

## Service Boundary

No direct `lotus-report`, `lotus-render`, or `lotus-archive` Workbench integration is allowed.
Report catalogue, request acceptance, job lifecycle, render readiness, archive truth, retention,
and delivery state remain owned by their source services and are exposed to Workbench only through
Gateway contracts.

## Validation

Run the focused contract and workflow checks:

```powershell
npm test -- --run tests/unit/report-ordering-contracts.test.ts tests/unit/report-ordering-api.test.ts tests/unit/report-ordering-view-model.test.ts tests/unit/use-report-ordering-workflow.test.tsx tests/integration/report-ordering-workspace.test.tsx tests/integration/reports-page.test.tsx tests/unit/bff-route.test.ts
npm run lint
npm run typecheck
npm run build
```

For integrated proof, use the canonical front-office sequence:

```powershell
npm run live:stack:up
npm run live:validate
npm run live:stack:down
```

Do not capture or publish demo-ready screenshots before canonical API, calculation, and panel
validation pass.
