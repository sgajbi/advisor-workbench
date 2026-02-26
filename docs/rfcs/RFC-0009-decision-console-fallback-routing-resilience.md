# RFC-0009: Decision Console Fallback Routing Resilience

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

The `/workbench` entry route can appear broken when portfolio lookup fails or returns empty, leaving users without a reliable way to open the Decision Console.

## Root Cause

- Entry routing was hard-dependent on lotus-gateway lookup response.
- No deterministic fallback portfolio routing was configured.

## Proposed Solution

Add configurable fallback portfolio IDs for `/workbench` entry routing:

1. Attempt lotus-gateway lookup-driven routing first.
2. If lookup is empty/unavailable, route to first configured fallback portfolio.
3. Keep explicit empty-state message only when no fallback IDs are configured.

## Architectural Impact

- Improves UI route resilience without changing backend contracts.
- Preserves existing Workbench detail page behavior and error handling.

## Risks and Trade-offs

- Fallback portfolio may not exist in all environments.
- Could route to a portfolio that returns an upstream-data warning rather than a full snapshot.

## High-Level Implementation Approach

1. Add `WORKBENCH_FALLBACK_PORTFOLIO_IDS` environment-driven fallback list.
2. Update `/workbench` entry page routing logic.
3. Validate via live route checks and lint/typecheck.
