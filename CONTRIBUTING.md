# Contributing

## Working model

This repository follows a docs-with-code rule: every implementation change must include the required documentation updates in the same pull request.

## Documentation requirements by change type

- UI flow, route, or UX behavior changes:
  - Update `README.md` route/feature notes.
  - Update or add integration tests.
  - If behavior is material, add/update an RFC in `docs/rfcs` and update `docs/rfcs/README.md`.
- Architecture or lotus-gateway contract mapping changes:
  - Add/update an RFC in `docs/rfcs`.
  - Update architecture docs under `docs/documentation`.
- Tooling/CI/quality gate changes:
  - Update docs under `docs/documentation` and relevant runbooks.
- Operations/startup/environment changes:
  - Update run commands and environment variable documentation in `README.md`.

## Definition of done

- Tests added/updated for the behavior change.
- `make check` passes locally.
- `make test-e2e` passes for UI changes that affect routed user journeys.
- Coverage thresholds in `vitest.config.ts` remain green for the real frontend application surface
  across `src/app`, `src/apps`, `src/design-system`, `src/features`, and `src/shell`.
- The current thresholds are a temporary honest baseline for the broadened app surface; changes
  should improve coverage over time rather than exclude product code from the gate.
- Required docs are updated in the same PR.
- PR template checklist is fully completed.

## Branch + PR policy

- Target branch: `main` via pull request only.
- Required status checks must pass.
- CI quality gate covers lint, typecheck, Vitest coverage, production build, and Playwright smoke.
- Linear history is enforced.
- Auto-merge is enabled for CI-passing PRs.

## RFC flow

- Use one RFC per focused architectural change.
- Keep RFC status current in `docs/rfcs/README.md`.
- When implemented, mark status as `IMPLEMENTED` and link the PR.
