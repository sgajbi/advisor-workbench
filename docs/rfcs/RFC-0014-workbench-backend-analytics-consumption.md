# RFC-0014: Workbench Backend Analytics Consumption

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

Workbench analytics UI was partly derived in the frontend, which risks drift from platform analytics logic.

## Root Cause

- No dedicated UI consumption path for backend `workbench/analytics` endpoint.
- Local helper logic approximated allocation and benchmark values.

## Proposed Solution

1. Consume `GET /api/v1/workbench/{portfolio_id}/analytics` for analytics panels.
2. Render delta analytics and benchmark strip from backend payload.
3. Remove local analytics helper engine from frontend.

## Architectural Impact

- Analytics calculations become backend-owned and governed.
- UI shifts to presentation and interaction responsibilities only.

## Risks and Trade-offs

- Temporary partial analytics state possible while backend endpoint rolls out.
- UI now depends on API availability for analytics panels.

## High-Level Implementation Approach

1. Extend workbench API/types for analytics response.
2. Replace local analytics derivation with backend response mapping.
3. Remove local analytics helper/test artifacts.
