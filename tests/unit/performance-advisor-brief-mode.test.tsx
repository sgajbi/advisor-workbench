import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAdvisorBriefMode from "../../src/apps/performance/components/performance-advisor-brief-mode";
import { getPerformanceWorkspaceCapabilities } from "../../src/apps/performance/capabilities";
import { getWorkbenchPerformanceAdvisorBriefClient } from "../../src/features/workbench/api";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceAdvisorBriefClient: vi.fn(async () => ({
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
    ai_audit: {
      task_id: "explain.v1",
      output_label: "EXPLANATION_ONLY",
      prompt_version: "foundation.explain.v1",
      provider_mode: "disabled",
      generated_at: "2026-02-24T00:00:00Z",
      stubbed: true,
    },
    ai_evidence: {
      source_refs: [
        "lotus-gateway:workbench:PF_1001:performance-summary:YTD",
        "lotus-ai:task:explain.v1",
      ],
    },
    warnings: [],
    partial_failures: [],
  })),
}));

describe("PerformanceAdvisorBriefMode", () => {
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
      expect(supportability).toHaveTextContent("Advisor Brief");
      expect(supportability).toHaveTextContent("Ready");
    });
    expect(screen.getByLabelText("Advisor brief toolbar")).toHaveTextContent("Source-grounded");
    expect(screen.getByLabelText("Client Talking Points")).toHaveTextContent(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(screen.getByLabelText("Risks and Exceptions")).toHaveTextContent(
      "No material supportability exceptions are flagged"
    );
    expect(screen.getByLabelText("Source Metrics")).toHaveTextContent("Active Return");
    expect(screen.getByText("View audit metadata")).toBeInTheDocument();
    expect(screen.queryByText("foundation.explain.v1")).not.toBeInTheDocument();
    expect(screen.queryByText("EXPLANATION_ONLY")).not.toBeInTheDocument();

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
      expect(supportability).toHaveTextContent("Advisor Brief");
      expect(supportability).toHaveTextContent("Ready");
    });

    fireEvent.click(
      within(screen.getByLabelText("Source Metrics")).getByRole("button", {
        name: /Active Return/,
      })
    );

    expect(onSelectMode).toHaveBeenCalledWith("summary");
  });

  it("keeps a generating state and defers the Gateway call while details are still pending", () => {
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
    expect(supportability).toHaveTextContent("Advisor Brief");
    expect(supportability).toHaveTextContent("Generating");
    expect(getWorkbenchPerformanceAdvisorBriefClient).not.toHaveBeenCalled();
  });
});
