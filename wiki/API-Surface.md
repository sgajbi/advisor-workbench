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
- RFC-0098/RFC-0041 rebalance-wave command-center rendering is implemented on the Manage
  workspace at `/workbench/{portfolioId}?mode=waves` through Gateway
  `/api/v1/dpm/command-center/waves*`. Workbench loads
  the explicit portfolio-list wave queue, previews and creates canonical portfolio waves, opens
  wave detail and item posture, and sends source-check, simulation, approval, staging, handoff,
  proof-posture, supportability, report-input, governed AI PM memo, and governed operations
  handoff summary actions through Gateway. It also loads active Manage-owned
  `BulkReviewCampaignDefinition:v1` campaign definitions from
  `/api/v1/dpm/command-center/waves/campaign-definitions` and renders campaign name, version,
  status, as-of date, candidate count, eligible portfolio type, governance posture, and
  source-backed posture without rendering content hashes or recalculating membership. It also
  loads bounded `BulkReviewCampaignDiscovery:v1` posture from
  `/api/v1/dpm/command-center/waves/campaign-discovery` and renders Manage-owned eligible
  candidate count, expiry posture, governance posture, access purpose, and source-ref posture
  without discovering global campaign cohorts. It opens
  selected campaign lifecycle evidence from
  `/api/v1/dpm/command-center/waves/campaign-definitions/{campaign_id}/versions/{campaign_version}/lifecycle-events`
  as a read-only Manage evidence feed without inferring lifecycle state or operating retire/
  supersede commands locally. It also opens append-only launch history from
  `/api/v1/dpm/command-center/waves/campaign-definitions/{campaign_id}/versions/{campaign_version}/launch-history`
  and displays Manage-recorded wave id, launched-at time, launched-by actor, requested as-of date,
  correlation id, idempotency key, count, total count, limit, offset, and operating boundaries
  without recomputing launch state, membership, readiness, idempotency, maker-checker, trade
  approval, order generation, routing, fills, settlement, or OMS execution. It first checks
  Manage-owned campaign preview readiness through
  `/api/v1/dpm/command-center/waves/campaign-definitions/{campaign_id}/versions/{campaign_version}/preview-readiness`
  and renders source-owned supportability, reason codes, blocked actions, source posture, and
  operating boundaries without recalculating readiness. It then checks campaign launch readiness through
  `/api/v1/dpm/command-center/waves/campaign-definitions/{campaign_id}/versions/{campaign_version}/launch-package`
  and exposes
  `/api/v1/dpm/command-center/waves/campaign-definitions/{campaign_id}/versions/{campaign_version}/launch`
  only when the launch package is `READY`, preserving durable wave response and idempotency evidence
  without recalculating membership or readiness. It
  renders manage-owned wave lifecycle, item state, source-readiness state, supportability,
  report-input refs, proof-pack refs, handoff refs, lotus-ai workflow-pack run posture, and
  `external_execution_claimed` posture without direct `lotus-manage` or `lotus-ai` calls, local
  readiness calculation, local report-input construction, prompt construction, memo narrative
  generation, operations handoff-summary generation, campaign discovery, campaign membership
  calculation, maker-checker workflow, trade approval, staging, or OMS execution claims.
  Item-selection drawers, dedicated `/dpm/waves` routes, PM-book discovery, global
  campaign discovery, campaign-definition upsert UX, CIO
  workflow, and external OMS execution remain future scope until separately implemented and proven.
- RFC-0098/RFC-0038 mandate command-center cockpit rendering is implemented on the Manage
  workspace overview and `/workbench/{portfolioId}?mode=mandate` through Gateway
  `/api/v1/dpm/command-center`,
  `/api/v1/dpm/command-center/monitoring/run-once`,
  `/api/v1/dpm/command-center/exceptions`, and
  `/api/v1/dpm/command-center/mandates*`. Workbench renders manage-owned book health
  distribution, source readiness, attention queue, recommended actions, latest monitoring-run
  lineage, active exceptions, governed exception-summary workflow-pack posture, and mandate health
  dimensions. It does not calculate mandate health, infer PM-book membership, reconstruct source
  readiness, merge exceptions, resolve exceptions locally, generate exception-summary narrative,
  or call `lotus-manage` or `lotus-ai` directly. Demo promotion still requires the canonical
  `PB_SG_GLOBAL_BAL_001` live evidence pack and screenshot review.
- RFC-0098/RFC-0039 construction alternatives rendering is implemented on
  `/workbench/{portfolioId}?mode=construction` through Gateway
  `/api/v1/dpm/command-center/construction/alternative-sets*`. Workbench sends a stateful
  manage/core source selector through Gateway, renders manage-owned alternative ids, methods,
  method statuses, comparison metrics, objective/constraint trace counts, supportability, and
  selected-alternative state, and records PM selection through Gateway. It does not synthesize
  source snapshots, prices, optimizer results, supportability, or selection truth locally.
- RFC-0098/RFC-0040 proof-pack evidence rendering is implemented on `/workbench/{portfolioId}?mode=proof`
  through Gateway `/api/v1/dpm/command-center/proof-packs*`. Workbench renders manage-owned
  proof-pack id, status, content hash, section states, source hashes, Markdown availability,
  report-input readiness, AI-evidence readiness, and Gateway/lotus-ai PM memo workflow-pack
  posture. Browser code may trigger Gateway proof-pack generation from the manage rebalance run
  surfaced by the Gateway Workbench rebalance snapshot, load Gateway-provided Markdown/report/AI
  evidence payload posture, and request the governed PM memo through Gateway; it does not treat RFC-0042
  outcome-review `dpp_*` proof ids or expected-snapshot run ids as RFC-0040 proof-pack ids or
  generation sources. Reviewable Manage business states such as `PENDING_REVIEW` remain valid
  populated product evidence when proof-pack identity, sections, hashes/lineage, and handoff posture
  are present. It does not rebuild proof-pack sections, compute hashes, synthesize Markdown,
  construct report input, construct AI evidence, construct PM memo prompts, materialize PDF
  reports, or call `lotus-manage`, `lotus-report`, or `lotus-ai` directly.
- RFC40-WTBD-010 portfolio-memory timeline rendering is implemented on
  `/workbench/{portfolioId}?mode=memory` through Gateway
  `/api/v1/dpm/command-center/portfolios/{portfolio_id}/memory`. Workbench renders manage-owned
  event order, event type counts, event time, source systems, source refs, artifact refs, reason
  codes, supportability state, and content hash. It does not reconstruct timeline nodes from
  proof-pack, wave, outcome-review, report, archive, or AI payloads; direct `lotus-manage` calls
  remain forbidden. Dedicated timeline filters, event drawers, lifecycle export, and retention or
  audit-policy controls remain future scope until separately implemented and proven.
- RFC-0098/RFC-0041 action-register supportability is rendered on the Manage workspace from
  the Gateway portfolio overview `rebalance_snapshot`. The rebalance status panel shows
  manage-owned status, source support state, freshness, run count, operation count, workflow
  decision count, last-run identity, bounded recent runs, workflow posture, run issue count, and
  reason posture. When Gateway does not provide supportability or recent run detail, Workbench
  renders unknown/N/A or an explicit empty run state instead of implying verified zero activity or
  calculating supportability locally.
- RFC-0098/RFC-0042 post-trade outcome-review rendering is implemented on
  `/workbench/{portfolioId}?mode=reviews` through Gateway `/api/v1/dpm/command-center/outcome-reviews*`.
  Workbench renders manage-owned review state, expected-versus-realized dimensions, hashes,
  source lineage, supportability, report-input posture, AI-evidence posture, and
  `client_communication_boundary` posture without calculating those values client-side or creating
  client communication capability. The panel can request a governed outcome-review PDF job by
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

The Performance return-path panel consumes Gateway-published MWR supportability fields and exposes
reason-code drill-downs for non-ordinary MWR posture, including XIRR fallback, approximation, no-root
and multiple-root solver states. Workbench displays the emitted Gateway contract and does not
recalculate MWR or infer reason codes client-side.

Performance risk mode:

```txt
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
```

Data products:

```txt
http://workbench.dev.lotus/data-products
```

Workbench Manage overview:

```txt
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001
```

Workbench Manage focused sub-surfaces:

```txt
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001?mode=mandate
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001?mode=waves
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001?mode=construction
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001?mode=memory
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001?mode=reviews
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001?mode=proof
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
