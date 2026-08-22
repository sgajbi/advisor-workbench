# RFC-0009: Decision Console Fallback Routing Resilience

- Status: SUPERSEDED BY GOVERNED REVIEW CONTEXT (#779)
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

The `/workbench` entry route can appear broken when portfolio lookup fails or returns empty, leaving users without a reliable way to open the Decision Console.

## Supersession Decision

The fallback implementation described below is retained as historical design evidence, but it is
no longer active. Issue #779 established that choosing a demo, configured, preferred, or first
catalogue portfolio without an explicit user decision can open the wrong book and is therefore not
an acceptable resilience mechanism for an advisor workstation.

Current behavior:

1. `/workbench` routes to the Gateway-backed **My Book** selection workspace.
2. `/manage` preserves one valid explicit review context when resolving the legacy alias; missing,
   repeated, or unsupported context routes to **My Book**.
3. Canonical local proof enters a seeded portfolio through an explicit governed URL.
4. No `WORKBENCH_FALLBACK_PORTFOLIO_IDS` runtime fallback remains in Workbench.

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

This approach was implemented historically and retired under #779. Do not reintroduce it as a
source-availability or demo-readiness shortcut.
