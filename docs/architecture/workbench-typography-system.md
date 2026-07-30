# Workbench Typography System

## Purpose

This document defines the banking-grade typography architecture for Lotus Workbench.

The system is designed to keep portfolio, performance, risk, proposal, and advisory surfaces:

- calm
- precise
- premium
- highly legible
- reusable through shared semantics

## Font Strategy

Operational UI uses a single sans-serif family:

- `Inter Variable`
- fallback: `Inter`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`

The serif display family is reserved for Lotus brand expression only, such as the shell logo wordmark.

## Numeric Typography

Financial and analytical surfaces use:

- `font-variant-numeric: tabular-nums slashed-zero`
- `font-feature-settings: "tnum" 1, "zero" 1`

Apply this to:

- KPI values
- analytical tables
- summary strips
- dates, identifiers, and counts where alignment matters

## Semantic Variants

Shared `Text` variants:

- `workspaceTitle`
- `pageTitle`
- `sectionTitle`
- `panelTitle`
- `subsectionTitle`
- `metricValueXL`
- `metricValueL`
- `metricValueM`
- `body`
- `bodySmall`
- `helperText`
- `metadata`
- `dataLabel`
- `microLabel`
- `tableHeader`
- `tableCell`
- `buttonLabel`
- `badgeLabel`
- `tooltipTitle`
- `tooltipBody`

Backward-compatible aliases remain available for legacy surfaces while they are being normalized.

## Usage Rules

### Titles

- `workspaceTitle`: top workspace identity only
- `pageTitle`: page-level title inside a workspace
- `sectionTitle`: major section grouping
- `panelTitle`: card or panel heading
- `subsectionTitle`: compact inner section heading

### Cards and Metrics

Compact KPI tiles should use:

1. `dataLabel`
2. one metric variant
3. `bodySmall` or `helperText`

Do not stack extra emphasis layers in compact cards.

### Tables

- `tableHeader` for column headers
- `tableCell` for body content
- numeric columns right-aligned
- use bold numeric emphasis only when the row actually needs emphasis

### Navigation and Controls

Interactive nav and controls should use the shared button typography:

- segmented controls
- workspace tabs
- action buttons
- shell and rail actions

### Labels and Metadata

- `dataLabel`: compact uppercase data labels
- `microLabel`: eyebrow labels and control labels
- `metadata`: IDs, dates, timestamps, audit context

## Casing Rules

- sentence case: body copy, helper text, controls, buttons
- title case: page and section headings where the surrounding surface already uses title case
- uppercase only: `dataLabel`, `microLabel`, `tableHeader`, `badgeLabel`

## Implementation Notes

Centralized typography lives in:

- `src/design-system/theme/tokens.ts`
- `src/design-system/components/text.tsx`
- `src/styles/global/tokens.css` for typography custom properties
- `src/styles/global/workbench-shell.css` for shared shell and Workbench typography classes
- `src/styles/global/legacy-global.css` or `src/styles/global/legacy-feature-overrides.css` only while
  legacy selectors are being migrated to owned modules

`src/app/globals.css` is import-only and must not receive new typography declarations.

Shared components should prefer semantic variants over page-local font classes.

## Normalization Targets

When touching workbench surfaces, remove page-local typography drift in:

- KPI tiles
- summary strips
- analytical tables
- navigation controls
- badges
- drawers and dialogs
- page and panel headings
