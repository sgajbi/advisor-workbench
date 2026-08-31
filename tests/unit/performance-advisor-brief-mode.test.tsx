import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PerformanceAdvisorBriefMode from "../../src/apps/performance/components/performance-advisor-brief-mode";
import AdvisorBriefReviewWorkflow from "../../src/apps/performance/components/advisor-brief/advisor-brief-review-workflow";
import LotusStatusBar from "../../src/apps/performance/components/advisor-brief/lotus-status-bar";
import { getPerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import {
  getWorkbenchPerformanceAdvisorBriefClient,
  postWorkbenchPerformanceAdvisorBriefReviewActionClient,
} from "../../src/features/workbench/performance-api";
import type {
  WorkbenchAdvisorBriefWorkflowPackRun,
  WorkbenchPerformanceAdvisorBrief,
} from "../../src/features/workbench/types";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

const readyAdvisorBriefResponse: WorkbenchPerformanceAdvisorBrief = {
  correlation_id: "corr-advisor-brief",
  contract_version: "v1",
  portfolio_id: "PF_1001",
  portfolio: {
    portfolio_id: "PF_1001",
    client_id: "CIF_1001",
    base_currency: "USD",
    booking_center_code: "SG",
  },
  as_of_date: "2026-02-24",
  requested_as_of_date: null,
  effective_as_of_date: "2026-02-24",
  requested_reporting_currency: null,
  effective_reporting_currency: "USD",
  reporting_currency_state: "accepted_unverified",
  period: "YTD",
  report_start_date: "2026-01-01",
  report_end_date: "2026-02-24",
  detail_basis: "NET",
  chart_frequency: "monthly",
  contribution_dimension: "asset_class",
  attribution_dimension: "asset_class",
  benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
  status: "ready",
  summary: "Gateway advisor brief is ready with source-grounded talking points.",
  talking_points: [
    {
      headline: "Portfolio delivered 5.42% versus benchmark 4.91%.",
      detail: "Active return was 0.51% over the selected period.",
      tone: "positive",
      evidence_refs: [
        {
          metric_label: "Active Return",
          metric_value: "0.51%",
          source_surface: "performance.return_path",
          target_mode: "summary",
          route: "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET",
        },
      ],
    },
  ],
  recommended_actions: [
    {
      label: "Open Return Path",
      target_mode: "summary",
      route: "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET",
    },
    {
      label: "Review Contribution",
      target_mode: "analysis",
      route: "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET",
    },
  ],
  risks_and_exceptions: [],
  source_metrics: [
    {
      label: "Active Return",
      value: "0.51%",
      support_label: "YTD Net",
      target_mode: "summary",
      route: "/performance?portfolioId=PF_1001&period=YTD&detailBasis=NET",
    },
  ],
  supportability: [
    { label: "Advisor Brief", value: "Ready", tone: "success" },
    { label: "Evidence", value: "Partial", tone: "warn" },
  ],
  workflow_pack_run: {
    run_id: "packrun_advisor_brief_req-1",
    runtime_state: "COMPLETED",
    review_state: "AWAITING_REVIEW",
    allowed_review_actions: ["ACCEPT", "REJECT", "REVISE", "SUPERSEDE"],
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
    review_states: {
      "packrun_advisor_brief_req-1": "AWAITING_REVIEW",
    },
    supportability_status: "ACTION_REQUIRED",
    replacement_lineage: [],
    handoff_refs: [],
    updated_at: "2026-04-21T03:00:00Z",
  },
  ai_audit: {
    task_id: "explain.v1",
    output_label: "EXPLANATION_ONLY",
    prompt_version: "foundation.explain.v1",
    provider_mode: "local_openai_compatible",
    provider_id: "text.local",
    adapter_kind: "OPENAI_COMPATIBLE_LOCAL",
    model_id: "qwen3:8b",
    generated_at: "2026-02-24T00:00:00Z",
    stubbed: false,
  },
  ai_evidence: {
    source_refs: [
      "lotus-gateway:workbench:PF_1001:performance-summary:YTD",
      "lotus-ai:task:explain.v1",
    ],
  },
  warnings: ["AI provider returned bounded narrative only."],
  partial_failures: [
    {
      source_service: "lotus-ai",
      error_code: "PROVIDER_PARTIAL",
      detail: "AI provider unavailable for full narrative generation.",
    },
  ],
};

vi.mock("../../src/features/workbench/performance-api", () => ({
  getWorkbenchPerformanceAdvisorBriefClient: vi.fn(async () => readyAdvisorBriefResponse),
  postWorkbenchPerformanceAdvisorBriefReviewActionClient: vi.fn(async () => ({
    ...readyAdvisorBriefResponse,
    correlation_id: "corr-advisor-brief-review",
    workflow_pack_run: {
      ...readyAdvisorBriefResponse.workflow_pack_run,
      review_state: "ACCEPTED",
      latest_review_event_at: "2026-04-21T03:22:00Z",
      latest_review_actor: "review:advisor_1",
      review_transition_count: 1,
      has_review_history: true,
      allowed_review_actions: [],
      supportability_status: "READY",
      review_pending: false,
      current_summary_note: "Run accepted for bounded downstream workflow use.",
      findings: [],
    },
    workflow_pack_task_flow: {
      ...readyAdvisorBriefResponse.workflow_pack_task_flow!,
      flow_status: "COMPLETED",
      review_states: {
        "packrun_advisor_brief_req-1": "ACCEPTED",
      },
      supportability_status: "READY",
      handoff_refs: [
        {
          handoff_id: "taskflow_advisor_brief_req-1_handoff_packrun_advisor_brief_req-1",
          owner_service: "lotus-gateway",
          status: "READY_FOR_HANDOFF",
          domain_ref: null,
        },
      ],
    },
  })),
}));

describe("PerformanceAdvisorBriefMode", () => {
  beforeEach(() => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValue(readyAdvisorBriefResponse);
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      correlation_id: "corr-advisor-brief-review",
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        review_state: "ACCEPTED",
        latest_review_event_at: "2026-04-21T03:22:00Z",
        latest_review_actor: "review:advisor_1",
        review_transition_count: 1,
        has_review_history: true,
        allowed_review_actions: [],
        supportability_status: "READY",
        review_pending: false,
        current_summary_note: "Run accepted for bounded downstream workflow use.",
        findings: [],
      },
      workflow_pack_task_flow: {
        ...readyAdvisorBriefResponse.workflow_pack_task_flow!,
        flow_status: "COMPLETED",
        review_states: {
          "packrun_advisor_brief_req-1": "ACCEPTED",
        },
        supportability_status: "READY",
        handoff_refs: [
          {
            handoff_id: "taskflow_advisor_brief_req-1_handoff_packrun_advisor_brief_req-1",
            owner_service: "lotus-gateway",
            status: "READY_FOR_HANDOFF",
            domain_ref: null,
          },
        ],
      },
    });
  });

  it("renders a source-grounded brief with supportability, metrics, and AI contract metadata", async () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const onSelectMode = vi.fn();

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={onSelectMode}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Performance adviser brief" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Adviser brief context")).toHaveTextContent(
      "BenchmarkGlobal Balanced 60/40"
    );
    await waitFor(() => {
      const supportability = screen.getByLabelText("Adviser brief supportability");
      expect(supportability).toHaveTextContent("Ready modules");
      expect(supportability).toHaveTextContent("Review items");
      expect(supportability).toHaveTextContent("Evidence");
      expect(supportability).toHaveTextContent("Partial");
      expect(supportability).toHaveTextContent("Brief preparation");
      expect(supportability).toHaveTextContent("Human review");
      expect(supportability).toHaveTextContent("Awaiting review");
      expect(supportability).toHaveTextContent("Supportability ACTION REQUIRED");
      expect(supportability).toHaveTextContent("Workflow progress");
      expect(supportability).toHaveTextContent("WAITING FOR REVIEW");
      expect(supportability).toHaveTextContent("Source support details");
      expect(supportability).toHaveTextContent("Brief run reference");
      expect(supportability).toHaveTextContent("packrun_advisor_brief_req-1");
      expect(supportability).toHaveTextContent("Workflow authority");
      expect(supportability).toHaveTextContent("lotus-gateway");
      expect(supportability).toHaveTextContent(
        "Run completed but still requires bounded human review before downstream use."
      );
      expect(supportability).toHaveTextContent("ACTION REQUIRED: Run is awaiting review.");
      expect(supportability).toHaveTextContent(
        "AI provider unavailable for full narrative generation."
      );
    });
    expect(screen.getByLabelText("Brief synopsis")).toHaveTextContent(
      "Gateway advisor brief is ready with source-grounded talking points."
    );
    expect(screen.getByLabelText("Adviser brief toolbar")).toHaveTextContent(
      "Evidence available"
    );
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy internal note" })).toBeInTheDocument();
    expect(screen.getByLabelText("Adviser brief mode intro")).toHaveTextContent(
      "Source-grounded brief, drilldowns, and supportability"
    );
    expect(screen.getByLabelText("Adviser brief mode intro")).not.toHaveTextContent(
      "Client-ready narrative"
    );
    expect(screen.getByLabelText("Adviser talking points")).toHaveTextContent(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(screen.getByLabelText("Risks and exceptions")).toHaveTextContent(
      "No material supportability exceptions are flagged"
    );
    expect(screen.getByLabelText("Source metrics")).toHaveTextContent("Active return");
    expect(
      within(screen.getByLabelText("Source metrics")).getByRole("heading", {
        name: "Key source metrics",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("How this was prepared")).toBeInTheDocument();
    expect(screen.getByText("Partial output")).toBeInTheDocument();
    expect(screen.queryByText("foundation.explain.v1")).not.toBeInTheDocument();
    expect(screen.queryByText("EXPLANATION_ONLY")).not.toBeInTheDocument();
    const sourceMetricsSidecar = screen.getByLabelText("Adviser brief source metrics");
    expect(within(sourceMetricsSidecar).getByLabelText("Source metrics")).toBeInTheDocument();
    expect(within(sourceMetricsSidecar).getByLabelText("Adviser brief supportability")).toBeInTheDocument();
    fireEvent.click(screen.getByText("How this was prepared"));

    expect(screen.getByText("Execution provider")).toBeInTheDocument();
    expect(screen.getByText("text.local")).toBeInTheDocument();
    expect(screen.getByText("qwen3:8b")).toBeInTheDocument();
    expect(screen.getByText("Not approved for client use")).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText("Recommended actions")).getByRole("button", {
        name: /Review contribution/,
      })
    );

    expect(onSelectMode).toHaveBeenCalledWith("analysis");
  });

  it("fails closed when a disabled provider is presented as live AI assistance", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      warnings: [],
      partial_failures: [],
      ai_audit: {
        ...readyAdvisorBriefResponse.ai_audit,
        provider_mode: "disabled",
        stubbed: false,
      },
    });
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Partial output")).toBeInTheDocument();
    });
    expect(screen.queryByText("Live AI-assisted output")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("How this was prepared"));

    expect(screen.getByText("Generation provenance unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Generation provenance is missing, unsupported, or contradictory, so this output cannot be classified as live AI assistance."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Not approved for client use")).toBeInTheDocument();
  });

  it("opens Summary when a source metric card is selected", async () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const onSelectMode = vi.fn();

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={onSelectMode}
      />
    );

    await waitFor(() => {
      const supportability = screen.getByLabelText("Adviser brief supportability");
      expect(supportability).toHaveTextContent("Ready modules");
    });

    fireEvent.click(
      within(screen.getByLabelText("Source metrics")).getByRole("button", {
        name: /Active return/,
      })
    );

    expect(onSelectMode).toHaveBeenCalledWith("summary");
  });

  it("refreshes the advisor brief in place without requiring a mode change", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockClear();
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenCalledTimes(2);
    });
  });

  it("withholds a self-consistent brief that differs from the loaded workspace context", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      as_of_date: "2026-02-23",
      effective_as_of_date: "2026-02-23",
      summary: "Evidence from a different effective review date.",
    });
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risks and exceptions")).toHaveTextContent(
        "Adviser brief generation is unavailable.",
      );
    });
    expect(
      screen.queryByText("Evidence from a different effective review date."),
    ).not.toBeInTheDocument();
  });

  it("withholds a brief that belongs to a different analytical scope", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      period: "1Y",
      summary: "Evidence from a different analytical period.",
    });
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risks and exceptions")).toHaveTextContent(
        "Adviser brief generation is unavailable.",
      );
    });
    expect(
      screen.queryByText("Evidence from a different analytical period."),
    ).not.toBeInTheDocument();
  });

  it("recovers from an unavailable advisor brief after an explicit refresh", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient)
      .mockReset()
      .mockRejectedValueOnce(new Error("brief unavailable"))
      .mockResolvedValue({
        correlation_id: "corr-advisor-brief-retry",
        contract_version: "v1",
        portfolio_id: "PF_1001",
        portfolio: {
          portfolio_id: "PF_1001",
          client_id: "CIF_1001",
          base_currency: "USD",
          booking_center_code: "SG",
        },
        as_of_date: "2026-02-24",
        requested_as_of_date: null,
        effective_as_of_date: "2026-02-24",
        requested_reporting_currency: null,
        effective_reporting_currency: "USD",
        reporting_currency_state: "accepted_unverified",
        period: "YTD",
        report_start_date: "2026-01-01",
        report_end_date: "2026-02-24",
        detail_basis: "NET",
        chart_frequency: "monthly",
        contribution_dimension: "asset_class",
        attribution_dimension: "asset_class",
        benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
        status: "ready",
        summary: "Recovered advisor brief.",
        talking_points: [],
        recommended_actions: [],
        risks_and_exceptions: [],
        source_metrics: [],
        supportability: [{ label: "Advisor Brief", value: "Ready", tone: "success" }],
        ai_audit: {
          task_id: "explain.v1",
          output_label: "EXPLANATION_ONLY",
          prompt_version: "foundation.explain.v1",
          provider_mode: "local_openai_compatible",
          provider_id: "text.local",
          adapter_kind: "OPENAI_COMPATIBLE_LOCAL",
          model_id: "qwen3:8b",
          generated_at: "2026-02-24T00:00:00Z",
          stubbed: false,
        },
        ai_evidence: { source_refs: ["lotus-gateway:workbench:PF_1001:performance-summary:YTD"] },
        warnings: [],
        partial_failures: [],
      });

    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risks and exceptions")).toHaveTextContent(
        "Adviser brief generation is unavailable."
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Brief synopsis")).toHaveTextContent("Recovered advisor brief.");
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenCalledTimes(2);
    });
  });

  it("starts the Gateway call immediately even while details are still pending", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockClear();
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending
        onSelectMode={vi.fn()}
      />
    );

    const supportability = screen.getByLabelText("Adviser brief supportability");
    expect(supportability).toHaveTextContent("Review items");
    expect(supportability).toHaveTextContent("Generating");
    await waitFor(() => {
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenCalledTimes(1);
    });
  });

  it("starts a clean review session when the selected portfolio context changes", async () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const nextWorkspace = {
      ...workspace,
      portfolio_id: "PF_2002",
      portfolio: {
        ...workspace.portfolio,
        portfolio_id: "PF_2002",
        client_id: "CIF_2002",
      },
    };
    const nextResponse: WorkbenchPerformanceAdvisorBrief = {
      ...readyAdvisorBriefResponse,
      correlation_id: "corr-advisor-brief-next",
      portfolio_id: "PF_2002",
      portfolio: {
        ...readyAdvisorBriefResponse.portfolio,
        portfolio_id: "PF_2002",
        client_id: "CIF_2002",
      },
      summary: "The next portfolio brief is source confirmed.",
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        run_id: "packrun_advisor_brief_req-2",
      },
    };

    const { rerender } = render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Adviser brief human review")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Review decision"), {
      target: { value: "ACCEPT" },
    });
    fireEvent.change(screen.getByLabelText(/Reviewer reference/), {
      target: { value: "advisor_old" },
    });
    fireEvent.change(screen.getByLabelText("Review rationale"), {
      target: { value: "This rationale belongs to the previous portfolio." },
    });

    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValueOnce(nextResponse);
    rerender(
      <PerformanceAdvisorBriefMode
        workspace={nextWorkspace}
        capabilities={getPerformanceWorkspaceCapabilities(nextWorkspace)}
        period={nextWorkspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={nextWorkspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenLastCalledWith(
        "PF_2002",
        expect.any(Object)
      );
      expect(screen.getByText("The next portfolio brief is source confirmed.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Review decision")).toHaveValue("");
    expect(screen.getByLabelText(/Reviewer reference/)).toHaveValue("");
    expect(screen.getByLabelText("Review rationale")).toHaveValue("");
  });

  it("withholds the prior brief while a replacement review context is pending", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient)
      .mockReset()
      .mockResolvedValueOnce(readyAdvisorBriefResponse)
      .mockImplementationOnce(() => new Promise(() => undefined));
    const workspace = buildSupportedPerformanceScenario().workspace;
    const { rerender } = render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await screen.findByText(
      "Gateway advisor brief is ready with source-grounded talking points."
    );

    const nextWorkspace = {
      ...workspace,
      as_of_date: "2026-02-23",
      requested_as_of_date: "2026-02-23",
      effective_as_of_date: "2026-02-23",
      report_end_date: "2026-02-23",
    };
    rerender(
      <PerformanceAdvisorBriefMode
        workspace={nextWorkspace}
        capabilities={getPerformanceWorkspaceCapabilities(nextWorkspace)}
        period={nextWorkspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={nextWorkspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    expect(
      screen.queryByText(
        "Gateway advisor brief is ready with source-grounded talking points."
      )
    ).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("Adviser brief supportability")).toHaveTextContent(
        "Generating"
      );
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenCalledTimes(2);
    });
  });

  it.each([
    ["AWAITING_REVIEW", true, "Awaiting review", "warn"],
    ["ACCEPTED", false, "Accepted for internal use", "success"],
    ["ACCEPTED", true, "Accepted for internal use", "default"],
    ["REJECTED", false, "Rejected", "danger"],
    ["REJECTED", true, "Rejected", "danger"],
    ["ABANDONED", false, "Withdrawn", "danger"],
    ["ABANDONED", true, "Withdrawn", "danger"],
    ["REVISED", false, "Revision requested", "default"],
    ["REVISED", true, "Revision requested", "default"],
    ["SUPERSEDED", false, "Superseded", "default"],
    ["NOT_REVIEW_REQUIRED", false, "No review required", "default"],
    ["NOT_REVIEW_REQUIRED", true, "No review required", "default"],
    ["PENDING", true, "Not reported", "default"],
    ["UNRECOGNIZED", false, "Not reported", "default"],
  ])(
    "maps %s with pending=%s to the %s label and %s tone without optimistic severity",
    (reviewState, reviewPending, expectedLabel, expectedTone) => {
      const workflowPackRun: WorkbenchAdvisorBriefWorkflowPackRun = {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        review_state: reviewState,
        review_pending: reviewPending,
        latest_review_event_at: "2026-04-21T03:22:00Z",
        latest_review_actor: "advisor_1",
        review_transition_count: 1,
        has_review_history: true,
      };

      render(
        <AdvisorBriefReviewWorkflow
          workflowPackRun={workflowPackRun}
          feedback={{ state: "idle", message: "" }}
          isApplying={false}
          onApply={vi.fn()}
        />
      );

      expect(
        screen.getByLabelText(`Status ${expectedLabel}`)
      ).toHaveClass(`semantic-badge-${expectedTone}`);
    }
  );

  it("keeps an accepted review neutral when source audit evidence is incomplete", () => {
    render(
      <AdvisorBriefReviewWorkflow
        workflowPackRun={{
          ...readyAdvisorBriefResponse.workflow_pack_run!,
          review_state: "ACCEPTED",
          review_pending: false,
          allowed_review_actions: [],
        }}
        feedback={{ state: "idle", message: "" }}
        isApplying={false}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Status Accepted for internal use")).toHaveClass(
      "semantic-badge-default"
    );
  });

  it.each([
    ["a terminal state", { review_state: "ACCEPTED", review_pending: false }],
    ["a contradictory pending terminal state", { review_state: "ACCEPTED", review_pending: true }],
    ["an unknown review state", { review_state: "UNRECOGNIZED", review_pending: false }],
    ["a failed source run", { runtime_state: "FAILED" }],
    ["a superseded source run", { superseded: true }],
  ])("does not expose review decisions for %s even when stale actions are returned", (_, overrides) => {
    render(
      <AdvisorBriefReviewWorkflow
        workflowPackRun={{
          ...readyAdvisorBriefResponse.workflow_pack_run!,
          allowed_review_actions: ["ACCEPT", "REJECT"],
          ...overrides,
        }}
        feedback={{ state: "idle", message: "" }}
        isApplying={false}
        onApply={vi.fn()}
      />
    );

    expect(screen.queryByLabelText("Review decision")).not.toBeInTheDocument();
    expect(screen.getByText(/No further review decision is currently available/)).toBeInTheDocument();
  });

  it("exposes only known source actions for a coherent completed review posture", () => {
    render(
      <AdvisorBriefReviewWorkflow
        workflowPackRun={{
          ...readyAdvisorBriefResponse.workflow_pack_run!,
          allowed_review_actions: ["ACCEPT", "UNKNOWN_ACTION"] as unknown as
            WorkbenchAdvisorBriefWorkflowPackRun["allowed_review_actions"],
        }}
        feedback={{ state: "idle", message: "" }}
        isApplying={false}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Review decision")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Accept for internal use" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "UNKNOWN_ACTION" })).not.toBeInTheDocument();
  });

  it.each([null, undefined, { state: "AWAITING_REVIEW" }])(
    "renders malformed review state %s as unavailable without exposing actions",
    (reviewState) => {
      render(
        <AdvisorBriefReviewWorkflow
          workflowPackRun={{
            ...readyAdvisorBriefResponse.workflow_pack_run!,
            review_state: reviewState as unknown as string,
          }}
          feedback={{ state: "idle", message: "" }}
          isApplying={false}
          onApply={vi.fn()}
        />
      );

      expect(screen.getByLabelText("Status Not reported")).toBeInTheDocument();
      expect(screen.queryByLabelText("Review decision")).not.toBeInTheDocument();
    }
  );

  it.each([null, undefined, { action: "ACCEPT" }])(
    "fails closed when the source action list drifts to %s",
    (sourceActions) => {
      render(
        <AdvisorBriefReviewWorkflow
          workflowPackRun={{
            ...readyAdvisorBriefResponse.workflow_pack_run!,
            allowed_review_actions: sourceActions as unknown as
              WorkbenchAdvisorBriefWorkflowPackRun["allowed_review_actions"],
          }}
          feedback={{ state: "idle", message: "" }}
          isApplying={false}
          onApply={vi.fn()}
        />
      );

      expect(screen.queryByLabelText("Review decision")).not.toBeInTheDocument();
      expect(screen.getByText(/No further review decision is currently available/))
        .toBeInTheDocument();
    }
  );

  it("clears copy confirmation when the source note or copy posture changes", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    const { rerender } = render(
      <LotusStatusBar
        status="ready"
        noteText="INTERNAL WORKING NOTE"
        onRefresh={vi.fn()}
        canCopy
        refreshing={false}
        interactionBusy={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy internal note" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("INTERNAL WORKING NOTE"));
    expect(screen.getByText(/Internal note copied/)).toBeInTheDocument();

    rerender(
      <LotusStatusBar
        status="ready"
        noteText="BLOCKED INTERNAL NOTE"
        onRefresh={vi.fn()}
        canCopy={false}
        refreshing={false}
        interactionBusy={false}
      />
    );

    expect(screen.queryByText(/Internal note copied/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy internal note" })).toBeDisabled();
  });

  it("keeps an accepted review neutral when its source event time is malformed", () => {
    render(
      <AdvisorBriefReviewWorkflow
        workflowPackRun={{
          ...readyAdvisorBriefResponse.workflow_pack_run!,
          review_state: "ACCEPTED",
          review_pending: false,
          latest_review_actor: "advisor_1",
          latest_review_event_at: "not-a-date",
          review_transition_count: 1,
          has_review_history: true,
          allowed_review_actions: [],
        }}
        feedback={{ state: "idle", message: "" }}
        isApplying={false}
        onApply={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Status Accepted for internal use")).toHaveClass(
      "semantic-badge-default"
    );
  });

  it("records a bounded review action and refreshes the run posture in place", async () => {
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockClear();
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Adviser brief human review")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Use the bank staff reference required for this internal review record.")
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Review decision"), {
      target: { value: "ACCEPT" },
    });
    fireEvent.change(screen.getByLabelText(/Reviewer reference/), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByLabelText("Review rationale"), {
      target: {
        value: "Advisor brief accepted for bounded downstream workflow use.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review decision" }));

    expect(postWorkbenchPerformanceAdvisorBriefReviewActionClient).not.toHaveBeenCalled();
    expect(screen.getByText("Accept for internal use")).toBeInTheDocument();
    expect(screen.getAllByText(/does not approve client communication/i)).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Confirm acceptance" }));

    await waitFor(() => {
      expect(postWorkbenchPerformanceAdvisorBriefReviewActionClient).toHaveBeenCalledWith(
        "PF_1001",
        {
          period: "YTD",
          chartFrequency: "monthly",
          contributionDimension: "asset_class",
          attributionDimension: "asset_class",
          detailBasis: "NET",
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
          reportStartDate: "2026-01-01",
          reportEndDate: "2026-02-24",
        },
        {
          action_type: "ACCEPT",
          reviewed_by: "advisor_1",
          reason: "Advisor brief accepted for bounded downstream workflow use.",
        }
      );
      const supportability = screen.getByLabelText("Adviser brief supportability");
      expect(supportability).toHaveTextContent("Brief preparation");
      expect(supportability).toHaveTextContent("COMPLETED");
      expect(supportability).toHaveTextContent("packrun_advisor_brief_req-1");
      expect(supportability).toHaveTextContent("Human review");
      expect(supportability).toHaveTextContent("Accepted for internal use");
      expect(supportability).toHaveTextContent("Recorded by advisor_1");
      expect(supportability).toHaveTextContent("Recorded 21 Apr 2026, 03:22 UTC");
      expect(supportability).not.toHaveTextContent("Recorded 2026-04-21T03:22:00Z");
      const reviewEvidence = screen.getByTestId("advisor-brief-human-review-evidence");
      expect(reviewEvidence).toHaveAttribute("data-review-state", "ACCEPTED");
      expect(reviewEvidence).toHaveAttribute("data-review-supportability", "READY");
      expect(reviewEvidence).toHaveAttribute("data-reviewer", "advisor_1");
      expect(reviewEvidence).toHaveAttribute(
        "data-recorded-at",
        "2026-04-21T03:22:00Z"
      );
      expect(reviewEvidence.textContent).toContain("Human reviewSupportability READY");
      expect(supportability).toHaveTextContent("1 downstream workflow handoff record(s)");
      expect(supportability).toHaveTextContent(
        "Run accepted for bounded downstream workflow use."
      );
      expect(screen.getByLabelText("Brief synopsis")).toHaveTextContent(
        "Gateway advisor brief is ready with source-grounded talking points."
      );
      expect(screen.getByLabelText("Adviser brief human review")).toHaveTextContent(
        "The brief was accepted for its permitted internal workflow use."
      );
      expect(screen.getByLabelText("Adviser brief human review")).toHaveTextContent(
        "No further review decision is currently available"
      );
      expect(within(screen.getByLabelText("Adviser brief human review")).getByRole("status"))
        .toHaveFocus();
    });
  });

  it("rejects an HTTP-success response that does not prove the requested review transition", async () => {
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockResolvedValueOnce({
      ...readyAdvisorBriefResponse,
      correlation_id: "corr-advisor-brief-unconfirmed-review",
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        review_state: "AWAITING_REVIEW",
        latest_review_event_at: null,
        latest_review_actor: null,
        review_transition_count: 0,
        has_review_history: false,
      },
    });
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Adviser brief human review")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Review decision"), {
      target: { value: "ACCEPT" },
    });
    fireEvent.change(screen.getByLabelText(/Reviewer reference/), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByLabelText("Review rationale"), {
      target: { value: "Evidence supports permitted internal use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review decision" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm acceptance" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The review decision could not be confirmed. Refresh the brief to reconcile the latest source status before retrying."
    );
    expect(screen.getByLabelText("Status Awaiting review")).toBeInTheDocument();
    expect(screen.queryByText(/brief was accepted for its permitted internal workflow/i))
      .not.toBeInTheDocument();
  });

  it("requires replacement lineage input for revision actions before posting the bounded review action", async () => {
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockClear();
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        allowed_review_actions: ["REVISE", "SUPERSEDE"],
      },
    });
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      correlation_id: "corr-advisor-brief-revise",
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        review_state: "REVISED",
        latest_review_event_at: "2026-04-21T03:24:00Z",
        latest_review_actor: "advisor_2",
        review_transition_count: 1,
        has_review_history: true,
        allowed_review_actions: [],
        supportability_status: "HISTORICAL",
        review_pending: false,
        superseded: true,
        current_summary_note: "Run was revised in favor of a replacement advisor-brief run.",
        replacement_run_id: "packrun_advisor_brief_req-2",
        findings: [],
      },
      workflow_pack_task_flow: {
        ...readyAdvisorBriefResponse.workflow_pack_task_flow!,
        flow_status: "SUPERSEDED",
        current_step_id: null,
        review_states: {
          "packrun_advisor_brief_req-1": "REVISED",
        },
        supportability_status: "HISTORICAL",
        replacement_lineage: [
          {
            superseded_run_id: "packrun_advisor_brief_req-1",
            replacement_run_id: "packrun_advisor_brief_req-2",
            review_action_ref: "REVISE",
            reason: "A replacement advisor brief run is available for downstream use.",
          },
        ],
        handoff_refs: [],
      },
    });

    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Adviser brief human review")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Review decision"), {
      target: { value: "REVISE" },
    });
    fireEvent.change(screen.getByLabelText(/Reviewer reference/), {
      target: { value: "advisor_2" },
    });
    fireEvent.change(screen.getByLabelText("Review rationale"), {
      target: {
        value: "A replacement advisor brief run is available for downstream use.",
      },
    });

    const reviseButton = screen.getByRole("button", { name: "Review decision" });
    expect(reviseButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Replacement brief reference"), {
      target: { value: "packrun_advisor_brief_req-2" },
    });

    expect(reviseButton).toBeEnabled();
    fireEvent.click(reviseButton);
    expect(postWorkbenchPerformanceAdvisorBriefReviewActionClient).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm revision request" }));

    await waitFor(() => {
      expect(postWorkbenchPerformanceAdvisorBriefReviewActionClient).toHaveBeenCalledWith(
        "PF_1001",
        {
          period: "YTD",
          chartFrequency: "monthly",
          contributionDimension: "asset_class",
          attributionDimension: "asset_class",
          detailBasis: "NET",
          benchmark: "BMK_GLOBAL_BALANCED_60_40",
          reportStartDate: "2026-01-01",
          reportEndDate: "2026-02-24",
        },
        {
          action_type: "REVISE",
          reviewed_by: "advisor_2",
          reason: "A replacement advisor brief run is available for downstream use.",
          replacement_run_id: "packrun_advisor_brief_req-2",
        }
      );
      const supportability = screen.getByLabelText("Adviser brief supportability");
      expect(supportability).toHaveTextContent(
        "Run was revised in favor of a replacement advisor-brief run."
      );
      expect(supportability).toHaveTextContent(
        "A replacement brief is linked to this historical review record."
      );
    });
  });

  it("keeps the decision explicit and recoverable when source persistence fails", async () => {
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockClear();
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockRejectedValueOnce(
      new Error("Gateway review persistence failed")
    );
    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Adviser brief human review")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByLabelText("Review decision"), {
      target: { value: "REJECT" },
    });
    fireEvent.change(screen.getByLabelText(/Reviewer reference/), {
      target: { value: "advisor_3" },
    });
    fireEvent.change(screen.getByLabelText("Review rationale"), {
      target: { value: "The cited evidence does not support the narrative." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Review decision" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm rejection" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The review decision could not be confirmed. Refresh the brief to reconcile the latest source status before retrying."
    );
    expect(screen.getByText("advisor_3")).toBeInTheDocument();
    expect(
      screen.getByText("The cited evidence does not support the narrative.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/source review record was updated/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm rejection" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Back to edit" }));
    expect(screen.getByLabelText(/Reviewer reference/)).toHaveValue("advisor_3");
    expect(screen.getByLabelText("Review rationale")).toHaveValue(
      "The cited evidence does not support the narrative."
    );
  });

  it("shows superseded workflow-pack lineage without treating the replaced run as active-ready posture", async () => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockReset().mockResolvedValue({
      ...readyAdvisorBriefResponse,
      correlation_id: "corr-advisor-brief-superseded",
      summary: "A newer bounded advisor brief has replaced this run.",
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        review_state: "ACCEPTED",
        allowed_review_actions: [],
        supportability_status: "READY",
        review_pending: false,
        superseded: true,
        current_summary_note: "Run was superseded by a newer bounded advisor-brief run.",
        replacement_run_id: "packrun_advisor_brief_req-2",
        findings: [],
      },
    });

    const workspace = buildSupportedPerformanceScenario().workspace;

    render(
      <PerformanceAdvisorBriefMode
        workspace={workspace}
        capabilities={getPerformanceWorkspaceCapabilities(workspace)}
        period={workspace.period}
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        benchmark={workspace.benchmark_code ?? undefined}
        onRequestChange={vi.fn()}
        isUpdating={false}
        isDetailsPending={false}
        onSelectMode={vi.fn()}
      />
    );

    await waitFor(() => {
      const supportability = screen.getByLabelText("Adviser brief supportability");
      expect(supportability).toHaveTextContent("Human review");
      expect(supportability).toHaveTextContent("Accepted for internal use");
      expect(supportability).toHaveTextContent(
        "Supportability READY • Review audit details not published • Superseded by packrun_advisor_brief_req-2"
      );
      expect(supportability).toHaveTextContent(
        "Run was superseded by a newer bounded advisor-brief run."
      );
      expect(supportability).toHaveTextContent(
        "A replacement brief is linked to this historical review record."
      );
      expect(screen.getByLabelText("Adviser brief human review")).toHaveTextContent(
        "No further review decision is currently available"
      );
      expect(screen.getByRole("button", { name: "Copy internal note" })).toBeDisabled();
    });
  });
});
