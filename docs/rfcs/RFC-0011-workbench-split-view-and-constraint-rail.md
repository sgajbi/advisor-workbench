# RFC-0011: Workbench Split View and Constraint Rail

- Status: SUPERSEDED — UNREACHABLE PRESENTATION RETIRED UNDER #780
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

Portfolio 360 and sandbox capabilities exist, but the Workbench screen is still card-oriented and does not provide a concise operational split-view for baseline versus projected state with explicit constraint feedback.

## Root Cause

- Workbench layout evolved incrementally from section cards.
- No dedicated constraint rail to summarize policy/workflow readiness.
- Live sandbox interactions did not persist policy feedback context on-screen.

## Proposed Solution

Implement a dense, domain-oriented split workspace:

1. Left pane: current portfolio 360 positions (baseline).
2. Right pane: live sandbox controls, projected summary, projected positions.
3. Constraint rail: policy gate status, workflow readiness, and warning indicators.

## Supersession Note

The split-view, generic position table, and local constraint rail had no production route consumer.
They and their orphaned global selectors were retired under #780. Current Workbench workflows use
screen-owned, Gateway-backed decision surfaces and shared workstation primitives instead of this
pre-BFF layout.

This RFC is historical context, not a supported-feature claim. A future simulation workspace must
establish source authority and a live business workflow rather than revive these selectors or the
retired component tree.

## Architectural Impact

- Improves usability without changing backend contracts.
- Aligns Workbench UI with advisory simulation decision loops.

## Risks and Trade-offs

- More information density requires careful mobile handling.
- Policy status reflects latest sandbox evaluation and may be unavailable before first run.

## High-Level Implementation Approach

1. Add split-layout styles and compact position table styles.
2. Extend sandbox controls with local policy/status state.
3. Add constraint rail component and wire to sandbox feedback + warnings.
4. Update Workbench route composition and validate with lint/typecheck/tests.
