# Development Workflow

## Branching and slice model

- branch from `main`
- keep one branch per RFC or documentation slice
- use PR-first delivery

## Repo-native commands

- `make lint`
  Runs `eslint . --max-warnings=0` through the repository flat ESLint configuration. The gate scans
  application source, tests, live validators, scripts, and configuration files while keeping
  Next/Core Web Vitals and stable React Hooks correctness rules scoped to production app source.
- `npm run lint:react-compiler`
  Runs the broader `eslint-plugin-react-hooks` recommended rule set against `src/` as an explicit
  report-only evaluator for React Compiler compatibility. It is not part of `make check` until the
  current finding families are refactored and promoted through a focused issue.
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
