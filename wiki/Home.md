# lotus-workbench wiki

`lotus-workbench` is the primary product UI for Lotus.

**Current scope:** this wiki documents the implemented Gateway-backed Workbench surfaces, their
business workflows, operating boundaries, and validation evidence. A documented route is not by
itself a production-identity, entitlement, client-delivery, or bank-certification claim.

## Start here

- Repo entrypoint: [README.md](../README.md)
- Repo context: [REPOSITORY-ENGINEERING-CONTEXT.md](../REPOSITORY-ENGINEERING-CONTEXT.md)
- Product architecture blueprint:
  [docs/documentation/product-architecture-blueprint.md](../docs/documentation/product-architecture-blueprint.md)
- Canonical local runtime:
  [docs/operations/canonical-front-office-local-runtime.md](../docs/operations/canonical-front-office-local-runtime.md)
- Business-facing Portfolio screen flow:
  [Portfolio Review Workflow](Portfolio-Review-Workflow)
- Daily selected-portfolio decision checkpoint:
  [Portfolio Review](Portfolio-Review-Screen-Guide)
- Source-backed exposure composition, coverage, and direct contributing-holdings review:
  [Portfolio Allocation](Portfolio-Allocation-Screen-Guide)
- Booked inventory, valuation, source-status, and holding-activity review:
  [Positions](Positions-Screen-Guide)
- Booked activity, applicable settlement exceptions, and transaction lineage:
  [Transactions](Transactions-Screen-Guide)
- Booked income, source-recorded deductions, and classified cash movement:
  [Income And Activity](Income-And-Activity-Screen-Guide)
- Expected inflows, outflows, largest outflow, and source-backed projection evidence:
  [Projected Cash Movement](Projected-Cash-Movement-Screen-Guide)
- Review-controlled portfolio, position, activity, reference-data, price, and file publication:
  [Portfolio Intake](Portfolio-Intake-Screen-Guide)
- Portfolio-scoped proposal priorities, lifecycle handoffs, source-window truth, and recovery:
  [Advisory Overview](Advisory-Overview-Screen-Guide)
- Source-backed advisor actions, evidence readiness, review acknowledgement, and operating boundaries:
  [Advisor Cockpit](Advisor-Cockpit-Screen-Guide)
- Source-backed proposal construction, indicative impact, evaluation, and governed draft retention:
  [Proposal Builder](Proposal-Builder-Screen-Guide)
- Portfolio-scoped proposal triage, selected review posture, and context-preserving drill-in:
  [Approval Queue](Approval-Queue-Screen-Guide)
- Exact current-versus-proposed allocation, risk exceptions, workflow gates, and source lineage:
  [Risk and Impact](Risk-And-Impact-Screen-Guide)
- Benchmark-aware return, horizon, and contributor review:
  [Performance Summary](Performance-Summary-Screen-Guide)
- Source-backed contribution, attribution, and historical-evidence review:
  [Performance Analysis](Performance-Analysis-Screen-Guide)
- Source-backed downside, concentration, rolling-risk, and risk-contribution review:
  [Risk Review](Risk-Review-Screen-Guide)
- Exception-first calculation, lineage, coverage, and supporting-record review:
  [Performance Evidence](Performance-Evidence-Screen-Guide)
- Source-backed internal talking points, supportability, and confirmed human-review workflow:
  [Performance Advisor Brief](Performance-Advisor-Brief-Screen-Guide)
- Source-backed relationship-manager book flow:
  [Advisor Book Workflow](Advisor-Book-Workflow)
- Reviewed single-portfolio and own-book bundle reporting flow:
  [Report Centre](Report-Centre-Screen-Guide)
- Governed product ownership, approved use, live assurance, and dependency impact:
  [Data Product Catalogue](Data-Product-Catalogue-Screen-Guide)
- Governed business guide inventory for every active screen and mode:
  [Screen Guide Catalogue](Screen-Guide-Catalogue)
- Bank architecture and procurement evidence for the supported runtime baseline:
  [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)

## Current phase

- primary product client for Lotus
- Portfolio and Performance are the most mature active front-office surfaces
- `/data-products` provides a Gateway-backed data product catalogue whose assurance and dependency
  evidence can fail and recover independently without hiding usable catalogue facts
- `/book` provides Gateway-backed own-book portfolio membership and task-preserving portfolio
  context switching; richer team, delegate, supervisor, household, AUM, and attention scope is not
  claimed
- `/workbench/{portfolioId}` is the Manage workspace, with focused Gateway-backed sub-surfaces for
  mandate command center, rebalance waves, construction alternatives, portfolio memory,
  PM copilot workflow-pack requests, outcome reviews, proof-pack evidence with governed PM memo
  requests, and manage-owned operating evidence
- recommendations provide a compatibility advisory workspace; `mode=cockpit` is the RFC-0026 Gateway-backed
  advisor cockpit over Advise-owned action items, supportability, meeting preparation, tactical
  house-view impact review, and bounded acknowledgements. `mode=copilot` is the RFC-0027
  Gateway-backed advisor-use copilot over Advise-owned proposal-version source projection and
  internal review posture, now proven by canonical `PB_SG_GLOBAL_BAL_001` validation. Proposals
  have bounded direct Gateway-backed queue/detail routes for
  RFC-0023 advisor narrative delivery posture, while the top-level shell `Proposal` entry remains
  disabled
- the quiet global shell keeps **My book** and a capability-backed workspace switcher visible;
  `Proposal` and `Advisory` remain disabled in that global capability posture
- the selected-portfolio rail prioritizes five daily business domains, shows the active specialist
  task once, and keeps the grouped specialist directory and actionable alternative workflow steps
  on demand; unavailable entries remain orientation evidence, not implied actions

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
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Portfolio Allocation](Portfolio-Allocation-Screen-Guide)
- [Advisory Overview](Advisory-Overview-Screen-Guide)
- [Advisor Cockpit](Advisor-Cockpit-Screen-Guide)
- [Proposal Builder](Proposal-Builder-Screen-Guide)
- [Approval Queue](Approval-Queue-Screen-Guide)
- [Risk and Impact](Risk-And-Impact-Screen-Guide)
- [Positions](Positions-Screen-Guide)
- [Transactions](Transactions-Screen-Guide)
- [Income And Activity](Income-And-Activity-Screen-Guide)
- [Projected Cash Movement](Projected-Cash-Movement-Screen-Guide)
- [Portfolio Intake](Portfolio-Intake-Screen-Guide)
- [Performance Summary](Performance-Summary-Screen-Guide)
- [Performance Analysis](Performance-Analysis-Screen-Guide)
- [Risk Review](Risk-Review-Screen-Guide)
- [Performance Evidence](Performance-Evidence-Screen-Guide)
- [Performance Advisor Brief](Performance-Advisor-Brief-Screen-Guide)
- [Portfolio Review Workflow](Portfolio-Review-Workflow)
- [Advisor Book Workflow](Advisor-Book-Workflow)
- [Report Centre](Report-Centre-Screen-Guide)
- [Data Product Catalogue](Data-Product-Catalogue-Screen-Guide)
- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Architecture](Architecture)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
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
