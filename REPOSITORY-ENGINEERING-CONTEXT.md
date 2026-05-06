# Repository Engineering Context

This file provides repository-local engineering context for `lotus-workbench`.

For platform-wide truth, read:

1. `../lotus-platform/context/LOTUS-QUICKSTART-CONTEXT.md`
2. `../lotus-platform/context/LOTUS-ENGINEERING-CONTEXT.md`
3. `../lotus-platform/context/CONTEXT-REFERENCE-MAP.md`

## Repository Role

`lotus-workbench` is the primary product UI for the Lotus ecosystem.

It owns the user-facing workflows for:

1. portfolio review,
2. performance review,
3. risk review,
4. advisory and proposal interaction surfaces,
5. evidence-oriented front-office workflows.

## Business And Domain Responsibility

This repository owns the product experience layer, not domain authority.

It is responsible for:

1. coherent front-office user experience,
2. truthful summary-first workflows,
3. drill-down and detail-on-demand behavior,
4. rendering gateway-backed data in a banking-grade product surface.

It should not invent unsupported backend behavior or bypass the governed gateway contract.

## Current-State Summary

Current repository posture:

1. the platform is converging on a premium private-banking product experience standard,
2. `lotus-workbench` uses `lotus-gateway` as its primary backend contract,
3. the `Portfolio` and `Performance` surfaces are the most mature live workflows,
4. `/data-products` provides self-serve gateway-backed domain-product catalog, dependency, and
   live trust discovery for RFC-0088,
5. the Performance advisor-brief surface consumes gateway-backed workflow-pack run posture and RFC-0097 task-flow posture without synthesizing review state or lineage client-side,
6. Workbench reads reporting snapshot data through gateway and exposes the RFC-0104 explicit
   single-portfolio report batch materialization/status/run-once panel through the gateway BFF; it
   honors route-level report date and backend benchmark controls for proof while still avoiding
   direct `lotus-report` calls, and it now retrieves archived report metadata/downloads through
   Gateway `/api/v1/documents` via the Workbench BFF rather than calling `lotus-archive` directly,
7. `/workbench/{portfolioId}` renders the RFC-0038 DPM mandate command-center cockpit from
   Gateway `/api/v1/dpm/command-center`, `/monitoring/run-once`, `/exceptions`, and
   `/mandates*`. Workbench shows manage-owned book health distribution, source readiness,
   attention queue, recommended actions, latest monitoring-run lineage, active exceptions, and
   mandate health dimensions without calculating mandate health, inferring PM-book membership,
   reconstructing source readiness, merging exceptions, or calling `lotus-manage` directly.
8. `/workbench/{portfolioId}` renders the RFC-0042 DPM outcome-review panel from Gateway
   `/api/v1/dpm/command-center/outcome-reviews*`, preserving manage-owned expected-versus-realized
   dimensions, source lineage, supportability, report-input posture, AI-evidence posture, and
   Gateway-backed governed AI narrative requests without client-side outcome calculation or direct
   `lotus-manage`/`lotus-ai` calls,
9. `/workbench/{portfolioId}` renders the RFC-0039 DPM construction alternatives lab from Gateway
   `/api/v1/dpm/command-center/construction/alternative-sets*`. Workbench sends a stateful
   manage/core source selector through Gateway, preserves manage-owned alternatives,
   supportability, objective/constraint traces, and selected-alternative state, and must not build
   stateless source bundles, optimizer logic, prices, or selection truth in the browser,
10. `/workbench/{portfolioId}` also renders Gateway-provided rebalance action-register
   supportability and portfolio-level DPM operations posture from the portfolio overview
   `rebalance_snapshot`, including source state, freshness, run count, operation count, workflow
   decision count, last-run identity, bounded recent runs, workflow posture, run issue count, and
   reason posture. Missing Gateway supportability is shown as unknown/N/A rather than as verified
   zero activity.
11. current UX work emphasizes truthful data-backed modules, stronger density, reduced duplication, and cleaner system-wide visual consistency.

## Architecture And Module Map

Primary areas:

1. `src/app/`
   Route mounting and Next.js app-router entrypoints.
2. `src/apps/portfolio/`
   Portfolio workspace.
3. `src/apps/performance/`
   Performance and risk experience surfaces.
4. `src/apps/recommendations/`
   Recommendation and proposal-oriented surfaces.
5. `src/design-system/`
   Shared product primitives and reusable presentation building blocks.
6. `src/shell/`
   Shared shell composition and application framing.
7. `tests/`
   Unit, integration, and Playwright smoke coverage.
8. `wiki/`
   canonical authored source for GitHub wiki publication and operator-facing Workbench summaries.

## Runtime And Integration Boundaries

Runtime model:

1. Next.js application with browser and server-rendered behavior,
2. primary product dependency is `lotus-gateway`,
3. live platform validation uses canonical `*.dev.lotus` routing.

Boundary rules:

1. UI features must be backed by supported gateway functionality,
2. direct raw service consumption is not the default pattern,
3. presentation logic may shape or prioritize information, but domain authority stays upstream,
4. visual polish should not introduce fake data, duplicated meaning, or unsupported workflow states,
5. domain-product discovery UI must consume gateway domain-product APIs only and must render
   unavailable, stale, partial, blocked, and error trust states truthfully.

## Repo-Native Commands

Use these commands as the primary local contract:

1. install
   `make install`
2. lint
   `make lint`
3. typecheck
   `make typecheck`
4. coverage-backed test gate
   `make test-coverage`
5. browser smoke
   `make test-e2e`
6. local feature-lane parity
   `make check`
7. Docker parity
   `make ci-local-docker`
8. canonical local runtime and validation
   `npm run live:stack:up`
   `npm run live:stack:up:workbench-local`
   `npm run live:validate`

## Validation And CI Expectations

`lotus-workbench` uses explicit CI lanes:

1. `Remote Feature Lane`
2. `Pull Request Merge Gate`
3. `Main Releasability Gate`

Important validation expectations:

1. unit and integration behavior is validated through Vitest coverage,
2. browser smoke is validated through Playwright,
3. Docker and build validation remain part of the merge gate,
4. canonical live validation matters when a change affects integrated product flows,
5. README and wiki updates should keep active product-surface truth explicit, especially when
   legacy compatibility routes still exist beside the supported Portfolio and Performance paths,
6. product docs should distinguish active shell navigation from disabled or compatibility-only
   routes when the shell bootstrap contract does not treat every historical route as supported,
7. route-file existence alone is not enough for documentation truth; use shell registry,
   capabilities tests, redirect behavior, and canonical runtime guidance before describing a surface
   as supported.
8. RFC-0108 analytics UI observability for supported Workbench Portfolio, Performance, Risk, and
   Reporting operator reads is centralized in
   `src/features/analytics-observability/metrics.ts`; keep the explicit observed-surface registry
   in sync when adding or retiring portfolio, performance, risk, or reporting operator panels, and
   never emit portfolio, client, document, session, report batch, trace, request body, response
   body, or screen-content identifiers as metric labels. The metrics helper consumes Gateway
   `source_supportability` arrays for performance/risk freshness and supportability posture, with
   stale source freshness taking precedence over ready source items. State-changing Workbench
   actions should use the mutation observation helper so they emit bounded request, state, and
   applicable attention metrics without incrementing panel hydration counters.
9. DPM outcome-review Workbench reads use the same bounded observability registry. Metric labels
   must identify only governed route, panel, operation, freshness, supportability, and status
   classes; outcome review ids, portfolio ids, proof-pack ids, rebalance run ids, request payloads,
   response payloads, hashes, and lineage references must stay out of metric labels.
10. DPM mandate command-center reads and monitoring actions use bounded observability labels for
    command-center summary, exceptions, mandate lookup, mandate health, and monitoring run-once
    operations. Metric labels must not include portfolio ids, mandate ids, PM ids, book ids,
    monitoring run ids, exception ids, source-run ids, request bodies, response bodies, or screen
    content.
11. DPM outcome-review AI narrative requests are Workbench state-changing mutations through
    Gateway only. Workbench may display bounded workflow-pack run status returned by Gateway/AI,
    but it must not construct AI prompts, generate recommendations, score PMs, or treat a narrative
    run as autonomous approval.
12. DPM construction alternative generation and selection are Workbench state-changing mutations
    through Gateway only. Workbench may construct the stateful source selector needed to invoke the
    Gateway/manage contract, but it must not synthesize stateless portfolio snapshots, price
    payloads, target weights, optimization outcomes, supportability states, or selection decisions.

### Visual Review Gate

When a slice materially changes governed Workbench layout, hierarchy, or interaction behavior,
capture explicit browser evidence before moving on.

Required posture:

1. validate against the canonical seeded portfolio `PB_SG_GLOBAL_BAL_001` unless the slice
   explicitly targets another governed dataset,
2. capture Summary and Detailed screenshots when the affected control or panel exists in both
   modes,
3. include close-up screenshots for the changed panel or control group and add a viewport-level
   screenshot when surrounding layout materially affects the review,
4. record review notes for overlap, wrapping, spacing, alignment, duplicate copy, and
   unsupported-looking actions or states,
5. keep diagnostic screenshots separate from final slice evidence.

## Standards And RFCs That Govern This Repository

Most relevant current governance:

1. `../lotus-platform/rfcs/RFC-0070-gold-standard-product-experience-foundation-and-ownership-model.md`
2. `../lotus-platform/rfcs/RFC-0071-centralized-environment-scoped-service-addressing-and-ingress-governance.md`
3. `../lotus-platform/rfcs/RFC-0072-platform-wide-multi-lane-ci-validation-and-release-governance.md`
4. `../lotus-platform/rfcs/RFC-0073-lotus-ecosystem-engineering-context-and-agent-guidance-system.md`
5. `docs/documentation/product-architecture-blueprint.md`

## Known Constraints And Implementation Notes

1. this repository evolves quickly, so stale UX assumptions and stale E2E expectations are a recurring drift risk,
2. design-system and shell primitives should be preferred over page-local hacks,
3. premium banking-grade UI in Lotus means clarity, density, trust, and backend truth over decorative novelty,
4. when a screen changes materially, tests and docs should be updated in the same slice,
5. repo-local `wiki/` content should summarize supported product surfaces, canonical runtime flow,
   and legacy route posture without duplicating the full `docs/` tree.

## Context Maintenance Rule

Update this document when:

1. route ownership or major app areas change,
2. repo-native commands or CI expectations change,
3. the gateway-first integration model changes,
4. dominant design-system or shell patterns change,
5. current product-surface maturity or rollout posture materially changes,
6. active versus legacy route posture changes.
7. domain-product discovery route, gateway endpoint usage, or trust-state rendering changes.

## Cross-Links

1. `../lotus-platform/context/LOTUS-QUICKSTART-CONTEXT.md`
2. `../lotus-platform/context/LOTUS-ENGINEERING-CONTEXT.md`
3. `../lotus-platform/context/CONTEXT-REFERENCE-MAP.md`
4. `../lotus-platform/context/Repository-Engineering-Context-Contract.md`
5. [Lotus Developer Onboarding](../lotus-platform/docs/onboarding/LOTUS-DEVELOPER-ONBOARDING.md)
6. [Lotus Agent Ramp-Up](../lotus-platform/docs/onboarding/LOTUS-AGENT-RAMP-UP.md)
