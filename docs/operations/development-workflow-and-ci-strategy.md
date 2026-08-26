# Development Workflow and CI Strategy

This repository follows the platform standard for engineering workflow, CI tiering, and merge hygiene.

Canonical standard:
- `lotus-platform/platform-standards/Development-Workflow-and-CI-Strategy-Standard.md`

## Required model

1. Branch from `main` and keep one branch per RFC/slice.
2. Use PR-first delivery (no direct commits to `main`).
3. Keep PR checks fast and meaningful (blocking).
4. Run heavier checks in scheduled/manual/mainline tiers.
5. Merge only with green required checks.
6. Always finish with `local = remote = main`.

## Deterministic browser scenario gate

`make test-e2e` remains the compact fixture-free product smoke. Use
`make test-e2e-fixtures` for the complete deterministic business-journey gate. Its versioned
registry owns the Portfolio, Performance, Manage, and Reports scenario families and the exact test
identities each scenario must execute.

The runner starts an isolated fixture Gateway and optimized Workbench, then writes JSON and
Markdown evidence under `output/e2e-scenario-results/<family>/`. It fails when an expected test is
missing, an unregistered or duplicate test runs, any test is skipped or non-passing, or a scenario
executes no tests. Protected PR and main lanes run all four families as an explicit matrix and
retain their evidence even on failure.

For a focused local family, call the registry-owned runner directly, for example:

```powershell
node scripts/testing/run-e2e-fixture-family.mjs --family performance
```

Do not add raw `--grep` aliases to `package.json`; register the scenario and its optional focus
selector centrally. Fixture evidence proves deterministic Workbench behavior. Canonical Gateway
and source-service support still requires the governed live-validation path.
