# Supported Features

This page separates implementation-backed Workbench capability from target-state roadmap language.
It is intended for developers, business users, operations, sales/pre-sales, and demo preparation.

## Current Implementation-Backed Surfaces

| Surface | Route | Backing contract | Current support |
| --- | --- | --- | --- |
| Portfolio summary and detail | `/portfolio`, `/portfolio?tab=detailed` | Gateway Workbench portfolio APIs | Supported with canonical live proof. |
| Portfolio income and activity | `/income` | Gateway portfolio workspace `income_summary` and `activity_summary` | Supported as the dedicated source-backed screen for income composition, source-defined activity buckets, net movement, cash weight, and evidence posture. Workbench does not forecast income or calculate activity classifications locally. |
| Performance and risk review | `/performance` route modes | Gateway performance/risk APIs | Supported with bounded observability and canonical proof. |
| Data-product discovery | `/data-products` | Gateway domain-product APIs | Supported for catalog, dependencies, and live trust posture. |
| Advisor proposal narrative posture | `/proposals`, `/proposals/{proposalId}` | Gateway `/api/v1/proposals*` | Implemented for advisor proposal queue/detail, advisor-use narrative review, reviewed narrative report-package request, delivery-summary posture, delivery-event posture, and governed canonical proof through Gateway only. Canonical validation creates a seeded advisor-review narrative proposal, exercises the panel, and captures `proposal-narrative-posture-live.png`. The shell `Proposal` app entry remains disabled until broader product promotion is separately proven. |
| DPM mandate command center | `/workbench/{portfolioId}`, `/workbench/{portfolioId}?mode=mandate` | Gateway `/api/v1/dpm/command-center*` | Supported for embedded canonical mandate cockpit, PM-book-backed monitoring action, active exception queue, and governed exception-summary request through Gateway/Manage/lotus-ai. Workbench preserves Manage supportability posture: populated canonical `READY` is demo-ready, `PARTIAL`/`DEGRADED`/`BLOCKED` render as explicit partial states, and `EMPTY` stays an empty state rather than a false ready cockpit. |
| DPM rebalance-wave command center | `/workbench/{portfolioId}?mode=waves` | Gateway `/api/v1/dpm/command-center/waves*` | Implemented for wave queue, preview, create, detail, items, source-check, simulation, approval, staging, handoff, proof posture, supportability, report-input, governed AI PM memo, governed operations-handoff summary, active Manage-owned campaign-definition list rendering, lifecycle evidence, append-only launch history, preview-readiness review, launch-package readiness, and READY-gated campaign launch through Gateway only. |
| DPM construction alternatives | `/workbench/{portfolioId}?mode=construction` | Gateway `/api/v1/dpm/command-center/construction/alternative-sets*` | Implemented for generation, comparison, and PM selection through Gateway only. Canonical panel proof is governed as `dpm.construction_alternatives` and does not claim Workbench-local construction methodology, order routing, trade execution, or OMS truth. |
| DPM proof-pack evidence | `/workbench/{portfolioId}?mode=proof` | Gateway `/api/v1/dpm/command-center/proof-packs*` | Implemented for generation from Gateway rebalance-run reference, proof-pack identity, sections, hashes, Markdown/report/AI posture, and governed PM memo request posture. |
| DPM portfolio memory | `/workbench/{portfolioId}?mode=memory` | Gateway `/api/v1/dpm/command-center/portfolios/{portfolio_id}/memory` | Implemented for manage-owned timeline event order, event mix, source systems, source refs, artifact refs, reason codes, supportability, and content hash; canonical live proof accepts populated ready, partial, degraded, and blocked source truth while still failing empty or unsupported memory. |
| DPM outcome review | `/workbench/{portfolioId}?mode=reviews` | Gateway `/api/v1/dpm/command-center/outcome-reviews*` | Implemented for review list, dimensions, source lineage, report input, AI evidence, report job, and AI narrative request. |
| DPM PM operating quality | `/workbench/{portfolioId}?mode=quality` | Gateway `/api/v1/dpm/command-center/pm-operating-quality*` | Implemented for Manage-owned policy, score-run, source-defined segment, fairness-analysis preview/create/list/detail, score-run support-summary request, bounded supervisory review-action preview/create/list/detail, and summary-invocation preview/create/list/detail through Gateway only. Review-action and summary-invocation creates are preview-gated and record Manage-owned evidence; summary-invocation controls do not submit or render generated summary text, prompts, or model responses. Workbench does not calculate PM scores, fairness spreads, segment membership, PM rankings, HR/conduct posture, client communication, trade/order, OMS, execution, fills, or settlement truth. |
| DPM PM copilot workspace | `/workbench/{portfolioId}?mode=copilot` | Gateway/lotus-ai workflow-pack posture | Implemented for bounded PM copilot posture, evidence owner, workflow owner, forbidden-use boundaries, and no-prompt-storage posture. Canonical panel proof is governed as `dpm.copilot_workspace`; Workbench does not store prompts, store generated responses, contact clients, route orders, or claim OMS execution. |

## DPM Portfolio Memory

## Advisor Proposal Narrative Posture

The RFC-0023 proposal detail panel gives advisors and supervisors a bounded way to review
advisor-use narrative posture before downstream report packaging.

Implemented:

1. lists proposal queue items from Gateway and opens direct proposal detail routes,
2. loads proposal detail, workflow, approvals, lineage, delivery summary, and delivery events
   through the Workbench BFF/Gateway boundary,
3. records advisor-use narrative review against an explicit proposal version with an idempotency
   key,
4. requests reviewed narrative report packaging through Gateway with
   `include_reviewed_narrative=true`,
5. displays review posture, report-package posture, delivery status, latest delivery event, policy
   version, and source narrative hash,
6. participates in canonical Workbench proof as `proposal.narrative_posture` with a governed
   screenshot after advisor-use review and reviewed report-package request pass,
7. renders missing evidence as explicit not-reviewed, not-requested, no-report, or no-event states
   rather than inferring client-ready status.

Not supported in Workbench:

1. narrative generation,
2. client-ready publication inference,
3. PDF rendering,
4. archive publication,
5. client contact or client messaging,
6. direct calls to `lotus-advise`, `lotus-report`, `lotus-render`, or `lotus-archive`.

The RFC40-WTBD-010 portfolio-memory panel gives portfolio managers, operations, audit, and
sales/pre-sales a single readable event trail for DPM evidence.

Implemented:

1. loads portfolio memory through Gateway only,
2. renders manage-owned supportability, event count, event type counts, source systems, reason
   codes, source-system/source-type facets, bounded search boundary, and content hash,
3. preserves event order, event type, event time, source refs, artifact refs, and reason codes,
4. handles empty, partial, degraded, unsupported, unavailable, and endpoint error states without implying
   local reconstruction,
5. emits bounded observability for `dpm.portfolio-memory.get` and
   `dpm.portfolio-memory.search` without portfolio ids, event ids, source refs, source ids,
   content hashes, request bodies, response bodies, or screen content as labels.

Not yet supported:

1. event detail drawers,
2. global portfolio-universe discovery,
3. retention or audit-policy controls,
4. cross-app lifecycle export,
5. client-demo script steps beyond the canonical Workbench screenshot after live validation.

## DPM Wave Command Center

The first RFC-0041 Workbench wave panel is intentionally bounded.

Implemented:

1. lists explicit portfolio-list waves through Gateway,
2. previews and creates a canonical portfolio wave through the Workbench BFF/Gateway boundary,
3. opens wave detail and item posture,
4. source-checks, simulates, approves, stages, and hands off selected waves through Gateway,
5. renders manage-owned lifecycle state, item state, source-readiness state, supportability,
   aggregate metrics, report-input refs, proof-pack refs, handoff refs, reason codes, blocked
   actions, remediation owner, and `external_execution_claimed` posture,
6. requests governed `lotus-ai` wave PM memo and operations-handoff summary workflow-pack runs
   through Gateway only and displays review-required workflow-pack posture without constructing
   prompts, memo text, handoff summaries, execution instructions, or client messages locally,
7. lists active Manage-owned `BulkReviewCampaignDefinition:v1` definitions through Gateway and
   renders campaign name, version, status, as-of date, candidate count, eligible portfolio type,
   governance posture, and source-backed posture without rendering content hashes or recalculating
   membership,
8. reads bounded `BulkReviewCampaignDiscovery:v1` posture through Gateway and renders Manage-owned
   eligible candidate count, expiry posture, access purpose, governance posture, and source-ref
   posture without discovering global campaign cohorts,
9. opens campaign lifecycle evidence through Gateway for a selected campaign definition and exposes
   bounded Gateway-backed retire/supersede controls that require actor, reason, and replacement
   lineage for supersede, then refreshes campaign definitions and lifecycle evidence without
   inferring lifecycle state or recalculating membership locally,
10. opens paged append-only `BulkReviewCampaignDefinitionLaunchHistory:v1` through Gateway and
   displays Manage-recorded wave id, launched-at time, launched-by actor, requested as-of date,
   correlation id, idempotency key, page counts, and operating boundaries without recomputing launch
   state, membership, readiness, idempotency, maker-checker, trade approval, order generation,
   routing, fills, settlement, or OMS execution,
11. checks campaign preview readiness and launch-package readiness through Gateway and enables
   launch only when Manage returns `READY`, preserving source-owned reason codes, blocked actions,
   source posture, durable wave, and idempotency evidence without recomputing membership,
   readiness, maker-checker workflow, trade approval, staging, or OMS execution locally,
12. renders read-only Manage campaign workflow audit evidence from Gateway operating queue,
   approval inbox, workflow board, assignment plan, workflow automation, approval-decision,
   assignment-action, assignment-task, and maker-checker read endpoints, preserving source refs,
   count/page metadata, reason codes, content hashes, task-transition posture, and operating
   boundaries without mutating assignment or maker-checker state,
13. emits bounded Workbench observability labels without portfolio ids, wave ids, campaign ids,
   report-input refs,
   workflow-pack run ids, request bodies, or response bodies as metric labels.

Not yet supported:

1. dedicated `/dpm/waves` route,
2. PM-book discovery or automatic affected-portfolio discovery,
3. item selection drawer,
4. richer workflow drawers and eligibility explanations beyond manage reason-code rendering,
5. global campaign discovery or campaign-definition upsert UX,
6. CIO approval workflow,
7. external OMS/execution integration,
8. client-side source-readiness, report-input, proof-pack, AI prompt, memo narrative,
   operations-handoff summary, exception-summary narrative, or handoff calculation.

## DPM Flow Diagram

```mermaid
flowchart LR
  PM[Portfolio manager] --> WB[Workbench /workbench/{portfolioId}]
  WB --> BFF[Workbench BFF]
  BFF --> GW[Gateway DPM command-center APIs]
  GW --> Manage[lotus-manage DPM authority]
  Manage --> Waves[RFC-0041 waves]
  Manage --> Construction[RFC-0039 alternatives]
  Manage --> ProofPacks[RFC-0040 proof packs]
  Manage --> Memory[RFC40-WTBD-010 portfolio memory]
  Manage --> Outcomes[RFC-0042 outcomes]
  GW --> Report[lotus-report via Gateway]
  GW --> AI[lotus-ai via Gateway]
```

## Demo Guidance

Use `PB_SG_GLOBAL_BAL_001` and the canonical local runtime. Demo claims should say that Workbench
is Gateway-backed and manage-owned for DPM operating truth. You may claim source-owned PM-book
resolution for the embedded command-center run-monitoring action after canonical validation passes.
Canonical screenshots require a populated `READY` command-center summary. The Workbench view model
and live validator preserve partial, degraded, blocked, and empty posture for
diagnostics and regression evidence.
Do not claim external execution, Workbench-local PM-book inference, dedicated PM-book wave discovery
screens, or autonomous CIO approval until those owning services and Workbench proof promote them.
