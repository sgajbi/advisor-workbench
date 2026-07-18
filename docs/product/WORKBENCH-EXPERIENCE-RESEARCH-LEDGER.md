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
6. PR, merge-gate, merge, exact-main, and branch-reconciliation evidence remains pending before
   this ledger entry can be hardened.

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

### Publication decision

No wiki source change is required. The wiki already states that shell navigation follows the
Gateway capability contract; this slice corrects primary navigation language without changing a
route, capability, authority boundary, or operator workflow. The reusable rule is durable in this
research ledger, the codebase review ledger, and repository engineering context.
