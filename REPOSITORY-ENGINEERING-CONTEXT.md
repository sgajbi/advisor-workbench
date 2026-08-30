# Repository Engineering Context

This file provides repository-local engineering context for `lotus-workbench`.

For platform-wide truth, read:

1. `../lotus-platform/context/LOTUS-QUICKSTART-CONTEXT.md`
2. `../lotus-platform/context/LOTUS-ENGINEERING-CONTEXT.md`
3. `../lotus-platform/context/CONTEXT-REFERENCE-MAP.md`

## Repository Role

`lotus-workbench` is the primary product UI for the Lotus ecosystem.

It owns the user-facing workflows for:

1. portfolio review,
2. performance review,
3. risk review,
4. advisory and proposal interaction surfaces,
5. evidence-oriented front-office workflows.

## Business And Domain Responsibility

This repository owns the product experience layer, not domain authority.

It is responsible for:

1. coherent front-office user experience,
2. truthful summary-first workflows,
3. drill-down and detail-on-demand behavior,
4. rendering gateway-backed data in a banking-grade product surface.

It should not invent unsupported backend behavior or bypass the governed gateway contract.

### BFF request-header authority rule

Every `/api/bff/**` request must enter Gateway through
`buildGatewayBffRequestHeaders(request.headers)`. The builder selects only the governed content,
idempotency, conditional/range, and validated correlation/trace headers. It discards browser
authorization, cookies, session material, forwarding aliases, caller identity, roles,
capabilities, service identity, principal status, and entitlement scope before overwriting the
default caller context from server configuration. Route-family adapters may narrow or replace that
server context; no adapter may recover browser authority. `npm run quality:bff-header-boundary` is
a syntax-aware CI backstop that blocks equivalent raw browser-header access, a missing builder, or
an empty scan in every checked-in BFF route; the closed allowlist is the runtime control. This rule
does not certify production identity; Workbench #436 remains the authenticated-principal owner.

### Risk Review source-authority rule

Risk Review presents exact Gateway/Lotus Risk measures, factual lifecycle and recovery state,
source supportability, coverage, and methodology. Its additive `mandate_comparison` is a
Gateway-owned projection of Manage-owned limits, review policy and lineage against exact Core or
Risk measures. Workbench renders source states, values, headroom, dates and reasons without deriving
universal severity, concentration, limit compliance, breach, or all-clear classifications from
browser-owned thresholds. When the comparison is absent, unavailable, partially supported,
date-misaligned, undefined, or missing a measure, keep that exact boundary visible. Never add a
local threshold, calculated headroom, traffic light, severity scale, or reassuring fallback.
Compare summary and concentration mandate identity only from their raw source fields before any
label or date formatting. A one-sided missing value or unequal value is a context conflict; a value
missing from both reads is insufficient evidence, not agreement. Unknown constraint or review-policy
states must remain visibly unavailable, and an absent review frequency must remain not reported.
Canonical proof must derive expected constraint keys and states from the exact Gateway responses;
never restore a hard-coded state list or browser-owned source precedence.

Shared proposal and advisory shells must remain neutral unless the owning workspace publishes a
typed source-backed workflow-context model. Queue-level context may summarize current source counts,
attention, and recovery posture, but record-specific KYC, suitability, approval, evidence, client
publication, or execution claims require an explicitly selected source record. Proposal simulation
has no persisted workflow authority until the approved service creates a draft.

## Current-State Summary

Current repository posture:

1. the platform is converging on a premium private-banking product experience standard,
2. `lotus-workbench` uses `lotus-gateway` as its primary backend contract,
3. the `Portfolio` and `Performance` surfaces are the most mature live workflows,
4. `/data-products` provides self-serve gateway-backed domain-product catalog, dependency, and
   live trust discovery for RFC-0088,
5. the Performance advisor-brief surface consumes gateway-backed workflow-pack run posture and RFC-0097 task-flow posture without synthesizing review state or lineage client-side,
6. `/intake` is the review-controlled Portfolio Intake workspace. It starts without a selected
   task or business defaults, treats portfolio creation, opening positions, transactions,
   instruments, price observations, and CSV import as independent requests, and submits only an
   explicitly reviewed payload through Gateway `/api/v1/intake/portfolio-bundle` via the Workbench
   BFF. Server-rendered task actions must remain natively disabled and the chooser must report busy
   until client readiness is committed; the first ready click must open the exact task without a
   second attempt. `tests/e2e/intake-first-action-readiness.spec.ts` owns desktop and 390px
   optimized-production proof for Create Portfolio and Import File. Material edits invalidate
   review. File selection parses locally and joins the same review
   boundary without mutating. Once publication starts, the reviewed payload and idempotency intent
   remain immutable until the source outcome returns: publication-affecting controls are natively
   disabled while the exact reviewed details and progress state remain visible. A source failure
   restores editing and exact retry against the same reviewed intent. Before validation and review,
   one typed domain boundary trims business strings and dates and canonicalizes governed currency,
   ISIN, and transaction-type codes. Review facts, the intent fingerprint, the Gateway payload, and
   receipt-count reconciliation therefore consume the same normalized projection; Workbench does
   not rely on undocumented source coercion. Operational file review is bounded without truncating
   the source request: record families stay collapsed until requested, each family materializes at
   most ten source-ordered records per page, and range, total, page, and keyboard navigation remain
   explicit. The complete normalized payload remains immutable and every source row is still
   published; pagination is a review projection, never a data limit. Workbench generates a bounded
   `X-Idempotency-Key` at review, reuses the exact reviewed payload and key after a failed identical
   attempt, and requires a valid
   Gateway envelope plus task-relevant `published_counts`, correlation id, and contract version
   before showing acceptance. Gateway/Core continue to own validation, duplicate/replay semantics,
   lineage, durable job truth, and downstream readiness. Workbench must not bypass Gateway, call
   `lotus-core` directly, infer activation/valuation/reporting readiness, or treat the browser key
   as source ingestion truth.
7. `/reports` is the Report Centre for one selected portfolio or an explicit portfolio bundle. It
   consumes the Gateway-owned report-ordering catalogue, submits a reviewed and idempotent
   single-portfolio request or batch, and shows recent report-data history or source-owned separate
   portfolio outcomes. Portfolio-bundle selection must come from the Gateway-backed Advisor Book,
   remain explicit and searchable, require at least two active memberships, and be described as
   separate reports rather than a consolidated client, household, or book report. Workbench may
   precheck selected ids against configured development entitlement, but Gateway remains the final
   caller, membership, and eligibility authority and Report owns materialization and item lifecycle.
   The sorted selection is part of the reviewed intent; a portfolio, date, selection, report,
   section, output, or currency change clears stale review and batch posture. One exhaustive
   screen-state projection owns the setup workspace and readiness rail so loading, restricted,
   unavailable, empty, reviewed, submitting, accepted, and not-accepted states cannot contradict
   each other or expose actions that source state cannot support. Acceptance ends the current
   reviewed intent, not the future reporting workflow. An advisor must explicitly start another
   report, preserve only valid setup, review again, and receive a fresh idempotency key for the new
   intent. Batch acceptance is not portfolio completion: refresh item lifecycle from Gateway and
   retain complete, in-progress, retryable, terminal, cancelled, and recovery posture separately.
   Fence catalogue, history, and submission publication by a monotonic workspace generation so an
   `A -> B -> A` navigation cannot make an obsolete completion current again. If batch outcome
   refresh is unavailable or returns no support posture, retain the accepted handle's last
   source-confirmed format support evidence; replace it only with an explicit newer source posture.
   Treat each portfolio, source date, and reporting-currency combination as a distinct render-owned
   Report Centre session: reset local configuration, selection, focus, and workflow state through a
   keyed boundary rather than synchronous reset Effects. Date changes initiated inside the session clear
   selection in the initiating event. Keep accepted batch handle, requested output formats,
   lifecycle status, and error together in portfolio-keyed React state; refs may fence obsolete
   asynchronous completions but must not provide render evidence. Advisor Book owns one bounded
   source retry to the last valid page before publishing ready state when a shrinking book makes a
   requested offset invalid.
   Recent request history keeps one source-backed row model across responsive presentations. Use
   the semantic comparison table when the Report Centre owns at least 54rem of content width;
   below that capacity, use the shared operational-record pattern so report identity, lifecycle explanation,
   report date, requested time, and keyboard/touch-accessible support reference remain discoverable
   without nested horizontal scrolling. Loading, empty, restricted, and error posture must remain
   explicit in both presentations. During background refresh, retain the last source-confirmed rows
   with one shared live status; never hide a business field merely to make a compact layout fit.
   Output readiness is source-owned by format; structured data may be ready while governed PDF
   creation is unavailable. Report-data completion does not imply archive, advisor approval, client
   delivery, or communication. The Workbench BFF strips browser reporting authority headers and
   derives development role and entitlement from server configuration; non-development environments
   fail closed until authenticated-principal resolution exists. Submission adapters send only
   source-published configuration fields; caller and correlation provenance belong in governed
   headers, not business `options`. Browser worker run-once, capacity, materialized membership,
   archive lookup, direct download, and distribution controls remain prohibited,
8. `/workbench/{portfolioId}` is the Manage workspace. It uses the same Workbench left rail as
   Portfolio, Positions, Transactions, Cashflow, Performance, and Risk, and it exposes focused
   Manage sub-surfaces through the `mode` query: overview, mandate, waves, construction, memory,
   reviews, proof, and quality. The route file remains orchestration-only; Manage workspace composition,
   mode navigation, and data fan-out live under `src/features/workbench/manage-workspace.tsx`.
9. Manage overview summarizes the Manage operating posture, while `mode=mandate` renders a focused
   Mandate Health surface from the RFC-0038 DPM command-center contracts exposed through Gateway
   `/api/v1/dpm/command-center`, `/monitoring/run-once`, `/exceptions`, and `/mandates*`.
   Workbench presents Manage-owned mandate health, source readiness, latest monitoring posture,
   active exceptions, exception-specific next steps, lineage, and health dimensions as one selected
   review-item workflow. Summary meters render only when Manage publishes a usable score; missing
   mandate attributes, scores, owners, actions, and evidence remain visibly unavailable rather than
   receiving Workbench defaults. Technical identifiers use progressive disclosure. Workbench does
   not calculate mandate health, infer readiness or priority from exception count, merge exceptions,
   attach book-level actions to an exception, generate remediation narrative locally, or call
   `lotus-manage`/`lotus-ai` directly. Overview must fail closed when the mandate risk profile or
   attention-window evidence is missing. A valid cursor-bounded exception view remains reviewable
   when more source rows exist. Identified rows under non-blocking but unconfirmed source
   supportability also remain reviewable only as a bounded partial view: show returned source-owned
   rows, label the visible count as a view rather than a total, and never promote an unconfirmed
   state to exhaustive or zero-attention posture. Queue and selected-detail visibility must use the
   same admitted evidence posture. Browser continuation reads use the BFF, retain the last confirmed view
   during failure, and fence response identity by portfolio, mandate, state, and requested cursor.
   Never fabricate an exception identity for selection. Governed unavailable risk-profile sentinels are missing
   evidence, not usable profiles: the business label and completeness decision must share one
   normalized availability rule. Overview must not default risk posture, claim zero exceptions,
   or advertise generated construction alternatives that it has not fetched. Lead with named
   evidence gaps and active attention before navigation. Reuse `WorkbenchTaskDirectory` when a
   screen needs a compact set of source-owned business handoffs; keep task title, purpose, source
   status, and action label together instead of recreating feature-card grids. Selected-portfolio
   rebalance posture requires an explicit structured portfolio id or portfolio-id collection on the
   wave record; never bind the first returned wave or infer membership from a wave or trigger id.
   Response-level wave supportability may supplement that selected row only when its `wave_id`
   matches the row; row fields take precedence and unmatched response evidence fails closed.
10. Manage `mode=waves` renders the RFC-0041 DPM rebalance-wave command-center panel through
    Gateway `/api/v1/dpm/command-center/waves*`, preserving manage-owned wave lifecycle, item
    state, source-readiness state, supportability, report-input refs, proof-pack refs, handoff refs,
    blocked actions, lotus-ai workflow-pack run posture, active Manage-owned campaign-definition
    list, bounded campaign-discovery posture, lifecycle-event evidence posture, preview-readiness
    posture, launch-history audit posture, selected-campaign workflow evidence and governed
    action posture, and
    `external_execution_claimed` posture. Workbench must not discover global campaign cohorts,
    calculate campaign membership or readiness, infer campaign lifecycle state, or operate
    campaign-definition upsert locally. Campaign retirement, supersession, approval, assignment,
    task, maker-checker, and launch actions must use the current typed Gateway contracts, remain
    bound to the exact selected campaign id and version, confirm only after Manage persistence and
    source refresh, and never imply trade, order, OMS, client-contact, or external-workflow authority.
    Rebalance context must use the loaded mandate type, portfolio currency, and wave as-of date or
    show an explicit not-reported value; never insert a default mandate or currency. Evidence copy
    must distinguish ready, not opened, not requested, pending, partial, blocked, unavailable, and
    unreported posture. Keep selected-wave readiness, action, and proposed changes before optional
    AI decision support and campaign administration in DOM, keyboard, and visual order.
11. Manage `mode=construction` renders the RFC-0039 DPM construction alternatives lab from Gateway
    `/api/v1/dpm/command-center/construction/alternative-sets*`. Workbench sends a stateful
    manage/core source selector through Gateway, preserves manage-owned alternatives,
    supportability, objective/constraint traces, and selected-alternative state, and must not build
    stateless source bundles, optimizer logic, prices, or selection truth in the browser.
12. Manage `mode=memory` renders the RFC40-WTBD-010 portfolio-memory panel through Gateway
    `/api/v1/dpm/command-center/portfolios/{portfolio_id}/memory` and bounded source-family
    posture through Gateway `/api/v1/dpm/command-center/portfolio-memory/search`, preserving
    manage-owned timeline order, event type counts, source systems, source-system/source-type
    facets, source refs, artifact refs, applied filters, reason codes, supportability state,
    support boundary, and content hash without reconstructing timeline nodes locally, querying
    source-owner stores, discovering the global portfolio universe, or running cross-app
    source-event search.
13. Manage `mode=reviews` renders the RFC-0042 DPM outcome-review panel from Gateway
    `/api/v1/dpm/command-center/outcome-reviews*`, preserving manage-owned expected-versus-realized
    dimensions, source lineage, source-owner/source-type facets, applied source-lineage filters,
    support boundary, supportability, report-input posture, AI-evidence posture, and
    Gateway-backed governed AI narrative requests without client-side outcome calculation or
    source-owner store querying.
    Manage-owned `client_communication_boundary` posture is rendered as a no-client-communication
    boundary when present; Workbench must not create client messaging, approval, delivery, or
    communication-audit workflows from outcome-review evidence.
14. Manage `mode=proof` renders the RFC-0040 proof-pack evidence panel from Gateway
    `/api/v1/dpm/command-center/proof-packs*`, preserving manage-owned proof-pack identity,
    section posture, content hash, source hashes, Markdown availability, report-input readiness,
    AI-evidence readiness, and governed PM memo workflow-pack posture without client-side
    proof-pack construction, hash generation, Markdown synthesis, report-input synthesis, or
    prompt construction. An outcome-review proof-pack reference is historical lineage only; it
    must not enable a proof-pack memo action unless a current Gateway proof-pack response also
    declares AI-evidence input available. Manage surfaces also preserve Gateway-provided
    proof-pack session state through one provider-owned reference shared by Evidence Pack, the
    evidence rail, and PM Copilot. When a source-confirmed pack is loaded or published in-session,
    Copilot action readiness, visible lineage, context identity, and request payload must all derive
    from that same resolved pack; no consumer may retain an older server-rendered pack identity.
    Manage surfaces also preserve Gateway-provided
    action-register supportability from the portfolio overview `rebalance_snapshot`; missing
    supportability is shown as unknown/N/A rather than as verified zero activity.
15. Manage `mode=quality` renders the PM operating quality governance surface from Gateway
    `/api/v1/dpm/command-center/pm-operating-quality/policies*`,
    `/score-runs*`, `/fairness-analyses`, `/fairness-analyses/{fairness_analysis_id}`, and
    `/fairness-analyses/preview`, `/review-actions/preview`, `/review-actions`, and
    `/review-actions/{review_action_id}`, `/summary-invocations`, and
    `/summary-invocations/{summary_invocation_id}`, with optional review-gated summary requests through
    Gateway `/score-runs/{score_run_id}/ai-summary`. Workbench renders Manage-owned policy,
    score-run, source-defined segment, fairness-analysis preview/create/list/detail,
    supervisory review-action preview/create/list/detail, summary-invocation preview/create/list/detail,
    source refs, reason-code, supportability, forbidden-use posture, artifact/hash posture, and
    Gateway/AI workflow-pack run posture
    without constructing prompts, calculating PM scores, discovering segments, calculating segment
    averages or governed spreads, inferring protected classes, ranking PMs, creating
    HR/compensation/conduct decisions, approving trades, contacting clients, routing orders, or
    claiming OMS/execution truth. Summary-invocation create is preview-gated, records only
    Manage-owned invocation evidence, and does not display or submit generated summary text,
    prompt bodies, model responses, PM rankings, client-contact instructions, order claims, or
    OMS claims.
16. Shared portfolio navigation is a product-shell responsibility, not a page-local styling
    concern. `PortfolioScreenRail` owns one dark, high-contrast context/navigation surface across
    Portfolio, Performance, Manage, Advisory, and Report Centre. The rail prioritizes five daily
    work domains—Portfolio review, Performance, Advice, Reporting, and Mandate management—then
    exposes the active specialist task and a grouped **All workspaces** directory without
    duplicating the current destination. When a workspace has modes, show the current workflow
    step first and disclose alternative steps on demand only when at least one alternative is
    genuinely actionable. Availability counts include actionable alternatives only; source-disabled
    entries may remain inside an open directory for orientation but cannot create the disclosure or
    inherit enabled pointer/keyboard affordances. An item without a destination or supported action
    also fails closed as unavailable. The global shell separately owns
    **My book** and the capability-backed workspace switcher; it must not repeat a visible feature
    catalogue, infer a role or entitlement in the browser, or make a capability-disabled entry
    actionable. Returning to **My book** preserves a valid active `asOfDate` review context.
    At stacked-shell widths the portfolio rail presents
    portfolio switching, the governed portfolio identifier, and the current business view as a
    compact header; the route list remains collapsed until requested, closes on Escape, and
    restores focus. The rail owns its internal spacing and must neutralize generic `Panel` padding
    rather than accumulating nested insets. Its compact-to-stacked transition follows the minimum
    width required by portfolio context, advisor-book context, current-view disclosure, gaps, and
    shell gutters; do not use device labels or clipping as breakpoint policy. Responsive changes
    require production-browser proof at 1440, 1024, 768, on both sides of the content-capacity
    boundary between 561 and 721 px, and 519 px, and must not hide source state or invent mobile-only
    behavior.
17. Global CSS ownership is governed by `docs/architecture/css-layer-governance.md`.
    `src/app/globals.css` is a composition entrypoint that imports token, base, Workbench shell,
    and legacy global layers from `src/styles/global/`. `npm run lint` runs the CSS global governance
    ratchet before `npm run lint:eslint`, and `make lint` delegates to the composed npm lint gate.
    Feature-specific selectors should migrate beside their React owner with a lowered baseline and
    a forbidden selector-prefix ratchet instead of growing `legacy-global.css`. In particular,
    `*.module.css` files are locally scoped owners, not uncounted global layers. The CSS governance
    gate discovers every module under `src`, counts bare and functional `:global` pseudo-class AST
    nodes so comments and attribute values cannot masquerade as escapes, allows zero new escapes by default, and
    requires exact per-file exceptions with no headroom. Invalid selectors fail closed. Lower
    `maxGlobalEscapes` in the same migration whenever an escape is removed; delete the exception at
    zero. Manage Review Evidence
    rail presentation belongs to `manage-evidence-rail.module.css`; do not restore its retired
    global class contract inside `manage-workspace.module.css`.
    `PortfolioScreenRail` owns its presentation in a colocated CSS Module; route shells own only its
    placement and must not reintroduce global or page-scoped rail color and spacing repairs.
    `WorkspaceMenuNav` owns its disclosure, list, active, unavailable, and compact presentation in
    its design-system CSS Module; `AppShell` owns advisor-book and capability-loading presentation
    in its shell CSS Module. Keep both out of `workbench-shell.css`, whose governed baseline is
    ratcheted to 885 lines after retiring the old tab-navigation selectors. Remove the complete
    `workspace-tab-nav*` family from legacy global CSS with the retired component and keep its
    selector prefix forbidden so dead compatibility styling cannot return.
    Nested analytical components must reflow from their own inline-size container when shell or
    sibling rails can materially change their usable width at the same viewport. Performance
    Drivers owns ranked-group and contribution-row reflow in colocated CSS Modules; do not restore
    its retired `performance-contributors-*` or `performance-contributor-bar-*` global selectors or
    replace the container contract with another outer-viewport breakpoint.
    `WorkbenchChoiceGroup` similarly owns exclusive one-of-many business choices with radio-group
    semantics, while `ModeTabs` is reserved for controls with associated tab panels. Their shared
    interaction presentation belongs in design-system CSS Modules; consuming features may own only
    bounded layout modules and must not restore retired segmented-control selectors globally.
    Projected Cashflow summary, chart-specific marks, projection scope, source note, schedule, and
    responsive rules belong to `portfolio-projected-cashflow.module.css`; shared Portfolio chart
    geometry and `AnalyticsTable` behavior remain separate owners. Do not restore
    `portfolio-cashflow*` selectors or app-shell repairs to governed global CSS.
18. `/suite` is a compatibility alias of the single canonical Home entry and owns no business
    surface. It must not regain hard-coded clients, portfolios, analytics, priorities, roles,
    workflow state, or technical policy diagnostics. The canonical Home currently routes to
    Portfolio Review; authenticated advisor-first Home composition remains governed by blocked
    issue #470 and must use supported source authority when that dependency is available.
19. the governed canonical runtime starts `lotus-core` with `DEMO_DATA_PACK_ENABLED=false` so the
    broad Core app-local demo pack cannot pollute `PB_SG_GLOBAL_BAL_001` evidence, and it starts
    `lotus-idea` by default because the opportunity mode depends on Idea-owned runtime posture.
    It also delegates isolated downstream-capacity resource construction and a single report-only
    submission probe to Idea-owned automation after Idea and Advise are ready. Workbench validates
    exact `/version` provenance and stores only source artifact paths, hashes, and non-certifying
    posture. It must not construct the resource directly, reuse the canonical client portfolio,
    expose resource identifiers or credentials, or interpret this integration proof as load, soak,
    capacity-certification, or supported-feature evidence.
    Canonical Idea seeding must bind its synthetic source observation and persistence identity to the
    fresh canonical run, then progress that exact persisted candidate through Idea's public
    lifecycle-transition contract before advisor-action proof. Retries within the run retain those
    identities; later runs must not reuse a previously converted candidate as a reviewable item.
    Source detail with complete tenant, book, portfolio, and client scope is the authority before and
    after each transition; reruns may skip only a state already confirmed there. Never infer
    readiness from queue inclusion, trust a generic replay summary without refreshed detail, or
    reproduce Idea lifecycle rules in browser code.
20. `/recommendations`, `/proposals`, `/proposals/simulate`, and `/proposals/{proposalId}` are
    active Gateway-backed advisory lifecycle surfaces. The advisory shell uses a governed journey
    model across overview, RFC-0026 advisor cockpit, RFC-0027 advisory copilot, RFC-0028
    bank-demo proof, opportunities, proposal builder, suitability, risk impact, approval queue,
    client discussion pack, and implementation follow-up
    so future screens can evolve like Manage modes instead of page-local route fragments.
    `/recommendations?mode=cockpit` renders Advise-owned cockpit action items, source evidence,
    supportability, meeting-preparation packets, and bounded advisor acknowledgements through
    Gateway advisor-cockpit endpoints only. Its BFF authority adapter strips browser-supplied
    identity, role, capability, tenant, legal-entity, principal-status, entitlement, browser
    authorization, browser cookie, proxy authorization, session id, and upstream-auth identity headers;
    rejects query/body authority; derives the development advisor from the server-side actor;
    verifies the selected portfolio against configured entitlement; and emits only the exact read
    or acknowledgement capability required by the allowlisted route. Non-development requests
    fail closed until the authenticated principal contract in Workbench #436 and platform #563 is
    implemented. Action, snapshot, preparation, and supportability queries form one advisor
    evidence posture: previously retrieved evidence may remain readable during confirmation, but
    Workbench must not publish it as settled or enable another acknowledgement until every required
    query settles. Any required refresh failure keeps the composite partial, and any permission
    denial hides the protected evidence. Action review uses one source-backed row model: a semantic
    comparison table is available only when the module owns enough width, otherwise complete
    operational records keep evidence and next business action together without horizontal
    hunting. Acknowledgement feedback is scoped to the exact selected action id, while conflicting
    actions remain locked until reconciliation settles. Cockpit summary, readiness, preparation,
    boundary, and support grids respond to available module capacity rather than assuming viewport
    width. The Cockpit uses the full main canvas rather than rendering the neutral proposal-context
    rail; unique source-and-scope truth remains in a reusable inline boundary before the action
    workspace. A Cockpit action may link to `/proposals/{proposalId}` only when Gateway/Advise
    supplies a valid proposal identity and that supported Workbench destination exists. Do not
    manufacture routes for policy evaluation, memo, report, execution, or other references. It
    must not reconstruct advisory policy semantics,
    clear blockers, infer client-ready release, contact clients, route orders, or call
    `lotus-advise` directly. `/recommendations?mode=copilot` renders Gateway-backed RFC-0027
    advisor-use copilot actions over Advise-owned proposal-version source projection, action runs,
    human review posture, unsupported-evidence posture, and blocked client-publication boundaries.
    Its BFF authority adapter strips browser-supplied reviewer, proposal, portfolio, tenant,
    legal-entity, role, capability, principal-status, authorization, cookie, proxy-authorization,
    session, and upstream-auth identity claims; resolves the action run through Gateway before
    review submission; applies only server-derived reviewer context; verifies the source-owned
    portfolio against the configured development entitlement; and forwards the source-owned
    proposal and portfolio identifiers needed by Gateway review authority. Unresolved or
    cross-entitlement run scope fails closed before the review mutation is proxied.
    AI-assisted or generated output must use the shared `AiAssistanceDisclosure` contract beside
    the affected output. Preparation method, output availability, source evidence, human review,
    client-use permission, and freshness are independent source-owned dimensions. Missing or
    contradictory provenance fails closed; request acceptance and technical completion never
    upgrade evidence, review, freshness, or client-use posture. Availability remains visible in the
    compact and expanded disclosure; superseded output is historical and client-use blocked, with
    source-published replacement lineage shown when present. Evidence counts include only trimmed,
    nonblank source references or usable displayed metrics; empty rule-based narrative carries zero
    evidence. Deterministic Workbench narrative must be identified as rule-based, and
    provider/model/run identifiers remain secondary support details. Performance Advisor Brief,
    Advisory Copilot, and the six DPM workflow-output families use this governed disclosure.
    Permitted-use labels are a closed, source-contract vocabulary. A consistent but unknown label
    is not an extensibility signal: it makes the result incomplete until Workbench deliberately
    adopts and maps the new business meaning. Eligibility is trusted only when the workflow surface
    restriction was explicitly applied; an allowed decision with `workflow_surface_applied` false
    is still fail-closed. Authorization is trusted only for the explicit `task_execution`
    capability; an allowed decision for a missing or unrelated capability is not reusable authority.
    Eligibility must identify `INTERNAL_SERVICE`, and authorization must identify the bound
    `trusted_http_header` source used by lotus-ai; missing or contradictory caller-identity posture
    is not reusable authority. Accepted, revised, rejected, and abandoned review states require
    source history, actor, event time, and a positive recorded-transition count before Workbench
    describes the review as recorded. A terminal state without that record remains client-use
    blocked and is disclosed as unverified. A `CLIENT_USE_APPROVED` label additionally requires an
    accepted or revised complete review record; a label cannot substitute for its audit evidence.
    DPM source responses must be normalized through `buildDpmAiWorkflowOutcome` and presented with
    `DpmAiWorkflowResult` beside the owning action. A persisted PM-quality summary invocation is
    audit evidence only unless its source contract independently proves returned output; request
    acceptance, invocation persistence, and runtime completion never imply available material.
    Stubbed workflow output is deterministic preparation, not AI-assisted preparation. Provider
    provenance is a closed semantic pair: `disabled` and `stub` require stubbed output, while
    `openai` and `local_openai_compatible` require non-stubbed live output. Missing, unknown,
    cross-record contradictory, or mode/stub contradictory provenance fails closed. The reusable
    `classifyAiProviderPosture` design-system primitive owns this vocabulary; both DPM workflow
    normalization and the Performance Advisor Brief presentation boundary consume it rather than
    defining family-local mode lists. DPM hides returned material and blocks client use across all
    six workflow families when the provider posture is untrusted. Performance Advisor Brief maps
    trusted deterministic posture to simulation, permits live posture only when its existing
    published generation-provenance threshold also passes, and otherwise presents partial or
    unavailable output with client use blocked. Gateway issues #528 and #529 own equivalent
    validation for DPM and Advisor Brief at the Experience API boundary; Workbench keeps this
    final-boundary defense rather than trusting duplicated-field equality alone. A source
    client-use approval remains blocked unless runtime redaction is explicitly active; a
    contradictory internal-scope limitation must never coexist with an approved client-use state.
    For DPM workflow output, transport success and inner runtime completion do not override the
    outer Manage supportability envelope. The family profile owns the exact Manage authority and
    live source states; missing, blocked, unsupported, partial, degraded, unknown, empty, disabled,
    or wrong-authority posture makes the whole output contract incomplete. Trusted live material
    also requires lotus-ai `runtime_enforced` mode, active runtime redaction, the
    `response_labeling`, `correlation_and_audit`, and `runtime_redaction_engine` controls, and an
    `ENFORCED_PASSTHROUGH` or `ENFORCED_REDACTED` disposition. Documented-only, blocked, degraded,
    missing, or contradictory safety evidence fails closed even when output labels agree.
    The inner workflow-pack `supportability_status` is also a closed
    `READY | ACTION_REQUIRED | HISTORICAL` vocabulary; missing or unknown values make the output
    contract incomplete. Review state is also closed and required, and `review_required` must agree
    exactly: every state except `NOT_REVIEW_REQUIRED` requires review. Missing, unknown, or
    contradictory review posture makes the output contract incomplete. When the outer
    supportability envelope publishes a proof-pack, wave, or score-run identity, it must match the
    business object requested by the caller; a ready authority for another object is not reusable
    support. Returned source-object identity governs adjacent review status, run ids, references,
    and errors as well as generated material. Never project workflow posture under a locally
    captured exception, wave, proof pack, outcome review, or score run unless the response itself
    identifies that same business object.
    A successful workflow must render its returned decision-support material, not only availability
    and audit posture. Keep the six family-specific source-field mappings declarative in the shared
    profile. The same profile is the single source for each family's default `requested_outputs`;
    every requested section must have an adopted business label so risk, control, governance, and
    operations content cannot be requested and then silently withheld. Render only adopted business
    fields with readable labels and bounded structure; keep technical hashes and raw keys out of
    primary material. An otherwise usable payload with no
    supported presentable field fails closed rather than claiming live but unreadable output.
    Presentable material also requires a source-completed runtime (including an intentionally
    historical superseded run); running and failed output stays hidden even when partial structured
    content and otherwise complete provenance are present. Traverse structured material with shared
    depth, container-item, and rendered-value budgets across both usability detection and business
    formatting; if any present adopted section exceeds a budget, the whole material contract is
    unavailable rather than silently dropping that section and trusting smaller siblings. Preserve
    opaque source, evidence, security, and artifact identifiers exactly in material values; humanize
    only presentation keys and values from explicitly recognized enum fields. Trust eligibility
    only when its independently published issuing service is `lotus-ai` as well as when the outer
    workflow envelope and data service agree.
    Treat every Gateway response as untrusted at runtime even when the API client exposes a typed
    contract. Presentation helpers must guard optional nested records and fail to an unavailable
    business state so contract drift cannot crash the owning workstation panel before shared
    normalization can disclose it. This includes every wave memo and operations helper that reads
    workflow status, run identity, or report-input identity; do not leave a parallel typed-only read
    beside a guarded helper.
    Every asynchronous workflow result, pending posture, error, and adjacent boundary must retain
    the portfolio and exact source-business-object identity that produced it. Filter state against
    the current source context, sequence overlapping requests so an earlier completion cannot
    replace newer evidence, and validate response identity before publishing state or continuing a
    dependent mutation. An effect-only reset is not sufficient because an older request can still
    complete after the reset. When a read precedes a side-effecting command, revalidate both the
    request sequence and current source-context key immediately before the mutation; filtering the
    eventual UI result cannot undo an artifact created for a superseded business object.
    A bounded automatic recovery lifecycle must also drive truthful rendered state: show loading
    while the real request is pending, publish a terminal unavailable state only after the current
    mounted source key settles, and expose a retry action only when that action deliberately
    re-contacts source authority. A ref-only guard can prevent a request loop but cannot by itself
    justify terminal copy. Emit lifecycle telemetry only for the actual deduplicated attempt and
    its still-attached outcome, using static bounded labels without business-object identity.
    Every DPM workflow-output boundary must also receive the business-object reference requested by
    its caller and compare it with the family-specific source input published by Gateway. Workflow
    pack, surface, and authority identity do not prove that a result belongs to the requested proof
    pack, wave, exception, outcome review, or score run. Owning-screen state remains bound to that
    source object and is hidden when a newly current object replaces it. Apply the same identity
    check before projecting adjacent status, review, authority, run, or supportability metadata;
    fail-closed material beside wrong-object posture is still wrong attribution. A newly selected
    source object may start its own request while an obsolete object's request is pending; the
    visible enabled state and the request guard must use the same source-bound predicate.
    When a newly published result receives keyboard focus, bind that effect to a stable source
    result identity. Rebuilding an equivalent view-model object during an unrelated owning-panel
    update must not steal focus from the advisor's current command.
    It must not construct evidence sections, prompts, guardrails, AI/model lineage, review state,
    policy semantics, client-ready release, client communication, order, fill, settlement, or OMS
    posture locally. The proposal builder sources positions and cash through
    Gateway/Core/Advise, lets advisors model buys, sells, off-book instruments, and cash
    movements, evaluates stateful workspaces through `lotus-advise`, and shows advisor-use
    allocation/readiness impact without sending UI-supplied positions or recomputing suitability,
    risk, performance, or execution truth locally. Proposal construction uses Gateway's combined
    portfolio-book response and `/api/v1/advisory-workspaces*`; do not reintroduce a Workbench
    `/api/v1/proposals/simulate` client or browser-built portfolio snapshot merely because Gateway
    retains that separate capability for other supported consumers. Proposal draft intent types
    belong beside the active draft model, not in a speculative transport builder. Treat the combined
    portfolio-book response as one holdings-and-cash authority. Its query and request identity must
    include portfolio id, advisory as-of date, and selected currency; evaluation and draft handoff
    are admitted only when the response returns usable positions and summary cash for the same
    portfolio, effective date, and portfolio currency. The evidence panel shows requested and
    effective dates and distinguishes a confirmed empty book from unavailable, incomplete, or
    mismatched evidence. Previously loaded evidence remains visible but qualified during refresh or
    refresh failure, while manual scenario cash, an initial failure, a mismatch, or a failed refresh
    cannot authorize action. Required book reads bypass the browser module response cache so an
    intentional refresh reaches the BFF; date-specific React Query identity plus the shared request-
    token boundary prevents an older response from replacing newer evidence. Do not reintroduce an
    undated workspace-shell cash merge, collapse failures to `null`, or fabricate empty-state success.
    Indicative draft impact has one explicit currency authority: source portfolio values, manual
    scenario cash, active cash movements, and draft prices must share the requested proposal
    currency before Workbench computes or renders monetary totals and allocation projections. When
    currencies differ or identity is incomplete, preserve the underlying source and draft records
    but withhold the combined projection until an approved source contract supplies conversion
    evidence. Workbench must not translate, relabel, or infer authoritative FX in the browser.
    Additional cash is an optional draft assumption, not a replacement for source portfolio cash.
    Blank and zero mean no additional cash. An admitted positive amount increases proposed cash and
    proposed portfolio value without rewriting current source cash or current portfolio value.
    Admit no more than two decimal places, validate scaled minor units before numeric conversion,
    and cap the range below the point where adjacent cent values stop being distinguishable;
    apply the same boundary to the completed current/proposed projection so source and draft
    aggregation cannot reintroduce rounding; preserve monetary arithmetic as integer minor units
    through the complete preview and convert only final range-admitted values for presentation;
    use the same proposal-money boundary for cash-movement field recovery, net display, preview,
    and submitted decimal strings so browser evidence and source intent cannot diverge; admit
    cash-movement precision from the preserved advisor-entered decimal text independently of
    currency posture and prepare all cash-flow actions before the workspace-creation mutation so a
    late conversion failure cannot strand a workspace; round only derived indicative position and
    trade notionals to the nearest minor unit so fractional source-implied prices do not block a
    valid quantity action, and derive trade cash from the rounded position-value delta so each
    indicative trade remains self-financing across one or many draft rows;
    negative, malformed, over-precision, and out-of-range values remain
    visible for correction and block both evaluation and draft handoff. Keep one pure admission
    model shared by schema validation, field recovery, and workflow-action availability; do not
    coerce invalid advisor input to zero, publish a zero-based indicative projection for it, or
    send this assumption as source-owned cash.
    Evaluation is an in-screen Proposal Builder
    result after Gateway/Advise success, not a separate journey mode or fragment destination. A
    created workspace must not be described as evaluated until the evaluation call succeeds and
    its response carries a non-empty source-owned `status` and `proposal_run_id`; a 2xx response
    without that usable evidence is an explicit, retryable evaluation failure and cannot authorize
    proposal handoff. Every fresh evaluation attempt clears prior result evidence first. The
    Proposal Builder is a long governed construction workflow: keep portfolio evidence, business
    inputs, indicative impact, and draft identity before final actions in DOM and keyboard order;
    use the shared workstation side-rail layout for persistent desktop controls and stack those
    controls at the exact 1200-pixel shell boundary. Fence evaluation and handoff as one source
    transaction family, keep their pending/failure/success evidence beside the actions, preserve
    portfolio scope in the queue handoff, and never let workflow-wide admission relabel a separately
    confirmed portfolio-evidence fact. Feature presentation belongs in a CSS Module; do not restore
    the superseded MUI action panel or add this workflow to global CSS.
    Approval Queue is an exception-led selected-record review desk over one cursor-bounded Gateway
    proposal window. Keep worklist selection and the selected proposal's source-supported stage,
    version, creator-record presence, recorded date, and next action visible together at desktop;
    stack them in the same document order for tablet, narrow, and zoomed layouts. Load detail,
    workflow, approvals, and lineage for the selected proposal only and reconcile the selected
    worklist portfolio/state/version, proposal identity, workflow state, and active version before
    publishing maker-checker posture. A refresh confirms only after the queue record and all four
    selected-evidence reads succeed and agree; transport success alone is not business confirmation.
    An empty approval
    register is unconfirmed requirements, not approval-not-required. Preserve source-window
    uncertainty, restricted/unavailable/conflict failure boundaries, and originating portfolio/mode
    in the detail handoff. Use the shared source-refresh lifecycle so compound-query failure,
    late-response fencing, confirmation, and conditional focus restoration remain consistent with
    Risk and Impact. Do not describe proposal stage as maker-checker proof, expose raw creator ids as
    human identity, invent owner/SLA/client/priority facts, fan detail reads across the worklist, or
    duplicate Proposal Detail's approval and evidence actions into the queue.
    The detail route records advisor-use narrative
    review and reviewed report-package requests through Gateway proposal endpoints only. It settles
    primary proposal detail independently from workflow, approval, and lineage reads, keeps
    available decision evidence visible when an ancillary source is unavailable, presents
    Narrative and Memo as peer advisor-review modes, and keeps technical audit history under
    progressive disclosure. A proposal action is confirmed only after Gateway persistence succeeds
    and the action-specific authoritative reads refresh coherently from source truth. Narrative
    review is confirmed from the current-version narrative read; delivery summary and events remain
    independent downstream package posture and cannot authorize review. Delivery history must be
    complete, chronological, uniquely identified, bound event-by-event to the active proposal
    version, and consistent with its final/latest record. A discussion-pack action is confirmed only
    when the latest report-request event carries the exact returned request identity. Compare
    source timestamps as strict zoned instants rather than raw strings: equivalent UTC and offset
    representations may confirm the same event, while invalid, zone-less, or fractionally distinct
    timestamps must remain unconfirmed. The route does
    not generate
    narrative, infer
    client-ready release, render reports, archive artifacts, contact clients, route orders, or call
    advisory/report/archive/render services directly. `/recommendations?mode=opportunities`
    renders the Gateway-backed Lotus Idea advisor review queue. The Workbench BFF strips browser
    Idea authority, authorization, cookie, proxy-authorization, session, and upstream-auth identity
    headers and applies configured subject, role, route capability, and complete tenant, book,
    portfolio, and client entitlement scope only in explicitly development-scoped
    `dev`/`development`/`local`/`test` runtime. Missing source-required scope must fail at the
    configuration boundary rather than surfacing as an apparently supported action that Idea later
    rejects.
    It fails closed before Gateway for an unset environment and every other environment until authenticated session principal
    resolution is available (platform #563, Workbench #436), consumes the
    `lotus-platform.bff-principal-session.v1` contract posture as non-certifying source-contract
    evidence, and rejects unallowlisted
    `/api/v1/ideas/*` paths before Gateway in every environment. The surface is limited to canonical `PB_SG_GLOBAL_BAL_001` until authenticated
    portfolio entitlement is available; it renders score, review posture, source-signal ids, reason codes,
    durable-storage posture, policy version, and
    supported-feature promotion posture, and links only to Gateway candidate detail. Candidate detail
    can record source-owned review actions, feedback, and bounded conversion intents through the
    Workbench BFF with server-derived authority and idempotency. Action reason codes use the closed
    Gateway/Idea vocabulary: the advisor chooses a business-labelled basis drawn from the selected
    candidate's source reasons, while Workbench adds the matching source-valid audit reason. A retry
    reuses the exact failed submission. Success requires an accepted or replayed source persistence
    receipt and completes only after source-owned detail and queue refresh; persistence and refresh
    failures remain distinct. The canonical browser validator proves those states through stable
    action test ids and `recorded-and-refreshed`, with product copy as supporting evidence rather
    than the sole assertion. Workbench must not synthesize
    review lifecycle or conversion state locally. It must not treat Advise draft proposals as sourced
    opportunities, rerank candidates, clone Idea scoring, infer downstream conversion, create
    proposals automatically, grant suitability or execution authority, or promote Lotus Idea as a
    supported Workbench feature before canonical browser proof, data-product certification, and
    `lotus-idea` supported-feature evidence exist.
    `/recommendations?mode=proof` renders Advise-owned RFC-0028 scenario and supported-claim
    posture through Gateway bank-demo proof endpoints only. It preserves source-owned
    classifications, blocked client-publication boundaries, and proof-handling rules without
    constructing proof packs, promoting client-ready release, approving sign-off, contacting
    clients, routing orders, or calling `lotus-advise` directly.
    The default `/recommendations` overview is an action-first queue over the Gateway proposal-list
    contract. `PortfolioScreenRail` is the single navigation owner; the overview may group visible
    source states into Identify, Construct, Review & discuss, and Implement handoffs, but it must not
    invent an Ideas count, book-wide priority, SLA, lifecycle completion, or downstream authority.
    Identify is an explicit handoff to the source-backed Ideas workspace, not a locally calculated
    proposal state. Proposal metrics, lifecycle counts, ranking, and workflow context apply only to
    the current source window. A continuation or earlier window keeps the overview partial and
    advisors move between windows explicitly before concluding the portfolio is clear. Initial
    proposal-list failure withholds the worklist; background failure may retain earlier evidence
    only under an unconfirmed posture. Keep the shared source-refresh action mounted, focus-stable,
    and duplicate-fenced while the same Gateway/BFF query identity settles. Announce source success
    only after a valid response replaces the failed or earlier evidence; permission blocks remain
    fail-closed and expose no retry. Keep the decision brief followed immediately by the proposal
    worklist in DOM, visual, and keyboard order; compact measures and lifecycle orientation are
    secondary. Proposal workflow-context models must explicitly classify responsive priority.
    Persistent context remains visible when the shell stacks. Supplementary context replaces its
    repeated decision/window panel with the source-and-scope boundary when the main workspace owns
    the same complete source-backed posture; use it only when no decision evidence is lost.
    `/proposals?mode=suitability`, `/proposals?mode=risk-impact`, and
    `/proposals?mode=discussion-pack` are focused
    lifecycle views over the Gateway proposal list contract; Workbench filters proposal lifecycle
    states for advisor navigation but does not calculate suitability, risk impact, consent, or
    implementation truth locally. Proposal queue counts apply only to the current Gateway source
    window. A non-null continuation cursor or an earlier visited window keeps the workflow context
    partial, and advisors move between cursor windows explicitly; Workbench does not traverse an
    unbounded proposal book or infer later-window contents. Suitability policy evidence remains
    readable during a background source refresh but is not labelled current until all active
    policy queries settle; a failed refresh retains prior evidence with an explicit partial
    posture. Proposal simulation publishes persisted workflow context only after the advisory
    handoff response returns a proposal id.
    Risk and Impact is a source-backed exception to the earlier filter-only posture: its worklist
    requests `RISK_REVIEW` through the Gateway proposal list and reads
    `/api/v1/proposals/{proposal_id}/risk-impact` for one selected proposal only. The browser uses
    the BFF, validates the full `proposal-risk-impact.v1` identity and capability registry, retains
    exact decimal strings, and never fans selected-detail calls across the worklist. Gateway owns
    the experience projection; Advise owns proposal, workflow gate, and lineage truth; Core or the
    bounded source-declared fallback owns allocation evidence; and the source-named risk service
    owns risk measures. Workbench may align returned current/proposed rows and draw
    non-authoritative relative bars, but it must not calculate allocation delta, risk, suitability,
    mandate compliance, approval, or execution posture. Keep selected identity fenced across
    portfolio, cursor-window, selection, refresh, and late response changes. Keep worklist before
    evidence in DOM order, use the shared lifecycle worklist, and reflow from the centre
    workspace's container width rather than viewport assumptions.
    Implementation Status is also source-backed: its cursor-bounded worklist retains handoff,
    completion, and exception lifecycle states and reads `proposal-implementation-status.v1` for one
    selected proposal only. Validate proposal, portfolio, state, version, status semantics,
    capability posture, freshness, and lineage before presentation. Advise owns advisory handoff and
    reconciliation; the named downstream provider owns execution truth. Keep order/fill/settlement
    detail explicitly unsupported, treat missing references as partial and historical-version
    evidence as distinct, and confirm refresh only after the list and selected record reconcile.
    Fence the visible worklist commit against a newer refresh, selection, portfolio, or cursor, and
    keep a retry action available when the list omits the selected proposal version. Drive the
    action and shared workflow rail from the complete worklist-plus-detail refresh transaction, not
    only the currently observed detail query. Treat a missing post-request handoff timestamp as
    partial evidence, reject request/downstream references for `NOT_REQUESTED`, and preserve focus
    across an unversioned-to-versioned recovery for the same selected proposal. Present supported
    status, version, event, evidence, next-action, and recovery language through the exhaustive
    `src/copy/proposal-implementation-copy.ts` authority. Lead with the implementation decision and
    keep contract, provider, request, event, correlation, downstream, and reason values in the
    progressive support disclosure. Because the selected-record panel owns the complete decision,
    use supplementary workflow context so the rail retains the source boundary without repeating
    status, version, timestamps, counts, and next action. Reflow facts and actions against the
    selected pane's inline size, not the outer viewport. Do
    not mutate implementation status or invent owner, SLA, priority, order, fill, allocation,
    settlement, custody, or accounting completion.
    Discussion Pack Review is source-backed conversation preparation, not a lifecycle label. Its
    worklist requests `AWAITING_CLIENT_CONSENT` through Gateway and reads
    `proposal-discussion-pack-review.v1` for one selected proposal/version only. Keep advisor
    narrative, advisor memo, report-package preparation, client consent, and client
    release/delivery as independent controls; an advisor-use artefact, package reference, consent
    record, or empty blocker list must never be promoted into client-release authority. Advise owns
    proposal, narrative, memo, policy, review, and consent evidence; Report owns the named package
    evidence; Gateway owns the strict experience projection. Label AI-assisted generation as
    provenance, not advice or approval. Confirm refresh only after the bounded worklist and exact
    selected evidence reconcile, fence stale selection/scope completions, preserve prior confirmed
    evidence under explicit refresh failure, and do not add publish, release, deliver,
    contact-client, consent, report-generation, or approval mutations to the screen.
21. Portfolio Income & Activity treats Gateway activity summary amounts as positive magnitudes.
    Workbench derives cash direction from the canonical bucket identity: `INFLOWS` increase cash,
    while `OUTFLOWS`, `FEES`, and `TAXES` reduce cash. Unknown buckets remain visible but must be
    excluded from classified net cash movement until the source contract defines their direction.
    Do not infer direction from amount sign, gross-sum activity magnitudes as net cashflow, combine
    income and tax rows into one event count, or infer source readiness from non-zero bookings.
    Its booked-record scope, classification-review posture, directional amounts, and exact-value
    table treatment are owned by `portfolio-income-activity.module.css`; the shared
    `WorkbenchSummaryMetricStrip` remains the only owner of responsive metric density. The owned
    `income-activity` browser scenario must use a contract-valid Gateway fixture, exact business
    values, raw-code absence, keyboard traversal, and 1440/1024/768/519 page-overflow proof. Do not
    return feature selectors to global CSS or let a generic smoke depend on arbitrary upstream data.
22. Portfolio Cashflow preserves the full Gateway projected-cashflow envelope and keys loading,
    ready, degraded, unavailable, retry, result, and export state by the explicit 10-, 30-, or
    90-day horizon. Workbench must not relabel one horizon's response as another or describe
    cumulative projected movement as opening cash, available cash, ending cash, liquidity
    sufficiency, funding capacity, or a recommendation. Source-backed zero movement is an explicit
    no-movement result; Gateway warnings, partial failures, correlation, contract version,
    projection dates, reporting currency, and booked/projected basis remain visible evidence.
    The selected-horizon controller belongs above both the movement module and record evidence rail;
    both must consume the same snapshot so a changed horizon cannot leave stale source posture
    beside current figures. Because each returned point is already a dated net value, the first
    scan separates total net movement, positive net movement, negative net movement, and the
    largest dated negative movement; it must not relabel those derived figures as gross inflows,
    gross outflows, sources, or uses. Current booked cash remains separate **Cash Position** context and
    must never be combined locally into an ending balance. Exact schedules use the reusable named,
    focusable `AnalyticsTable` scroll-region contract; feature layout remains owned by
    `portfolio-projected-cashflow.module.css`, not global CSS.
23. Portfolio reporting evidence must distinguish source readiness from generated output. Gateway
    reporting `READY` can be derived from reportable book coverage and does not prove that a
    reporting snapshot exists. Workbench may use `generated_at_utc` as generation evidence, but
    must derive timestamp, row explanation, badge, and tone from one typed posture so generated,
    source-ready but not generated, pending/partial, empty, stale/degraded, unavailable, failed,
    and unknown states cannot contradict one another. Do not treat `row_count` as a generation
    timestamp, leak unknown status codes into business copy, or invent freshness thresholds in the
    browser.

## Architecture And Module Map

Portfolio record tasks use a split composition boundary. `portfolio-record-screen-data.ts` owns
shared server-side portfolio selection and Gateway-backed record loading;
`portfolio-record-screen-shell.tsx` owns the shared business frame, navigation, evidence, and
degraded posture; and Allocation, Positions, Transactions, Cashflow, and Income each own a small
Client entry point that imports only that task workspace. Do not reintroduce a client dispatcher
that statically imports every record workspace. `npm run build` runs the deterministic
`quality:portfolio-record-bundles` gate after Next.js compilation and must keep AG Grid out of the
Cashflow and Income initial graphs while retaining it for the three grid workflows.

Position source status is projected through
`src/apps/portfolio/portfolio-position-state-view-model.ts`. Only an explicit normalized
`CURRENT` source value is positive. Missing position status is **Not reported**, any other
non-empty status is **Review required**, and Workbench-composed cash-balance rows are
**Not applicable**. The holdings grid, CSV export, and evidence rail must consume this shared
projection; do not infer current posture, expose arbitrary source codes as primary business copy,
or duplicate the mapping in components.

Transaction settlement posture is projected through
`src/apps/portfolio/portfolio-transaction-settlement-view-model.ts`. A non-empty source status
establishes applicability: normalized `SETTLED` is **Settled**, while any other reported value
fails closed to **Review required**. When status is absent, only
`FX_CASH_SETTLEMENT_BUY` and `FX_CASH_SETTLEMENT_SELL` are **Not reported**; other components are
**Not applicable**. Grid, summary, evidence, drawer, and CSV must consume this shared projection.
Do not treat every nullable lifecycle field as an exception, infer settlement success, leak raw
source codes into primary business copy, or duplicate the joint-field rule in components.

Primary areas:

1. `src/app/`
   Route mounting and Next.js app-router entrypoints.
2. `src/apps/portfolio/`
   Portfolio workspace.
3. `src/apps/performance/`
   Performance and risk experience surfaces.
4. `src/apps/recommendations/`
   Recommendation and proposal-oriented surfaces.
5. `src/design-system/`
   Shared product primitives and reusable presentation building blocks.
6. `src/shell/`
   Shared shell composition and application framing.
7. `src/features/report-ordering/`
   Report Centre contracts, Gateway client, source-safe configuration model, exhaustive screen-state
   projection, workflow state, and business-facing components.
8. `src/features/advisor-book/`
   Own-book contracts, fail-closed BFF authority, URL-persisted source filters, reusable loading
   state, business presentation, dedicated landing workspace, and task-preserving portfolio
   context switching over Gateway `PortfolioManagerBookMembership:v1` evidence. Requested URL
   controls and returned page posture are distinct: visible result ordering must follow returned
   `page.sort_by` and `page.sort_order`, with the requested order disclosed only when it differs;
   Workbench must not reorder source rows to hide that distinction.
9. `src/features/advisor-cockpit/`
   Reusable route/method allowlist, server-derived development principal, least-privilege
   capability projection, and selected-portfolio entitlement enforcement for Advisor Cockpit BFF
   traffic. Browser proposal components do not own advisor identity or role.
10. `tests/`
    Unit, integration, and Playwright smoke coverage.
11. `wiki/`
    canonical authored source for GitHub wiki publication and operator-facing Workbench summaries.
12. `docs/documentation/workbench-screen-registry.v1.json`
    canonical route, business-screen, mode, navigation-posture, source-owner, evidence, and wiki-guide
    mapping. `npm run quality:screen-docs` compares it with every Next.js route entrypoint and the
    source-owned Performance, Manage, Advisory Journey, and Proposal Lifecycle mode definitions.
    The gate owns the required authority-family set independently from the registry, rejects missing,
    duplicate, and unexpected families, and compares literal source alias targets with their resolved
    canonical surface modes. Required guide headings must be complete Markdown headings outside
    properly closed fenced blocks; an opening-style delimiter with an info suffix is not a close.
    Every active surface needs one canonical guide or an explicit issue-backed coverage exception;
    aliases reuse the canonical guide instead of creating duplicate prose.

## Runtime And Integration Boundaries

Runtime model:

1. Next.js application with browser and server-rendered behavior,
2. primary product dependency is `lotus-gateway`,
3. live platform validation uses canonical `*.dev.lotus` routing,
4. the root App Router boundary uses the official MUI cache provider so streamed Emotion styles
   are managed in the document head; do not add root-level hydration suppression or screen-local
   CSS-in-JS workarounds.

Boundary rules:

1. UI features must be backed by supported gateway functionality,
2. direct raw service consumption is not the default pattern,
3. presentation logic may shape or prioritize information, but domain authority stays upstream,
4. visual polish should not introduce fake data, duplicated meaning, or unsupported workflow states,
5. HTTP status, correlation id, request id, and support reference are distinct evidence types;
   label a status as HTTP status and expose another reference only when its governed semantics and
   support-queryability are proven,
6. domain-product discovery UI must consume gateway domain-product APIs only and must render
   unavailable, stale, partial, blocked, and error trust states truthfully.

Technology-selection rules:

1. prefer mature, widely deployed, well-documented libraries with stable APIs, long-lived community
   or vendor stewardship, and broad engineering-tool and model familiarity,
2. do not adopt beta, release-candidate, experimental, or novelty-driven framework versions in the
   production Workbench,
3. do not take a major dependency upgrade merely because it is current; require a security,
   supportability, or product need plus compatibility review, focused regressions, rollback posture,
   and GitHub issue traceability,
4. when the only security-fixed version is a newer major, contain changed behavior behind a reusable
   adapter or compatibility layer and avoid adopting unrelated new features in the same slice, and
5. prefer boring, explicit, repository-native patterns that are easy for engineers and coding agents
   to review over clever framework-specific indirection,
6. `docs/architecture/workbench-dependency-risk-inventory.v1.json` is the canonical admission
   record for every direct production dependency, including packages declared as optional and
   non-optional peers installed by the production `npm ci`; peers explicitly marked optional in
   `peerDependenciesMeta` remain outside this direct-install set. Keep each manifest and matching
   lockfile section, exact resolved version, SPDX license evidence, steward and security channel, stable lifecycle,
   Workbench purpose and owner boundary, maturity rationale, criticality, containment, exit posture,
   and review date aligned. Validate the complete JSON Schema with the exact development-only Ajv
   tool rather than maintaining a partial schema interpreter. Keep inventory and dependency review
   ownership bound to the governed functional identity `workbench-architecture-maintainers`; do not
   substitute an ad hoc contributor label,
7. reuse the platform technology states `approved_default`, `restricted_exception`, and
   `prohibited`. A restricted dependency requires an owner-assigned, GitHub-issue-backed,
   time-bounded exception with approval evidence, rollback, and exit criteria; a prohibited
   dependency cannot enter a production build, and
8. the platform technology-governance contract remains `report_only` at revision
   `2868348d289fc685ecf5a218b6c73256ac3a7742`. Workbench deliberately adopts a blocking local
   direct-production-dependency gate without claiming that the platform-wide contract has been
   promoted or that a bank, procurement, architecture, or legal reviewer has approved the stack.

Dependency-security and lint-governance rules:

1. `make security` is a release gate, not advisory-only telemetry: keep the complete graph free of
   high/critical findings and the production graph free of moderate-or-higher findings.
2. Prefer upstream package upgrades or narrow owner-consumer overrides. Do not apply broad
   transitive overrides that change unrelated tool semantics; coverage, build, and lint tools must
   continue to execute their own supported dependency contracts.
3. The maintained lint gate is the ESLint CLI over the repository root. Do not reintroduce
   deprecated `next lint` or `eslint-config-next`; use the direct Next ESLint plugin and
   `typescript-eslint` compatibility path instead.
4. Production application lint rules are scoped to `src/**/*.{js,jsx,mjs,cjs,ts,tsx}` so Next,
   Core Web Vitals, and stable React Hooks correctness rules (`rules-of-hooks` and
   `exhaustive-deps`) remain enforced on browser-delivered code. Tests, live validators, scripts,
   and configuration files are also scanned by the root ESLint gate under the shared TypeScript/JS
   rules; do not exclude those trees to make lint pass. The React Compiler compatibility rules are
   also blocking for production source through `npm run lint:react-compiler`; fix render purity at
   the state-ownership boundary and do not add suppressions or exclude source paths.
5. `next build` is not the lint authority. Keep `make check` and protected CI ordered as
   `security -> lint -> typecheck -> coverage -> build`; the production build may skip Next's
   duplicate build-time ESLint integration because the repository-owned root ESLint gate has already
   run.
6. `npm run quality:dependency-risk` reconciles every and only direct `package.json` production
   dependency to the lockfile root, resolved lock entry, executable inventory schema, immutable
   platform-policy provenance, stable lifecycle, allowed SPDX license, steward/security channel,
   architecture boundary, replacement posture, review expiry, and issue-backed exception shape.
   `npm run lint` executes it before CSS and ESLint, so Feature, PR, Main, and Docker-parity lanes
   fail closed when a dependency is added, removed, version-drifted, prerelease, license-ambiguous,
   unsupported, ownerless, stale, prohibited, or incompletely excepted.

Container runtime rules:

1. production and Dockerized CI inherit the single immutable `NODE_BASE_IMAGE` declared in the
   Dockerfile; do not reintroduce floating Node or operating-system tags,
2. the governed runtime is official Node 22 Maintenance LTS on Debian Bookworm slim/glibc, not the
   experimental Alpine/musl distribution path,
3. production images use Next's stable standalone output, run the minimal server directly as the
   unprivileged `node` user, and exclude untraced dependencies plus the npm, Corepack, and Yarn
   package-manager toolchain,
4. production build context is an explicit application-source allowlist; local environment files,
   generated evidence, tests, documentation, caches, and logs must not enter the image builder,
5. PR and exact-main Docker lanes reject fixable high/critical image findings and publish CycloneDX
   SBOM evidence, and
6. Trivy execution remains pinned to the vendor-declared safe 0.69.3 binary and the full immutable
   trivy-action 0.35.0 commit because mutable Trivy ecosystem references were compromised in March 2026. Any scanner refresh requires explicit supply-chain review and issue traceability, and
7. the validation-only NGINX scale balancer is built from the immutable official base declared in
   `scripts/scale/Dockerfile.balancer`, applies exact vendor-fixed security package versions, runs
   unprivileged, and is scanned as a distinct image in both protected Docker lanes. Keep the build,
   Compose image input, scale runner, evidence identity, workflows, and governance tests aligned;
   never replace a failed scan with a mutable tag, ignored fixable finding, or unscanned substitute,
8. Dockerized local Vitest parity uses an explicit two-worker ceiling so it remains deterministic
   while the canonical Lotus stack is running, and masks workstation `.env.local` with the tracked
   empty CI fixture. Do not replace these controls with per-test timeout inflation, disabled
   assertions, `passWithNoTests`, global serialization, or developer-local environment values.
9. runtime health is owned by the production image through the dependency-free Node probe copied
   from `scripts/runtime/workbench-healthcheck.mjs`. Compose must inherit that image health contract;
   do not install `wget`, `curl`, a package manager, or another diagnostic tool solely to make a
   Compose-only probe pass.
10. `docs/architecture/workbench-runtime-support-policy.v1.json` is the executable runtime and
   browser-support boundary. `npm run quality:runtime-support` reconciles exact CI/container Node,
   bundled npm, package and lockfile engines, immutable install paths, exact Playwright, explicit
   Chromium projects, framework versions, container provenance, and review expiry. Workflow
   evidence is parsed as active YAML through the exact lock-backed development tool; Docker
   evidence is bound to active instructions in the named governed stages, including Docker escape-
   continuation token adjacency and the runner's final effective user. The Dockerfile retains the
   default backslash escape character; a leading UTF-8 BOM is normalized before alternate parser
   directives fail closed. `RUN` and `COPY` heredoc payloads are consumed as payload rather than
   misclassified as stage instructions, while JSON-form instruction operands are parsed separately
   and cannot masquerade as heredoc operators. Governed
   stages reject `ONBUILD` triggers and `SHELL` overrides so indirect or reinterpreted commands cannot satisfy the
   policy. Comments, instructions in another stage, and earlier superseded directives are not proof.
   Keep developer compatibility ranges distinct from the exact protected
   build runtime. Do not promote the bounded two-replica engineering regression into load/soak,
   production identity, high-availability, disaster-recovery, multi-region, bank-capacity, or bank
   certification claims. The buyer-facing boundary is documented in
   `wiki/Technology-Risk-and-Runtime-Support.md` and the architecture decision in
   `docs/architecture/workbench-production-runtime-decision.md`.
10. `docs/architecture/workbench-runtime-state-inventory.v1.json` is the executable statelessness
    boundary. `npm run quality:runtime-state` reconciles every detected module-scope state holder,
    rejects unreviewed framework caching and Server Actions, prohibits server use of browser caches,
    and requires rolling deployment identity outside development. `npm run scale:proof` uses two
    identical production-image replicas, a pinned and separately scanned stable NGINX validation
    balancer without affinity, and a bounded source fixture to prove cross-replica persistence,
    one-replica interruption, recovery, thresholds, concurrent per-phase container resource
    evidence, and host load-generator resource evidence. This harness is an
    engineering regression and must not be described as the production deployment topology.

## Local API Contract Evidence

The same-origin `POST /api/metrics/events` route has authored accepted and rejected response
examples in `docs/operations/metrics-event-response-examples.v1.json`.
`tests/unit/metrics-route.test.ts` invokes the real route with each documented request and compares
the HTTP status plus complete JSON response using exact structural equality. This prevents stale,
missing, additional, renamed, or mistyped response fields from remaining hidden behind a
parseable documentation example.

This is a bounded TypeScript adoption of the platform endpoint-example parity contract. It does
not certify every Workbench BFF route, promote a product feature, or make Workbench the authority
for Gateway or domain-service contracts.

## Repo-Native Commands

Use these commands as the primary local contract:

1. install
   `make install`
2. dependency security
   `make security`
3. lint
   `make lint`
   (`npm run lint`, which runs runtime, BFF header-boundary, dependency-risk, CSS global, and
   screen/architecture governance before `npm run lint:eslint` / the flat ESLint CLI configuration)
4. typecheck
   `make typecheck`
5. coverage-backed test gate
   `make test-coverage`
6. browser smoke
   `make test-e2e`
7. local feature-lane parity
   `make check`
8. Docker parity
   `make ci-local-docker`
9. canonical local runtime and validation
   `npm run live:stack:up`
   `npm run live:stack:up:workbench-local`
   `npm run live:validate`
   Canonical startup rebuilds only the Lotus Idea Compose project on each run because its isolated
   capacity proof binds `/version` to a fresh build-time run identity. Do not remove that targeted
   build or replace the exact commit, branch, and run comparison with reusable-image assumptions.
   The same startup path injects the platform demo-data contract's Workbench caller tenant into the
   server-owned BFF header and PM Operating Quality seed, while preserving the separate DPM
   command-centre query tenant, portfolio-manager, book, and date. Do not reintroduce separate
   validator or UI defaults: Gateway scopes PM evidence by caller authority.
10. hermetic stateless scale regression
    `npm run scale:proof`

## Validation And CI Expectations

`lotus-workbench` uses explicit CI lanes:

1. `Remote Feature Lane`
2. `Pull Request Merge Gate`
3. `Main Releasability Gate`

Auto-merge is queued by rebase through `LOTUS_AUTOMERGE_TOKEN`, not the default `GITHUB_TOKEN`, so
the resulting main update is not suppressed from downstream releasability automation. Merged PRs
dispatch `main-releasability.yml` for exact-main evidence, with main-branch concurrency preventing
ambiguous duplicate push/dispatch runs.

Important validation expectations:

1. unit and integration behavior is validated through Vitest coverage,
2. dependency security rejects high/critical findings across the complete graph and
   moderate-or-higher findings in browser-delivered production dependencies,
3. `npm run lint` runs runtime/dependency-risk governance, CSS global governance, and the
   production-source React Compiler compatibility gate before the root flat ESLint CLI gate
   (`npm run lint:eslint`). The root gate retains stable React Hooks correctness rules
   (`rules-of-hooks` and `exhaustive-deps`) for source files and repository-wide shared rules. The
   compiler gate uses the broader recommended React Hooks rules over `src`, fails on any finding,
   and has no suppression or allowlist policy,
4. browser smoke is validated through Playwright; use `PLAYWRIGHT_PORT=<free-port>` when a shared
   stack or another worktree owns port `3000`. An explicit port must bind the production server,
   readiness probe, and browser base URL to the same listener and must disable existing-server
   reuse so current-worktree proof cannot silently exercise stale code,
   and run the generated `.next-build/standalone/server.js` directly after staging
   `.next-build/static` beside it. Development owns `.next-dev`; production validation owns
   `.next-build`; no governed command may return to one mutable `.next` tree. Run
   `npm run test:next-artifact-isolation` to prove the development page and every published client
   asset remain available through a clean production build. Do not substitute `next start` for a
   repository configured with `output: standalone`,
5. deterministic fixture-backed browser journeys are governed by
   `scripts/testing/e2e-scenario-registry.json` and run with `make test-e2e-fixtures`. Protected PR
   and main lanes execute every registered family independently. A family fails closed when an
   expected test is missing, an unregistered test runs, a test is duplicated, skipped, failed,
   timed out, or interrupted, or the family executes zero tests. Add or rename an exact test only
   with the registry and focused governance tests in the same slice; do not reintroduce raw
   package-script `--grep` selectors. These deterministic fixtures prove Workbench behavior and
   presentation contracts, not canonical source integration or bank-ready production support,
6. Docker and build validation remain part of the merge gate,
7. protected PR and main Docker lanes scan both the exact Workbench image and the pinned
   validation-only NGINX image, run the two-replica scale proof against that same Workbench image,
   and upload the machine-readable evidence,
8. canonical live validation matters when a change affects integrated product flows,
9. `-RequireMainlineSources` is required for mainline/RFC certification: ordinary canonical and
   `-LocalApps` runs are useful branch-local development evidence, not certification evidence.
   When another agent owns the shared Workbench checkout, platform automation may supply an
   isolated Workbench mainline checkout to the source-provenance preflight. That override is valid
   only when the path is a clean `lotus-workbench` Git origin at exact `origin/main`; a clean path
   to another Lotus repository must fail closed as a repository-identity mismatch.
10. canonical startup must use the reusable, fail-closed Compose project/path ownership predicate
   for Docker port owners. `npm run live:stack:preflight` audits an existing stack without mutation,
   and `npm run test:runtime-ownership` executes the equivalent/foreign path matrix in feature, PR,
   and main lanes. Core portfolio seeding must use the repo-local `portfolio_common` library on
   `PYTHONPATH`; do not bypass source-readiness blockers with Workbench-local state,
11. README and wiki updates should keep active product-surface truth explicit, especially when
    legacy compatibility routes still exist beside the supported Portfolio and Performance paths,
12. product docs should distinguish active shell navigation from disabled or compatibility-only
    routes when the shell bootstrap contract does not treat every historical route as supported,
13. route-file existence alone is not enough for documentation truth; use shell registry,
    capabilities tests, redirect behavior, and canonical runtime guidance before describing a surface
    as supported. Keep the Workbench screen registry aligned with source route and mode definitions,
    use separate implementation and navigation-posture fields, and remove a `coverageException` only
    after the mapped business guide satisfies the complete heading and evidence standard.
14. RFC-0108 analytics UI observability for supported Workbench Portfolio, Performance, Risk, and
    Reporting operator reads is centralized in
    `src/features/analytics-observability/metrics.ts`; keep the explicit observed-surface registry
    in sync when adding or retiring portfolio, performance, risk, or reporting operator panels, and
    never emit portfolio, client, document, session, report batch, trace, request body, response
    body, or screen-content identifiers as metric labels. The metrics helper consumes Gateway
    `source_supportability` arrays for performance/risk freshness and supportability posture, with
    stale source freshness taking precedence over ready source items. State-changing Workbench
    actions should use the mutation observation helper so they emit bounded request, state, and
    applicable attention metrics without incrementing panel hydration counters.
14. DPM outcome-review Workbench reads use the same bounded observability registry. Metric labels
    must identify only governed route, panel, operation, freshness, supportability, and status
    classes; outcome review ids, portfolio ids, proof-pack ids, rebalance run ids, request payloads,
    response payloads, hashes, and lineage references must stay out of metric labels.
15. Repository-source governance assertions must be platform-newline portable. Assert semantic
    lines, fields, and ordered contracts with `\r?\n` handling or explicit LF/CRLF cases; do not
    make a green Windows gate depend on LF-only byte substrings.
16. Async UI tests must synchronize on the advisor-visible settled outcome as well as asserting the
    Gateway request. A mock being called proves request start, not that React has committed success,
    failure, or refreshed evidence. Do not replace a missing outcome boundary with sleeps, timeout
    inflation, retries, or suite serialization.
17. Route tests must not repeatedly reset and reload the full Next module graph merely to vary
    runtime configuration. Extract a small deterministic input parser or selection seam, read
    runtime configuration at invocation time, and retain one bounded route-composition proof.
18. DPM mandate command-center reads and monitoring actions use bounded observability labels for
    command-center summary, exceptions, mandate lookup, mandate health, and monitoring run-once
    operations. Metric labels must not include portfolio ids, mandate ids, PM ids, book ids,
    monitoring run ids, exception ids, source-run ids, request bodies, response bodies, or screen
    content.
19. DPM outcome-review AI narrative requests are Workbench state-changing mutations through
    Gateway only. Workbench may display bounded workflow-pack run status returned by Gateway/AI,
    but it must not construct AI prompts, generate recommendations, score PMs, or treat a narrative
    run as autonomous approval.
20. DPM construction alternative generation and selection are Workbench state-changing mutations
    through Gateway only. Workbench may construct the stateful source selector needed to invoke the
    Gateway/manage contract, but it must not synthesize stateless portfolio snapshots, price
    payloads, target weights, optimization outcomes, supportability states, or selection decisions.
21. DPM proof-pack generation, retrieval, Markdown, report-input, AI-evidence reads/actions, and
    governed AI PM memo requests are Workbench gateway-only operations. Observability labels must
    remain bounded to route, panel, operation, freshness, supportability, status class, and error
    category; proof-pack ids, rebalance run ids, mandate ids, portfolio ids, content hashes, source
    hashes, workflow-pack run ids, request bodies, response bodies, and screen content must never
    be emitted as metric labels.
22. DPM rebalance-wave reads and mutations are Workbench gateway-only operations. Observability
    labels must remain bounded to route, panel, operation, freshness, supportability, status class,
    and error category; wave ids, wave item ids, portfolio ids, proof-pack ids, handoff refs,
    campaign ids, report-input refs, workflow-pack run ids, request bodies, response bodies, and
    screen content must never be emitted as metric labels.
23. DPM portfolio-memory reads are Workbench gateway-only operations. Observability labels must
    remain bounded to route, panel, operation, freshness, supportability, status class, and error
    category; portfolio ids, event ids, source refs, artifact refs, content hashes, request bodies,
    response bodies, and screen content must never be emitted as metric labels.
24. DPM PM operating quality policy, score-run, score-run summary, score-run preview, create,
    fairness-analysis preview/create/list/detail, review-action preview/create/list/detail, and
    summary-invocation preview/create/list/detail operations are Workbench gateway-only operations.
    Observability labels must remain bounded to route, panel, operation, freshness,
    supportability, status class, and error category; policy ids, policy versions, score-run ids,
    fairness-analysis ids, review-action ids, summary-invocation ids, segment ids, PM ids, book ids,
    source refs, content hashes, artifact refs, workflow run ids, request bodies, response bodies,
    generated summary text, prompts, model responses, score values, and screen content must never
    be emitted as metric labels.
25. Proposal advisor narrative actions are Workbench gateway-only operations. UI state must stay
    explicit about advisor-use review, reviewed narrative package inclusion, report delivery
    posture, and latest delivery event, without presenting report rendering, archive publication,
    client messaging, or client-ready release as Workbench-owned capabilities.
26. Advisor suitability policy review queue reads and bounded evidence-review requests are
    Workbench gateway-only operations backed by Gateway advisory-policy evaluation contracts.
    Workbench must bind record-specific evidence and actions to an explicitly selected queue
    evaluation. The selected proposal, version, and evaluation remain visible; pointer and keyboard
    selection preserve the source record across queue reorder, while portfolio changes, removed
    records, and stale query or mutation completions cannot publish posture for a superseded
    selection. Detail-query caches and mutation feedback are scoped by portfolio and evaluation.
    Action availability requires exact portfolio, evaluation, proposal, and proposal-version
    agreement between the active route, selected queue record, evaluation detail, sign-off package,
    and workflow wherever each source reports that identity. A successful but mismatched detail
    response remains an explicit partial evidence state; it must not collapse to an empty pane or
    let supporting sources agree with the wrong detail record.
    Workbench may display Advise-owned review queue posture, selected evaluation detail,
    sign-off source-package posture, policy workflow posture, client-publication block posture,
    open approval/disclosure/consent requirements, source-evidence completeness, and advisor next
    action. Workbench may record a request for more evidence against the source evaluation hash,
    but it must not calculate suitability locally, approve or waive policy findings, record
    policy sign-off approval, infer client-ready release, or expose raw policy payload field names
    on advisor-facing screens.
    The policy-review queue is the Suitability screen's only worklist and count authority; do not
    request or render the generic proposal list as a competing queue. Use the shared adaptive
    decision-workspace pattern so desktop and advisor-tablet widths keep worklist and selected
    evidence together, while compact layouts preserve worklist-before-decision order. A manual
    refresh must repeat the queue, selected evaluation, sign-off package, and workflow reads as one
    source transaction and announce success only after all four settle and identity still agrees.
27. Portfolio transaction monetary fields must retain their source currency semantics through view
    models, grids, drawers, totals, and exports. Pair `gross_amount` and `price` with transaction
    `currency`; pair `net_cost_base` and `realized_gain_loss_base` with portfolio base currency.
    Do not use a gross/base fallback as one labeled amount or aggregate mixed currencies. Preserve
    Gateway `total`, `skip`, and `limit` when a transaction screen claims ledger coverage.
28. Advisor-book UI must consume only Gateway `/api/v1/advisor-book/portfolios`, validate exact
    `v1` own-book and `PortfolioManagerBookMembership:v1` semantics, and preserve Gateway
    supportability, tenant-scope, assignment-basis, paging, and provenance evidence. The browser
    must not infer household, team, delegated, supervisor, AUM, attention, or ownership scope; it
    must not fall back to the global portfolio catalogue when membership is unavailable. Shared
    context switching must retain the current business route and supported query state, reset
    portfolio-specific stale state, and restore keyboard focus. Until #436 delivers an
    authenticated principal, BFF advisor-book authority is development-configured only and fails
    closed elsewhere. Authoritative membership evidence is only one input to panel supportability;
    canonical validation must keep `advisor.book_overview` aligned with the governed panel registry
    and must not promote the whole panel to ready from membership posture alone. Apply the same
    boundary to composite Performance attribution and evidence panels: a supported component
    capability does not supersede their governed partial posture. Any canonical proof asserting
    exact membership uniqueness must cover the complete own-book result set: validate paging
    metadata against returned items and fail closed on a non-zero offset or incomplete page.
29. Performance browser proof must read source module capabilities and source economics before
    asserting optional metrics or analytical rows. Use `npm run test:e2e:performance:populated`
    for the complete metric/layout precondition and
    `npm run test:e2e:performance:unavailable` for truthful degraded behavior. Keep live-only
    timing checks separate, use default independent Playwright execution rather than serial mode,
    and do not let one summary failure skip Analysis, Contribution, or Evidence journeys.
30. Performance attribution level totals are source-owned analytics. Workbench may aggregate
    portfolio and benchmark exposure weights for presentation, but it must bind allocation,
    selection, interaction, and total attribution effect directly to the Gateway contract rather
    than reconstructing them from detail rows. Render missing optional component totals as
    `Unavailable`; reserve `—` for intentionally non-additive return columns. A missing required
    total effect is malformed upstream evidence owned by Gateway issue #506, not a reason to make
    the Workbench contract nullable or substitute zero.
31. Canonical live validation must prove the source authority required by the acceptance claim,
    not only endpoint availability, row presence, or a rendered panel. Select the governed entity
    explicitly; require its exact versioned source, assignment or calculation basis, current
    accepted provenance, snapshot/content identity, authoritative lineage, and exact requested
    business-date scope; and persist those fields in machine-readable evidence. A degraded
    aggregate may pass only when the validator
    names the single accepted limitation and its separately owned GitHub issue. Any legacy basis,
    stale or incomplete evidence, duplicate governed entity, unrelated degradation, or missing
    provenance fails closed. When Idea candidate detail does not expose a source hash, Workbench
    proof must verify the available candidate id, policy, queue evaluation timestamp, source
    signal, and detail source-ref evidence and record the hash as an explicit non-claim.
32. Performance analytical selections are source-confirmed transactions. Keep requested controls
    separate from the rendered summary/details and URL until every contract required by the selected
    view succeeds. If a refresh fails, retain usable prior evidence only under its prior labels,
    expose the requested and confirmed contexts plus an exact source retry, and announce pending,
    failure, and one concise, bounded successful confirmation without focusing the message. Keep
    routine success visually subordinate to the resolved analytical evidence; restore the original
    source selector only when a removed recovery action would otherwise leave focus on the document,
    and never steal focus after the advisor has moved elsewhere. Fence obsolete completions, lock
    conflicting controls while pending, and keep permission blocks fail-closed. Do not partially
    publish summary, detail, normalized controls, or query state; do not invent fallback analytics.
    Use `npm run test:e2e:performance:refresh-integrity` for the owned optimized-production failure
    and recovery journey.
33. Independently fetched analytical panels own independent source state. Never convert a rejected
    request into a supported empty response, blank correlation id, or generic unavailable posture.
    Cache only source-confirmed success, evict matching cached evidence after a permission denial,
    fence obsolete completions, distinguish recoverable error from permission block and valid
    absence, and provide an exact source retry when recovery is
    implemented. Evidence cardinality governs presentation: one observation remains exact tabular
    evidence and cannot be drawn as a trend; a time-series chart requires at least two observations.
    Keep the recovery action mounted, disable it natively while pending, restore keyboard focus
    after the request settles, and expose a stable
    machine-readable evidence state in addition to business copy. Use
    `npm run test:e2e:performance:trend-integrity` for the owned attribution-history failure,
    retry, focus, cardinality, and narrow-reflow proof. Horizon Comparison reuses the same shared
    source-confirmed resource lifecycle; use `npm run test:e2e:performance:horizon-integrity` for
    its explicit failure, exact retry, focus, cardinality, and narrow-reflow proof.
    Performance Summary applies the same cardinality rule to Return Path: one observation is a
    compact exact portfolio/benchmark/active comparison and two or more observations retain the
    chart. Its nested layout must reflow from the module's inline-size capacity rather than the
    outer viewport. Use `npm run test:e2e:performance:return-path-density` for the owned
    optimized-production semantic, focus, height, responsive, and overflow proof.
34. Source-selection controls belong beside every Performance decision view that they govern.
    Summary, Analysis, and Risk must reuse one component and one complete request-shaping path for
    the controls their governed source requests support. Horizon, basis, explicit review window,
    and benchmark apply across the three modes; frequency applies to Summary and Analysis but not
    the current Risk contract. Render that control bar once per mode, but expose only controls
    consumed by that mode's governed source request; a shared control must not imply unsupported
    authority. Downstream comparison and risk panels inherit
    only their supported confirmed source context instead of adding page-local selectors. Keep
    the complete confirmed explicit range visible on a compact Review window control and keep
    exact-date drafting inside its focused dialog. The dialog owns only draft state: Cancel,
    Escape, validation failure, and source rejection must leave the confirmed labels, URL, and
    evidence unchanged; source acceptance commits them together and restores focus unless the user
    has moved elsewhere. Keep comparison
    display overrides behind their own disclosure, return-view presentation local to the Summary
    Return History module, and analytical segment selection local to Analysis. Preserve the
    last confirmed evidence and labels while a new selection is pending or failed; restore the
    initiating control after settlement only when the user has not moved elsewhere. Key every
    comparison-local display override to the complete source request identity (portfolio, period,
    basis, explicit window, frequency, benchmark, and presentation view) so cached ready-to-ready
    transitions cannot carry stale choices into another evidence set. Visible labels and stable
    evidence attributes must describe the resolved presentation that is actually rendered, not a
    remembered preference that the returned evidence cannot support. At narrow
    widths, source-changing controls must retain a measured 44px touch target without reducing
    desktop workstation density. Wide financial comparisons may scroll only inside a named,
    keyboard-focusable region; set governed widths and pinned offsets through `AnalyticsTable`
    instead of a new global selector. Gate the shared control bar against the actual centre-pane
    inline size, not only the browser viewport: its 1440px canonical workstation proof must keep
    the bar at or below 220px, place the Return Path stage at or above the fold boundary of 700px,
    and prevent page-level horizontal overflow. Use the registered `control-bar` focus in the
    populated Performance fixture for this geometry and dialog transaction proof. Use
    `npm run test:e2e:performance:analysis-controls` for the
    owned direct horizon/benchmark, mode-retention, URL, focus, touch-target, and responsive proof.
35. Persisted Advisor Brief review is a source-confirmed internal decision transaction. Offer only
    known actions admitted by the returned workflow, state each business consequence, require the
    staff reference, rationale, and replacement lineage that the action needs, and provide a
    distinct review-before-confirm step. Show pending, source-confirmed success, and explicit
    failure without fabricating completion; retain entered values after failure and fence obsolete
    responses. A terminal review state is not human-review evidence unless the returned contract
    also publishes review history, a positive transition count, actor, and time. Keep generated
    output internal-only, technical workflow evidence secondary, and client communication,
    suitability, order, and execution authority blocked. Map rejected and abandoned decisions as
    blocking posture, keep unknown or incomplete terminal evidence neutral, and use positive tone
    only for a complete source audit record. After a terminal source response, restore focus to the
    source-confirmed status without scrolling the user's evidence context. The performance smoke
    launcher must own an explicit isolated Workbench port so proof cannot reuse a stale shared
    listener. Canonical ACCEPT proof must read exactly one machine-readable evidence record from
    the same visible **Human Review** row; it must fail closed for missing, duplicate, malformed,
    non-ready, or wrong-reviewer evidence and must not parse aggregate region `textContent()`.
    Lotus AI records review actors as `review:<staff-reference>`; adapt that governed namespace
    once at the Advisor Brief presentation boundary before displaying or comparing the business
    reviewer reference. Preserve the raw actor in Gateway/source evidence, reject blank or
    namespace-only actors, and do not teach components or validators separate string rules. Live
    browser proof must stop immediately when the same review region renders an explicit failure
    alert; waiting only for success text hides the actual source-confirmation failure and wastes the
    fail-fast budget.
    Use
    `npm run test:e2e:performance:advisor-brief-review` for the owned optimized-production
    confirmation, source-persistence, responsive, focus, and browser-runtime proof.
36. Performance supportability uses one business-and-evidence presentation boundary. Derive the
    advisor conclusion, client-use implication, named limitations, and technical disclosure from
    the same Gateway-owned contribution object. Translate only explicitly governed source and
    smoothing values; absent, inconsistent, or unknown statuses and reason codes fail closed to a
    neutral review posture while the exact raw value remains available in **Calculation evidence**.
    A confirmed contribution posture additionally requires matching reason evidence for every
    declared limitation, finite and reconciled published contribution values, and published
    market-value coverage of at least 95%; lower coverage is partial and missing or invalid coverage
    remains review-only.
    Keep market-value coverage, weighting basis, reconciliation, and known exclusions in the
    primary business scan. Keep source status, reason codes, contracts, available/unsupported/
    degraded economics, snapshots, smoothing status, and methodology reason codes secondary but
    accessible. Do not hide evidence, duplicate the mapping in page components, infer calculation
    completeness, or expose implementation vocabulary as the advisor's first reading path.
37. Business dates and timestamps use one fail-closed presentation boundary. Validate a
    `YYYY-MM-DD` business date as calendar components and render those components without creating
    a midnight instant; missing, malformed, and impossible dates fail to explicit unavailable copy.
    Advisor Book uses **Not confirmed** and must not contact its source until the request date is
    explicit or supplied by its bounded local development configuration; the returned scope date
    must exactly match the request.
    Exact timestamps require `Z` or a numeric offset, normalize to UTC, and disclose **UTC** in
    business copy. Do not render raw ISO dates, accept unzoned timestamps, silently substitute a
    fixed demonstration date, or reintroduce feature-local date parsers. Preserve the exact source
    value only in source models or stable machine-readable evidence, not visible business copy.
    `tests/unit/date-presentation-authority.test.ts` rejects competing production formatter
    authorities, and audit evidence browser proof must demonstrate that changing the browser
    timezone cannot change the disclosed UTC instant.
38. Governed cross-workspace review context consists only of portfolio, valuation date, review
    period, and reporting currency. `selectedRecordId` and `batchId` are screen-local identities:
    strip them when switching workspaces and retain them only within their owning record or batch
    flow. Missing, repeated, or malformed required identity fails closed to the shared recovery
    surface. **My book** must remain portfolio-neutral: it may retain only one valid explicit
    business date because its source contract requires that date, and must strip portfolio, period,
    currency, record, and batch identity.
39. A context-dependent full-page action is available only when its exact governed destination can
    be built through the shared review-context authority. Do not invent default portfolio, date,
    period, currency, record, or batch values to keep a link visible. If the caller lacks the
    address, omit the action and retain the source-backed drawer or summary evidence.
40. Writing a record or batch identity into the URL is not addressability proof. An addressed
    screen must rehydrate the exact Gateway resource, validate source identity against the active
    review context, fence late responses during Back/Forward or workspace changes, and fail closed
    without reconstructing success or resubmitting a mutation.
41. Source-identity reconciliation may compare only request fields the owning Gateway/backend
    contract actually accepts. Preserve useful cross-workspace URL context when appropriate, but do
    not send unsupported selectors or reject valid source evidence for failing to echo them. Show a
    concise capability notice when source valuation date, base currency, or another returned fact
    cannot be controlled by the current screen.
42. Proposal Builder may recover an omitted advisory date or reporting currency only from its
    source-owned portfolio-book response. Treat a carried review-context value as the explicit
    override, never replace a non-empty user value with a source default, and repeat the portfolio
    read with the resolved date and currency before enabling evaluation or draft handoff. Proposal
    Builder must validate both carried and returned dates through the shared semantic business-date
    authority; a shape-only `YYYY-MM-DD` check does not establish a real calendar date. Invalid
    carried context and invalid source evidence remain distinguishable, action-blocking unavailable
    states. A non-empty invalid carried date must disable the portfolio-book read rather than silently
    changing it into an undated request. An invalid returned date may be replaced through deliberate
    refresh, but the replacement request must publish one busy, action-locked recovery state. Adopt
    date and currency defaults across the form, cash flows, and trades only after the returned date is
    valid, so malformed temporal authority cannot trigger another read or partial context promotion.
    Proposal entry actions must use the shared review-context URL authority rather than
    portfolio-only string interpolation. If the lightweight portfolio workspace shell is unavailable,
    Proposal Builder
    may use an identity-matched Gateway portfolio-book response as partial shell context; publish
    its confirmed portfolio, client, booking-centre, business-date, and base-currency facts to the
    Review Context strip and the form together, label missing mandate context explicitly, and reject
    a foreign book response before either surface becomes actionable. The form's client-side book
    query may refresh construction evidence only after the shell has confirmed that source context;
    it must not independently promote a transiently recovered book into action authority. While the
    shell remains unconfirmed, omit portfolio-scoped navigation and queue links and keep evaluation
    and handoff closed even if a later client-side evidence refresh succeeds.
43. Portfolio record-screen recovery retains the left portfolio-navigation rail only while a real
    source-confirmed portfolio identity remains available, so the advisor can see the current task
    and reach portfolio selection. If no source identity is confirmed, omit the rail and use the
    main recovery action; never turn display fallback such as **No portfolio** into switcher or link
    data. When retained, the rail must suppress normal workspace destinations if its parsed context
    is invalid or mismatched, while the main surface owns the persistent recovery explanation and
    action.
44. Report Centre recovery follows the same identity admission boundary. A catalogue match or
    carried route identifier does not authorize portfolio-scoped navigation when the Gateway
    workspace is unavailable or returns another portfolio. Render the reporting rail only from an
    identity-confirmed workspace; an unsupported-control recovery may retain it because the source
    identity remains confirmed, while unavailable or foreign-shell recovery must direct the advisor
    to **My book** without constructing portfolio links.

### Visual Review Gate

When a slice materially changes governed Workbench layout, hierarchy, or interaction behavior,
capture explicit browser evidence before moving on.

Required posture:

1. validate against the canonical seeded portfolio `PB_SG_GLOBAL_BAL_001` unless the slice
   explicitly targets another governed dataset,
2. capture Summary and Detailed screenshots when the affected control or panel exists in both
   modes,
3. include close-up screenshots for the changed panel or control group and add a viewport-level
   screenshot when surrounding layout materially affects the review,
4. record review notes for overlap, wrapping, spacing, alignment, duplicate copy, and
   unsupported-looking actions or states,
5. keep diagnostic screenshots separate from final slice evidence.

## Standards And RFCs That Govern This Repository

Most relevant current governance:

1. `../lotus-platform/rfcs/RFC-0070-gold-standard-product-experience-foundation-and-ownership-model.md`
2. `../lotus-platform/rfcs/RFC-0071-centralized-environment-scoped-service-addressing-and-ingress-governance.md`
3. `../lotus-platform/rfcs/RFC-0072-platform-wide-multi-lane-ci-validation-and-release-governance.md`
4. `../lotus-platform/rfcs/RFC-0073-lotus-ecosystem-engineering-context-and-agent-guidance-system.md`
5. `docs/documentation/product-architecture-blueprint.md`

## Known Constraints And Implementation Notes

1. this repository evolves quickly, so stale UX assumptions and stale E2E expectations are a recurring drift risk,
2. design-system and shell primitives should be preferred over page-local hacks,
3. premium banking-grade UI in Lotus means clarity, density, trust, and backend truth over decorative novelty,
4. when a screen changes materially, tests and docs should be updated in the same slice,
5. repo-local `wiki/` content should summarize supported product surfaces, canonical runtime flow,
   and legacy route posture without duplicating the full `docs/` tree.
6. transaction review surfaces must distinguish transaction-currency economics from
   portfolio-currency accounting values and disclose source paging instead of implying a partial
   result is complete.
7. Portfolio review destinations share `PortfolioScreenRail`. Keep its dense persistent rail on
   desktop; when the workstation shell stacks at tablet or narrow widths, preserve selected
   portfolio and current-view context through the accessible disclosure behavior instead of
   rendering the full route list before the selected business task. Navigation remains semantic
   links, not an ARIA menu or a page-local select control.
   The default rail is a task map, not a route inventory: daily work stays visible, the current
   specialist task appears once, **All workspaces** owns grouped secondary destinations, and only
   the current workflow step precedes its on-demand alternatives. Escape closes either nested
   disclosure and restores focus to its trigger.

   Governed selected-review identity is owned by `src/shell/review-context.ts`, not by page-local
   parsers or defaults. Portfolio, valuation date, period, reporting currency, selected record, and
   report-batch identity parse atomically; any repeated, malformed, or unsupported governed field
   invalidates the complete context before source reads. Do not salvage a partial context,
   substitute the canonical demo or first catalogue portfolio, or let screen-local record/batch
   identity leak into a destination that cannot interpret it. URL context is not source evidence:
   summary/detail responses must independently confirm the relevant portfolio and valuation/window
   identity before composition. Use browser-history `push` for confirmed user decisions and
   `replace` only for source normalization. Back and Forward must synchronize source-backed props,
   caches, and request fencing without query-key remounts or focus loss.

8. Advisor-facing readiness and shell-workspace availability must use typed, category-specific
   exact mappings from supported source values to business posture. Open strings, nulls, unknown
   values, and values supplied under the wrong category fail closed as neutral `Not reported` or
   `availability could not be confirmed`; never infer positive readiness or expose source codes
   through generic code formatting or keyword matching. Keep raw service, RFC, contract,
   capability, and reason-code evidence in the source contract or a secondary support disclosure
   rather than the primary business scan path.
9. Global shell utilities are capability surfaces, not decoration. Search requires a governed,
   entitlement-scoped query and result contract; notifications require source-owned attention and
   acknowledgement truth; banker identity and account commands require the authenticated
   server-side principal contract tracked by Workbench #436 and platform #563. Keep these controls
   absent rather than enabled, hard-coded, or locally simulated until those contracts exist.
10. Global workspace orientation is owned by the typed route context in
    `src/shell/app-registry.ts`. Match full route segments, cover every checked-in screen-registry
    entrypoint, and reuse canonical mode normalization instead of page-local or shell-local aliases.
    Allocation belongs to the Portfolio workspace. Data Product Catalogue is a cross-platform
    utility outside the five Gateway `shell-bootstrap.v1` advisor workspaces, so it deliberately
    renders no current workspace rather than inventing a sixth capability or selecting an unrelated
    domain. Home, platform utility, workspace, and unmatched route scopes remain distinct. Render
    the normalized capability set through the shared workspace switcher, closed by default, with a
    neutral **Workspace directory** label. Unavailable entries remain non-links, outside the tab
    order, and visually stable under pointer hover; do not restore an always-visible row of
    workspace pills or add shell-local availability logic.
11. Shared interactive primitives own their base, priority, focus, hover, disabled, reduced-motion,
    and accessibility presentation beside the component. `ActionButton` keeps stable compatibility
    class names only for existing feature-level sizing and placement; global CSS must not regain its
    base or state contract. Permanently unavailable actions remain native `disabled`. A mounted
    async control may use focus-preserving `aria-disabled` only through `ActionButton`, which
    centrally suppresses activation and applies the same unambiguous disabled and hover treatment
    across primary, secondary, and quiet priorities. When migrating
    a shared primitive out of legacy global CSS, remove duplicate selectors and ratchet the governed
    global line and normalized-byte budgets in the same issue-backed change.
12. Dead presentation cleanup requires an exact production, test, and selector consumer map. Delete
    an unreachable React owner, its dead-only tests, and its orphaned selectors in one issue-backed
    slice; preserve active selector arms that share combined declarations, retain tests that prove
    the active architecture does not regress to the retired path, lower the exact CSS ratchet, and
    prohibit the retired selector family from returning. Do not migrate CSS for a component with no
    production consumer.
13. Data Product Catalogue treats its catalogue as the required discovery source and live
    assurance plus dependency impact as independently recoverable evidence sources. Use separate
    strict query keys. Cached required-catalogue `data` is not current confirmation while a stale
    refresh is fetching, paused offline, or has failed: withhold discovery, keep the catalogue
    recovery control mounted, distinguish initial unavailability from refresh failure, and
    recertify only after Gateway success. Retain confirmed catalogue facts during
    optional-source failure, label any retained earlier evidence, keep every recovery control
    mounted for focus stability, and never convert failure into a successful empty certification or
    graph. The browser consumes these contracts through Gateway only and does not read platform
    artifacts directly.
14. Performance calculation assurance must use one pure, typed, fail-closed projection over the
    Gateway/Performance evidence package. Explicit supported capability and package states, at
    least one calculation, completed execution, completed lineage, and no source exception are all
    required before **Ready for internal review**. Keep calculation completion, lineage,
    supporting-record count, freshness, coverage, fallbacks, limitations, and source supportability
    independent. Validate both source and active-workspace periods through the single canonical
    vocabulary in `src/apps/performance/periods.ts`; matching unfamiliar values must still fail
    closed. Missing or unknown values remain unconfirmed; raw service names, lifecycle codes,
    ids, versions, source reasons, upstream snapshots, methodology references, and artifact routes
    belong only in the collapsed support disclosure. Evidence mode remains read-only and owns no
    performance calculation, certification, client-release approval, or local retry authority.
15. Workbench typography is a governed same-origin product asset, not a public runtime service.
    Load IBM Plex Sans UI in static 400/500/600 weights, Cormorant brand display, and IBM Plex Mono
    evidence roles only through
    `src/app/fonts.ts` and their semantic custom properties. Keep exact upstream release/commit,
    SIL OFL license, and SHA-256 truth in `config/font-assets.json`; `npm run quality:font-assets`
    must remain in the blocking lint chain. Preserve the narrow `.gitattributes` binary and
    LF-license rules so checksums remain stable across developer and CI platforms. Do not add a
    Google Fonts import, CDN URL, page-local
    `@font-face`, font package, or direct family declaration that bypasses the shared tokens.
    Preserve IBM Plex Sans and the visible wordmark face as the only root preloads; evidence faces
    should load on demand. Use the canonical productive roles: 24px workspace/page titles, 18px
    section/panel titles, 14px business reading and table values, and 12px routine labels/headers,
    with only 400/500/600 weights. Do not use forced uppercase or wide tracking for routine
    business labels, and do not allow financial values to wrap or break within a metric. Reflow the
    containing component instead. Component-specific typography belongs in its owned CSS module,
    not the legacy global layer. Any typography replacement requires issue-backed brand,
    accessibility, payload, fallback, license, optimized-browser, and responsive-geometry evidence;
    `npm run test:e2e:typography:compare` is the reproducible candidate-comparison path.
    The reusable Review Context strip must consume the canonical productive roles directly:
    sentence-case 12px/500 routine labels, 14px/500 confirmed values, 14px/400 unavailable values,
    and a 14px/600 support control; only its genuine eyebrow may remain uppercase. Protect confirmed,
    partial, and unavailable states with `npm run test:e2e:portfolio:review-context-typography`.
16. Optional Allocation look-through coverage must remain distinct from the direct allocation
    already confirmed by the selected portfolio book. Model checking, available, unsupported, and
    failed states explicitly; accept unsupported only from a valid allocation response; retain
    direct evidence during optional-source failure; fence late responses by portfolio/source key;
    and force a new Gateway request for recheck. Keep recovery mounted and focus-stable. Expanded
    contributor selection remains disabled until source-owned decomposed lineage is returned.
    Compact layouts should prioritize exact market value, weight, and position evidence over a
    chart that cannot remain legible; component-specific responsive behavior belongs beside the
    Allocation component, not in the legacy global stylesheet.
17. Selected-portfolio identity is rendered once through the shell-owned
    `ReviewContextStrip`. Route owners assemble its typed model only from exact Gateway-backed
    source responses; URL values are requests, not display truth. Keep portfolio and client
    references in the strip's support disclosure and keep mandate type, booking centre, business
    date, and reporting currency in its compact scan path. Compose the strip as a quiet
    business-object header: portfolio name anchors the view; business date and currency precede
    mandate and booking centre in DOM and responsive order; facts size to their content on wide
    screens and wrap before truncating. Confirmed, partial, and unavailable states retain the same
    geometry. Do not restore page-header identity
    pills, selected-portfolio rail blocks, right-rail context cards, or editable governed identity
    fields. A date or currency may recur only where it is a material term of a calculation,
    reporting request, or dated source record. Recovery must retain page identity, expose an
    unavailable strip, and avoid portfolio-scoped links until the source confirms the portfolio.
18. Daily decision queues use the design-system `WorkbenchWorklist` when the user's primary job is
    to choose one source-backed record and act from its evidence. The selector owns compact row
    identity and posture; the associated decision pane owns complete evidence, constraints, and
    the next permitted action. Preserve controlled selection, Arrow-key movement, Enter transfer
    into a focusable addressable detail region, disabled-row semantics, and capacity-based stacked
    reflow. Controlled selection must be source-admitted: keep a requested identity pending only
    while its source is unresolved, admit the first source-ranked fallback once data resolves, retain
    an admitted identity through reordering, and choose a new fallback only after the source removes
    it. Reuse `useAdmittedSourceSelection`, scoped to the complete portfolio/worklist identity,
    instead of synchronizing fallback state in an effect or displaying a fallback over stale state.
    State each count, status, destination, and title once in the primary scan path. On Manage, the
    shell-owned left rail is the only workflow-navigation owner, the centre workspace is the only
    operating-posture and decision owner, and the right rail may show only distinct source-evidence
    availability. A secondary rail may carry different source, scope, or support evidence, but must
    not repeat the worklist, navigation, metrics, or current decision. Book-wide posture may precede the worklist
    only when it changes prioritisation, and raw source references belong in progressive support
    detail. Cockpit, Manage Overview, and Advisory Overview use this pattern; Advisor Book retains
    a comparison register but follows the same compact-measure and progressive-evidence hierarchy.
19. Hydration-sensitive relationships in shared interactive components use an explicit semantic
    `relationshipIdBase` supplied by the owning business screen. The shared portfolio rail and
    decision worklist derive every `id` and `aria-controls` value from that stable base; they must
    not use render-order-generated ids, suppress hydration warnings, or become client-only to hide
    an SSR mismatch. Production call sites must provide a screen-scoped base, and browser proof
    must assert unique document ids, one present target for every relationship, and a clean console
    on a fresh optimized-production document load. This rule remains valid after a framework
    upgrade because semantic ownership is clearer and collision-safe; Next.js 16 certification is
    tracked separately under #624.
20. A selected portfolio's source-backed base-currency market value is presented as **Portfolio
    value**. Reserve **AUM** for a source-backed adviser-book, relationship, or firm aggregate; do
    not infer that aggregate from a selected portfolio or browser-side summation. Gateway contract
    fields and reason codes may retain legacy AUM identifiers at the adapter boundary, but primary
    Workbench copy, record headers, metric definitions, and screen guides consume the portfolio
    terminology authority in `src/apps/portfolio/portfolio-terminology.ts`.
21. `docs/documentation/product-vocabulary.md` is the cross-domain authority for productive
    Workbench business language. Use UK English and sentence case; reserve **portfolio** for one
    selected client record and **adviser book** for the adviser-level population; distinguish
    attention items from source exceptions, availability from evidence coverage and review
    readiness, requested as-of date from source valuation date, base/reporting/instrument/transaction
    currencies, and TWR/MWR methods from NET/GROSS fee basis. Runtime terms remain in their owning
    domain modules rather than a design-system or giant global-copy registry. Contract identifiers
    remain at adapter and progressive support boundaries. Workbench #798 owns the general copy and
    jargon-enforcement mechanism; do not create a competing framework while applying this vocabulary.
    Productive runtime copy shared by a workflow belongs in a typed module under `src/copy/`; keep
    business-state projection fail-closed, preserve exact unknown values only for progressive
    support detail, and pair every degraded state with the unavailable business information, the
    information that remains trustworthy, and the next recovery action. `npm run
    quality:product-copy` is a semantic TypeScript-AST ratchet: both the measured violation inventory
    and the unresolved user-facing expression inventory must exactly equal their checked-in
    baselines. The unresolved inventory is also bound to a stable SHA-256 digest of structural
    paths and enclosing declaration identities, so identical expressions in different named or
    positional scopes remain distinct and one
    newly opaque expression cannot replace a resolved path at the same count. Every fixing slice
    must lower the applicable measurement and update its identity digest together; a regression,
    identity substitution, or stale higher baseline fails CI. It follows statically inspectable local `const`
    references from rendered JSX and copy properties with lexical-scope and cycle safety. Repository
    mutation analysis must retain bounded conditional/logical owners, declaration and assignment-form
    destructuring, and standard mutation APIs reached through statically inspectable object members.
    A standard-mutation member's conservative authority must survive local alias, renamed member
    wrapping (including shorthand object wrappers), and declaration, assignment-form, renamed, or
    nested destructuring capture. Resolve shorthand, renamed property-value, bounded conditional or
    logical property-value, transparent-wrapper, comma-expression right operand, direct array,
    variable-initializer, and ordinary assignment-RHS captures through their value symbol and exact
    value-expression program point rather than the
    wrapper-property symbol or a later call site. Comma-expression traversal never treats a
    side-effecting left operand as the captured value, but applies its ordered assignments before
    resolving the rightmost value. A simple assignment expression contributes its right-hand value
    after its nested writes. Nested writes replay in JavaScript evaluation order—contained RHS writes
    before their enclosing assignment, not AST pre-order—while `&&=`, `||=`, and `??=` snapshot the
    left-hand authority before evaluating a reachable RHS. A short-circuited RHS never changes
    mutation authority; a conditionally reachable RHS remains conservative. Statically named
    computed properties use the same rule, including const and aliased-const keys. Property,
    computed-property, renamed-destructured, member, and assignment-form
    intermediate aliases must retain the same captured owner path. Candidate-cycle identity is the
    symbol plus program point: a definite alias round trip may revisit the same symbol at an earlier
    capture position, while a repeated identical state becomes conservative unknown. Dynamic getter
    returns remain unresolved rather than silently clean. An opaque
    value at a named user-facing property or native `aria-label` is measured rather than silently
    treated as clean. Do not
    introduce aliases to hide productive copy, raise either baseline, or broaden the scanner into
    executable evaluation.
    Some flagged terms are legitimate wealth-management language or identifiers in a specific
    reviewed context. Admit those only through `config/product-copy-exceptions.v1.json`, keyed by
    productive file, rule, rendered context, exact copy, and exact expected match count, with a
    durable Workbench issue or PR review URL and a business-language rationale. Unknown rules,
    duplicate signatures, malformed metadata, stale copy, and broader-than-reviewed match counts
    fail the same gate. Never add a broad word allowlist or use an exception to avoid clearer copy.
    Proposal review actions follow the same source-confirmation rule as lifecycle actions: bind to
    the active source version, admit downstream packaging only after its prerequisite evidence is
    confirmed, and announce success only when the action response and refreshed owning read agree.
    If a narrative review, memo review, commentary, or package mutation persists but immediate
    confirmation fails, retain that exact mutation response as pending confirmation and expose a
    bounded source refresh. Fence conflicting submissions for that same proposal version until the
    refreshed owning reads confirm the original action. If the proposal advances, retain and
    reconcile the historical receipt against its own immutable memo, projection, replay, event, and
    lineage identity without disabling source-admitted work on the current version. Treat a source
    current version later than the receipt as normal lifecycle progression, a source current version
    earlier than the receipt as impossible, and a complete lineage that omits the historical item as
    retained evidence unavailable rather than generic source disagreement. Keep failures that occur
    before persistence version-scoped; only a persisted receipt crosses a same-proposal version
    remount.
    Own the in-flight lock, pending confirmation, and terminal success or failure outcome at proposal
    scope from submission start—not only after persistence—so an active-version remount cannot
    discard the transaction or deliver its outcome to an obsolete session. Refresh the original
    persisted version rather than substituting the newly active version. Release the in-flight lock
    only when the source request fails or exact source confirmation succeeds, retain the truthful
    terminal outcome on the current screen, and reset the full scope when the proposal identity
    changes. Never create a second idempotency key for the same version while its earlier action is
    in flight or persisted but unconfirmed; version-scoped receipt storage must not overwrite a
    historical receipt when a later version admits its own action.
    Proposal-wide delivery summary and event envelopes may identify a newer active proposal version
    while still carrying the exact older-version report record. Confirm that original request from
    its report-request id, narrative version/hash, monotonic package state, and matching
    latest same-version `REPORT_REQUESTED` event id/version. Require the envelope version to be at least the original
    version; do not require it to remain equal, substitute a newer version, or accept a matching
    request id from another version or duplicate canonical request events.
    Memo and generated-working-aid workflows must require an explicit actor reference, preserve the
    source-owned proposal version as read-only context, and fail closed on unknown source states.
    A current proposal version with no prepared memo is a source-confirmed business start state only
    when Gateway returns not-found for the memo, projection, and replay reads and complete lineage
    proves that the current version has no memo. Present that state as **Memo not prepared** and admit
    only the preparation action; permission, transport, malformed-contract, incomplete-lineage, and
    contradictory-current-memo outcomes remain unavailable. Do not synthesize empty memo records or
    parse display copy to recover transport semantics.
    Confirm compound success only when every source view required by that action agrees; never let a
    mutation response, toast, generated commentary, or browser projection stand in for refreshed
    source evidence. Correlate versioned package evidence to the active reviewed narrative hash.
    For repeatable actions whose aggregate posture may already be recorded, require the exact event
    id returned by the mutation to appear in the refreshed owning audit or replay evidence.
22. Gateway-backed row and state claims in canonical browser proof must use
    `scripts/live/validation/source-render-proof.mjs` for exact source-to-render conformance once a
    screen exposes stable evidence attributes. Each domain keeps its own source adapter, identity,
    state vocabulary, visibility checks, and business assertions; the shared helper owns only
    malformed, duplicate, missing, extra, and state-mismatch detection. Feed it rows derived from
    the exact Gateway response and rows read from the rendered document. Do not hard-code expected
    business states, calculate policy in the browser, or generalize a source adapter until a second
    real consumer proves the same mechanics. Risk Review and Advisor Book are the reference
    consumers and are enrolled in `scripts/quality/source-authority-contracts.mjs`. A new critical
    Gateway-backed surface must add its domain adapter, stable rendered identity/state evidence,
    executable source mutation, controlled reassuring-fallback proof, production wiring evidence,
    and a focused rendered-component extraction proof to that registry. `npm run
    quality:source-authority` runs both the static enrollment validator and the executable render
    proof; it fails closed for empty or single-surface enrollment and runs in every blocking lint
    lane. The executable proof must traverse the production view model and component, then read the
    stable evidence attributes from the DOM; a cloned adapter or view-model row is not render
    evidence. `source-authority-render-proof-registry.mjs` must match the contract registry exactly,
    and every exercised surface must mutate both identity and state. It governs source-owned
    identity and business state, not labels, number/date formatting, or other presentation-only
    fields. A new screen must include unit diagnostics and fixture/browser proof before claiming
    exact source rendering.
23. Global function coverage is a measured non-regression ratchet, not a target for shallow tests.
    `vitest.config.ts` banks the exact 2026-08-30 main-derived measurement at 93.29% after meaningful
    source-authority, failure, and mismatch proof. Do not lower the floor, add source exclusions, or
    exercise functions without asserting advisor-visible behavior. Raise the floor when exact-head
    measurement improves; any controlled threshold failure must remain diagnostic and must never
    rewrite the checked-in threshold.

## Context Maintenance Rule

Update this document when:

1. route ownership or major app areas change,
2. repo-native commands or CI expectations change,
3. the gateway-first integration model changes,
4. dominant design-system or shell patterns change,
5. current product-surface maturity or rollout posture materially changes,
6. active versus legacy route posture changes.
7. data-product catalogue route, Gateway endpoint usage, or trust-state rendering changes.

## Cross-Links

1. `../lotus-platform/context/LOTUS-QUICKSTART-CONTEXT.md`
2. `../lotus-platform/context/LOTUS-ENGINEERING-CONTEXT.md`
3. `../lotus-platform/context/CONTEXT-REFERENCE-MAP.md`
4. `../lotus-platform/context/Repository-Engineering-Context-Contract.md`
5. [Lotus Developer Onboarding](../lotus-platform/docs/onboarding/LOTUS-DEVELOPER-ONBOARDING.md)
6. [Lotus Agent Ramp-Up](../lotus-platform/docs/onboarding/LOTUS-AGENT-RAMP-UP.md)
7. [Workbench product vocabulary](docs/documentation/product-vocabulary.md)
