# RFC-0007: Portfolio-First Domain UX and Lifecycle Workspace Navigation

- Status: PROPOSED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

The current UI flow does not reflect how advisors and DPM users operate in practice. Core portfolio review, iterative proposal refinement, and lifecycle progression are not presented as one coherent product experience.

## Root Cause

- Navigation is route-based without clear domain journey hierarchy.
- Core portfolio and analytics screens are not positioned as universal foundation views.
- Advisory simulation and lifecycle actions are distributed across disconnected screens.

## Proposed Solution

Reframe UI into three workspace layers:

1. Portfolio Foundation Workspace (universal)
   - Portfolio list, composition, positions, transactions, health, performance, risk.
2. Advisory Lifecycle Workspace (CA)
   - Load current portfolio, stage iterative trade/cash deltas, see immediate analytics and constraint feedback, progress to proposal/consent/execution.
3. DPM Lifecycle Workspace (DPM)
   - Similar lifecycle shell with DPM-specific automation controls and governance context.

## Architectural Impact

- UI routes align to domain workflows and product mental model.
- Increased dependency on lifecycle-aggregated BFF contracts.
- Requires component model that supports persistent simulation context across steps.

## Risks and Trade-offs

- Migration from current screens may temporarily increase UI complexity.
- Requires careful responsive layout planning to preserve dense enterprise usability.
- Feature flags may be needed during phased rollout.

## High-Level Implementation Approach

1. Introduce new top-level navigation: Foundation, Advisory Lifecycle, DPM Lifecycle.
2. Deliver Portfolio Foundation first as the universal landing and insight baseline.
3. Implement iterative advisory workspace with side-by-side edits and impact panels.
4. Add lifecycle progression UI (proposal generation, consent, execution handoff).
5. Align smoke tests with new workflow-driven navigation and outcomes.

## Upstream Dependencies

- `advisor-experience-api` RFC-0010
- `portfolio-analytics-system` RFC-046
- `performanceAnalytics` RFC-032
- `dpm-rebalance-engine` RFC-0029
