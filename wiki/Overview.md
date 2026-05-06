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
- `/workbench/{portfolioId}` includes Gateway/manage-backed DPM construction alternatives and
  post-trade outcome-review panels without direct Workbench calls to manage, report, archive, or AI
- `/workbench/{portfolioId}` surfaces Gateway-provided manage action-register supportability in the
  rebalance status panel, including source state, freshness, run/operation/decision counts, last-run
  identity, bounded recent runs, workflow posture, run issue count, and explicit unknown/N/A or
  empty-run handling when supportability or recent runs are absent
- risk is served through Performance route modes
- recommendations and proposals remain compatibility entrypoints rather than active shell apps
- shell navigation currently exposes disabled `Proposal` and `Advisory` items through normalized
  capability posture rather than treating them as active supported apps
