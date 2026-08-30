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
retain their evidence even on failure. The protected `PR Merge Gate / Playwright Smoke` context is
an always-running aggregate and succeeds only when fixture-free smoke and every matrix family pass.

For a focused local family, call the registry-owned runner directly, for example:

```powershell
node scripts/testing/run-e2e-fixture-family.mjs --family performance
```

Do not add raw `--grep` aliases to `package.json`; register the scenario and its optional focus
selector centrally. Fixture evidence proves deterministic Workbench behavior. Canonical Gateway
and source-service support still requires the governed live-validation path.

## Source-authority fitness gate

`npm run quality:source-authority` executes before dependency and presentation linting in every
blocking static-analysis lane. It enrolls critical Gateway-backed surfaces through domain-local
source adapters and stable rendered identity/state attributes. Each enrollment proves that:

1. Gateway identity and state survive a controlled source mutation through the production view
   model and rendered component unchanged;
2. exact rendered evidence rejects omitted, extra, duplicated, substituted, or mismatched rows;
3. a plausible reassuring fallback, such as Risk `breach` rendered as `within`, fails;
4. the production view-model mapping, component evidence attributes, and DOM/browser extraction
   remain wired; and
5. an empty or single-surface registry fails closed.

The render-proof registry must equal the contract registry exactly. Each enrolled contract requires
at least two executable component scenarios with distinct source identities and distinct source
states; a fixed canonical identity does not prove source identity ownership.

Risk mandate comparison and Advisor Book are the reference enrollments. Add a new surface only when
its Gateway contract owns the facts and the screen has a domain adapter, executable rendered
component proof, and deterministic browser evidence. A cloned adapter or view-model row is not
rendered proof.
Presentation-only labels and formatting remain outside this control; do not turn the gate into a
literal scanner or a second domain model.

## Coverage ratchet

`npm run test:coverage` measures all governed application roots with V8 and blocks the protected
quality lanes below the checked-in thresholds. Function coverage is banked at the exact 2026-08-30
measurement of 93.29% (3,115 of 3,339 functions), up from the stale 70% floor. The ratchet is
monotonic: improve behavior tests and raise it when coverage grows; never lower it, add exclusions,
or add assertion-free tests to recover a green build. A threshold failure reports actual versus
required coverage through Vitest.
