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

`PortfolioScreenRail` is the first shared cross-route component migrated under this ownership
model. Its presentation is colocated in
`src/apps/portfolio/components/portfolio-screen-rail.module.css`; page-specific shells may own
placement, but they must not repair the rail's colors, spacing, or interaction states globally.

## Ratchet gate

`npm run lint` and `make lint` run `npm run lint:css-global` before the repository ESLint gate.
Docker CI parity also invokes `npm run lint`, so the same CSS governance ratchet runs inside the
containerized local-CI lane. The CSS gate validates:

- `globals.css` contains only the governed import list;
- imported global layers remain in the documented cascade order;
- each global layer stays within its line and byte budget in
  `scripts/quality/css-global-governance-baseline.json`;
- selector families listed in `forbiddenSelectorPrefixes` do not return to any governed global
  layer after migration to a component owner.

When a migration removes selectors from `legacy-global.css`, lower the corresponding baseline in the
same PR and add the migrated selector family to `forbiddenSelectorPrefixes`. Increase a budget only
with issue-backed evidence explaining why a selector belongs in a global layer instead of a feature
module.

## Ownership expectations

- Shared tokens, typography primitives, shell layout, and cross-route navigation belong in the
  governed global layers.
- Feature-specific selectors should migrate beside the owning feature, preferably through CSS
  Modules already used in `src/features/**` and `src/apps/**`.
- Temporary compatibility selectors must remain in a clearly named legacy layer with removal
  criteria in the owning issue or PR evidence.
- No backend, Gateway, or source-authority behavior is implied by this CSS layering model.
