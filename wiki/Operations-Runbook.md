# Operations Runbook

## Important operational checks

- use `workbench.dev.lotus` and `gateway.dev.lotus` for canonical product proof
- use seeded portfolio `PB_SG_GLOBAL_BAL_001` unless the slice explicitly targets another dataset
- keep diagnostic screenshots separate from final demo evidence
- validate the canonical stack before treating screenshots as review-ready
- treat capability-disabled shell entries as contract truth, not as something to work around in
  demo documentation

## Practical runtime flow

```powershell
npm run live:stack:up
npm run live:validate
npm run live:stack:down
```

## Browser-facing probes

```txt
http://workbench.dev.lotus/portfolio
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
```

## Analytics UI observability posture

- RFC-0108 analytics UI observability vocabulary is code-owned in
  `src/features/analytics-observability/contract.ts`.
- Workbench emits first-wave local analytics UI metric events for selected performance summary,
  performance details, and risk summary reads through `src/features/analytics-observability/metrics.ts`.
- Workbench emits bounded local attention events and the
  `lotus_analytics_ui_attention_events_total` counter for stale, degraded, partial-source, and
  repeated-failure states on those selected analytics panels. Attention labels are deduplicated and
  limited to governed route, panel, service, operation, state, reason, freshness, supportability,
  attention type, and severity fields.
- `/api/metrics` exposes the implemented Workbench analytics UI metric families in Prometheus text
  format for platform scrape and dashboard/alert contracts.
- Do not add panel, route, or browser telemetry labels outside that contract.
- `portfolio_id`, `client_id`, `client_name`, `holding_id`, `transaction_id`, `trace_id`,
  `correlation_id`, request bodies, response bodies, and screen content must not become metric
  labels or browser event fields.
- Gateway/backend metrics, audit events, and canonical browser proof remain planned until later
  RFC-0108 slices promote them with evidence.

## Output paths

- screenshots and summary:
  `output/playwright/live-canonical/`
- machine-readable summary:
  `output/playwright/live-canonical/live-validation-summary.json`

## Review-ready evidence

- use canonical validated captures for demos, PR review, and operator handoff
- keep pre-validation captures clearly labeled as diagnostic artifacts only
- when a route exists but is capability-disabled, capture the supported active path instead of the
  dormant compatibility page

## Key references

- [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- [docs/demo/README.md](../docs/demo/README.md)
