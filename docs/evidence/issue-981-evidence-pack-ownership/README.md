# Evidence Pack ownership evidence

Issue #981 applies the Workbench convergence pattern to the Manage Evidence Pack surface:
component ownership, global-authority deletion, simpler composition, and measured rendered proof.

## Measured outcome

| Measure | Before | After |
| --- | ---: | ---: |
| `proof-pack-*` global escape arms | 54 | 0 |
| Manage module global escapes | 325 | 271 |
| Lifecycle and handoff buttons | 8 | 5 |
| Repeated downstream destinations | 6 controls / 3 destinations | 3 controls / 3 destinations |
| Unavailable-state page height at 1440px | 1,463px | 1,000px |
| Unavailable-state page height at 519px | 2,589px | 1,415px |

The unavailable-state reduction is 32–46% across all six governed widths. It comes from withholding
the unusable evidence table, downstream handoffs, and detail when the source pack has not been
retrieved—not from hiding source failure or weakening validation.

## Artifacts

`evidence-pack/` contains before/after screenshots and machine-readable geometry at 1440, 1024,
768, 721, 561, and 519 pixels. Ready-state proof records one evidence ledger and one next-action
region; unavailable-state proof records the truthful source failure and recovery controls.

Reproduce with:

```powershell
npm run test:e2e:manage:proof-copilot
```

The browser suite also verifies keyboard-reachable actions, exact action counts, stable canonical
selector evidence, and zero page-level horizontal overflow.
