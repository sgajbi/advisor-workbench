# Workbench UI System Usage Guide

- RFC: RFC-0021
- Status: Active product standard
- Last updated: 2026-04-05

## Purpose

This guide defines the governed UI patterns for `lotus-workbench`.

It exists so new UI work:

1. uses shared primitives by default,
2. avoids page-local styling drift,
3. remains banking-grade, restrained, and operationally credible,
4. is easier to review because the intended design language is explicit.

This is a usage guide, not a theory document. It should be read alongside:

1. [RFC-0021-ui-architecture-hardening-and-design-system-governance.md](../rfcs/RFC-0021-ui-architecture-hardening-and-design-system-governance.md)
2. [UI-ARCHITECTURE-AUDIT-LEDGER.md](UI-ARCHITECTURE-AUDIT-LEDGER.md)

## Design-System Layers

The workbench UI should be built through these layers:

1. foundation tokens
2. primitive UI components
3. data-display primitives
4. page composition primitives
5. feature modules

Feature code should compose the shared layers. It should not redefine them.

## Foundation Rules

### Tokens

Source of truth:

1. [tokens.ts](../../src/design-system/theme/tokens.ts)
2. [tokens.css](../../src/styles/global/tokens.css)
3. [workbench-shell.css](../../src/styles/global/workbench-shell.css)

`src/app/globals.css` is only the governed global-style import entrypoint. Do not add token,
typography, layout, or feature declarations there; place new shared declarations in the matching
global layer and migrate legacy declarations out of `legacy-global.css` or
`legacy-feature-overrides.css` as ownership becomes clear.

Use tokens for:

1. typography
2. spacing
3. radius
4. border
5. semantic colors
6. control heights
7. table density
8. focus treatment

Do not add arbitrary one-off spacing or font-size values in page code unless there is a strong product reason and the shared layer cannot express the need cleanly.

### Typography

Primary typography primitive:

1. [text.tsx](../../src/design-system/components/text.tsx)

Use semantic variants rather than local classes for:

1. page titles
2. section titles
3. card titles
4. labels
5. metadata
6. body copy
7. metric values

Financial values should use tabular numerals through the shared typography and formatting layer.

### Formatting

Shared financial formatting lives in:

1. [financial-formatters.ts](../../src/design-system/utils/financial-formatters.ts)

Use shared formatting for:

1. currency
2. percentages
3. dates
4. date ranges
5. identifiers and display labels where the same semantics recur

Do not duplicate formatting logic inside route modules if the shared layer already supports the value type.

## Shared Primitive Catalogue

### Page composition

Use:

1. [app-page-shell.tsx](../../src/design-system/components/app-page-shell.tsx)
2. [main-with-side-rail-layout.tsx](../../src/design-system/components/main-with-side-rail-layout.tsx)
3. [workbench-page-frame.tsx](../../src/design-system/components/workbench-page-frame.tsx)
4. [section-block.tsx](../../src/design-system/components/section-block.tsx)
5. [section-header.tsx](../../src/design-system/components/section-header.tsx)

Use these when building:

1. a full page shell
2. a main-with-rail composition
3. a named section with header and body
4. a consistent title/action region

Do not hand-build new page shell structures in feature routes unless the shared composition primitives cannot represent the screen.

### Navigation and actions

Use:

1. [mode-tabs.tsx](../../src/design-system/components/mode-tabs.tsx)
2. [workbench-choice-group.tsx](../../src/design-system/components/workbench-choice-group.tsx)
3. [action-button.tsx](../../src/design-system/components/action-button.tsx)
4. [action-link.tsx](../../src/design-system/components/action-link.tsx)
5. [disclosure-toggle-button.tsx](../../src/design-system/components/disclosure-toggle-button.tsx)

Rules:

1. use `ModeTabs` only when each tab controls an associated `tabpanel`; provide one stable `idBase`
2. use `WorkbenchChoiceGroup` for one-of-many filters, horizons, bases, groupings, and visual choices
3. let both primitives own arrow, Home, End, focus, selected, and disabled behavior; do not recreate it locally
4. use `ActionButton` for explicit primary, secondary, and quiet actions
5. use `ActionLink` when the action is navigation-first
6. use `DisclosureToggleButton` for panel-level expand/collapse seams

Do not assign tab semantics to a choice that merely redraws or filters the same business surface.
Do not use either primitive for a binary on/off state; use a governed switch or toggle pattern.

Panel disclosure vocabulary is governed:

1. collapsed state: `Expand`
2. expanded state: `Collapse`

Do not introduce new panel-toggle vocabulary such as `Open detail`, `Show more`, or `View more` for equivalent module-level interactions.

### Semantic states

Use:

1. [semantic-badge.tsx](../../src/design-system/components/semantic-badge.tsx)
2. [screen-state-panel.tsx](../../src/design-system/components/screen-state-panel.tsx)
3. [capability-state-panel.tsx](../../src/design-system/components/capability-state-panel.tsx)
4. [workspace-status-panel.tsx](../../src/design-system/components/workspace-status-panel.tsx)

Use these for:

1. readiness and supportability
2. loading, empty, partial, unavailable, and error surfaces
3. status strips and compact status rows

Do not introduce local badge color systems or route-specific status language if the state matches a shared semantic role.

### Tables and metrics

Use:

1. [analytics-table.tsx](../../src/design-system/components/analytics-table.tsx)
2. [workbench-summary-metric-strip.tsx](../../src/design-system/components/workbench-summary-metric-strip.tsx)
3. [analytics-stat.tsx](../../src/design-system/components/analytics-stat.tsx)
4. [kpi-stat-tile.tsx](../../src/design-system/components/kpi-stat-tile.tsx)

Rules:

1. right-align numeric table columns
2. use shared density and variant controls
3. use shared empty/loading table states
4. use shared metric-strip primitives for repeatable KPI rows

Do not create page-local table shells for standard financial tables unless a materially different interaction model is required.

## Naming Rules

### Prefer semantic names

Preferred:

1. `SectionHeader`
2. `SemanticBadge`
3. `DisclosureToggleButton`
4. `ScreenStatePanel`
5. `AnalyticsTable`

Avoid:

1. `CustomCard`
2. `InfoBox`
3. `StatusChip`
4. `SectionHeaderAlt`
5. page-specific aliases around identical shared primitives

### Prop naming

Shared components should keep prop names stable and intention-revealing:

1. `title`
2. `subtitle`
3. `actions`
4. `variant`
5. `density`
6. `tone`
7. `priority`
8. `expanded`
9. `onToggle`

Avoid adding alternate names for the same concept unless the new name reflects a real semantic distinction.

## Contribution Rules

When adding or changing UI:

1. check the design-system first,
2. reuse an existing primitive if the semantic role already exists,
3. only add a new primitive when the pattern is clearly repeated and not expressible through the current shared system,
4. update tests whenever a shared contract changes,
5. update this guide or the ledger if the change establishes a new governed rule.

## Review Checklist

Use this checklist for PR review:

1. does the page use shared tokens and primitives instead of local styling?
2. are typography and metric presentation using the shared text and formatting system?
3. are states using shared semantic status and state panels?
4. are tables using the shared table shell and numeric alignment rules?
5. are tabs, actions, and disclosure seams using the governed navigation/action contracts?
6. did the change remove duplication or add new duplication?
7. do tests prove behavior or contract, rather than only static markup?

## Known Deferred Areas

The following are intentionally outside RFC-0021 closure:

1. broad visual redesign beyond the governed system changes
2. backend contract changes for the sake of UI cleanup
3. speculative abstractions for screens that do not yet exist

Future UI work should start from this guide and only deviate with explicit justification.
