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

### Publication decision

No repo wiki change is required for Slice 1. The slice changes composition and removes unsupported
client-side behavior; it does not add or change a supported feature, integration, operator command,
or published runtime contract.
