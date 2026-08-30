# RFC-0012: Workbench Analytics Controls and Delta Panel

- Status: SUPERSEDED — GENERIC PRESENTATION RETIRED UNDER #780
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

## Supersession Note

The generic analytics controls and delta panel had no production route consumer and were retired
under #780. Their quantity-derived comparison and placeholder benchmark posture do not describe
current product behavior. Current Portfolio and Performance workflows use their own typed
Gateway-backed contracts, screen models, and shared control primitives.

This RFC remains historical context only. Workbench must not reconstruct allocation, benchmark, or
projected-portfolio truth in the browser to recreate this surface.

## Architectural Impact

- UI-only increment using existing lotus-gateway contract fields.
- Prepares Workbench for richer lotus-performance-driven attribution and risk dimensions.

## Risks and Trade-offs

- Quantity-based weighting is an approximation until full valuation-based projection feeds are available.
- Benchmark fallback values are placeholders when upstream benchmark return is absent.

## High-Level Implementation Approach

1. Add typed analytics helpers for aggregation and KPI derivation.
2. Add control and panel components.
3. Wire query-param driven controls into Workbench page.
4. Add unit tests for analytics calculations.
