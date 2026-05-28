# Validation and CI

## Lane model

`lotus-workbench` uses:

1. `Remote Feature Lane`
2. `Pull Request Merge Gate`
3. `Main Releasability Gate`

## Local command mapping

- `make check`
  lint, typecheck, coverage-backed test gate, build
- `make test-e2e`
  Playwright smoke validation
- `make ci-local-docker`
  Docker parity
- `npm run live:validate`
  canonical integrated product validation
- `npm run live:stack:up:validate`
  one-command canonical stack bring-up and validation; this rebuilds Docker-backed service images
  so Gateway, Advise, Manage, and Workbench proof reflects the current checked-out sources
- `npm run live:validate:construction`
  focused RFC-0039 construction alternatives proof against the running canonical stack
- `npm run live:evidence`
  post-validation observability, logging, metrics, API, and dashboard evidence capture
- `npm audit --json`
  dependency advisory posture for the Workbench runtime and test toolchain; canonical proof logs
  should not carry unresolved critical or high dependency findings

## What the gates protect

- real app-surface coverage across the active product paths
- browser smoke for supported front-office flows
- Docker parity for production-like runtime assumptions
- canonical seeded-data validation for integrated product proof
- dependency posture for browser-delivered code and the Node-based build/test toolchain
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
