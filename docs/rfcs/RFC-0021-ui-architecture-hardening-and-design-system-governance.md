# RFC-0021: UI Architecture Hardening and Design-System Governance

- Status: IMPLEMENTED
- Date: 2026-04-05
- Owners:
  - lotus-workbench maintainers
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-platform maintainers

## Summary

`lotus-workbench` now has a credible application shell, a functioning `Portfolio` surface, a
stable `Performance` surface, and the first AI-facing workflow in `Advisor Brief`.

That progress also makes the next problem explicit:

1. shared quality is improving, but too much UI consistency still depends on manual discipline,
2. typography, spacing, table behavior, statuses, and surface rules still drift at the page level,
3. multiple routes still solve the same design problems with local class names and custom variants,
4. feature velocity is now high enough that inconsistency debt will compound unless the shared UI
   architecture is strengthened.

This RFC proposes the next deliberate foundation step:

1. consolidate a formal UI foundation layer,
2. standardize shared product primitives,
3. reduce page-local styling and naming drift,
4. make consistency the default path through architecture.

This is not a page-cleanup RFC. It is a product-wide frontend hardening RFC.

## Why This RFC Is Next

The current product is past the point where page-by-page polish is enough.

Current reality:

1. `Portfolio` and `Performance` now carry enough product weight that shared UI drift is visible,
2. the shell and app-oriented package direction already exist, so the right next step is
   standardization, not another architectural reset,
3. newer product-quality work has improved the UI, but some of the best patterns still live too
   close to route-level code,
4. future app surfaces will become slower and riskier to build if the current system remains only
   partially governed.

If this RFC is not done now:

1. every new screen will continue to make small local design decisions,
2. review cost will rise because styling intent will remain distributed,
3. visual and interaction drift will compound,
4. design-system debt will become more expensive than feature work itself.

This is therefore the correct next foundation step for `lotus-workbench`.

## Scope Clarification

This RFC is broad in product reach but deliberately narrow in implementation style.

It is:

1. a systematization RFC,
2. a shared-primitives RFC,
3. a naming and composition cleanup RFC,
4. a staged migration RFC.

It is not:

1. a big-bang visual redesign,
2. a mandate to rewrite every page before value is shipped,
3. a license to abstract every component into a generic wrapper,
4. a brand-refresh RFC,
5. a backend-contract RFC.

The intended outcome is controlled consolidation, not abstraction theatre.

## Current Source Reality

The RFC must respond to how the repo actually works today.

### What already exists

`lotus-workbench` already has:

1. a shell architecture under `src/shell/`,
2. a design-system area under `src/design-system/`,
3. major feature surfaces under `src/apps/`,
4. meaningful shared tokens and CSS variables in `src/app/globals.css`,
5. established product surfaces where UI inconsistency is now visible enough to govern.

### What is still weak

The current foundation still has these gaps:

1. tokens are present, but not all product decisions are represented cleanly as tokens,
2. some primitives exist, but typography, surfaces, status, and tables are not yet enforced
   systematically,
3. several high-quality patterns are still feature-local rather than first-class shared building
   blocks,
4. naming is partially coherent but not yet stable enough to scale cleanly across many app
   surfaces,
5. CSS is disciplined in parts, but repeated local class patterns still carry too much system
   responsibility.

This RFC should extend the current foundation instead of pretending no foundation exists.

## Relationship to Prior RFCs

This RFC extends earlier Workbench foundation work rather than replacing it.

### RFC-0016 relationship

RFC-0016 established:

1. the application shell,
2. the first design-system foundation,
3. the `src/design-system/` and `src/apps/` product direction.

RFC-0021 is the next maturity layer. It takes the foundation from “usable and credible” to
“governed and enforced.”

### RFC-0020 relationship

RFC-0020 introduced a richer AI-facing surface and a stronger branded interaction language. That
work also exposed gaps:

1. several high-quality patterns exist, but not all are yet promoted into shared primitives,
2. some new product-quality rules still live in route or feature CSS,
3. the same product should not need repeated local work to achieve the same quality bar.

RFC-0021 is the architecture response to that gap.

## Problem Statement

`lotus-workbench` has a growing product surface area but not yet enough systemic UI governance.

Current issues:

1. typography rules are partially tokenized but not yet enforced through reusable variants,
2. spacing and sizing use a disciplined baseline in many places, but one-off values still appear,
3. cards, panels, rails, and tables are converging visually but still implemented through
   partially duplicated patterns,
4. navigation patterns such as mode tabs, section tabs, and drill-down links are not yet governed
   through one shared system,
5. semantic states such as `ready`, `partial`, `unavailable`, `stale`, and `review` exist across
   features, but are not fully centralized,
6. financial formatting is improving but still not guaranteed through one shared presentation
   layer,
7. page files still carry too much local styling and composition logic for a product of this
   scope,
8. naming remains partially inconsistent across shared UI concepts.

This weakens:

1. code cleanliness,
2. UX consistency,
3. reviewability,
4. long-term maintainability,
5. future screen delivery speed.

## Goals

1. Make consistency the default path through architecture, not preference.
2. Centralize design decisions into readable, product-level tokens and primitives.
3. Standardize typography, spacing, navigation, states, tables, cards, and formatting rules.
4. Reduce page-local styling duplication and custom variants.
5. Improve naming clarity and reuse across UI concepts.
6. Keep the result banking-grade, restrained, and operationally credible.

## Non-Goals

1. Rebuilding every screen visually from scratch in one wave.
2. Introducing a theoretical design system that is disconnected from shipped product needs.
3. Replacing all feature components with hyper-generic abstractions.
4. Adding visual novelty or decorative branding unrelated to product clarity.
5. Changing business workflows or backend contracts for the sake of UI cleanup alone.

## Decision

`lotus-workbench` will strengthen its frontend architecture around a governed UI foundation with
shared tokens, primitives, composition patterns, and semantic display rules.

The product should move from:

1. “high-quality screens built by careful effort”

to:

2. “high-quality screens produced by default because the shared architecture makes the right path
   the easiest path.”

## Architectural Rules

The following rules are mandatory for implementation.

### 1. Shared layer first

If a pattern appears in more than one product surface and has the same semantic role, it should be
implemented in the shared layer before more page-local copies are added.

### 2. No “god components”

Shared components must be explicit and intention-revealing.

Rejected pattern:

1. one highly flexible `Card` or `InfoBox` with many flags and unclear semantics.

Preferred pattern:

1. a small number of explicit surface primitives with clear product roles.

### 3. Product semantics over technical semantics

Primitive and variant names should describe product meaning, not implementation accidents.

Rejected examples:

1. `CustomCard`,
2. `InfoBox`,
3. `CompactThing`,
4. `SmallBadgeVariantTwo`.

Preferred examples:

1. `SectionBlock`,
2. `MetricPanel`,
3. `SemanticBadge`,
4. `AuditMetadataStrip`.

### 4. No new page-local system rules

Page files may compose the system, but they should not define new typography scales, spacing
systems, badge systems, or table conventions unless the RFC or a later approved RFC explicitly
requires it.

### 5. Real patterns only

A shared primitive must come from repeated real usage in the product, not speculative future
abstraction.

## Definition of Success

This RFC succeeds if the product becomes more consistent because the codebase makes inconsistent
choices harder to write.

That means:

1. fewer page-local styling decisions,
2. fewer duplicate layout and status patterns,
3. more shared component usage in `Portfolio` and `Performance`,
4. clearer naming and reviewability,
5. more predictable behavior for states, formatting, tables, and navigation.

This RFC does not succeed if:

1. the product only looks more consistent in a few screenshots,
2. the code gets more abstract but harder to understand,
3. teams still need to remember style rules manually because the shared system does not embody
   them.

## Architecture Direction

The frontend should be treated as five related layers:

### 1. Foundation tokens

Own:

1. typography scale,
2. spacing scale,
3. sizing scale,
4. border/radius rules,
5. semantic color roles,
6. focus ring rules,
7. elevation rules,
8. z-index rules,
9. control heights,
10. row heights,
11. icon sizes.

### 2. Primitive UI layer

Own:

1. text variants,
2. section headers,
3. page headers,
4. badges and semantic states,
5. buttons and action hierarchy,
6. tabs and segmented controls,
7. cards, panels, rails, and strips,
8. empty, loading, error, partial, and unavailable states.

### 3. Data-display layer

Own:

1. metric presentation,
2. key-value display,
3. evidence chips,
4. formatted values,
5. data tables and table shells,
6. side rails for evidence/supportability.

### 4. Composition layer

Own:

1. page shell,
2. page header,
3. toolbar row,
4. section stack,
5. main-with-rail layout,
6. summary strips,
7. audit/provenance strips.

### 5. Feature layer

Feature routes and app modules should compose the shared system rather than define their own design
language.

## Product Standards This RFC Establishes

### Typography system

The UI must expose reusable variants for:

1. page title,
2. section title,
3. subsection title,
4. card title,
5. eyebrow/overline,
6. label,
7. body,
8. secondary text,
9. metadata,
10. metric value,
11. table header,
12. table cell,
13. button text,
14. badge text.

Rules:

1. apply through reusable variants or mapped primitives,
2. not through page-local font-size guessing,
3. use tabular numerals by default for financial displays,
4. maintain disciplined casing and tracking for labels and headers.

### Spacing and sizing

Spacing must be tokenized for:

1. page frame,
2. section gap,
3. toolbar gap,
4. card padding,
5. rail gap,
6. row spacing,
7. form spacing,
8. chip spacing,
9. table cell padding.

Rules:

1. prefer an 8px-based rhythm,
2. remove scattered magic numbers where possible,
3. preserve density without visual crowding.

### Surfaces and containers

The system must define distinct product roles for:

1. page shell,
2. standard card,
3. metric card,
4. side rail panel,
5. warning/exception panel,
6. audit strip,
7. supportability panel,
8. action list,
9. empty state panel.

Rules:

1. avoid “box soup,”
2. define relative emphasis rather than giving every surface equal visual weight,
3. enforce padding, radius, border, and title treatment through shared patterns.

### Navigation

Shared navigation patterns must govern:

1. module navigation,
2. mode tabs,
3. sub-tabs,
4. drill-down action lists,
5. breadcrumbs,
6. back-navigation affordances.

Rules:

1. active-state treatment must be consistent,
2. naming must be consistent,
3. spacing and selection behavior must be shared,
4. mode switching such as `Summary / Analysis / Advisor Brief / Evidence` must use one shared
   pattern.

### Semantic states

The system must centralize:

1. `ready`,
2. `partial`,
3. `unavailable`,
4. `warning`,
5. `success`,
6. `review`,
7. `source-grounded`,
8. `stale`,
9. `refreshing`,
10. `draft`,
11. `live`.

Rules:

1. semantic meaning must be centralized,
2. colors and styling must be shared,
3. naming must not drift by feature.

### Tables and data grids

The system must define one table/data-grid language for:

1. header styling,
2. row density,
3. numeric alignment,
4. hover/selected states,
5. totals rows,
6. empty/loading/error table states,
7. pagination controls,
8. sticky header rules,
9. truncation rules,
10. currency/percentage/date presentation.

If AG Grid remains in use for some modules, the theme and wrapper behavior must be shared rather
than page-specific.

### Financial formatting

Formatting utilities must centralize:

1. money,
2. percentages,
3. basis points,
4. large values,
5. dates,
6. date ranges,
7. timestamps,
8. identifiers,
9. benchmark labels,
10. portfolio labels.

Rules:

1. values should render consistently in cards, chips, rails, and tables,
2. negative values, currency placement, precision, and units should not vary ad hoc.

## Priority Migration Targets

This RFC should focus first on the surfaces that already define the current product standard.

Priority order:

1. shared shell and design-system layer,
2. `Performance`,
3. `Portfolio`,
4. any other screen only after the shared layer and the two primary workbench surfaces are
   coherent.

Reason:

1. `Performance` and `Portfolio` already expose enough repeated patterns to justify systemization,
2. they are the current user-visible quality bar,
3. solving them through shared architecture creates leverage for future surfaces.

## Implementation Slices

The work should be delivered in small, auditable slices with meaningful commits.

### Slice 1: UI foundation audit and token baseline

Outcome:

1. inventory the current token and primitive surface,
2. identify duplication and drift hotspots,
3. establish the normalized token baseline and architecture map.

Implementation work:

1. audit `globals.css`, `src/design-system/`, and major app surfaces,
2. document current tokens and missing token domains,
3. introduce any missing top-level token groups for typography, spacing, control heights,
   table density, and semantic states,
4. remove obvious token duplication with low risk.

Commit plan:

1. `docs: add UI architecture audit ledger`
2. `refactor: normalize shared token groups`

Acceptance gate:

1. token categories are explicit and readable,
2. the repo has a traceable inventory of current gaps,
3. no feature behavior changes are required yet.
4. a persistent implementation ledger exists so later slices can explicitly close identified gaps.

### Slice 2: Typography and formatted value primitives

Outcome:

1. shared text variants exist,
2. shared financial formatting presentation is standardized.

Implementation work:

1. add or strengthen reusable text primitives and variant mapping,
2. centralize tabular numeric treatment,
3. standardize label/eyebrow/metadata/header styles,
4. normalize money, percent, and date presentation utilities where duplicated.

Commit plan:

1. `feat: add shared typography variants`
2. `refactor: standardize financial value presentation`

Acceptance gate:

1. at least `Portfolio` and `Performance` consume the shared text system for primary headings,
   labels, and key metrics,
2. financial values no longer rely on page-local numeric styling.
3. typography and formatted-value migration can be demonstrated with concrete before/after
   reductions in page-local classes or formatting logic.

### Slice 3: Page composition and surface primitives

Outcome:

1. page-level structure becomes consistent by composition.

Implementation work:

1. introduce or refine shared primitives such as:
   - `AppPageShell`
   - `PageHeader`
   - `PageContextBar`
   - `PageToolbar`
   - `MainWithSideRailLayout`
   - `SectionBlock`
   - `SectionHeader`
   - `AuditMetadataStrip`
2. standardize card/panel/surface variants and usage guidance,
3. reduce page-local container styling in `Portfolio` and `Performance`.

Commit plan:

1. `feat: add shared page composition primitives`
2. `refactor: align portfolio and performance surface containers`

Acceptance gate:

1. shared page shells are used in the main product surfaces,
2. repeated shell-level and section-level layout CSS is reduced materially.
3. page files become more composition-oriented and less styling-oriented.

### Slice 4: Navigation, action hierarchy, and semantic states

Outcome:

1. navigation and actions behave consistently across screens.

Implementation work:

1. standardize module tabs, mode tabs, sub-tabs, and drill-down lists,
2. introduce or normalize:
   - `SemanticBadge`
   - `SupportabilityState`
   - `InlineStatusNote`
   - primary/secondary/tertiary/utility button hierarchy
3. remove route-local badge and action styling drift.

Commit plan:

1. `feat: standardize mode tabs and drilldown navigation`
2. `refactor: unify semantic badges and action hierarchy`

Acceptance gate:

1. `Summary / Analysis / Advisor Brief / Evidence` and similar patterns use one shared
   implementation,
2. state naming and visuals are consistent across the product.
3. button/action hierarchy is demonstrably consistent in the primary user-facing flows.

### Slice 5: Table and grid system hardening

Outcome:

1. tables become consistent by system rather than by page.

Implementation work:

1. add a shared table shell or table theme wrapper,
2. centralize header styling, density, numeric alignment, hover, totals rows, empty/loading states,
3. normalize formatter usage across cards and tables,
4. align AG Grid usage behind shared configuration if still required.

Commit plan:

1. `feat: add shared data-table shell`
2. `refactor: align portfolio and performance tables`

Acceptance gate:

1. major financial tables share one design language,
2. numeric alignment and row density are consistent,
3. loading/empty/error table states follow one product pattern.
4. if AG Grid remains in use, page teams consume a shared wrapper or configuration seam rather
   than styling grids individually.

### Slice 6: State system and resilience patterns

Outcome:

1. loading, partial, empty, unavailable, stale, and error states are shared UX patterns.

Implementation work:

1. create shared state sections and copy structure,
2. refactor major surfaces to consume them,
3. standardize supportability presentation and no-results treatment.

Commit plan:

1. `feat: add shared screen-state components`
2. `refactor: align portfolio and performance state handling`

Acceptance gate:

1. state treatment is visually and behaviorally consistent,
2. page code no longer hand-builds most empty/unavailable panels.
3. state copy follows one heading/body/action structure across the product.

### Slice 7: Naming and API cleanup

Outcome:

1. UI concepts become easier to discover, review, and extend.

Implementation work:

1. audit shared component and prop naming,
2. remove vague or overlapping primitive names,
3. normalize variant naming across typography, surfaces, status, and action primitives,
4. simplify over-flexible component APIs where they obscure intended usage.

Commit plan:

1. `refactor: normalize shared component naming`
2. `refactor: simplify shared primitive APIs`

Acceptance gate:

1. shared primitives have consistent prop naming and discoverable semantics,
2. feature teams can compose the design system without guessing between overlapping components.
3. the shared layer has fewer overlapping concepts and less naming ambiguity than before the slice.

### Slice 8: Governance, documentation, and rollout closure

Outcome:

1. the system is documented well enough to be enforced and extended.

Implementation work:

1. document the token map, primitive catalogue, naming rules, and composition rules,
2. add contribution guidance for new screens,
3. update RFC status and implementation notes,
4. ensure tests cover the critical shared primitives and migrated screens.

Commit plan:

1. `docs: add workbench UI system usage guide`
2. `docs: mark RFC-0021 implementation status`

Acceptance gate:

1. future work has clear usage guidance,
2. the RFC can be reviewed against visible artifacts and not just code intent.
3. the implementation ledger is updated with completed migrations and explicitly deferred follow-up
   items if any remain.

## Testing Requirements

Every slice must include meaningful tests.

### Required test categories

1. token and variant mapping tests where logic exists,
2. component unit tests for shared primitives,
3. integration tests proving `Portfolio` and `Performance` consume the shared system correctly,
4. focused visual/browser smoke where shared navigation or state patterns are materially changed,
5. regression tests for formatting and status semantics.

### Required evidence for slice closure

Each slice should produce explicit evidence in the commit series or accompanying docs:

1. what duplication or inconsistency was removed,
2. what shared primitive or rule replaced it,
3. what tests prove the new system behavior,
4. what pages or features were migrated in that slice,
5. what known gaps remain open for later slices.

### Explicit quality rule

Do not add tests that only snapshot markup without proving behavior or system rules.

High-value examples:

1. numeric values receive tabular treatment and right alignment in shared table shells,
2. semantic state variants map to the correct accessible labels and visual classes,
3. mode tabs share active-state logic across screens,
4. shared empty/loading/unavailable sections preserve the same heading/body/action contract,
5. migrated pages no longer duplicate now-shared styling behavior.

## Review and Governance Rules

### Slice advancement rule

Do not move to the next slice until the current slice is:

1. implemented coherently,
2. locally validated,
3. documented in the ledger or RFC where relevant,
4. clean enough that the next slice starts from a stable baseline.

### PR rule

PRs should remain slice-scoped or tightly coupled to one slice concern.

Reject:

1. broad mixed-purpose PRs that add primitives, restyle pages, rename components, and refactor
   tests without a clear slice boundary.

Prefer:

1. one primitive family,
2. one migration theme,
3. one governance/documentation closure.

## Delivery Strategy

This RFC should be implemented on one feature branch with small, meaningful commits, but slices
should remain independently reviewable.

Branch:

1. `feat/rfc0021-ui-architecture-hardening`

Commit discipline:

1. one concern per commit,
2. no “misc cleanup” commits,
3. each commit should either introduce a reusable primitive, migrate one coherent pattern, or
   document one architecture rule.

Review rule:

1. do not advance to the next slice until the current slice is locally verified and coherent,
2. prefer fix-forward within the active slice rather than carrying known inconsistency debt ahead.

## Risks

1. over-abstraction could produce components that are theoretically reusable but hard to consume,
2. a broad refactor could accidentally blur product-specific differences that should remain,
3. migrating too many screens at once could create unnecessary UI churn,
4. shared table work can become risky if grid wrappers are not introduced carefully.

## Mitigations

1. start from real repeated patterns already present in `Portfolio` and `Performance`,
2. prefer explicit primitives over universal “god components,”
3. migrate incrementally and validate at each slice,
4. keep feature semantics intact while standardizing presentation and composition rules.

## Acceptance Criteria

This RFC is complete when:

1. the shared token foundation is materially stronger and less ad hoc,
2. typography, spacing, states, navigation, and table patterns are governed by shared primitives,
3. `Portfolio` and `Performance` materially reduce page-local styling duplication,
4. naming and component APIs are more consistent and easier to review,
5. the product feels more coherent because consistency is enforced by construction,
6. documentation exists so new UI work follows the same system by default,
7. the implementation ledger shows the primary duplicated patterns have either been migrated or
   explicitly deferred with rationale,
8. the repo can demonstrate that shared rules replaced local drift in real product surfaces, not
   just in isolated demo components.

## Definition of Done

RFC-0021 should only be marked `IMPLEMENTED` when all of the following are true:

1. the planned slices are merged,
2. `Portfolio` and `Performance` both consume the strengthened shared system in meaningful areas,
3. the shared primitives are the default path for new page composition, status semantics, and
   navigation patterns,
4. the documentation and ledger make future UI work reviewable against the system,
5. local and CI validation for the affected shared layer and migrated screens are green,
6. the resulting codebase is cleaner and less duplicated than the baseline that started this RFC.

## Implementation Closeout

RFC-0021 is now implemented.

Delivered outcomes:

1. the token baseline and theme contract were normalized,
2. typography and financial formatting were moved onto shared primitives,
3. page composition primitives became the default shell for `Portfolio` and `Performance`,
4. mode navigation, semantic badges, action hierarchy, and disclosure seams are now shared,
5. tables, screen states, and capability states are governed through the shared layer,
6. naming drift and overlapping primitive APIs were materially reduced,
7. `Intake` consumes the shared system; the historical Suite prototype also consumed it before
   the unsupported mock-backed surface was retired under issue #573,
8. the product now has an explicit usage guide for future contributors.

Primary implementation evidence:

1. [UI-ARCHITECTURE-AUDIT-LEDGER.md](../architecture/UI-ARCHITECTURE-AUDIT-LEDGER.md)
2. [workbench-ui-system-usage-guide.md](../architecture/workbench-ui-system-usage-guide.md)

## Approval Requested

Approve this RFC if the team agrees that:

1. the next step in `lotus-workbench` is architecture-led UI hardening rather than another local
   page cleanup,
2. consistency should be enforced through shared primitives, tokens, and naming,
3. the implementation should proceed in the slices and commit discipline defined here.
