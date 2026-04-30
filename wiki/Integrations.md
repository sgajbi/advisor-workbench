# Integrations

## Primary backend posture

- `lotus-gateway`
  primary backend contract for product flows

## Canonical local runtime participants

- `lotus-core`
- `lotus-performance`
- `lotus-risk`
- `lotus-ai`
- `lotus-advise`
- `lotus-manage`
- `lotus-report`
- `lotus-gateway`
- `lotus-workbench`

## Canonical local identities

- workbench:
  `http://workbench.dev.lotus`
- gateway:
  `http://gateway.dev.lotus`

## Contract notes

1. gateway-first integration is the default
2. `/api/bff/*` is an internal bridge, not a second product API authority
3. canonical front-office validation depends on governed `*.dev.lotus` routing and seeded data
4. shell navigation supportability is informed by gateway-backed capability posture rather than by
   the mere existence of historical routes
5. Performance advisor-brief workflow-pack run posture and RFC-0097 task-flow lineage are rendered
   from gateway payloads; Workbench does not infer replacement lineage from narrative text or local
   fallback previews
6. RFC-0104 report batch operations use `/api/bff/api/v1/report-batches` only; Workbench does not
   call `lotus-report` directly for batch materialization, status, or bounded run-once execution
7. report batch materialization, status, and bounded run-once responses consume Gateway-preserved
   `report.observability.evidence_surface_supportability` metadata and emit only bounded
   freshness/supportability observability labels
8. Workbench report batch proof may use `/workbench/<portfolioId>?asOfDate=YYYY-MM-DD&benchmark=<backend benchmark code>`;
   the route keeps portfolio data date and report batch date visibly distinct when they differ
9. Archived report metadata and binary downloads use Gateway `/api/v1/documents/{document_id}` and
   `/api/v1/documents/{document_id}/download` through `/api/bff/api/v1/documents/*`; Workbench
   does not call `lotus-archive` directly, and the BFF preserves binary responses and integrity
   headers for PDF downloads
10. RFC-0108 analytics UI observability is centralized in
    `src/features/analytics-observability/metrics.ts`. Supported Portfolio, Intake, Performance,
    Risk, Reporting, Data Products, and legacy advisor Workbench gateway-backed reads/mutations
    emit bounded route, panel, operation, freshness, and supportability labels only; portfolio,
    intake payload, document, session, trace, request, response, and screen-content identifiers
    must not appear in metric labels.
