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
4. One typed draft model translated only into stateful advisory-workspace actions.

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

1. Keep cash-flow and trade intent types beside the active proposal-draft model.
2. Implement dynamic intent rows and controls in `proposal-simulate-form.tsx`.
3. Translate reviewed draft intent into Gateway `/api/v1/advisory-workspaces*` actions; Workbench
   does not build or submit a browser-owned portfolio snapshot to `/api/v1/proposals/simulate`.
4. Test draft modelling, stateful action mapping, evaluation, and UI rendering expectations.

The Gateway `/api/v1/proposals/simulate` capability remains a supported Gateway/Advise contract
for its actual consumers. It is not a second Workbench Proposal Builder transport.
