# RFC-0016: Workbench Application Shell and Design-System Foundation

- Status: PROPOSED
- Date: 2026-03-26
- Owners: lotus-workbench
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-platform maintainers

## Summary

`lotus-workbench` must evolve from a set of route-level feature slices into the primary product
workspace for the Lotus ecosystem.

The first and most important implementation step inside `lotus-workbench` is not another isolated
screen. It is a shell and design-system foundation that can support a premium multi-application
experience across:

1. Foundation,
2. Performance,
3. Risk,
4. Proposal,
5. Manage,
6. Reporting,
7. later AI-powered product experiences.

This RFC defines that foundation.

It introduces:

1. an app-shell architecture,
2. app-oriented information architecture,
3. a design-system foundation,
4. a clear packaging model for new product surfaces,
5. the migration approach from the current route-centric implementation.

The purpose of this RFC is to ensure that future work in `lotus-workbench` compounds into one
coherent premium product instead of growing as disconnected UI slices.

## Scope Clarification For Slice 1

Slice 1 of this RFC is intentionally narrow.

Slice 1 is only:

1. shell layout,
2. app registry and app switching primitives,
3. shell chrome and route context presentation,
4. shell-level visual and motion rules.

Slice 1 is not:

1. the full design-system layer,
2. the full Foundation app,
3. a broad route migration,
4. a visual rewrite of every page.

That sequencing is intentional so the shell can become real quickly without turning the first
implementation wave into a disguised big-bang rewrite.

## Why This Is Next

The current `lotus-workbench` has enough validated capability to justify a stronger architecture,
but not yet the right product foundation.

Current reality:

1. the app already proves multiple useful routes,
2. the app already consumes `lotus-gateway`,
3. the app already demonstrates proposal, workbench, and intake patterns,
4. the visual and structural baseline is still too page-centric and too incremental to support the
   world-class ecosystem we want.

If the shell and design system are not established first:

1. every new app surface will invent local layout and interaction rules,
2. navigation will drift toward feature sprawl,
3. the visual system will become inconsistent,
4. future AI-powered experiences will have no strong product foundation to land in,
5. the eventual cleanup cost will be much higher than doing the foundation now.

This is therefore the most important first app-local RFC.

## Problem Statement

`lotus-workbench` currently acts more like a collection of routes than a premium workspace
platform.

The current issues are:

1. the top-level shell is too thin to act as a durable operating environment,
2. feature packaging reflects implementation history more than the target product model,
3. visual rules live mostly as page-level styling rather than as a reusable design-system layer,
4. navigation is useful but not yet shaped like a stable multi-app ecosystem,
5. error, loading, empty, degraded, and evidence states are not yet governed as a product system,
6. there is no explicit shell-level model for future shared capabilities such as activity,
   notifications, saved views, or AI entry points.

The application therefore needs:

1. a durable shell,
2. a durable design-system foundation,
3. a durable app registry and navigation model,
4. a deliberate migration path for existing routes.

## Goals

1. Establish a persistent shell architecture for `lotus-workbench`.
2. Establish the first version of a Lotus design-system foundation in the frontend.
3. Move the internal package structure toward app-oriented modules rather than route-first slices.
4. Create the structural basis for premium UI quality, resilience, and scalability.
5. Support future AI-enabled experiences without treating them as bolt-ons.

## Non-Goals

1. Rebuilding every existing screen in this RFC.
2. Finalizing the full visual identity of every future app surface.
3. Defining every `lotus-gateway` `v2` contract.
4. Implementing the full task inbox, search, or notification system in this RFC.
5. Shipping major AI product features in this RFC.

## Decision

`lotus-workbench` will adopt an application-shell architecture with a design-system foundation.

### 1. Shell-first architecture

The product will have one persistent shell that owns:

1. global navigation,
2. portfolio and entity context,
3. top-level layout system,
4. app switching,
5. shared trust and status surfaces,
6. future task, activity, search, and AI entry points.

### 2. App-oriented information architecture

The shell will host bounded product applications, not just page groups.

Target app map:

1. Home
2. Foundation
3. Performance
4. Risk
5. Proposal
6. Manage
7. Reporting
8. Platform

### 3. Design-system foundation

The UI will move from page-local styling toward a design-system structure with:

1. tokens,
2. primitives,
3. data-display components,
4. workflow components,
5. shared state patterns for loading, error, warning, and partial-failure behavior.

### 4. Migration without big-bang rewrite

Existing routes may remain temporarily, but all new strategic work should land on the shell
foundation and its app-oriented patterns.

The shell should become the new center of gravity rather than being postponed until the end.

## Proposed Architecture

### Shell responsibilities

The shell should own:

1. top navigation and app switching,
2. common layout primitives,
3. selected portfolio and workflow context presentation,
4. common trust metadata surfaces,
5. shell-level loading and degraded states,
6. route transition polish and motion rules.

### App responsibilities

Each app module should own:

1. its route tree,
2. its app-specific workspace layouts,
3. its view models and data hooks,
4. its app-specific interaction components,
5. its feature-level tests.

### Shared design-system responsibilities

The design system should own:

1. theme tokens,
2. layout primitives,
3. typography and spacing scale,
4. panel, section, and split-view primitives,
5. chart and table wrappers,
6. badges, alerts, banners, and status indicators,
7. confidence, lineage, and freshness display patterns.

## Internal Package Direction

The current package structure should evolve toward:

1. `src/app/`
   - route entries and shell mounting only
2. `src/shell/`
   - app shell, navigation, context rail, shared chrome
3. `src/design-system/`
   - tokens, theme, primitives, shared UI building blocks
4. `src/apps/foundation/`
5. `src/apps/performance/`
6. `src/apps/risk/`
7. `src/apps/proposal/`
8. `src/apps/manage/`
9. `src/apps/reporting/`
10. `src/platform/`
    - client runtime, query helpers, telemetry, flags

This RFC does not require every existing module to move immediately, but it makes this the target
direction for new strategic work.

## Product Quality Standards

This RFC establishes shell-level quality expectations for future implementation:

1. dense but readable information design,
2. clear visual hierarchy,
3. polished transitions and motion,
4. resilient partial-failure rendering,
5. accessibility and keyboard usability,
6. no default-library visual posture,
7. production-grade loading, empty, and error states.

## Relationship To Other Lotus Repositories

This RFC explicitly follows the ownership model that:

1. `lotus-workbench` owns presentation composition and interaction quality,
2. `lotus-gateway` owns experience orchestration,
3. upstream apps own the quality of their domain inputs and rendering-enabling metadata,
4. `lotus-ai` will provide governed AI capabilities for later workbench experiences,
5. `lotus-platform` remains the standards authority.

If shell or app work in `lotus-workbench` exposes a problem in upstream contracts, the issue should
be raised in the owning repository rather than silently buried in local UI or gateway workaround
logic.

## Delivery Slices

### Slice 1: Shell foundation

Outcome:

1. a real shell layout exists,
2. app switching and navigation primitives exist,
3. shell-level route context presentation exists,
4. shell-level visual and motion rules exist.

Acceptance gate:

1. the shell is reusable across multiple app surfaces,
2. an app registry and route-to-app mapping exist,
3. future apps can plug into it without redesigning core chrome.

### Slice 2: Design-system foundation

Outcome:

1. tokens and primitive components exist,
2. the first common layout and panel system exists,
3. status, warning, and evidence display primitives exist.

Acceptance gate:

1. new product surfaces use shared primitives instead of bespoke page CSS,
2. the visual system becomes more coherent with each new page.

### Slice 3: App-oriented package migration

Outcome:

1. at least one strategic app surface is built using the new package model,
2. route-centric feature grouping starts giving way to app-level grouping.

Acceptance gate:

1. the new app surface does not depend on legacy page-level structure,
2. the package direction is credible and repeatable.

### Slice 4: Foundation app first-production surface

Outcome:

1. the first product-grade app proves the new shell architecture,
2. the shell, design system, and app packaging work together in a real flow.

Acceptance gate:

1. the surface is materially better than the existing slice UI,
2. it provides a template for later app waves.

## Risks

1. teams may try to skip the shell and continue adding pages directly.
2. the design-system layer may be treated as cosmetic instead of structural.
3. too much legacy structure may be preserved out of convenience.
4. the shell could become heavy if too many future concerns are forced in too early.

## Alternatives Considered

### Alternative 1: Keep improving current screens without a shell foundation

Rejected.

Reason:

1. that would keep the product fragmented,
2. fragmentation would get harder to reverse with each new app wave.

### Alternative 2: Do a total big-bang rewrite before shipping anything new

Rejected.

Reason:

1. that creates unnecessary execution risk,
2. the right approach is foundation-first with staged migration.

## Initial Implementation Focus

The first implementation work after approval should be:

1. create the shell layout and navigation model,
2. establish the app registry and top-level app map,
3. create the first shell-level chrome and route context components,
4. defer deeper design-system and app-surface work to later slices.

The first AI-related work in `lotus-workbench` should be deferred until this shell foundation
exists, so future `lotus-ai` capabilities land in a polished and governed product environment.

## Acceptance Criteria

This RFC is complete when:

1. `lotus-workbench` has a real shell foundation,
2. `lotus-workbench` has the first design-system layer in place,
3. new strategic work is landing in the shell/app-oriented structure,
4. the application is structurally ready for later Foundation, Performance, Risk, Proposal,
   Manage, Reporting, and AI-enabled experiences.

## Approval Requested

Approve this RFC if the team agrees that:

1. the most important first app-local step is the shell and design-system foundation,
2. `lotus-workbench` should become an app shell rather than remain a route collection,
3. new strategic work should follow the package and migration direction described above,
4. implementation should proceed in the slices defined here.
