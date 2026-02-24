# RFC-0012: Workbench Analytics Controls and Delta Panel

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

Workbench lacks an explicit analytics control layer and benchmark-relative delta presentation expected in institutional portfolio analytics workflows.

## Root Cause

- No period/group-by/preset controls at the Workbench analytics level.
- No benchmark-relative KPI strip linked to simulation context.
- No compact delta analytics table for current vs projected state by analysis dimension.

## Proposed Solution

1. Add Analytics Controls bar for period, group-by, benchmark, and preset selection.
2. Add Benchmark KPI strip with return, benchmark, active return, and simulation coverage.
3. Add Delta Analytics panel that aggregates current vs projected quantities by selected dimension.

## Architectural Impact

- UI-only increment using existing BFF contract fields.
- Prepares Workbench for richer PA-driven attribution and risk dimensions.

## Risks and Trade-offs

- Quantity-based weighting is an approximation until full valuation-based projection feeds are available.
- Benchmark fallback values are placeholders when upstream benchmark return is absent.

## High-Level Implementation Approach

1. Add typed analytics helpers for aggregation and KPI derivation.
2. Add control and panel components.
3. Wire query-param driven controls into Workbench page.
4. Add unit tests for analytics calculations.
