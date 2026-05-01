# Observability Evidence

This page defines the repeatable evidence pack for showing functional and non-functional front-office
runtime capabilities from the live canonical stack. It is intended for offline client-demo preparation,
operator onboarding, and future incident-investigation walkthroughs.

## Evidence Rule

Run validation first:

```powershell
npm run live:validate
```

Only use screenshots as demo-ready evidence after the governed validation passes for
`PB_SG_GLOBAL_BAL_001`. If validation fails, the capture may still be useful for diagnosis, but it
must be described as diagnostic evidence.

## Capture Command

From `lotus-workbench`:

```powershell
npm run live:evidence
```

The command writes a timestamped pack under:

```txt
output/observability-live/<timestamp>/
```

The output directory is intentionally local evidence and should not be committed by default.

## What The Pack Contains

- `observability-evidence-manifest.json`: machine-readable index of everything captured
- `README.md`: human-readable artifact index
- `validation`: manifest section linking the pack to the latest
  `output/playwright/live-canonical/live-validation-summary.json`
- `dns.json`: canonical hostname resolution evidence
- `docker-ps.txt` and `docker-ps.json`: live container inventory and health status
- `api/`: readiness, capability, and representative Gateway API outputs
- `metrics/`: Workbench Prometheus text metrics plus Prometheus and Grafana API samples
- `logs/`: bounded container log tails for investigation walkthroughs
- `screenshots/`: Workbench evidence/risk views plus Prometheus and Grafana screenshots

## Demonstrating Functional Capabilities

Use the API samples to show that the UI is backed by live services rather than static mock data:

- Gateway platform capabilities
- Gateway Workbench overview
- performance summary
- risk summary
- advisor brief
- Manage integration capabilities
- Report integration capabilities
- Archive and Render readiness

These files are useful in offline demos because they preserve the actual response shape used by
Workbench and Gateway during the proof run.

## Demonstrating Non-Functional Capabilities

Use the non-functional artifacts to explain how teams operate the stack:

- container inventory proves which apps and support services were live
- readiness samples show health/readiness posture by app
- Workbench `/api/metrics` shows Prometheus-formatted UI observability metrics
- Prometheus target and `up` query samples show scrape posture
- Grafana health and screenshots show dashboard entrypoint posture
- bounded log tails show where operators start when investigating Gateway, Workbench, Core,
  Performance, Risk, Manage, Report, Archive, Render, and AI behavior

## Evidence Quality Checks

Before using a pack in client or operator material, review it for obvious degradation:

- `dns.json` has no `error` entries for canonical `*.dev.lotus` hosts
- API capture records are HTTP `2xx`; Gateway overview has empty `warnings` and
  `partial_failures`
- `api/manage-ready.json` and Manage supportability evidence prove the management backing store is
  ready, not only that `/docs` is reachable
- `metrics/prometheus-targets.json` has active scrape targets without `lastError`
- `logs/*.log` are raw container logs and do not contain PowerShell wrapper markers such as
  `NativeCommandError`, `CategoryInfo`, or `FullyQualifiedErrorId`
- screenshots are paired with `npm run live:validate` evidence from the same live stack window
- `observability-evidence-manifest.json` has `validation.summaryExists=true` and separates
  application `apiChecks` from dashboard and metrics `metricChecks`

## Performance Trace Review

When reviewing RFC-0108 performance evidence, do not stop at screenshots:

- Workbench BFF logs should include elapsed timing for performance summary, details, attribution
  trend, and related split endpoints.
- Gateway logs should include `analytics_ui.gateway` fanout and audit events with stable
  `correlation_id`, `request_id`, and `trace_id` fields.
- Performance service logs should show the same correlation/trace chain reaching compute events.
- Evidence partial states are valid only when the UI surfaces the partial posture and the payload
  explains the lineage limitation. A pending lineage manifest or lineage lookup `404` may be
  acceptable for the current local canonical stack, but only if the canonical performance route,
  calculations, and validation summary are otherwise green.

Current residual to classify honestly:

- Performance evidence lineage may be reported as partial while lotus-performance materializes
  lineage records. In that state the Workbench evidence panel should show
  `PERFORMANCE_EVIDENCE_PARTIAL`, and bounded logs may include lineage lookup `404` entries. Treat
  that as a known functional residual only when the canonical performance route, Gateway overview,
  and validation summary are otherwise green. It is not acceptable for the pack to contain
  non-canonical portfolio traffic such as `DEMO_ADV_USD_001` during canonical evidence capture.

## Suggested Offline Demo Flow

1. Open the latest `README.md` in `output/observability-live/<timestamp>/`.
2. Start with `docker-ps.txt` to show the canonical runtime topology.
3. Show `api/gateway-workbench-overview.json` and the performance/risk API outputs to connect UI
   behavior to backend contracts.
4. Show `metrics/workbench-api-metrics.prom`, `metrics/prometheus-targets.json`, and the
   Prometheus screenshots for observability posture.
5. Show representative log files from `logs/` to demonstrate how an operator would investigate a
   failed route, stale upstream, or degraded panel.
6. Use live demo only for the areas where the audience wants deeper interaction.

## Current Boundaries

This pack is evidence capture, not production monitoring certification. It demonstrates the
current local canonical stack posture and should be regenerated whenever runtime automation,
service topology, or RFC-0108 observability behavior changes.
