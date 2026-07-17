# Lotus Workbench Product Architecture Blueprint

- Status: Proposed target architecture
- Date: 2026-03-26
- Owners: lotus-workbench, lotus-gateway, lotus-platform
- Related platform governance:
  - `lotus-platform/rfcs/RFC-0064-lotus-platform-rebrand-and-enterprise-productization-baseline.md`
  - `lotus-platform/rfcs/RFC-0069-lotus-ai-shared-ai-platform-service.md`
- Screen-level evidence: `docs/product/WORKBENCH-EXPERIENCE-RESEARCH-LEDGER.md`

## 1. Purpose

This document defines the target product architecture for `lotus-workbench` as the primary
operating surface for the Lotus ecosystem.

The current application proves route-level and workflow-level slices, but it is not yet the
world-class workspace required for a premium private banking and wealth management platform.

The goal is to evolve `lotus-workbench` into a product-grade operating system for:

- portfolio intelligence,
- analytics,
- risk review,
- proposal and discretionary decision workflows,
- reporting,
- future AI-assisted explanation and operator productivity.

This is not a demo roadmap. It is a production target architecture.

## 2. Product Vision

`lotus-workbench` should feel like one coherent professional workspace rather than a set of
loosely connected screens.

Desired product qualities:

- premium visual craft,
- fast and calm interaction model,
- dense but readable information design,
- task-oriented workflows rather than form dumps,
- graceful degradation under partial backend failure,
- explicit trust and audit cues for regulated users,
- architecture that scales to many apps without turning the shell into a monolith.

## 3. Core UX Principles

### 3.1 Portfolio-first navigation

Users think in terms of client, household, portfolio, mandate, proposal, and review task.
Navigation should anchor around those real objects rather than backend service names.

### 3.2 One shell, many applications

The user should remain inside one persistent shell while moving across bounded-context
applications:

- Foundation
- Performance
- Risk
- Proposal
- Manage
- Reporting
- Platform

### 3.3 Explain what matters now

Every major screen should answer:

1. What is the current state?
2. What changed?
3. What is blocked or at risk?
4. What should the user do next?

### 3.4 Deterministic trust

The UI must make confidence visible:

- as-of dates,
- correlation ids,
- partial-failure banners,
- source attribution,
- workflow state,
- decision readiness,
- artifact and lineage links.

### 3.5 Progressive depth

High-level summaries should lead naturally to evidence and drilldown, without overwhelming users
at first glance.

## 4. Target Product Topology

The target product is a shell plus domain applications.

### 4.1 Shell layer

The shell owns:

- authenticated session and tenant context,
- global navigation,
- portfolio and entity search,
- notifications and activity,
- task inbox,
- layout system,
- design system,
- app orchestration,
- error boundaries and resilience behavior,
- cross-app recent items and saved views.

### 4.2 Domain application layer

Each application owns a business journey, not just a page group.

#### Foundation app

Primary owners:

- portfolio lookup,
- portfolio 360,
- holdings and cash views,
- lineage and operational status,
- intake and ingestion workflows.

Primary upstreams:

- `lotus-core`
- `lotus-gateway`

#### Performance app

Primary owners:

- benchmark-aware performance,
- attribution,
- contribution,
- returns-series review,
- performance drilldowns and comparison views.

Primary upstreams:

- `lotus-performance`
- `lotus-core`
- `lotus-gateway`

#### Risk app

Primary owners:

- concentration review,
- drawdown analytics,
- rolling metrics,
- scenario and stress review,
- risk exception visibility.

Primary upstreams:

- `lotus-risk`
- `lotus-core`
- `lotus-gateway`

#### Proposal app

Primary owners:

- proposal drafting,
- scenario comparison,
- approval workflow,
- consent and execution readiness,
- proposal evidence and lifecycle review.

Primary upstreams:

- `lotus-advise`
- `lotus-performance`
- `lotus-risk`
- `lotus-core`
- `lotus-gateway`

#### Manage app

Primary owners:

- discretionary rebalance runs,
- policy-pack surfaces,
- recurring automation controls,
- supportability and lineage review,
- exception workflows for automated decisions.

Primary upstreams:

- `lotus-manage`
- `lotus-core`
- `lotus-gateway`

#### Reporting app

Primary owners:

- report-ready portfolio summary,
- review packet composition,
- reporting snapshots,
- artifact retrieval and distribution readiness.

Primary upstreams:

- `lotus-report`
- `lotus-gateway`

### 4.3 Shared platform utilities

Cross-cutting utilities should be shared, not reimplemented inside each app:

- filters and query-state primitives,
- time period controls,
- chart primitives,
- tables and inspector panels,
- compare mode,
- empty/loading/error states,
- command palette,
- audit metadata display,
- export and print affordances,
- AI-assisted explanation entry points.

## 5. Information Architecture

### 5.1 Primary navigation

The top-level structure should move from feature-first routes to a stable app map:

- Home
- Foundation
- Performance
- Risk
- Proposal
- Manage
- Reporting
- Platform

### 5.2 Context rail

A persistent context rail should expose:

- selected portfolio or client,
- mandate or benchmark context,
- current proposal or decision session,
- workflow status,
- last refresh and as-of date,
- active warnings.

### 5.3 Page model

Most product pages should follow one of these shapes:

- Overview page: summary, alerts, top actions, and evidence links.
- Studio page: controls on one side, data visualization and analysis views on the other.
- Workspace page: multi-panel lifecycle and action-oriented flow.
- Investigation page: logs, lineage, supportability, and artifacts.

## 6. Visual System Direction

### 6.1 Design intent

The visual language should feel premium, editorial, and operational at the same time:

- strong typography,
- restrained but distinctive color,
- deliberate whitespace,
- dense data layout without visual chaos,
- rich but controlled motion,
- polished states and transitions.

Avoid:

- generic SaaS dashboard aesthetics,
- default MUI look-and-feel,
- flat utility-first visual monotony,
- pages that feel like internal tooling.

### 6.2 Design system layers

The design system should have four layers:

1. Tokens
   - color, spacing, radius, shadows, typography, motion, elevation, grid.
2. Primitives
   - stack, cluster, grid, panel, section, tabs, split layout, drawers, sheets.
3. Data components
   - KPI strips, metric cards, charts, tables, delta views, confidence badges.
4. Workflow components
   - state rails, review panels, approval controls, timeline views, compare trays.

### 6.3 Accessibility and readability

The product must maintain:

- WCAG-compliant contrast,
- keyboard navigability,
- clear focus treatment,
- readable dense tables,
- motion settings that respect reduced-motion preference.

## 7. Frontend Technical Architecture

### 7.1 Runtime stance

Keep `Next.js` with App Router as the frontend platform.

Why:

- good fit for app shell and nested layouts,
- server rendering and streaming options,
- strong route and code-splitting model,
- mature ecosystem for enterprise web delivery.

### 7.2 Recommended package boundaries

Target internal structure:

- `src/app/`
  - route entries and shell layouts only
- `src/shell/`
  - global app shell, navigation, search, notifications, task inbox, app registry
- `src/design-system/`
  - tokens, themes, primitives, data-display building blocks
- `src/apps/foundation/`
- `src/apps/performance/`
- `src/apps/risk/`
- `src/apps/proposal/`
- `src/apps/manage/`
- `src/apps/reporting/`
- `src/platform/`
  - API client runtime, error handling, query helpers, feature flags, telemetry

### 7.3 Data-fetching model

Use a hybrid data strategy:

- server-rendered initial payloads for major landing pages and overview pages,
- client-side query hydration for interactive filtering and drilldowns,
- optimistic interactions only when workflow semantics support them,
- explicit stale and refresh semantics on regulated data surfaces.

### 7.4 State model

State should be separated deliberately:

- URL state for shareable filters and view modes,
- server state for API data,
- local UI state for ephemeral interactions,
- session/workspace state for active proposal or scenario workflows.

Avoid one global client store for everything.

### 7.5 Frontend quality gates

The frontend baseline should include:

- route-level performance budgets,
- design-system visual regression checks,
- keyboard/accessibility smoke tests,
- contract-aligned API tests,
- page-level skeleton and failure-state standards,
- Playwright workflow coverage for critical journeys.

## 8. Resilience and Performance Strategy

### 8.1 Partial failure is first-class

The shell and each app must support:

- degraded cards or panels,
- retained context when one service fails,
- per-panel retry,
- source-specific error explanation,
- operator-readable fallback states.

### 8.2 Performance targets

Product direction should assume:

- fast first paint for shell and overview routes,
- minimal blocking on noncritical secondary panels,
- parallel loading for independent panels,
- aggressive route-based code splitting,
- data virtualization for dense tables,
- chart rendering that remains stable on large datasets.

### 8.3 Observability

The frontend should emit:

- route timing,
- panel load timing,
- partial-failure telemetry,
- key workflow drop-off events,
- user-visible error states,
- feature and experiment usage.

## 9. Security, Governance, and Compliance

The UI must surface and respect:

- role-based access and entitlements,
- tenant-aware data scope,
- audit-friendly workflow events,
- approval and consent controls,
- explicit source and as-of metadata,
- no silent mutation on important lifecycle actions.

Any AI capability must remain assistive and clearly bounded. Business truth stays in domain systems.

## 10. Initial Target Journeys

### 10.1 Foundation journey

1. Search and select a portfolio.
2. Review health, holdings, cash, and lineage.
3. Identify whether the portfolio is ready for analysis or workflow.

### 10.2 Performance journey

1. Open a portfolio analytics workspace.
2. Review benchmark-aware performance and attribution.
3. Compare periods or scenarios.
4. Save or export analysis context.

### 10.3 Risk journey

1. Open risk posture for a portfolio.
2. Inspect concentration and drawdown.
3. Move into scenario-aware risk review.
4. Hand findings into proposal or management workflow.

### 10.4 Proposal journey

1. Start from a portfolio or proposal queue.
2. Draft and compare proposal scenarios.
3. Review readiness, approvals, consent, and evidence.
4. Move to execution readiness with full traceability.

## 11. Delivery Strategy

### 11.1 Non-big-bang migration

Adopt a staged rebuild inside the existing repository:

1. Introduce the new shell and design-system foundation.
2. Build the first production-grade app surface.
3. Move users page-by-page and workflow-by-workflow.
4. Remove legacy route patterns after parity and validation.

### 11.2 Recommended sequence

1. Shell foundation
2. Foundation app
3. Performance app
4. Risk app
5. Proposal app
6. Shared activity/task system
7. Manage app
8. Reporting app

### 11.3 Definition of success

The rebuild is successful when:

- the shell feels coherent across all apps,
- each app owns a real user journey,
- BFF contracts are screen- and workflow-shaped,
- partial failures degrade gracefully,
- the design quality is clearly premium,
- the product can scale to more Lotus apps without structural redesign.

## 12. Immediate Engineering Actions

1. Create a shell and design-system foundation inside `lotus-workbench`.
2. Define the application registry and top-level navigation model.
3. Replace route-centric feature packaging with app-centric packaging.
4. Align with `lotus-gateway` on experience-API view models.
5. Build `Foundation` as the first production-grade application.
6. Establish UX, accessibility, performance, and resilience gates before expanding further.
