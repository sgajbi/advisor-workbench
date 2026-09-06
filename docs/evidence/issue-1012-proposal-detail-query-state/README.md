# Proposal Detail Query-State Evidence

This pack records the non-visual evidence for Workbench #1012. The rendered Proposal Detail
composition and business actions do not change; the slice replaces its parallel refresh and
command state with governed TanStack Query ownership.

## Measured Simplification

| Measure | Before | After |
| --- | ---: | ---: |
| Proposal Detail screen-owner lines | 827 | 714 |
| Local `useState` owners | 13 | 3 |
| Operation and transition refs | 4 | 0 |
| Revision-counter queries | 1 | 0 |
| Revision-bearing source query families | 4 | 0 |
| Canonical source query families | 0 | 4 |

The extracted 319-line query-state owner contains the four source queries, serial persisted-command
mutations, exact invalidation/refetch transaction, current-version confirmation, and historical
version lookup. A focused 206-line recovery owner records the exact admitted command and
idempotency key in tab-scoped session storage before source submission; a 100-line execution owner
keeps API dispatch and response-envelope checks out of the screen. No credential, cookie, token, or
authorization value is retained. A reload offers **Recheck earlier action**, which repeats only the
same request under the same key. Invalid recovery data fails closed, and the record clears only
after coherent source confirmation or a definitive pre-persistence failure. Owner-reported `409`
state conflicts are definitive rejections, so their obsolete request identity is cleared and all
four current source records refresh before writes unlock. A failed refresh leaves the unavailable
source posture as the action fence rather than exposing either a stale action or an impossible
**Recheck earlier action** loop.

Lifecycle confirmation also binds the response's exact workflow-event identity, action vocabulary,
actor, timestamp, prior posture, and resulting posture to the refreshed workflow register. Risk,
compliance, and consent commands additionally require the exact returned approval identity and
fields in the refreshed approval register. The shared `AWAITING_CLIENT_CONSENT` target can therefore
never make a risk response look like compliance evidence. If another valid source action advances
the coherent current posture before refresh completes, the exact earlier event remains sufficient
historical proof rather than creating a permanent retry fence. A coherent posture that still
precedes that event is not confirmation and remains fenced. Persisted recovery accepts only the
closed prior-state/action combinations. Missing ancillary action evidence still blocks writes, but
does not disable full-evidence or historical-version reads that can help an advisor investigate;
invalid recovery storage blocks writes but not those GET-only controls.
Created-version confirmation likewise follows exact historical evidence: the refreshed active
version may advance beyond the returned version, but lineage must retain both the exact created
version and the newer active version. An enabled historical lookup always reaches its GET when no
command is live, including while recovery storage is invalid.

The proposal-scoped mutation record retains the latest command's pending, success, or failure state
outside a transient component observer and is not discarded by time-based mutation garbage
collection. Starting the next admitted command of the same kind removes its prior settled record,
keeping the retained state bounded. A route remount therefore cannot erase an uncertain action or
allow a new request identity. Completed-action copy records the historical outcome only; current
posture remains owned by refreshed source evidence. These owners do not calculate or infer
proposal, approval, workflow, or lineage truth.
The same slice removes one opaque copy-shaped property from the governed inventory and ratchets the
exact unresolved-copy baseline from 1,703 to 1,702; no replacement headroom is left behind.

## Behavioural Proof

- `tests/unit/proposal-action-evidence.test.ts` proves exact proposal, posture, workflow-event,
  approval, actor, timestamp, and active-version agreement, including exact-instant matching across
  equivalent UTC/offset representations, malformed timestamp rejection, distinct risk/compliance
  evidence, newly created version advancement, later active-version progression, and
  missing/mismatched exact-version rejection.
- `tests/unit/proposal-detail-command-state.test.ts` proves latest-command projection and exact-key,
  pending-safe cleanup of prior settled records.
- `tests/unit/proposal-command-recovery.test.ts` proves exact lifecycle/version round trips,
  proposal isolation, clearing, and fail-closed rejection of every impossible action/prior-state
  combination.
- `tests/unit/proposal-command-execution.test.ts` separates deterministic HTTP rejection from
  genuinely uncertain persistence outcomes; `409` clears recovery and refreshes authoritative
  evidence before writes unlock, while timeout, throttling, transport loss, and server failure
  retain the exact admitted identity.
- `tests/integration/proposal-detail-view.test.tsx` proves source-confirmed lifecycle and version
  success, immediate duplicate-command prevention, post-persistence failure lock, late-completion
  fencing, stable canonical query identities, independent historical lookup, response/source
  agreement, requested-target binding, malformed-success fencing, non-advancing replay rejection,
  retained pending/success/failure command presentation on revisit, bounded settled-command
  replacement, persisted-confirmation fencing beyond the default mutation-cache lifetime, and
  lifecycle/version recovery after reload with byte-equivalent request arguments and idempotency
  keys, distinct risk/compliance proof, later coherent source advancement, and independent
  read-only evidence controls during ancillary-source or recovery-storage failure, including an
  executed historical-version GET rather than button-state-only proof.
- `tests/e2e/proposal-memo-posture.spec.ts` proves in an optimized production browser that lifecycle
  success appears only after detail, workflow, approvals, and lineage each perform the exact
  confirmation read; a forced confirmation failure remains fenced through reload and rechecks the
  exact source request identity.

The rendered recovery state is captured in
[`proposal-action-recovery.png`](proposal-action-recovery.png). It shows the historical failure,
the source-owned current posture, disabled conflicting action, and explicit recovery command
without presenting the earlier action result as current truth.
