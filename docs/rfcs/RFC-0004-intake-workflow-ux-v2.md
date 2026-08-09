# RFC-0004 - Intake Workflow UX v2 (Desktop Utilization + Mobile Operations)

## Status
SUPERSEDED — REVIEW-CONTROLLED INTAKE IMPLEMENTED UNDER #575

## Supersession

Issue #575 replaced the route-local v2 presentation with the governed production workflow now
implemented under `src/features/intake/`.

The current contract is:

1. first paint contains no selected task, production-looking sample data, or mutation action;
2. portfolio creation, opening positions, transactions, instruments, price observations, and file
   import are independent business requests rather than sequential wizard steps;
3. every request starts blank, exposes concrete field or row validation, and must pass one explicit
   review boundary before publication;
4. any material edit invalidates the review, while a failed identical retry retains the reviewed
   payload and idempotency key;
5. CSV selection parses into the same review model and never publishes on file selection;
6. success requires a valid Gateway envelope, task-relevant source publication counts, correlation
   evidence, and contract version; it does not imply activation, valuation, reporting, or analytics
   readiness;
7. responsive composition is owned by a route-scoped CSS Module, while the App shell, page frame,
   workstation layout, section blocks, actions, and status semantics remain shared Workbench
   patterns.

The original decision below is retained as historical context. Its step progress, percentage
readiness, static pipeline-health claim, copied-row behavior, immediate CSV mutation, dual
desktop/mobile rendering branches, and accepted route complexity are no longer product truth.

## Historical Context
The Portfolio Intake screen is functionally complete but still presents enterprise usability gaps:
- Desktop layouts underuse available screen real estate.
- Mobile list operations rely on compressed table layouts that reduce usability.
- Workflow guidance is implicit rather than explicit for operations users.

## Historical Decision
Implement Intake UX v2 with the following standards:

1. Desktop space utilization
- Expand shell max width from 1280px to 1560px.
- Rebalance intake workspace columns to prioritize operational editing surface.

2. Workflow guidance
- Add a workflow guidance section with step progress and operation checkpoint.
- Surface top validation gap when an operation is not submission-ready.

3. Mobile editing model
- Replace table-only editing with stacked row cards on small screens for:
  - positions
  - transactions
  - instruments
  - market data
- Preserve dense table editing for desktop.

4. Selector-catalog continuity
- Preserve lotus-gateway-backed lookup catalog behavior and fallback modes introduced previously.

## Historical Implementation Notes
- Updated `src/app/globals.css` for container and topbar max widths.
- Updated `src/app/pas/intake/page.tsx` with:
  - operation copy metadata and guided workflow UI
  - validation gap derivation
  - responsive mobile row-card editors
  - desktop-first grid ratio adjustments

## Historical Validation
- `npm run lint`
- `npm run build`

## Historical Consequences
Positive:
- Better enterprise feel on desktop by using available width.
- Higher mobile operability without horizontal squeeze.
- Clearer operational narrative for intake teams.

Tradeoff:
- Intake page component complexity increases due to dual desktop/mobile editing patterns.
