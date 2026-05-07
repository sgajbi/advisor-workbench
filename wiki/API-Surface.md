# API Surface

## Product routes

- `/portfolio`
- `/portfolios`
- `/intake`
- `/performance`
- `/data-products`
- `/workbench`
- `/workbench/{portfolioId}`
- `/api/bff/*`

## Capability-gated shell navigation

- active product entries:
  `Portfolio`, `Performance`, `Risk`
- disabled entries in the current normalized shell bootstrap contract:
  `Proposal`, `Advisory`

Treat the active shell contract as the source of truth for supported front-office navigation. Do not
promote dormant labels into product ownership just because historical route files still exist.

## Compatibility routes

- `/recommendations`
  redirects to supported active surfaces
- `/proposals`
- `/proposals/simulate`
- `/proposals/{proposalId}`
  compatibility redirects, not primary shell apps

## Current contract notes

- risk is currently served through `/performance` route mode selection, not a separate top-level URL
- data-product discovery is served through `/data-products` and consumes gateway
  `/api/v1/domain-products/*` APIs through the internal BFF only
- internal browser-to-gateway traffic can flow through `/api/bff/*`
- canonical product proof should use `workbench.dev.lotus`, not ad hoc localhost URLs
- shell navigation support is narrower than the historical route set: `Proposal` and `Advisory`
  are currently disabled even though compatibility routes still exist
- canonical evidence should be taken from `output/playwright/live-canonical/` after
  `npm run live:validate`
- RFC-0108 observability coverage is implemented for supported Portfolio, Intake, Performance, Risk,
  Reporting, Data Products, and legacy advisor Workbench gateway-backed reads/mutations. The
  coverage registry is code-backed and tested so active product surfaces cannot silently drift
  outside bounded route/panel/operation metrics.
- RFC-0098 now defines the future DPM rebalance-wave workspace. It is not an active supported
  route yet; promotion requires Gateway `/api/v1/dpm/command-center/waves*` implementation,
  Workbench BFF/browser implementation, canonical `PB_SG_GLOBAL_BAL_001` live validation, visual
  and accessibility evidence, and implementation-backed wiki/support wording.
- RFC-0098/RFC-0038 mandate command-center cockpit rendering is implemented on
  `/workbench/{portfolioId}` through Gateway `/api/v1/dpm/command-center`,
  `/api/v1/dpm/command-center/monitoring/run-once`,
  `/api/v1/dpm/command-center/exceptions`, and
  `/api/v1/dpm/command-center/mandates*`. Workbench renders manage-owned book health
  distribution, source readiness, attention queue, recommended actions, latest monitoring-run
  lineage, active exceptions, and mandate health dimensions. It does not calculate mandate health,
  infer PM-book membership, reconstruct source readiness, merge exceptions, resolve exceptions
  locally, or call `lotus-manage` directly. Demo promotion still requires the canonical
  `PB_SG_GLOBAL_BAL_001` live evidence pack and screenshot review.
- RFC-0098/RFC-0039 construction alternatives rendering is implemented on
  `/workbench/{portfolioId}` through Gateway
  `/api/v1/dpm/command-center/construction/alternative-sets*`. Workbench sends a stateful
  manage/core source selector through Gateway, renders manage-owned alternative ids, methods,
  method statuses, comparison metrics, objective/constraint trace counts, supportability, and
  selected-alternative state, and records PM selection through Gateway. It does not synthesize
  source snapshots, prices, optimizer results, supportability, or selection truth locally.
- RFC-0098/RFC-0040 proof-pack evidence rendering is implemented on `/workbench/{portfolioId}`
  through Gateway `/api/v1/dpm/command-center/proof-packs*`. Workbench renders manage-owned
  proof-pack id, status, content hash, section states, source hashes, Markdown availability,
  report-input readiness, and AI-evidence readiness. Browser code may trigger Gateway proof-pack
  generation from the manage rebalance run surfaced by the Gateway Workbench rebalance snapshot and
  load Gateway-provided Markdown/report/AI evidence payload posture; it does not treat RFC-0042
  outcome-review `dpp_*` proof ids or expected-snapshot run ids as RFC-0040 proof-pack ids or
  generation sources. Reviewable Manage business states such as `PENDING_REVIEW` remain valid
  populated product evidence when proof-pack identity, sections, hashes/lineage, and handoff posture
  are present. It does not rebuild proof-pack sections, compute hashes, synthesize Markdown,
  construct report input, construct AI evidence, construct AI prompts, materialize PDF reports, or
  call `lotus-manage`, `lotus-report`, or `lotus-ai` directly.
- RFC-0098/RFC-0041 action-register supportability is rendered on `/workbench/{portfolioId}` from
  the Gateway portfolio overview `rebalance_snapshot`. The rebalance status panel shows
  manage-owned status, source support state, freshness, run count, operation count, workflow
  decision count, last-run identity, bounded recent runs, workflow posture, run issue count, and
  reason posture. When Gateway does not provide supportability or recent run detail, Workbench
  renders unknown/N/A or an explicit empty run state instead of implying verified zero activity or
  calculating supportability locally.
- RFC-0098/RFC-0042 post-trade outcome-review rendering is implemented on
  `/workbench/{portfolioId}` through Gateway `/api/v1/dpm/command-center/outcome-reviews*`.
  Workbench renders manage-owned review state, expected-versus-realized dimensions, hashes,
  source lineage, supportability, report-input posture, and AI-evidence posture without
  calculating those values client-side. The panel can request a governed outcome-review PDF job by
  loading manage report input through Gateway and then submitting Gateway
  `POST /api/v1/reports/outcome-reviews`; report rendering and archive lifecycle remain owned by
  `lotus-report`, `lotus-render`, and `lotus-archive`. The panel can also request a governed
  outcome-review AI narrative through Gateway
  `POST /api/v1/dpm/command-center/outcome-reviews/{outcome_review_id}/ai-narrative`; evidence
  remains manage-owned, narrative execution remains `lotus-ai` owned, and Workbench shows only
  bounded workflow-pack run posture. Demo promotion still requires the canonical
  `PB_SG_GLOBAL_BAL_001` live evidence pack and screenshot review in the implementation ledger.

## Route examples

Portfolio:

```txt
http://workbench.dev.lotus/portfolio
```

Performance:

```txt
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001
```

Performance risk mode:

```txt
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
```

Data products:

```txt
http://workbench.dev.lotus/data-products
```

Workbench construction alternatives, proof-pack evidence, and outcome review:

```txt
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001
```

Capability-gated navigation truth:

```txt
Active: Portfolio, Performance, Risk
Disabled: Proposal, Advisory
```

Compatibility recommendation redirect:

```txt
http://workbench.dev.lotus/recommendations?portfolioId=PB_SG_GLOBAL_BAL_001
```

Compatibility proposal redirect posture:

```txt
/proposals -> /portfolio
/proposals/{proposalId} -> /portfolio
/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001 -> /performance?portfolioId=PB_SG_GLOBAL_BAL_001
```

These examples keep the active-versus-legacy route posture explicit.
