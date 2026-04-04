# RFC-0020: AI Advisor Brief Copilot for Portfolio and Performance

- Status: PROPOSED
- Date: 2026-04-04
- Owners:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-ai maintainers
- Requires Approval From:
  - lotus-workbench maintainers
  - lotus-gateway maintainers
  - lotus-ai maintainers
  - lotus-platform maintainers

## Summary

`Portfolio` and `Performance` are now stable enough to introduce the first `lotus-ai`-backed
front-office workflow in `lotus-workbench`.

This RFC proposes an **Advisor Brief Copilot**: a source-grounded, client-advisor briefing surface
that converts portfolio and performance analytics into an auditable talking track, next-action
checklist, and risk/exception summary.

The feature should not behave like a generic chatbot. It should produce a controlled,
banking-grade brief backed by source metrics from `lotus-gateway`, `lotus-core`,
`lotus-performance`, and `lotus-ai`, with every claim traceable to a cited source metric or
contract field.

## Cross-Repo Reality and Architecture Baseline

This RFC must extend existing Lotus AI and BFF patterns instead of inventing a parallel AI stack.

### Current repo reality this RFC builds on

| Repo | Current reality | Implication for RFC-0020 |
| --- | --- | --- |
| `lotus-workbench` | `Performance` already uses split Gateway contracts: `summary`, `details`, `horizon-comparison`, and `attribution-trend`. | Advisor Brief should be added as another source-backed Workbench mode without coupling the existing Summary/Analysis panels into one mega-fetch. |
| `lotus-gateway` | Gateway is already the Workbench BFF and owns orchestration, partial-failure semantics, and canonical upstream routing. There is no Advisor Brief endpoint yet. | The new Advisor Brief contract belongs in Gateway, not as a direct Workbench→`lotus-ai` browser call. |
| `lotus-ai` | `POST /ai/tasks/execute` is the canonical bounded task API. `explain.v1` returns `EXPLANATION_ONLY`; `generate_structured.v1` returns `DRAFT`. Task requests require `caller`, `context.summary`, `context.payload`, and `context.source_refs`, and responses return `result`, `audit`, and `evidence`. | RFC-0020 should reuse the existing task API and preserve `audit` + `evidence` in Gateway responses. It should not invent a one-off `lotus-ai` advisor endpoint. |
| `lotus-ai` RFC-0024 | The Portfolio Narrative Copilot architecture says narrative assembly stays in the domain app, `lotus-ai` only transforms a bounded fact bundle, and output must be structured, grounded, and refusal-capable. | RFC-0020 should adopt the same boundary: Gateway assembles an advisor fact bundle from Workbench source APIs; `lotus-ai` narrates that bounded bundle only. |
| `lotus-core` / `lotus-performance` | They remain authoritative for holdings, benchmark, return, contribution, attribution, and lineage facts. | AI output is commentary over source-owned facts, not a new source of portfolio truth. |

### Architectural decision pattern

Use a **Workbench UI → Gateway Advisor Brief BFF → lotus-ai Task Adapter** design.

The right implementation pattern is:

1. **Presentation container in Workbench**
   - `Advisor Brief` is a first-class mode with its own view model, state machine, and drill-down actions.
   - Workbench renders source chips and navigation, but does not assemble or narrate portfolio facts.
2. **BFF contract and domain fact-bundle assembler in Gateway**
   - Gateway fetches portfolio/performance facts from existing source APIs,
   - maps those facts into one bounded advisor fact bundle,
   - calls `lotus-ai` through `POST /ai/tasks/execute`,
   - maps the AI response into a Workbench-friendly Advisor Brief contract,
   - preserves supportability, source references, `audit`, and `evidence`.
3. **Bounded task adapter in `lotus-ai`**
   - `lotus-ai` receives only caller-supplied structured context,
   - produces constrained narrative/structured output,
   - refuses unsupported claims instead of inventing missing analytics,
   - returns audit and evidence metadata for operator review.

### Why this is the right architecture

1. **Production trust boundary**
   - Browser clients do not call `lotus-ai` directly.
   - Advisor identity, correlation IDs, tenant markers, and supportability policy stay at the Gateway/API layer.
2. **Domain ownership stays intact**
   - `lotus-performance` and `lotus-core` remain the source of analytics truth.
   - `lotus-ai` explains bounded facts; it does not recompute returns, attribution, or benchmarks.
3. **Micro-frontend behavior is preserved**
   - Summary, Analysis, and Advisor Brief remain independent UI modules.
   - Backend-side request coalescing or caching can still reduce duplicate upstream work without coupling front-end panels.
4. **Reusable contract pattern**
   - The same `fact bundle → task execution → cited response → source-drilldown view model` pattern can be reused later for Portfolio, Suitability, and Reporting AI surfaces.
5. **Testability**
   - Each layer has a strict contract seam:
     - Workbench view-model tests,
     - Gateway contract/integration tests,
     - `lotus-ai` task schema, grounding, and refusal tests.

## Why This RFC Exists

Front-office advisors often need to answer the same questions before client conversations:

1. what changed in the portfolio,
2. what drove recent performance,
3. why active return diverged from benchmark,
4. whether cash flows or concentration require action,
5. what should be discussed with the client next.

`Portfolio` and `Performance` already expose much of the underlying evidence, but advisors still
need to manually synthesize those panels into a clear client-ready narrative.

That creates a high-value first AI use case:

1. reduce manual pre-meeting prep time,
2. improve consistency of advisor explanations,
3. preserve trust by grounding each generated statement in source metrics,
4. make AI useful as a workflow assistant without letting it invent unsupported content.

## Problem Statement

A naive AI integration would add a chat box that produces generic narrative with weak evidence
linkage. That is not acceptable for a private-banking workstation.

The current product gap is more specific:

1. no compact advisor-facing brief exists above the raw analytics,
2. no generated client talking points are tied back to exact source metrics and drill-down panels,
3. no AI workflow currently distinguishes supported, partial, stale, and unavailable evidence,
4. no workbench UI exists yet for reviewing, copying, and drilling from an AI-generated brief back
   into `Portfolio` and `Performance` source panels,
5. no contract yet defines how `lotus-ai` responses are constrained, cited, and rejected when
   source evidence is insufficient.

## Goals

1. Add a first AI feature that creates measurable advisor value rather than decorative AI chrome.
2. Introduce a new `Advisor Brief` workbench surface that summarizes portfolio and performance
   changes in front-office language.
3. Ground every generated statement in explicit source metrics, source entities, and source panel
   references.
4. Support advisor actions such as copying a client brief and jumping to supporting analytics.
5. Keep the first UI slice visual and reviewable before final backend integration is locked.
6. Define a strict `lotus-ai` response contract that is deterministic enough to test and safe
   enough to present in a banking workstation.
7. Preserve graceful handling of loading, empty, partial, unavailable, and stale AI states.
8. Keep the implementation modular and reusable so future AI panels can reuse the same evidence,
   status, citation, and drill-down primitives.

## Non-Goals

1. Adding an unconstrained free-form chat assistant as the first release.
2. Letting `lotus-workbench` invent portfolio, performance, or risk facts locally.
3. Replacing existing source-owned analytics panels with generated text.
4. Introducing a non-auditable AI summary with no evidence trail.
5. Blocking the UI-first prototype slice on full production `lotus-ai` integration.

## Decision

`lotus-workbench` should add a third `Advisor Brief` mode beside `Summary` and `Analysis`.

The new surface should use a **brief-left, evidence-right** layout:

```text
Performance
[Summary] [Analysis] [Advisor Brief]

┌─ Advisor Brief ─────────────────────────────┐  ┌─ Source Metrics ───────────────┐
│ Client Talking Points                       │  │ Portfolio Return      1.25%    │
│ 1. Active return lagged benchmark by 6.68%  │  │ Benchmark Return      7.93%    │
│    due to Equity allocation and FX drag.    │  │ Active Return        -6.68%    │
│                                             │  │ Net Flow            $14,725    │
│ Recommended Actions                         │  │ Top Contributor      AAPL US   │
│ → Review benchmark-relative Equity weight   │  │ Top Detractor        USD Cash  │
│ → Prepare client explanation for YTD lag    │  │ [Open Return Path]             │
│                                             │  │ [Open Contribution]            │
│ Risks / Exceptions                          │  │ [Open Attribution]             │
│ ! Benchmark-relative attribution partial    │  └────────────────────────────────┘
│ ! Large USD cash drag remains visible       │
│
│ [Generate Brief] [Copy Client Note]
└─────────────────────────────────────────────┘
```

The product contract should be:

1. **AI summarizes, source systems remain authoritative**.
2. **Every generated point must carry evidence references**.
3. **Unsupported points must be omitted or flagged as partial**, not guessed.
4. **Workbench remains workflow-first**: every brief section should support a drill-down back to
   the source panel or source metric set.

## Relationship to `lotus-ai` RFC-0024

RFC-0020 should be treated as the **Workbench and Gateway adoption RFC** for the narrative-copilot
direction already defined in `lotus-ai` RFC-0024.

That means:

1. do **not** create a disconnected advisor-chat contract in `lotus-workbench`,
2. reuse RFC-0024’s bounded narrative-fact-bundle model and explanation-only discipline,
3. keep audience modes explicit, but start with one `advisor_brief` audience preset if necessary,
4. let Gateway assemble the bounded fact bundle from source APIs instead of pushing raw analytics
   sprawl into `lotus-ai`,
5. preserve `lotus-ai` runtime `audit` and `evidence` metadata so Workbench can expose supportability
   and operators can debug generation quality.

If `lotus-ai` RFC-0024 evolves the pack schema, RFC-0020 should track that contract instead of
forking a Workbench-only narrative shape.

## UX and Interaction Requirements

### Advisor Brief surface

The `Advisor Brief` mode should include:

1. `Client Talking Points`
   - concise bullet points explaining key portfolio and performance changes,
   - one evidence row per bullet with source chips and linked metrics.
2. `Recommended Actions`
   - short front-office next steps with links to `Portfolio` or `Performance` source views.
3. `Risks / Exceptions`
   - only material issues, partial-data warnings, or unusual drivers.
4. `Source Metrics`
   - a compact metrics column showing the key numbers used by the brief,
   - direct drill-down buttons into Return Path, Contribution, Attribution, Holdings, or
     Transactions.

### Interaction model

1. Default to a **generated brief state** when a source-backed brief is available.
2. Show **Generate Brief** when no brief exists or when inputs changed materially.
3. Show **Refreshing Brief** during generation, without blocking the rest of the page.
4. Show **Partial Evidence** when some source slices are unavailable.
5. Show **Unavailable** when the AI contract fails or source evidence is insufficient.
6. Clicking a source chip or drill-down action should switch to `Portfolio` or `Performance` with
   the relevant segment, period, or panel selected.

### Copy rules

1. Prefer front-office language over technical model language.
2. Keep bullet text short, factual, and metric-backed.
3. Do not show raw prompt text or implementation jargon.
4. Do not claim causal explanations unless backed by contribution, attribution, or holdings data.

## Source Boundaries

### `lotus-workbench`

`lotus-workbench` owns:

1. the `Advisor Brief` UI mode,
2. source chip rendering and drill-down interactions,
3. AI loading, partial, unavailable, and stale-state presentation,
4. client-side orchestration against stable gateway contracts.

`lotus-workbench` must not generate financial narrative itself or infer unsupported metrics.

### `lotus-gateway`

`lotus-gateway` owns:

1. assembling source facts from portfolio and performance APIs,
2. exposing one or more advisor-brief endpoints to `lotus-workbench`,
3. calling `lotus-ai` with a constrained payload and strict schema expectations,
4. returning source-grounded evidence metadata and supportability status.

The gateway should not hide unsupported upstream gaps by fabricating “successful” AI responses.

### `lotus-ai`

`lotus-ai` owns:

1. transforming structured source facts into a constrained `advisor_brief` response,
2. enforcing domain-safe tone, structure, and citation requirements,
3. refusing to generate unsupported statements when evidence is missing,
4. returning machine-testable status and validation metadata.

### Source systems

`lotus-core` and `lotus-performance` remain authoritative for portfolio, benchmark, holdings,
transaction, return, contribution, and attribution facts. `lotus-ai` should only narrate those
facts; it should not replace them.

## Proposed Contract Shape

The Workbench-facing contract should start as a Gateway endpoint, for example:

`GET /api/v1/workbench/{portfolio_id}/advisor-brief?period=YTD&benchmark_code=...`

The response shape should be:

```json
{
  "portfolio_id": "PB_SG_GLOBAL_BAL_001",
  "as_of_date": "2026-04-04",
  "status": "ready",
  "brief": {
    "talking_points": [
      {
        "headline": "Portfolio lagged benchmark over YTD.",
        "detail": "Active return was -6.68%, with Equity allocation and USD cash drag as the main drivers.",
        "severity": "neutral",
        "evidence_refs": [
          {
            "source_surface": "performance.return_path",
            "metric_label": "Active Return",
            "metric_value": "-6.68%",
            "route": "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD"
          }
        ]
      }
    ],
    "recommended_actions": [
      {
        "label": "Review Equity allocation versus benchmark",
        "route": "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&mode=Analysis"
      }
    ],
    "risks_and_exceptions": [
      {
        "headline": "Attribution evidence is partial",
        "detail": "Relative segment context is unavailable for this selection; effect breakdown remains available.",
        "severity": "warning",
        "evidence_refs": []
      }
    ]
  },
  "source_metrics": [
    {
      "label": "Active Return",
      "value": "-6.68%",
      "route": "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD"
    }
  ],
  "supportability": {
    "portfolio_context": "ready",
    "performance_context": "ready",
    "ai_generation": "ready",
    "evidence": "partial"
  },
  "ai_audit": {
    "request_id": "ai-task-request-id",
    "task_id": "explain.v1",
    "output_label": "EXPLANATION_ONLY",
    "prompt_version": "foundation.explain.v1",
    "provider_mode": "stubbed_or_live",
    "generated_at": "2026-04-04T08:00:00Z",
    "stubbed": true
  },
  "ai_evidence": {
    "source_refs": [
      "lotus-performance:calculation:abc123"
    ]
  }
}
```

### Gateway → `lotus-ai` task request contract

Gateway should call the existing bounded task API, not a new custom `lotus-ai` endpoint:

`POST /ai/tasks/execute`

Initial request shape:

```json
{
  "task_id": "explain.v1",
  "input_mode": "STRUCTURED_CONTEXT",
  "caller": {
    "caller_app": "lotus-gateway",
    "correlation_id": "workbench-request-correlation-id",
    "requested_by": "advisor@lotus",
    "tenant_id": "tenant-sg-001"
  },
  "context": {
    "summary": "Generate a source-grounded advisor brief for portfolio YTD performance and key client discussion points.",
    "payload": {
      "audience_mode": "advisor_brief",
      "portfolio_context": {
        "portfolio_id": "PB_SG_GLOBAL_BAL_001",
        "base_currency": "USD"
      },
      "period_window": {
        "period": "YTD",
        "start_date": "2026-01-01",
        "end_date": "2026-04-04"
      },
      "performance_summary": {
        "portfolio_return_pct": 1.25,
        "benchmark_return_pct": 7.93,
        "active_return_pct": -6.68,
        "money_weighted_return_pct": 1.25,
        "net_flow": 14725,
        "ending_market_value": 1087461
      },
      "contribution_highlights": {
        "top_contributors": [],
        "top_detractors": []
      },
      "attribution_highlights": {
        "allocation_effect_pct": null,
        "selection_effect_pct": null,
        "interaction_effect_pct": null,
        "residual_pct": null
      },
      "diagnostic_findings": [],
      "material_findings": []
    },
    "source_refs": [
      "lotus-gateway:workbench:PB_SG_GLOBAL_BAL_001:performance-summary:YTD",
      "lotus-performance:calculation:abc123"
    ]
  },
  "expected_output_label": "EXPLANATION_ONLY"
}
```

### Contract rules

1. Use `explain.v1` + `EXPLANATION_ONLY` for the first implementation slice because that matches
   the current governed `lotus-ai` task contract and first-use-case rollout posture.
2. `generate_structured.v1` can be introduced later only if `lotus-ai` formalizes a stable
   advisor-brief structured-output schema and the output is clearly labeled `DRAFT`.
3. Gateway must map `result.message`, `result.structured_output`, `audit`, and `evidence` into the
   Workbench-facing contract without dropping traceability metadata.
4. If source analytics are partial, stale, or unavailable, Gateway must return a truthful
   `supportability` state and suppress unsupported talking points.
5. The UI slice may use a contract-shaped fixture, but that fixture must mirror the Gateway
   response envelope above, including `supportability`, `ai_audit`, and `ai_evidence`.

## Implementation Slices

### Slice 1: UI-first Advisor Brief prototype in Workbench

Status:

- Implemented on branch `feat/rfc0020-advisor-brief-copilot`.
- Current scope is fixture-backed, contract-shaped UI only. Gateway/`lotus-ai` live wiring remains
  Slice 2-4 work by design.
- Validation currently covers the Advisor Brief view model, Advisor Brief component behavior,
  Performance mode switching, source drill-down intents, and ready/loading/partial/empty states.

Outcome:

1. add `Advisor Brief` as a third mode beside `Summary` and `Analysis`,
2. build the brief layout, source-metrics rail, evidence chips, and drill-down action rows,
3. define the front-end response/view model using a contract-shaped fixture,
4. implement loading, empty, partial, unavailable, and ready states,
5. add meaningful unit and integration tests for panel state handling, evidence chips, and
   navigation intents.

Rules for Slice 1:

1. this slice may use a static contract-shaped fixture or a local mock adapter,
2. it must not hard-code generic AI prose in many places,
3. it must make the UI reviewable enough to validate the screen composition and workflow before
   backend integration,
4. it must keep the implementation modular so the later gateway-backed adapter can replace the
   fixture without rewriting the UI.

### Slice 2: Gateway advisor-brief contract and source-fact assembly

Status:

- Implemented in `lotus-gateway` on branch `feat/rfc0020-advisor-brief-contract`.
- Added the workbench-facing performance advisor-brief route, a dedicated `LotusAiClient`, and a
  modular `AdvisorBriefService` that assembles source facts from the performance workspace
  contract and preserves `ai_audit` / `ai_evidence`.
- Non-live unit, integration, and workflow tests are green. The live platform-capabilities probe is
  still environment-dependent on local upstream health and is not part of the advisor-brief route
  contract.

Outcome:

1. expose a workbench-facing advisor-brief endpoint in `lotus-gateway`,
2. assemble portfolio, performance, benchmark, holdings, contribution, attribution, diagnostics,
   and lineage facts from existing Gateway/source APIs,
3. normalize source facts into a single AI input payload,
4. call `lotus-ai` through `POST /ai/tasks/execute` with `explain.v1`,
5. return a strict response schema with `supportability`, `ai_audit`, and `ai_evidence`,
6. add integration and contract tests proving no unsupported claims are fabricated when source
   slices are partial.

### Slice 3: `lotus-ai` brief generation service

Status:

- Implemented in `lotus-ai` on branch `feat/rfc0020-advisor-brief-task`.
- Added a source-bounded advisor-brief specialization on the existing `explain.v1` stub provider
  path for Gateway fact bundles while preserving the generic `explain.v1` behavior for ordinary
  non-advisor payloads.
- Added a dedicated `lotus-gateway` caller policy in both in-memory and SQL-backed access-control
  stores so the BFF can invoke advisor brief generation without browser-direct AI access.
- Validation covered direct provider-unit tests, caller authorization tests, SQL policy seeding,
  task API contract tests, the full `tests/unit` suite (`827 passed`), and every
  `tests/integration/test_*.py` file individually.

Outcome:

1. first reuse the existing `explain.v1` task path for source-grounded advisor commentary,
2. extend the portfolio narrative pack only if RFC-0024 requires additional audience-mode or
   section-structure fields,
3. accept structured portfolio/performance facts from Gateway without recomputing analytics,
4. enforce schema validation and refusal behavior for unsupported statements,
5. add high-value tests for grounding, refusal, formatting, audit propagation, and partial-data
   behavior.

### Slice 4: Workbench live integration and source-linked navigation

Status:

- Implemented on branch `feat/rfc0020-advisor-brief-copilot`.
- Added the client-side Gateway adapter for
  `/api/v1/workbench/{portfolio_id}/performance/advisor-brief` and mapped that response into the
  existing Advisor Brief view model.
- `Advisor Brief` now fetches the live BFF contract only when the mode is mounted, keeps the
  previous source-derived fallback for loading/unavailable states, and clears stale brief data
  when controls change while details are pending.
- Tests now verify the advisor-brief client route, Gateway-backed brief rendering,
  Summary/Analysis drill-down actions, and the pending-state fetch guard.

Outcome:

1. replace the Slice 1 fixture adapter with the real gateway contract,
2. wire Generate / Refresh / Copy actions to the live service,
3. preserve the UI state model for ready/loading/partial/unavailable,
4. make every evidence chip and source-metric action navigate to the relevant `Portfolio` or
   `Performance` panel with the right route state,
5. add end-to-end tests that verify generated brief content is backed by source metrics and
   drill-down navigation works.

### Slice 5: Production hardening, observability, and operating docs

Outcome:

1. add request latency, failure, and fallback telemetry for advisor brief generation,
2. enforce sensible timeout and retry behavior,
3. document local setup for `lotus-ai`, gateway, and Workbench advisor-brief validation,
4. add supportability copy and operator-facing troubleshooting notes,
5. mark the RFC implemented only after the screen, contracts, tests, and docs are all merged.

## Testing Requirements

### Workbench

1. Unit tests for brief view-model mapping, citation chip rendering, action routing, and state
   transitions.
2. Integration tests for Summary / Analysis / Advisor Brief mode switching and supportability
   rendering.
3. Browser smoke tests for the Advisor Brief screen, drill-down actions, and partial/unavailable
   states.

### Gateway

1. Contract tests for the advisor-brief response schema, including `supportability`, `ai_audit`,
   and `ai_evidence`.
2. Integration tests proving source facts are assembled from real upstream contracts and mapped to
   the `lotus-ai` task request envelope correctly.
3. Negative tests for partial source data, AI refusals, timeout/failure paths, and unsupported
   benchmark/period combinations.
4. Regression tests proving Advisor Brief does not break existing `summary`, `details`,
   `horizon-comparison`, or `attribution-trend` routes.

### `lotus-ai`

1. Schema validation tests for task request/response handling through `POST /ai/tasks/execute`.
2. Grounding tests proving every generated statement stays within caller-supplied facts and source
   references.
3. Refusal tests for insufficient, conflicting, or caveat-heavy source facts.
4. Audit/evidence propagation tests proving downstream apps can inspect how a brief was generated.

## Implementation Traceability and Remaining Gaps

| Requirement | Current evidence | Gap status |
| --- | --- | --- |
| Stable Portfolio / Performance source screens exist in Workbench | `Portfolio` and split `Performance` modes are already live in `lotus-workbench`. | Ready as source drill-down targets. |
| Gateway BFF owns Workbench orchestration | Existing `/api/v1/workbench/{portfolio_id}/performance/*` routes plus the new Advisor Brief route/service in `lotus-gateway`. | Slice 2 Gateway contract is implemented; Slice 4 still needs Workbench live wiring. |
| `lotus-ai` has a bounded task API | `POST /ai/tasks/execute`, `TaskExecutionRequest`, `TaskExecutionResponse`, `audit`, `evidence`, and the Slice 3 advisor fact-bundle specialization over `explain.v1`. | Slice 3 task execution support is implemented; Slice 4 still needs end-to-end Workbench consumption. |
| `lotus-ai` narrative architecture exists | RFC-0024 defines bounded portfolio narrative copilot over source-owned facts. | RFC-0020 must align to RFC-0024 and avoid a parallel chat contract. |
| Source-grounded drill-down UX exists | Workbench can deep-link to Performance and Portfolio route states. | Advisor Brief source-chip and route-intent model still needs implementation. |
| Gold-standard failure semantics | Gateway and Workbench already model partial/unavailable states in Performance. | Need equivalent Advisor Brief supportability states and tests. |

## Acceptance Criteria

1. `Advisor Brief` appears as a first-class Workbench mode with a banking-grade layout and clear
   source drill-downs.
2. Slice 1 UI is reviewable before backend buildout and already uses a contract-shaped front-end
   model.
3. Live integration uses `lotus-gateway` and `lotus-ai`; the UI does not rely on hard-coded prose
   after Slice 4.
4. Every generated bullet either carries source evidence or is omitted/flagged as unsupported.
5. Brief generation failures do not break `Portfolio` or `Performance` browsing.
6. Tests cover ready, loading, empty, partial, and unavailable states.
7. Docs and the RFC index are updated, and the RFC is marked `IMPLEMENTED` only after all slices
   are merged.

## Open Questions

1. Should Slice 1 ship the visible `Advisor Brief` mode under `Performance` only, then reuse the
   same brief component under `Portfolio` once the Gateway portfolio fact bundle is available?
2. Should generated briefs be recomputed on demand for every request, or should Gateway persist a
   short-lived brief cache keyed by portfolio, period, benchmark, and source-fact hash?
3. Should the first version show explicit “internal use only” and “AI-generated draft” labeling in
   the brief toolbar and copied note output?
4. What minimum evidence policy should Gateway enforce before a talking point is eligible for
   display: at least one metric source ref, one drill-down route, and one source-system provenance
   ref?
5. Should `advisor_brief` start on `explain.v1` only, or should RFC-0024 first introduce a
   dedicated portfolio-narrative pack so Workbench can consume a richer structured response with
   stable section IDs?
