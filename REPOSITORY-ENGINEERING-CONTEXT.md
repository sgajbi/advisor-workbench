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

## Current-State Summary

Current repository posture:

1. the platform is converging on a premium private-banking product experience standard,
2. `lotus-workbench` uses `lotus-gateway` as its primary backend contract,
3. the `Portfolio` and `Performance` surfaces are the most mature live workflows,
4. `/data-products` provides self-serve gateway-backed domain-product catalog, dependency, and
   live trust discovery for RFC-0088,
5. the Performance advisor-brief surface consumes gateway-backed workflow-pack run posture and RFC-0097 task-flow posture without synthesizing review state or lineage client-side,
6. `/intake` submits list-built and CSV portfolio bundles through Gateway
   `/api/v1/intake/portfolio-bundle` via the Workbench BFF. Workbench generates a bounded
   per-submit `X-Idempotency-Key`, reuses it for same-payload retries after a failed attempt, and
   clears it after success so Gateway/Core own duplicate-submit replay semantics. Workbench must
   not bypass Gateway, call `lotus-core` directly, or treat the browser idempotency key as source
   ingestion truth.
7. `/reports` is the portfolio-scoped Report Centre. It consumes the Gateway-owned report-ordering
   catalogue, submits one reviewed and idempotent portfolio-review request, and shows recent
   report-data job history. Output readiness is source-owned by format: structured data may be
   ready while governed PDF creation is unavailable. Report-data completion does not imply archive,
   advisor approval, client delivery, or communication. The Workbench BFF strips browser reporting
   authority headers and derives the development role and portfolio entitlement from server
   configuration; non-development environments fail closed until authenticated-principal
   resolution exists. Submission adapters must send only configuration fields published by the
   selected source catalogue; caller application and correlation provenance belong in governed
   headers, not in business `options`. Obsolete browser batch materialization, worker run-once,
   archive lookup, and direct download controls were retired under issues #449 and #458,
8. `/workbench/{portfolioId}` is the Manage workspace. It uses the same Workbench left rail as
   Portfolio, Positions, Transactions, Cashflow, Performance, and Risk, and it exposes focused
   Manage sub-surfaces through the `mode` query: overview, mandate, waves, construction, memory,
   reviews, proof, and quality. The route file remains orchestration-only; Manage workspace composition,
   mode navigation, and data fan-out live under `src/features/workbench/manage-workspace.tsx`.
9. Manage overview summarizes the Manage operating posture, while `mode=mandate` renders a focused
   Mandate Health surface from the RFC-0038 DPM command-center contracts exposed through Gateway
   `/api/v1/dpm/command-center`, `/monitoring/run-once`, `/exceptions`, and `/mandates*`.
   Workbench shows manage-owned source readiness, recommended actions, latest monitoring-run
   lineage, active exceptions, governed exception-summary workflow-pack posture, and mandate health
   dimensions without calculating mandate health, reconstructing source readiness, merging
   exceptions, generating exception-summary narrative locally, or calling `lotus-manage`/`lotus-ai`
   directly.
10. Manage `mode=waves` renders the RFC-0041 DPM rebalance-wave command-center panel through
   Gateway `/api/v1/dpm/command-center/waves*`, preserving manage-owned wave lifecycle, item
   state, source-readiness state, supportability, report-input refs, proof-pack refs, handoff refs,
   blocked actions, lotus-ai workflow-pack run posture, active Manage-owned campaign-definition
   list, bounded campaign-discovery posture, lifecycle-event evidence posture, preview-readiness
   posture, launch-history audit posture, read-only campaign workflow audit posture, and
   `external_execution_claimed` posture. Workbench must not discover global campaign cohorts,
   calculate campaign membership or readiness, infer campaign lifecycle state, mutate assignment or
   maker-checker state, or operate campaign-definition upsert locally.
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
    prompt construction. Manage surfaces also preserve Gateway-provided action-register
    supportability from the portfolio overview `rebalance_snapshot`; missing supportability is
    shown as unknown/N/A rather than as verified zero activity.
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
16. current UX work emphasizes truthful data-backed modules, stronger density, reduced duplication, and cleaner system-wide visual consistency.
17. the governed canonical runtime starts `lotus-core` with `DEMO_DATA_PACK_ENABLED=false` so the
    broad Core app-local demo pack cannot pollute `PB_SG_GLOBAL_BAL_001` evidence, and it starts
    `lotus-idea` by default because the opportunity mode depends on Idea-owned runtime posture.
    It also delegates isolated downstream-capacity resource construction and a single report-only
    submission probe to Idea-owned automation after Idea and Advise are ready. Workbench validates
    exact `/version` provenance and stores only source artifact paths, hashes, and non-certifying
    posture. It must not construct the resource directly, reuse the canonical client portfolio,
    expose resource identifiers or credentials, or interpret this integration proof as load, soak,
    capacity-certification, or supported-feature evidence.
18. `/recommendations`, `/proposals`, `/proposals/simulate`, and `/proposals/{proposalId}` are
    active Gateway-backed advisory lifecycle surfaces. The advisory shell uses a governed journey
    model across overview, RFC-0026 advisor cockpit, RFC-0027 advisory copilot, RFC-0028
    bank-demo proof, opportunities, proposal builder, suitability, risk impact, approval queue,
    client discussion pack, and implementation follow-up
    so future screens can evolve like Manage modes instead of page-local route fragments.
    `/recommendations?mode=cockpit` renders Advise-owned cockpit action items, source evidence,
    supportability, meeting-preparation packets, and bounded advisor acknowledgements through
    Gateway advisor-cockpit endpoints only. Its BFF authority adapter strips browser-supplied
    identity, role, capability, tenant, legal-entity, principal-status, and entitlement headers;
    rejects query/body authority; derives the development advisor from the server-side actor;
    verifies the selected portfolio against configured entitlement; and emits only the exact read
    or acknowledgement capability required by the allowlisted route. Non-development requests
    fail closed until the authenticated principal contract in Workbench #436 and platform #563 is
    implemented. It must not reconstruct advisory policy semantics,
    clear blockers, infer client-ready release, contact clients, route orders, or call
    `lotus-advise` directly. `/recommendations?mode=copilot` renders Gateway-backed RFC-0027
    advisor-use copilot actions over Advise-owned proposal-version source projection, action runs,
    human review posture, unsupported-evidence posture, and blocked client-publication boundaries.
    It must not construct evidence sections, prompts, guardrails, AI/model lineage, review state,
    policy semantics, client-ready release, client communication, order, fill, settlement, or OMS
    posture locally. The proposal builder sources positions and cash through
    Gateway/Core/Advise, lets advisors model buys, sells, off-book instruments, and cash
    movements, evaluates stateful workspaces through `lotus-advise`, and shows advisor-use
    allocation/readiness impact without sending UI-supplied positions or recomputing suitability,
    risk, performance, or execution truth locally. The detail route records advisor-use narrative
    review and reviewed report-package requests through Gateway proposal endpoints only, renders
    delivery-summary and delivery-event posture, and does not generate narrative, infer
    client-ready release, render reports, archive artifacts, contact clients, route orders, or call
    advisory/report/archive/render services directly. `/recommendations?mode=opportunities`
    renders the Gateway-backed Lotus Idea advisor review queue. The Workbench BFF strips browser
    Idea authority headers and applies configured subject, role, route capability, and portfolio
    entitlement only in explicitly development-scoped `dev`/`development`/`local`/`test` runtime.
    It fails closed before Gateway for an unset environment and every other environment until authenticated session principal
    resolution is available (platform #563, Workbench #436), and it rejects unallowlisted
    `/api/v1/ideas/*` paths before Gateway in every environment. The surface is limited to canonical `PB_SG_GLOBAL_BAL_001` until authenticated
    portfolio entitlement is available; it renders score, review posture, source-signal ids, reason codes,
    durable-storage posture, policy version, and
    supported-feature promotion posture, and links only to Gateway candidate detail. Candidate detail
    can record source-owned review actions, feedback, and bounded conversion intents through the
    Workbench BFF with server-derived authority and idempotency; a retry reuses the exact failed
    submission; it refreshes source truth and must not synthesize
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
    `/proposals?mode=suitability`, `/proposals?mode=risk-impact`,
    `/proposals?mode=discussion-pack`, and `/proposals?mode=implementation` are focused
    lifecycle views over the Gateway proposal list contract; Workbench filters proposal lifecycle
    states for advisor navigation but does not calculate suitability, risk impact, consent, or
    implementation truth locally.
19. Portfolio Income & Activity treats Gateway activity summary amounts as positive magnitudes.
    Workbench derives cash direction from the canonical bucket identity: `INFLOWS` increase cash,
    while `OUTFLOWS`, `FEES`, and `TAXES` reduce cash. Unknown buckets remain visible but must be
    excluded from classified net cash movement until the source contract defines their direction.
    Do not infer direction from amount sign, gross-sum activity magnitudes as net cashflow, combine
    income and tax rows into one event count, or infer source readiness from non-zero bookings.
20. Portfolio Cashflow preserves the full Gateway projected-cashflow envelope and keys loading,
    ready, degraded, unavailable, retry, result, and export state by the explicit 10-, 30-, or
    90-day horizon. Workbench must not relabel one horizon's response as another or describe
    cumulative projected movement as opening cash, available cash, ending cash, liquidity
    sufficiency, funding capacity, or a recommendation. Source-backed zero movement is an explicit
    no-movement result; Gateway warnings, partial failures, correlation, contract version,
    projection dates, reporting currency, and booked/projected basis remain visible evidence.
21. Portfolio reporting evidence must distinguish source readiness from generated output. Gateway
    reporting `READY` can be derived from reportable book coverage and does not prove that a
    reporting snapshot exists. Workbench may use `generated_at_utc` as generation evidence, but
    must derive timestamp, row explanation, badge, and tone from one typed posture so generated,
    source-ready but not generated, pending/partial, empty, stale/degraded, unavailable, failed,
    and unknown states cannot contradict one another. Do not treat `row_count` as a generation
    timestamp, leak unknown status codes into business copy, or invent freshness thresholds in the
    browser.

## Architecture And Module Map

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
   Report Centre contracts, Gateway client, source-safe configuration model, workflow state, and
   business-facing components.
8. `src/features/advisor-book/`
   Own-book contracts, fail-closed BFF authority, URL-persisted source filters, reusable loading
   state, business presentation, dedicated landing workspace, and task-preserving portfolio
   context switching over Gateway `PortfolioManagerBookMembership:v1` evidence.
9. `src/features/advisor-cockpit/`
   Reusable route/method allowlist, server-derived development principal, least-privilege
   capability projection, and selected-portfolio entitlement enforcement for Advisor Cockpit BFF
   traffic. Browser proposal components do not own advisor identity or role.
10. `tests/`
   Unit, integration, and Playwright smoke coverage.
11. `wiki/`
   canonical authored source for GitHub wiki publication and operator-facing Workbench summaries.

## Runtime And Integration Boundaries

Runtime model:

1. Next.js application with browser and server-rendered behavior,
2. primary product dependency is `lotus-gateway`,
3. live platform validation uses canonical `*.dev.lotus` routing.

Boundary rules:

1. UI features must be backed by supported gateway functionality,
2. direct raw service consumption is not the default pattern,
3. presentation logic may shape or prioritize information, but domain authority stays upstream,
4. visual polish should not introduce fake data, duplicated meaning, or unsupported workflow states,
5. domain-product discovery UI must consume gateway domain-product APIs only and must render
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
   to review over clever framework-specific indirection.

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
   trivy-action 0.35.0 commit because mutable Trivy ecosystem references were compromised in March
   2026. Any scanner refresh requires explicit supply-chain review and issue traceability, and
7. Dockerized local Vitest parity uses an explicit two-worker ceiling so it remains deterministic
   while the canonical Lotus stack is running, and masks workstation `.env.local` with the tracked
   empty CI fixture. Do not replace these controls with per-test timeout inflation, disabled
   assertions, `passWithNoTests`, global serialization, or developer-local environment values.
8. runtime health is owned by the production image through the dependency-free Node probe copied
   from `scripts/runtime/workbench-healthcheck.mjs`. Compose must inherit that image health contract;
   do not install `wget`, `curl`, a package manager, or another diagnostic tool solely to make a
   Compose-only probe pass.

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
3. browser smoke is validated through Playwright,
4. Docker and build validation remain part of the merge gate,
4. canonical live validation matters when a change affects integrated product flows,
5. `-RequireMainlineSources` is required for mainline/RFC certification: ordinary canonical and
   `-LocalApps` runs are useful branch-local development evidence, not certification evidence,
6. README and wiki updates should keep active product-surface truth explicit, especially when
   legacy compatibility routes still exist beside the supported Portfolio and Performance paths,
6. product docs should distinguish active shell navigation from disabled or compatibility-only
   routes when the shell bootstrap contract does not treat every historical route as supported,
7. route-file existence alone is not enough for documentation truth; use shell registry,
   capabilities tests, redirect behavior, and canonical runtime guidance before describing a surface
   as supported.
8. RFC-0108 analytics UI observability for supported Workbench Portfolio, Performance, Risk, and
   Reporting operator reads is centralized in
   `src/features/analytics-observability/metrics.ts`; keep the explicit observed-surface registry
   in sync when adding or retiring portfolio, performance, risk, or reporting operator panels, and
   never emit portfolio, client, document, session, report batch, trace, request body, response
   body, or screen-content identifiers as metric labels. The metrics helper consumes Gateway
   `source_supportability` arrays for performance/risk freshness and supportability posture, with
   stale source freshness taking precedence over ready source items. State-changing Workbench
   actions should use the mutation observation helper so they emit bounded request, state, and
   applicable attention metrics without incrementing panel hydration counters.
9. DPM outcome-review Workbench reads use the same bounded observability registry. Metric labels
   must identify only governed route, panel, operation, freshness, supportability, and status
   classes; outcome review ids, portfolio ids, proof-pack ids, rebalance run ids, request payloads,
   response payloads, hashes, and lineage references must stay out of metric labels.
10. Repository-source governance assertions must be platform-newline portable. Assert semantic
    lines, fields, and ordered contracts with `\r?\n` handling or explicit LF/CRLF cases; do not
    make a green Windows gate depend on LF-only byte substrings.
11. Async UI tests must synchronize on the advisor-visible settled outcome as well as asserting the
    Gateway request. A mock being called proves request start, not that React has committed success,
    failure, or refreshed evidence. Do not replace a missing outcome boundary with sleeps, timeout
    inflation, retries, or suite serialization.
12. Route tests must not repeatedly reset and reload the full Next module graph merely to vary
    runtime configuration. Extract a small deterministic input parser or selection seam, read
    runtime configuration at invocation time, and retain one bounded route-composition proof.
10. DPM mandate command-center reads and monitoring actions use bounded observability labels for
    command-center summary, exceptions, mandate lookup, mandate health, and monitoring run-once
    operations. Metric labels must not include portfolio ids, mandate ids, PM ids, book ids,
    monitoring run ids, exception ids, source-run ids, request bodies, response bodies, or screen
    content.
11. DPM outcome-review AI narrative requests are Workbench state-changing mutations through
    Gateway only. Workbench may display bounded workflow-pack run status returned by Gateway/AI,
    but it must not construct AI prompts, generate recommendations, score PMs, or treat a narrative
    run as autonomous approval.
12. DPM construction alternative generation and selection are Workbench state-changing mutations
    through Gateway only. Workbench may construct the stateful source selector needed to invoke the
    Gateway/manage contract, but it must not synthesize stateless portfolio snapshots, price
    payloads, target weights, optimization outcomes, supportability states, or selection decisions.
13. DPM proof-pack generation, retrieval, Markdown, report-input, AI-evidence reads/actions, and
    governed AI PM memo requests are Workbench gateway-only operations. Observability labels must
    remain bounded to route, panel, operation, freshness, supportability, status class, and error
    category; proof-pack ids, rebalance run ids, mandate ids, portfolio ids, content hashes, source
    hashes, workflow-pack run ids, request bodies, response bodies, and screen content must never
    be emitted as metric labels.
14. DPM rebalance-wave reads and mutations are Workbench gateway-only operations. Observability
    labels must remain bounded to route, panel, operation, freshness, supportability, status class,
    and error category; wave ids, wave item ids, portfolio ids, proof-pack ids, handoff refs,
    campaign ids, report-input refs, workflow-pack run ids, request bodies, response bodies, and
    screen content must never be emitted as metric labels.
15. DPM portfolio-memory reads are Workbench gateway-only operations. Observability labels must
    remain bounded to route, panel, operation, freshness, supportability, status class, and error
    category; portfolio ids, event ids, source refs, artifact refs, content hashes, request bodies,
    response bodies, and screen content must never be emitted as metric labels.
16. DPM PM operating quality policy, score-run, score-run summary, score-run preview, create,
    fairness-analysis preview/create/list/detail, review-action preview/create/list/detail, and
    summary-invocation preview/create/list/detail operations are Workbench gateway-only operations.
    Observability labels must remain bounded to route, panel, operation, freshness,
    supportability, status class, and error category; policy ids, policy versions, score-run ids,
    fairness-analysis ids, review-action ids, summary-invocation ids, segment ids, PM ids, book ids,
    source refs, content hashes, artifact refs, workflow run ids, request bodies, response bodies,
    generated summary text, prompts, model responses, score values, and screen content must never
    be emitted as metric labels.
17. Proposal advisor narrative actions are Workbench gateway-only operations. UI state must stay
    explicit about advisor-use review, reviewed narrative package inclusion, report delivery
    posture, and latest delivery event, without presenting report rendering, archive publication,
    client messaging, or client-ready release as Workbench-owned capabilities.
18. Advisor suitability policy review queue reads and bounded evidence-review requests are
    Workbench gateway-only operations backed by Gateway advisory-policy evaluation contracts.
    Workbench may display Advise-owned review queue posture, selected evaluation detail,
    sign-off source-package posture, policy workflow posture, client-publication block posture,
    open approval/disclosure/consent requirements, source-evidence completeness, and advisor next
    action. Workbench may record a request for more evidence against the source evaluation hash,
    but it must not calculate suitability locally, approve or waive policy findings, record
    policy sign-off approval, infer client-ready release, or expose raw policy payload field names
    on advisor-facing screens.
19. Portfolio transaction monetary fields must retain their source currency semantics through view
    models, grids, drawers, totals, and exports. Pair `gross_amount` and `price` with transaction
    `currency`; pair `net_cost_base` and `realized_gain_loss_base` with portfolio base currency.
    Do not use a gross/base fallback as one labeled amount or aggregate mixed currencies. Preserve
    Gateway `total`, `skip`, and `limit` when a transaction screen claims ledger coverage.
20. Advisor-book UI must consume only Gateway `/api/v1/advisor-book/portfolios`, validate exact
    `v1` own-book and `PortfolioManagerBookMembership:v1` semantics, and preserve Gateway
    supportability, tenant-scope, assignment-basis, paging, and provenance evidence. The browser
    must not infer household, team, delegated, supervisor, AUM, attention, or ownership scope; it
    must not fall back to the global portfolio catalogue when membership is unavailable. Shared
    context switching must retain the current business route and supported query state, reset
    portfolio-specific stale state, and restore keyboard focus. Until #436 delivers an
    authenticated principal, BFF advisor-book authority is development-configured only and fails
    closed elsewhere.
21. Performance browser proof must read source module capabilities and source economics before
    asserting optional metrics or analytical rows. Use `npm run test:e2e:performance:populated`
    for the complete metric/layout precondition and
    `npm run test:e2e:performance:unavailable` for truthful degraded behavior. Keep live-only
    timing checks separate, use default independent Playwright execution rather than serial mode,
    and do not let one summary failure skip Analysis, Contribution, or Evidence journeys.
22. Performance attribution level totals are source-owned analytics. Workbench may aggregate
    portfolio and benchmark exposure weights for presentation, but it must bind allocation,
    selection, interaction, and total attribution effect directly to the Gateway contract rather
    than reconstructing them from detail rows. Render missing optional component totals as
    `Unavailable`; reserve `—` for intentionally non-additive return columns. A missing required
    total effect is malformed upstream evidence owned by Gateway issue #506, not a reason to make
    the Workbench contract nullable or substitute zero.

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

## Context Maintenance Rule

Update this document when:

1. route ownership or major app areas change,
2. repo-native commands or CI expectations change,
3. the gateway-first integration model changes,
4. dominant design-system or shell patterns change,
5. current product-surface maturity or rollout posture materially changes,
6. active versus legacy route posture changes.
7. domain-product discovery route, gateway endpoint usage, or trust-state rendering changes.

## Cross-Links

1. `../lotus-platform/context/LOTUS-QUICKSTART-CONTEXT.md`
2. `../lotus-platform/context/LOTUS-ENGINEERING-CONTEXT.md`
3. `../lotus-platform/context/CONTEXT-REFERENCE-MAP.md`
4. `../lotus-platform/context/Repository-Engineering-Context-Contract.md`
5. [Lotus Developer Onboarding](../lotus-platform/docs/onboarding/LOTUS-DEVELOPER-ONBOARDING.md)
6. [Lotus Agent Ramp-Up](../lotus-platform/docs/onboarding/LOTUS-AGENT-RAMP-UP.md)
