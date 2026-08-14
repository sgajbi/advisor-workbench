# Report Centre

Report Centre is the advisor's controlled workspace for preparing portfolio-review report data.
It supports one selected portfolio or the same approved setup across an explicit selection from
**My book**. A portfolio bundle creates a separate report outcome for each portfolio; it is not a
consolidated client, household, or book report.

## Current Scope

| Screen posture | Current truth |
| --- | --- |
| Canonical route | `/reports?portfolioId={portfolio_id}` |
| Navigation | **Reporting** in daily work within the shared portfolio context |
| Supported scope | One selected portfolio, or at least two active portfolios explicitly selected from the current source-backed advisor book |
| Evidence posture | Single-portfolio canonical runtime coverage plus production-browser bundle workflow and state-matrix proof; a multi-portfolio canonical seed remains required for certifying live bundle evidence |
| Primary next action | Review the report setup, submit it through Gateway, then monitor source-owned portfolio outcomes |

The portfolio-bundle option appears only when Reporting publishes the exact governed batch
capability and submission path. Development-configured caller context is bounded to explicit local
proof. UAT and production fail closed until an authenticated principal provides reporting and
advisor-book authority.

## Business Purpose

Report Centre helps an advisor answer three operating questions without moving between technical
service consoles:

1. Which firm-approved report setup is available for this portfolio context?
2. Should the setup be applied to one portfolio or to a deliberate selection from the advisor's
   current book?
3. Which separate portfolio reports completed, remain in progress, or need attention?

The workflow reduces repeated setup for periodic portfolio reviews while retaining per-portfolio
eligibility, lifecycle, failure, and support evidence. It does not combine clients or hide partial
completion behind one bundle-level success label.

## Who Uses This Screen

- **Client advisors and relationship managers** prepare a reviewed portfolio report request for a
  client meeting or periodic review and can repeat one setup across selected assigned portfolios.
- **Portfolio managers and investment specialists** use the same source-backed configuration and
  outcome evidence when supporting mandate reviews.
- **Operations and support teams** use the visible request, per-portfolio lifecycle, attempt count,
  and support reference to identify the affected report without treating the browser as the report
  worker or archive.
- **Product and demonstration teams** use the governed route and browser evidence to prove the
  workflow is Gateway-backed and state-complete.

These roles describe supported use, not production entitlement. Workbench does not infer team,
delegated, supervisory, household, or unrestricted book access.

## Workflow Position

1. Start from [Advisor Book](Advisor-Book-Workflow) or an established portfolio context.
2. Open **Reporting** and confirm the selected portfolio, business date, catalogue availability, and
   output readiness.
3. Choose **Selected portfolio** or **Portfolio bundle**. For a bundle, search and select at least
   two active portfolios returned by **My book**.
4. Choose the approved report, report date, optional reporting currency, sections, and available
   output.
5. Select **Review Request** or **Review Portfolio Bundle**. Material changes invalidate the review.
6. Submit the reviewed intent. Workbench shows acceptance only after Gateway accepts the request.
7. For a bundle, review the source-owned completion summary and every separate portfolio outcome.
8. Use **Create another report** only when a new reviewed request is genuinely required.

Client-ready publication, archive release, distribution, and communication are later lifecycle
controls and do not occur on this screen.

## Implemented Capabilities

- Presents Gateway-published report families, configuration fields, section choices, output
  readiness, audience, limitations, and supported submission mode.
- Preserves the current selected-portfolio workflow for one reviewed, idempotent portfolio-review
  request and recent report-data job history.
- Offers portfolio-bundle ordering only when the exact batch capability and route are published.
- Loads up to the first 100 source-ordered Advisor Book memberships for the business date, supports
  search by client, mandate, portfolio, or booking centre, and disables inactive portfolios.
- Requires at least two explicit selections. The current portfolio is included only when it is
  source-confirmed; Workbench does not turn a global catalogue into book membership.
- Incorporates the sorted portfolio selection into the reviewed submission intent, so membership,
  date, report, output, section, or currency changes require a fresh review.
- Submits one stable idempotency key for an unchanged reviewed intent and relies on Gateway to
  verify current membership and report eligibility again.
- Refreshes source-owned batch posture after acceptance and presents portfolio-report count,
  complete, in-progress, and attention measures plus each portfolio's lifecycle, attempts, and
  support reference.
- Presents recent request history as a comparison table at workstation and tablet widths, then as
  compact operational records at 760 pixels or narrower. Both presentations use the same
  source-backed row: report identity, report date, requested time, lifecycle, lifecycle explanation,
  and support reference are never removed for compact screens.
- Keeps the compact support reference behind a native keyboard and touch disclosure with a
  44-pixel target. The linear record avoids a nested horizontal hunt while the workstation table
  retains column comparison where there is sufficient width.
- Keeps loading, empty, restricted, degraded, unavailable, rejected, retryable, terminal, and
  partially complete states explicit.

## Decisions And Actions

| User decision or action | Required evidence or gate | Persisted business change |
| --- | --- | --- |
| Choose one portfolio or a bundle | Gateway-published submission capability; bundle also requires Advisor Book evidence | None; this changes the working setup |
| Select bundle portfolios | Active source-returned membership for the current business date | None; Gateway re-verifies on submission |
| Review the request | A valid report, date, output, sections, and eligible scope | None; Workbench records the exact browser intent as reviewed |
| Submit the request | The current intent must still match the reviewed intent | Gateway records the idempotent report request or batch |
| Refresh portfolio outcomes | An accepted batch handle | None; Workbench re-reads source-owned lifecycle truth |
| Create another report | A prior request has been accepted | None until the new request is separately reviewed and submitted |

The browser never converts a failed submission into accepted posture and never presents a
bundle-level acceptance as proof that every portfolio report completed. The completion measure
counts only source-confirmed successful portfolio reports; retryable, terminal, and cancelled
outcomes remain separate and never inflate completion.

## Information And Source Authority

| Business fact or action | Workbench boundary | Source authority |
| --- | --- | --- |
| Approved report choices, fields, sections, outputs, and submission modes | Validated and presented through the Workbench BFF | Gateway over Lotus Report catalogue and capability contracts |
| Advisor-book portfolio membership, active status, mandate, client reference, currency, and booking centre | Read through the Workbench BFF for selection; not reconstructed from the global portfolio catalogue | Gateway over Core `PortfolioManagerBookMembership:v1` |
| Single-portfolio report request and acceptance | Submitted only after exact intent review with a bounded idempotency key | Gateway and Lotus Report portfolio-review contract |
| Portfolio-bundle handle, materialized portfolios, item lifecycle, attempts, failure summary, and support reference | Submitted and refreshed through the BFF; no lifecycle is calculated from browser timers | Gateway and Lotus Report batch contracts |
| Recent single-portfolio report-data job history | Presented from the source response without implying archive or delivery | Gateway and Lotus Report job contract |
| Caller role and portfolio scope | Browser-supplied authority is removed; development context is server-configured and non-development fails closed | Governed Workbench runtime context, with Gateway as final authorization boundary |

Shared endpoint and ownership detail remains in [API Surface](API-Surface) and
[Integrations](Integrations).

## Screen States And Recovery

| State | What the user sees | Recovery posture |
| --- | --- | --- |
| Loading | Dedicated catalogue, book, job, or outcome loading evidence | Wait for the source response; no fallback catalogue or fabricated result is substituted |
| Ready | Approved choices, scope, complete request summary, review gate, and enabled actions | Confirm the portfolio/date context before review |
| Compact request history | One record per request with lifecycle first, both dates visible, and support detail on demand | Open **Support reference** with keyboard or touch; no request field is omitted from the workstation table |
| Empty catalogue | A source-confirmed absence of orderable reports | Do not submit; follow the first support step if reports are expected |
| Empty or filtered book | No assigned portfolios, or no portfolios matching the current search | Revise the search; an empty own book cannot be replaced with the global portfolio list |
| Restricted | A source or caller boundary prevents ordering | Verify governed role and scope; do not add browser headers to bypass it |
| Degraded or partial | Available evidence remains visible with source limitations | Use only evidenced portfolios and outputs; Gateway still fails closed on unverifiable membership |
| Submission not accepted | An explicit failure with the reviewed setup retained for controlled retry | Retry only the unchanged reviewed intent or correct the setup and review again |
| Partially complete bundle | Separate complete, in-progress, retryable, and terminal portfolio outcomes | Refresh outcomes; use the affected item's support reference if it remains unresolved |
| Outcome refresh unavailable | The accepted batch and its last source-confirmed output support posture remain visible, while current item posture is marked unavailable | Choose **Try Again** or **Refresh outcomes**; newer explicit source evidence replaces the retained posture, but absent evidence never implies support or completion |
| Portfolio context changed | The prior portfolio's pending catalogue, history, submission, and outcome results cannot publish into the new workspace | Continue in the selected portfolio context; return deliberately if the prior workflow still needs attention |

## Workbench Boundaries

Report Centre deliberately does not:

- create a consolidated client, household, relationship, or advisor-book report,
- infer book membership, eligibility, approval, suitability, or delivery authority,
- execute a report worker or let the browser define capacity, leases, retry policy, or materialized
  membership,
- render or download a governed PDF unless a future source contract explicitly supports it,
- publish to an archive, apply retention, release to a client, send a communication, or create an
  order,
- treat report-data completion as advisor approval, client readiness, archive publication, or
  delivery.

Technology certification, scalability, resilience, and dependency support remain centralized in
[Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support). This guide records
implemented behavior; it is not a claim of bank approval or competitor superiority.

## Adjacent Handoffs

- [Advisor Book](Advisor-Book-Workflow) supplies the source-backed own-book starting point.
- [Portfolio Review](Portfolio-Review-Screen-Guide) provides the selected mandate and attention
  context before report preparation.
- Performance, Risk, and Manage provide source analysis or workflow evidence that may inform a
  review; Report Centre does not recalculate their figures.
- Archive, advisor approval, client delivery, and communication stop at an explicit boundary until
  separately supported service contracts and screens exist.

## Evidence And Validation

- Contract, API, view-model, state, hook, BFF-route, and integration tests cover single and bundle
  success and failure paths, explicit review, idempotency, authority stripping, selection fencing,
  outcome refresh, and unsupported-action absence.
- `tests/e2e/report-centre-state.smoke.spec.ts` runs against a production Workbench build and proves
  recovery, restricted, empty, accepted, multi-portfolio outcome, keyboard, responsive-boundary,
  mobile, contrast, and horizontal-overflow posture. It directly proves recent-request lifecycle
  and support access at 1024 and 519 pixels, keyboard disclosure focus, a 44-pixel compact target,
  and no page-level horizontal overflow.
- Diagnostic browser captures are written under `output/playwright/`; they are not demo-readiness
  evidence.
- Canonical front-office validation uses `PB_SG_GLOBAL_BAL_001` for selected-portfolio reporting.
  Certifying the bundle in the canonical runtime also requires at least two source-confirmed
  memberships for the governed caller and business date.
- Use [Validation and CI](Validation-and-CI) and [Operations Runbook](Operations-Runbook) for the
  governed local and exact-main validation sequence.

## First Support Step

Read the visible state and affected lifecycle without copying client references, portfolio ids, or
payloads into a support channel. Retry one source read. If the state persists, record the business
date, single-or-bundle scope, lifecycle classification, item attempt count, and only the displayed
support reference, then follow [Operations Runbook](Operations-Runbook). Do not force recovery with
browser identity headers, direct service calls, worker controls, or a second changed submission.

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
- [Technology Risk and Runtime Support](Technology-Risk-and-Runtime-Support)
