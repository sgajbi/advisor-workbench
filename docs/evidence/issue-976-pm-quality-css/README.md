# PM Operating Quality presentation ownership evidence

Issue: `lotus-workbench#976`  
Parent programme: `lotus-workbench#492`

## Business outcome

The PM Operating Quality workspace keeps Manage-owned policy, score-run, fairness, review-action,
and summary-invocation evidence intact while bringing later supervisory decisions materially higher
on a wide screen.

| Measure | Before | After | Result |
| --- | ---: | ---: | ---: |
| Wide-screen full-page height at 1440px | 9,715px | 6,969px | 2,746px / 28.3% reduction |
| Legacy Manage stylesheet | 2,731 lines | 2,269 lines | 462 lines removed |
| Legacy global escapes | 485 | 408 | 77 escapes removed |
| PM-quality selectors left in legacy stylesheet | 77 | 0 | component ownership complete |
| PM-quality CSS-module global escapes | — | 0 | locally scoped boundary |

The browser proof also verifies source authority, exact score-run identity, keyboard reachability,
responsive layout at 1440/1024/768/519px, and absence of page-level horizontal overflow.

## Design and engineering decisions

- Adopted Next.js CSS Modules for component-local ownership because the framework scopes class names
  and avoids global ordering and collision risk.
- Kept supervisory source facts visible instead of collapsing the workflow into summary cards.
- Rejected a four-column audit-detail grid after rendered evidence showed that long governance values
  wrapped more and increased page height.
- Adopted a full-width score-run evidence flow followed by a compact governance strip, reducing wide
  screen height without removing facts or actions.
- Preserved explicit forbidden-use and source-authority evidence, consistent with banking guidance
  that governance and effective challenge depend on visible limitations and accountable evidence.

Research:

- [Next.js CSS Modules](https://nextjs.org/docs/13/app/building-your-application/styling/css-modules)
- [Federal Reserve supervisory guidance on model risk management](https://www.federalreserve.gov/frrs/guidance/supervisory-guidance-on-model-risk-management.htm)

## Evidence

- `pm-operating-quality/pm-operating-quality-1440.png`
- `pm-operating-quality/pm-operating-quality-1024.png`
- `pm-operating-quality/pm-operating-quality-768.png`
- `pm-operating-quality/pm-operating-quality-519.png`

## Documentation decision

No README, wiki, supported-feature, contract, or repository-context change is required. The capability,
source ownership, workflow, routes, and business terminology are unchanged; this slice changes local
presentation ownership, responsive composition, and regression proof only.
