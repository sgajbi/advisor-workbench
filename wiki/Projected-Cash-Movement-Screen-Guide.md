# Projected Cash Movement

Projected Cash Movement is the selected portfolio's forward movement review. It helps an advisor
or portfolio manager understand expected dated net cash movements before a client conversation,
funding discussion, or mandate review. It does not calculate an ending cash balance, decide
liquidity sufficiency, recommend funding, or initiate a transfer, trade, or settlement instruction.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/cashflow?portfolioId={portfolio_id}` |
| Navigation | **Cashflow** in the selected-portfolio rail |
| Supported scope | One Gateway-backed portfolio at one governed as-of date, reviewed over 10, 30, or 90 days |
| Evidence posture | Owned contract-valid browser proof for `PB_SG_GLOBAL_BAL_001` at desktop, tablet, and narrow widths |
| Primary next action | Explain a material expected movement, investigate a source limitation, or continue to an adjacent source-backed workflow |

Changing portfolio or governed date context requests a new selected-portfolio workspace. Changing
horizon requests a new projection and keeps the workspace, source evidence rail, schedule, and
export gate aligned to that selected result. The screen does not aggregate a household, advisor
book, team book, or multiple mandates.

## Business Purpose

Projected Cash Movement helps an advisor or portfolio manager answer four bounded questions:

1. What is the net expected cash movement over the selected horizon?
2. How much positive and negative net movement appears across the returned dates?
3. Which dated negative net movement is largest and therefore most useful to discuss first?
4. Is the projection complete enough to explain, or is source evidence limited, unconfirmed, or
   unavailable?

The reading order is projection identity and basis, positive and negative net movement, largest
negative movement, dated
movement pattern, exact schedule, then source posture. Current booked cash is shown separately as
decision context and is never combined with projected movement to invent an ending balance.

## Who Uses This Screen

- **Client advisors and relationship managers** prepare a source-backed explanation of the timing
  and direction of returned projected movement before a client discussion.
- **Portfolio managers and investment specialists** review the timing and direction of expected
  movement alongside current booked cash without treating it as funding authority.
- **Investment operations and support teams** investigate missing dated detail, projection
  limitations, or an unavailable horizon using the returned support evidence.
- **Product and control teams** use exact values, state handling, and machine-readable browser
  evidence to distinguish presentation defects from source-contract defects.

These are supported business uses, not production entitlement, delegated-book, approval, or
supervisory claims.

## Workflow Position

1. Enter from [Advisor Book](Advisor-Book-Workflow),
   [Portfolio Review](Portfolio-Review-Screen-Guide), [Positions](Positions-Screen-Guide),
   [Transactions](Transactions-Screen-Guide), or [Income And Activity](Income-And-Activity-Screen-Guide).
2. Confirm the selected mandate, reporting currency, source as-of date, projection basis, and
   selected 10-, 30-, or 90-day horizon.
3. Compare net projected movement, positive net movement, negative net movement, and the largest
   dated negative movement.
4. Read bars as dated net movement and the line as cumulative movement; use the exact schedule for
   values that should not be inferred from chart geometry.
5. Check source limitations and current booked cash before explaining the projection or handing off
   to an adjacent workflow.

There is no persisted business action on this screen. Export is a local, source-confirmed evidence
extract and remains unavailable while the selected result is absent, refreshing, failed, or lacks
dated points.

## Implemented Capabilities

- Requests and presents explicit 10-, 30-, and 90-day projected cash-movement horizons through the
  Workbench BFF and Gateway.
- Keeps the selected horizon, projection result, status rail, schedule, and export gate on one
  controller-owned state so prior-horizon evidence cannot appear current.
- Presents net projected movement, positive net movement, negative net movement, the largest dated
  negative movement, source as-of date, returned horizon, projection basis, currency, and dated
  movement schedule.
- Distinguishes bars for dated net movement from the cumulative movement line in visible and accessible
  chart semantics.
- Preserves warnings, partial failures, contract version, correlation evidence, and aggregate-only
  posture without manufacturing missing dated detail.
- Keeps the page free of horizontal overflow at governed widths while the exact-value schedule is a
  named, focusable horizontal-scroll region with a visible narrow-screen instruction.
- Exports only the confirmed selected-horizon dated schedule using business labels and the returned
  reporting currency.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Explain expected movement direction and timing | Confirmed selected-horizon result, basis, currency, and source date | None; read-only review |
| Prioritise a negative-movement discussion | Source-returned dated points and visible largest-negative-movement evidence | None; Workbench does not recommend funding |
| Change horizon | Supported 10-, 30-, or 90-day selection | None; requests a new projection |
| Retry a failed projection | Explicit unavailable or unconfirmed source state | None; re-contacts source authority |
| Export the exact schedule | Confirmed selected result with dated points and no active refresh or failure | Local evidence file only |
| Continue to an adjacent workflow | Supported selected-portfolio destination | None from this screen |

Viewing or exporting does not create a cash transfer, trade, recommendation, order, execution,
settlement, report request, client communication, or approval record.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio, mandate, reporting currency, booked cash, and governed as-of date | Formats selected-workspace facts and keeps booked cash separate from projected movement | Gateway over Core portfolio contracts |
| Projection horizon, range, basis, net movement, dated points, warnings, and partial failures | Validates and presents the selected result without calculating source economics | Gateway projected-cashflow contract over Core records |
| Positive net movement, negative net movement, and largest dated negative movement | Deterministic presentation projection over returned dated net values; does not claim gross receipts or payments | Workbench view model over the confirmed Gateway response |
| Cumulative movement line | Plots the source-returned cumulative value; does not call it cash balance | Gateway projected-cashflow contract |
| Retry | Repeats the selected-horizon BFF request | Gateway and owning source service |
| CSV export | Formats every returned dated point after confirmation | Confirmed selected-horizon Workbench state |

Workbench uses the BFF and Gateway; it does not call Core directly. Shared contract detail remains in
[API Surface](API-Surface) and ownership flow in [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Selected horizon and a bounded loading state; no prior-horizon result is relabelled | Wait for the governed Gateway request |
| Refreshing | Server-seeded result remains visible but marked as being confirmed; export is blocked | Wait or use the explicit retry after failure |
| Ready | Confirmed scope, signed net movement, chart, schedule, and aligned evidence rail | Continue the review |
| No movement | Explicit **No projected cash movement** for the selected horizon | Choose another horizon only when that is the intended business question |
| Aggregate only | Net movement remains visible while dated direction, chart, schedule, and export are unavailable | Treat as partial and investigate source detail |
| Partial or limited | Returned result remains visible with named warnings or partial failures | Use returned support evidence; do not treat limitations as complete |
| Unconfirmed | Prior workspace evidence is visibly qualified after confirmation fails | Retry the selected horizon before relying on it as current |
| Unavailable | Selected horizon is replaced by an unavailable state and explicit retry | Retry through Gateway or follow the approved support process |

A visible recovery action always re-contacts source authority. Workbench does not fabricate a local
success state or substitute a different horizon.

## Workbench Boundaries

Projected Cash Movement deliberately does not:

- calculate opening cash, ending cash, available cash, liquidity sufficiency, funding capacity, or
  a cash-buffer recommendation,
- apply projected movement to booked cash or present cumulative movement as a balance,
- create a scenario, commitment schedule, private-markets capital call, transfer, payment, trade,
  order, execution, settlement, or reconciliation,
- infer missing dated points, gross receipts or payments within a netted date, source
  classification, approval, entitlement, client suitability, or source readiness,
- treat a screenshot, browser chart, or competitor feature description as calculation evidence,
- expose implementation topology as the primary language of the business workflow.

Official wealth-platform research informed the integrated cash-decision context, explicit
projection horizon, and signed-movement reading order. Lotus did not copy a competitor's layout,
wording, visual identity, or unsupported capability; this guide is not a claim of bank approval or
competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns source-backed portfolio selection.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the daily mandate decision checkpoint.
- [Positions](Positions-Screen-Guide) owns booked holdings and current source-returned cash rows.
- [Transactions](Transactions-Screen-Guide) owns booked ledger and applicable settlement review.
- [Income And Activity](Income-And-Activity-Screen-Guide) owns booked historical income and cash
  activity; it is not a forecast.
- Mandate Operations owns supported source-backed portfolio-management workflows.
- Source operations own projection-input repair, funding execution, transfer, settlement, and
  reconciliation.

## Evidence And Validation

- Pure view-model tests prove positive and negative net-movement totals, negative-movement-first
  decision focus, flat and aggregate-only posture, stable business labels, and exact export rows.
- Hook and component tests prove selected-horizon request fencing, loading, ready, empty, partial,
  unconfirmed, unavailable, retry, export, and accessible schedule behavior.
- Evidence-rail tests prove the selected 30-day result replaces the server-seeded 10-day posture
  and that current booked cash remains a separate fact rather than an invented ending balance.
- The owned production-browser scenario uses `PB_SG_GLOBAL_BAL_001`, selects 30 days, and proves two
  positive net-movement dates, one negative net-movement date, three dated points, aligned rail
  evidence, explicit chart semantics, and no page overflow at 1440/1024/768/519 px.
- The browser matrix proves four/two/two/two summary columns and a named focusable schedule whose
  own overflow remains available at 519 px. Screenshots are visual evidence only; the matching JSON
  artifact retains machine-readable values and viewport measurements.
- Protected PR checks, exact-main releasability, and canonical runtime validation remain the release
  controls.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Confirm the selected portfolio, visible 10-, 30-, or 90-day horizon, source as-of date, projection
basis, and whether the state is limited, unconfirmed, or unavailable. Retry one governed Gateway
read when the approved control is available. Record the returned support reference and contract
version without copying client identifiers or raw payloads into an unapproved channel.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Positions](Positions-Screen-Guide)
- [Transactions](Transactions-Screen-Guide)
- [Income And Activity](Income-And-Activity-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
