import { describe, expect, it } from "vitest";

import { buildPerformanceAdvisorBriefViewModel } from "../../src/apps/performance/advisor-brief-view-model";
import {
  buildPerformanceCapabilities,
  buildCombinedPartialPerformanceScenario,
  buildSupportedPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("buildPerformanceAdvisorBriefViewModel", () => {
  it("builds a ready fixture-shaped brief with source metrics, audit, and drilldown evidence", () => {
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
    expect(brief.title).toBe("Advisor Brief • PF_1001");
    expect(brief.summary).toContain("YTD active return is 0.52%");
    expect(brief.summary).not.toContain("main drag came from AAPL");
    expect(brief.talkingPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Portfolio delivered 5.42% versus benchmark 4.91%.",
          evidenceRefs: expect.arrayContaining([
            expect.objectContaining({
              metricLabel: "Active Return",
              sourceSurface: "performance.return_path",
              targetMode: "summary",
              route: expect.stringContaining("/performance?portfolioId=PF_1001"),
            }),
          ]),
        }),
      ])
    );
    expect(brief.sourceMetrics.map((metric) => metric.label)).toEqual([
      "Portfolio Return",
      "Benchmark Return",
      "Active Return",
      "Net Flow",
      "Ending MV",
    ]);
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Portfolio", value: "Ready", tone: "success" },
        { label: "Advisor Brief", value: "Preview Ready", tone: "success" },
      ])
    );
    expect(brief.reviewNotes).toEqual([]);
    expect(brief.audit).toEqual(
      expect.objectContaining({
        taskId: "explain.v1",
        outputLabel: "EXPLANATION_ONLY",
        promptVersion: "foundation.explain.v1",
        providerMode: "fixture-preview",
        providerId: "text.stub",
        adapterKind: "STUB",
        modelId: null,
        stubbed: true,
        sourceRefs: expect.arrayContaining([
          "lotus-gateway:workbench:PF_1001:performance-summary:YTD",
          "lotus-workbench:advisor-brief-fixture:PF_1001:YTD",
        ]),
      })
    );
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
        { label: "Advisor Brief", value: "Preview Partial", tone: "warn" },
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
        { label: "Advisor Brief", value: "Generating", tone: "warn" },
      ])
    );
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "Deferred analytics are still loading; contribution and attribution evidence may update.",
      ])
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
        { label: "Advisor Brief", value: "No Material Brief", tone: "danger" },
      ])
    );
  });

  it("drops risk source facts and risk drilldowns when gateway evidence is not ready", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
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
      label: "Advisor Brief",
      value: "Partial",
      tone: "warn",
    });
  });

  it("normalizes gateway advisor-brief supportability to partial when content is present but the backend status is partial", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
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
      label: "Advisor Brief",
      value: "Partial",
      tone: "warn",
    });
    expect(brief.reviewNotes).toEqual([]);
  });

  it("falls back to gateway provenance when advisor brief source refs are empty", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
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

    expect(brief.audit.sourceRefs).toEqual([
      "lotus-gateway:workbench:PF_1001:performance-advisor-brief:YTD",
    ]);
  });

  it("maps workflow-pack posture into supportability, review notes, and audit provenance", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
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
          label: "AI Run",
          value: "COMPLETED",
          tone: "success",
          detail: "packrun_advisor_brief_req-1 • Authority lotus-gateway",
        },
        {
          label: "AI Review",
          value: "AWAITING REVIEW",
          tone: "warn",
          detail: "Supportability ACTION REQUIRED",
        },
        {
          label: "AI Task Flow",
          value: "WAITING FOR REVIEW",
          tone: "warn",
          detail: "taskflow_advisor_brief_req-1 • advisor_brief.pack@v1 • Supportability ACTION REQUIRED",
        },
      ])
    );
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "Run completed but still requires bounded human review before downstream use.",
        "ACTION REQUIRED: Run is awaiting review.",
        "Task flow taskflow_advisor_brief_req-1 is waiting for review.",
        "Current task-flow step: generate_advisor_brief.",
      ])
    );
    expect(brief.audit.sourceRefs).toEqual(
      expect.arrayContaining([
        "lotus-ai:workflow-pack-run:packrun_advisor_brief_req-1",
        "lotus-ai:workflow-pack-task-flow:taskflow_advisor_brief_req-1",
      ])
    );
  });

  it("marks superseded workflow-pack runs as non-active posture and preserves replacement lineage", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      advisorBrief: {
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
          label: "AI Review",
          value: "ACCEPTED",
          tone: "warn",
          detail: "Supportability READY • Superseded by packrun_advisor_brief_req-2",
        },
        {
          label: "AI Task Flow",
          value: "SUPERSEDED",
          tone: "warn",
          detail: "taskflow_advisor_brief_req-1 • advisor_brief.pack@v1 • Supportability HISTORICAL • 1 lineage edge(s)",
        },
      ])
    );
    expect(brief.reviewNotes).toEqual(
      expect.arrayContaining([
        "Run was superseded by a newer bounded advisor-brief run.",
        "Superseded by workflow-pack run packrun_advisor_brief_req-2.",
        "Task flow taskflow_advisor_brief_req-1 is superseded.",
        "SUPERSEDE: task flow links packrun_advisor_brief_req-1 to replacement run packrun_advisor_brief_req-2.",
      ])
    );
  });
});
