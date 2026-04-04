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

The first workbench-facing contract can start as a gateway endpoint shaped like:

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
  }
}
```

The exact backend field names can still be refined in the gateway and `lotus-ai` RFCs, but the UI
slice should use a contract-shaped fixture that mirrors this structure so the screen can be
reviewed early without painting itself into a fake-data corner.

## Implementation Slices

### Slice 1: UI-first Advisor Brief prototype in Workbench

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

Outcome:

1. expose a workbench-facing advisor-brief endpoint in `lotus-gateway`,
2. assemble portfolio, performance, benchmark, holdings, contribution, and attribution facts from
   existing gateway/source APIs,
3. normalize source facts into a single AI input payload,
4. return a strict response schema with supportability and evidence references,
5. add integration and contract tests proving no unsupported claims are fabricated when source
   slices are partial.

### Slice 3: `lotus-ai` brief generation service

Outcome:

1. implement a constrained `lotus-ai` capability for advisor brief generation,
2. accept structured portfolio/performance facts from gateway,
3. return a deterministic JSON response with talking points, actions, risks, citations, and status,
4. enforce schema validation and refusal behavior for unsupported statements,
5. add high-value tests for grounding, refusal, formatting, and partial-data behavior.

### Slice 4: Workbench live integration and source-linked navigation

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

1. Contract tests for the advisor-brief response schema.
2. Integration tests proving source facts are assembled from real upstream contracts.
3. Negative tests for partial source data and AI service failures.

### `lotus-ai`

1. Schema validation tests for generated responses.
2. Grounding tests proving every generated statement references allowed evidence.
3. Refusal tests for insufficient or conflicting source facts.

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

1. Should `Advisor Brief` live only under `Performance` initially, or also under `Portfolio` in
   the first release?
2. Should generated briefs be persisted per portfolio and period, or generated on demand only?
3. Should the first version include a compliance disclaimer and explicit “internal use only”
   labeling?
4. What is the minimum accepted evidence policy for a generated talking point when one of the
   source slices is partial?
