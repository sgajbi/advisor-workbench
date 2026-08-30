# RFC-0014: Workbench Backend Analytics Consumption

- Status: SUPERSEDED — SOURCE-SPECIFIC ANALYTICS SURFACES REPLACED THE GENERIC PANEL
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

## Supersession Note

The generic delta-analytics and benchmark-strip presentation described here had no production route
consumer and was retired under #780. Current Portfolio and Performance screens consume explicit
Gateway contracts through their owning application modules. This RFC is retained as historical
evidence of the move away from browser-owned calculations, not as proof that a generic Workbench
analytics panel is supported.

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
