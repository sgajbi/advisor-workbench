# RFC-0013: Workbench Exception Queue and Advisor Summary

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

Workbench now supports split-view analytics and sandbox iteration, but users still need faster interpretation of warnings/failures and a concise next-action summary for proposal progression.

## Root Cause

- Warnings and partial failures are visible but not organized as an operator queue.
- No compact advisor summary card to convert analytics and constraints into clear action guidance.

## Proposed Solution

1. Add an exception queue panel for warnings and partial failures.
2. Add an advisor summary card with readiness state and recommended next step.
3. Add direct transition links from summary to proposal simulation and proposal workspace.

## Architectural Impact

- UI-only orchestration improvement.
- No backend contract changes.

## Risks and Trade-offs

- Readiness logic is heuristic until richer lifecycle gates are exposed from backend policy engines.
- Summary guidance remains deterministic but intentionally lightweight.

## High-Level Implementation Approach

1. Add reusable Workbench exception and summary components.
2. Compute readiness from warnings, partial failures, and projected delta activity.
3. Integrate panels into Workbench layout without reducing existing analytics density.
