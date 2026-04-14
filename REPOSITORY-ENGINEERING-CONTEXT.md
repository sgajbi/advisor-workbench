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
4. current UX work emphasizes truthful data-backed modules, stronger density, reduced duplication, and cleaner system-wide visual consistency.

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

## Runtime And Integration Boundaries

Runtime model:

1. Next.js application with browser and server-rendered behavior,
2. primary product dependency is `lotus-gateway`,
3. live platform validation uses canonical `*.dev.lotus` routing.

Boundary rules:

1. UI features must be backed by supported gateway functionality,
2. direct raw service consumption is not the default pattern,
3. presentation logic may shape or prioritize information, but domain authority stays upstream,
4. visual polish should not introduce fake data, duplicated meaning, or unsupported workflow states.

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
4. canonical live validation matters when a change affects integrated product flows.

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
4. when a screen changes materially, tests and docs should be updated in the same slice.

## Context Maintenance Rule

Update this document when:

1. route ownership or major app areas change,
2. repo-native commands or CI expectations change,
3. the gateway-first integration model changes,
4. dominant design-system or shell patterns change,
5. current product-surface maturity or rollout posture materially changes.

## Cross-Links

1. `../lotus-platform/context/LOTUS-QUICKSTART-CONTEXT.md`
2. `../lotus-platform/context/LOTUS-ENGINEERING-CONTEXT.md`
3. `../lotus-platform/context/CONTEXT-REFERENCE-MAP.md`
4. `../lotus-platform/context/Repository-Engineering-Context-Contract.md`
5. [Lotus Developer Onboarding](../lotus-platform/docs/onboarding/LOTUS-DEVELOPER-ONBOARDING.md)
6. [Lotus Agent Ramp-Up](../lotus-platform/docs/onboarding/LOTUS-AGENT-RAMP-UP.md)
