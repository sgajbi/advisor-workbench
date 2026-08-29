# Mandate Health

Mandate Health is the selected portfolio's source-backed mandate monitoring and exception-review
workspace. It keeps the health posture, current source window, selected attention item, accountable
owner, next step, and supporting lineage together without turning a bounded exception view into a
complete book or enterprise queue.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/workbench/{portfolioId}?mode=mandate` |
| Navigation | **Manage**, then **Mandate Health** in the selected-portfolio rail |
| Supported scope | One Gateway-backed portfolio, its selected Manage mandate, and one cursor-bounded active-exception source view at a time |
| Primary reading order | Mandate context, health summary, attention-item source view, selected-item accountability and next step, then health-dimension evidence |
| Primary next action | Review the selected source exception, continue through available source views, or use an implemented adjacent Workbench handoff |

The screen is active for a selected portfolio. It is a review workflow, not an exception mutation,
approval, trading, or execution surface. A visible source view is not described as the entire queue
unless the Gateway response confirms that no continuation cursor remains.

## Business Purpose

Mandate Health helps a portfolio manager answer five practical questions:

1. Is the mandate-monitoring evidence available and usable?
2. What health, data-availability, review-readiness, benchmark-alignment, and latest-monitoring
   posture did Manage report?
3. Which source-returned attention item should be reviewed now?
4. Who is recorded as accountable, how long has the item been open, and what next step did the
   source publish?
5. Is the visible list complete, or must the reviewer continue through further source views before
   drawing a whole-queue conclusion?

The result is a dense exception desk for one mandate. It prioritises evidence and review continuity
over decorative metrics or browser-calculated readiness.

The Manage source dimension `SOURCE_READINESS` is presented as **Data availability** because it
describes the availability and freshness of supporting holdings, market data, eligibility,
tax-lot, and lineage evidence. It is not a decision-readiness conclusion. **Review readiness**
remains a separate health dimension for whether the workflow has sufficient evidence to proceed.

## Who Uses This Screen

- **Portfolio managers and discretionary mandate specialists** review mandate posture and active
  attention items before continuing portfolio-management work.
- **Investment operations and portfolio support teams** inspect accountable owner, age, source,
  next-step, monitoring-run, and correlation evidence when supporting remediation.
- **Client advisors and investment specialists** use the visible posture and limitations to
  understand whether a portfolio discussion is sufficiently supported.
- **Product, control, and support teams** distinguish a Workbench presentation problem from a
  Gateway or Manage source-contract problem.

These uses do not imply production entitlement, delegated authority, supervisory sign-off,
investment approval, exception-resolution authority, or client-delivery authority.

## Workflow Position

1. Enter from [Manage Overview](Manage-Overview-Screen-Guide) or another selected-portfolio screen.
2. Confirm the portfolio and mandate context before using any health or attention evidence.
3. Read the source-backed summary and its incomplete, blocked, or unavailable qualifications.
4. Review the current attention-item source view. If more items are available, treat the visible
   count as **shown in this view**, not as a total.
5. Select one source-owned exception and inspect its status, owner, open age, next step, source, and
   progressively disclosed lineage.
6. Continue to the previous or next source view as required. A failed continuation retains the
   last confirmed view and offers an in-place retry.
7. Use an adjacent Workbench handoff only when it matches the required business task.

## Implemented Capabilities

- Presents the selected portfolio and Manage mandate context through the Workbench BFF and Gateway.
- Presents Manage-owned mandate health, data availability, review readiness, benchmark alignment,
  latest monitoring, and health-dimension evidence without recalculating them in the browser.
- Filters each portfolio-scoped source window to the exact selected mandate. Rows without a
  source-owned exception identity are rejected and reported as partial evidence instead of being
  silently converted into an empty queue.
- Provides keyboard-operable exception selection and keeps the selected record's business
  observation, severity, owner, age, source, status, and next step together.
- Keeps a selected source exception stable when a resolved response reorders the current view. If
  that identity leaves the response, the first source-ranked item is admitted once and remains
  selected through later reordering. Portfolio, mandate, and source-window changes start a new
  selection scope so evidence from the prior review cannot remain active.
- Keeps monitoring-run, source-run, exception, mandate, correlation, and authority identifiers
  behind progressive disclosure.
- Separates **complete**, **partial**, and **unavailable** exception evidence. Valid rows remain
  reviewable as a bounded partial view when a continuation cursor exists or when the source returns
  identified rows under a non-blocking but unconfirmed supportability state. Unconfirmed
  supportability never becomes a complete or zero-attention conclusion.
- Reuses governed source-window navigation for previous and next views. Browser continuation reads
  use `/api/bff/api/v1/...`; the browser does not call Manage directly.
- Retains the last confirmed source view during continuation loading or failure, blocks repeated
  navigation while a request is active, and ignores a late response after portfolio or mandate
  scope changes.
- Exposes stable source-view number, posture, and correlation evidence for browser validation.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Decide whether the attention view is reviewable | Gateway response with an item collection, valid `next_cursor` metadata, and either confirmed supportability or identified rows under a non-blocking unconfirmed state | None; unconfirmed supportability remains partial |
| Treat the visible view as exhaustive | `next_cursor` is explicitly `null` and every returned row has a source-owned exception identity | None |
| Select an attention item | Valid source-owned exception identity belonging to the selected mandate and current source view | None; local review selection only; selection follows source identity rather than row position |
| Inspect supporting lineage | Selected source exception | None; expands technical evidence |
| Continue to another source view | Source continuation cursor or previously confirmed cursor history | None; performs a new Gateway read |
| Retry a failed continuation | Last confirmed view plus failed source-view request | None; repeats the exact scoped read |

Mandate Health does not acknowledge, resolve, assign, approve, waive, or execute an exception.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio identity, base currency, booking centre, and portfolio as-of context | Presents the selected portfolio context | Gateway over Core portfolio contracts |
| Mandate identity, type, risk profile, currency, and mandate as-of evidence | Presents available mandate values; current implementation may display portfolio context when mandate currency or date is absent, but does not promote that fallback to mandate evidence | Gateway over Manage mandate contracts; Core remains portfolio-context authority |
| Health, data availability, review readiness, benchmark alignment, monitoring, and health dimensions | Formats source values and explicit absence; keeps availability distinct from workflow readiness | Gateway over Manage command-centre and mandate-health contracts |
| Active exceptions, ordering, continuation cursor, owner, age, severity, state, next step, and lineage | Filters each returned source view to the selected mandate; does not merge, reprioritise, or total the queue | Gateway over Manage exception contracts |
| Previous, next, selection, and technical-evidence disclosure | Maintains local review continuity without changing source state | Workbench presentation over source identity |

Shared endpoint detail remains in [API Surface](API-Surface), and service ownership remains in
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Initial loading | Selected-portfolio loading with no fabricated mandate result | Wait for the server-owned Gateway reads |
| Complete populated view | Source-confirmed rows and **N open** for the selected mandate in the exhaustive response | Review the selected item |
| Partial populated view | Valid rows, **N in this view**, and **More attention items are available** | Continue through source views before drawing a whole-queue conclusion |
| Populated view with unconfirmed supportability | Identified rows, **N in this view**, and **Attention-item evidence is incomplete** | Review the bounded rows; do not infer a total, zero items, or complete queue posture |
| Complete empty view | **No open attention items** only after the source confirms no continuation | Continue the mandate review; this is not an enterprise all-clear |
| Partial view with no selected-mandate row | Explicit statement that this source view cannot support a zero-attention conclusion | Continue to the next source view |
| Row missing source identity | Explicit count of unidentifiable source records; confirmed rows remain reviewable and the view stays partial | Validate the Manage source response; do not infer zero or completeness |
| Continuation loading | Last confirmed rows remain visible; navigation reports that attention items are loading | Wait; repeated navigation is blocked, then focus returns to the activated control or nearest available source-view action |
| Continuation failure | Last confirmed rows plus a named next/previous-view failure and **Retry source view** | Retry the same scoped Gateway read |
| Permission blocked | Last confirmed evidence remains bounded; the requested view is not presented as current | Use an entitled role or approved support path |
| Unavailable or malformed evidence | Attention items are unavailable and no zero conclusion is inferred | Verify the Gateway/Manage response through the support path |
| Portfolio or mandate change | Source history, view number, failure, and selection reset to the new scope; late prior responses are ignored | Review the new scope from source view 1 |

## Workbench Boundaries

Mandate Health deliberately does not:

- calculate mandate health, data availability, review readiness, benchmark alignment, exception
  severity, age, owner, priority, ordering, membership, or remediation status,
- invent an exception identity, merge source views, or claim a complete total from visible rows,
- infer a favourable state from a low item count or a positive summary score,
- turn portfolio currency or as-of context into unqualified mandate evidence,
- acknowledge, resolve, assign, escalate, approve, waive, or persist an exception action,
- create a proposal, client communication, report, portfolio instruction, trade, order, execution,
  allocation, settlement, reconciliation, or custody record,
- call `lotus-manage`, Core, or any analytics service directly from the browser.

## Adjacent Handoffs

- [Manage Overview](Manage-Overview-Screen-Guide) owns the selected portfolio's cross-work-area
  operating checkpoint.
- [Rebalance Waves](Rebalance-Waves-Screen-Guide) owns source-backed rebalance readiness, proposed
  changes, campaign workflow, and controlled actions.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the broader daily selected-portfolio
  decision checkpoint.
- [Advisor Book](Advisor-Book-Workflow) owns supported own-book portfolio selection.

There is no direct exception-resolution handoff until a source contract publishes an exact eligible
action and destination.

## Evidence And Validation

- `tests/unit/manage-workspace-view-model.test.ts` proves source identity, mandate filtering,
  malformed-row accounting, the confirmed/unconfirmed/blocked supportability matrix, and
  fail-closed complete/partial/unavailable cursor posture.
- `tests/unit/workbench-api.test.ts` proves server composition and browser continuation requests use
  the correct Gateway/BFF targets and request parameters.
- `tests/unit/manage-workspace-components.test.tsx` proves partial rows remain reviewable, source
  navigation, stable focus, exact source-view/correlation evidence, retained evidence on failure,
  retry, one consistent portfolio-scoped cursor query, explicit rejected-row posture, and
  late-response fencing across portfolio and mandate changes.
- `tests/unit/manage-overview-model.test.ts` proves Overview reports a partial first source view
  without converting it into unavailable evidence or a complete count.
- `tests/e2e/manage-mandate-health-workspace.spec.ts` proves an optimized-production Workbench uses
  the canonical portfolio, preserves correlation identity while moving from a partial first source
  view to a complete second source view, distinguishes complete-empty from unavailable evidence,
  retains keyboard focus, rejects a delayed prior-portfolio result after scope changes, and avoids
  page-level horizontal overflow at 1440, 1024, 720, and 390 pixels.
- `scripts/live/validation/browser-workflows.mjs` provides canonical route evidence for
  `PB_SG_GLOBAL_BAL_001`; source-integrated live validation remains distinct from the deterministic
  optimized-production multi-window browser proof.
- Protected PR checks, exact-main releasability, wiki publication, and strict parity remain release
  controls.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Confirm the selected portfolio, source-view number, and whether the queue says **in this view**,
**No open items**, or **Evidence unavailable**. If continuation failed, use **Retry source view**
and record only the non-sensitive HTTP/correlation evidence permitted by the support process. Do
not report zero attention items while a continuation cursor exists.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Manage Overview](Manage-Overview-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
