# RFC-0010: Workbench Portfolio 360 and Live Sandbox UI

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

Decision Console still behaves as a static overview. Advisors need a single workspace that shows current state, allows iterative scenario changes, and displays projected portfolio state in-session.

## Root Cause

- UI lacked a Portfolio 360 data model.
- No Workbench integration for simulation session create/apply loop.
- Current and projected states were not displayed side-by-side.

## Proposed Solution

Implement Portfolio 360 and live sandbox in Workbench UI:

1. Load Portfolio 360 from BFF endpoint with optional session context.
2. Add sandbox controls to create session and apply simple change intents.
3. Display current vs projected positions and projected summary deltas.
4. Surface optional policy feedback from sandbox updates.

## Architectural Impact

- UI now consumes lifecycle-oriented BFF workbench contracts.
- Workbench route becomes the domain entry point for iterative proposal pre-work.

## Risks and Trade-offs

- Initial sandbox editor is intentionally lightweight (single change submission flow).
- Richer multi-row scenario editing remains a follow-up UX increment.

## High-Level Implementation Approach

1. Extend workbench types and API client for Portfolio 360 + sandbox APIs.
2. Add sandbox control component with session lifecycle actions.
3. Render current/proposed portfolio panels and projected KPI strip.
4. Add integration tests for new Decision Console behavior.
