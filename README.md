# lotus-workbench

Primary product UI for the Lotus ecosystem, consumed through `lotus-gateway`.

Repository-local engineering context:
[REPOSITORY-ENGINEERING-CONTEXT.md](REPOSITORY-ENGINEERING-CONTEXT.md)

Product architecture blueprint:
[docs/documentation/product-architecture-blueprint.md](docs/documentation/product-architecture-blueprint.md)

Canonical front-office local runtime:
[docs/operations/canonical-front-office-local-runtime.md](docs/operations/canonical-front-office-local-runtime.md)

## Purpose And Scope

`lotus-workbench` owns the user-facing product experience for Lotus.

It is responsible for:

- coherent front-office user experience
- truthful summary-first workflows
- detail-on-demand product modules
- rendering gateway-backed data in a banking-grade product surface
- canonical local runtime and browser validation for supported product flows

It does not own portfolio, performance, risk, advisory, reporting, or AI business truth. Those stay
behind governed backend contracts, primarily `lotus-gateway`.

## Ownership And Boundaries

`lotus-workbench` is the primary product client in the Lotus ecosystem.

It depends on:

- `lotus-gateway`
  primary backend contract for product flows
- canonical `*.dev.lotus` runtime and ingress
  governed local validation and screenshot posture
- repo-local design-system and shell primitives
  shared presentation and interaction foundations

Boundary rules that matter:

1. supported UI states must be backed by supported gateway behavior
2. direct raw service consumption is not the default pattern
3. presentation can prioritize and frame data, but domain authority stays upstream
4. visual polish must not introduce fake data, duplicate meaning, or unsupported workflow states

## Current Operational Posture

1. `Portfolio` and `Performance` are the most mature live workflows.
2. `lotus-workbench` uses `lotus-gateway` as its primary backend contract.
3. Canonical local product proof uses the governed front-office runtime and seeded portfolio
   `PB_SG_GLOBAL_BAL_001`.
4. `Data Products` is available at `/data-products` for gateway-backed catalog, dependency, and
   live trust discovery.
5. `/workbench/{portfolioId}` is the Manage workspace. It uses the shared Workbench left rail and
   focused `mode` sub-surfaces instead of stacking every Manage/DPM panel into one long page:
   overview, `mode=mandate`, `mode=waves`, `mode=construction`, `mode=memory`, `mode=reviews`,
   and `mode=proof`.
6. Manage surfaces are Gateway-backed and cover RFC-0038 mandate command center, RFC-0041
   rebalance waves, RFC-0039 construction alternatives, RFC40-WTBD-010 portfolio memory,
   RFC-0042 outcome reviews, RFC-0040 proof-pack evidence, RFC-0043 exception-summary requests,
   and rebalance action-register supportability. Workbench renders Gateway/manage/lotus-ai truth
   and does not calculate mandate health, wave readiness, optimizer output, outcome variance,
   proof-pack hashes, report inputs, AI prompts, PM memos, narratives, or execution claims locally.
7. Recommendations and proposals routes still exist as compatibility paths, but they are no longer
   the primary supported front-office app surfaces.
8. Top-level shell navigation is capability-gated: `Portfolio`, `Performance`, and `Risk` are
   active, while `Proposal` and `Advisory` remain disabled in the current normalized shell
   bootstrap contract.
9. Canonical review-ready browser evidence comes from `npm run live:validate` artifacts under
   `output/playwright/live-canonical/`, not from ad hoc localhost screenshots.

## Architecture At A Glance

Route mounting comes from `src/app/`, while app-local ownership lives under `src/apps/`.

Current main surfaces:

- `portfolio`
  `/portfolio`, `/portfolios`, `/positions`, `/transactions`, `/income`, `/cashflow`, `/intake`
- `performance`
  `/performance` with performance, risk, advisor-brief, and evidence modes
- `workbench`
  `/workbench/*` compatibility and portfolio-linked Manage workspace entry, including
  Gateway-backed DPM mandate, waves, construction, memory, reviews, proof-pack, and action-register
  supportability sub-surfaces when Gateway/manage have materialized the relevant evidence
- `data-products`
  `/data-products` self-serve catalog, dependency, and live trust discovery through gateway
- `api/bff`
  internal Next.js proxy bridge to `lotus-gateway`

Current shell navigation truth:

- active:
  `Portfolio`, `Performance`, `Risk`
- currently disabled by capability posture:
  `Proposal`, `Advisory`

Current compatibility redirects:

- `/recommendations`
  redirects to supported active surfaces
- `/proposals`, `/proposals/simulate`, `/proposals/[proposalId]`
  compatibility routes, not primary active shell apps

Key code areas:

- `src/app/`
  Next.js app-router entrypoints and route mounting
- `src/apps/portfolio/`
  portfolio workspace
- `src/apps/performance/`
  performance and risk product surfaces
- `src/apps/recommendations/`
  current compatibility redirect behavior for legacy recommendation entry
- `src/design-system/`
  shared UI primitives and tokens
- `src/shell/`
  app shell, navigation, and app registry
- `tests/`
  unit, integration, and Playwright smoke coverage

## Repository Layout

- `src/app/`
  route entries, layouts, and the `/api/bff` gateway proxy bridge
- `src/apps/`
  app-local product surfaces
- `src/design-system/`
  shared tokens, components, and data-display primitives
- `src/shell/`
  navigation, app registry, and shared shell structure
- `src/features/`
  reusable feature-specific API and view-model logic
- `docs/`
  product architecture, operations, automation, demo, and review guidance
- `wiki/`
  canonical authored source for GitHub wiki publication

## Quick Start

Install dependencies:

```bash
make install
```

Local development server:

```bash
make run
```

Canonical local identities:

- product UI: `http://workbench.dev.lotus`
- gateway: `http://gateway.dev.lotus`

Set:

```txt
BFF_BASE_URL=http://gateway.dev.lotus
```

The Workbench BFF adds governed caller-context headers before proxying to Gateway when an
interactive request does not already provide them. Defaults are suitable for the canonical local
front-office runtime and can be overridden for targeted validation:

```txt
WORKBENCH_BFF_ACTOR_ID=workbench-system
WORKBENCH_BFF_CALLER_APPLICATION=lotus-workbench
WORKBENCH_BFF_TENANT_ID=tenant-sg
WORKBENCH_BFF_REGION=APAC
WORKBENCH_BFF_BOOKING_CENTER_CODE=SG
WORKBENCH_BFF_ROLE=advisor
WORKBENCH_DPM_MANDATE_ID=MANDATE_PB_SG_GLOBAL_BAL_001
WORKBENCH_DPM_MODEL_PORTFOLIO_ID=MODEL_PB_SG_GLOBAL_BAL_DPM
WORKBENCH_DPM_BOOKING_CENTER_CODE=Singapore
WORKBENCH_DPM_SOURCE_AS_OF_DATE=2026-04-10
```

Canonical front-office runtime:

```bash
npm run live:stack:up
npm run live:validate
```

Quick local browser-facing path:

```txt
http://workbench.dev.lotus/portfolio
http://workbench.dev.lotus/performance
http://workbench.dev.lotus/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk
http://workbench.dev.lotus/workbench/PB_SG_GLOBAL_BAL_001
http://workbench.dev.lotus/data-products
```

## Common Commands

- `make install`
  install dependencies
- `make lint`
  lint the Next.js app
- `make typecheck`
  TypeScript typecheck
- `make test-coverage`
  Vitest coverage-backed unit and integration gate
- `make test-e2e`
  Playwright smoke validation
- `make check`
  local feature-lane parity: lint, typecheck, coverage, build
- `make ci-local-docker`
  Docker parity check
- `npm run live:stack:up`
  canonical front-office stack bring-up
- `npm run live:validate`
  canonical front-office validation against the running stack
- `npm run live:validate:construction`
  focused live proof for the Gateway/manage-backed construction alternatives lab

## Validation And CI Lanes

`lotus-workbench` follows the Lotus multi-lane model:

1. `Remote Feature Lane`
2. `Pull Request Merge Gate`
3. `Main Releasability Gate`

Repo-native gate mapping:

- `make check`
  lint, typecheck, coverage-backed tests, build
- `make test-e2e`
  Playwright smoke
- `make ci-local-docker`
  Docker parity
- `npm run live:validate`
  canonical integrated product validation when cross-app flows change
- `npm run live:validate:construction`
  focused browser proof for RFC-0039 construction alternatives when the construction lab changes

## Product Contract Notes

Important current product and route truths:

1. the active front-office surfaces are `Portfolio` and `Performance`
2. `Risk` is currently served through the `Performance` route via mode-based behavior, not as a
   separate top-level route
3. `/recommendations` and `/proposals*` remain compatibility routes and should not be documented as
   the main supported shell paths
4. the internal `/api/bff/*` route proxies to `lotus-gateway` and preserves gateway-first
   integration posture
5. `/data-products` consumes only gateway domain-product discovery and trust-certification
   endpoints; it must not read platform files directly or fabricate trust posture
6. shell navigation availability is contract-driven and currently exposes disabled `Proposal` and
   `Advisory` items rather than live product routes
7. evidence-oriented performance views must be documented truthfully as runtime-governed product
   behavior, not as a promise of separate unsupported backend ownership inside Workbench
8. RFC-0042 outcome-review rendering on `/workbench/{portfolioId}?mode=reviews` is backed by Gateway
   `/api/v1/dpm/command-center/outcome-reviews*`; Workbench may normalize presentation shape but
   must not derive expected, realized, variance, lineage, source freshness, supportability, report
   input, or AI evidence eligibility outside the Gateway/manage contract.
9. RFC-0039 construction alternatives rendering on `/workbench/{portfolioId}?mode=construction` is backed by
   Gateway `/api/v1/dpm/command-center/construction/alternative-sets*`; Workbench sends a
   stateful source selector and option overrides through Gateway and must not synthesize
   stateless portfolio snapshots, prices, optimization results, objective scores, supportability,
   or PM selection truth.
10. RFC-0040 proof-pack evidence rendering on `/workbench/{portfolioId}?mode=proof` is backed by Gateway
   `/api/v1/dpm/command-center/proof-packs*`; Workbench may render Gateway/manage proof-pack
   identity, sections, hashes, Markdown, report-input readiness, AI-evidence readiness, and
   lotus-ai PM memo workflow-pack posture through Gateway, but must not rebuild proof-pack
   sections, compute hashes, synthesize Markdown, construct report input, construct AI evidence,
   construct PM memo prompts, or call `lotus-manage`, `lotus-report`, or `lotus-ai` directly.
11. RFC-0041 rebalance-wave rendering on `/workbench/{portfolioId}?mode=waves` is backed by Gateway
   `/api/v1/dpm/command-center/waves*`; Workbench may render Gateway/manage wave state,
   report-input readiness, lotus-ai wave PM memo workflow-pack posture, and lotus-ai
   operations-handoff summary posture through Gateway, but
   must not build report input, construct AI prompts, generate memo text locally, score PMs,
   approve trades independently, contact clients, place orders, or call upstream services directly.

Copy-paste route and runtime examples live in [wiki/API-Surface.md](wiki/API-Surface.md).

## Integration Boundaries

- primary backend contract:
  `lotus-gateway`
- canonical local runtime:
  `*.dev.lotus` direct ingress and governed seeded data
- contract rule:
  workbench should consume gateway-shaped product contracts instead of recreating backend semantics
  in the browser

## Operations And Runtime Posture

- use `workbench.dev.lotus` and `gateway.dev.lotus` for canonical local product proof
- use `npm run live:stack:up` and `npm run live:validate` for governed integrated validation
- use seeded portfolio `PB_SG_GLOBAL_BAL_001` unless the slice explicitly targets another dataset
- keep demo screenshots separate from diagnostic captures until canonical validation passes
- canonical live validation artifacts are written under `output/playwright/live-canonical/`
- use `output/playwright/live-canonical/live-validation-summary.json` as the structured evidence
  record for review and troubleshooting

## Documentation Map

- product architecture:
  [docs/documentation/product-architecture-blueprint.md](docs/documentation/product-architecture-blueprint.md)
- canonical local runtime:
  [docs/operations/canonical-front-office-local-runtime.md](docs/operations/canonical-front-office-local-runtime.md)
- demo guidance:
  [docs/demo/README.md](docs/demo/README.md)
- architecture review ledger:
  [docs/architecture/CODEBASE-REVIEW-LEDGER.md](docs/architecture/CODEBASE-REVIEW-LEDGER.md)
- RFC inventory:
  [docs/rfcs/README.md](docs/rfcs/README.md)
- wiki home:
  [wiki/Home.md](wiki/Home.md)

## Wiki Source

Repository-authored wiki pages live under [wiki/](wiki). If the GitHub wiki is published later,
keep `wiki/` as the canonical source and treat any separate `*.wiki.git` clone as publication
plumbing only.
