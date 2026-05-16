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
| DPM mandate command center | `/workbench/{portfolioId}`, `/workbench/{portfolioId}?mode=mandate` | Gateway `/api/v1/dpm/command-center*` | Supported for embedded canonical mandate cockpit, PM-book-backed monitoring action, active exception queue, and governed exception-summary request through Gateway/Manage/lotus-ai. Workbench preserves Manage supportability posture: populated canonical `READY` is demo-ready, `PARTIAL`/`DEGRADED`/`BLOCKED` render as explicit partial states, and `EMPTY` stays an empty state rather than a false ready cockpit. |
| DPM rebalance-wave command center | `/workbench/{portfolioId}?mode=waves` | Gateway `/api/v1/dpm/command-center/waves*` | Implemented for wave queue, preview, create, detail, items, source-check, simulation, approval, staging, handoff, proof posture, supportability, report-input, governed AI PM memo, governed operations-handoff summary, and active Manage-owned campaign-definition list rendering through Gateway only. |
| DPM construction alternatives | `/workbench/{portfolioId}?mode=construction` | Gateway `/api/v1/dpm/command-center/construction/alternative-sets*` | Implemented for generation, comparison, and PM selection through Gateway only. |
| DPM proof-pack evidence | `/workbench/{portfolioId}?mode=proof` | Gateway `/api/v1/dpm/command-center/proof-packs*` | Implemented for generation from Gateway rebalance-run reference, proof-pack identity, sections, hashes, Markdown/report/AI posture, and governed PM memo request posture. |
| DPM portfolio memory | `/workbench/{portfolioId}?mode=memory` | Gateway `/api/v1/dpm/command-center/portfolios/{portfolio_id}/memory` | Implemented for manage-owned timeline event order, event mix, source systems, source refs, artifact refs, reason codes, supportability, and content hash; canonical live proof accepts populated ready, partial, degraded, and blocked source truth while still failing empty or unsupported memory. |
| DPM outcome review | `/workbench/{portfolioId}?mode=reviews` | Gateway `/api/v1/dpm/command-center/outcome-reviews*` | Implemented for review list, dimensions, source lineage, report input, AI evidence, report job, and AI narrative request. |

## DPM Portfolio Memory

The RFC40-WTBD-010 portfolio-memory panel gives portfolio managers, operations, audit, and
sales/pre-sales a single readable event trail for DPM evidence.

Implemented:

1. loads portfolio memory through Gateway only,
2. renders manage-owned supportability, event count, event type counts, source systems, reason
   codes, and content hash,
3. preserves event order, event type, event time, source refs, artifact refs, and reason codes,
4. handles empty, partial, degraded, unsupported, unavailable, and endpoint error states without implying
   local reconstruction,
5. emits bounded observability for `dpm.portfolio-memory.get` without portfolio ids, event ids,
   source refs, content hashes, request bodies, response bodies, or screen content as labels.

Not yet supported:

1. event detail drawers,
2. timeline filtering and search,
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
8. emits bounded Workbench observability labels without portfolio ids, wave ids, campaign ids,
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
