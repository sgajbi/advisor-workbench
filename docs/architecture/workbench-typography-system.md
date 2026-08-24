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

Operational UI uses a deliberately small self-hosted IBM Plex Sans set:

- 400 for business reading and table values
- 500 for routine labels and metadata
- 600 for headings, actions, selected states, and decision-critical values
- fallback: `"IBM Plex Sans"`, `ui-sans-serif`, `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`

The application does not request interpolated or one-off weights. Routine Workbench surfaces must
not introduce 650, 675, 700, 720, 735, 750, 760, or 800 as a substitute for hierarchy.

The self-hosted Cormorant Garamond 700 face is reserved for Lotus brand expression, currently the
shell wordmark. Self-hosted IBM Plex Mono 400 and 500 are reserved for technical evidence and
identifiers; they must not replace the operational reading face.

## Delivery And Supply-Chain Control

Font delivery is same-origin and uses the built-in Next.js local-font pipeline. The browser must
not contact Google Fonts or another public font service. IBM Plex Sans and the visible Lotus
wordmark face are preloaded; evidence faces load only when used so routine advisor screens do not
pay for technical typography they do not render.

Governed truth lives in:

- `config/font-assets.json` for semantic role, upstream repository, release tag, immutable commit,
  license, file path, and SHA-256 checksum
- `src/assets/fonts/` for the checked-in WOFF2 assets
- `docs/licenses/fonts/` for the upstream SIL Open Font License texts
- `.gitattributes` for binary font treatment and LF-stable publisher-license bytes across platforms
- `src/app/fonts.ts` for the Next.js local-font mapping
- `npm run quality:font-assets` for checksum, license, loader-coverage, WOFF2, semantic-role, and
  public-runtime-host enforcement

Do not add a public CSS import, CDN font URL, unlicensed font file, page-local `@font-face`, or a new
font package. A font change requires an issue-backed brand, accessibility, payload, provenance,
license, fallback, browser, and responsive-geometry review.

## Productive Type Contract

Workbench uses a productive scale for dense, task-focused business software. Density comes from
alignment, grouping, and progressive detail rather than tiny text or indiscriminate emphasis.

| Role | Default size | Weight | Use |
| --- | ---: | ---: | --- |
| Workspace and page title | 24px | 600 | Current business task |
| Section and panel title | 18px | 600 | Decision or evidence grouping |
| Subsection title | 14px | 600 | Compact inner grouping |
| Body and table cell | 14px | 400 | Business reading and record values |
| Supporting copy | 13px | 400 | Secondary context that remains readable |
| Label and table header | 12px | 500/600 | Routine field and column orientation |
| Compact metric | 18px | 600 | Financial and analytical scan anchor |
| Primary metric | 28px | 600 | Deliberately prominent outcome only |

Routine labels use sentence or title case with restrained `0.01em` tracking. Uppercase and wider
tracking are reserved for genuine eyebrow, status-code, badge, or technical-evidence roles.

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

- `dataLabel`: compact sentence-case business labels
- `microLabel`: compact metadata and control labels; uppercase only when the content is a genuine
  eyebrow or code
- `metadata`: IDs, dates, timestamps, audit context

The shared Review Context strip applies those roles as one cross-workspace contract: the eyebrow is
the only uppercase micro-label; Mandate, Booking centre, Business date, Base currency, and Reporting
currency are sentence-case 12px/500 labels; confirmed business values are 14px/500; unavailable
values reduce to 14px/400; and **Support details** uses the 14px/600 control role. Portfolio and
client identifiers use the governed technical-evidence family only inside the collapsed support
disclosure. Do not recreate these properties in a consuming screen.

## Casing Rules

- sentence case: body copy, helper text, controls, buttons
- title case: page and section headings where the surrounding surface already uses title case
- uppercase only: genuine eyebrow, status-code, and badge roles; routine data labels, control
  labels, and table headers remain sentence or title case

## Financial Geometry

Currency values, percentages, dates, and other compact decision values must remain indivisible.
Use tabular numerals with normal word breaking and no wrapping; reflow the containing grid before
allowing a value such as `SGD 1,250,000.00` to collide with another metric. The shared Portfolio
health strip therefore renders as three columns by two rows on wide screens, two columns at narrow
desktop and tablet widths, and one column on compact phones.

Long technical identifiers are a separate evidence role and may wrap at safe boundaries.

## Typeface Selection Evidence

Issue #829 compared pinned IBM Plex Sans 1.1.0 and Inter 4.1 assets in the same optimized Workbench
build. The isolated Playwright comparison captures Portfolio Review at 1440, 1024, 768, and 519
pixels, injects each candidate independently, records computed type and containment evidence, and
fails on page overflow, metric overflow, or wrapped financial values:

```bash
npm run test:e2e:typography:compare
npm run test:e2e:portfolio:review-context-typography
```

Both candidates passed. IBM Plex Sans was selected because it preserved a professional productive
software character while reducing the operational font payload from 352,240 bytes to 196,820
bytes and rendering the longest tested AUM/Invested value at 168 pixels rather than Inter's 177
pixels. This is a measured Workbench decision, not a claim that one family is universally more
legible or accessible.

## Implementation Notes

Centralized typography lives in:

- `src/app/fonts.ts`
- `src/design-system/theme/tokens.ts`
- `src/design-system/components/text.tsx`
- `src/styles/global/tokens.css` for typography custom properties
- `src/styles/global/workbench-shell.css` for shared shell and Workbench typography classes
- `src/styles/global/legacy-global.css` or `src/styles/global/legacy-feature-overrides.css` only while
  legacy selectors are being migrated to owned modules

`src/app/globals.css` is import-only and must not receive new typography declarations.

Shared components should prefer semantic variants over page-local font classes.

Component-specific layout and typography belong in an owned CSS module. Do not restore migrated
KPI, Portfolio health-strip, Proposal, or record-selector selectors to the legacy global layers.

## Normalization Targets

When touching workbench surfaces, remove page-local typography drift in:

- KPI tiles
- summary strips
- analytical tables
- navigation controls
- badges
- drawers and dialogs
- page and panel headings
