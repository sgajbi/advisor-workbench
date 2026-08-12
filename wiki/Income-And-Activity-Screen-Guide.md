# Income And Activity

Income And Activity is the selected portfolio's booked-income and booked-cash review. It explains
what was recorded in the reporting window, how gross income became net income, and which actual cash
movements increased or reduced the portfolio. It does not forecast income, assess liquidity,
calculate tax advice, reconcile bookings, or authorize a cash movement.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/income?portfolioId={portfolio_id}` |
| Navigation | **Income** in the selected-portfolio rail |
| Supported scope | One Gateway-backed portfolio and its current booked-record reporting window |
| Evidence posture | Owned contract-valid browser proof for `PB_SG_GLOBAL_BAL_001` at desktop, tablet, and narrow widths |
| Primary next action | Explain booked economics, investigate an unclassified bucket, or open the adjacent source-backed workflow |

Changing portfolio or governed date context requests a new selected-portfolio workspace. The screen
does not aggregate a household, advisor book, team book, or multiple mandates.

## Business Purpose

Income And Activity helps an advisor or portfolio manager answer four practical questions before a
client review or portfolio discussion:

1. How much dividend and interest income was booked in the reporting window?
2. Which source-recorded taxes and deductions explain the difference between gross and net income?
3. Which subscriptions, withdrawals, fees, and taxes explain classified net cash movement?
4. Is any returned activity still unclassified and therefore deliberately excluded from the net?

The reading order is portfolio and reporting context, gross-to-net income, classified cash
movement, then supporting type-level evidence. This keeps the screen dense without turning it into
a collection of unrelated cards.

## Who Uses This Screen

- **Client advisors and relationship managers** explain recent booked income and cash activity in
  business language before a client conversation.
- **Portfolio managers and investment specialists** review actual cash funding and uses alongside
  the current source-returned cash weight.
- **Investment operations and support teams** investigate an unknown source classification without
  allowing Workbench to guess its direction.
- **Product and control teams** use exact values, state handling, and machine-readable browser
  evidence to distinguish presentation defects from source-contract defects.

These are supported business uses, not production entitlement or supervisory claims.

## Workflow Position

1. Enter from [Advisor Book](Advisor-Book-Workflow), [Portfolio Review](Portfolio-Review-Screen-Guide),
   [Positions](Positions-Screen-Guide), or [Transactions](Transactions-Screen-Guide).
2. Confirm the selected mandate, reporting currency, source as-of date, and booked-record window.
3. Review gross income, deductions, net income, and year-to-date net income.
4. Review gross inflows, gross outflows, classified net movement, and any unclassified amount.
5. Use Transactions for underlying booked events or Projected Cash Movement for forward-looking
   movement evidence. Use Report Centre only when a governed report is required.

There is no automatic row-level handoff or persisted action from this screen.

## Implemented Capabilities

- Presents gross, source-recorded withholding tax, other deductions, net income, booking count, and
  year-to-date net income by income type.
- Presents gross inflows, gross outflows, classified net movement, current cash weight, booking
  count, share of activity, and year-to-date movement by business activity type.
- Derives direction from the governed bucket identity: inflows add cash; withdrawals, fees, and
  taxes reduce cash. Amount sign is not used to guess direction.
- Keeps unknown buckets visible as **Excluded from net** and adds a classification-review note.
- Uses shared metric, module, badge, table, route-state, and selected-portfolio patterns rather than
  page-specific controls or calculations.
- Keeps exact-value tables keyboard reachable and horizontally contained at narrow widths while the
  page itself remains free of horizontal overflow.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Explain booked income | Loaded reporting window, currency, gross, deductions, and net | None; read-only review |
| Explain classified cash movement | Loaded activity buckets and their source-defined direction | None; read-only review |
| Investigate an unclassified amount | Visible **Excluded from net** posture and classification note | None; correction remains source-owned |
| Change portfolio | Source-backed portfolio selection | None; Workbench requests a new workspace |
| Continue to an adjacent workflow | Supported navigation destination | None from this screen |

Viewing this screen does not create a report, transfer, booking correction, recommendation, order,
client communication, or approval record.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio, mandate, date, reporting currency, and current cash weight | Formats the selected workspace facts without replacing their source date | Gateway over Core portfolio contracts |
| Gross income, deductions, net income, booking counts, and income types | Reconciles and labels returned figures; performs no tax calculation | Core booked-income data composed by Gateway |
| Inflows, outflows, fees, taxes, and unknown activity | Maps governed identities to business direction; unknown direction stays excluded | Gateway activity-summary contract over Core records |
| Classified net movement | Sums only the documented inflow and outflow families | Deterministic Workbench projection over the Gateway contract |
| Empty or absent income/activity | Shows the matching bounded state; does not infer future economics | Gateway response and shared selected-portfolio shell |

Workbench uses the BFF and Gateway; it does not call Core directly. Shared contract detail remains in
[API Surface](API-Surface) and ownership flow in [Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | The shared selected-portfolio loading state | Wait for the governed Gateway request |
| Ready | Both booked-review modules with source context and exact evidence | Continue the review |
| Income absent | **No booked income in this window** while available activity can remain visible | Confirm portfolio and window; absence is not a forecast |
| Activity absent | **No booked cash movements in this window** while available income can remain visible | Confirm portfolio and window; use Cashflow only for projections |
| Summary present with no categories | An explicit module-level empty state | Treat the returned summary and absent detail separately |
| Unknown classification | Amount remains visible as **Excluded from net** | Investigate source classification; Workbench does not guess |
| Partial or degraded source | Available evidence remains bounded by the shared record-shell posture | Restore the named source before relying on missing evidence |
| Portfolio unavailable or request failed | Shared unavailable or error state replaces unsupported conclusions | Re-contact Gateway through the governed recovery path or follow the approved support process |

A visible recovery action is valid only when it requests source authority again. The screen does not
manufacture a local success state.

## Workbench Boundaries

Income And Activity deliberately does not:

- forecast dividends, interest, accrued entitlement, or cash movement,
- decide liquidity sufficiency, funding capacity, or cash-transfer recommendations,
- calculate tax liability, tax advice, cost basis, or reconciliation,
- amend a booking or create a payment, transfer, order, execution, settlement, report, archive, or
  client communication,
- infer cash direction from amount sign or present an unknown bucket as classified,
- treat current cash weight as part of window net cash movement,
- expose raw activity codes as the primary business language.

Official BlackRock, Avaloq, Temenos, SWIFT, and Salesforce research informed the booked-history,
gross-to-net, exception-led, and compact-timeline principles recorded in the product research
ledger. Lotus does not copy a competitor's layout, wording, visual identity, or unsupported
capability; this guide is not a claim of bank approval or competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) owns the advisor's source-backed portfolio selection.
- [Portfolio Review](Portfolio-Review-Screen-Guide) owns the daily mandate decision checkpoint.
- [Positions](Positions-Screen-Guide) owns booked holdings and holding-level activity context.
- [Transactions](Transactions-Screen-Guide) owns the booked ledger and applicable settlement review.
- Projected Cash Movement owns forward-looking movement; this screen remains booked-history only.
- [Report Centre](Report-Centre-Screen-Guide) owns governed report requests and source lifecycle.
- Source operations own classification repair, reconciliation, and booking amendment.

## Evidence And Validation

- Pure view-model tests prove positive-magnitude handling, gross-to-net reconciliation, stable
  business labels, and exclusion of unknown buckets from classified net movement.
- Component tests prove income and activity can be independently absent without suppressing the
  available module or inventing a zero.
- The owned production-browser scenario uses `PB_SG_GLOBAL_BAL_001` and exact contract-valid values:
  `12,000 USD` gross income, `10,500 USD` net income, `73,500 USD` classified net movement, and
  `2,000 USD` excluded movement.
- The browser matrix proves four/four/three/two metric columns at 1440/1024/768/519 px, no page-level
  horizontal overflow, suppression of raw source codes, and complete named sequential keyboard
  focus including the scrollable exact-value table regions.
- The screenshot is visual evidence only. Machine-readable proof is retained with the Playwright
  output, and protected PR plus exact-main validation remain the release controls.

Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
governed validation sequence.

## First Support Step

Confirm the selected portfolio, visible reporting window and currency, whether income or activity is
missing, and whether an amount is marked **Excluded from net**. Retry one governed Gateway read when
the approved recovery control is available. Record the support reference and business state without
copying client identifiers or raw response payloads into an unapproved channel.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Positions](Positions-Screen-Guide)
- [Transactions](Transactions-Screen-Guide)
- [Report Centre](Report-Centre-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
