# lotus-workbench wiki

`lotus-workbench` is the primary product UI for Lotus.

## Start here

- Repo entrypoint: [README.md](../README.md)
- Repo context: [REPOSITORY-ENGINEERING-CONTEXT.md](../REPOSITORY-ENGINEERING-CONTEXT.md)
- Product architecture blueprint:
  [docs/documentation/product-architecture-blueprint.md](../docs/documentation/product-architecture-blueprint.md)
- Canonical local runtime:
  [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)

## Current phase

- primary product client for Lotus
- Portfolio and Performance are the most mature active front-office surfaces
- `/data-products` provides gateway-backed domain-product discovery and live trust posture
- `/workbench/{portfolioId}` includes Gateway-backed DPM construction alternatives and
  outcome-review panels for manage-owned operating evidence
- recommendations and proposals remain compatibility routes, not the main supported shell apps
- shell navigation currently treats `Proposal` and `Advisory` as disabled capability-gated entries

## Most important commands

- `make install`
- `make check`
- `make test-e2e`
- `npm run live:stack:up`
- `npm run live:validate`

## Review evidence

- canonical validation output:
  `output/playwright/live-canonical/`
- governed seeded portfolio:
  `PB_SG_GLOBAL_BAL_001`

## Navigation

- [Overview](Overview)
- [Architecture](Architecture)
- [API Surface](API-Surface)
- [Getting Started](Getting-Started)
- [Development Workflow](Development-Workflow)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Integrations](Integrations)
- [Security and Governance](Security-and-Governance)
- [RFC Index](RFC-Index)
- [Roadmap](Roadmap)
- [Troubleshooting](Troubleshooting)
