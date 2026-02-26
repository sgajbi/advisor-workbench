# RFC-0004 - Intake Workflow UX v2 (Desktop Utilization + Mobile Operations)

## Status
IMPLEMENTED

## Context
The Portfolio Intake screen is functionally complete but still presents enterprise usability gaps:
- Desktop layouts underuse available screen real estate.
- Mobile list operations rely on compressed table layouts that reduce usability.
- Workflow guidance is implicit rather than explicit for operations users.

## Decision
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

## Implementation Notes
- Updated `src/app/globals.css` for container and topbar max widths.
- Updated `src/app/pas/intake/page.tsx` with:
  - operation copy metadata and guided workflow UI
  - validation gap derivation
  - responsive mobile row-card editors
  - desktop-first grid ratio adjustments

## Validation
- `npm run lint`
- `npm run build`

## Consequences
Positive:
- Better enterprise feel on desktop by using available width.
- Higher mobile operability without horizontal squeeze.
- Clearer operational narrative for intake teams.

Tradeoff:
- Intake page component complexity increases due to dual desktop/mobile editing patterns.
