# lotus-workbench wiki

`lotus-workbench` is the primary product UI for Lotus.

## Start here

- Repo entrypoint: [README.md](../README.md)
- Repo context: [REPOSITORY-ENGINEERING-CONTEXT.md](../REPOSITORY-ENGINEERING-CONTEXT.md)
- Product architecture blueprint:
  [docs/documentation/product-architecture-blueprint.md](../docs/documentation/product-architecture-blueprint.md)
- Canonical local runtime:
  [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- Business-facing Portfolio screen flow:
  [Portfolio Review Workflow](Portfolio-Review-Workflow)
- Source-backed relationship-manager book flow:
  [Advisor Book Workflow](Advisor-Book-Workflow)

## Current phase

- primary product client for Lotus
- Portfolio and Performance are the most mature active front-office surfaces
- `/data-products` provides gateway-backed domain-product discovery and live trust posture
- `/book` provides Gateway-backed own-book portfolio membership and task-preserving portfolio
  context switching; richer team, delegate, supervisor, household, AUM, and attention scope is not
  claimed
- `/workbench/{portfolioId}` is the Manage workspace, with focused Gateway-backed sub-surfaces for
  mandate command center, rebalance waves, construction alternatives, portfolio memory,
  PM copilot workflow-pack requests, outcome reviews, proof-pack evidence with governed PM memo
  requests, and manage-owned operating evidence
- recommendations remain compatibility routes; `mode=cockpit` is the RFC-0026 Gateway-backed
  advisor cockpit over Advise-owned action items, supportability, meeting preparation, tactical
  house-view impact review, and bounded acknowledgements. `mode=copilot` is the RFC-0027
  Gateway-backed advisor-use copilot over Advise-owned proposal-version source projection and
  internal review posture, now proven by canonical `PB_SG_GLOBAL_BAL_001` validation. Proposals
  have bounded direct Gateway-backed queue/detail routes for
  RFC-0023 advisor narrative delivery posture, while the top-level shell `Proposal` entry remains
  disabled
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
- [Portfolio Review Workflow](Portfolio-Review-Workflow)
- [Advisor Book Workflow](Advisor-Book-Workflow)
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
- [Supported Features](Supported-Features)
- [Troubleshooting](Troubleshooting)
