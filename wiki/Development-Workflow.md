# Development Workflow

## Branching and slice model

- branch from `main`
- keep one branch per RFC or documentation slice
- use PR-first delivery

## Repo-native commands

- `make lint`
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
