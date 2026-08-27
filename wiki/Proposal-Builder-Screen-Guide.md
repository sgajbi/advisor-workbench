# Proposal Builder

Proposal Builder is the advisor's controlled workspace for constructing portfolio changes,
reviewing their indicative impact, requesting a source-owned evaluation, and retaining an
advisor-use draft. It keeps portfolio evidence, drafting inputs, analytical output, and final
actions in one ordered workflow without presenting evaluation as approval or execution authority.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/proposals/simulate?portfolioId={portfolio_id}` |
| Navigation | Direct bounded route; the global **Proposal** workspace remains capability-disabled |
| Supported scope | One selected portfolio and advisory as-of date |
| Evidence posture | Gateway-backed Core portfolio book plus Advise workspace evaluation and handoff |
| Primary next action | Confirm evidence, construct the draft, evaluate it, then retain it for governed review |

The screen is available for implementation and validation through its direct route. That does not
establish unrestricted production availability, authenticated advisor entitlement, suitability
approval, client-release authority, or order execution.

## Business Purpose

Proposal Builder helps an advisor answer four questions in one decision flow:

1. Is the selected portfolio book current and aligned to the requested date and currency?
2. What position, security-order, cash-movement, and additional-cash assumptions make up the draft?
3. What indicative portfolio and liquidity impact follows from those admitted inputs?
4. Has the source evaluated the proposal, and has an advisor-use draft actually been retained?

The persistent **Review and retain** rail keeps readiness and actions available while the advisor
works through a long construction record. At tablet, zoom, and narrow widths it follows the inputs
in document order so evidence is reviewed before action.

## Shared Review Context

The shell-owned **Review portfolio** strip confirms the portfolio name, mandate, booking centre,
business date, and currency once; portfolio and client references remain in **Support details**.
The builder normally receives this identity from the exact Gateway-backed portfolio workspace. If
that lightweight shell response is unavailable while the identity-matched Gateway portfolio book
remains healthy, the strip and form use the same recovered portfolio, client, booking-centre,
business-date, and base-currency facts and label mandate context as limited. A foreign book response
still fails closed; route or demonstration values never become display or action authority. The
form may refresh holdings and cash only beneath that shell-confirmed context. If shell recovery
fails, a later browser-side book response cannot enable evaluation, handoff, portfolio navigation,
or a portfolio-scoped queue link; the advisor must refresh the page or return to **My book** so the
shell and construction workflow confirm one context together.

Portfolio reference, currency, business date, and mandate are governed review context, not draft
inputs. They are no longer editable inside the form. The advisor edits only supported proposal
intent such as position changes, security orders, cash movements, draft name, and the clearly
labelled additional-cash assumption before requesting source evaluation.

## Who Uses This Screen

- **Client advisors and relationship managers** construct and evaluate an internal proposal before
  choosing whether to retain it for review.
- **Portfolio managers and investment specialists** inspect source holdings, draft orders,
  liquidity assumptions, and indicative allocation impact while supporting the advisor.
- **Risk, compliance, operations, and support teams** use the source status, proposal run,
  correlation, and retained proposal identity when investigating a governed handoff.
- **Product and demonstration teams** use the canonical seeded portfolio and browser proof to
  demonstrate bounded workflow behavior without promoting the disabled global capability.

These roles describe business use, not authenticated production entitlement.

## Workflow Position

1. Start from [Advisor Book](Advisor-Book-Workflow) or another supported selected-portfolio flow.
2. Confirm portfolio, currency, advisory date, holdings, and cash evidence.
3. Review current positions and add intended buy or sell changes.
4. Add cash movements or off-book security orders where required.
5. Review the indicative value, liquidity, concentration, and allocation change.
6. Name the advisor-use draft.
7. Select **Evaluate Workspace** and wait for source-confirmed evaluation evidence.
8. Review the returned evaluation; correct and reevaluate when required.
9. Select **Save Advisor Draft** only when a retained review record is required.
10. Continue to the portfolio-scoped proposal queue after the source confirms the handoff.

Evaluation is an in-screen result, not a separate destination. Saving performs a fresh evaluation
before handoff; a prior visual result never substitutes for current source confirmation.

## Implemented Capabilities

- Reads required portfolio-book evidence for the selected portfolio, advisory date, and reporting
  currency through the Workbench BFF and Gateway.
- Starts the advisory date unconfirmed unless the route supplies a valid calendar date; it never
  inserts a fixed demonstration date into the advisor's draft.
- Validates carried and returned advisory dates as real calendar dates, including leap-year and
  month-length rules; a shape-correct impossible date remains explicit and cannot authorize a
  proposal action.
- Separates that calendar-semantic advisory date from exact AI preparation and workflow audit
  instants. Exact instants require source timezone evidence, render in disclosed UTC, and fail
  closed rather than echoing malformed or browser-local time.
- Distinguishes loading, confirmed, confirmed-empty, stale-refresh, mismatched, incomplete,
  restricted, and unavailable evidence instead of creating fallback holdings or cash.
- Supports held-position buy and sell changes, cash movements, and off-book draft orders.
- Caps sell-down intent to source-backed available quantity before submission and discloses the
  control in the review rail.
- Keeps optional additional cash as a draft assumption; it changes indicative proposed values but
  never rewrites source cash or current portfolio value.
- Withholds combined monetary impact when source and draft currency identity cannot be aligned.
- Uses one minor-unit precision boundary for field admission, preview, and submitted cash intent.
- Shows a dense setup strip and ordered construction panels before the final action rail in the
  document and keyboard sequence.
- Uses the shared productive type roles for form labels, holdings, draft orders, summary values,
  and decision actions. Routine business labels remain sentence case; financial values stay
  indivisible while the owned Proposal grids reflow around them.
- Keeps both final actions fenced while either source transaction is pending.
- Shows progress, failure, evaluation confirmation, and retained-draft confirmation beside the
  actions without moving focus or fabricating completion.
- Preserves the selected portfolio when continuing to the proposal queue.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Refresh portfolio evidence | Complete portfolio, date, and currency context | None; rereads the Gateway/Core portfolio book |
| Add or amend draft intent | Valid quantity, money, currency, and instrument input | None; remains browser construction state |
| Evaluate Workspace | Confirmed portfolio evidence and admitted draft inputs | Advise workspace and draft actions are created and evaluated; no proposal is retained |
| Save Advisor Draft | Same gates as evaluation plus a source-owned successful evaluation | Advise handoff retains an advisor-use proposal identity |
| View proposal queue | Selected portfolio context | None; navigates to the existing queue |

Failure at any create, draft-action, evaluation, or handoff step remains explicit. A created
workspace without a valid evaluation result is not described as evaluated, and a successful
evaluation without a proposal identity is not described as retained.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Portfolio identity, holdings, cash, valuation date, and currency | Read through `/api/bff/api/v1/...`; never reconstructed from browser defaults | Gateway over Core portfolio-book contracts |
| Additional cash, draft orders, cash movements, and title | Validated working intent until submitted | Advisor-entered Workbench state |
| Indicative cash, value, concentration, and allocation change | Presentation derived only from currency-aligned, range-admitted source and draft inputs | Workbench presentation model over Core evidence and advisor intent |
| Workspace identity, evaluation status, proposal run, review issues, and blocking issues | Accepted only from a usable Gateway response | Gateway over Advise advisory-workspace contracts |
| Retained proposal identity | Shown only after idempotent handoff returns a proposal identity | Gateway over Advise handoff contract |

Shared endpoint families and runtime ownership remain in [API Surface](API-Surface) and
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Preparing | Hydration-safe disabled actions and source-evidence loading | Wait; no first action can be lost before handlers are ready |
| Advisory date not confirmed | Empty required date field and unavailable source-backed proposal actions | Select the intended advisory date; Workbench does not substitute a demonstration date |
| Carried advisory date invalid | **Advisory date needs correction**, the rejected date, and unavailable proposal actions | Return to portfolio review and select a valid calendar date; refreshing the same proposal cannot correct its carried context |
| Source advisory date invalid | **Portfolio evidence date is unavailable**, the rejected source date, retained non-authoritative facts, and unavailable proposal actions | Refresh portfolio evidence so the source can provide a valid date; Workbench does not normalize or substitute the returned value |
| Workspace context limited, book confirmed | Confirmed portfolio-book identity, date, and base currency; mandate context is visibly unavailable | Continue only after the form's required holdings and cash evidence also confirms the same context |
| Workspace context unconfirmed | Unavailable portfolio actions and no portfolio-scoped navigation, even if a later evidence refresh succeeds | Refresh the page or return to **My book**; browser evidence cannot independently authorize the workflow |
| Evidence confirmed | Holdings, cash, date, currency, and readiness are visible | Continue construction or deliberately refresh the source |
| Evidence unavailable or mismatched | Exact requested/source context and an explicit block | Refresh the portfolio evidence or correct the context |
| Draft input needs correction | Field-level guidance, blocked impact where necessary, and **Action required** | Correct the visible value; Workbench does not coerce it to zero |
| Evaluating | Both final actions are disabled and source progress is announced | Wait for the current transaction; do not create a concurrent handoff |
| Evaluation confirmed | Source status and support reference plus the detailed evaluation summary | Review the returned evidence before retaining the draft |
| Evaluation failed or incomplete | **Proposal action not completed** with the source error and no success claim | Correct the draft if needed, then retry the same action deliberately |
| Retaining draft | Both actions remain fenced while evaluation and handoff complete | Wait for the source response |
| Advisor draft retained | Source proposal identity and queue handoff become visible | Continue to the queue for the next governed workflow step |
| Handoff failed or has no identity | Failure remains explicit; no retained state is shown | Retry only after confirming the intended draft and source posture |

## Workbench Boundaries

Proposal Builder deliberately does not:

- approve suitability, mandate compliance, risk acceptance, or client appropriateness,
- publish, archive, render, or distribute a client document,
- contact a client or record client consent,
- create, route, approve, or execute an order,
- invent portfolio evidence, FX conversion, benchmark facts, policy limits, or source success,
- turn an evaluated workspace into a retained proposal without successful handoff,
- establish production identity, role, portfolio entitlement, or unrestricted Proposal navigation.

This guide records implemented engineering truth; it is not a claim of bank approval or competitor
superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) establishes source-backed own-book and portfolio context.
- [Portfolio Review](Portfolio-Review-Screen-Guide) provides the selected mandate's review posture.
- [Performance Summary](Performance-Summary-Screen-Guide) and
  [Risk Review](Risk-Review-Screen-Guide) provide separate source analytics; Proposal Builder does
  not recalculate or approve them.
- The proposal queue and detail routes own later review, approval, narrative, and delivery posture.
- Reporting, archive, communication, suitability approval, and execution remain separate
  capabilities with their own source contracts.

## Evidence And Validation

- `tests/integration/proposal-simulate-form.test.tsx` proves evidence admission, draft construction,
  precision and currency controls, DOM workflow order, concurrent-action fencing, success only
  after source evidence, explicit failure, evaluation, and retained handoff.
- `tests/e2e/proposal-workflow-context.spec.ts` runs against an optimized production Workbench and
  proves the persistent desktop rail, tablet and narrow stacking, 200% zoom-equivalent reflow,
  source-confirmed evaluation, portfolio-scoped queue link, and zero page overflow.
- `tests/integration/proposal-simulate-page.test.tsx` proves the direct route composition and
  source-and-scope boundary.
- `tests/integration/proposal-workspace-shell.test.tsx` and
  `tests/unit/proposal-workspace-shell-context.test.ts` prove that shell-unavailable recovery uses
  only an identity-matched portfolio book, keeps the strip and child workflow aligned, avoids a
  duplicate book read while the workspace shell is healthy, and rejects foreign recovery context.
- `tests/unit/typography-token-authority.test.ts` rejects page-local size, inflated weight, and
  routine uppercase regressions in Proposal-owned styles, and protects no-wrap treatment for the
  financial summary values.
- Canonical runtime validation uses `PB_SG_GLOBAL_BAL_001`; direct browser proof does not promote
  the capability-disabled global Proposal workspace.
- Use [Validation and CI](Validation-and-CI) for protected and exact-main evidence.

## First Support Step

Read the visible portfolio evidence state and action outcome. Retry one source read or one unchanged
proposal action. If the failure persists, record the advisory date and only the displayed
correlation, workspace, proposal, or support reference; do not copy holdings, client details, or
payloads into support channels. Follow [Operations Runbook](Operations-Runbook) without bypassing
Gateway, injecting browser authority headers, or calling Advise directly.

## Related Documentation

- [Screen Guide Catalogue](Screen-Guide-Catalogue)
- [Advisor Book](Advisor-Book-Workflow)
- [Portfolio Review](Portfolio-Review-Screen-Guide)
- [Supported Features](Supported-Features)
- [API Surface](API-Surface)
- [Integrations](Integrations)
- [Validation and CI](Validation-and-CI)
- [Operations Runbook](Operations-Runbook)
- [Security and Governance](Security-and-Governance)
- [Roadmap](Roadmap)
