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
4. Recommendations and proposals routes still exist as compatibility paths, but they are no longer
   the primary supported front-office app surfaces.
5. Top-level shell navigation is capability-gated: `Portfolio`, `Performance`, and `Risk` are
   active, while `Proposal` and `Advisory` remain disabled in the current normalized shell
   bootstrap contract.
6. Canonical review-ready browser evidence comes from `npm run live:validate` artifacts under
   `output/playwright/live-canonical/`, not from ad hoc localhost screenshots.

## Architecture At A Glance

Route mounting comes from `src/app/`, while app-local ownership lives under `src/apps/`.

Current main surfaces:

- `portfolio`
  `/portfolio`, `/portfolios`, `/intake`
- `performance`
  `/performance` with performance, risk, advisor-brief, and evidence modes
- `workbench`
  `/workbench/*` compatibility and portfolio-linked workspace entry
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

## Product Contract Notes

Important current product and route truths:

1. the active front-office surfaces are `Portfolio` and `Performance`
2. `Risk` is currently served through the `Performance` route via mode-based behavior, not as a
   separate top-level route
3. `/recommendations` and `/proposals*` remain compatibility routes and should not be documented as
   the main supported shell paths
4. the internal `/api/bff/*` route proxies to `lotus-gateway` and preserves gateway-first
   integration posture
5. shell navigation availability is contract-driven and currently exposes disabled `Proposal` and
   `Advisory` items rather than live product routes
6. evidence-oriented performance views must be documented truthfully as runtime-governed product
   behavior, not as a promise of separate unsupported backend ownership inside Workbench

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
