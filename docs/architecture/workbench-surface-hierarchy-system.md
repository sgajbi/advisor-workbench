# Workbench Surface Hierarchy System

## Purpose

This document defines the shared spacing, border, radius, and surface hierarchy for Lotus Workbench.

The system is designed to keep portfolio, performance, risk, proposal, and advisory screens:

- precise
- calm
- premium
- dense but readable
- reusable through shared primitives

## Surface Tiers

Use the same small set of semantic surface levels across the product:

- Tier 0: page background and neutral workspace foundation
- Tier 1: primary review panels and main workspace containers
- Tier 2: grouped sections, metric regions, compact cards, control bars
- Tier 3: chips, segmented controls, badges, and inline utility surfaces

Not every container should carry the same visual weight. The tier system should make reading order obvious without adding noise.

## Background Strategy

The shared surface color stack is:

- `color.surface.page`
- `color.surface.foundation`
- `color.surface.primary`
- `color.surface.secondary`
- `color.surface.tertiary`

Rules:

- keep the page foundation neutral and restrained
- reserve pure white or near-white for primary working surfaces
- use secondary and tertiary surfaces to group related detail
- avoid random tonal changes without semantic purpose

## Borders, Radius, and Elevation

Structural styling uses one restrained border family:

- `color.border.default`
- `color.border.strong`

Radius tokens are intentionally limited:

- `radius.control`: 8px
- `radius.tile`: 12px
- `radius.panel`: 16px
- `radius.xl`: 20px for rare executive surfaces only

Shadow usage stays minimal:

- `elevation.none` by default
- `elevation.soft` only when a higher-elevation overlay or rare emphasis surface needs separation

Prefer tonal layering and disciplined borders over visible drop shadows.

## Spacing Scale

All layout rhythm should come from the shared spacing scale:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Use the semantic layout tokens instead of page-local numbers when composing workbench modules.

## Panel Density

Shared panel composition is expressed through the panel-shell density contract:

- `default`: major review panels
- `compact`: side rail panels, grouped analytical sections, denser modules
- `dense`: tightly packed utility and support blocks

Primary shared panel tokens:

- `layout.panelPaddingDefault`
- `layout.panelPaddingCompact`
- `layout.panelPaddingDense`
- `layout.workbenchPanelGap`
- `layout.workbenchPanelGapMajor`
- `metricTile.height.default`
- `metricTile.height.compact`

## Component Usage

Shared composition should flow through reusable primitives:

- `Panel`
- `AnalyticsModule`
- `WorkbenchRailCard`
- `WorkbenchChartShell`
- `WorkbenchDataGridFrame`

Pages should choose a semantic surface and density, not redefine borders and padding ad hoc.

## Metric and Table Guidance

Metric tiles should stay compact and uniform:

1. label
2. value
3. one support line

Analytical tables should use:

- one clear outer container
- compact row rhythm
- restrained separators
- no extra nested card framing around each row

## Drawers, Nav, and Utility Surfaces

Drawers, popovers, nav controls, and status chips should reuse the same border family, radius family, and spacing rhythm so they feel native to the same product.

Utility content should remain visually quieter than decision content.

## Implementation Notes

Centralized surface and spacing decisions live in:

- `src/design-system/theme/tokens.ts`
- `src/design-system/components/panel.tsx`
- `src/design-system/components/analytics-module.tsx`
- `src/app/globals.css`

Normalize page-level styling toward these primitives when touching a surface.
