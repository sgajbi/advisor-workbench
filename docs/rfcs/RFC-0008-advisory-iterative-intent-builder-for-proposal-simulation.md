# RFC-0008: Advisory Iterative Intent Builder for Proposal Simulation

- Status: IMPLEMENTED
- Date: 2026-02-24
- Owners: Advisor Workbench UI

## Problem Statement

The proposal simulation screen supports only a single-pass submission with static inputs. Advisors need an iterative workflow where they can compose and refine cash-flow and trade intents before each run.

## Root Cause

- UI form had no domain-native intent model for cash flows and trades.
- Simulation payload logic was embedded and fixed, with no reusable typed builder.
- User experience forced repeated manual edits outside a structured scenario editor.

## Proposed Solution

Add an iterative intent builder inside the proposal simulation screen:

1. Cash flow intent rows (direction, currency, amount, description).
2. Trade intent rows (side, instrument, quantity).
3. Scenario summary (net cash impact, valid trade count).
4. Typed payload builder used by both simulate and save-draft actions.

## Architectural Impact

- Better alignment with advisory lifecycle behavior (iterate, evaluate, refine).
- Shared payload builder improves reliability and testability.
- No API contract changes; the `/proposals/simulate` screen uses the existing Gateway
  `/api/v1/advisory-workspaces*` contract for iterative draft evaluation and handoff, while
  proposal queue/detail continue to use `/api/v1/proposals*`.

## Risks and Trade-offs

- Additional UI complexity in a single form.
- Without richer market/position context, this remains intent-focused rather than full what-if optimization.

## High-Level Implementation Approach

1. Extract payload construction into `simulation-payload.ts`.
2. Implement dynamic intent rows and controls in `proposal-simulate-form.tsx`.
3. Keep the existing advisory workspace evaluation and draft-save workflow unchanged from API
   perspective.
4. Add tests for payload mapping and UI rendering expectations.
