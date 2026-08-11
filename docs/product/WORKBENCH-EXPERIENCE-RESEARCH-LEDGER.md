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
8. Reuse the Workbench choice group, analytical module, module-state, dense table, and
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

The screen uses the shared choice-group and analytical-module patterns, shows source scope and
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

### Slice 2 — component-owned Cashflow presentation

Research was revalidated on 2026-08-10 against the official Next.js CSS Modules and module-graph
guidance plus W3C SVG accessibility support. The existing #440 workflow decisions remain the
business authority: the extraction does not redesign the source-backed Cashflow task.

Adopted:

1. colocate Cashflow-only summary, chart-mark, projection-scope, source-note, exact-schedule, and
   responsive rules with the two React owners that emit them;
2. retain the named SVG plus exact table/export alternative;
3. keep genuinely shared Portfolio chart geometry and `AnalyticsTable` behavior under their
   existing owners;
4. remove the late app-shell repair, lower the exact global budget, and prevent the retired prefix
   from returning.

Rejected:

1. bulk-moving adjacent shared selectors without a complete consumer/modifier matrix;
2. introducing a new styling dependency or partial cascade-layer migration;
3. changing data hierarchy, chart meaning, or source-contract claims during an ownership refactor;
4. replacing exact table/export evidence with an SVG-only presentation.

Issue #492 owns this tranche. The result changes CSS ownership and assistive terminology from
`cashflow` to the existing business phrase `cash movement`; it does not change Gateway requests,
calculation meaning, visible capability, or operator procedure.

Validation proves the canonical `PB_SG_GLOBAL_BAL_001` Cashflow workflow through the Workbench BFF
against an exact process-owned fixture. The production-browser scenario passes at 1440, 1024, 768,
and 519 px with keyboard horizon selection, returned-horizon identity, exact schedule evidence,
accessible chart and movement summaries, and no page-level horizontal overflow. Desktop and mobile
captures are retained locally under `output/playwright/issue-492-cashflow/`. The complete repository
gate passes 339 files and 1,933 tests at 91.43% statement/line coverage plus the optimized 25-route
production build and portfolio-record bundle budgets.

### Publication decision

No repo wiki change is required for this slice. It changes presentation ownership, recurrence
governance, assistive terminology, and isolated test proof for an existing supported Cashflow screen
without changing a Gateway route, supported-feature claim, operator command, or canonical runtime
flow. The repository engineering context records the reusable component-ownership boundary.

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
6. Treat request acceptance as the end state for the current reviewed intent while continuing to
   state that report data, archive, client delivery, and communication are separate. A future
   request must begin through an explicit advisor action and a newly reviewed idempotency intent.

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

### Slice 4 — outcome-first accepted requests and deliberate repeat ordering

Issue #571 corrects a business-workflow dead end in the portfolio Report Centre. Acceptance was
rendered twice while the full editable configuration remained dominant, and the accepted handle was
retained for the portfolio with no supported way to begin a second request in the same advisor
session. The new composition treats the accepted request as the primary outcome, keeps recent
request history in view, and requires an explicit `Create another report` action before returning to
configuration and creating a new reviewed idempotency intent.

#### Interaction and market research

Research was reviewed on 2026-08-09 against the accepted and repeat-request workflow:

1. [Morningstar Office reporting guidance](https://admainnew.morningstar.com/webhelp/Morningstar/Advisor_Workstation_Office_Edition_Overview.htm)
   places client and portfolio reporting inside the advisor workstation rather than treating each
   request as an isolated technical job. Lotus therefore preserves portfolio context and recent
   request history when one request is accepted.
2. [Morningstar Advisor Workstation onboarding](https://advisor.morningstar.com/enterprise/onboarding/AdvisorWorkstationOnboarding4.pdf)
   describes selecting a client or portfolio, configuring report content, and generating reports as
   a repeatable advisor activity. Lotus ends one reviewed intent without terminally locking future
   requests for the selected portfolio.
3. [Addepar reporting guidance](https://addepar.com/blog/enhanced-reporting-transforms-operations)
   emphasizes repeatable reporting workflows and traceable output. Lotus exposes the accepted
   support reference and portfolio request history while keeping archive and delivery outside the
   ordering claim.
4. [Carbon data-table guidance](https://carbondesignsystem.com/components/data-table/usage/) and
   [Carbon progressive-disclosure guidance](https://preview.carbondesignsystem.com/building-blocks/core/patterns/forms)
   support scan-efficient tables and revealing optional form detail only when it is useful. Optional
   report contents move behind a native disclosure while required content remains truthful.
5. [WCAG 2.2 status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
   and [focus-order guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html) require
   programmatic outcome communication and logical focus movement. Lotus publishes one polite
   accepted status and restores focus to configuration only after the advisor starts another request.

#### Adopted decisions

1. Render one authoritative accepted confirmation in the readiness rail and remove duplicate
   success chrome from the main workspace.
2. Replace the editable configuration with recent request history after acceptance so the dominant
   task becomes tracking the outcome, not accidentally changing an already accepted intent.
3. Provide one explicit `Create another report` action. Preserve the valid portfolio configuration,
   clear only the current portfolio's accepted handle and review posture, and require a new review
   before submission.
4. Generate a fresh idempotency key only after the advisor deliberately starts, reviews, and submits
   the next request. Do not rotate intent during render or on acceptance.
5. Summarize selected report contents at scan level and use a keyboard-native disclosure for optional
   section tailoring. Automatically expose the detail when setup is blocked.
6. Keep support correlation available through a quiet disclosure and retain the existing request,
   report-data, archive, and client-delivery boundary.

#### Rejected decisions

1. Do not reset automatically after acceptance; that would obscure the source-owned result and make
   duplicate submission easier.
2. Do not leave the portfolio in a permanent accepted terminal state; advisors legitimately prepare
   more than one governed report over time.
3. Do not add a wizard, toast, second success card, scheduling, recipients, download, archive,
   communication, or client-delivery controls unsupported by current contracts.
4. Do not fabricate accepted posture when the strict Gateway handle is incomplete. The production
   fixture must carry the required request, job, status, status URL, and idempotency evidence.
5. Do not weaken assertions to accommodate stale wording. Browser proof anchors to the stable
   accepted heading, one status region, refreshed tracking posture, focus restoration, and distinct
   source-owned support references.

#### Validation and publication decision

The focused screen-state, workflow, and rendered workspace suites pass 37/37 tests, including
last-request-wins history refresh sequencing and protection against delayed focus restoration. The owned
optimized-production Report Centre matrix passes 16/16 browser journeys, including two sequential
accepted requests at a 720 px constrained/zoom-equivalent viewport, distinct support references,
review reset, focus restoration, and no horizontal overflow. The wiki supported-feature record is
updated because same-session sequential report requests are newly supported; no Gateway, Report,
OpenAPI, runtime runbook, or platform skill change is required.

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

## Follow-Up Brace Expansion Availability Advisory

### Validation job

The Workbench development toolchain must stay audit-clean without replacing mature framework,
lint, or test infrastructure merely because a new transitive advisory appears. Remediation must
patch the exact compatible consumer path and preserve the semantics of unrelated dependency lines.

### Current security research

GitHub's reviewed advisory
[GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895), published to the advisory
database on 2026-08-03, records that the 5.0.8 mitigation for brace expansion did not bound two
intermediate arrays. A small crafted pattern can terminate Node through memory exhaustion, and a
wider padded sequence can block the event loop for minutes. GitHub rates the issue High at CVSS
7.5 and identifies 5.0.9 as the patched 5.x release.

The Workbench lock graph contains one affected node: `minimatch@10.2.6` requests
`brace-expansion@^5.0.8` through the maintained ESLint, TypeScript-ESLint, and test-exclude
toolchain. No production dependency reaches this package.

### Adopted decisions

1. Keep the current stable Next, ESLint, TypeScript-ESLint, Vitest, and coverage-tool versions.
2. Override only `minimatch`'s compatible brace-expansion consumer to exact patched 5.0.9.
3. Preserve the package-lock integrity and add a governance regression for the narrow override.
4. Require both the complete-graph high-severity audit and production-graph moderate-severity audit
   to report zero vulnerabilities before accepting the PR.

### Rejected decisions

1. Audit suppression, allowlisting, or lowering either protected threshold.
2. A global brace-expansion override that could force the 5.x implementation onto incompatible
   older-major consumers.
3. A preview, current-major, or unrelated toolchain upgrade in a transitive patch slice.
4. Treating the development-only path as harmless when it blocks protected CI and can process
   repository-controlled patterns.

### Publication decision

No wiki source change is required. This is a lockfile and dependency-governance correction; it does
not change a supported product capability, operator command, or runtime contract. Issue #519 owns
the remediation and exact-main closure evidence.

## Proposal Workflow Source Truth After Save, Refresh, And Paging

### Workflow objective

Help a client advisor move from proposal construction into a retained advisory record, review
current suitability evidence, and triage a bounded proposal queue without contradictory lifecycle
claims or false book completeness.

### Current workflow research

1. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   separates proposal construction from downstream delivery and implementation while keeping firm
   criteria and suitability checks in the governed workflow.
2. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   emphasizes connected advisor workflows, book insights, next business actions, and
   exception-oriented portfolio review.
3. [Salesforce Financial Services Cloud Action Plans](https://help.salesforce.com/s/articleView?id=sf.fsc_action_plans&language=en_US)
   keeps source task status and responsible action visible through a repeatable business process.
4. [TanStack Query useQuery](https://tanstack.com/query/latest/docs/framework/react/reference/useQuery)
   distinguishes first-load `isLoading` from background `isFetching` and refetch failure with
   retained cached data.
5. [Carbon pagination guidance](https://carbondesignsystem.com/components/pagination/usage/)
   recommends explicit user-controlled pagination when loading all available data would be costly
   or difficult to consume.

### Adopted decisions

1. Promote the simulation workflow rail from construction-only to `Advisor draft saved` only after
   the approved handoff returns a source proposal id.
2. Keep cached policy evidence readable during background refresh, label the rail `Refreshing`, and
   downgrade a failed refresh to partial evidence instead of silently calling the source current.
3. Treat every continuation cursor and every non-initial cursor window as partial queue coverage.
4. Provide explicit previous/next source-window controls backed by the real cursor contract; never
   auto-traverse an unbounded advisor book in the browser.
5. Centralize first-load, background-refresh, unavailable, cached-refresh-failure, and permission
   posture in a reusable query projection and centralize cursor-window navigation in a reusable
   Workbench control.

### Rejected decisions

1. Optimistic persisted status, browser-authored lifecycle stage, suitability outcome, approval
   readiness, client publication, or execution posture.
2. Discarding readable cached evidence during a background refresh or labelling it current before
   the source settles.
3. Treating a zero-row first window, a terminal continuation window, or one visible page as the
   complete proposal queue.
4. Exposing cursor values or transport terminology in advisor-facing copy.
5. Automatically loading every proposal window merely to derive a browser-owned book total.

### Publication decision

No wiki source change is required. Issues #521, #522, and #523 harden the source truth of existing
supported proposal routes without changing their route catalogue, backend ownership, operator
commands, or supported-feature boundary. Repository context records the new paging and refresh
invariants; the PR must still pass strict wiki parity before merge.

## Current-Worktree Browser Proof Isolation

### Validation objective

Prove that local production-browser validation exercises the intended Workbench commit even when a
shared platform stack or another worktree already owns the default listener.

### Current-practice research

Playwright's official
[web server configuration](https://playwright.dev/docs/api/class-testconfig#test-config-web-server)
defines `reuseExistingServer` as permission to use any process already available at the configured
URL. It separately recommends aligning the browser `baseURL` with the web-server URL. A successful
readiness response therefore proves listener availability, not source-worktree provenance.

### Adopted decisions

1. Accept one explicit `PLAYWRIGHT_PORT` in the valid TCP range and apply it consistently to the
   Next production server, Playwright readiness URL, and browser base URL.
2. Disable existing-server reuse whenever the caller selects a port, so a collision fails instead
   of silently exercising an unrelated process.
3. Preserve the convenient default local reuse behavior on port `3000` for deliberate development
   sessions and preserve fail-closed non-reuse behavior in CI.
4. Run exact-commit production proof in an isolated temporary Git worktree when the canonical
   worktree's build output may be in use by a shared listener; remove the temporary worktree after
   validation.

### Rejected decisions

1. Killing or replacing a shared platform listener merely to validate a feature branch.
2. Treating recognizable page content, a successful HTTP response, or a green test against a reused
   listener as proof of the current source commit.
3. Hard-coding a second repository port that can eventually collide in the same way.
4. Allowing malformed, zero, negative, fractional, or out-of-range port values to fall back
   silently to the default.

### Publication decision

The browser-proof command contract changes, so `wiki/Validation-and-CI.md` is updated in the same
PR. After merge, publish the Workbench wiki and verify strict source/publication parity before
closing issue #524.

## Advisor Cockpit Acknowledgement Reconciliation

### Workflow objective

Help a client advisor distinguish a recorded review acknowledgement from the later confirmation of
the action, preparation, and readiness evidence used for the next business decision.

### Current workflow research

1. TanStack Query's official
   [background fetching guidance](https://tanstack.com/query/latest/docs/framework/react/guides/background-fetching-indicators)
   distinguishes initial loading from background fetching and recommends a separate visible
   indicator while retained data remains on screen.
2. TanStack Query's official
   [mutation invalidation guidance](https://tanstack.com/query/latest/docs/framework/react/guides/invalidations-from-mutations)
   confirms that returning and awaiting the invalidation promise keeps the mutation pending until
   the affected queries finish updating.
3. IBM Carbon's
   [inline loading guidance](https://carbondesignsystem.com/components/inline-loading/usage/)
   recommends descriptive active, finished, and error labels for short update operations and
   disabling the associated interaction until processing completes.

### Adopted decisions

1. Compose action, snapshot, preparation, and supportability queries into one Advisor Cockpit
   evidence posture using the shared Workbench query-state projection.
2. Keep previously retrieved evidence readable during confirmation, but replace the settled
   decision and badge with a business-facing `Confirmation in progress` posture until every
   required query settles.
3. Await all four invalidations and keep acknowledgement unavailable during recording,
   confirmation, partial evidence, unavailability, and permission restriction.
4. Preserve cached evidence after an ordinary refresh failure with an explicit partial posture;
   hide all protected cockpit evidence when any required source reports a permission boundary.
5. Prove the composite with independently controlled query completion in integration tests and a
   delayed-response production-browser flow.

### Rejected decisions

1. Optimistically removing or rewriting the source-owned action after acknowledgement.
2. Replacing the whole workspace with a blocking loader during background confirmation.
3. Calling the acknowledgement complete while any required source still has an unsettled response.
4. Re-enabling the action against cached evidence after a failed confirmation.
5. Exposing cache, query-client, refetch, endpoint, or service-topology terminology to advisors.

### Publication decision

No wiki source change is required. Issue #526 corrects the state handling of existing supported
Advisor Cockpit routes without changing the route catalogue, backend ownership, operator commands,
or supported-feature boundary. Repository context records the durable composite-evidence invariant;
the PR must still pass strict wiki parity before merge.

## AI-Assisted Output And Human Review Disclosure

### Business job

An advisor, portfolio manager, or reviewer must decide what prepared a narrative, whether a usable
output exists, what evidence supports it, whether human review is recorded, whether it may be used
with a client, and whether its freshness is known. These are separate decisions; workflow
completion alone answers none of them.

### Current-product research

Research was reviewed on 2026-08-04 from official sources:

1. [Carbon AI label usage](https://carbondesignsystem.com/components/ai-label/usage/) recommends a
   stable, focused marker beside affected output and a consistent path to explainability; the label
   is neither decoration nor an action trigger.
2. [Microsoft HAX guidelines](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)
   recommend explaining why an output was produced and communicating capability limits while
   guarding against automation bias and over-trust.
3. [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) requires clear human
   and AI roles, documented limitations, and output interpretation in the operating context.
4. [FINRA's 2026 GenAI oversight report](https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/gen-ai)
   confirms that supervision, communications, recordkeeping, and fair-dealing obligations continue
   to apply to GenAI-enabled workflows.

### Adopted decisions

1. Use one quiet output-adjacent `How this was prepared` disclosure with visible status text.
2. Separate preparation, availability, evidence, human review, client use, and freshness.
3. Use native `details`/`summary` semantics for reliable keyboard and screen-reader behavior.
4. Fail closed for missing or contradictory provenance; never fabricate task, provider, model,
   source reference, review, freshness, or client permission.
5. Identify deterministic browser-composed narrative as rule-based internal working material.
6. Keep provider, model, run, and evidence identifiers secondary to business posture.

### Rejected decisions

1. A global AI badge or generic `AI powered` claim.
2. Sparkle icons, glow, gradients, or ornamental AI identity.
3. Using the disclosure marker as a regenerate or workflow action.
4. Treating request acceptance or runtime completion as evidence, human review, or client approval.
5. Inferring live generation, review, freshness, or client-use permission from adjacent fields.

### Publication decision

The supported product boundary changes because Performance Advisor Brief and Advisory Copilot now
publish the common disclosure. `wiki/Supported-Features.md` and repository context are updated in
this PR. Remaining DPM workflow-output adoption is tracked by issue #528.

### Availability and evidence follow-up — 2026-08-05

Issues #531 and #532 rechecked the same official Carbon, Microsoft HAX, NIST AI RMF, and FINRA
guidance against the merged component and Performance adapters.

Adopted:

1. Name live, partial, stale, simulation, and unavailable output in compact business language and
   retain Availability as an explicit expanded fact.
2. Count evidence only when a displayed deterministic metric is usable or a published source
   reference remains nonblank after normalization.
3. Treat superseded workflow output as historical, block client use, and show source-published
   replacement lineage beside the limitation and secondary diagnostics.
4. Keep native disclosure semantics and add a three-column intermediate layout before the existing
   narrow single-column layout.

Rejected:

1. Counting array entries, whitespace, duplicate references, or `N/A` display placeholders as
   evidence.
2. Treating a completed and accepted but superseded run as live.
3. Inferring a replacement run, freshness timestamp, confidence score, or approval state that the
   source did not publish.
4. Introducing a Performance-only disclosure variant or ornamental AI styling.

Publication decision: the reusable disclosure contract and visible supported-feature behavior
change, so repository context and `wiki/Supported-Features.md` are updated in the same PR. Publish
the authored wiki after merge and verify strict parity.

### DPM workflow adoption — 2026-08-08

#### Workflow objective and users

Portfolio managers, CIO reviewers, investment-control users, and operations specialists need to
request decision support where the underlying work occurs and then distinguish a recorded request
from available material, supporting evidence, human review, permitted use, and freshness. The
adoption covers proof-pack PM memo, wave PM memo, operations brief, monitoring-exception summary,
outcome-review narrative, and PM operating-quality support summary workflows.

#### Workflow research

The implementation rechecked the shared disclosure research against DPM operating controls and
reviewed these additional official sources:

1. [NIST AI RMF Core](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/) requires explicit
   human-AI roles, oversight, knowledge limits, and permitted-use boundaries.
2. [FINRA 2026 GenAI oversight](https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/gen-ai)
   keeps supervision, communications, recordkeeping, and fair-dealing obligations in force for
   AI-enabled workflows.
3. [Singapore PDPC Model AI Governance Framework](https://www.pdpc.gov.sg/help-and-resources/2020/01/model-ai-governance-framework)
   recommends human-centric, explainable decisions, an explicit degree of human involvement, and
   communication that affected users can understand.

#### Adopted decisions

1. Put the request beside its owning workflow and use one shared business result pattern across all
   six families rather than routing every decision through a generic Copilot banner.
2. Normalize each exact Gateway response through a typed family profile while preserving one
   disclosure contract and presentation component.
3. Announce and focus a newly returned result, then expose the native disclosure control for
   keyboard and screen-reader review.
4. Treat acceptance as request posture only. Output availability, evidence, review, client use,
   freshness, supersession, and simulation remain independent source facts and fail closed when
   absent or contradictory.
5. Label persisted PM-quality invocation history as audit evidence only. Without a returned output,
   it reports output unavailable and client use blocked even when the invocation record exists.
6. Keep provider, model, runtime, run, and source identifiers in secondary support details while
   leading with what was requested, what is available, who must review it, and what may happen next.

#### Rejected decisions

1. One `Promise<unknown>` response summarizer or one universal success badge.
2. Treating HTTP acceptance, workflow completion, or invocation persistence as generated material.
3. Inventing citations, confidence, reviewer identity, review time, freshness, or replacement
   lineage in Workbench.
4. Making technical provider, model, endpoint, or run vocabulary the primary operating message.
5. Duplicating six page-specific disclosure cards or storing generated output in browser-owned
   state beyond the bounded returned workflow result.

#### Expected measurable improvement and publication decision

Every supported DPM assistance action now produces the same six independent business facts and a
review-required, fail-closed client-use boundary; the wave memo and operations brief are also
available at their point of work. Table-driven adapter and owning-screen tests prove all six
families plus invocation-only evidence. The supported product and integration boundary changes, so
`wiki/Supported-Features.md`, `wiki/Integrations.md`, repository context, and the codebase review
ledger are updated. Routes, environment variables, API paths, canonical operator commands, and
README onboarding do not change, so no README, API Surface, or runbook update is required. Publish
the authored wiki after merge and verify strict parity.

### DPM mandate review workflow — 2026-08-09

#### Workflow objective and users

Portfolio managers and investment-control users need to move from mandate posture to the exact
source-owned item requiring attention, understand who owns it and what Manage recommends next, and
inspect lineage without scanning duplicate dashboards or relying on Workbench-invented readiness.

#### Research anchors

1. [CFA Institute Standard III(C): Suitability](https://www.cfainstitute.org/standards/professionals/code-ethics-standards/standards-of-practice-iii-c)
   supports periodic review of investor objectives and constraints rather than local suitability
   inference.
2. [ESMA MiFID II Article 25](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-25-assessment-suitability-and)
   anchors periodic portfolio-management review in the client's preferences, objectives, and
   characteristics.
3. [FCA Consumer Duty outcomes monitoring](https://handbook.fca.org.uk/handbook/prin2a/prin2as9)
   links management information to identifying emerging risk and taking accountable action.
4. [Carbon data-table guidance](https://carbondesignsystem.com/components/data-table/usage/)
   supports compact task tables and progressive disclosure for supplementary detail.
5. [WCAG 2.2 reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
   requires content and controls to remain usable without page-level two-dimensional scrolling.

#### Adopted decisions

1. Use one operating sequence: mandate health, attention queue, selected source-owned next step,
   then evidence and version identifiers.
2. Make each exception observation a native button with visible selected state and keyboard
   activation; bind owner, age, source, and next step to that same exception.
3. Render a summary meter only when Manage publishes a usable score. Missing context, ownership,
   action, monitoring, and lineage remain visibly unavailable.
4. Translate known source codes into business language while keeping exception, mandate, run,
   correlation, and authority identifiers under native progressive disclosure.
5. Keep wide operational tables inside labelled scroll containers and prove page reflow at desktop,
   tablet, compact, and effective 200% zoom widths.

#### Rejected decisions

1. Inferring mandate readiness from the number of active exceptions.
2. Hard-coded health percentages, mandate type, risk profile, currency, as-of date, or audit-trail
   availability.
3. Attaching book-level recommended actions to a selected exception without a source relationship.
4. Generating remediation prose such as approval guidance from a reason or action code.
5. Repeating attention, action, latest-review, and health-dimension data as equally weighted card
   stacks or exposing raw reason codes as the primary observation.

#### Expected measurable improvement and publication decision

Focused model, helper, component, integration, and canonical-script tests prove current summary
contract mapping, all supported operating states, keyboard selection, evidence disclosure, removal
of fabricated defaults, and responsive proof. The product boundary and operator proof changed, so
repository context, the canonical runtime runbook, `wiki/Supported-Features.md`,
`wiki/API-Surface.md`, and `wiki/Integrations.md` are updated. README commands, public routes,
environment variables, and platform-wide routing do not change. Publish the authored wiki after
merge and verify strict parity.

## Portfolio Record Route Performance And Resilience

### Business job

Private bankers move repeatedly among Allocation, Positions, Transactions, Cashflow, and Income
during review preparation. Each transition should load the selected business task promptly without
shipping unrelated grids or analytical workspaces, while preserving portfolio identity, source
truth, navigation, evidence, and a clear recovery path.

### Current-practice research

Research was refreshed on 2026-08-09 from official Next.js sources:

1. [Next.js lazy-loading guidance](https://nextjs.org/docs/app/guides/lazy-loading) states that
   deferring Client Components and imported libraries reduces the JavaScript needed to render a
   route, while Server Components are automatically code split.
2. [Next.js package-bundling guidance](https://nextjs.org/docs/pages/guides/package-bundling)
   explains that smaller bundles reduce transfer and JavaScript execution cost and improve Core
   Web Vitals.
3. The stable App Router, Client Component, production-manifest, and `next build` surfaces already
   used by this Next.js 15 application are sufficient; the Next.js 16 experimental analyzer is not
   required for a protected production gate.

### Adopted decisions

1. Keep one server data loader for selected-portfolio resolution and Gateway-backed shell, summary,
   and detailed records.
2. Keep one reusable client shell for business title, portfolio identity, navigation, evidence,
   KPIs, and unavailable posture.
3. Give each record route a task-owned Client entry point so only its workspace and dependencies
   enter the initial graph.
4. Use one layout-stable, screen-reader-announced loading frame and one keyboard-native retry frame
   with business language across all five tasks.
5. Inspect deterministic Next.js production artifacts after every build, report raw initial client
   JavaScript for all five routes, require AG Grid for the three grid tasks, and forbid it for
   Cashflow and Income.

### Rejected decisions

1. Five copied page shells or data-loading implementations.
2. A single client dispatcher that statically imports all business workspaces and branches only
   after hydration.
3. Framework, grid, chart, or backend replacement for a frontend module-graph defect.
4. Next.js 16 experimental bundle analysis in the protected Next.js 15 build.
5. Compression-only evidence, a blank transition region, an indefinite spinner, or technical
   service/error wording in the primary recovery path.

### Expected measurable improvement and publication decision

The production build moved Cashflow First Load JS from 1.31 MB to 988 kB (24.6% reduction) and
Income from 1.31 MB to approximately 980 kB (25.2% reduction). The raw initial-JavaScript report records 3.07 MB
for Cashflow and 3.04 MB for Income, with no AG Grid marker in either initial graph; Allocation,
Positions, and Transactions retain their required grids. Focused tests cover preserved task
behavior, all five loading/error identities, accessible recovery, and budget failures.

This changes frontend architecture and build governance, so repository context, the codebase review
ledger, and `docs/architecture/portfolio-record-route-bundle-governance.md` are updated. It does not
change a supported feature, route, API, operator command, or business procedure, so no README,
runbook, or repo-authored wiki source change is required.

## Idea Advisor Action Business Reasons And Persistence Proof

### Business job

An advisor reviewing an opportunity must record why a review, feedback outcome, or conversion
intent was taken without memorising service codes or typing uncontrolled technical values. The
workstation must confirm the action only when the source system proves it was persisted and the
advisor is looking at refreshed queue and candidate posture.

### Current-practice research

Research was refreshed on 2026-08-09 from authoritative interface guidance:

1. [W3C form-label guidance](https://www.w3.org/WAI/tutorials/forms/labels/) requires explicit,
   programmatic labels so controls remain understandable and operable with assistive technology.
2. [GOV.UK select guidance](https://design-system.service.gov.uk/components/select/) recommends a
   native select when users choose from a short, known set and requires clear label and hint text.
3. [MUI select accessibility guidance](https://mui.com/material-ui/react-select/#accessibility)
   requires the select to be associated with a visible label.

### Adopted decisions

1. Present source candidate reasons that are meaningful decision bases, translated into concise
   private-banking business language; use the governed `review_required` fallback when a candidate
   publishes no usable decision basis.
2. Use a visible, explicitly associated, keyboard-native select for the short candidate-scoped set.
3. Add the source-valid audit reason implied by the selected action; do not ask the advisor to manage
   service taxonomy.
4. Require `accepted` or idempotent `replayed` source persistence before success, then await both
   source queue and candidate-detail refresh.
5. Expose persistence failure, recorded-but-refresh-failed, and recorded-and-refreshed as distinct
   states. Use stable machine-readable state for browser proof and concise product copy for people.

### Rejected decisions

1. Free-text reason entry, because it creates uncontrolled values and failed the closed source
   contract.
2. A 44-option technical enum or autocomplete, because most values are internal scoring, queue, AI,
   or control evidence rather than an advisor's decision basis.
3. A hidden fixed reason, because it would remove advisor context and produce weak audit evidence.
4. Treating any HTTP `2xx` as persistence proof or showing success before queue/detail refresh.
5. Keeping a brittle browser assertion tied only to one full success sentence.

### Expected measurable improvement and publication decision

Focused tests prove exact source-vocabulary alignment, business-option filtering, accessible
selection, deterministic action/audit pairing, accepted source persistence, delayed success until
refresh, explicit failure, exact retry, and stable browser state. This changes a supported workflow,
public validation semantics, operator proof, and repository truth, so repository context, the
codebase review ledger, canonical runtime runbook, and Workbench wiki source are updated. Publish
the authored wiki after merge and verify strict parity.

## Advisor Own-Book Scan Hierarchy And Paged-Scope Truth

### Business job

A relationship manager needs to find one confirmed portfolio assignment quickly, understand
whether each count describes the filtered result or only the current page, and reorder or reset the
working view before continuing into Portfolio Review. The screen must remain useful when the source
publishes only portfolio and client references rather than governed business names.

### Current-product research

Research was refreshed on 2026-08-09 from official product sources:

1. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   connects Book Insights, business oversight, advisor workflow, and portfolio management while
   keeping their operating purposes distinct.
2. [BlackRock manage business at scale](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/manage-business-at-scale)
   emphasises systematic book monitoring, shared analytics, and action from client-account
   opportunities.
3. [Salesforce Financial Services Cloud for Wealth Management](https://help.salesforce.com/s/articleView?id=sf.fsc_admin_landing_wealth.htm&language=en_US)
   starts advisor workflows from governed customer profiles, groups and relationships, alerts,
   tasks, and action plans.
4. [Morningstar Direct Advisory Suite](https://www.morningstar.com/business/products/direct-advisory-suite)
   connects client and prospect management with portfolio monitoring, planning, proposals,
   research, and reporting.

These sources guide operating hierarchy only. Lotus does not copy competitor layout, visual
identity, wording, scoring, household models, or unsupported capabilities.

### Adopted decisions

1. Keep the portfolio register as the dominant surface and make Portfolio Review the primary row
   handoff.
2. Separate filtered-result portfolio count from portfolios, clients, and assignment evidence shown
   on the current page.
3. Put exact client reference, mandate, sort field, and direction into one keyboard-native toolbar
   with one apply action and a governed-date-preserving clear action.
4. State the exact result range and active view immediately above the register.
5. Present identifiers explicitly as portfolio and client references until a governed source owns
   business names; retain assignment evidence without promoting it over the advisor's scan task.
6. Give the reusable summary metric strip an auto-fitting dense-column default rather than leaving
   every screen to invent its own metric layout.
7. Continue failing closed for permission, contract drift, source failure, and unconfirmed book
   membership without substituting the global catalogue.

### Rejected decisions

1. Browser-created client or portfolio names, identifier-derived names, or hiding identifiers before
   governed business identity exists. Core #930 owns that source contract.
2. Locally aggregated AUM, households, team or delegated scope, attention ranking, recommendations,
   favourites, or next-best action.
3. Treating current-page active or client counts as whole-book measures.
4. Mixed immediate and submitted filters, a fixed hidden sort direction, or page-local reset logic
   that drops the governed business date.
5. A card mosaic, decorative dashboard, or copied competitor composition around a record-finding
   workflow.

### Validation and publication decision

Workbench issue #567 governs the implementation and Core #930 owns future business identity
enrichment. Focused view-model, API, and component tests cover paged-scope measures, reference
labels, descending sorting, one-action apply, clear-view recovery, and source-failure boundaries;
responsive production-browser and full repository evidence remain part of the issue lifecycle.
The supported Advisor Book workflow now exposes sort direction and clear-view behaviour, so
`wiki/Advisor-Book-Workflow.md` is updated and must be published from repo source after merge.

## Canonical Home Entry And Legacy Suite Retirement

### Business job

A private banker should enter one trusted workstation Home, understand the governed scope of their
work, and continue into a supported task. A compatibility URL must not expose a second dashboard
with invented clients, figures, priorities, owners, or role state.

### Current-product research

Research was refreshed on 2026-08-09 from official product sources:

1. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   connects Book Insights, Advisor Nudges, Whole Portfolio View, Next Best Action, portfolio
   management, and oversight through one platform while keeping their source responsibilities
   distinct.
2. [Morningstar Office overview](https://admainnew.morningstar.com/webhelp/Morningstar/Advisor_Workstation_Office_Edition_Overview.htm)
   starts Home from the advisor's practice, clients, appointments, market context, and investment
   alerts, then moves into account-level portfolio management and reporting.
3. [Salesforce Analytics for Wealth Management](https://help.salesforce.com/s/articleView?id=ind.fsc_use_einstein_financial_services.htm&language=en_US&type=5)
   starts an advisor from their book of business, changes, attention signals, and client-level
   action rather than an ungoverned technical dashboard.

These sources guide workflow hierarchy only. Lotus does not copy competitor layout, visual
identity, wording, ranking, client models, or unsupported capabilities.

### Adopted decisions

1. Maintain one canonical Home composition and make legacy entry paths thin aliases.
2. Require source-owned book, priority, ownership, urgency, and analytics state before rendering a
   business claim.
3. Keep the Home reading order oriented around scope, attention, preparation, and direct task
   handoff once authenticated authority is available.
4. Keep service health, policy identifiers, and support diagnostics in secondary governed evidence
   rather than the primary advisor reading path.
5. Remove unsupported prototype code and its styles instead of polishing a misleading surface.

### Rejected decisions

1. Hard-coded demo clients, portfolios, proposal ids, figures, queues, owners, urgency, or role
   selection in a production route.
2. A card mosaic that repeats navigation without advancing a business task.
3. Locally inferred advisor identity, role, priority, or recommendation.
4. Technical service names, strict-mode flags, policy rule ids, and allowed sections as dominant
   advisor content.
5. Replacing the retired prototype with another unauthenticated Home while #470's source-authority
   dependency remains unresolved.

### Validation and publication decision

Issue #573 owns the bounded removal; #470 continues to own the future authenticated advisor-first
Home, and #140 owns the Gateway-backed DPM command center. Route, source-governance, CSS-ratchet,
and production-browser tests must prove `/suite` follows the canonical Home without an intermediate
fabricated paint at desktop and narrow widths. Because route and supported-surface truth change,
the RFC record, repository context, review ledger, and repo-authored wiki are updated and must be
published from main after merge.

## Review-Controlled Portfolio Intake

### Business job

A portfolio administrator or investment-operations user should prepare one bounded data request,
understand every validation gap, check the exact information that will be published, and see a
source-owned receipt only after the Gateway/Core action succeeds.

### Current-product research

Research was refreshed on 2026-08-09 from official guidance:

1. [Salesforce Financial Services client intake and verification](https://trailhead.salesforce.com/content/learn/modules/customer-onboarding-in-financial-services-cloud/configure-onboarding)
   separates collection from verification, permits prefill only from CRM or integrated source
   context, and emphasizes traceable responses, documents, and repeatable review work.
2. [GOV.UK Check answers](https://design-system.service.gov.uk/patterns/check-answers/) requires a
   review immediately before a small or medium transaction, retained answers when editing, and an
   action-specific submit control; its stated outcomes are higher confidence and lower error rates.
3. [GOV.UK validation recovery](https://design-system.service.gov.uk/patterns/validation/) requires
   errors to say what is wrong and how to fix it while minimizing avoidable rejection through clear
   questions and tolerant input.
4. [IBM progressive disclosure](https://www.ibm.com/docs/en/technical-content?topic=practices-progressive-disclosure)
   recommends exposing only what the current task needs, maintaining a clear trail, and not
   repeating guidance across layers.
5. [IBM Carbon pagination](https://carbondesignsystem.com/components/pagination/usage/) places
   pagination below its related content and keeps items-per-page context, visible range and total,
   current page, total pages, and previous/next navigation explicit; its responsive pattern retains
   range, total, and navigation when space is constrained.
6. [W3C ARIA26](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA26) identifies `aria-current` as
   the machine-readable way to expose the current item in a paginated sequence.
7. [MDN `content-visibility`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility)
   documents browser rendering deferral, but it does not provide a user-visible range, location,
   navigation model, or bounded DOM contract by itself.

These sources guide task sequencing and control safety. Lotus does not copy their visual identity,
product data model, compliance decisions, automation, or unsupported source capabilities.

### Adopted decisions

1. Require an explicit task choice and start every manual task blank.
2. Treat portfolio, position, transaction, instrument, price, and file requests independently.
3. State every missing or invalid field/row directly; do not compress safety into a percentage.
4. Hold one exact reviewed payload and idempotency key; invalidate both when material data changes.
5. Parse a selected file into review state without mutation.
6. Accept success only from a validated source envelope with exact counts for every nonempty
   reviewed record family, including business dates, plus bounded correlation/contract evidence.
7. Keep catalog availability secondary to the business form and preserve explicit manual recovery.
8. Use one responsive semantic DOM and route-scoped CSS rather than duplicated desktop/mobile
   rendering branches.
9. Retire a previously parsed file immediately when its replacement starts parsing; keep review
   unavailable until the replacement payload is complete and fence every late source completion.
10. Treat publication click through source outcome as one immutable intent. Keep the reviewed
    details visible, natively disable only publication-affecting controls, expose a concise live
    progress state, and restore the same reviewed intent for exact retry after source failure.
11. Normalize supported manual and file values through one typed domain boundary before validation
    and review. Trim boundary whitespace, canonicalize only governed code forms, and make review,
    idempotency, Gateway publication, and receipt reconciliation consume that same projection.
12. Keep large record families closed until an operator requests detail, project only ten records
    at a time in source order, and give every family independent range, page, and previous/next
    controls. Preserve one complete normalized publication payload: review pagination must never
    truncate, reorder, or repurpose source data.

### Rejected decisions

1. Production-looking demo defaults, copied rows, first-paint mutation, or automatic submission.
2. Fake wizard steps for independent commands, arbitrary readiness percentages, and static
   pipeline-health claims.
3. Internal UX notes, raw service/catalog posture, or technical response vocabulary as dominant UI.
4. Success from HTTP status or a TypeScript cast without relevant source publication evidence.
5. Claims that publication activates a portfolio or completes valuation, reporting, analytics,
   lineage, or durable ingestion work.
6. Validation against a trimmed copy while reviewing or publishing raw input, input-control-only
   cleanup that file import can bypass, or reliance on undocumented Gateway/Core coercion.
7. Arbitrary file-size limits, infinite scrolling, eager hidden card construction, or
   `content-visibility` as the sole capacity control. These approaches either discard supported
   work, hide location and total scope, or retain an unbounded review structure.

### Validation and publication decision

Workbench #575 owns the UI workflow. #436 continues to own authenticated principal resolution; no
acting identity is invented here. Gateway/Core retain source validation, persistence, replay,
duplicates, lineage, and durable-job authority. Focused domain/API/integration proof and isolated
desktop/narrow browser evidence cover blank first paint, exact validation, review-only submission,
edit invalidation, same-intent retry, blank row creation, file parse-before-publish, replacement-file
retirement, complete source-count proof, focus movement, compact record drilldown, and no overflow.
Issue #579 additionally proves that draft fields, task changes, row operations, file replacement,
edit, and duplicate publication remain unavailable while a source write is unresolved, without
hiding the reviewed request or presenting success before source confirmation.
Issue #581 proves the operational file path above, at, and below the ten-record page boundary. Its
isolated production-browser proof covers desktop, tablet, and narrow viewports; keyboard paging;
bounded rendered-card count; independent family state; exact source order; and one complete
Gateway-envelope publication containing every imported row.
Repository context, historical RFC truth, review ledgers, and Supported Features change in the same
issue and must be published from main after merge.

## Cross-screen exclusive choices and true tabs

### Business job

Advisors and portfolio specialists repeatedly change period, basis, grouping, chart, and review
dimension without leaving the current analytical task. Those controls must be dense and fast while
remaining predictable to keyboard and assistive-technology users. A genuine tab is different: it
navigates among named content panels within one contribution-detail region.

### Standards research

Research was reviewed on 2026-08-10 from primary design-system and accessibility sources:

1. [W3C ARIA APG tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) defines a tab as a control
   associated with a `tabpanel`, with one tab stop and arrow/Home/End navigation.
2. [W3C ARIA APG radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/examples/radio/)
   defines one-of-many selection through `radiogroup` / `radio`, roving focus, arrow navigation,
   and checked state.
3. [IBM Carbon content switcher](https://carbondesignsystem.com/components/content-switcher/usage/)
   distinguishes alternate views or filtering of related content from tabs that organize distinct
   content sections.
4. [IBM Carbon tabs](https://carbondesignsystem.com/components/tabs/usage/) reinforces tabs as
   navigation between related content panels and a single keyboard tab stop.

These sources inform semantics and interaction behavior only. Lotus retains its own visual system,
business vocabulary, supported controls, and source-backed workflow boundaries.

### Adopted decisions

1. Period, basis, dimension, grouping, horizon, and visualization choices use the shared
   `WorkbenchChoiceGroup` radio-group contract.
2. Each group has one tab stop; arrow keys wrap across enabled choices; Home and End select the
   first and last enabled choices; disabled choices remain discoverable but cannot activate.
3. Performance contribution detail alone keeps `ModeTabs`, because each choice controls a stable,
   labelled tab panel.
4. Shared interaction presentation is colocated with the design-system primitive; Portfolio and
   Performance own only bounded layout adaptations in feature CSS Modules.
5. Standard density retains a 44-pixel outer target; compact analytical toolbars retain explicit
   focus treatment and keyboard parity while preserving the dense workstation rhythm.

### Rejected decisions

1. Fake `tablist` / `tab` roles for controls that only redraw or filter one analytical surface.
2. A binary use of the choice group; binary states need a governed toggle or switch pattern.
3. Page-local copies of keyboard logic, selected-state CSS, or focus treatment.
4. A new component library or styling framework for an interaction already supported by React,
   semantic HTML, ARIA, and the Workbench token system.
5. Keeping dormant selector families as compatibility CSS after all production consumers have
   migrated.

### Validation and publication decision

Workbench #588 owns the migration. Focused component tests prove radio-group and true-tab semantics,
one tab stop, disabled-choice behavior, and source consumer updates. Portfolio cash-movement and
Performance contribution browser flows carry the representative production proof. This corrects
interaction semantics and CSS ownership without adding a supported business capability or changing
an operator procedure; repo-local wiki source is intentionally unchanged.

## Action-first Advisory Overview

### Business job

A relationship manager should open one portfolio, understand which visible proposal needs attention,
and move that recommendation through review, client discussion, and implementation without scanning
a second catalogue of every Advisory route. When Gateway returns a paginated source window, the
advisor must understand that visible counts and ranking are not complete book totals.

### Current-product research

Research was refreshed on 2026-08-10 from official product and accessibility sources:

1. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   organizes advisory proposal work from Identify through Construct and Deliver to Implement, with
   firm and client criteria, suitability checks, and whole-portfolio analytics embedded in the
   workflow rather than exposed as a route catalogue.
2. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   describes Book Insights, Next Best Action, advisor nudges, and flexible proposal generation as
   connected ways to surface accounts needing timely action and move them toward implementation.
3. [GOV.UK Complete multiple tasks](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/)
   recommends simplifying first, grouping related actions, using task-oriented labels, and exposing
   meaningful status when a journey genuinely spans multiple sessions.
4. [W3C WCAG 2.2 focus order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)
   requires sequential focus to preserve meaning and operability and recommends that focus reinforce
   the reading order implied by the visual layout.

These sources inform workflow hierarchy and interaction semantics only. Lotus retains its own visual
system, source contracts, private-banking language, lifecycle authority, and control boundaries.

### Adopted decisions

1. Make the current advisor decision and source-backed worklist the operating centre of the screen.
2. Keep `PortfolioScreenRail` as the single owner of route navigation; replace the duplicate
   Advisory Journey catalogue with one compact lifecycle posture.
3. Use Identify, Construct, Review & discuss, and Implement as business handoffs. Identify links to
   the source-backed Ideas workspace without inventing a count; the other stages count only mapped
   proposal states visible in the current Gateway window.
4. Request eight proposals per source window, rank only within that window, expose explicit
   previous/next controls, and keep the workflow context partial whenever a continuation or earlier
   window exists.
5. Publish loading, permission, unavailable, refreshing, refresh-failure, empty, partial, and ready
   source posture through existing reusable Workbench state and workflow-context contracts.
6. Remove the redundant portfolio column from the portfolio-scoped table and convert rows into
   labelled review cards at compact width while preserving one semantic table DOM.
7. Keep stable browser evidence contracts on the workspace, lifecycle summary, worklist, and source
   window rather than coupling validation to one complete sentence.

### Rejected decisions

1. A card for every Advisory destination: the persistent rail already owns navigation, and repeating
   it consumes the space needed for real work.
2. A fabricated Identify count, book-wide urgency score, SLA, recommendation, or proposal total:
   the existing Gateway list publishes proposal records and a continuation cursor, not those claims.
3. Treating the current page as the full portfolio or automatically traversing every cursor: both
   hide source scope and can make an incomplete worklist look clear.
4. A desktop-only wide table or duplicated mobile renderer: one semantic table becomes compact cards
   through the feature-owned CSS Module without page-level horizontal overflow.
5. Moving proposal fetching into the shell or silently selecting a row for the context rail: the
   owning screen publishes queue-level posture, while record-specific evidence remains behind an
   explicit proposal selection.

### Validation and publication decision

Workbench #591 owns this bounded screen slice. Focused model and integration tests cover priority
ordering, lifecycle mapping, complete and partial source windows, source failure, and permission
boundaries. Isolated Playwright proof covers 1440, 1024, and 519 pixel widths, explicit cursor
navigation, duplicate-catalogue absence, stable evidence ids, and zero page-level horizontal
overflow, with captures under `output/issue-591/`. The change uses the existing Gateway proposal
contract and does not change supported capability or operator procedure, so repo-local wiki source
is intentionally unchanged.

## Decision-first Proposal Review And Progressive Evidence

### Business job

An advisor reviewing a proposal needs to establish what changed, understand the portfolio impact,
resolve the next governed review step, and prepare an advisor-use narrative or memo without losing
source evidence. Audit and lineage material must remain available, but it should not force the
advisor to read implementation vocabulary or traverse every historical record before making the
current decision.

### Current-product research

Research was refreshed on 2026-08-10 from official product, service-design, and accessibility
sources:

1. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   connects portfolio construction, risk analytics, suitability controls, and proposal delivery in
   one workflow, supporting a decision hierarchy rather than a catalogue of disconnected evidence.
2. [BlackRock governed AI commentary](https://www.blackrock.com/aladdin/discover/blog/ai-enabled-investor)
   frames generated commentary as a governed drafting aid whose traceability and human review must
   remain visible; Lotus therefore keeps narrative and memo work advisor-use and source-evidenced.
3. [GOV.UK Check answers](https://design-system.service.gov.uk/patterns/check-answers/)
   recommends grouping related information, making change paths explicit, and using the review
   screen to help a person confirm the material facts before submission.
4. [WAI-ARIA Disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)
   provides the keyboard and state model for evidence that remains available without occupying the
   primary decision surface.
5. [WCAG 2.2 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
   requires important success and error information to be programmatically determinable without
   moving focus, supporting a stable status region after source persistence and refresh.

These sources inform hierarchy, interaction, and evidence presentation only. Gateway and its source
services remain authoritative for proposal state, approvals, lineage, narrative, memo, delivery,
and action persistence.

### Adopted decisions

1. Give proposal identity and lifecycle one owner, followed by the next decision, current posture,
   proposed changes, allocation impact, and review gates.
2. Treat Narrative and Memo as peer review modes using true tabs with stable, mounted tab panels so
   switching modes does not discard in-progress advisor work.
3. Keep version, lineage, replay, and review history available through native progressive
   disclosure instead of permanently expanding technical evidence.
4. Settle primary proposal detail independently from workflow, approval, and lineage reads; retain
   usable source evidence and name each unavailable ancillary source rather than replacing the
   entire screen.
5. Translate source state, event, approval, and actor codes into business-facing vocabulary while
   retaining raw values only in bounded diagnostic or evidence contracts.
6. Announce action success only after Gateway persistence succeeds and detail, workflow, approval,
   and lineage posture refresh coherently from source-owned responses.
7. Use stable semantic evidence (`role="status"` and a durable test id) rather than pinning browser
   proof to a complete sentence that product copy may legitimately refine.

### Rejected decisions

1. A cosmetic copy pass over the existing stacked layout: it would preserve duplicated hierarchy
   and all-or-nothing failure behavior.
2. Hiding audit evidence entirely: bank-operable review needs source traceability even when that
   material is secondary to the advisor decision.
3. Optimistic success after the mutation alone: accepted persistence without refreshed proposal
   posture is insufficient user-visible proof.
4. Inventing client, advisor-role, suitability, approval, client-ready, communication, or execution
   authority in Workbench; the production principal boundary remains governed by #436.
5. Adding a new styling framework, tab library, or Gateway shape when existing Workbench primitives
   and source contracts support the required behavior.

### Validation and publication decision

Workbench #593 owns this bounded slice. Focused unit and integration proof covers business
vocabulary, true-tab semantics, closed-by-default evidence, ancillary-source degradation, action
success after source refresh, safe mutation failure, refresh-failure success suppression,
duplicate-command fencing, and proposal-identity reset. Isolated Playwright proof covers source
partial, source-refreshed success, safe failure, keyboard tab focus, reduced motion, 1440, 768, 640
(a 1280-pixel browser at 200% reflow equivalent), and 519 pixel widths, stable status and disclosure
evidence, the persistent action path, and zero page-level horizontal overflow, with captures under
`output/issue-593/`. The change uses existing Gateway contracts and does not widen authentication,
client-release, or execution authority. Repo-local `wiki/API-Surface.md` changes because the
supported Proposal Detail operating and evidence posture changed; the README remains intentionally
unchanged because repository role, commands, and navigation are unchanged.

## Explicit Suitability Review Selection And Evidence Binding

### Business job

A client advisor, compliance reviewer, or supervisor works through every suitability policy
evaluation that needs attention for the selected portfolio. They must be able to choose a proposal,
confirm exactly which proposal version and evaluation the displayed evidence belongs to, identify
the current blocker and required next step, and request further evidence without acting on a
different record. The screen presents source-owned review evidence; it does not perform suitability
assessment or grant sign-off authority.

### Current-product research

Research was reviewed on 2026-08-10 from official regulatory, product, and design-system sources:

1. [ESMA MiFID II Article 25](https://www.esma.europa.eu/publications-and-data/interactive-single-rulebook/mifid-ii/article-25-assessment-suitability-and)
   requires suitability to be assessed against the specific client's knowledge and experience,
   financial situation, ability to bear losses, objectives, and risk tolerance. This makes
   recommendation-specific record identity material, not decorative metadata.
2. [FCA COBS 9/9A](https://handbook.fca.org.uk/handbook/COBS/9A.pdf) requires suitability assessment
   and reporting for the recommendation or portfolio management service. Lotus therefore keeps
   evidence visibly bound to one proposal version and one source evaluation.
3. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   places firm and client criteria, suitability and pre-trade checks, and whole-portfolio analytics
   inside the Identify → Construct → Deliver → Implement proposal workflow.
4. [Carbon Data Table usage](https://carbondesignsystem.com/components/data-table/usage/) uses
   explicit single-row selection when a user must act on one record and progressively discloses
   supporting detail.
5. [GOV.UK Task List](https://design-system.service.gov.uk/components/task-list/) pairs each
   actionable task with its status and makes the whole row an operable target, supporting a compact
   worklist before record detail.

These sources inform record selection, information hierarchy, and interaction only. Gateway and
Advise remain authoritative for policy evaluation, rules, requirements, workflow, sign-off,
client-publication posture, and persistence.

### Adopted decisions

1. Use an explicit single-record worklist with visible `Selected` text, selected styling that does
   not depend on colour alone, pointer selection, and roving Arrow Up/Down/Home/End keyboard focus.
2. Preserve an explicit evaluation across source reorder; visibly choose the first available record
   only when no explicit selection exists or the selected record leaves the queue.
3. Scope selected detail caches and mutation feedback by portfolio plus evaluation so a portfolio
   switch or late completion cannot publish a superseded record's posture.
4. Show proposal, proposal version, policy pack, current status, requirements, evidence posture,
   and next action in the worklist; repeat the selected proposal/version once as the detail-pane
   identity boundary.
5. Put the required next step, current policy posture, source evidence, blockers, sign-off package,
   and review SLA before secondary control and audit detail.
6. Keep dependencies, source references, and outstanding gaps available through native progressive
   disclosure.
7. Use a container-safe full-width worklist and evidence pane because the persistent navigation and
   context rail make the centre workspace narrower than the browser viewport.

### Rejected decisions

1. Silent first-row detail and action binding: source reorder can change the acting record without
   advisor intent.
2. A wide six-column queue table followed by a detached evidence panel: it obscures the selected
   relationship and relies on horizontal scanning at compact widths.
3. A two-column master-detail layout chosen only from viewport width: persistent Workbench rails can
   compress the actual content container even on a large desktop.
4. Card-per-fact dashboard composition: it gives every evidence field equal weight and delays the
   business decision.
5. Browser-owned suitability calculation, approval, waiver, client-ready publication, direct
   Advise calls, or production identity work.

### Validation and publication decision

Workbench #595 owns the slice. Focused selector, view-model, and integration proof passes 29 tests,
including selection across reorder and removal, second-record keyboard selection, record-specific
detail/package/workflow calls, record-specific evidence-request payload, late first-record response
abandonment, stale mutation-success suppression, and fail-closed mixed-source identity handling.
TypeScript and focused ESLint pass. An
isolated production-browser test on a dedicated port passes at 1440 and 390 pixels, proves the
second-record action, zero page-level overflow, and attaches desktop/mobile evidence under
`playwright-report/data/`. No Gateway contract changed. `wiki/Supported-Features.md` changes because
the supported Suitability Review operating behavior now includes explicit multi-record selection
and stale-completion fencing; README and operator runbooks remain intentionally unchanged because
repository role, commands, and runtime procedure did not change.

## PM Operating Quality Supervisory Record Context

### Business job

An investment-control supervisor reviews portfolio-manager quality runs, fairness evidence, and
recorded supervisory actions. They must be able to select the exact source record, compare its
business posture, inspect its evidence, and know that the support-summary, remediation, and summary
invocation commands will use that same record. Workbench supports the supervisory workflow; it does
not calculate PM quality, rank portfolio managers, make conduct or HR decisions, or initiate client
communication or investment execution.

### Current-product research

Research was reviewed on 2026-08-10 from official product and design-system sources:

1. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   describes connected data, centralized risk and oversight, and outlier monitoring across a book
   of business. Lotus therefore keeps source record identity and supervisory posture together.
2. [SAP Fiori worklist](https://experience.sap.com/fiori-design-web/worklist-sap-fiori-elements/)
   separates a task-oriented record worklist from the object page used to inspect and act on one
   selected business object.
3. [Microsoft list/details pattern](https://learn.microsoft.com/windows/apps/develop/ui/controls/list-details)
   keeps selection visible while related detail changes and adapts the composition to narrower
   content regions.
4. [IBM Carbon data-table usage](https://carbondesignsystem.com/components/data-table/usage/)
   requires explicit single selection when an action applies to one row and keeps action scope
   understandable.
5. [Fluent list usage](https://fluent2.microsoft.design/components/web/react/core/list/usage) and
   the [WAI-ARIA listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/) provide the
   selected-state, roving-focus, Arrow, Home, and End interaction model.

These sources inform workflow, information hierarchy, and interaction only. Gateway and Manage
remain authoritative for quality runs, fairness analyses, review actions, dates, policy posture,
reason codes, source references, and persistence.

### Adopted decisions

1. Put one compact supervisory record context before detail and command areas, with separate
   single-selection worklists for quality runs, fairness reviews, and supervisory actions.
2. Show business identity, status, as-of date, policy or target context, and the action relationship
   on each selectable record; keep the non-colour `Selected` state explicit.
3. Preserve an explicit selection across source reorder and fall back to the first available record
   only when the selected source record leaves the returned collection.
4. Load selected fairness and review detail through Gateway, fence late responses by request
   sequence and exact three-record selection, and suppress superseded completion.
5. Make the selected quality run and review action the only source for support-summary and summary
   invocation commands; make target type choose between the already-selected quality and fairness
   records rather than introducing a fourth id selector.
6. Remove duplicate record ledgers and id dropdowns after the reusable selection surface owns the
   relationship; retain segment and invocation-history tables because they answer different
   business questions.
7. Use a container-safe auto-fitting layout and colocated CSS Module so the centre workspace can
   reflow independently of the browser viewport and without adding global selector debt.

### Rejected decisions

1. Silent first-record projection, because source ordering can change without supervisor intent.
2. A disconnected dropdown-only context, because it hides the selected record's posture and next
   action while separating identity from evidence.
3. Keeping both the new worklist and the old ledgers/id selectors, because two selection models can
   disagree and add dead duplication.
4. A card mosaic or decorative dashboard, because this is a dense oversight workflow with a clear
   record-to-evidence-to-action sequence.
5. Browser-side PM scoring, fairness calculation, ranking, HR or conduct decisions, suitability,
   client contact, orders, OMS, execution, fills, or settlement.

### Validation and publication decision

Workbench #596 owns the slice. Focused selector, command-model, hook, view-model, component, panel,
and Gateway-create integration proof passes 63 tests, including second-record keyboard and pointer
selection, reorder and removal, selected-detail fetching, stale-response fencing, source date
binding, and second-record command payloads. TypeScript, targeted ESLint, CSS governance, diff
integrity, the optimized production build, all 25 routes, and portfolio-record bundle budgets pass.

Isolated production-browser proof against the process-owned PM-quality fixture confirms all three
second records can be selected independently, exactly three listbox options expose selected state,
Arrow Down moves focus and selection together, selected fairness and review detail reads return 200,
review readiness follows `pmq_fair_002`, summary readiness follows `pmq_run_002` and
`pmq_review_002`, and page-level horizontal overflow remains absent at 1440, 1024, and 390 pixels.
The only fixture console error is the deliberately unsupported platform-capabilities preload; the
touched PM-quality requests and React runtime remain successful. Evidence is recorded under
`output/playwright/issue-596-pm-quality/`, including desktop, compact-desktop, and mobile captures.

The supported route and source contracts are unchanged. `wiki/Supported-Features.md` is updated
because the supported operating behavior now includes explicit multi-record supervisory selection,
record-bound detail and commands, and stale-completion fencing. README, runtime runbooks, central
context, and skills remain intentionally unchanged because repository role, startup procedure,
cross-repository ownership, and governed delivery rules did not change. The exact-worktree
`make check` gate passes zero-vulnerability audits, CSS and architecture governance, ESLint,
TypeScript, 343 files and 2,002 tests at 91.57% statement/line coverage, the optimized 25-route
production build, and all portfolio-record bundle budgets. Protected CI, merge, exact-main, and
wiki-publication evidence remain required before closure.

## PM Operating Quality Post-Persistence Record Continuity

### Business job

After recording a fairness review or supervisory action, an investment-control supervisor may need
to compare it with another source record and return to it immediately. The confirmed record must
remain available during the short interval before Manage's canonical list refresh includes it.

### Current-product research

Research was reviewed on 2026-08-10 from official engineering sources:

1. [React state structure](https://react.dev/learn/choosing-the-state-structure) recommends avoiding
   duplicated state that must be synchronized. Workbench therefore keeps the returned source
   response and derives the combined selector projection rather than copying fields into a second
   browser-owned record.
2. [Apollo Client mutation guidance](https://www.apollographql.com/docs/react/data/mutations)
   documents the broader create-mutation problem: a returned entity is not automatically present
   in an already-loaded list. Workbench adopts the identity-based projection principle without
   introducing Apollo or a new cache dependency.

### Adopted decisions

1. Retain every successful Gateway/Manage response by source identity until the owning list carries
   it; never create an optimistic or synthetic PM quality record.
2. Compose selected detail, preview, canonical list, and retained persisted response at the shared
   view-model boundary so both fairness and review-action selectors use one rule.
3. Deduplicate by Manage-owned fairness-analysis or review-action identity.
4. Put retained projections after the canonical list so refreshed source facts supersede them
   without duplicates, then retire every temporary response whose source identity is present;
   preserve exact selected detail when the supervisor is actively inspecting that record.
5. Prove two consecutive persists, select-away, reselect, canonical refresh, and source supersession
   below the browser layer so the lifecycle cannot regress behind a visually plausible selector.

### Rejected decisions

1. Fabricating a browser record from the create request, because source persistence and returned
   facts must be confirmed first.
2. Mutating the parent response object, because it blurs source ownership and creates synchronization
   debt.
3. Adding Apollo, TanStack Query, or another cache framework for this bounded state-composition gap.
4. Clearing the retained response merely because another record is selected, because that recreates
   the observed workflow break.

### Validation and publication decision

Workbench #603 owns the slice. The Gateway contract, supported-feature scope, visual composition,
operator procedure, README, wiki source, central context, and skills do not change. Focused and
aggregate evidence were green before exact-head review: the retention model and hook passed 31
focused tests, and the
exact-worktree `make check` passes 343 files and 2,007 tests at 91.58% statement/line coverage plus
the optimized 25-route build and bundle budgets. Exact-head review then strengthened the model from
one retained response per family to identity-keyed collections. Revised proof passes 32 focused
tests and React Compiler lint. Two refreshed aggregate runs each passed 2,007 of 2,008 tests but hit
the unrelated load-sensitive DPM-wave timeout tracked by #585; its exact test passes three isolated
runs. Fresh protected CI, exact-main proof, issue closure, and branch hygiene remain required before
closure.

## Proposal Detail Identity-Owned Local State

### Business job

When an advisor moves between proposals, every local review mode, disclosure, version lookup,
mutation message, and pending operation must belong to the selected proposal. Returning to a
proposal must not expose a completion message from an earlier mounted workspace, even when the
source operation itself finishes successfully.

### Current-practice research

Research was reviewed on 2026-08-10 from official React guidance:

1. [React `useRef` guidance](https://react.dev/reference/react/useRef) requires components to avoid
   reading or writing refs during render except for predictable initialization. A ref that tracks
   the latest proposal id during render is therefore not a safe identity boundary.
2. [React guidance on avoiding unnecessary Effects](https://react.dev/learn/you-might-not-need-an-effect)
   recommends resetting all state for a changed conceptual entity by giving the inner component a
   key, rather than rendering stale local state and resetting it in an Effect.
3. [React state identity guidance](https://react.dev/learn/preserving-and-resetting-state) explains
   that a changed key creates a distinct component identity and resets the complete descendant
   state tree. This matches Proposal Detail's proposal-owned local state model.

### Adopted decisions

1. Keep the exported `ProposalDetailView` as a small proposal-identity boundary and render the
   stateful workspace with `key={proposalId}`.
2. Let React discard the complete previous workspace atomically instead of coordinating ten local
   setters and three operation refs after render.
3. Preserve the established Gateway query keys and source-owned action confirmation. Keep the
   proposal-scoped source-refresh generation in the application-owned query client above both the
   keyed presentation workspace and detail-route lifetime, so a version persisted for proposal A
   remains the authoritative query generation after A→B→A and Detail→Queue→Detail journeys.
   Keying the presentation workspace does not fabricate success or cancel a persisted source action.
4. Prove A→B→A transitions for both lifecycle actions and version lookups so an old mounted
   instance cannot publish success, error, or loaded-version presentation into a new instance.
5. Synchronize tests to the business-ready control state, not merely the presence of a rendered
   button, and resolve deferred source completions inside React's observable update boundary.

### Rejected decisions

1. Moving the proposal-id ref write into an Effect, because the ref and local state would still
   have separate identity ownership and the first render would still carry the previous workspace.
2. Dispatching one reducer reset from a proposal-id Effect, because it still renders the prior
   proposal's local state before the reset and adds an avoidable cascading render.
3. Keeping per-operation expected-proposal checks as the primary fence, because duplicating identity
   checks across every future local operation is easier to omit than owning identity once at the
   workspace boundary.
4. Changing business copy, layout, Gateway contracts, or source confirmation behavior for a
   compiler/lifecycle correction.
5. Resetting the query refresh generation with presentation state, because React Query can retain
   the superseded generation as fresh for 30 seconds and an A→B→A journey could then render the
   earlier version. Invalidating only the old cache was also rejected because retaining the small
   proposal-scoped generation in the existing application query-cache owner makes the current
   source evidence explicit and avoids an unnecessary return-navigation refetch.

### Validation and publication decision

Workbench #600 owns this slice. Exact-main React Compiler proof reported two errors: a render-time
ref write and a synchronous multi-state Effect reset. The keyed boundary removes both; focused
compiler lint and normal touched-file lint pass, and the Proposal Detail integration suite passes
28/28 with explicit transition, stale-action, stale-version, refreshed-version continuity across
both proposal and route lifetimes,
action-lock, degraded-source, and failure proof and no React `act` warnings.

The visual composition, user-facing language, supported feature set, Gateway/OpenAPI contract,
runtime topology, operator procedure, README, and wiki source are intentionally unchanged. Existing
browser evidence for Proposal Detail remains representative, while protected CI and exact-main
validation remain required before closure. Existing frontend, review-ledger, and PR governance
already require identity fencing and outcome-based asynchronous proof, so no skill or context change
is justified by this bounded correction.

## Global Workspace Orientation

### Business job

A client advisor moving between allocation review, performance analysis, proposal work, and
cross-platform data-product discovery needs the shell to identify the current business workspace
without implying that a platform utility belongs to an unrelated advisory domain.

### Current-product research

Research was reviewed on 2026-08-10 from primary design-system and accessibility sources:

1. [W3C ARIA technique ARIA26](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA26) requires a
   visually identified current page to expose the same state programmatically with
   `aria-current="page"`.
2. [WAI-ARIA 1.3](https://www.w3.org/TR/wai-aria-1.3/#aria-current) defines the current item as one
   item within a related set; it is not a reason to select an unrelated item when the current page
   sits outside that set.
3. [Microsoft Fluent 2 Nav guidance](https://fluent2.microsoft.design/components/web/react/core/nav/usage)
   recommends brief, goal-oriented navigation labels and a selection indicator for the active
   destination, with roll-up only to a real containing category.
4. [Microsoft NavigationView guidance](https://learn.microsoft.com/en-us/windows/apps/develop/ui/controls/navigationview)
   keeps the selected item synchronized with the current route and permits one selected item or a
   real visible ancestor, rather than a fabricated neighboring destination.

### Adopted decisions

1. Resolve shell context through one typed route authority and let the existing shared
   `WorkspaceTabNav` render its accessible current-page state.
2. Match complete route segments so `/portfolio` may own `/portfolio/...` but cannot claim a
   sibling such as `/portfolio-old`.
3. Map Allocation to the Portfolio workspace and normalize the Performance `advisor-brief` alias
   through the same canonical mode authority used by the screen.
4. Classify Data-Product Discovery as a platform utility with no active advisor workspace. The
   Gateway `shell-bootstrap.v1` contract exposes Portfolio, Performance, Risk, Proposal, and
   Advisory only; the browser must not invent a sixth workspace.
5. Bind the checked-in screen registry to a table-driven route-context test so every route
   entrypoint has an explicit decision and new routes cannot silently fall through to Home.

### Rejected decisions

1. Page-local active-state exceptions, because they duplicate global route policy and drift as new
   routes are added.
2. Highlighting Portfolio or another visible workspace on Data Products merely to avoid an empty
   current state, because that misrepresents product ownership.
3. Adding a Data Products shell descriptor or changing Gateway capability truth without a supported
   backend product contract.
4. Plain string-prefix matching, because it accepts unrelated sibling paths and weakens orientation.
5. A new navigation component or CSS override, because the existing design-system primitive already
   implements the correct semantic and visual current state.

### Validation and publication decision

Workbench #609 owns the slice. Focused route and component proof covers all 21 checked-in route
entrypoints, canonical Performance modes and aliases, sibling-prefix rejection, exactly one current
Allocation workspace, and deliberate no-workspace Data Products posture. Responsive browser proof
passes at 1366 px, 1024 px, and 390 px on an isolated production server. Exact-worktree
`make check` passes zero-vulnerability audits, CSS and architecture governance, the screen-registry
gate, ESLint, TypeScript, 344 test files and 2,050 tests at 91.6% statement/line coverage, the
optimized 25-route production build, and every portfolio-record bundle budget.

No Gateway, OpenAPI, supported-feature, README, wiki-source, operator-runbook, central-context, or
skill change is required. Existing wiki screen descriptions already classify Allocation as a
Portfolio task and Data-Product Discovery as a cross-platform utility; changing them would duplicate
this architecture record rather than correct product truth. Repository engineering context is
updated because the reusable shell route boundary changed. Strict wiki parity remains `DiffCount=0`.

## Runtime Support And Bank Technology-Risk Baseline

### Business and engineering job

Bank architecture, cyber, operations, accessibility, and procurement reviewers need one truthful
runtime baseline that distinguishes implemented supply-chain and deployment controls from future
browser, licensing, capacity, availability, identity, and approval evidence. Engineers and coding
agents need the same boundary to prevent a moving toolchain or fashionable dependency from entering
a production-critical path without review.

### Primary-source research

Research was reviewed on 2026-08-10:

1. [Node.js release lifecycle](https://nodejs.org/en/about/previous-releases) recommends Active or
   Maintenance LTS for production. Node 22 remains maintained through April 2027.
2. [The Node 22.23.1 archive](https://nodejs.org/en/download/archive/v22.23.1) records bundled npm
   `10.9.8`, providing source evidence for CI/container package-manager parity.
3. [Next.js support policy](https://nextjs.org/support-policy) classifies 15.x as Maintenance LTS,
   so retention is currently supportable but must be time-bounded.
4. [npm package metadata guidance](https://docs.npmjs.com/files/package.json/) defines `engines`,
   `devEngines`, and package-manager metadata. These are defense in depth and need repository checks;
   `engines` alone is not a fail-closed enterprise control.
5. [Next.js browser requirements](https://nextjs.org/docs/pages/getting-started/installation#supported-browsers)
   provide framework floors. [MDN Baseline](https://developer.mozilla.org/en-US/docs/Glossary/Baseline/Compatibility)
   is useful for web-feature admission but explicitly does not replace accessibility, performance,
   security, device, or assistive-technology testing.

### Adopted decisions

1. Keep the mature current foundation and govern it; do not rewrite or upgrade merely to appear
   modern.
2. Pin protected CI to the same exact Node release as the digest-pinned container and use the npm
   bundled by that official release.
3. Preserve a Node 22/npm 10 developer compatibility range while making the protected build runtime
   exact and machine-checked.
4. Use immutable lockfile installation, exact Playwright, a repository-local browser CLI, and an
   explicit Chromium project.
5. Add an expiring machine-readable support policy to `npm run lint`, backed by tamper tests and
   buyer-facing documentation.
6. Describe standalone/service-owned state as replica-compatible architecture only. Keep browser
   breadth, load, horizontal scale, identity, availability, licensing, and bank approval as explicit
   non-claims until evidence exists.

### Rejected decisions

1. Moving immediately to Node 24 or Next 16, because current releases remain supported and a major
   upgrade without its own compatibility and rollback evidence would add risk rather than reduce it.
2. Treating a major-only CI selector as reproducible, because it can diverge from the container
   patch and bundled package manager.
3. Treating `engines`, `packageManager`, MDN Baseline, or framework browser floors as certification
   on their own.
4. Claiming a scalable production system from standalone packaging alone; measured multi-replica,
   failure, and capacity evidence is still required.
5. Closing #612 after this tranche; dependency inventory, license/admission policy, enterprise
   browser/accessibility proof, resilience decisions, capacity proof, and cross-functional review
   remain material.

### Validation and publication decision

Workbench #612 owns the broader certification and remains open. This first tranche is complete only
after focused tamper tests, TypeScript, lint, full repository gates, protected CI, exact-main proof,
wiki publication, and strict parity pass. The shared front-office runtime is intentionally untouched;
this slice changes build and governance controls rather than product or Gateway behavior.

## Proposal Builder Evaluation Navigation

### Business and engineering job

Client advisors need one coherent proposal-construction workspace: compose draft movements, request
source evaluation, inspect the result, then save a governed draft for downstream review. Navigation
must not imply that an unevaluated draft already has a separate portfolio-impact result.

### Primary-source research

Research was reviewed on 2026-08-11:

1. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   presents one guided journey from identification through construction, delivery, and
   implementation, with analytics and real-time checks inside construction.
2. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   integrates proposal generation, portfolio analytics, and suitability checks within the advisor
   workflow rather than treating an unavailable result as a destination.
3. [WCAG 2.2](https://www.w3.org/TR/WCAG22/) requires predictable navigation and meaningful
   keyboard/focus behavior.
4. [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages)
   supports announcing a successful asynchronous result without moving focus unexpectedly.

### Adopted decisions

1. Keep draft composition and Gateway/Advise evaluation in one Proposal Builder screen.
2. Render evaluation evidence only after the source call succeeds and announce it as a polite
   status update.
3. Describe a workspace as evaluated only after evaluation succeeds, not merely after creation.
4. Keep saving a governed draft dependent on a returned source proposal identity.
5. Record one canonical Proposal Builder browser check that includes source evaluation instead of
   counting the same route as two screens.

### Rejected decisions

1. A separate `#simulation` destination, because it had no route state, fragment owner, persisted
   run identity, or pre-result business content.
2. A fabricated empty simulation panel, because it would visually imply evidence before Gateway and
   Advise return it.
3. A Gateway or Advise change, because the existing contract already owns the required stateful
   workspace evaluation and handoff truth.

### Validation and publication decision

Workbench #608 owns this bounded correction. Focused proof must cover route taxonomy, evaluation
success and failure, result announcement, screen-registry reconciliation, canonical browser logic,
and desktop/narrow production-browser behavior. Repository context, the runtime runbook, the
business-facing screen catalogue, and the codebase review ledger change in the same slice. The wiki
source therefore requires post-merge publication and strict parity. Workbench #631 separately owns
portfolio-book and workspace-shell unavailable-versus-empty evidence and action gating.

## Proposal Builder Portfolio Evidence Availability and Recovery

### Business and engineering job

An advisor can construct and retain a proposal only when the workstation can distinguish a
confirmed portfolio posture from a source outage. Available or previously loaded holdings remain
valuable for diagnosis and drafting, but they cannot become current decision authority merely
because a browser fallback or manual cash field exists.

### Primary-source research

Research was reviewed on 2026-08-11:

1. [TanStack Query `useQuery` reference](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery)
   distinguishes initial load errors from refetch errors, returns the last successfully resolved
   data, exposes background fetching separately, and cancels a running refetch by default before a
   replacement refetch.
2. [TanStack Query background-fetching guidance](https://tanstack.com/query/v5/docs/framework/react/guides/background-fetching-indicators)
   separates the first hard-loading state from a background refresh indicator while retained data
   remains rendered.
3. [IBM Carbon empty-state guidance](https://carbondesignsystem.com/patterns/empty-states-pattern/)
   treats confirmed absence, first use, and system error as different contextual states and calls
   for plain-language recovery guidance when a related system cannot supply data.
4. [GOV.UK error-message guidance](https://design-system.service.gov.uk/components/error-message/)
   says service capacity or availability is not a field-validation error because the user cannot
   correct it through input.
5. [GOV.UK service-problem guidance](https://design-system.service.gov.uk/patterns/problem-with-the-service-pages/)
   requires clear service-problem copy, an actionable next step, and truthful explanation of what
   previously entered information remains available.
6. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   places portfolio analytics and checks inside a guided proposal-construction workflow, supporting
   evidence recovery in context rather than a disconnected technical-error destination.

### Adopted decisions

1. Use strict readers at this decision boundary while retaining tolerant readers for unrelated
   blank-safe screens; required book reads bypass browser module response reuse so intentional
   refresh reaches the BFF without a breaking global API behavior change.
2. Project both source queries through one pure, typed evidence model that reuses the shared query
   posture vocabulary and admits evaluation only from complete, usable, freshly confirmed data.
3. Keep book and workspace reads parallel so the evidence panel does not introduce a request
   waterfall.
4. Keep available or cached holdings and cash visible during partial failure or refresh failure,
   label their posture, and pause evaluation and handoff until a successful refresh.
5. Treat a returned empty positions array as a confirmed empty book. Never use source failure,
   malformed 2xx data, or `null` as equivalent empty evidence.
6. Allow advisor-entered cash to support an indicative scenario only; label it as manual and never
   use it to authorize a source-backed evaluation.
7. Provide an explicit module-level refresh, a polite status update, and stable machine-readable
   evidence state for browser proof without exposing technical status codes in primary copy.
8. Use the existing React Query, MUI, design-system components, CSS module, and governed tokens;
   this state correction does not justify another dependency or global style rule.
9. Size the dense action and order-entry controls from the centre workspace container rather than
   the browser viewport. Persistent navigation and workflow rails can leave a narrow usable column
   on a wide desktop, so component-owned container queries preserve the business workflow without
   leaking page-specific breakpoints into global CSS.

### Rejected decisions

1. Preserving the old `catch -> null -> []` chain, because it turns dependency failure into a
   credible-looking empty portfolio.
2. Attaching source availability to Portfolio ID, currency, or cash field validation, because the
   advisor cannot correct an upstream outage by editing those values.
3. Clearing cached evidence during refresh or refresh failure, because it discards useful context;
   retained evidence is instead qualified and prevented from authorizing action.
4. Letting one available source silently stand in for both holdings and cash, because a partial
   picture is not a confirmed proposal baseline.
5. Adding another cache library, global state store, polling loop, or Gateway contract solely for
   view-state projection already supported by the current Workbench architecture.
6. Blocking the entire Proposal Builder route when one source fails, because advisors can still
   inspect available context, adjust an indicative draft, and recover in place without fabricated
   decision authority.

### Validation and publication decision

Workbench #631 owns the implementation. Focused proof covers strict and tolerant API behavior,
every evidence state, empty-versus-unavailable semantics, cached refresh failure, explicit recovery,
action admission, and desktop/narrow browser behavior. Browser proof also asserts that the advisor
workflow and draft order blotter remain contained within their centre-workspace panels. Repository
context, research, and the review ledger change in this slice. No wiki source changes: #605 already
owns the dedicated Proposal Builder screen guide, and this correction does not change the screen's
business purpose, navigation, source authority, or supported action set.

## Proposal Builder Date-Consistent Portfolio Evidence

### Business and engineering job

An advisor must construct, evaluate, and retain a proposal against one identifiable portfolio
snapshot. Holdings and available cash can be individually valid yet collectively unsuitable when
they represent different dates, portfolios, or currency bases. Proposal Builder therefore needs to
show the requested advisory date beside the effective source date and withhold decision actions
until the source response matches the selected context.

### Primary-source research

Research was reviewed on 2026-08-11:

1. [TanStack Query query-key guidance](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
   requires every variable used by a query function to be included in its query key so differently
   parameterized results are cached independently and changes refetch the correct source data.
2. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   positions whole-portfolio views, portfolio calculations, suitability checks, and detailed
   analytics inside the proposal-construction journey from identification through implementation.
3. [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth)
   describes a connected advisor experience built on a common portfolio language and whole-
   portfolio evidence rather than disconnected product-level interpretations.
4. The current Gateway `PortfolioBookResponse` is the internal primary contract: one request accepts
   `as_of_date` and `reporting_currency` and returns portfolio identity, resolved `as_of_date`,
   summary cash, cash balances, allocations, and positions as one aligned book snapshot.

These sources inform query identity, evidence grouping, and workflow admission. Lotus does not copy
another product's layout, visual identity, wording, calculations, or unsupported capabilities.

### Adopted decisions

1. Request one combined Gateway portfolio-book snapshot for holdings and cash instead of merging a
   dated book with the undated workspace shell in the browser.
2. Include portfolio id, advisory as-of date, and selected currency in the query identity and the
   Gateway request.
3. Admit evaluation and handoff only when the returned portfolio id, effective as-of date, and
   portfolio currency match the selected context and both positions and summary cash are usable.
4. Display requested and effective dates as compact business evidence, with a stable machine-
   readable status for browser proof.
5. Keep previously confirmed evidence visible but non-authoritative during refresh or refresh
   failure; isolate differently dated responses by query identity so an older completion cannot
   replace the currently selected evidence.
6. Keep advisor-entered cash available only for indicative drafting when source evidence is
   unavailable; it never authorizes evaluation or handoff.

### Rejected decisions

1. Continuing the workspace-shell cash query, because it cannot be parameterized by the selected
   advisory date and creates two temporal authorities for one decision.
2. Comparing only request parameters while discarding response identity and effective date, because
   transport success does not prove that the resolved source snapshot matches the advisor's choice.
3. Inferring a missing effective date, portfolio id, currency, or cash total in the browser.
4. Clearing cached evidence or showing a blank screen during refresh; qualified evidence is more
   useful while actions remain paused.
5. Adding a new dependency, global state store, or Gateway endpoint when the mature Workbench stack
   and existing combined-book contract already support the required boundary.

### Validation and publication decision

Workbench #638 owns implementation. Focused proof must cover matching context, missing or mismatched
effective context, date changes, older completion ordering, cached refresh failure, source recovery,
and action admission. No wiki source change is required for this slice: the screen catalogue already
records the Proposal Builder route and its Gateway/Core/Advise ownership, while #605 owns the
dedicated business screen guide. Repository context and the codebase review ledger carry the new
one-snapshot source-authority rule without duplicating that technical detail into the catalogue.

## Proposal Builder Indicative Impact Currency Authority

### Business and engineering job

An advisor must be able to distinguish a coherent proposed-portfolio projection from a collection
of individually valid monetary inputs that use different currencies. A source book in SGD, a
proposal requested in USD, an advisor-entered USD cash movement, or a draft order priced in EUR
must not be added together or labelled as though an FX translation occurred. The workstation can
preserve those inputs for drafting and recovery without presenting a false whole-portfolio impact.

### Primary-source research

Research was reviewed on 2026-08-11:

1. [ISO 4217](https://www.iso.org/standard/64758.html) defines the three-letter alphabetic currency
   identity used in banking, trade, and automated systems. A currency label is therefore data
   identity, not visual decoration.
2. [IAS 21](https://www.ifrs.org/issued-standards/list-of-standards/ias-21-the-effects-of-changes-in-foreign-exchange-rates/)
   distinguishes functional, foreign, and presentation currencies and identifies the exchange rate
   and translation effects as substantive accounting concerns. Workbench does not apply that
   reporting standard directly, but adopts the relevant control principle: presentation in another
   currency requires an identified translation basis rather than relabelling.
3. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   places whole-portfolio analytics and checks inside proposal construction and describes a robust
   calculation engine using firm-supplied inputs. This supports keeping source and calculation
   authority behind the approved service boundary.

These sources inform evidence identity and workflow presentation only. Lotus does not copy another
product's layout, visual identity, wording, calculations, or unsupported capabilities.

### Adopted decisions

1. Project one pure, typed currency-admission model before building any combined monetary preview.
2. Keep the source book currency, requested proposal currency, each active cash-movement currency,
   and every active draft-order price currency explicit and machine-testable. A held-position
   reference price is derived from source-owned base-currency market value and quantity; an
   off-book reference price carries an advisor-visible currency field.
3. Render the current indicative totals and allocation table only when every included monetary
   context shares one confirmed ISO-style currency code.
4. When currency contexts differ or are incomplete, keep the source holdings, source cash, manual
   scenario cash, movements, and draft orders visible in their own declared context, but replace the
   combined projection with a business-facing unavailable posture.
5. Preserve evaluation and save admission independently; a read-only display correction cannot
   weaken the source-context gate.
6. Reuse the existing React, TypeScript, MUI, React Query, Zod, and CSS-module architecture. This
   correctness slice requires no dependency, global CSS, Gateway route, runtime, or topology change.

### Rejected decisions

1. Relabelling SGD source values as USD because the advisor selected USD in the form.
2. Applying a browser-owned spot rate, cached rate, static rate, or inferred rate/date/method.
3. Showing mixed monetary totals with a disclaimer; the number remains mathematically incoherent.
4. Clearing source evidence or draft inputs solely because the combined projection is unavailable.
5. Adding a new FX library or service call without a Gateway contract that owns conversion rate,
   date, method, source, and lineage.

### Validation and publication decision

Workbench #642 owns implementation. Focused proof covers matched source evidence, source/request
mismatch, conflicting cash-movement and priced-order currencies, missing or malformed source and
draft currency identity, base-currency price derivation, manual-only drafting, partial evidence,
cached refresh failure, and source recovery. The Proposal Builder browser proof uses stable
preview-currency attributes plus visible business copy. No wiki source change is required: the
screen's purpose, route, source owners, and supported actions remain unchanged, and #605 continues
to own the dedicated Proposal Builder business guide.

## Proposal Builder Additional-Cash Admission

### Business and engineering job

An advisor may want to test how a prospective contribution changes an indicative proposal, but the
assumption must remain distinct from source-owned portfolio cash. Blank and zero are valid business
choices: they mean the proposal uses no additional cash. A negative or malformed amount must remain
visible for correction, block evaluation and draft handoff, and never be silently coerced into a
different value.

### Primary-source research

Research was reviewed on 2026-08-11:

1. [BlackRock Aladdin Wealth proposal generation](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/proposal-generation)
   places whole-portfolio analysis inside proposal construction while retaining robust calculation
   and firm-input authority outside the visual shell. This supports treating additional cash as an
   explicit draft assumption rather than replacing the confirmed portfolio cash balance.
2. [BlackRock Aladdin Wealth market-driven scenarios](https://www.blackrock.com/aladdin/platforms/solutions/aladdin-wealth/making-of-a-market-driven-scenario)
   separates scenario assumptions from the portfolio being analysed. The relevant control pattern
   is the distinction between a modelling input and current source truth.
3. [W3C WCAG 2.2 error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)
   requires detected input errors to be identified and described in text.
4. [W3C form validation guidance](https://www.w3.org/WAI/tutorials/forms/validation/) and the
   [GOV.UK validation pattern](https://design-system.service.gov.uk/patterns/validation/) support
   preserving the entered value, showing a specific recovery message, and associating the error
   with the field.
5. [MUI Text Field guidance](https://mui.com/material-ui/react-text-field/) provides the existing
   accessible error and helper-text mechanism used by Workbench; no replacement component or
   dependency is required.

These sources inform the interaction and authority boundary only. Lotus does not copy another
product's layout, visual identity, wording, calculations, or unsupported capabilities.

### Adopted decisions

1. Use one pure, typed admission model for blank, zero, positive, negative, malformed, and
   out-of-range inputs; admit at most two decimal places, validate exact scaled minor units, and
   cap the range below the floating-point spacing boundary where adjacent cents stop being
   distinguishable. Recheck the completed current/proposed preview against the same boundary so
   source cash, positions, cash movements, or draft orders cannot push an individually admitted
   assumption into an unreliable aggregate. Preserve monetary inputs and cumulative arithmetic as
   integer minor units through the complete preview, then convert only final range-admitted values
   for presentation. Use the same proposal-money boundary for cash-movement field recovery, net
   cash display, preview arithmetic, and submitted decimal strings so no path applies a different
   rounding rule. Preserve the advisor's cash-movement decimal text through admission so
   over-precision cannot disappear during browser number conversion. Admit that precision
   independently of the impact panel's currency or other first blocker, and prepare every
   submitted cash-flow amount before creating a server-side workspace. Apply a documented
   nearest-minor-unit rounding rule only to derived indicative notionals from source-implied prices;
   quantity actions must not be rejected merely because an indicative multiplication produces a
   fractional cent. Reconcile cash from the rounded before/after position-value delta rather than
   rounding the position and trade independently, preserving the self-financing accounting identity
   across successive draft trades. The Zod schema, field recovery, and
   workflow-action gate consume the same model.
2. Treat blank and zero as explicit no-additional-cash assumptions while keeping source portfolio
   cash authoritative. Apply an admitted positive amount to proposed cash and proposed portfolio
   value only; current cash and current portfolio value remain the source-confirmed baseline.
3. Preserve malformed text for correction, provide a specific business recovery message, and keep
   both evaluation and draft handoff unavailable until the value is valid. Withhold the indicative
   projection as well; an invalid assumption must never be modelled or displayed as zero.
4. Use a text input with decimal input mode so wheel events do not change money and the browser does
   not discard malformed advisor input before Workbench can explain it.
5. Retain the governed React, Next.js, TypeScript, MUI, React Hook Form, and Zod boundaries. The
   correction adds no dependency, experimental framework feature, global CSS, Gateway route,
   runtime service, or deployment topology.

### Rejected decisions

1. Requiring a strictly positive amount, because a source-backed proposal does not require a new
   contribution.
2. Converting blank, negative, or malformed text to zero, because that hides operator intent and
   can enable an action with a value the advisor did not enter.
3. Checking only `Number.MAX_SAFE_INTEGER` after decimal conversion, because a large fractional
   amount may already have rounded before that check and even safe minor units can collapse when
   converted back to a large floating-point major-unit value. Admission preserves scaled units
   through the range decision, caps conversion where every adjacent cent remains distinct, and
   withholds any completed aggregate that crosses that boundary. The projection also retains minor
   units during addition and subtraction so cumulative rounding cannot pass a later range check.
4. Using native `type="number"` as the business validator, because it can discard invalid text and
   permits wheel-driven value changes.
5. Sending the assumption as portfolio cash or adding it to Gateway stateful input; the Gateway
   request continues to carry only the source-backed portfolio, date, and mandate identity.
6. Adding a form or money-input dependency for a bounded validation correction that the governed
   stack already supports.
7. Formatting submitted cash movements independently with `toFixed(2)`, because binary rounding
   can disagree with the preview's minor-unit admission and show an advisor a different amount from
   the value sent to the source workflow.

### Validation and publication decision

Workbench #639 owns implementation. Focused proof covers all admission states, aligned button
availability, explicit errors, recovery, positive-assumption impact, unchanged Gateway payload,
successful source-backed evaluation, and desktop/narrow browser behavior. No wiki source change is required: the route,
screen purpose, source owners, supported actions, and operator procedure remain unchanged, while
#605 owns the dedicated Proposal Builder business guide.

## Portfolio Review Selected-Portfolio Recovery

### Business and engineering job

An advisor opening Portfolio Review must be able to tell whether the selected portfolio is still
being confirmed, is ready for review, or is unavailable. A temporary source failure must not create
repeated background traffic, display a terminal failure while confirmation is still running, switch
to another portfolio silently, or offer a Retry control that does not actually contact portfolio
authority.

### Primary-source research

Research was reviewed on 2026-08-12:

1. [W3C status-message guidance](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)
   requires important loading, outcome, and error changes that do not take focus to be available to
   assistive technology. The relevant pattern is an announced state transition without disrupting
   the advisor's current context.
2. [W3C user-notification guidance](https://www.w3.org/WAI/tutorials/forms/notifications/) calls for
   concise, clear feedback and simple instructions that explain how an error can be resolved.
3. [GOV.UK error-message guidance](https://design-system.service.gov.uk/components/error-message/)
   distinguishes user-correctable input errors from service problems the user cannot fix and directs
   the latter to an explanatory state with useful next-step information.
4. [IBM Carbon notification guidance](https://v10.carbondesignsystem.com/components/notification/usage/)
   recommends concise, in-context, persistent feedback for task or system failures, with an action
   that clearly communicates the available next step.

These sources inform state semantics, accessibility, and recovery copy only. Lotus does not copy
another product's visual identity, layout, wording, or unsupported recovery behavior.

### Adopted decisions

1. Represent automatic selected-shell recovery as a visible loading state and show terminal
   unavailability only after the single request settles.
2. Keep one automatic request per selected portfolio source key. A changed key permits one fresh
   request; an obsolete or unmounted completion cannot publish workspace state or terminal metrics.
3. Keep terminal recovery persistent and in context. **Open My book** is the only action because it
   is the implemented path that re-establishes portfolio selection; no other portfolio is silently
   substituted.
4. Use a stable UI test id plus fixture-owned request count for browser proof. Product copy remains
   supporting evidence rather than the only automation contract.
5. Emit bounded panel-state events for the real automatic attempt and its attached ready or terminal
   outcome. Labels use static route/panel/operation/state vocabulary and never include portfolio,
   client, request, response, or screen content.
6. Reuse `ScreenStatePanel` and the existing Workbench observability contract. The correction adds
   no CSS, dependency, experimental framework feature, Gateway route, runtime service, or topology.

### Rejected decisions

1. Repeated timer or exponential-backoff retries during a persistent source outage.
2. A page-local Retry button without an explicitly implemented source-authority request.
3. Showing the unavailable workspace while the automatic request is still pending.
4. A transient toast as the only failure evidence, or moving focus merely to announce the state.
5. Duplicating the primary recovery action in the side rail or showing unrelated Performance and
   Operations links before the selected portfolio has been confirmed. The side rail may carry
   concise selection or support guidance without competing with the main action.
6. Putting portfolio ids, client ids, response payloads, or other high-cardinality context in metric
   labels.

### Validation and publication decision

Workbench #651 owns implementation. Deterministic promise tests cover the single-attempt limit,
source-key reset, stale completion, unmount, visible loading/terminal states, and lifecycle metrics.
The isolated production-browser fixture proves exactly one server read plus one bounded client
recovery read, stable terminal UI evidence, business copy, and the My-book handoff. The canonical
Portfolio Review screen guide changes because its state/recovery and validation truth changes; no
Gateway, API, OpenAPI, central platform context, or technology-stack claim changes.
