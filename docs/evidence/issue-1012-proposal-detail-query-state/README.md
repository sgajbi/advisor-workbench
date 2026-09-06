# Proposal Detail Query-State Evidence

This pack records the non-visual evidence for Workbench #1012. The rendered Proposal Detail
composition and business actions do not change; the slice replaces its parallel refresh and
command state with governed TanStack Query ownership.

## Measured Simplification

| Measure | Before | After |
| --- | ---: | ---: |
| Proposal Detail screen-owner lines | 827 | 669 |
| Local `useState` owners | 13 | 3 |
| Operation and transition refs | 4 | 0 |
| Revision-counter queries | 1 | 0 |
| Revision-bearing source query families | 4 | 0 |
| Canonical source query families | 0 | 4 |

The extracted 228-line query-state owner contains the four source queries, serial persisted-command
mutations, exact invalidation/refetch transaction, current-version confirmation, and historical
version lookup. It does not calculate or infer proposal, approval, workflow, or lineage truth.
The same slice removes one opaque copy-shaped property from the governed inventory and ratchets the
exact unresolved-copy baseline from 1,703 to 1,702; no replacement headroom is left behind.

## Behavioural Proof

- `tests/unit/proposal-action-evidence.test.ts` proves exact proposal, posture, and active-version
  agreement, including transition-response identity, newly created version advancement, and
  mismatch rejection.
- `tests/integration/proposal-detail-view.test.tsx` proves source-confirmed lifecycle and version
  success, immediate duplicate-command prevention, post-persistence failure lock, late-completion
  fencing, stable canonical query identities, independent historical lookup, response/source
  agreement, requested-target binding, malformed-success fencing, non-advancing replay rejection,
  and retained confirmed version evidence on revisit.
- `tests/e2e/proposal-memo-posture.spec.ts` proves in an optimized production browser that lifecycle
  success appears only after detail, workflow, approvals, and lineage each perform the exact
  confirmation read.

No screenshot is added because no visual composition, copy, state presentation, focus behavior, or
responsive behavior changed. Existing Proposal Detail evidence remains representative; the browser
regression is the relevant rendered proof for this state-ownership slice.
