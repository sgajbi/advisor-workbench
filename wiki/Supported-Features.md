# Supported Features

This page separates implementation-backed Workbench capability from target-state roadmap language.
It is intended for developers, business users, operations, sales/pre-sales, and demo preparation.

## Current Implementation-Backed Surfaces

| Surface | Route | Backing contract | Current support |
| --- | --- | --- | --- |
| Portfolio summary and detail | `/portfolio`, `/portfolio?tab=detailed` | Gateway Workbench portfolio APIs | Supported with canonical live proof. |
| Performance and risk review | `/performance` route modes | Gateway performance/risk APIs | Supported with bounded observability and canonical proof. |
| Data-product discovery | `/data-products` | Gateway domain-product APIs | Supported for catalog, dependencies, and live trust posture. |
| DPM mandate command center | `/workbench/{portfolioId}` | Gateway `/api/v1/dpm/command-center*` | Supported for embedded canonical mandate cockpit and monitoring action. |
| DPM rebalance-wave command center | `/workbench/{portfolioId}` | Gateway `/api/v1/dpm/command-center/waves*` | Implemented for wave queue, preview, create, detail, items, source-check, simulation, approval, staging, handoff, proof posture, and supportability through Gateway only; canonical live wave proof pending. |
| DPM construction alternatives | `/workbench/{portfolioId}` | Gateway `/api/v1/dpm/command-center/construction/alternative-sets*` | Implemented for generation, comparison, and PM selection through Gateway only. |
| DPM proof-pack evidence | `/workbench/{portfolioId}` | Gateway `/api/v1/dpm/command-center/proof-packs*` | Implemented for generation from Gateway rebalance-run reference, proof-pack identity, sections, hashes, Markdown/report/AI posture, and governed PM memo request posture. |
| DPM outcome review | `/workbench/{portfolioId}` | Gateway `/api/v1/dpm/command-center/outcome-reviews*` | Implemented for review list, dimensions, source lineage, report input, AI evidence, report job, and AI narrative request. |

## DPM Wave Command Center

The first RFC-0041 Workbench wave panel is intentionally bounded.

Implemented:

1. lists explicit portfolio-list waves through Gateway,
2. previews and creates a canonical portfolio wave through the Workbench BFF/Gateway boundary,
3. opens wave detail and item posture,
4. source-checks, simulates, approves, stages, and hands off selected waves through Gateway,
5. renders manage-owned lifecycle state, item state, source-readiness state, supportability,
   aggregate metrics, proof-pack refs, handoff refs, reason codes, blocked actions, remediation
   owner, and `external_execution_claimed` posture,
6. emits bounded Workbench observability labels without portfolio ids, wave ids, request bodies, or
   response bodies as metric labels.

Not yet supported:

1. dedicated `/dpm/waves` route,
2. PM-book discovery or automatic affected-portfolio discovery,
3. item selection drawer,
4. richer workflow drawers and eligibility explanations beyond manage reason-code rendering,
5. CIO approval workflow,
6. external OMS/execution integration,
7. client-side source-readiness, proof-pack, or handoff calculation.

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
  Manage --> Outcomes[RFC-0042 outcomes]
  GW --> Report[lotus-report via Gateway]
  GW --> AI[lotus-ai via Gateway]
```

## Demo Guidance

Use `PB_SG_GLOBAL_BAL_001` and the canonical local runtime. Demo claims should say that Workbench
is Gateway-backed and manage-owned for DPM operating truth. Do not claim external execution,
automatic PM-book discovery, or autonomous CIO approval until those owning services and Workbench
proof promote them.
