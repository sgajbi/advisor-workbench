# Proposal Detail Query-State Evidence

This pack records the non-visual evidence for Workbench #1012. The rendered Proposal Detail
composition and business actions do not change; the slice replaces its parallel refresh and
command state with governed TanStack Query ownership.

## Measured Simplification

| Measure | Before | After |
| --- | ---: | ---: |
| Proposal Detail screen-owner lines | 827 | 678 |
| Local `useState` owners | 13 | 3 |
| Operation and transition refs | 4 | 0 |
| Revision-counter queries | 1 | 0 |
| Revision-bearing source query families | 4 | 0 |
| Canonical source query families | 0 | 4 |

The extracted 288-line query-state owner contains the four source queries, serial persisted-command
mutations, exact invalidation/refetch transaction, current-version confirmation, and historical
version lookup. The proposal-scoped mutation record retains the latest command's pending, success,
or failure state outside a transient component observer and is not discarded by time-based mutation
garbage collection. Starting the next admitted command of the same kind removes its prior settled
record, keeping the retained state bounded. A route remount therefore cannot silently restore an
uncertain action or erase its user-visible outcome. The owner does not calculate or infer proposal,
approval, workflow, or lineage truth.
The same slice removes one opaque copy-shaped property from the governed inventory and ratchets the
exact unresolved-copy baseline from 1,703 to 1,702; no replacement headroom is left behind.

## Behavioural Proof

- `tests/unit/proposal-action-evidence.test.ts` proves exact proposal, posture, and active-version
  agreement, including transition-response identity, newly created version advancement, and
  mismatch rejection.
- `tests/unit/proposal-detail-command-state.test.ts` proves latest-command projection and exact-key,
  pending-safe cleanup of prior settled records.
- `tests/integration/proposal-detail-view.test.tsx` proves source-confirmed lifecycle and version
  success, immediate duplicate-command prevention, post-persistence failure lock, late-completion
  fencing, stable canonical query identities, independent historical lookup, response/source
  agreement, requested-target binding, malformed-success fencing, non-advancing replay rejection,
  retained pending/success/failure command presentation on revisit, bounded settled-command
  replacement, and persisted-confirmation fencing beyond the default mutation-cache lifetime.
- `tests/e2e/proposal-memo-posture.spec.ts` proves in an optimized production browser that lifecycle
  success appears only after detail, workflow, approvals, and lineage each perform the exact
  confirmation read.

No screenshot is added because no visual composition, copy, state presentation, focus behavior, or
responsive behavior changed. Existing Proposal Detail evidence remains representative; the browser
regression is the relevant rendered proof for this state-ownership slice.
