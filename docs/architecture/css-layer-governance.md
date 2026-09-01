# Workbench CSS Layer Governance

`src/app/globals.css` is now a composition entrypoint, not the owner of Workbench screen
presentation. It imports governed global layers in the same cascade order as the original monolithic
stylesheet:

1. `src/styles/global/tokens.css` — design tokens and foundational custom properties.
2. `src/styles/global/legacy-feature-overrides.css` — early legacy feature overrides preserved in
   original cascade order.
3. `src/styles/global/base.css` — browser and element defaults.
4. `src/styles/global/workbench-shell.css` — shared Workbench shell, typography, panel, and
   navigation primitives.
5. `src/styles/global/legacy-global.css` — remaining legacy global feature selectors pending
   migration beside owning React features.

The migration rule is incremental: move selectors only when the owning component, feature, or shared
primitive boundary is clear and validation can prove no behavior regression. Do not perform bulk
mechanical splits that hide ownership or cascade changes.

The same boundary applies inside `*.module.css`. CSS Modules are locally scoped by default;
`:global(...)` is a narrow interoperability escape, not a way to place a feature-wide global
stylesheet outside the global-layer budgets. The governance baseline scans every CSS Module under
`src`, permits zero new global escapes by default, and records exact per-file exceptions for legacy
interoperability. Any escape increase fails the blocking lint gate, while an escape reduction fails
until the exact baseline is lowered in the same migration. New modules therefore enter the system
with a zero-escape budget automatically.

Manage's Review Evidence rail is the first selector family migrated from the legacy
`manage-workspace.module.css` escape surface under this rule. Its grid, heading, headline, and
definition-list placement now live in `manage-evidence-rail.module.css` and are applied through the
component's imported class map. Do not restore the retired `manage-evidence-rail*` global class
contract or repair this component from the Manage workspace stylesheet.

Manage Outcome Review follows the same component-owner rule. Its panel, three-fact decision
summary, timeline, actions, source profile, selected-review detail, client-communication boundary,
and evidence states live in `outcome-review.module.css` with zero global escapes. Issue #978 removed
83 escape arms from `manage-workspace.module.css` and the stale Outcome Review declarations from
`legacy-feature-overrides.css`; `outcome-review-*` selectors are forbidden from returning to a
governed global layer. The shared summary-metric primitive exposes a value-class hook so a screen
can truthfully wrap business states without reaching into the primitive through a global selector.

`PortfolioScreenRail` is the first shared cross-route component migrated under this ownership
model. Its presentation is colocated in
`src/apps/portfolio/components/portfolio-screen-rail.module.css`; page-specific shells may own
placement, but they must not repair the rail's colors, spacing, or interaction states globally.
The module also owns the rail's capacity-driven responsive transition: once the compact header's
portfolio, workflow, and current-view tracks cannot fit with their gaps and shell gutters, those
regions stack without clipping or page-level horizontal overflow. Keep boundary-width browser
proof with that owner instead of adding route-specific overflow suppression.

The retired `/suite` prototype has no presentation owner because it no longer owns a product
surface. Its Suite grid, journey, and pipeline selector families were removed with the fabricated
business dataset under issue #573. The global CSS ratchet forbids those selector families from
returning; any future Home presentation must be owned by the canonical Home feature and backed by
governed business state.

Role-correct view controls follow the same ownership rule. `WorkbenchChoiceGroup` owns exclusive
filter, period, basis, and visualization choices in a colocated design-system CSS Module;
`ModeTabs` owns only navigation between associated tab panels. Portfolio and Performance may add
layout-only CSS Modules beside their consuming components, but must not restyle these primitives
through global selector repair. The retired segmented-control, intake-operation-tab,
portfolio-primary-view-tab, and legacy mode-tab selector families are forbidden from returning to
governed global CSS.

The projected Cashflow workflow follows the same bounded-feature rule. Its summary, chart-specific
marks, projection scope, source note, exact schedule treatment, and responsive reflow are owned by
`portfolio-projected-cashflow.module.css`, shared only by the Cashflow module and chart-panel React
owners. Generic Portfolio chart geometry and the reusable `AnalyticsTable` contract remain global
until their own consumer boundaries are proven. Do not repair Cashflow presentation through an
app-shell or route selector; the `portfolio-cashflow` prefix is retired from governed global CSS.

Income and activity follows the same ownership boundary. Booked-record scope, classification-review
posture, exact-value table handling, and directional amount treatment are owned by
`portfolio-income-activity.module.css`. Responsive metric density remains owned by the shared
`WorkbenchSummaryMetricStrip`; feature-local breakpoints must not duplicate or override that
primitive. The `portfolio-income-activity` selector family is retired from governed global CSS.

Performance Analysis dead-path removal follows an even stricter rule: presentation with no
production React consumer has no CSS owner and must be deleted rather than migrated. Issue #684
removed the unused level-section, drilldown-workspace, and insight-pane components together with
their selector families, while preserving the active detail-pane and ranked-panel declarations
that previously shared combined rules. The `performance-analysis-level-*`,
`performance-analysis-drilldown*`, and `performance-analysis-insight-pane*` families are forbidden
from returning to governed global CSS. A future workflow must use the active Analysis architecture
or establish a new issue-backed owner and validation contract; it must not revive an unreachable
alternative layout.

Performance Return Path follows evidence capacity rather than reserving chart capacity regardless
of source shape. `performance-return-path-chart-stage.module.css` owns the multi-observation chart
stage, while `performance-return-path-single-observation-stage.module.css` owns the exact
one-observation comparison. The single-observation owner has no inherited chart minimum height and
reflows from its own inline-size container; the time-series owner retains the established 28.5rem
analytical canvas. The retired `performance-return-path-chart-stage` and
`performance-return-path-single-observation` selector families are forbidden from returning to
global CSS.

Issue #780 applied the same ownership rule to the unreachable pre-BFF Workbench presentation.
The legacy page container, split view, generated position table, constraint rail, summary posture,
and rebalance-status selector families had no production React consumer, so they were deleted rather
than migrated. The resulting exact ratchets are 98 lines and 1,940 normalized bytes for
`legacy-feature-overrides.css` at that tranche, and 10,990 lines and 240,422 normalized bytes for
`legacy-global.css`. Issue #978 subsequently lowered the exact legacy-feature budget to 67 lines
and 1,344 normalized bytes. The retired families are forbidden from returning; future product work must
use the active Workbench container and source-backed screen architecture.

Issue #958 applied consumer-first deletion to the superseded DPM wave command-centre presentation.
The current Rebalance workspace already uses the shared `SectionBlock`/`Panel` and
`AnalyticsTable` primitives plus the active `rebalance-*` composition, while 13 of the 14
`dpm-wave-command-center-*` class names had no production consumer. The remaining panel class
duplicated presentation already owned by those primitives and its header selectors could not match
the current `SectionHeader` markup. All 38 escape arms and the obsolete class emission were removed,
lowering the exact `manage-workspace.module.css` baseline from 660 to 622. The retired prefix is
forbidden from returning. Future Rebalance presentation must extend the owning primitive or active
feature composition; it must not recreate a compatibility selector family.

## Ratchet gate

`npm run lint` and `make lint` run `npm run lint:css-global` before the repository ESLint gate.
Docker CI parity also invokes `npm run lint`, so the same CSS governance ratchet runs inside the
containerized local-CI lane. The CSS gate validates:

- `globals.css` contains only the governed import list;
- imported global layers remain in the documented cascade order;
- each global layer stays within its line and byte budget in
  `scripts/quality/css-global-governance-baseline.json`;
- selector families listed in `forbiddenSelectorPrefixes` do not return to any governed global
  layer after migration to a component owner;
- selector families listed in `retiredSelectorPrefixes` do not return to a governed global layer or
  any discovered CSS Module after their presentation authority is removed;
- every CSS Module is discovered automatically, its selector AST is parsed with
  `postcss-selector-parser`, and every bare or functional `:global` pseudo-class node counts against
  the exact reviewed baseline; comments and attribute values cannot consume allowance, invalid
  selectors fail closed, and a new module begins with zero allowed escapes.

When a migration removes selectors from `legacy-global.css`, lower the corresponding baseline in the
same PR and add the migrated selector family to `forbiddenSelectorPrefixes`. When the presentation
contract is retired rather than moved, add it to `retiredSelectorPrefixes` so an unchanged module
escape budget cannot conceal its return. Increase a budget only
with issue-backed evidence explaining why a selector belongs in a global layer instead of a feature
module. When a migration removes `:global(...)` selectors from a CSS Module, lower that module's
`maxGlobalEscapes` in the same PR; remove the exception entirely when the count reaches zero.

## Ownership expectations

- Shared tokens, typography primitives, shell layout, and cross-route navigation belong in the
  governed global layers.
- Feature-specific selectors should migrate beside the owning feature, preferably through CSS
  Modules already used in `src/features/**` and `src/apps/**`.
- Temporary compatibility selectors must remain in a clearly named legacy layer with removal
  criteria in the owning issue or PR evidence.
- No backend, Gateway, or source-authority behavior is implied by this CSS layering model.
