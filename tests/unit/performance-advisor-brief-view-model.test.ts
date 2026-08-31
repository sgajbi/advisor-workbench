import { describe, expect, it } from "vitest";

import { buildPerformanceAdvisorBriefViewModel } from "../../src/apps/performance/advisor-brief-view-model";
import { canCopyAdvisorBrief } from "../../src/apps/performance/components/advisor-brief/performance-advisor-brief-helpers";
import type {
  WorkbenchPerformanceAdvisorBrief,
  WorkbenchPerformanceWorkspace,
} from "../../src/features/workbench/types";
import {
  buildPerformanceCapabilities,
  buildCombinedPartialPerformanceScenario,
  buildSupportedPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

const REVIEW_CONTEXT_EVIDENCE = {
  requested_as_of_date: null,
  effective_as_of_date: "2026-02-24",
  requested_reporting_currency: null,
  effective_reporting_currency: "USD",
  reporting_currency_state: "accepted_unverified" as const,
};

function buildGatewayAdvisorBriefFixture(
  workspace: WorkbenchPerformanceWorkspace,
  overrides: Partial<WorkbenchPerformanceAdvisorBrief> = {},
): WorkbenchPerformanceAdvisorBrief {
  const base: WorkbenchPerformanceAdvisorBrief = {
    correlation_id: "corr-advisor-brief-fixture",
    contract_version: "v1",
    portfolio_id: workspace.portfolio.portfolio_id,
    portfolio: workspace.portfolio,
    as_of_date: workspace.as_of_date,
    requested_as_of_date: workspace.requested_as_of_date,
    effective_as_of_date: workspace.effective_as_of_date,
    requested_reporting_currency: workspace.requested_reporting_currency,
    effective_reporting_currency: workspace.effective_reporting_currency,
    reporting_currency_state: workspace.reporting_currency_state,
    period: workspace.period,
    report_start_date: workspace.report_start_date,
    report_end_date: workspace.report_end_date,
    detail_basis: "NET",
    chart_frequency: "monthly",
    contribution_dimension: "asset_class",
    attribution_dimension: "asset_class",
    benchmark_code: workspace.benchmark_code,
    status: "ready",
    summary: "Source-backed advisor brief.",
    talking_points: [],
    recommended_actions: [],
    risks_and_exceptions: [],
    source_metrics: [],
    supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
    ai_audit: {
      task_id: "advisor-brief-task-1",
      provider_mode: "local_openai_compatible",
      provider_id: "governed-provider",
      model_id: "governed-model",
      stubbed: false,
      source_refs: [],
    },
    ai_evidence: { source_refs: [] },
    warnings: [],
    partial_failures: [],
  };

  return {
    ...base,
    ...overrides,
    ai_audit: { ...base.ai_audit, ...overrides.ai_audit },
    ai_evidence: { ...base.ai_evidence, ...overrides.ai_evidence },
  };
}

describe("buildPerformanceAdvisorBriefViewModel", () => {
  it("builds a ready deterministic brief with source metrics and drilldown evidence", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("ready");
    expect(brief.title).toBe("Adviser brief • PF_1001");
    expect(brief.summary).toContain("YTD active return is 0.52%");
    expect(brief.summary).not.toContain("main drag came from AAPL");
    expect(brief.talkingPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Portfolio delivered 5.42% versus benchmark 4.91%.",
          evidenceRefs: expect.arrayContaining([
            expect.objectContaining({
              metricLabel: "Active return",
              sourceSurface: "performance.return_path",
              targetMode: "summary",
              route: expect.stringContaining("/performance?portfolioId=PF_1001"),
            }),
          ]),
        }),
      ])
    );
    expect(brief.sourceMetrics.map((metric) => metric.label)).toEqual([
      "Portfolio TWR",
      "Benchmark TWR",
      "Active return",
      "Net cash flow",
      "Ending market value",
    ]);
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Portfolio", value: "Ready", tone: "success" },
        { label: "Adviser brief", value: "Preview ready", tone: "success" },
      ])
    );
    expect(brief.reviewNotes).toEqual([]);
    expect(brief.aiDisclosure).toEqual(
      expect.objectContaining({
        preparation: "deterministic",
        availability: "live",
        evidence: { state: "supported", sourceCount: 5 },
        humanReview: { state: "review-required", sourceRecorded: false },
        clientUse: "internal-only",
      })
    );
  });

  it("renders a bounded permission-blocked advisor brief without raw entitlement details", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      advisorBriefPermissionBlocked: true,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    const renderedText = JSON.stringify(brief);
    expect(brief.status).toBe("permission_blocked");
    expect(brief.summary).toContain("access is restricted");
    expect(brief.talkingPoints).toEqual([]);
    expect(brief.risksAndExceptions).toEqual([
      expect.objectContaining({
        headline: "Adviser brief access is restricted.",
        detail: expect.stringContaining("permission block"),
      }),
    ]);
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Adviser brief",
          value: "Access restricted",
          tone: "danger",
        }),
      ])
    );
    expect(renderedText).not.toContain("raw_entitlement_denied");
    expect(renderedText).not.toContain("response body");
  });

  it("marks the brief partial and surfaces source capability risks when analytics slices are incomplete", () => {
    const scenario = buildCombinedPartialPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("partial");
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Contribution", value: "Partial", tone: "warn" },
        { label: "Attribution", value: "Unavailable", tone: "danger" },
        { label: "Adviser brief", value: "Preview partial", tone: "warn" },
      ])
    );
    expect(brief.risksAndExceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Benchmark comparison is incomplete.",
          detail: "A benchmark is assigned, but benchmark-relative returns are incomplete.",
        }),
        expect.objectContaining({
          headline: "Contribution detail is partial.",
          detail: "Contribution exists, but only aggregate rows are available.",
        }),
        expect.objectContaining({
          headline: "Attribution detail is unavailable.",
          detail: "Attribution detail is not available for the current selection.",
        }),
      ])
    );
    expect(
      brief.risksAndExceptions.some(
        (risk) => risk.headline === "Analysis details are still loading."
      )
    ).toBe(false);
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "A benchmark is assigned, but benchmark-relative returns are incomplete.",
        "Contribution exists, but only aggregate rows are available.",
        "Attribution detail is not available for the current selection.",
      ])
    );
  });

  it("falls back to a portfolio-only brief when contribution detail is unavailable", () => {
    const scenario = buildUnavailableContributionPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("partial");
    expect(brief.summary).toContain("Contribution detail is still partial for this portfolio.");
    expect(brief.talkingPoints[0]?.headline).toBe(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(
      brief.talkingPoints.some((point) => point.headline.includes("Top contributor"))
    ).toBe(false);
    expect(brief.risksAndExceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Contribution detail is unavailable.",
          evidenceRefs: expect.arrayContaining([
            expect.objectContaining({
              metricLabel: "Contribution",
              metricValue: "Unavailable",
              targetMode: "analysis",
            }),
          ]),
        }),
      ])
    );
  });

  it("marks the brief as loading while deferred details are still pending", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: true,
    });

    expect(brief.status).toBe("loading");
    expect(brief.summary).toContain("the detailed advisor narrative is being prepared");
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Adviser brief", value: "Generating", tone: "warn" },
      ])
    );
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "Deferred analytics are still loading; contribution and attribution evidence may update.",
      ])
    );
    expect(brief.aiDisclosure).toMatchObject({
      preparation: "deterministic",
      availability: "partial",
      evidence: { state: "supported", sourceCount: 5 },
      humanReview: { state: "review-required", sourceRecorded: false },
      clientUse: "internal-only",
    });
    expect(brief.aiDisclosure.limitations).not.toContain(
      "No usable generated output is available for review or client use."
    );
  });

  it("marks the brief as empty when no source facts support a talking point", () => {
    const scenario = buildSupportedPerformanceScenario();
    const workspace = {
      ...scenario.workspace,
      benchmark_code: null,
      contribution: null,
      attribution: null,
      net_performance: {
        ...scenario.workspace.net_performance,
        portfolio_return_pct: null,
        benchmark_return_pct: null,
        active_return_pct: null,
      },
      gross_performance: {
        ...scenario.workspace.gross_performance,
        portfolio_return_pct: null,
        benchmark_return_pct: null,
        active_return_pct: null,
      },
    };

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace,
      capabilities: buildPerformanceCapabilities({
        benchmarkComparison: {
          state: "unavailable",
          reason: "No benchmark is assigned to this mandate.",
        },
        contributionDetail: {
          state: "unavailable",
          reason: "Contribution detail is not available for the current selection.",
        },
        attributionDetail: {
          state: "unavailable",
          reason: "Attribution detail is not available for the current selection.",
        },
      }),
      period: workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("empty");
    expect(brief.talkingPoints).toEqual([]);
    expect(brief.summary).toContain("No material talking points are available");
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Adviser brief", value: "No material brief", tone: "danger" },
      ])
    );
    expect(brief.aiDisclosure.evidence).toEqual({ state: "missing", sourceCount: 0 });
  });

  it("reports limited fallback evidence when only some displayed source metrics are usable", () => {
    const scenario = buildSupportedPerformanceScenario();
    const workspace = {
      ...scenario.workspace,
      net_performance: {
        ...scenario.workspace.net_performance,
        active_return_pct: null,
      },
    };

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure.evidence).toEqual({ state: "limited", sourceCount: 4 });
  });

  it.each([
    {
      name: "trims and de-duplicates evidence references",
      evidenceRefs: [" source:performance ", "source:performance", "source:benchmark"],
      auditRefs: ["source:audit"],
      expectedCount: 2,
    },
    {
      name: "falls back to audit references when evidence references are blank",
      evidenceRefs: [" ", "\t"],
      auditRefs: [" source:audit ", "source:audit"],
      expectedCount: 1,
    },
    {
      name: "rejects whitespace-only references",
      evidenceRefs: [" ", "\t"],
      auditRefs: ["  "],
      expectedCount: 0,
    },
  ])("$name", ({ evidenceRefs, auditRefs, expectedCount }) => {
    const scenario = buildSupportedPerformanceScenario();
    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
        ai_evidence: { source_refs: evidenceRefs },
        ai_audit: { source_refs: auditRefs },
      }),
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure.evidence.sourceCount).toBe(expectedCount);
    expect(brief.aiDisclosure.evidence.state).toBe(expectedCount > 0 ? "supported" : "missing");
  });

  it("projects known Gateway metric aliases into canonical business labels", () => {
    const scenario = buildSupportedPerformanceScenario();
    const route = "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET";
    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
        talking_points: [
          {
            headline: "Portfolio remains ahead of benchmark.",
            detail: "Review the benchmark-relative result.",
            tone: "positive",
            evidence_refs: [
              {
                metric_label: "Active Return",
                metric_value: "0.52%",
                source_surface: "performance.return_path",
                target_mode: "summary",
                route,
              },
            ],
          },
        ],
        source_metrics: [
          {
            label: "Benchmark Return",
            value: "4.91%",
            support_label: "BMK_GLOBAL_BALANCED_60_40",
            target_mode: "summary",
            route,
          },
          {
            label: "Ending MV",
            value: "$1,250,000",
            support_label: "24 Feb 2026",
            target_mode: "summary",
            route,
          },
          {
            label: "HHI Current",
            value: "1260",
            support_label: "Source-authored risk evidence",
            target_mode: "summary",
            route,
          },
        ],
      }),
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.sourceMetrics.map((metric) => metric.label)).toEqual([
      "Benchmark TWR",
      "Ending market value",
      "HHI Current",
    ]);
    expect(brief.sourceMetrics[0]?.supportingText).toBe("Global Balanced 60/40");
    expect(brief.talkingPoints[0]?.evidenceRefs[0]?.metricLabel).toBe("Active return");
  });

  it.each([
    {
      name: "disabled deterministic provider",
      providerMode: "disabled",
      stubbed: true,
      preparation: "deterministic",
      availability: "simulation",
    },
    {
      name: "explicit stub provider",
      providerMode: "stub",
      stubbed: true,
      preparation: "deterministic",
      availability: "simulation",
    },
    {
      name: "managed OpenAI provider",
      providerMode: "openai",
      stubbed: false,
      preparation: "ai-assisted",
      availability: "live",
    },
    {
      name: "local OpenAI-compatible provider",
      providerMode: "local_openai_compatible",
      stubbed: false,
      preparation: "ai-assisted",
      availability: "live",
    },
    {
      name: "disabled provider presented as live",
      providerMode: "disabled",
      stubbed: false,
      preparation: "unavailable",
      availability: "partial",
    },
    {
      name: "stub provider presented as live",
      providerMode: "stub",
      stubbed: false,
      preparation: "unavailable",
      availability: "partial",
    },
    {
      name: "managed OpenAI provider presented as deterministic",
      providerMode: "openai",
      stubbed: true,
      preparation: "unavailable",
      availability: "partial",
    },
    {
      name: "local OpenAI-compatible provider presented as deterministic",
      providerMode: "local_openai_compatible",
      stubbed: true,
      preparation: "unavailable",
      availability: "partial",
    },
    {
      name: "missing provider mode",
      providerMode: undefined,
      stubbed: false,
      preparation: "unavailable",
      availability: "partial",
    },
    {
      name: "unknown provider mode",
      providerMode: "future_provider",
      stubbed: false,
      preparation: "unavailable",
      availability: "partial",
    },
  ] as const)(
    "classifies $name through the shared provider contract",
    ({ providerMode, stubbed, preparation, availability }) => {
      const scenario = buildSupportedPerformanceScenario();
      const brief = buildPerformanceAdvisorBriefViewModel({
        workspace: scenario.workspace,
        advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
          ai_audit: {
            provider_mode: providerMode,
            stubbed,
          },
        }),
        capabilities: scenario.capabilities,
        period: scenario.workspace.period,
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: scenario.workspace.benchmark_code ?? undefined,
        isDetailsPending: false,
      });

      expect(brief.aiDisclosure).toMatchObject({
        preparation,
        availability,
        clientUse: "blocked",
      });
      if (preparation === "unavailable") {
        expect(brief.aiDisclosure.limitations).toContain(
          "Generation provenance is missing, unsupported, or contradictory, so this output cannot be classified as live AI assistance.",
        );
      }
    },
  );

  it("recognizes human review only from a complete source audit record", () => {
    const scenario = buildSupportedPerformanceScenario();
    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
        workflow_pack_run: {
          run_id: "packrun_advisor_brief_req-1",
          runtime_state: "COMPLETED",
          review_state: "ACCEPTED",
          latest_review_event_at: "2026-04-21T03:22:00Z",
          latest_review_actor: "advisor_1",
          review_transition_count: 1,
          has_review_history: true,
          allowed_review_actions: [],
          supportability_status: "READY",
          review_pending: false,
          superseded: false,
          workflow_authority_owner: "lotus-gateway",
          current_summary_note: "Review decision recorded.",
          findings: [],
        },
      }),
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure.humanReview).toEqual({
      state: "reviewed",
      sourceRecorded: true,
      actor: "advisor_1",
      occurredAt: "2026-04-21T03:22:00Z",
    });
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Human review",
          value: "Accepted for internal use",
          tone: "success",
          detail:
            "Supportability READY • Recorded by advisor_1 • Recorded 21 Apr 2026, 03:22 UTC",
          reviewEvidence: {
            reviewState: "ACCEPTED",
            supportability: "READY",
            reviewer: "advisor_1",
            recordedAt: "2026-04-21T03:22:00Z",
          },
        }),
      ])
    );
    expect(brief.aiDisclosure.diagnostics).toEqual(
      expect.arrayContaining([
        { label: "Review recorded", value: "21 Apr 2026, 03:22 UTC" },
      ]),
    );
  });

  it("fails human review closed when the source audit timestamp is malformed", () => {
    const scenario = buildSupportedPerformanceScenario();
    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
        workflow_pack_run: {
          run_id: "packrun_advisor_brief_req-1",
          runtime_state: "COMPLETED",
          review_state: "ACCEPTED",
          latest_review_event_at: "not-a-date",
          latest_review_actor: "advisor_1",
          review_transition_count: 1,
          has_review_history: true,
          allowed_review_actions: [],
          supportability_status: "READY",
          review_pending: false,
          superseded: false,
          workflow_authority_owner: "lotus-gateway",
          current_summary_note: "Review decision recorded.",
          findings: [],
        },
      }),
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure.humanReview).toEqual({
      state: "unavailable",
      sourceRecorded: false,
    });
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Human review",
          value: "Accepted for internal use",
          tone: "warn",
          detail: "Supportability READY • Review audit details not published",
          reviewEvidence: {
            reviewState: "ACCEPTED",
            supportability: "READY",
            reviewer: null,
            recordedAt: null,
          },
        }),
      ])
    );
    expect(canCopyAdvisorBrief(brief)).toBe(false);
  });

  it("fails human review and copy closed for a namespace-only source actor", () => {
    const scenario = buildSupportedPerformanceScenario();
    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
        workflow_pack_run: {
          run_id: "packrun_advisor_brief_req-1",
          runtime_state: "COMPLETED",
          review_state: "ACCEPTED",
          latest_review_event_at: "2026-04-21T03:22:00Z",
          latest_review_actor: "review:",
          review_transition_count: 1,
          has_review_history: true,
          allowed_review_actions: [],
          supportability_status: "READY",
          review_pending: false,
          superseded: false,
          workflow_authority_owner: "lotus-gateway",
          current_summary_note: "Review decision recorded.",
          findings: [],
        },
      }),
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure.humanReview).toEqual({
      state: "unavailable",
      sourceRecorded: false,
    });
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Human review",
          value: "Accepted for internal use",
          tone: "warn",
          detail: "Supportability READY • Review audit details not published",
          reviewEvidence: {
            reviewState: "ACCEPTED",
            supportability: "READY",
            reviewer: null,
            recordedAt: null,
          },
        }),
      ]),
    );
    expect(canCopyAdvisorBrief(brief)).toBe(false);
  });

  it.each([
    ["ACCEPTED", true],
    ["REJECTED", true],
    ["REVISED", true],
    ["SUPERSEDED", true],
    ["ABANDONED", true],
    ["NOT_REVIEW_REQUIRED", true],
    ["REVIEW_REQUIRED", false],
    ["PENDING", false],
  ] as const)(
    "blocks copy when source review state %s has pending=%s without coherent governed posture",
    (reviewState, reviewPending) => {
      const scenario = buildSupportedPerformanceScenario();
      const brief = buildPerformanceAdvisorBriefViewModel({
        workspace: scenario.workspace,
        advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
          workflow_pack_run: {
            run_id: "packrun_advisor_brief_req-1",
            runtime_state: "COMPLETED",
            review_state: reviewState,
            latest_review_event_at: "2026-04-21T03:22:00Z",
            latest_review_actor: "advisor_1",
            review_transition_count: 1,
            has_review_history: true,
            allowed_review_actions: [],
            supportability_status: "ACTION_REQUIRED",
            review_pending: reviewPending,
            superseded: false,
            workflow_authority_owner: "lotus-gateway",
            current_summary_note: "Contradictory review posture.",
            findings: [],
          },
        }),
        capabilities: scenario.capabilities,
        period: scenario.workspace.period,
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: scenario.workspace.benchmark_code ?? undefined,
        isDetailsPending: false,
      });

      expect(brief.aiDisclosure.humanReview).toEqual({
        state: "unavailable",
        sourceRecorded: false,
      });
      expect(canCopyAdvisorBrief(brief)).toBe(false);
      expect(brief.supportability).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Brief preparation",
            detail:
              "Preparation record is not usable because source review posture is incomplete or contradictory",
          }),
        ]),
      );
    },
  );

  it.each([
    ["REVISED", true, "reviewed", true, "Revision requested", "stale"],
    ["SUPERSEDED", true, "reviewed", true, "Superseded", "stale"],
    ["NOT_REVIEW_REQUIRED", false, "not-required", false, "No review required", "live"],
    ["UNRECOGNIZED", false, "unavailable", false, "Not reported", "live"],
  ] as const)(
    "maps %s to a coherent source review posture",
    (
      reviewState,
      superseded,
      expectedHumanReview,
      expectedSourceRecorded,
      expectedLabel,
      expectedAvailability
    ) => {
      const scenario = buildSupportedPerformanceScenario();
      const brief = buildPerformanceAdvisorBriefViewModel({
        workspace: scenario.workspace,
        advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
          ai_evidence: { source_refs: ["lotus-performance:advisor-brief"] },
          workflow_pack_run: {
            run_id: "packrun_advisor_brief_req-1",
            runtime_state: "COMPLETED",
            review_state: reviewState,
            latest_review_event_at: "2026-04-21T03:22:00Z",
            latest_review_actor: "advisor_1",
            review_transition_count: 1,
            has_review_history: true,
            allowed_review_actions: [],
            supportability_status: superseded ? "HISTORICAL" : "READY",
            review_pending: false,
            superseded,
            workflow_authority_owner: "lotus-gateway",
            current_summary_note: "Review decision recorded.",
            replacement_run_id: superseded ? "packrun_advisor_brief_req-2" : null,
            findings: [],
          },
        }),
        capabilities: scenario.capabilities,
        period: scenario.workspace.period,
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: scenario.workspace.benchmark_code ?? undefined,
        isDetailsPending: false,
      });

      expect(brief.aiDisclosure.humanReview).toMatchObject({
        state: expectedHumanReview,
        sourceRecorded: expectedSourceRecorded,
      });
      expect(brief.aiDisclosure.availability).toBe(expectedAvailability);
      expect(brief.supportability).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            label: "Human review",
            value: expectedLabel,
          }),
        ])
      );
    }
  );

  it.each([
    [
      "packrun_advisor_brief_req-2",
      "This output is historical. Review replacement run packrun_advisor_brief_req-2 before use.",
    ],
    [null, "This output is historical. The source did not publish a replacement run."],
  ] as const)(
    "maps a superseded source run to stale output with replacement %s",
    (replacementRunId, expectedLimitation) => {
      const scenario = buildSupportedPerformanceScenario();
      const brief = buildPerformanceAdvisorBriefViewModel({
        workspace: scenario.workspace,
        advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
          workflow_pack_run: {
            run_id: "packrun_advisor_brief_req-1",
            runtime_state: "COMPLETED",
            review_state: "ACCEPTED",
            allowed_review_actions: [],
            supportability_status: "HISTORICAL",
            review_pending: false,
            superseded: true,
            workflow_authority_owner: "lotus-gateway",
            current_summary_note: "A newer advisor brief replaced this run.",
            replacement_run_id: replacementRunId,
            findings: [],
          },
        }),
        capabilities: scenario.capabilities,
        period: scenario.workspace.period,
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "asset_class",
        chartFrequency: "monthly",
        benchmark: scenario.workspace.benchmark_code ?? undefined,
        isDetailsPending: false,
      });

      expect(brief.aiDisclosure).toMatchObject({
        availability: "stale",
        clientUse: "blocked",
      });
      expect(brief.aiDisclosure.limitations).toContain(expectedLimitation);
      expect(brief.aiDisclosure.diagnostics).toEqual(
        replacementRunId
          ? expect.arrayContaining([
              { label: "Replacement run", value: replacementRunId },
            ])
          : expect.not.arrayContaining([expect.objectContaining({ label: "Replacement run" })]),
      );
    },
  );

  it("keeps a superseded simulation historical instead of presenting it as current simulation output", () => {
    const scenario = buildSupportedPerformanceScenario();
    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: buildGatewayAdvisorBriefFixture(scenario.workspace, {
        ai_audit: { provider_mode: "stub", stubbed: true },
        workflow_pack_run: {
          run_id: "packrun-advisor-brief-simulation-1",
          runtime_state: "COMPLETED",
          review_state: "ACCEPTED",
          allowed_review_actions: [],
          supportability_status: "HISTORICAL",
          review_pending: false,
          superseded: true,
          workflow_authority_owner: "lotus-gateway",
          current_summary_note: "A live advisor brief replaced this simulation.",
          replacement_run_id: "packrun-advisor-brief-live-2",
          findings: [],
        },
      }),
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure).toMatchObject({
      preparation: "deterministic",
      availability: "stale",
      clientUse: "blocked",
    });
    expect(brief.aiDisclosure.limitations).toContain(
      "This output is historical. Review replacement run packrun-advisor-brief-live-2 before use.",
    );
  });

  it("drops risk source facts and risk drilldowns when gateway evidence is not ready", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-risk-brief",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "ready",
        summary: "Risk-linked advisor brief.",
        talking_points: [
          {
            headline: "Portfolio concentration warrants review.",
            detail: "Open Risk to inspect HHI and top-position concentration.",
            tone: "warning",
            evidence_refs: [
              {
                metric_label: "HHI Current",
                metric_value: "1260",
                source_surface: "risk.concentration",
                target_mode: "risk",
                route: "/performance?portfolioId=PF_1001&mode=risk",
              },
            ],
          },
        ],
        recommended_actions: [
          {
            label: "Open Risk",
            target_mode: "risk",
            route: "/performance?portfolioId=PF_1001&mode=risk",
          },
        ],
        risks_and_exceptions: [],
        source_metrics: [
          {
            label: "HHI Current",
            value: "1260",
            support_label: "Stateful concentration",
            target_mode: "risk",
            route: "/performance?portfolioId=PF_1001&mode=risk",
            state: "partial",
          },
        ],
        supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
        ai_audit: { stubbed: false },
        ai_evidence: { source_refs: ["lotus-gateway:risk:summary"] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.talkingPoints).toEqual([]);
    expect(brief.recommendedActions.some((action) => action.targetMode === "risk")).toBe(false);
    expect(brief.sourceMetrics.some((metric) => metric.targetMode === "risk")).toBe(false);
  });

  it("keeps risk source facts when gateway evidence is ready", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-risk-ready",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "ready",
        summary: "Risk-linked advisor brief.",
        talking_points: [
          {
            headline: "Portfolio concentration warrants review.",
            detail: "Open Risk to inspect HHI and top-position concentration.",
            tone: "warning",
            evidence_refs: [
              {
                metric_label: "HHI Current",
                metric_value: "1260",
                source_surface: "risk.concentration",
                target_mode: "risk",
                route: "/performance?portfolioId=PF_1001&mode=risk",
              },
            ],
          },
        ],
        recommended_actions: [
          {
            label: "Open Risk",
            target_mode: "risk",
            route: "/performance?portfolioId=PF_1001&mode=risk",
          },
        ],
        risks_and_exceptions: [],
        source_metrics: [
          {
            label: "HHI Current",
            value: "1260",
            support_label: "Stateful concentration",
            target_mode: "risk",
            route: "/performance?portfolioId=PF_1001&mode=risk",
            state: "ready",
          },
        ],
        supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
        ai_audit: { stubbed: false },
        ai_evidence: { source_refs: ["lotus-gateway:risk:concentration"] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.talkingPoints[0]?.evidenceRefs[0]?.targetMode).toBe("risk");
    expect(brief.recommendedActions.some((action) => action.targetMode === "risk")).toBe(true);
    expect(brief.sourceMetrics.some((metric) => metric.targetMode === "risk")).toBe(true);
  });

  it("normalizes gateway advisor-brief supportability to partial when the backend status is partial", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-partial-brief",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "partial",
        summary: "Partial advisor brief.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Generating", tone: "warn" }],
        ai_audit: { stubbed: true },
        ai_evidence: { source_refs: [] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("partial");
    expect(brief.supportability).toContainEqual({
      label: "Adviser brief",
      value: "Partial",
      tone: "warn",
    });
  });

  it("normalizes gateway advisor-brief supportability to partial when content is present but the backend status is partial", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-partial-brief",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "partial",
        summary: "Partial advisor brief.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Generating", tone: "warn" }],
        ai_audit: { stubbed: true },
        ai_evidence: { source_refs: [] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("partial");
    expect(brief.supportability).toContainEqual({
      label: "Adviser brief",
      value: "Partial",
      tone: "warn",
    });
    expect(brief.reviewNotes).toEqual([]);
  });

  it("does not fabricate provenance when advisor brief source refs are empty", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-empty-source-refs",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "partial",
        summary: "Partial advisor brief.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Generating", tone: "warn" }],
        ai_audit: { stubbed: true, source_refs: [] },
        ai_evidence: { source_refs: [] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure.evidence).toEqual({ state: "missing", sourceCount: 0 });
    expect(brief.aiDisclosure.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "Source references" })]),
    );
  });

  it("does not classify an audit timestamp alone as live AI provenance", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-timestamp-only-ai-audit",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "ready",
        summary: "Advisor brief with incomplete preparation provenance.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
        ai_audit: {
          provider_mode: "local_openai_compatible",
          stubbed: false,
          generated_at: "2026-08-04T08:00:00Z",
        },
        ai_evidence: { source_refs: ["lotus-gateway:performance-summary"] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.aiDisclosure).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      evidence: { state: "supported", sourceCount: 1 },
      clientUse: "blocked",
    });
    expect(brief.aiDisclosure.limitations).toContain(
      "The source did not publish enough provenance to classify this output as live AI assistance.",
    );
  });

  it("maps workflow-pack posture into supportability, review notes, and audit provenance", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-workflow-pack",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "ready",
        summary: "Workflow-pack backed advisor brief.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
        workflow_pack_run: {
          run_id: "packrun_advisor_brief_req-1",
          runtime_state: "COMPLETED",
          review_state: "AWAITING_REVIEW",
          allowed_review_actions: ["ACCEPT", "REJECT", "REVISE"],
          supportability_status: "ACTION_REQUIRED",
          review_pending: true,
          superseded: false,
          workflow_authority_owner: "lotus-gateway",
          current_summary_note:
            "Run completed but still requires bounded human review before downstream use.",
          replacement_run_id: null,
          findings: [
            {
              finding_id: "review_pending",
              severity: "ACTION_REQUIRED",
              summary: "Run is awaiting review.",
            },
          ],
        },
        workflow_pack_task_flow: {
          task_flow_id: "taskflow_advisor_brief_req-1",
          workflow_pack_id: "advisor_brief.pack",
          version: "v1",
          flow_status: "WAITING_FOR_REVIEW",
          current_step_id: "generate_advisor_brief",
          run_refs: ["packrun_advisor_brief_req-1"],
          review_states: { "packrun_advisor_brief_req-1": "AWAITING_REVIEW" },
          supportability_status: "ACTION_REQUIRED",
          replacement_lineage: [],
          handoff_refs: [],
          updated_at: "2026-04-21T03:00:00Z",
        },
        ai_audit: { stubbed: false, source_refs: [] },
        ai_evidence: { source_refs: [] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        {
          label: "Brief preparation",
          value: "COMPLETED",
          tone: "success",
          detail: "Preparation complete; human review remains required",
        },
        {
          label: "Human review",
          value: "Awaiting review",
          tone: "warn",
          detail: "Supportability ACTION REQUIRED",
          reviewEvidence: {
            reviewState: "AWAITING_REVIEW",
            supportability: "ACTION_REQUIRED",
            reviewer: null,
            recordedAt: null,
          },
        },
        {
          label: "Workflow progress",
          value: "WAITING FOR REVIEW",
          tone: "warn",
          detail: "Supportability ACTION REQUIRED",
        },
      ])
    );
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "Run completed but still requires bounded human review before downstream use.",
        "ACTION REQUIRED: Run is awaiting review.",
        "Workflow progress is waiting for review.",
      ])
    );
    expect(brief.aiDisclosure).toEqual(
      expect.objectContaining({
        evidence: { state: "missing", sourceCount: 0 },
        humanReview: { state: "review-required", sourceRecorded: false },
        clientUse: "blocked",
        diagnostics: expect.arrayContaining([
          { label: "Workflow run", value: "packrun_advisor_brief_req-1" },
        ]),
      }),
    );
    expect(brief.supportDetails).toEqual(
      expect.arrayContaining([
        { label: "Brief run reference", value: "packrun_advisor_brief_req-1" },
        { label: "Workflow authority", value: "lotus-gateway" },
        { label: "Task flow reference", value: "taskflow_advisor_brief_req-1" },
        { label: "Current technical step", value: "generate_advisor_brief" },
      ])
    );
  });

  it("marks superseded workflow-pack runs as non-active posture and preserves replacement lineage", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
        ...REVIEW_CONTEXT_EVIDENCE,
        correlation_id: "corr-workflow-pack-superseded",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: scenario.workspace.portfolio,
        as_of_date: scenario.workspace.as_of_date,
        period: scenario.workspace.period,
        report_start_date: scenario.workspace.report_start_date,
        report_end_date: scenario.workspace.report_end_date,
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: scenario.workspace.benchmark_code,
        status: "ready",
        summary: "Superseded workflow-pack backed advisor brief.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
        workflow_pack_run: {
          run_id: "packrun_advisor_brief_req-1",
          runtime_state: "COMPLETED",
          review_state: "ACCEPTED",
          allowed_review_actions: [],
          supportability_status: "READY",
          review_pending: false,
          superseded: true,
          workflow_authority_owner: "lotus-gateway",
          current_summary_note: "Run was superseded by a newer bounded advisor-brief run.",
          replacement_run_id: "packrun_advisor_brief_req-2",
          findings: [],
        },
        workflow_pack_task_flow: {
          task_flow_id: "taskflow_advisor_brief_req-1",
          workflow_pack_id: "advisor_brief.pack",
          version: "v1",
          flow_status: "SUPERSEDED",
          current_step_id: null,
          run_refs: ["packrun_advisor_brief_req-1"],
          review_states: { "packrun_advisor_brief_req-1": "SUPERSEDED" },
          supportability_status: "HISTORICAL",
          replacement_lineage: [
            {
              superseded_run_id: "packrun_advisor_brief_req-1",
              replacement_run_id: "packrun_advisor_brief_req-2",
              review_action_ref: "SUPERSEDE",
              reason: "Advisor brief superseded in favor of the replacement run.",
            },
          ],
          handoff_refs: [
            {
              handoff_id: "taskflow_advisor_brief_req-1_handoff_packrun_advisor_brief_req-1",
              owner_service: "lotus-gateway",
              status: "READY_FOR_HANDOFF",
              domain_ref: null,
            },
          ],
          updated_at: "2026-04-21T03:00:00Z",
        },
        ai_audit: { stubbed: false, source_refs: [] },
        ai_evidence: { source_refs: [] },
        warnings: [],
        partial_failures: [],
      },
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        {
          label: "Human review",
          value: "Accepted for internal use",
          tone: "warn",
          detail:
            "Supportability READY • Review audit details not published • Superseded by packrun_advisor_brief_req-2",
          reviewEvidence: {
            reviewState: "ACCEPTED",
            supportability: "READY",
            reviewer: null,
            recordedAt: null,
          },
        },
        {
          label: "Workflow progress",
          value: "SUPERSEDED",
          tone: "warn",
          detail:
            "Supportability HISTORICAL • 1 replacement record(s) • 1 downstream handoff(s)",
        },
      ])
    );
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "Run was superseded by a newer bounded advisor-brief run.",
        "A replacement brief is linked to this historical review record.",
        "Workflow progress is superseded.",
        "Replacement lineage is available in support details.",
        "1 downstream workflow handoff record(s) are available.",
      ])
    );
    expect(brief.aiDisclosure.humanReview).toEqual({
      state: "unavailable",
      sourceRecorded: false,
    });
    expect(brief.aiDisclosure.limitations).toContain(
      "The source reports a terminal review state but did not publish a complete reviewer, event-time, and history record."
    );
  });
});
