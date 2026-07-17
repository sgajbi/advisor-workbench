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
6. the separate Cashflow workspace when forward-looking liquidity review is required.

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
