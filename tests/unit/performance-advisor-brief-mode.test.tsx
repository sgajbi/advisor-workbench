import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PerformanceAdvisorBriefMode from "../../src/apps/performance/components/performance-advisor-brief-mode";
import { getPerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import {
  getWorkbenchPerformanceAdvisorBriefClient,
  postWorkbenchPerformanceAdvisorBriefReviewActionClient,
} from "../../src/features/workbench/api";
import type { WorkbenchPerformanceAdvisorBrief } from "../../src/features/workbench/types";
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

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceAdvisorBriefClient: vi.fn(async () => readyAdvisorBriefResponse),
  postWorkbenchPerformanceAdvisorBriefReviewActionClient: vi.fn(async () => ({
    ...readyAdvisorBriefResponse,
    correlation_id: "corr-advisor-brief-review",
    summary: "Advisor brief accepted for bounded downstream workflow use.",
    workflow_pack_run: {
      ...readyAdvisorBriefResponse.workflow_pack_run,
      review_state: "ACCEPTED",
      allowed_review_actions: [],
      supportability_status: "READY",
      review_pending: false,
      current_summary_note: "Run accepted for bounded downstream workflow use.",
      findings: [],
    },
  })),
}));

describe("PerformanceAdvisorBriefMode", () => {
  beforeEach(() => {
    vi.mocked(getWorkbenchPerformanceAdvisorBriefClient).mockResolvedValue(readyAdvisorBriefResponse);
    vi.mocked(postWorkbenchPerformanceAdvisorBriefReviewActionClient).mockResolvedValue({
      ...readyAdvisorBriefResponse,
      correlation_id: "corr-advisor-brief-review",
      summary: "Advisor brief accepted for bounded downstream workflow use.",
      workflow_pack_run: {
        ...readyAdvisorBriefResponse.workflow_pack_run!,
        review_state: "ACCEPTED",
        allowed_review_actions: [],
        supportability_status: "READY",
        review_pending: false,
        current_summary_note: "Run accepted for bounded downstream workflow use.",
        findings: [],
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
      screen.getByRole("heading", { name: "Performance Advisor Brief" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor brief context")).toHaveTextContent(
      "BenchmarkGlobal Balanced 60/40"
    );
    await waitFor(() => {
      const supportability = screen.getByLabelText("Advisor brief supportability");
      expect(supportability).toHaveTextContent("Ready modules");
      expect(supportability).toHaveTextContent("Review items");
      expect(supportability).toHaveTextContent("Evidence");
      expect(supportability).toHaveTextContent("Partial");
      expect(supportability).toHaveTextContent("AI Review");
      expect(supportability).toHaveTextContent("AWAITING REVIEW");
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
    expect(screen.getByLabelText("Advisor brief toolbar")).toHaveTextContent("Source-grounded");
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Note" })).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor brief mode intro")).toHaveTextContent(
      "Source-grounded brief, drilldowns, and supportability"
    );
    expect(screen.getByLabelText("Advisor brief mode intro")).not.toHaveTextContent(
      "Client-ready narrative"
    );
    expect(screen.getByLabelText("Client Talking Points")).toHaveTextContent(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(screen.getByLabelText("Risks and Exceptions")).toHaveTextContent(
      "No material supportability exceptions are flagged"
    );
    expect(screen.getByLabelText("Source Metrics")).toHaveTextContent("Active Return");
    expect(screen.getByText("Audit metadata")).toBeInTheDocument();
    expect(screen.queryByText("foundation.explain.v1")).not.toBeInTheDocument();
    expect(screen.queryByText("EXPLANATION_ONLY")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Brief provenance")).toHaveTextContent(
      "Execution local_openai_compatible • text.local • qwen3:8b"
    );
    const sourceMetricsSidecar = screen.getByLabelText("Advisor brief source metrics");
    expect(within(sourceMetricsSidecar).getByLabelText("Source Metrics")).toBeInTheDocument();
    expect(within(sourceMetricsSidecar).getByLabelText("Advisor brief supportability")).toBeInTheDocument();
    expect(within(sourceMetricsSidecar).getByLabelText("Brief provenance")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Audit metadata"));

    expect(screen.getByText("Provider ID")).toBeInTheDocument();
    expect(screen.getByText("text.local")).toBeInTheDocument();
    expect(screen.getByText("OPENAI_COMPATIBLE_LOCAL")).toBeInTheDocument();
    expect(screen.getByText("qwen3:8b")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText("Recommended Actions")).getByRole("button", {
        name: /Review Contribution/,
      })
    );

    expect(onSelectMode).toHaveBeenCalledWith("analysis");
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
      const supportability = screen.getByLabelText("Advisor brief supportability");
      expect(supportability).toHaveTextContent("Ready modules");
    });

    fireEvent.click(
      within(screen.getByLabelText("Source Metrics")).getByRole("button", {
        name: /Active Return/,
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
      expect(screen.getByLabelText("Risks and Exceptions")).toHaveTextContent(
        "Advisor brief generation is unavailable."
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

    const supportability = screen.getByLabelText("Advisor brief supportability");
    expect(supportability).toHaveTextContent("Review items");
    expect(supportability).toHaveTextContent("Generating");
    await waitFor(() => {
      expect(getWorkbenchPerformanceAdvisorBriefClient).toHaveBeenCalledTimes(1);
    });
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
      expect(screen.getByLabelText("Advisor brief review actions")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Reviewed by"), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByLabelText("Review reason"), {
      target: {
        value: "Advisor brief accepted for bounded downstream workflow use.",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept Brief" }));

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
      const supportability = screen.getByLabelText("Advisor brief supportability");
      expect(supportability).toHaveTextContent("AI Run");
      expect(supportability).toHaveTextContent("COMPLETED");
      expect(supportability).toHaveTextContent("AI Review");
      expect(supportability).toHaveTextContent("ACCEPTED");
      expect(supportability).toHaveTextContent(
        "Run accepted for bounded downstream workflow use."
      );
      expect(screen.getByLabelText("Brief synopsis")).toHaveTextContent(
        "Advisor brief accepted for bounded downstream workflow use."
      );
      expect(screen.queryByLabelText("Advisor brief review actions")).not.toBeInTheDocument();
    });
  });
});
