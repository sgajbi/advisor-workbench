# RFC-0006: Backend-Resolved Reference IDs for Proposal and Workbench Routes

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

UI navigation and workflow screens still rely on fixed reference identifiers (for example `PP-7721`, `PF_1001`) that are not guaranteed to exist in live backend data.
This causes broken detail pages and failed workbench loads during end-to-end usage.

## Root Cause

- Proposal workspace and suite mock widgets contain static proposal IDs used for links.
- Command-center and route shortcuts hardcode portfolio IDs that are not reconciled with PAS/DPM seeded datasets.
- UI route construction does not enforce backend-existence checks before deep-linking.

## Proposed Solution

1. Remove static route IDs from user-facing navigation flows.
2. Resolve default proposal and portfolio references from backend data providers (BFF contracts) at runtime.
3. Add empty-state and not-found guard rails that avoid presenting invalid deep links.
4. Keep deterministic local dev behavior via configurable seed/reference IDs supplied by backend config, not UI constants.

## Architectural Impact

- Strengthens UI/BFF contract boundaries by making backend the source of navigable entity identity.
- Improves integration readiness by eliminating mock-to-live drift in route surfaces.
- Supports product-oriented architecture where reference data is governed centrally.

## Risks and Trade-offs

- Requires additional loading state and fallback UX when no entities are available.
- Slightly increases BFF dependency for route rendering decisions.
- Migration may require updates to UI tests currently keyed to static IDs.

## High-Level Implementation Approach

1. Introduce BFF-backed reference resolver hooks for "default proposal" and "default portfolio".
2. Refactor command center and proposal cards to build links from resolved IDs.
3. Add route guards for unresolved/nonexistent IDs with actionable messaging.
4. Update test fixtures and browser smoke checks to assert dynamic linking behavior.
