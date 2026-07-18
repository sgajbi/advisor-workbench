# Overview

## Business role

`lotus-workbench` is the primary front-office product UI for Lotus. It presents gateway-backed
portfolio, performance, risk, advisory-brief, and evidence workflows in one governed shell.

## Ownership boundaries

This repo owns:

1. user-facing product workflows
2. shell and design-system presentation behavior
3. truthful summary-first interaction patterns
4. canonical front-office browser validation

This repo does not own:

1. domain data truth
2. gateway or direct backend contract ownership
3. analytics, risk, reporting, or AI methodology

## Current posture

- gateway-first product client
- Portfolio and Performance are the active front-office paths
- Portfolio review is organized as a source-backed summary-to-exception-to-detail flow across
  Portfolio review, Allocation, Positions, Transactions, Income & Activity, and Cashflow. See
  [Portfolio Review Workflow](Portfolio-Review-Workflow) for the business question, evidence, and
  authority boundary owned by each screen.
- `/workbench/{portfolioId}` is the Manage workspace, with focused Gateway/manage-backed
  sub-surfaces for mandate health, rebalance waves, construction alternatives, portfolio memory,
  proof-pack evidence, and post-trade outcome review without direct Workbench calls to manage,
  report, archive, or AI
- `/workbench/{portfolioId}` surfaces Gateway-provided manage action-register supportability in the
  rebalance status panel, including source state, freshness, run/operation/decision counts, last-run
  identity, bounded recent runs, workflow posture, run issue count, and explicit unknown/N/A or
  empty-run handling when supportability or recent runs are absent
- risk is served through Performance route modes
- recommendations remain compatibility entrypoints; proposals have bounded direct Gateway-backed
  queue/detail routes for RFC-0023 advisor narrative delivery posture, but are not yet promoted as
  an active top-level shell app
- shell navigation currently exposes disabled `Proposal` and `Advisory` items through normalized
  capability posture rather than treating them as active supported apps
