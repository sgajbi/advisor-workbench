# Validation and CI

Current evidence posture: this page maps implemented Workbench checks to the claims they can
support. PR checks prove merge readiness for the exact branch head; canonical and mainline lanes
remain separate evidence classes and must not be inferred from a green local test or screenshot.

## Evidence Map

Validation depth must match the claim being made. A narrow unit test can prove a local contract,
while integrated product support requires canonical runtime evidence and green repository lanes.

| Change or Claim | Minimum Evidence | Promotion Boundary |
| --- | --- | --- |
| Local route or serializer | Focused behavioral test plus lint/typecheck | Does not certify an upstream or whole-product contract |
| Product UI behavior | Unit/integration coverage, build, and relevant browser smoke | Must remain Gateway-backed and capability-truthful |
| Canonical front-office support | `live:validate` evidence for the governed seed and affected panels | Screenshots alone cannot promote support |
| Merge readiness | Feature Lane and PR Merge Gate | Mainline is not proven until Main Releasability passes |
| Demo evidence | Passing canonical validation plus same-run evidence pack | Diagnostic captures stay separate |

## Lane model

`lotus-workbench` uses:

1. `Remote Feature Lane`
2. `Pull Request Merge Gate`
3. `Main Releasability Gate`

PR auto-merge uses the repository `LOTUS_AUTOMERGE_TOKEN` secret for rebase auto-merge so the
resulting main update is not suppressed as a default `GITHUB_TOKEN` push. When the secret is absent,
the workflow records a warning and skips queueing auto-merge instead of making a false readiness
claim. A merged-PR dispatcher triggers `main-releasability.yml` for exact-main evidence, and the
main releasability workflow deduplicates main-branch push and dispatch events through its
concurrency group.

## Local command mapping

- `make check`
  dependency security, lint, typecheck, coverage-backed test gate, build
- `make security`
  fails on any high or critical advisory in the complete runtime and engineering toolchain, and on
  any moderate-or-higher advisory in the browser-delivered production dependency graph. The gate
  runs in the Feature, PR Merge, and Main Releasability lanes. A future exception must be
  time-bounded and documented against a GitHub issue; do not weaken the severity thresholds or use
  `npm audit fix --force` as an unreviewed dependency migration.
- `make lint`
  runs runtime-support and direct-dependency-admission governance, CSS and architecture controls,
  screen-documentation governance, and then the maintained ESLint CLI over the repository root
  with the flat configuration. The CSS gate keeps `src/app/globals.css` as a small import-only
  entrypoint, preserves governed global layer order, and blocks global-style budget growth unless
  the baseline is intentionally updated with issue evidence. It also rejects migrated component
  selector families, including `portfolio-screen-rail`, if they return to a governed global layer.
  Production app source keeps the direct Next, Core Web Vitals, TypeScript, and stable React Hooks
  correctness rules; tests, live validators, scripts, and configuration files are scanned by the
  shared TypeScript/JavaScript policy. Deprecated `next lint` and `eslint-config-next` are not part
  of the governed gate.
- `npm run quality:dependency-risk`
  fails closed unless every and only direct production dependency is reconciled across
  regular, optional, or required-peer `package.json` sections, the matching lockfile-root section
  and resolved lock entry, the complete executable JSON Schema, and the versioned technology-risk inventory. It
  rejects mutable or prerelease versions, unapproved or missing SPDX evidence, unsupported
  lifecycle, malformed HTTPS evidence, missing stewardship/security channels, ungoverned review
  ownership, ownerless architecture or exit posture, expired reviews, prohibited state, and
  incomplete or expired exceptions. This is a blocking Workbench control; the referenced Lotus
  platform technology policy remains report-only.
- `npm run lint:css-global`
  validates `src/app/globals.css`, `src/styles/global/*`, and
  `scripts/quality/css-global-governance-baseline.json` against the documented CSS layer model in
  `docs/architecture/css-layer-governance.md`, including exact size ratchets and forbidden migrated
  selector prefixes.
- `npm run lint:react-compiler`
  runs the broader `eslint-plugin-react-hooks` recommended rule set against `src/` as an explicit
  report-only React Compiler compatibility evaluator. It is not part of `make check`, Feature Lane,
  PR Merge Gate, or Main Releasability until its finding families are refactored and promoted by a
  focused governance change. Running the evaluator does not enable the React Compiler runtime.
- `make build`
  runs `next build` after the repository-owned lint and typecheck gates in `make check`. Workbench
  does not rely on Next's duplicate build-time ESLint integration as the lint authority.
- `make test-e2e`
  Playwright smoke validation. The launcher retains the Next incremental cache, performs a fresh
  production build, allows up to four minutes for build and server readiness, and owns the direct
  server child so cancellation cannot leave a shell-owned listener behind. Set
  `PLAYWRIGHT_REUSE_VALIDATED_BUILD=1` only immediately after a successful production build in the
  same worktree; the launcher fails closed when `.next/BUILD_ID` is absent. When port `3000`
  belongs to a shared stack or another worktree, set `PLAYWRIGHT_PORT=<free-port>`. An explicit port
  binds the production server, readiness probe, and browser base URL to that listener and disables
  existing-server reuse, so the proof cannot silently exercise a stale Workbench build.
- `npm run test:e2e:performance:populated`
  deterministic production-browser proof for complete Performance economics, supported modules,
  evidence navigation, contribution detail, and desktop layout. The isolated fixture Gateway uses
  existing governed contract builders; its live-only Server-Timing check is explicitly skipped.
- `npm run test:e2e:performance:unavailable`
  deterministic production-browser proof for source-owned unavailable return, benchmark, horizon,
  contribution, metric, and evidence postures. Populated-only geometry and live-only timing checks
  are explicitly skipped instead of weakening their preconditions.
- `make ci-local-docker`
  Docker parity built from the same immutable Node 22 Maintenance LTS Debian Bookworm slim base as
  the production image; Vitest is capped at two workers so the lane remains deterministic while the
  governed canonical stack shares the developer workstation, and workstation `.env.local` is masked
  by a tracked empty read-only fixture
- `npm run live:validate`
  canonical integrated product validation
- `npm run live:stack:up:validate`
  one-command canonical stack bring-up and validation; this rebuilds Docker-backed service images
  so Gateway, Advise, Manage, and Workbench proof reflects the current checked-out sources
  The startup preflight accepts only expected canonical Docker owners after normalizing host paths,
  and the core seed runs with the shared `portfolio_common` library on `PYTHONPATH` instead of
  depending on workstation-global Python packages.
- `npm run live:stack:preflight`
  non-mutating audit of current canonical host-port ownership; approved Compose project/path pairs
  pass, while wrong-project, missing, relative, malformed, and foreign ownership fails before any
  runtime state changes
- `npm run test:runtime-ownership`
  executable contract for canonical, repeated-separator, case, trailing-separator, parent-segment,
  relative, malformed, and foreign Compose working-directory decisions; enforced in feature, PR,
  and main quality lanes
- `npm run live:validate:construction`
  focused RFC-0039 construction alternatives proof against the running canonical stack
- `npm run live:evidence`
  post-validation observability, logging, metrics, API, and dashboard evidence capture
- `npm audit --json`
  detailed dependency advisory evidence for the Workbench runtime and test toolchain; the enforced
  `make security` policy additionally keeps the production graph free of moderate-or-higher
  findings

## What the gates protect

- versioned runtime-support reconciliation across package metadata, lockfile engines, exact CI
  Node, bundled npm, the digest-pinned container, canonical immutable install commands, exact
  Playwright, explicit Chromium projects, and the mandatory review date
- real app-surface coverage across the active product paths
- browser smoke for supported front-office flows
- Docker parity for production-like runtime assumptions
- executable canonical Compose ownership and reused-stack safety
- canonical seeded-data validation for integrated product proof
- dependency posture for browser-delivered code and the Node-based build/test toolchain
- immutable official Node LTS/glibc runtime provenance, unprivileged execution, production-only
  standalone traced runtime dependencies, no runtime package-manager toolchain, fixable
  high/critical image enforcement, and downloadable CycloneDX SBOM evidence
- image-owned, dependency-free Node readiness that `docker compose` inherits after development
  tools and package managers are removed; no runtime `wget` or `curl` dependency is required
- allowlisted production build context that excludes local environment values, generated evidence,
  test assets, documentation, caches, and logs from the image builder
- full-SHA scanner-action pinning and an explicitly safe Trivy binary version; mutable scanner tags
  are prohibited because the Trivy ecosystem was compromised in March 2026
- GitHub Actions JavaScript action runtime posture, using Node 24-capable action majors for
  checkout, setup-node, and artifact upload so CI warnings do not hide product-surface failures

## Evidence posture

- canonical browser validation writes screenshots and structured summary output under
  `output/playwright/live-canonical/`
- `live-validation-summary.json` includes a `supportabilityMatrix` with registered/classified
  panel counts, required and observed supportability states, owning services, non-ready panel
  evidence, and missing-panel checks; review this matrix before accepting screenshots as
  demo-ready evidence
- `live-validation-summary.json` also includes `rfc3643FeatureCoverage`, which maps implemented
  RFC-0036 through RFC-0043 front-office features to live API, workflow-pack, seeded entity, and
  panel evidence. Adjacent proposal evidence, including RFC-0024 proposal memo/evidence-pack
  validation, is marked as `auditScope=adjacent-front-office` and counted separately so it cannot
  inflate RFC36-43 completion counts or fail the RFC36-43 assertion by itself. Adjacent gaps remain
  visible through the aggregate and adjacent gap counts. RFC-0041 coverage includes the governed
  multi-portfolio explicit-list wave preview from the canonical contract. RFC-0037 coverage includes
  bounded Core `DpmPortfolioUniverseCandidate:v1` candidate-source preview and the required rejection
  of mixed Core-discovery/manual-portfolio requests. Treat remaining scenario-expansion notes as open
  validation depth, not as implemented product claims.
- construction alternatives live proof writes focused machine-readable evidence and a panel
  screenshot under `output/rfc39-wtbd002-construction-lab/construction-live/`
- DPM PM operating-quality live proof creates and re-reads Manage-backed score-run,
  fairness-analysis, supervisory review-action, and summary-invocation evidence through Gateway
  before the panel is classified as ready
- RFC-0024 advisory journey route proof is recorded in `advisoryJourneyChecks` with screenshots for
  Advisory Overview, Client Context, Opportunities and Ideas, Proposal Builder, Proposal
  Simulation, Suitability Review, Risk and Impact, Approval Queue, Discussion Pack Review, and
  Implementation Status. This is route evidence over existing Gateway-backed screens, not a new
  client-ready, communication, execution, or backend capability claim.
- RFC-0025 Suitability Review policy-queue proof must use the Gateway-backed advisory policy
  review queue, selected evaluation, sign-off package, workflow posture, and bounded
  request-more-evidence decision route. The live validator seeds this from the governed
  `RFC25_SG_STRUCTURED_NOTE_PENDING_REVIEW` scenario in the canonical front-office demo-data
  contract, then records `POLICY_EVALUATION_PENDING_REVIEW_CREATED` in `workflowPackChecks`.
  It must verify that Workbench renders source-owned policy posture in advisor language without
  claiming local suitability calculation, policy approval, waiver authority, sign-off completion, or
  client-ready publication.
- Lotus Idea opportunity proof must use Gateway `/api/v1/ideas/review-queues/advisor` and the
  active portfolio as caller entitlement scope. The panel is not a supported-feature promotion until
  canonical browser validation proves populated Workbench rendering, source-safe candidate detail
  access, review-action, feedback, and bounded conversion-intent controls through Gateway, source
  persistence with an accepted/replayed receipt, and queue/detail refresh after each mutation.
  Browser proof requires the stable action status test id and `recorded-and-refreshed` state; product
  copy remains supporting evidence and may evolve without weakening persistence or refresh proof.
  It also proves no reranking, no auto-proposal creation, no suitability
  authority, no execution authority, and no client-publication claims.
  The canonical Lotus Idea seed takes its as-of date from the platform demo-data contract instead of
  duplicating date literals in Workbench startup automation.
- RFC or mainline certification runs must invoke the canonical startup script with
  `-RequireMainlineSources`. The preflight writes a source-safe provenance manifest and fails
  before Docker, seeding, or screenshots when any canonical participant is dirty or not exactly at
  `origin/main`. Certification startup forces image builds and container recreation, compares
  preflight and post-start source manifests, and binds Lotus Idea runtime `/version` provenance
  before recording the mainline-source posture. Its manifests and Idea capacity-seed evidence are written to a per-run Local AppData
  directory outside checked source worktrees, so generated evidence cannot make the source preflight
  appear dirty. Standard and `-LocalApps` runtime runs remain branch-local development evidence.
- Lotus Idea capacity integration proof must use Idea-owned seed and workload automation after Idea
  and Advise readiness. The validator matches Idea `/version` to the checked-out commit and branch,
  requires the isolated `CAPACITY_SYNTHETIC_PORTFOLIO_001` namespace, and accepts exactly one
  report-only downstream-submission probe. Workbench evidence retains artifact paths, SHA-256
  digests, and provenance but excludes conversion-intent identifiers, downstream paths, and
  credentials. Canonical startup binds one per-run local trusted-caller marker to the Idea runtime
  and capacity seed process, while Idea must still send complete synthetic entitlement scope through
  its public API policy for every governed mutation. This is local/dev proof wiring only; it is not
  a production identity provider, session/token-claims authority, endpoint-policy bypass, load,
  soak, production capacity, or feature-support certification.
- RFC-0028 bank-demo proof validation must read the Gateway-backed scenario contract and
  supported-claim register, verify the governed scenario id, proof marker, and claim postures, and
  render `/recommendations?mode=proof` as `advisory.bank_demo_proof`. The screenshot is accepted
  only when Workbench shows blocked client-publication posture without local claim promotion,
  approval, client communication, order, fill, settlement, or OMS claims.
- observability evidence capture writes local non-functional proof packs under
  `output/observability-live/<timestamp>/`
- final visual review should use canonical validated captures, not pre-validation diagnostics

## Canonical live validation coverage

The governed front-office validation flow checks the seeded `PB_SG_GLOBAL_BAL_001` runtime across:

- portfolio summary and detailed surfaces
- performance summary and analysis surfaces
- advisor-brief and risk modes inside the performance experience
- RFC-0024 advisory journey routes and proposal memo/evidence-pack posture through Gateway-backed
  Workbench screens
- RFC-0028 bank-demo proof scenario and supported-claim posture through Gateway-backed Workbench
  screens
- evidence-oriented product validation paths that are part of the current governed runtime
- DPM outcome review, proof pack, command center, portfolio memory, rebalance-wave command center,
  Core candidate-source wave preview/no-caller-portfolio guard, construction alternatives,
  PM operating quality, and PM copilot workspace

When validating active Workbench source changes, use the governed local-app bring-up
`npm run live:stack:up:workbench-local` so `workbench.dev.lotus` serves the current branch while
Gateway and backend Lotus apps remain on the canonical stack. Docker-backed Workbench evidence is
valid for released images, but it must not be used to prove newly changed Workbench panels.
For one-command proof, `npm run live:stack:up:validate` rebuilds Docker-backed service images before
validation. Stale containers can hide new Gateway or Advise routes, render old panel text, and turn
the live validator into evidence for the wrong runtime build.
