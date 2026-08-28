# Development Workflow

## Branching and slice model

- branch from `main`
- keep one branch per RFC or documentation slice
- use PR-first delivery

## Repo-native commands

- `make lint`
  Runs the CSS global governance ratchet and then `eslint . --max-warnings=0` through the
  repository flat ESLint configuration. The gate keeps `src/app/globals.css` as a composition
  entrypoint, enforces the governed global-style budgets, rejects migrated component selector
  families that return to global CSS, discovers every `*.module.css` under `src`, and rejects any
  new or unratcheted `:global` escape. The gate counts parsed bare and functional pseudo-classes
  rather than text in comments or attribute values and fails closed on invalid selectors. New CSS Modules
  have a zero-escape budget by default;
  legacy exceptions are exact per-file counts with no headroom. The wider lint chain scans
  application source, tests, live validators, scripts,
  and configuration files while keeping Next/Core Web Vitals and stable React Hooks correctness
  rules scoped to production app source.
- `npm run lint:react-compiler`
  Runs the broader `eslint-plugin-react-hooks` recommended rule set against `src/`. It is part of
  the blocking `npm run lint` chain and therefore runs through `make lint`, `make check`, and the
  protected feature, pull-request, and main releasability lanes. The rule set is a correctness and
  compiler-readiness gate; passing it does not enable the React Compiler runtime.
- `make typecheck`
- `make test-coverage`
- `make test-e2e`
- `make check`
- `make ci-local-docker`

## Documentation workflow

- keep `README.md` as the front door for supported product truth
- keep `wiki/` as the authored wiki source
- route runtime and route examples into the wiki
- keep deep product-architecture and runtime details in `docs/`
- label target architecture and historical delivery records explicitly; do not present them as
  current implementation truth
- keep CSS ownership guidance in `docs/architecture/css-layer-governance.md`
- when a selector family moves to a component-owned CSS Module, lower the global budget and add its
  prefix to `forbiddenSelectorPrefixes` in the same issue-backed slice
- when a CSS Module escape becomes a locally imported class, lower that module's exact
  `maxGlobalEscapes` in the same slice and remove its exception when the count reaches zero
