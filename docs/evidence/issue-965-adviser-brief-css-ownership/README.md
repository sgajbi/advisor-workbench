# Issue #965 Adviser Brief CSS Ownership Evidence

## Classification

This pack is isolated optimized-production browser evidence for the Performance Adviser Brief CSS
ownership migration. It uses the process-owned populated fixture for `PB_SG_GLOBAL_BAL_001`; it
does not claim live Gateway, Performance, AI, identity, entitlement, canonical-demo or bank
certification evidence.

The **before** renders were produced on exact Workbench main
`41fcfd27d2c73ca92608b56fd77f66af9ddb2d42` before the migration. The **after** renders exercise the
same business scenario and source-confirmed review state with the family-owned CSS Module. The
Adviser Brief information order, responsive composition, controls and evidence remain unchanged.

## Reviewer views

| View | Before | After |
| --- | --- | --- |
| 1440px workstation | [Open baseline](before-exact-main-1440.png) | [Open local-CSS render](after-local-css-1440.png) |
| 1024px compact workstation | — | [Open local-CSS render](after-local-css-1024.png) |
| 768px stacked workstation | — | [Open local-CSS render](after-local-css-768.png) |
| 519px narrow workstation | [Open baseline](before-exact-main-519.png) | [Open local-CSS render](after-local-css-519.png) |
| Source-confirmed human review | — | [Open evidence close-up](source-confirmed-review-evidence.png) |

## Proven behavior

- The Adviser Brief keeps its decision-first order: preparation and source posture, talking points,
  review decision, recommended actions, exceptions, key metrics and supportability.
- The source-confirmed human-review record remains visible after persistence; no success is
  fabricated from browser state.
- The review control retains keyboard confirmation and visible focus behavior.
- The screen has no page-level horizontal overflow at 1440, 1024, 768 or 519 CSS pixels.
- All production Adviser Brief components resolve locally imported module classes; the module has
  zero `:global(...)` escapes and no root-scoping compatibility wrapper.

## Reproduction

```bash
npm run test:e2e:performance:advisor-brief-review
npm run lint:css-global
```

The browser scenario runs on checkout-specific ports and leaves the shared canonical runtime
untouched. Canonical exact-main QA remains the release proof after merge.
