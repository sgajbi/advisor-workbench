# Workbench Experience Research Ledger

- Status: Active
- Started: 2026-07-17
- Scope: screen-by-screen private-banking product experience decisions
- Audience: product, design, engineering, QA, and regulated front-office reviewers

## Portfolio Review

### Business job

A client advisor or portfolio manager opens Portfolio Review to decide whether the selected
portfolio is ready for a client or investment review, what requires attention, and which supported
workflow to enter next. The screen is an orientation and decision surface; allocation analysis,
position investigation, transaction review, performance analysis, and proposal construction remain
dedicated workflows.

The reading order is:

1. selected portfolio, reporting currency, status, and as-of date,
2. value, invested assets, liquidity, and period returns,
3. the highest-priority source-reported exception or insight,
4. readiness, open exceptions, and recommended next step,
5. supporting exception detail and reporting evidence,
6. a drill-down into the relevant workflow.

### Current-product research

Research was reviewed on 2026-07-17 from official product sources:

1. [Addepar for wealth management](https://addepar.com/wealth-management) and
   [Addepar platform overview](https://addepar.com/platform-overview): unified public/private asset
   context, exposure, performance, liquidity, governed access, and a path from portfolio questions
   to decisions.
2. [Morningstar Direct Advisory Suite](https://www.morningstar.com/business/products/direct-advisory-suite)
   and [Morningstar portfolio analytics services](https://developer.morningstar.com/direct-web-services/use-cases/portfolio-analytics-services):
   connected portfolio comparison across risk, performance, and exposure with reporting and
   regulatory workflow context.
3. [Orion Advisor Portal](https://orion.com/advisor-tech/advisor-portal): one advisor workspace for
   client views, proposals, trading, reporting, service requests, and workflow tracking.
4. [Salesforce Financial Services Cloud for wealth management](https://help.salesforce.com/s/articleView?id=sf.fsc_admin_landing_wealth.htm&language=en_US&type=5):
   client and relationship context joined to tasks, action plans, life events, and alerts.
5. [BlackRock Advisor Center 360](https://www.blackrock.com/us/financial-professionals/tools/advisor-center-360):
   account prioritization, concentration and opportunity review, portfolio comparison, risk
   contributors, and report workflows.
6. [Black Diamond Wealth Platform on Schwab Advisor Services](https://advisorservices.schwab.com/provider-solutions/Black-Diamond-Wealth-Platform):
   relationship-level portfolio context with key metrics kept prominent.

These sources inform workflow principles only. Lotus does not copy competitor layout, wording,
visual identity, calculations, or unsupported capabilities.

### Adopted decisions

1. Keep relationship and portfolio identity stable while the user moves from summary to detail.
2. Put a compact financial summary before charts, tables, and operational evidence.
3. Use exception-first disclosure: show the decision and consequence before technical evidence.
4. Place a supported next step beside the insight that motivates it.
5. Use dense rows and compact groups for related facts instead of a mosaic of equally weighted
   cards.
6. Preserve explicit as-of, currency, partial-failure, source, and supportability truth.
7. Keep detailed analytical records on dedicated screens reached through contextual navigation.

### Rejected decisions

1. Arbitrary user-configurable dashboard tiles: they weaken a governed review order and add layout
   complexity before role-specific workflow contracts exist.
2. Browser-owned thresholds, scores, alerts, or compliance interpretations: domain authority belongs
   in the source service and Gateway display contract.
3. Static trust, readiness, evidence, or workflow claims: regulated posture must be source-backed.
4. One page containing every chart and record grid: it increases scan cost and duplicates dedicated
   workflows.
5. Decorative gradients, excessive rounding, large hero marketing copy, and card-per-sentence
   composition: they reduce enterprise density and hierarchy.
6. Raw service names, endpoint vocabulary, catalog status, error codes, and implementation language
   in the main business reading path.

### Slice 1 — source-authoritative decision brief

The Portfolio Review decision brief now uses a reusable `WorkbenchDecisionBrief` pattern. The
portfolio adapter supplies source-owned exceptions, insights, overall readiness, reporting
coverage, and workflow actions in business order. GitHub issue #410 is the implementation and
recheck contract for this slice.

The slice deliberately removes:

1. the browser-created 5% cash review threshold,
2. duplicate presentation of an upstream partial failure when a shaped exception is available,
3. the technical `Catalog live` page status,
4. the page-specific executive-summary component, status wrapper, and unreferenced legacy summary
   layout CSS.

The brief now presents the Gateway-backed `Ready`, `Partial`, or `Not Ready` posture directly. A
populated diagnostic rejected the earlier label-derived percentage because it could render `0%`
beside a source-owned `Partial` posture and could still declare the review ready. Reporting status
and published row count remain separate operational facts; neither is presented as an investment,
suitability, compliance, or client-readiness score.

### Follow-up boundaries

1. Reuse the decision-brief primitive only where another screen has the same state → exception →
   next-action workflow; do not force visual reuse where the business job differs.
2. Split the remaining large Portfolio API and view-model modules in separate behavioral slices
   with characterization and contract tests under GitHub issue #408.
3. Replace static advisory evidence and readiness claims under GitHub issue #407 before presenting
   that rail as production workflow truth.
4. Preserve Gateway source-date authority under `sgajbi/lotus-gateway#494`; Workbench must not
   correct a manufactured or stale source date in the browser.

### Validation record

1. Focused component, view-model, and Portfolio tests: 19 passed before the populated review and
   12 readiness/decision-brief tests passed after the diagnostic correction on 2026-07-17.
2. Full `make check`: passed on 2026-07-17 with 1,214 tests, lint, typecheck, production build,
   90.64% statement coverage, and coverage above the repository thresholds.
3. Governed canonical seed verification passed for `PB_SG_GLOBAL_BAL_001`: 11 positions, 8 valued
   positions, 31 transactions, 2 cash balances, 4 allocation buckets, benchmark and analytics
   horizon through 2026-04-10, and no pending or failed valuation jobs.
4. Populated Portfolio Playwright smoke: 2 passed after the Gateway date correction, including the
   decision review. The diagnostic screenshot is intentionally not demo evidence because the full
   platform validation was blocked by separately filed runtime defects in Core, Manage, Report,
   Idea image provenance, and the canonical platform preflight.
5. Gateway issue #494 was merged as `ff23baf7`. After a targeted Gateway-only rebuild, the live
   default workspace request resolved `as_of_date` to the governed source date `2026-04-10`, with
   11 positions, 2 cash balances, and no partial failures. Workbench does not correct this date in
   the browser.
6. Full canonical platform/demo certification remains pending until the remaining owning issues
   are resolved; no demo-ready screenshot claim is made by this slice.
7. Workbench PR #411 merged to `main` as `497066e` after every feature and PR merge-gate lane
   passed. Issue #410 remains the durable implementation and recheck record.

### Publication decision

No repo wiki change is required for Slice 1. The slice changes composition and removes unsupported
client-side behavior; it does not add or change a supported feature, integration, operator command,
or published runtime contract.

## Advisory Workflow Context Rail

### Business job

The advisory context rail helps a relationship manager understand the current proposal queue or
selected advisory record without leaving the active work area. It must answer four questions in
order: what is the current posture, what business action is next, what evidence is blocking that
action, and which approved source supplied the posture. It is not a decorative checklist and does
not create KYC, suitability, approval, client-publication, or execution truth.

### Current-product research

Research was revalidated on 2026-08-04 from official product sources:

1. [Salesforce Financial Services Cloud Action Plans](https://help.salesforce.com/s/articleView?id=sf.fsc_action_plans&language=en_US)
   models business-process tasks with status, priority, completion time, responsibility, target
   record, and reusable dependencies. That supports record-specific tasks rather than generic
   browser-authored checklists.
2. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   separates identify, construct, deliver, and implement stages, places suitability and pre-trade
   checks before downstream order-management execution, and supports proposals at household,
   client, account, or sleeve level.
3. [BlackRock Aladdin Wealth regulation best-interest workflow](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/regulation-best-interest)
   emphasizes recommendation evidence, consistent risk processes, and monitored exceptions rather
   than a presentation-layer readiness assertion.

These sources inform workflow hierarchy and evidence boundaries only. Lotus does not copy their
layout, visual identity, wording, calculations, or unsupported capabilities.

### Adopted decisions

1. Use one typed six-state contract for loading, empty, partial, ready, unavailable, and restricted
   workflow context.
2. Keep the shared shell neutral. The workspace that owns the source query publishes context; the
   shell does not fetch, guess a selected proposal, or choose the first queue row.
3. For queue-level views, show source-returned volume and attention posture, the current business
   decision, recovery guidance, and an explicit instruction to open a proposal for record evidence.
4. For simulation, state that construction has no persisted workflow record until a draft is
   created through the approved service.
5. Use a dense summary-to-exception-to-detail order: status, current posture, next business action,
   blocking evidence, then source and scope disclosure.
6. Preserve permission and source-failure boundaries without cached or fallback workflow claims.

### Rejected decisions

1. Hard-coded review steppers, completion controls, KYC validity, suitability completion,
   evidence-pack progress, or client-readiness labels.
2. A shell-owned fetch layer or implicit selection of the first proposal or policy evaluation.
3. Combining source-specific failures into a healthy-looking generic workflow state.
4. Client approval, delivery, communication, order, OMS, fill, settlement, or execution language
   unless the relevant upstream contract explicitly supplies it.
5. Decorative tabs for evidence, tasks, and audit history when no such record data is present.

### Validation and publication decision

Issue #407 owns implementation and recheck. Focused view-model, component, integration, and route
tests cover the six states, live queue publication, neutral default, simulation boundary, compact
layout, and absence of legacy authority claims. Full repository and protected CI evidence is added
to the issue before closure.

No repo wiki change is required. This slice corrects presentation authority and repository guidance
without changing a supported route, backend contract, operator command, or published capability.

## Allocation Review

### Business job

A client advisor or portfolio manager opens Allocation Review to understand how the selected
portfolio is invested, move across asset-class, currency, sector, and region exposure, and identify
the booked holdings that contribute to a direct exposure. The screen explains current composition;
it does not invent a strategic target, benchmark comparison, drift interpretation, suitability
decision, or rebalance recommendation.

The reading order is:

1. portfolio identity, mandate, currency, and source as-of date,
2. assets under management, available exposure views, and position count,
3. the selected exposure dimension and direct or expanded exposure mode,
4. ranked exposure value, weight, and source-reported position count,
5. contributing booked holdings for a selected direct exposure,
6. adjacent Portfolio, Position, Mandate, Risk, or Performance workflows where supported.

### Current-product research

Research was reviewed on 2026-07-17 from official product sources:

1. [Morningstar Portfolio X-Ray](https://www.morningstar.com/help-center/portfolio/xray): asset,
   sector, and region views pair portfolio breakdowns with a holdings breakdown that explains how
   each security contributes to an exposure.
2. [BlackRock Portfolio 360](https://www.blackrock.com/portfolio-centre): allocation is one stage
   in a defined, repeatable portfolio-review process designed to turn portfolio data into informed
   action rather than an isolated visualization.
3. [BlackRock Advisor Center 360](https://www.blackrock.com/us/financial-professionals/tools/advisor-center-360):
   portfolio analysis emphasizes actionable holdings-based insights and security-level drivers.
4. [Addepar for institutional allocators](https://addepar.com/institutions/allocators): governed
   total-portfolio analytics keep true look-through exposure distinct across fund and ownership
   structures.

These sources inform workflow principles only. Lotus does not copy competitor layout, wording,
visual identity, calculations, or unsupported capabilities.

### Adopted decisions

1. Pair exposure views with the contributing-holdings result in the same screen flow.
2. Keep direct holdings and expanded exposure explicit; never silently substitute one for the
   other.
3. Use the existing dense Portfolio holdings grid for contributor review, including its search,
   columns, export, keyboard, filter, valuation, and empty-state behavior.
4. Use business-facing visualization choices (`Composition`, `Comparison`, and `Table`) and
   describe the data as exposure rather than chart implementation.
5. Keep the source as-of date, reporting currency, position count, market value, weight, and
   classification visible without recomputing allocation totals in the browser.
6. Treat an unmatched direct filter as an empty contributor result, not as an empty portfolio.

### Rejected decisions

1. Filtering direct booked positions to explain expanded look-through exposure: the booked parent
   and decomposed component are not equivalent.
2. Browser-authored target weights, benchmark weights, drift, concentration thresholds, risk
   interpretation, or rebalance advice: none is present in the current Gateway allocation contract.
3. A cross-dimension total of allocation buckets: the same portfolio is classified repeatedly, so
   the aggregate is a technical count with no stable business interpretation.
4. A one-off contributor table: it would duplicate the supported Portfolio holdings pattern and
   diverge in accessibility, export, empty, valuation, and column behavior.

### Slice 1 — exposure-to-contributing-holdings flow

GitHub issue #413 governs the slice. Allocation selection now filters source portfolio positions by
the selected direct asset class, currency, sector, or region and presents the result through the
reusable holdings grid. The result names the selected exposure, reports the source-row count, and
provides keyboard-accessible clear actions. The unselected state keeps the full booked inventory
visible and explains how to begin contributor review.

Allocation drill-down shaping moved from the broad Portfolio view model into the focused
`portfolio-allocation-drilldown-view-model.ts`. The unused generic holdings drill-down union and
its unconsumed security/status branches were removed. The holdings grid now accepts reusable
business headings and distinguishes an empty filtered result from an empty source book.

Cash balances are source records outside some booked-position payloads, so the contributor view
adds any missing cash balance as a typed cash holding and deduplicates it against booked positions
by source security id. Source-valued cash is not misclassified as an unpriced security merely
because the balance contract has no market-price field. Allocation review state is mounted by
portfolio identity, preventing a client-side portfolio change from carrying a prior book's
selection or exposure mode into the next book.

When expanded look-through is applied, contributor actions are disabled and the booked inventory
is labelled as reference only. Core issue `sgajbi/lotus-core#801` tracks preservation of contributor
and booked-parent lineage during allocation aggregation. Gateway issue
`sgajbi/lotus-gateway#496` tracks publication of that source detail to Workbench. Until both land,
Workbench does not claim an expanded contributor drill-down.

### Validation record

1. Focused allocation, record-screen, holdings-grid, and Portfolio view-model coverage: 33 tests
   passed on 2026-07-17.
2. Full `make check` passed after review fixes on 2026-07-17: 285 test files and 1,229 tests passed
   with 90.83% statement coverage, followed by clean lint, TypeScript validation, and a successful
   production build.
3. The populated Playwright smoke pack passed all three Portfolio tests against
   `PB_SG_GLOBAL_BAL_001`. Allocation proof covered keyboard selection of a ranked direct exposure,
   the contributing-holdings result, clear-filter restoration, and the source-backed unavailable
   look-through state. No demo-ready screenshot was published because this run was implementation
   validation rather than a full canonical platform certification.
4. PR #414 merged to `main` as `3fcdefee` after all feature and protected merge-gate lanes passed,
   both review findings were resolved, and the final Codex review reported no major issues. The
   post-merge Main Releasability Gate also passed workflow lint, lint, typecheck, coverage, build,
   Playwright smoke, Docker build, and Dockerized local-CI parity. Issue #413 is closed and codebase
   review item `LWB-R154` is hardened.

### Publication decision

No repo wiki change is required for this slice. It completes an existing supported Allocation
screen interaction and documents an unavailable expanded-contributor boundary; it does not change
an operator command, integration contract, supported-feature claim, or published runtime flow.

## Positions Review

### Business job

A client advisor or portfolio manager opens Positions Review to verify the complete booked
inventory at the portfolio as-of date, understand valuation and unrealized profit-and-loss posture,
and move from a holding to its recent booked activity. The screen supports book review and meeting
preparation; it does not infer tax lots, suitability, recommendations, targets, drift, risk,
performance, orders, execution, or settlement authority.

The reading order is:

1. portfolio identity, mandate, currency, and source as-of date,
2. assets under management, invested assets, and cash,
3. complete booked securities and source cash balances,
4. valuation, cost basis, weight, unrealized P&L, currency, status, and identifiers,
5. holding overview, valuation detail, and recent booked activity,
6. the full Transactions ledger when broader activity review is needed.

### Current-product research

Research was reviewed on 2026-07-17 from official product sources:

1. [Morningstar Direct Portfolio Management](https://www.morningstar.com/business/products/direct/portfolio-management-tool):
   holdings analysis connects individual investments, grouping, impact, and portfolio context.
2. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth):
   advisors need a comprehensive whole-portfolio view across holdings and connected workflows.
3. [BlackRock Advisor Center 360](https://www.blackrock.com/us/financial-professionals/tools/advisor-center-360):
   holdings-based analysis should support actionable portfolio insight and meeting preparation
   rather than stop at a static inventory.

These sources inform workflow principles only. Lotus does not copy competitor layout, wording,
visual identity, calculations, or unsupported capabilities.

### Adopted decisions

1. Treat Positions as a point-in-time booked-inventory review governed by the source as-of date.
2. Show AUM, invested assets, and cash as the first-read book composition instead of a generic
   rolling window.
3. Combine booked positions with separate source cash-balance records, deduplicated by source
   security id and typed so valued cash is not misclassified as an unpriced security.
4. Keep the reusable dense holdings grid, including search, user-selected columns, export,
   valuation status, partial valuation posture, and empty states.
5. Make each instrument a named keyboard control and retain whole-row pointer activation for fast
   review.
6. Reuse the Portfolio detail drawer for holding overview, valuation, and recent booked activity;
   explicitly identify the activity as the subset supplied with the current portfolio review and
   link to the full transaction ledger.
7. Move complete-inventory shaping into one shared view model used by Allocation and Positions,
   and extract the drawer controller so record screens do not duplicate lazy-loading behavior.
8. Settle detailed record requests independently and carry securities, liquidity, and activity
   availability into the screen, so an upstream gap cannot be rendered as zero or complete data.

### Rejected decisions

1. A 30-day Positions KPI: holdings are point-in-time records and the generic period was false
   context.
2. Disabled decorative filters and selection checkboxes without a bulk business action: visible
   controls must produce a supported outcome.
3. A page-specific holdings table or drawer: both would duplicate existing Workbench patterns and
   create accessibility, export, and state-handling drift.
4. Calling the workspace activity subset a complete transaction history: the source contract only
   supplies recent transactions with the portfolio review.
5. Browser-authored tax lots, accrued interest, issuer hierarchy, private-asset capital accounts,
   restrictions, suitability, recommendations, risk, performance, trade, order, execution, or
   settlement claims.

### Slice 1 — complete inventory and holding review

GitHub issue #416 governs the slice. `portfolio-booked-holdings-view-model.ts` now owns both the
security-id-deduplicated complete booked inventory and holding-specific recent-activity matching.
Allocation and Positions consume the same inventory rule. `PortfolioPositionsRecordWorkspace`
owns screen-level selection and composes the existing holdings grid with the reusable extracted
detail-drawer controller.

The standalone header now presents source-backed AUM, invested assets, and cash. The grid calls
the inventory `Booked holdings`, counts holdings rather than positions, omits the filter when no
filter exists, and no longer exposes checkbox selection without a bulk workflow. `Show all
columns` replaces the ambiguous `Expand` action and disappears when every column is visible.

Keyboard or pointer activation opens holding overview and valuation detail plus only the recent
transactions whose source security or instrument identifier matches the holding. The activity tab
states its limited lineage and offers the complete Transactions ledger instead of implying that the
workspace subset is exhaustive.

PR review found that the prior detailed-data loader returned no detail object when either liquidity
or transactions was unavailable. The record screen could therefore retain empty shell arrays and
describe missing cash as a complete inventory or missing activity as no recent transactions. The
loader now preserves each independently successful detail slice and publishes explicit securities,
liquidity, and activity availability to the record composition. Positions labels an incomplete
book as `Available holdings`, presents a business-facing partial state, retains source summary
totals, and uses an unavailable recent-activity state instead of a false empty result.

### Validation record

1. Focused API availability, booked-inventory, Allocation regression, record-screen,
   holdings-grid, drawer, and header coverage passed 61 tests after review fixes on 2026-07-17;
   lint and TypeScript validation also passed.
2. The Portfolio Playwright smoke pack passed all four tests against the populated canonical
   backend stack. Positions proof covered point-in-time KPIs, source cash visibility, identifier
   deduplication, removal of inert controls, keyboard drawer activation, recent-activity lineage,
   and the full-ledger link.
3. Full `make check` passed after review fixes on 2026-07-17: 286 test files and 1,237 tests passed with 90.82%
   statement coverage, followed by clean lint, TypeScript validation, and a successful production
   build.
4. The populated Portfolio Playwright smoke pack passed all four tests again after the review fix,
   proving the Portfolio Review, Income, Allocation, and Positions workflows against the same
   production build path.
5. PR #417 merged to `main` as `d6e33650` after all feature and protected merge-gate lanes passed.
   Codex's final review on `bf30a7e` found no major issues, the earlier availability thread was
   resolved with regression evidence, and issue #416 closed through the merge.
6. Post-merge Main Releasability run `29560225999` passed workflow lint, lint, typecheck, coverage,
   production build, Playwright smoke, Docker image validation, and Dockerized local-CI parity on
   merge SHA `d6e33650`. Codebase review item `LWB-R155` is hardened.

### Publication decision

No repo wiki change is required for this slice. It completes an existing supported Positions
screen using already published Portfolio and Transactions contracts; it does not change an
operator command, integration contract, supported-feature claim, or published runtime flow.

## Transactions Review

### Business job

A client advisor, portfolio manager, or operations reviewer opens Transactions Review to inspect
source-booked activity for a selected period, distinguish transaction-currency economics from
portfolio-currency accounting values, identify entries that need settlement attention, and trace
multi-row booking events across their source identifiers. The screen supports review and evidence
navigation; it does not book, amend, cancel, approve, execute, settle, or reconcile transactions.

The reading order is:

1. portfolio identity, mandate, portfolio currency, and source as-of date,
2. portfolio-wide latest booking date and initial 30-day ledger-entry count,
3. trade and settlement dates, activity type, instrument, quantity, and price,
4. gross amount in transaction currency, net cost and realized P&L in portfolio currency,
5. settlement status and booking-component context,
6. source lineage and related booking-group, FX-contract, or swap-leg activity,
7. previous or next source page when the result exceeds the initial 200 entries.

### Current-product research

Research was reviewed on 2026-07-17 from official product sources:

1. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth):
   connected advisor workflows depend on a common data foundation rather than disconnected local
   interpretations.
2. [BlackRock Aladdin Operations](https://www.blackrock.com/aladdin/benefits/operations):
   operations users benefit from shared high-quality data and exception-oriented review across the
   investment lifecycle.
3. [Morningstar Direct Advisory Suite integrations](https://www.morningstar.com/business/products/direct-advisory-suite/integrations):
   consistent, accurate connected data is foundational to an advisor workflow.

These sources inform workflow principles only. Lotus does not copy competitor layout, wording,
visual identity, calculations, or unsupported capabilities.

### Adopted decisions

1. Treat the screen as booked-activity review, not as an order ticket or browser-owned ledger.
2. Preserve Gateway monetary semantics explicitly: `gross_amount` remains paired with transaction
   `currency`, while `net_cost_base` and `realized_gain_loss_base` remain paired with portfolio
   base currency. Never add mixed-currency fallback values into one total.
3. Retain Gateway `total`, `skip`, and `limit` metadata, disclose visible ledger coverage, and
   provide source paging beyond the initial 200 entries.
4. Lead with portfolio currency, portfolio-wide latest booking, and an explicitly labeled 30-day
   entry count instead of unrelated AUM, positions, or an ambiguous window KPI. Keep current
   filtered coverage in the grid that owns the active query scope.
5. Count only visible non-settled entries as a review cue and avoid inventing settlement rules or
   severity outside source status.
6. Compose the existing dense portfolio grid, record shell, lazy detail-drawer controller, and
   drawer builder instead of creating page-specific table or overlay patterns.
7. Make row review explicit and connect supported related-event identifiers to server-backed
   linked-group, FX-contract, swap-event, near-leg, and far-leg filters.
8. Reset paging when portfolio, date, type, component, or related-event scope changes.
9. Export local gross, base net cost, and base realized P&L as separate auditable columns.

### Rejected decisions

1. `net_cost_base ?? gross_amount` under transaction currency: this can label a base-currency value
   with the wrong currency.
2. A summed transaction amount KPI: gross, net cost, buys, sells, income, fees, and multiple
   currencies are not one additive business measure.
3. Silently presenting only the first 200 records as the complete result.
4. A no-op `Book first transaction` action: transaction booking belongs to the owning booking
   workflow and is not supported by this screen.
5. An ambiguous `Expand` control, implementation-centric filter labels, or row interaction without
   an accessible, visible review outcome.
6. Browser-authored booking, amendment, cancellation, approval, execution, settlement,
   reconciliation, cost-basis, tax-lot, or exception-severity authority.

### Slice 1 — trustworthy booked activity and lineage review

GitHub issue #419 governs the slice. The detailed portfolio loader now retains Gateway ledger
metadata alongside its initial transaction page. Focused transaction row shaping keeps local and
portfolio-currency values separate, produces explicit export columns, counts visible settlement
attention, and formats complete or paged source coverage without monetary aggregation.

`PortfolioTransactionsRecordWorkspace` owns row selection and related-event scope. It composes the
existing transaction grid with the reusable detail-drawer controller, closes detail before applying
a new server-backed filter, and passes the initial page metadata through to the grid. The grid
resets paging on every scope change, requests `skip` explicitly, preserves returned page metadata,
and exposes previous and next entry controls when source totals require them.

The screen now uses `Booked activity`, `Activity type`, `Booking component`, `Transaction Currency`,
`Net Cost (<portfolio currency>)`, `Settlement Status`, and `Show all columns`. Empty copy directs
the reviewer to verify the period and source-book availability without advertising unsupported
booking. Transaction and holding drawers also describe whether a displayed amount is local gross
or portfolio-currency net cost.

### Validation record

1. Focused transaction helper, grid, API, drawer, record-header, record-screen, and record-workspace
   coverage passed after implementation and browser-discovered refinements on 2026-07-17.
2. The populated canonical Portfolio Playwright proof passed against `PB_SG_GLOBAL_BAL_001`. It
   verified 29 entries after widening the period, `73,912.5 EUR` gross versus `80,097.93 USD` net
   cost, transaction-id search across hidden audit columns, visible review action, detail drawer,
   and a two-entry related booking-group drill-down.
3. Full `make check` passed on 2026-07-17: 287 test files and 1,241 tests passed at 90.8% statement
   coverage, followed by clean lint, TypeScript validation, and a successful production build.
4. Strict repository-wiki parity reported zero differences. The initial governed local bring-up
   attempt stopped on an already occupied Core Compose port; only its newly created failed
   containers were removed, and the screen proof used the existing healthy canonical Core/Gateway
   stack with the branch Workbench server.
5. Codex PR review identified that the stable header entry count could be mistaken for the grid's
   mutable filter scope. The header now says `30D Entries`; current coverage remains beside the
   active grid scope. Focused view-model tests, TypeScript, lint, and the populated canonical
   Transactions browser flow passed after the correction.
6. Fresh-head Codex review identified that the settlement cue described loaded-page results as
   visible after quick search. The cue now explicitly says `loaded`, preserving truthful scope
   without duplicating AG Grid's hidden-column search semantics. All 19 portfolio-grid tests,
   TypeScript, lint, and the populated canonical Transactions browser flow passed after the fix.
7. The next fresh-head review identified that an open record or related-event filter could survive
   a portfolio switch. The transaction workspace now follows the Allocation and Positions
   identity-key pattern so both review states are discarded before the new portfolio renders.
   Eight focused workspace/screen tests, TypeScript, lint, and the populated canonical
   Transactions browser flow passed after the correction.
8. PR #420 merged by rebase to `main` as `92478ab1`. Final Codex review on `e0ef19a` found no
   major issues, all feature and protected merge-gate jobs passed, and exact-main Main
   Releasability run `29566612562` passed workflow lint, lint, typecheck, coverage, production
   build, Playwright smoke, Docker build, and Dockerized local-CI parity. The canonical clone was
   synchronized to clean `main`; all eight feature-branch patches were proven equivalent to
   `origin/main` before the merged local branch was removed.

### Publication decision

No repo wiki change is required for this slice. It improves the composition and correctness of an
already supported Transactions screen without changing an operator command, Gateway integration
contract, supported-feature claim, or canonical runtime flow.

## Income & Activity Review

### Business job

A client advisor or portfolio manager opens Income & Activity Review to understand income that
was booked in the selected reporting window, reconcile gross income to withholding and other
deductions, and distinguish subscriptions from withdrawals, fees, and taxes. The screen supports
book review and meeting preparation; it does not forecast income, project liquidity, provide tax
advice, or authorize cash movement.

The reading order is:

1. portfolio identity, mandate, reporting currency, and source as-of date,
2. requested-window net income and net cash movement,
3. gross income, withholding tax, other deductions, and net income by income type,
4. gross inflows, gross outflows, and net cash movement by canonical activity class,
5. current source cash weight as adjacent portfolio context,
6. the separate Cashflow workspace when projected cash-movement review is required.

### Current-product research

Research was reviewed on 2026-07-17 from official product sources:

1. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth):
   a connected whole-portfolio experience and common portfolio language help advisors move from
   data to action without disconnected interpretations.
2. [Morningstar ByAllAccounts](https://www.morningstar.com/business/products/byallaccounts):
   transaction-level detail and consolidated cashflow visibility are foundational to reliable
   portfolio cash review.
3. [Morningstar Direct Advisory Suite reports](https://www.morningstar.com/business/products/direct-advisory-suite/reports):
   complex investment information should be presented clearly, interactively, and in a form that
   supports advisor and client conversations.
4. [Addepar sample reports](https://addepar.com/sample-reports) and
   [Addepar investor solutions](https://addepar.com/investors): configurable multi-currency
   reporting should connect aggregate portfolio posture to granular supporting evidence.

These sources inform workflow principles only. Lotus does not copy competitor layout, wording,
visual identity, calculations, forecasts, or unsupported capabilities.

### Adopted decisions

1. Treat Income & Activity as a booked-record review and keep forward-looking cashflow in the
   separate Cashflow workspace.
2. Reconcile gross income to withholding, other deductions, and net income rather than showing a
   single unexplained amount.
3. Interpret Gateway activity summary amounts as positive magnitudes and derive cash direction
   from the canonical bucket identity: `INFLOWS` add cash, while `OUTFLOWS`, `FEES`, and `TAXES`
   reduce cash.
4. Keep unknown activity buckets visible but unclassified and exclude them from classified net
   cash movement rather than guessing direction.
5. Separate gross inflows, gross outflows, and classified net movement; never gross-sum all
   activity magnitudes into a value labelled net cashflow.
6. Use one pure screen view model and reusable analytics modules, metric strips, tables, semantic
   badges, and module states instead of page-specific panels.
7. Show booking counts by source row without adding income and tax rows into one ambiguous event
   count.
8. Use business language and explicit reporting-currency/window context throughout.

### Rejected decisions

1. Sign-based direction inference: the Gateway contract returns magnitude values for canonical
   activity buckets, including fees, taxes, and outflows.
2. A generic `Ready` badge inferred from a non-zero event count: booking presence is not source
   readiness or client-report readiness.
3. Hiding gross income, withholding, or other deductions behind a net-only summary.
4. Combining current booked income with forecast distributions or projected liquidity.
5. Browser-authored tax advice, expected income, cash projections, next-best action, transfer,
   payment, order, execution, settlement, or reconciliation authority.
6. Page-specific panels and styling when the shared Workbench analytical patterns already express
   the screen hierarchy.

### Slice 1 — truthful booked income and cash movement

GitHub issue #425 governs the slice. `portfolio-income-activity-view-model.ts` now owns income
reconciliation and canonical cash-direction semantics. The record header reports net income, net
cash movement, and reporting currency without double-counting tax rows as events. The rebuilt
workspace composes shared analytical patterns for a gross-to-net income table and a signed
cash-movement table, carries unknown buckets as explicit unclassified evidence, and distinguishes
booked records from the forward-looking Cashflow workflow.

The slice also removed the unused one-off Income and Activity panels, their test-only exports,
dead chart helpers, and obsolete CSS. Populated visual review exposed a reusable metric-strip
nesting defect when metric cards were wrapped by tooltips; the shared component and its regression
coverage were corrected for every consumer. Cross-screen narrow-navigation and reporting-source
posture findings are tracked separately in #426 and #427.

### Validation record

1. Focused income/activity view-model, workspace, record-header, record-screen, chart-regression,
   and shared metric-strip coverage passed 23 tests; TypeScript, lint, and `git diff --check`
   passed before full-gate execution.
2. The full `make check` retry passed on 2026-07-17: 288 test files and 1,243 tests passed at
   90.79% statement coverage, followed by clean lint, TypeScript validation, and a successful
   production build. The first run's unrelated Intake timeout passed in isolation and on the full
   retry but remained within 329 ms of its five-second limit; testing-quality issue #428 preserves
   that gate fragility rather than hiding it behind a retry.
3. The populated Portfolio Playwright Income flow passed against `PB_SG_GLOBAL_BAL_001`, proving
   gross-to-net income and signed canonical cash movement, including `-25,356.75 USD` classified
   net movement. It passed both the targeted run and the broader 16-test smoke attempt.
4. Governed canonical validation passed Gateway, Portfolio, Performance, and Manage readiness but
   stopped at Report readiness with HTTP 502. Fresh evidence confirms the existing lotus-report
   #140 schema-migration defect. Diagnostic captures are therefore not demo-ready evidence.
5. The full Playwright pack did not certify as a whole: its initial server launch exceeded the
   120-second budget, and a prestarted retry exposed unrelated mobile-locator and Performance
   supportability failures. Issues #429, #430, and #431 preserve those harness gaps; the server was
   stopped explicitly after diagnosis.
6. Implementation PR #432 merged to `main` as
   `178f7c834c1b88aff4e0a241d1457f61430c7e8c`; exact-main Main Releasability run
   `29578068948` passed on that SHA.
7. Durable closure PR #439 merged to `main` as
   `7e49701bb5ed606c42eca4e4b9b454d7601a05b4`; exact-main Main Releasability run
   `29634061621` passed on that SHA. The two feature branches are absent locally and remotely, the
   repository has one Workbench worktree, and no stash carries Income truth.

### Publication decision

No repo wiki change is required for this slice. It corrects and composes an already supported
Income screen without changing a Gateway contract, supported-feature claim, operator command, or
canonical runtime flow. The repository engineering context records the reusable activity-direction
rule; #426 and #427 preserve the cross-screen follow-up work.

## Cashflow Review

### Business job

A client advisor or portfolio manager opens Cashflow Review to understand the expected inflows and
outflows already represented by booked and projected settlement events over a selected 10-, 30-,
or 90-day horizon. The screen supports near-term book review and meeting preparation; it does not
publish an opening or ending cash balance, judge liquidity sufficiency, recommend funding actions,
or create cash events.

The reading order is:

1. selected portfolio, mandate, current cash context, reporting currency, and source as-of date,
2. explicit projection horizon and returned projection period,
3. net projected movement, largest inflow, and largest outflow,
4. projection basis, source note, warnings, and partial-failure posture,
5. cumulative projected movement as a path of expected flows rather than a cash-balance forecast,
6. movement dates in the review table and every returned point in the export.

### Current-product research

Research was reviewed on 2026-07-18 from official product sources:

1. [Addepar Navigator](https://addepar.com/product-overview/navigator): cashflow planning benefits
   from explicit time horizons, portfolio context, and an auditable workflow from assumptions to
   review.
2. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth):
   advisors need connected whole-portfolio context and common language when moving from data to
   portfolio decisions.
3. [BlackRock Aladdin Studio](https://www.blackrock.com/aladdin/platforms/products/aladdin-studio):
   analytical workflows should preserve source context, governed inputs, and reproducible evidence
   instead of hiding lineage behind a visualization.
4. [Morningstar Direct portfolio management](https://www.morningstar.com/business/products/direct/portfolio-management):
   portfolio monitoring should connect summary evidence to underlying holdings and cashflow detail
   without conflating analysis with unsupported action.

These sources inform workflow principles only. Lotus does not copy competitor layout, wording,
visual identity, forecasts, calculations, scenario features, or unsupported capabilities.

### Adopted decisions

1. Use explicit 10-, 30-, and 90-day controls and bind every visible result, state, and export to
   the returned horizon.
2. Replace prior-horizon content with a loading or unavailable state while another horizon is
   requested; never relabel stale figures as current.
3. Preserve Gateway correlation, contract version, warnings, partial failures, source as-of date,
   through-date, currency, and projection basis.
4. Describe the contract as projected cash movement. Cumulative movement is the sum of expected
   flows and is not an opening, available, minimum, or ending cash balance.
5. Show summary-to-exception-to-detail: headline movements, source limitations, chart, then the
   movement schedule.
6. Keep zero-only source results explicit as no projected movement; do not fabricate a partial or
   unavailable liquidity posture.
7. Render movement dates in the review table while keeping every returned source point in the
   export and disclosing the difference.
8. Reuse the Workbench segmented control, analytical module, module-state, dense table, and
   support-reference patterns instead of introducing Cashflow-only interaction conventions.

### Rejected decisions

1. Treating cumulative projected movement as an ending cash balance or liquidity forecast.
2. Showing a requested horizon label while another horizon's data remains visible.
3. Discarding warning, partial-failure, correlation, contract-version, or source-date evidence in
   the browser adapter.
4. Browser-authored liquidity sufficiency, funding capacity, shortfall, transfer, trade, or
   recommendation logic.
5. Unsupported scenario planning, capital-call or distribution classification, goal sufficiency,
   and client-authored future-event booking.
6. A cycle button with an implicit next period, duplicate screen/header KPIs, or an axis/table row
   for every zero point.

### Slice 1 — horizon-safe projected cash-movement review

GitHub issue #440 governs the slice. A focused projected-cashflow view model owns horizon options,
response snapshots, movement shaping, degradation evidence, source facts, result labels, and export
rows. A horizon-keyed hook owns requests and retries without allowing cross-horizon stale display.
The Portfolio API adapter now preserves the full Gateway response envelope instead of returning only
the outlook.

The screen uses the shared segmented control and analytical module patterns, shows source scope and
limitations before the chart, removes the unsupported ending-balance tile, reduces zero-heavy chart
markers, and keeps movement-only table rows distinct from complete export coverage. Record header,
navigation, evidence, Income handoff, and supporting metric language now consistently describe
projected movement rather than liquidity sufficiency.

### Validation record

1. Focused API, view-model, hook-driven module, chart, panel, record-screen, evidence, and adjacent
   Income regression coverage passed 50 tests on 2026-07-18; TypeScript and lint also passed after
   the formatter-noise reconciliation.
2. Full `make check` passed on 2026-07-18: all 290 test files passed at 90.76% statement coverage,
   followed by clean lint, TypeScript validation, and a successful production Next.js build.
3. The targeted Cashflow Playwright smoke passed against the available upstream stack. It proved
   the explicit 10D/30D/90D horizon control, projection-scope evidence, removal of false ending
   balance and liquidity-forecast claims, and correct 30-day result identity after a horizon switch.
4. A governed canonical bring-up remains blocked before full platform certification by the existing
   lotus-core #805 seed-cleanup defect; lotus-core PR #806 owns the fix and is in protected checks.
   The targeted browser result is screen-level implementation proof, not a demo-ready platform
   certification or screenshot claim.
5. Protected Workbench GitHub checks, merge, exact-main releasability, and branch cleanup remain
   pending before the slice can be marked hardened.

### Publication decision

No repo wiki change is required for this slice. It corrects the semantics, evidence preservation,
state handling, and composition of an existing supported Cashflow screen without changing a
Gateway route, supported-feature claim, operator command, or canonical runtime flow. The
repository engineering context records the reusable horizon and movement-semantics boundary.

## Responsive Portfolio Review Navigation

### Business job

An advisor working in a split-screen laptop or tablet layout needs the selected portfolio and
current review destination to remain obvious while the chosen workspace starts immediately. The
complete route catalogue remains important, but it should not precede and displace the task unless
the advisor explicitly opens it.

### Interaction research

Research was reviewed on 2026-07-19 from primary design and accessibility sources:

1. [W3C ARIA APG disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
   requires a button that communicates expanded state and supports native Enter/Space activation.
2. [W3C disclosure navigation example](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)
   keeps ordinary route navigation as semantic links rather than an ARIA menu and documents Escape
   closure with focus restoration as a useful navigation behavior.
3. [Carbon UI shell left-panel guidance](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/)
   treats persistent secondary navigation as a shared product-shell pattern and collapses it when
   the shell becomes narrow.

### Adopted decisions

1. Preserve the dense, persistent Portfolio review rail on desktop.
2. At the existing stacked-shell breakpoint, keep selected portfolio and current business view in
   a compact disclosure before the workspace.
3. Keep one navigation source and semantic links; do not add `menu` / `menuitem` roles.
4. Preserve the active Manage or Performance submode in the compact current-view description.
5. Close on route selection and Escape; restore focus to the disclosure after Escape.
6. Keep the selected workspace heading inside the initial narrow viewport while the disclosure is
   closed.

### Validation record

1. Four focused component tests cover current-view context, `aria-expanded` / `aria-controls`,
   selection closure, Escape focus restoration, and nested mode action behavior.
2. Full `make check` passed 294 test files and 1,311 tests at 90.77% statement coverage, followed by
   clean lint, TypeScript validation, and production build.
3. Production Playwright proof passed at 519 px, 1024 px, and 1366 px. At 519 px, the closed rail
   kept Income & Activity inside the initial 900 px viewport; the route list was hidden until
   requested; Escape restored focus; desktop restored the persistent list.
4. Playwright CLI visual review confirmed a compact selected-view panel and an intentional dense
   on-demand route list. Screenshots remain diagnostic local evidence, not canonical demo proof.

### Publication decision

No wiki source change is required. This is responsive behavior and accessibility hardening of the
existing shared navigation, without a new route, capability, integration, or operator command.

## Report Ordering

### Business job

A client advisor or portfolio manager needs to prepare an approved portfolio review without
leaving the selected portfolio, understand which output is genuinely available, verify the
business date and contents, submit once, and know whether report data is queued, preparing,
complete, or failed. The advisor must not have to understand report-worker, service, endpoint,
archive, or render implementation details.

### Current-product research

The slice used current official wealth-platform references as workflow evidence, not as a visual
template:

1. [Morningstar Advisor Workstation's portfolio-report workflow](https://advisor.morningstar.com/enterprise/ADV_AWE_QSGwithplanning.pdf)
   starts from a selected client and portfolio before choosing a portfolio report. This supports
   portfolio context as the primary ordering scope.
2. [Morningstar Report Portal](https://www.morningstar.com/business/products/direct/report-portal)
   emphasizes firm-approved templates, business-purpose configuration, benchmark selection,
   compliance-aware control, on-demand access, and usage tracking. This supports a governed
   catalogue and request history rather than a free-form document builder.
3. [Temenos Wealth Front Office](https://www.temenos.com/products/wealth-management/wealth-front-office/)
   frames advisor efficiency around clear interactive dashboards, prioritized actions, and
   portfolio workflows. This supports a dense setup-plus-readiness layout instead of a long
   technical operations panel.
4. [Morningstar's aggregate-report workflow](https://advisor.morningstar.com/enterprise/onboarding/AdvisorWorkstationOnboarding4.pdf)
   shows the value of household and multi-portfolio reporting. Lotus should add book, client, and
   multi-portfolio ordering only when Gateway provides governed eligibility and submission
   contracts; the first slice remains truthfully portfolio-scoped.

### Adopted decisions

1. Mount a dedicated `Reports` destination in the portfolio rail so reporting remains within the
   advisor's selected-portfolio workflow.
2. Treat the Gateway catalogue as the authority for report families, sections, ordering modes,
   audience, release posture, and per-format readiness.
3. Use a dense two-column layout: configuration and request history in the main work area, with a
   sticky review/readiness rail for the decision and lifecycle boundary.
4. Require an explicit review before submission and preserve one idempotency intent across safe
   retry after a failed attempt.
5. Keep structured-data and governed-document readiness independent. Show unavailable PDF output
   with business-facing explanation instead of hiding it or offering a false action.
6. Label completed work as `Report data complete`; archive and client delivery remain visibly
   separate states.
7. Present evidence created by advisory or portfolio-management workflows as workflow-generated,
   not as directly orderable report families.
8. Keep source identifiers inside support disclosures and keep metrics free of portfolio, client,
   report-job, and idempotency identifiers.
9. Preserve a single-column tablet/mobile fallback, keyboard focus, and reduced-motion behavior.

### Rejected decisions

1. Do not expose report-batch materialization, report-worker run-once, capacity, runtime-load, or
   archive-lookup controls to advisors.
2. Do not call `lotus-report`, `lotus-render`, or `lotus-archive` directly.
3. Do not imply that report-data completion means PDF creation, archive, approval, client delivery,
   or client communication.
4. Do not make technical reason codes, service names, endpoint paths, batch ids, or job ids the
   primary language of the screen.
5. Do not add book, client, household, multi-portfolio, scheduled, or bulk ordering controls until
   Gateway publishes supported eligibility and submission behavior for those scopes.
6. Do not construct or store client-ready material in the browser.

### Slice 1 — governed portfolio report request

Issues #449 and #458 add the `/reports` route, reusable report-ordering module, strict source
contracts, Gateway-only client, BFF-owned development authority, business configuration model,
reviewed idempotent submission, recent request history, lifecycle boundary, responsive layout,
and intentional loading, permission, error, empty, blocked, partial, ready, submitting, accepted,
and retry states. The slice also retires the unreachable technical batch panel and obsolete public
browser worker API.

### Validation record

1. Focused contract, BFF, view-model, hook, component, route, API, observability, compatibility,
   and canonical-harness tests pass.
2. Full `make check` passed on 2026-07-18: 293 test files and 1,307 tests passed at 90.76%
   statement coverage, followed by clean lint, TypeScript validation, and production build.
3. Live Gateway catalogue preflight for `PB_SG_GLOBAL_BAL_001` returned eligible portfolio scope,
   the single-portfolio ordering mode, and ready structured-data output while truthfully retaining
   unavailable governed PDF output.
4. The first complete live submission exposed issue #459: Workbench placed unpublished
   `source_surface` provenance in business `options`, and Report correctly rejected it with
   `unsupported_report_configuration`. After removing that key, the same governed request returned
   `202 data_ready`; bounded recent-request history returned `200` and included the accepted job.
5. Canonical portfolio seeding subsequently reached Core analytics, Report, and Gateway return-path
   currentness through `2026-04-10`. Full platform validation then stopped when the governed DPM
   seed hit the existing platform #553 Manage refresh `403`. Platform #582 separately owns central
   Report Centre panel registration. No demo-ready screenshot claim is made until both dependencies
   are resolved and canonical validation passes.

### Publication decision

Repo wiki source changes are required because the supported reporting route, integration boundary,
and unsupported operator controls changed. Publish `wiki/` only after the implementation reaches
`main`, then run strict parity verification.

### Slice 2 — consistent Report Centre readiness

Issue #482 hardens the existing Report Centre so its setup workspace and readiness rail express one
business state. The slice does not add a report family, ordering scope, delivery channel, or source
contract.

#### Interaction research

Research was reviewed on 2026-07-19 against the implemented Gateway catalogue and ordering flow:

1. [Carbon loading guidance](https://carbondesignsystem.com/components/loading/usage/) says loading
   feedback should explain the activity in progress and should not remain after the activity ends.
   The Report Centre therefore derives both visible regions from the same catalogue state.
2. [Carbon status-indicator guidance](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
   recommends consistent, concise labels and restrained semantic color. The readiness rail now uses
   business statuses such as `Restricted`, `Unavailable`, `Accepted`, and `Not accepted` instead of
   interpreting component-local booleans.
3. [Carbon empty-state guidance](https://carbondesignsystem.com/patterns/empty-states-pattern/)
   separates unavailable resources from first-use or no-result states and recommends a useful next
   action only when one exists. Source failures and access restrictions retain a real catalogue
   retry; a genuinely empty approved catalogue does not expose a dead-end ordering action.
4. [SAP Report Center tools](https://help.sap.com/docs/successfactors-platform/report-center/report-center-tools)
   and [report scheduling guidance](https://help.sap.com/docs/SAP_SUCCESSFACTORS_PLATFORM/6ca0eee0540248b2b3ba91eaa1f18423/a1e6de81a25e40f183c35e0f5aaa034c.html)
   distinguish report creation, execution, scheduling, and distribution as separate workflow
   capabilities. Lotus therefore keeps request acceptance separate from archive and client release,
   and does not imply unsupported scheduling or distribution.
5. [WCAG status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
   requires important changes to be programmatically determinable without moving focus. Readiness
   changes use a polite status region, submission rejection uses an alert, and the region excludes
   interactive controls to avoid verbose or repeated announcements.

#### Adopted decisions

1. Build one pure, typed screen-state projection from catalogue, configuration, review, and
   submission truth, and make both the workspace and readiness rail consume it.
2. Make loading, permission restriction, source failure, and an empty approved catalogue terminal
   across both regions; hide request summaries and review or submit actions in those states.
3. Retain a real source retry for catalogue failure or restriction and prove that it issues another
   catalogue request.
4. Preserve workflow-managed report evidence even when no directly orderable report family exists;
   only show the empty state when neither kind is available.
5. Keep a reviewed configuration after submission rejection and offer an explicit
   `Retry Report Request` action; disable review and submit actions while submission is active.
6. Treat request acceptance as an end state for the ordering action while continuing to state that
   report data, archive, client delivery, and communication are separate.

#### Rejected decisions

1. Do not present a progress stepper that implies archive, document creation, approval, or client
   delivery stages unsupported by the current contract.
2. Do not use generic labels such as `Review` when the source truth is restricted, unavailable,
   empty, submitting, or accepted.
3. Do not remove the dense readiness rail; it remains the decision summary and client-use boundary
   for a valid configuration.
4. Do not add recipients, email, download, scheduling, bulk ordering, or client-delivery controls
   without Gateway-backed eligibility and commands.
5. Do not display raw source reason codes or technical service states as the primary status.

#### Validation and publication decision

1. Thirty-six focused projection, workspace, workflow, and view-model tests pass, including
   loading, permission, failure and real retry, empty, workflow-managed-only, reviewed, submitting,
   accepted, and not-accepted behavior.
2. Lint and TypeScript validation pass. Full repository, responsive production-browser, protected
   CI, and exact-main evidence remain required before issue closure.
3. No wiki source change is required: this slice corrects state consistency and accessibility for
   the already documented portfolio-scoped reporting capability without changing routes,
   integrations, supported report families, operator commands, or lifecycle boundaries. Repository
   context and review-ledger evidence carry the reusable implementation rule.
4. No Lotus skill change is required. Existing frontend governance already requires aggregate and
   detail state integrity, honest recovery, accessibility, and source-backed controls; the
   deterministic prevention belongs in the repository projection, tests, and local context.

### Slice 3 — bank-buyable portfolio context and Report Centre composition

Issue #490 treats the shared portfolio rail and Report Centre composition as one advisor-workflow
problem. The objective is a quiet, high-trust workstation: ink-navy navigation, restrained warm-gold
selection and action emphasis, a white analytical canvas, compact typography, and dividers before
nested cards. The slice changes presentation and responsive composition only; portfolio identity,
own-book membership, report eligibility, lifecycle state, and client-use boundaries remain
source-backed.

#### Interaction and market research

Research was reviewed on 2026-07-19 against the shared shell and populated Report Centre states:

1. [Carbon global-header guidance](https://carbondesignsystem.com/patterns/global-header/) treats
   global and local navigation as stable shell responsibilities and collapses them deliberately at
   constrained widths. Lotus therefore keeps one semantic route source and one compact disclosure
   instead of rendering a second mobile navigation model.
2. [Carbon 2x grid guidance](https://carbondesignsystem.com/elements/2x-grid/usage/) uses a consistent
   spacing rhythm and explicit breakpoints to preserve hierarchy. Lotus sets measurable rail-height
   and overflow budgets at 768 and 519 px rather than relying on subjective screenshots alone.
3. [Temenos Wealth Front Office](https://www.temenos.com/products/wealth-management/wealth-front-office/)
   positions wealth work around a unified front-office view and advisor workflow. Lotus keeps
   portfolio context, workflow identity, current view, request readiness, and client-use boundary
   together while separating them from unsupported report delivery or operational controls.
4. [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
   requires at least 4.5:1 for normal text. The production-browser proof computes the inactive rail
   label contrast against the rendered rail instead of assuming token intent equals rendered output.

#### Adopted decisions

1. Make the application shell—not `.portfolio-page`—the authoritative dark-rail theme scope so every
   consumer receives the same readable foreground, active state, hover, and focus treatment.
2. Keep portfolio switching, own-book navigation, workflow identifier, and current view together in
   one responsive header; use concise visible labels at constrained widths while retaining complete
   accessible names.
3. Remove generic panel inset from the rail because the shared component already owns header and
   navigation spacing. Do not pay two padding budgets for one hierarchy.
4. Consolidate Report Centre readiness and the client-use boundary into one decision panel, and use
   dividers for lifecycle controls rather than four miniature cards.
5. Give terminal Report Centre states a deliberate analytical-canvas treatment with a restrained
   state accent instead of leaving a visually empty main column.
6. Prove desktop recovery, compact empty, tablet restricted, and mobile ready states through the
   optimized production build, including keyboard disclosure closure, focus restoration, horizontal
   overflow, strict compact-height budgets, and computed contrast.

#### Rejected decisions

1. Do not add gradients, glass effects, oversized marketing typography, decorative dashboards, or
   novelty interaction patterns to a daily private-banking workstation.
2. Do not hide portfolio identity, own-book access, readiness, or client-use boundaries merely to
   meet a compact-height target.
3. Do not weaken viewport assertions when a screenshot exposes collision, duplicate inset, or
   hierarchy failure.
4. Do not paste generated Stitch, Figma, or other design-tool code into the product. External tools
   may inform composition; repository components, source contracts, tests, and accessibility remain
   authoritative.
5. Do not bulk-split the global stylesheet in this visual slice. Issue #492 owns incremental CSS
   architecture with representative visual-regression proof.

#### Validation record

1. The optimized production build passed the four-state browser matrix at 1440, 1024, 768, and
   519 px. Recovery, empty, restricted, and ready states remained coherent and action-safe.
2. The browser gate proves at least 4.5:1 rendered contrast for inactive rail text and the portfolio
   switch action, no document-level horizontal overflow, a fully stacked 1024 px shell, a rail below
   100 px at 1024/768, and a mobile rail below 150 px.
3. The mobile disclosure opens by keyboard, closes on Escape, returns focus, and leaves the
   portfolio-context control within its allocated width.
4. Visual review rejected intermediate captures despite partial test success: the 1024 px shell kept
   desktop width caps after stacking, the desktop switcher looked disabled, and the first 519 px
   arrangement collided. The final captures correct those failures rather than weakening budgets.
5. Focused shared-rail, Performance integration, Report Centre state/workflow, addressing, and
   harness proof passed 108 tests; lint, TypeScript, and the 25-route production build passed.

#### Publication decision

No wiki source change is required. This slice corrects shared visual hierarchy, responsive behavior,
and accessibility for already documented routes and capabilities; it changes no supported feature,
integration, source contract, operator command, or runbook. Repository context and both review
ledgers carry the reusable design and implementation rule.

## Portfolio Reporting Source Posture

### Business job

A client advisor or operations user reviewing Portfolio records needs to know whether the current
book can support reporting and whether an actual reporting snapshot exists. Source preparation and
generated client-reporting output are related, but they are not the same business fact.

### Source-contract research

Research was reviewed on 2026-07-19 against the authoritative Gateway contract and implementation:

1. `PortfolioReportingReadiness.status` is explicitly a reporting-readiness posture.
2. Gateway's `build_reporting_readiness` prefers the upstream source-readiness bucket and otherwise
   derives `READY` from non-empty position coverage or `EMPTY` from no positions.
3. Gateway currently supplies workspace position coverage as `row_count`.
4. `generated_at_utc` is optional and explicitly describes the most recent reporting-output
   generation. The current readiness builder does not synthesize it.

The populated `READY`, 11 rows, and no generation timestamp combination therefore means the
reportable book is ready while the reporting snapshot has not been generated. Gateway is not
claiming that a document or snapshot exists; the prior Workbench presentation collapsed those
facts.

### Adopted decisions

1. Derive the reporting source label, explanation, badge, and tone from one typed posture.
2. Reserve `Generated` and the success tone for a ready/complete source with a real generation
   timestamp and non-empty output coverage.
3. Present ready source data without a timestamp as `Reportable book ready` and `Not generated`.
4. Preserve a last-generation date for pending, stale, failed, or unavailable current posture
   without calling the retained output current.
5. Fail unknown source statuses closed as unavailable business posture rather than displaying a
   raw technical value.
6. Apply the same pure builder to Allocation, Positions, Transactions, Income & Activity, and
   Cashflow evidence rails.

### Rejected decisions

1. Do not rename Gateway `READY`; it is valid source-readiness truth.
2. Do not treat non-zero `row_count` as proof that reporting output was generated.
3. Do not place a generated/ready snapshot badge beside a missing generation timestamp.
4. Do not invent stale-age thresholds because this contract publishes no governed freshness policy.
5. Do not add a one-off correction to Income & Activity; the evidence rail is a shared Portfolio
   pattern.

### Validation record

1. A focused matrix covers generated, source-ready, partial, pending with retained generation,
   empty, stale, failed, unavailable, and unknown fail-closed states.
2. A cross-screen regression proves the same source-ready posture on all five Portfolio record
   screens, and a rendered component regression proves that raw `READY` no longer appears on the
   Reporting Snapshot item.
3. Eighteen focused tests passed; full `make check` then passed 294 files and 1,323 tests at 90.83%
   statement coverage, followed by clean lint, TypeScript validation, and production build.
4. Production browser proof at 1440 x 1000 against a bounded diagnostic Gateway fixture rendered
   `Reportable book ready`, `11 reportable rows available; a reporting snapshot has not been
   generated`, and `Not generated`. The local artifact is
   `output/playwright/diagnostic-reporting-posture-427.png`.
5. The browser artifact is diagnostic, not demo-ready. Populated canonical certification remains
   blocked by the existing platform #553 Manage seed-authority defect.

### Publication decision

No wiki source change is required. This slice corrects the interpretation of an existing Portfolio
evidence field without adding a route, integration, supported capability, or operator command. The
repository context and review ledger carry the reusable source-versus-output rule.

## Advisor Cockpit Business Readiness

### Business job

Before a client discussion, an advisor needs to know whether the evidence required for internal
preparation is available and which client-use boundaries remain. Service identity, RFC proof,
data-product posture, and order-management acronyms are useful support evidence, but they do not
answer those primary business questions.

### Product and source-contract research

Research was reviewed on 2026-07-18 against official product guidance and the current Gateway
contract:

1. [IBM Carbon's status-indicator pattern](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
   requires contextual, descriptive status labels, text in addition to color, an explicit unknown
   state, and the highest-attention posture when underlying states are consolidated.
2. [IBM Carbon's progress-indicator content guidance](https://carbondesignsystem.com/components/progress-indicator/usage/)
   keeps primary labels concise and uses supporting text for additional context.
3. [Salesforce's financial-advisor meeting-preparation guidance](https://help.salesforce.com/s/articleView?id=ind.fsc_agents_finserv_fin_advisor_asst_topic_meeting_prep.htm&language=en_US&type=5)
   centers the advisor job on client context, portfolio evidence, goals, life events, and actionable
   gaps rather than platform implementation identifiers.
4. [Salesforce's advisor-assistance release guidance](https://help.salesforce.com/s/articleView?id=release-notes.rn_einstein_copilot_standard_actions.htm&language=en_US&release=258&type=5)
   includes identifying missing or unavailable information so preparation remains complete and
   honest.
5. Gateway currently publishes four canonical positive proof strings and the exact
   `BLOCKED` client-publication posture, but transports readiness and unsupported capabilities as
   open strings rather than a bounded presentation enum.

### Adopted decisions

1. Answer readiness questions with concise business values: `Available`, `Blocked`, and
   `Not reported` in this source-backed slice.
2. Map only exact values proven for the matching readiness category. Do not infer meaning through
   formatting, substring matching, or a value that belongs to another category.
3. Treat null, unknown, and cross-field values as neutral `Not reported`; they must never become a
   positive posture.
4. Pair every status with category-specific helper text and use color only as a secondary cue.
5. Translate source-owned unsupported capabilities into business operating boundaries such as
   `Client communication unavailable` and `Order workflow unavailable`.
6. Preserve exact source codes in a collapsed `Support details` disclosure for support and audit
   use.
7. Keep action status and priority presentation separate because those fields use different,
   bounded contracts.

### Rejected decisions

1. Do not display `Advise`, `Gateway`, RFC identity, data-product vocabulary, `OMS`, or
   `supportability` in the primary advisor scan path.
2. Do not discard raw source values or replace them with unsupported business claims.
3. Do not show a green summary when any required contributing source is blocked, unavailable, or
   unknown.
4. Do not label ordinary readiness evidence as AI-generated. AI provenance is instance-specific
   and requires an explicit source signal.
5. Do not expand this slice into meeting agendas, advice generation, policy approval, client
   communication, order entry, or execution authority.

### Validation record

1. Presenter tests cover every known category/value pair plus null, unknown, and cross-field
   fail-closed cases.
2. View-model and component tests prove that business statuses and operating boundaries remain in
   the primary scan path while raw values stay hidden until `Support details` is opened.
3. An unknown-source component regression proves five neutral statuses and retains the raw evidence
   only inside the disclosure.
4. Forty-six focused presenter, view-model, navigation, component, and live-workflow tests passed.
5. Exact-head `make check` passed 295 test files and 1,338 tests at 90.84% statement coverage,
   followed by clean lint, TypeScript validation, and production build.
6. A dedicated production Playwright regression passed against a bounded diagnostic fixture. The
   collapsed-primary and expanded-support-detail screenshots prove that technical values are hidden
   from the primary scan path and retained on demand. Visual review also found and removed the last
   `Gateway-backed`, `supportability`, and `source evidence` language from the two cockpit headers.
7. Populated canonical browser certification remains blocked by the existing platform #553
   Manage seed-authority defect; no demo-ready visual claim is made.

### Publication decision

No wiki source change is required. This slice improves the presentation of an existing supported
Advisor Cockpit contract without changing route ownership, source capability, operator commands,
or integration boundaries. Technical capability truth remains correctly documented in the wiki.

## Advisor Own-Book Coverage And Portfolio Context Switching

### Business job

A relationship manager needs to begin from the portfolios actually assigned to their supported
book scope, narrow the list by a known client or mandate, and move between portfolio workflows
without losing the task in progress. The surface must distinguish own-book membership from team,
delegated, supervisor, household, AUM, and attention concepts that the current source does not
publish.

### Current-product research

Research was reviewed on 2026-07-18 from official product sources:

1. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   connects whole-portfolio insight, advisor workflow, nudges, and business oversight while keeping
   their source and use distinct.
2. [BlackRock householding](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/insights/householding)
   distinguishes account, grouped-account, and total-household context; Lotus therefore labels only
   the own-book scope its source contract confirms.
3. [Morningstar client dashboard](https://www.morningstar.com/business/insights/blog/das-client-dashboard)
   starts from client/group context and continues into account, portfolio, and reporting work,
   supporting a scope-to-record-to-task navigation model.

These sources inform workflow principles only. Lotus does not copy competitor layout, visual
identity, wording, household models, scoring, nudges, or unsupported capabilities.

### Adopted decisions

1. Add one dedicated **My book** landing route over Gateway own-book membership rather than
   relabelling the global portfolio catalogue.
2. Present source scope, date, booking centre, paging, assignment basis, tenant posture,
   limitations, and support evidence explicitly.
3. Use exact client and mandate filters plus deterministic source sorting only where Gateway
   supports them.
4. Reuse a source-backed portfolio context switcher across portfolio workflows and retain the
   current business route and supported query state.
5. Load own-book choices only when the advisor opens portfolio context, avoiding a hidden book
   query on every portfolio screen while keeping the native disclosure keyboard-operable.
6. Restore keyboard focus after switching and collapse filter state that does not belong in the
   destination portfolio workflow.
7. Keep primary language business-facing while retaining source codes and request references in
   support details.
8. Fail closed for permission, contract drift, source unavailability, and unconfirmed current
   portfolio membership; never substitute a global list.

### Rejected decisions

1. Browser-created advisor ownership, team, delegate, supervisor, or household relationships.
2. Locally aggregated book/client AUM, attention ranking, favourites, or recent-client claims.
3. Hard-coded browser authority or acceptance of actor, role, scope, or capability request headers.
4. A permanently expanded long rail or a cosmetic selector over the flat portfolio catalogue.
5. Treating legacy advisor projection or trusted-context tenant scope as governed relationship-role
   or tenant-isolation certification.

### Validation record

Issue #450 governs the slice. Focused contract, API, BFF authority, navigation, view-model, hook,
component, route, degraded-state, keyboard-focus, and responsive browser tests are green. The
production Playwright pack proves desktop and effective 200-percent-zoom widths, keyboard filter
flow, portfolio handoff, and no global-catalogue fallback. Canonical validation now includes the
Gateway advisor-book preflight and `advisor.book_overview` screenshot workflow; demo-ready capture
remains pending governed lotus-platform registry publication. Exact-head `make check` passed on
2026-07-18 with 300 test files, 1,361 tests, 90.86% statement coverage, lint, TypeScript, and the
optimized 25-route production build. The full-gate regression also proves that shared Portfolio and
Performance screens neither require additional router mocks nor load advisor-book data until the
portfolio-context disclosure is opened.

### Publication decision

Wiki truth changes because `/book`, its authority boundary, its supported business workflow, and
its deliberate no-claim scope are new operator-facing product behavior. The repo-authored wiki adds
an Advisor Book Workflow and updates Supported Features, API Surface, Home, and navigation.

## Shell Workspace Availability Language

### Business job

A private banker needs the main workspace navigation to explain why a destination cannot be used
without exposing service names, feature flags, lifecycle codes, or fallback implementation state.
The explanation must remain honest when Workbench does not recognize a future source reason.

### Source-contract inventory

Read-only review on 2026-07-18 found four bounded reason families:

1. Gateway workspace state publishes exact disabled reasons for Portfolio, Performance, Risk,
   Proposal, and Advisory.
2. Gateway publishes exact unavailable or unknown reasons for the Core, Performance, Risk, and
   Advise workspace dependencies.
3. Advise publishes `advisory_ready`, `dependency_degraded`, or `lifecycle_disabled`; the Gateway
   contract seam also covers `policy_review_required`.
4. Workbench fallback descriptors publish exact `disabled_in_fallback` reasons. These are not
   evidence that a capability is disabled; they mean source availability cannot be confirmed.

### Current-product research

1. [Carbon status-indicator guidance](https://carbondesignsystem.com/patterns/status-indicator-pattern/)
   treats the descriptive text label as essential, distinguishes disabled from unknown, and warns
   against relying on color or shape alone.
2. [W3C keyboard-interface guidance](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)
   permits `aria-disabled` when an unavailable destination must remain discoverable and calls for
   consistent focus behavior across the navigation pattern.

These sources guide content and accessibility semantics only. Lotus retains its existing visual
system and Gateway-owned capability authority.

### Adopted decisions

1. Map only the exact governed source inventory into business postures; do not format open strings.
2. Distinguish a workspace that is not enabled from one whose required information is temporarily
   unavailable, one awaiting business review, and one whose availability is unconfirmed.
3. Fail closed to `availability could not be confirmed` for unknown, missing, fallback, or
   internally inconsistent reason values.
4. Keep disabled destinations discoverable through the shared navigation primitive and retain
   source reason codes in the Gateway contract rather than the primary banker-facing title.

### Rejected decisions

1. Replacing underscores, lowercasing arbitrary source codes, or matching reason keywords.
2. Translating unavailable or unknown information into entitlement, permission, or service-outage
   claims that the source does not make.
3. Page-specific title patches or removal of disabled destinations solely to hide weak copy.

### Validation record

Issue #454 governs the slice. Twelve focused presenter and shared-navigation tests pass across
known configuration, unavailable-information, review-required, fallback, missing, and unknown-code
states. TypeScript and lint pass. Production browser proof verifies that a fallback-disabled
Proposal destination exposes neutral business copy and no raw `disabled_in_fallback` title.
Exact-head `make check` passed on 2026-07-18 with 300 test files, 1,369 tests, 90.87% statement
coverage, lint, TypeScript, and the optimized 25-route production build.

### Publication decision

No wiki source change is required. The wiki already states that shell navigation follows the
Gateway capability contract; this slice corrects primary navigation language without changing a
route, capability, authority boundary, or operator workflow. The reusable rule is durable in this
research ledger, the codebase review ledger, and repository engineering context.

## Truthful Shell Utilities And Private-Banking Product Context

### Business job

A private banker needs the global shell to provide stable product orientation and only actions that
can complete a supported task. Search, notifications, and banker identity are trusted capability
surfaces: presenting them without source truth encourages sensitive input, false unread urgency,
and mistaken authenticated context.

### Source-contract audit

Read-only review on 2026-07-18 confirmed:

1. Workbench had no search form, query handler, result model, entitlement scope, privacy treatment,
   keyboard result navigation, or task-preserving handoff behind the global search input.
2. No source-owned notification list, unread count, acknowledgement contract, or notification action
   backed the bell and red dot.
3. Gateway caller headers support bounded upstream authorization but do not publish an authenticated
   banker-session display contract or account-menu commands.
4. Workbench #436 and platform #563 already govern the missing authenticated BFF principal/session
   contract. Local development authority is deliberately not a display identity.

### Current-product research

1. [W3C button guidance](https://www.w3.org/WAI/ARIA/apg/patterns/button/) defines a button as a
   control that triggers an action or event and requires an unavailable action to expose disabled
   state rather than behaving as an active no-op.
2. [W3C menu-button guidance](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) requires the
   trigger to open a menu with explicit popup and expanded state plus keyboard focus behavior.
3. [W3C combobox guidance](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) defines the popup,
   value, suggestion, selection, and keyboard contract required for an interactive search selector.

### Adopted decisions

1. Remove unbacked enabled controls immediately instead of preserving decorative alignment.
2. Keep the existing Lotus brand and add concise, non-interactive `Private Banking Workbench`
   product context in the same lockup.
3. Remove dead icon helpers, control styles, unread treatment, identity styles, and obsolete
   responsive overrides in the same reusable shell slice.
4. Prove absence of search, notifications, unread posture, person name, initials, role, and
   menu-shaped banker controls at unit and production-browser levels.

### Rejected decisions

1. Hard-coded or deployment-configured banker display identity.
2. A disabled search field, notification bell, or profile button retained only to make the header
   look feature-rich.
3. Browser-local client/account/proposal search, fake unread counts, or an account menu without
   authenticated source commands.
4. Treating advisor-book membership as banker identity; `/book` owns portfolio assignment scope.

### Validation record

Issue #451 governs the slice. Thirty-nine focused shell, navigation, and design-system tests pass
with TypeScript and lint. Production browser coverage verifies the product context at desktop and
tablet width and proves the search field, notification action, and hard-coded banker identity are
absent. Exact-head `make check` passed on 2026-07-18 with 300 test files, 1,369 tests, 90.85%
statement coverage, lint, TypeScript, and the optimized 25-route production build.

### Publication decision

No wiki source change is required. Published wiki truth does not claim global search, notifications,
or banker-profile support, and the supported routes and authority boundaries are unchanged. The
product-context and false-affordance rule is durable in this research ledger, the codebase review
ledger, and repository engineering context.

## Deterministic Portfolio Page Identity In Browser Proof

### Validation job

The narrow-layout browser gate must prove that the intended Portfolio page is ready before measuring
horizontal overflow. Its page identity cannot change when a source-backed decision headline happens
to repeat part of the page title, or when source unavailability selects a governed degraded state.

### Current-practice research

The official [Playwright locator guidance](https://playwright.dev/docs/locators) recommends
user-facing role locators with a sufficiently precise accessible name. It documents strict locator
behavior, exact name matching, heading-level constraints, and warns against positional selectors
such as `first()` or `nth()` when a unique semantic contract can identify the intended element.

### Adopted decisions

1. Identify the ready Portfolio page by heading role, exact accessible name, and level one.
2. Keep source-unavailable branches explicit through a bounded set of exact business headings.
3. Reuse named page-identity helpers across the foundation and responsive journeys.
4. Prove strict uniqueness in a browser DOM containing both `Portfolio Review` and the adjacent
   `Portfolio review is ready` decision heading.
5. Measure responsive overflow only after the relevant ready or unavailable identity is visible.

### Rejected decisions

1. Substring heading matches whose result changes with adjacent business copy.
2. `.first()`, `.last()`, or `.nth()` as a way to suppress strict-mode ambiguity.
3. CSS structure, test-only identifiers, retries, or longer timeouts for a semantic identity defect.
4. Removing the degraded-state branch or requiring a live Gateway merely to validate layout.

### Validation record

Issue #430 governs the slice. Lint, TypeScript, and diff hygiene pass. The focused production-browser
run proved the two-heading ready state and the three-route 390 px overflow journey in 7.4 seconds.
The current source-down path rendered the governed `Portfolio context unavailable` identity, all
responsive assertions passed, and launcher cleanup left no listener on port 3000.

### Publication decision

No wiki source change is required. This slice changes browser-test selection semantics, not a
supported product route, business capability, operator command, or published source boundary. The
reusable locator rule is durable in this research ledger and the codebase review ledger.

## Supportability-Aware And Independent Performance Browser Proof

### Validation job

A private-banking Performance screen must remain correct when the source contract is complete,
partial, or unavailable. Browser proof must distinguish UI correctness from source readiness,
retain strong metric and geometry checks when their governed precondition is satisfied, and keep
Analysis, Contribution, and Evidence journeys independently diagnosable.

### Source-contract audit

Read-only review on 2026-07-18 confirmed:

1. the split Performance summary contract publishes exact module capability states and source-owned
   economics before optional detail rows are rendered,
2. return history, horizon comparison, contributor ranking, and evidence can be unavailable while
   the overall Performance workspace remains a truthful supported page,
3. the existing test inferred readiness from page visibility and optional row timing,
4. file-level serial mode skipped every later journey after the first summary failure, and
5. existing pure fixture builders already represented populated and source-limited contracts but
   were not available through a real production-browser/BFF path.

### Current-practice research

1. Official [Playwright isolation guidance](https://playwright.dev/docs/browser-contexts) recommends
   a clean browser context per test so failures and local state do not carry into later journeys.
2. Official [Playwright retry and serial-mode guidance](https://playwright.dev/docs/test-retries)
   states that later tests in a serial group are skipped after a failure and recommends isolated
   tests where possible.
3. Official [Playwright fixture guidance](https://playwright.dev/docs/test-fixtures) treats setup
   and teardown as explicit lifecycle boundaries and keeps each test supplied only with the
   environment it requires.

### Adopted decisions

1. Read the exact summary capability/economic contract using the same explicit selection as the
   browser page and fail closed when capabilities are absent.
2. Assert complete metrics and geometry only when supported modules and required economics satisfy
   the populated precondition.
3. Assert exact unavailable metric, return, horizon, contributor, and evidence behavior when the
   source contract supplies that posture.
4. Run the file in default independent mode: one governed fixture Gateway lifecycle and a fresh
   browser context for every scenario, without serial skip propagation.
5. Reuse the existing Performance contract builders behind an opt-in loopback fixture Gateway;
   route the production Next server through canonical `gateway.dev.lotus` addressing.
6. Publish populated and unavailable repo-native commands with direct child-process ownership,
   bounded ports, signal forwarding, and fail-closed scenario validation.

### Rejected decisions

1. Waiting for optional cash tiles, horizon rows, or contributor rows to infer source readiness.
2. Weakening populated geometry checks so an unavailable contract happens to pass.
3. Treating a truthful unavailable source state as a page failure or requiring a live Gateway for
   deterministic component-layout proof.
4. Serial mode, shared browser pages, positional selectors, retries, or longer timeouts as a remedy
   for contract-state ambiguity.
5. Using fixture responses to certify live upstream Server-Timing propagation.
6. Adding fixture routes, mock switches, or test-only payloads to production application code.

### Validation record

Issue #431 governs the slice. Six focused classifier/launcher unit tests, lint, TypeScript, launcher
syntax, invalid-input rejection, and diff hygiene pass. The repo-native populated command passed five
executed browser journeys with one explicit live-only timing skip in 14.4 seconds. The unavailable
command passed four executed journeys with live-timing and populated-layout preconditions explicitly
skipped in 13.3 seconds. Both scenarios exercised the production Workbench/BFF path and left the
fixture and smoke-server ports clear.

### Publication decision

Wiki source changes are required because two new repository-native operator commands and their
evidence boundaries are now part of the validation workflow. Publish `wiki/Validation-and-CI.md`
after merge, then run strict wiki parity verification.

## Secure Chart Runtime And Dependency Gates

### Validation job

Workbench charts carry investment outcomes, benchmark comparisons, and attribution evidence. The
browser runtime must not retain a known script-injection path, and the engineering toolchain must
not normalize critical or high advisories. A major chart-library upgrade must also preserve the
intentionally dense Workbench visual system rather than silently adopting new defaults.

### Current-practice research

1. The [GitHub-reviewed Apache ECharts advisory](https://github.com/advisories/GHSA-fgmj-fm8m-jvvx)
   identifies a cross-site scripting exposure in ECharts versions before 6.1.0.
2. The official [Apache ECharts 6 upgrade guide](https://echarts.apache.org/handbook/en/basics/release-note/v6-upgrade-guide/)
   says most APIs remain compatible, but the default theme, legend placement, component sizing,
   axis overflow handling, and label inheritance can change. It publishes the `v5` compatibility
   theme for controlled migration.
3. The [GitHub-reviewed Vitest advisory](https://github.com/advisories/GHSA-5xrq-8626-4rwp)
   identifies arbitrary file read and execution before Vitest 3.2.6 when its UI server is exposed.
4. Registry metadata confirms echarts-for-react 3.0.6 accepts ECharts 6, and Vitest plus its V8
   coverage provider publish matching 3.2.7 versions for a bounded patch upgrade.

### Adopted decisions

1. Upgrade ECharts to the first advisory-safe 6.1.0 release and echarts-for-react to 3.0.6.
2. Centralize ECharts rendering in the design system and apply the documented `v5` compatibility
   theme so the security migration does not become an accidental chart redesign.
3. Upgrade Vitest and coverage together to 3.2.7 and allow their compatible dependency ranges to
   resolve patched Vite and esbuild versions.
4. Resolve the remaining js-yaml advisory within its existing compatible range.
5. Enforce two thresholds: no high/critical advisory anywhere in the installed graph, and no
   moderate-or-higher advisory in browser-delivered production dependencies.
6. Run the same policy through `make check`, Feature Lane, PR Merge Gate, and Main Releasability.
7. Treat dependency maturity as a bank-readiness control: prefer established, stable, widely
   understood technology and reject beta, experimental, novelty-driven, or latest-major adoption by
   default. ECharts 6.1.0 is accepted here only because no ECharts 5 release fixes the advisory; its
   new visual features remain unused behind the v5 compatibility boundary.

### Rejected decisions

1. `npm audit fix --force`, an unbounded latest-major toolchain migration, or an unexplained lockfile
   rewrite.
2. Shipping the known production XSS finding because it was classified as moderate.
3. Upgrading ECharts while accepting its new default theme without visual review.
4. A CI-only scanner that developers cannot run through the repository-native command contract.
5. Silent or permanent advisory exceptions without an owner, expiry, and GitHub issue.
6. Technology modernization whose primary justification is novelty, ecosystem fashion, or version
   recency rather than security, supportability, or a proven business requirement.

### Rollback and validation posture

If chart behavior regresses, retain ECharts 6.1.0 and correct the shared compatibility wrapper or
explicit chart options; do not roll back to the vulnerable ECharts 5 line. A deliberate future move
to the ECharts 6 visual theme belongs to a separate design-system issue with baseline screenshots.
Issue #456 owns focused chart contracts, browser proof, accessibility checks, the full repository
gate, Docker proof, protected CI, and exact-main validation.

### Publication decision

Wiki source changes are required because the repository-native and protected dependency-security
policy is operator-facing validation truth. Publish `wiki/Validation-and-CI.md` after merge, then
run strict wiki parity verification.

## Immutable Enterprise Container Runtime And Image Evidence

### Validation job

The production Workbench image must be reproducible, supported, minimally privileged, and auditable.
A green application build does not prove the identity or vulnerability posture of its operating
system, Node runtime, installed production packages, or scanner itself.

### Current-practice research

1. The official [Node release schedule](https://github.com/nodejs/Release) classifies Node 22 as
   Maintenance LTS through 2027-04-30. Maintenance LTS receives critical fixes and security updates;
   Node 26 remains Current and is not selected for this production line.
2. The official [Node Docker image guidance](https://github.com/nodejs/docker-node) documents Debian
   slim as the minimal glibc variant. It says Alpine uses musl, classifies amd64 musl builds as
   experimental, and says other musl architectures are not tested before release.
3. Official [Next 15 output guidance](https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output)
   documents stable output-file tracing and `output: 'standalone'` as the way to deploy only required
   runtime files and selected dependencies through its generated minimal `server.js`.
4. Registry inspection resolved official `node:22.23.1-bookworm-slim` to multi-platform digest
   `sha256:6c74791e557ce11fc957704f6d4fe134a7bc8d6f5ca4403205b2966bd488f6b3`.
5. Aqua Security advisory [GHSA-69fq-xp46-6x23](https://github.com/aquasecurity/trivy/security/advisories/GHSA-69fq-xp46-6x23)
   records a March 2026 compromise of Trivy releases, images, setup actions, and mutable action tags.
   It identifies Trivy 0.69.3 and trivy-action 0.35.0 as known-safe and directs consumers to pin full
   action commit SHAs.
6. GitHub verification confirms immutable trivy-action 0.35.0 commit
   `57a97c7e7821a5776cebc9bb87c984fa69cba8f1` carries a valid signed commit.

### Adopted decisions

1. Keep the mature Node 22 line and move from Alpine/musl to official Debian Bookworm slim/glibc.
2. Pin the exact Node patch and multi-platform image digest once in the Dockerfile; make production
   stages and Dockerized CI inherit that shared target.
3. Use an allowlisted Docker build context containing only package manifests, Next/TypeScript build
   configuration, and application source. Exclude local environment values and all generated or
   non-runtime material by default.
4. Generate stable Next standalone output and copy only its traced runtime plus static assets. Remove
   npm, Corepack, and Yarn after build, then execute the generated minimal server directly as the
   unprivileged image-provided `node` user. The first local scan found two fixable HIGH findings in
   bundled npm, while pruned dependencies still retained Playwright through Next's optional peer and
   occupied 638 MB; both findings justify the traced deployment boundary.
5. Build and scan the exact production image in PR and Main Releasability Docker lanes.
6. Reject fixable high/critical operating-system or library findings and publish a CycloneDX SBOM
   artifact for every protected run.
7. Pin the scanner action to the verified full 0.35.0 commit and request known-safe Trivy 0.69.3
   explicitly. Do not trust mutable tags, `master`, `latest`, or the compromised 0.69.4–0.69.6
   artifacts.
8. Own readiness in the production image with a dependency-free Node probe. Let Compose inherit the
   same health contract so removing package managers and distribution utilities cannot make a
   successfully started service appear unhealthy.

### Rejected decisions

1. Node Current, beta, release-candidate, distroless, custom runtime, or an unrelated framework
   migration in this security slice.
2. Floating `node:22`, `node:22-alpine`, Debian, scanner, action, or latest-version references.
3. Retaining the experimental musl runtime merely because its compressed image is smaller.
4. Copying the full development toolchain into production or running the application as root.
5. Treating an SBOM as a vulnerability gate, or treating a scanner table as sufficient provenance
   without a machine-readable inventory.
6. Suppressing fixable high/critical findings without a time-bounded GitHub issue and explicit owner.
7. Installing `wget`, `curl`, or another runtime utility solely to preserve a Compose-only health
   command after moving to a minimal Debian standalone image.

### Rollback and refresh posture

Do not roll back to floating Alpine images. If the Debian migration exposes a runtime incompatibility,
fix the Docker boundary or revert to the prior exact Node 22 patch on an official Debian slim digest,
then preserve the image scan and SBOM gates. Review the Node patch/digest on a bounded cadence and
complete an issue-backed LTS migration before Node 22 reaches end-of-life.

### Publication decision

Wiki source changes are required because immutable runtime provenance, image vulnerability
enforcement, and SBOM artifacts are protected-lane truth. Publish `wiki/Validation-and-CI.md` after
merge, then run strict wiki parity verification.

## Deterministic Docker Parity Under Shared-Stack Load

### Validation job

Dockerized local CI must provide reproducible Linux parity on the same workstation that may be
running the governed canonical Lotus stack. Container-visible CPU count is not a safe concurrency
budget when databases, brokers, analytics services, and front-office services share that host.
The repository bind mount also must not make developer-local environment values an implicit build
input.

### Current-practice research

Official [Vitest parallelism guidance](https://v3.vitest.dev/guide/parallelism) says test files run
in parallel by default and `maxWorkers` governs the number of simultaneous workers. The guidance
also distinguishes this bounded file parallelism from disabling file parallelism entirely.

### Evidence and adopted decision

One unbounded Docker parity run under shared-stack load passed 302 of 305 files and 1,399 of 1,404
tests but produced one transient tooltip wait miss and four timeouts across three files. The exact
three files then passed all 15 tests in 21.07 seconds in the same image and named-volume environment
once the concurrent full suite ended. Host `make check` passed all 305 files and 1,404 tests.

Set `--maxWorkers=2` only for the Dockerized local lane. This retains file isolation and useful
parallelism while making resource use explicit and conservative. Keep host and protected CI behavior
unchanged so their available execution capacity remains independently visible.

Mask `/app/.env.local` with the tracked, intentionally empty `scripts/testing/ci-empty.env` fixture.
This preserves the productive whole-repository bind mount while making local configuration an
explicit non-input to container lint, typecheck, tests, and build.

### Rejected decisions

1. Increase individual timeouts for tests that are fast in isolation.
2. Disable assertions, use `passWithNoTests`, or ignore failed files.
3. Disable file parallelism globally and hide genuine concurrency behavior.
4. Derive the limit from host core count, which caused the original oversubscription.
5. Read the workstation's `.env.local`, copy its values into CI configuration, or delete/rename the
   developer's file during a validation run.

### Publication decision

Wiki source changes are required because the Docker parity operating envelope is validation truth.
Publish `wiki/Validation-and-CI.md` after merge, then run strict parity verification.

## Source-Authoritative Performance Attribution Totals

### Validation job

The Performance Analysis attribution table must explain the portfolio result using producer-owned
analytical totals. Detail rows are evidence within a selected classification level; they are not a
safe browser-side calculation base because the response can be partial, filtered, rounded, or
shaped differently from the producer's official aggregate.

### Current-practice research

1. The CFA Institute's
   [Portfolio Performance Evaluation curriculum](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/portfolio-performance-evaluation)
   treats attribution as a governed analytical process for explaining active return, including
   allocation, selection, and interaction effects.
2. The CFA Institute Research and Policy Center's
   [Performance Attribution: History and Progress](https://rpc.cfainstitute.org/research/foundation/2019/performance-attribution)
   reinforces that attribution methods and their interpretation depend on the chosen model and
   calculation framework rather than presentation-layer arithmetic.
3. W3C's [table concepts](https://www.w3.org/WAI/tutorials/tables/) and
   [table design tips](https://www.w3.org/WAI/tutorials/tables/tips/) require data tables to expose
   clear row and column relationships. Distinct language is therefore needed for unavailable
   source evidence and for cells that are intentionally non-additive.

### Adopted decisions

1. Preserve `allocation_total_pct`, `selection_total_pct`, `interaction_total_pct`, and
   `total_effect_pct` from the selected source attribution level as the only effect-total authority.
2. Keep local aggregation only for portfolio and benchmark exposure weights, which are presentation
   summaries rather than attribution calculations.
3. Display `Unavailable` when an optional source component total is absent. Keep the em dash for
   portfolio and benchmark return columns whose footer values are intentionally non-additive.
4. Keep the required total-effect contract strict. Gateway issue #506 owns controlled handling of
   malformed producer evidence rather than allowing Workbench to turn a missing value into zero or
   a row-derived substitute.
5. Protect the boundary with adversarial tests whose detail-row sums disagree with source totals,
   plus a structural regression that rejects browser-side effect aggregation.

### Rejected decisions

1. Summing visible detail rows to reconstruct any official attribution effect.
2. Treating missing totals as zero, blank content, or an em dash that is indistinguishable from an
   intentionally non-additive field.
3. Removing the total row and forcing advisors to estimate the portfolio-level explanation.
4. Expanding this correctness slice into a wider visual redesign before the analytical authority is
   trustworthy.

### Publication decision

No wiki source change is required. This slice corrects an existing supported Performance contract
and records its engineering authority in repository context and review ledgers; it does not change
the operator runbook, route catalogue, supported feature set, or validation commands. The PR must
still pass strict wiki parity before merge.
