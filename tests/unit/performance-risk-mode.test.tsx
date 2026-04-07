import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceRiskMode from "../../src/apps/performance/components/performance-risk-mode";
import {
  buildFixtureRiskConcentration,
  buildFixtureRiskSummary,
} from "../../src/apps/performance/risk-workspace-view-model";
import {
  getWorkbenchRiskConcentrationClient,
  getWorkbenchRiskSummaryClient,
} from "../../src/features/workbench/api";
import { buildBenchmarkUnassignedPerformanceScenario, buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchRiskSummaryClient: vi.fn(),
  getWorkbenchRiskConcentrationClient: vi.fn(),
}));

function renderRiskMode(
  scenario = buildSupportedPerformanceScenario(),
  options: { detailBasis?: "NET" | "GROSS"; period?: string; isDetailsPending?: boolean } = {}
) {
  render(
    <PerformanceRiskMode
      workspace={scenario.workspace}
      capabilities={scenario.capabilities}
      period={options.period ?? "YTD"}
      detailBasis={options.detailBasis ?? "NET"}
      contributionDimension="asset_class"
      attributionDimension="asset_class"
      chartFrequency="monthly"
      isUpdating={false}
      isDetailsPending={options.isDetailsPending ?? false}
    />
  );
}

describe("PerformanceRiskMode", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("fetches live Gateway-backed risk summary and concentration contracts", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );

    renderRiskMode(scenario);

    expect(screen.getByText("Loading stateful risk")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText("Risk snapshot metric table")).toHaveTextContent("Volatility");
    });

    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      asOfDate: "2026-02-24",
      reportingCurrency: "USD",
    });
  });

  it("reuses cached live responses for the same request shape and invalidates summary only when detail basis changes", async () => {
    const scenario = buildSupportedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );

    const { rerender } = render(
      <PerformanceRiskMode
        workspace={scenario.workspace}
        capabilities={scenario.capabilities}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risk snapshot metric table")).toBeInTheDocument();
    });

    rerender(
      <PerformanceRiskMode
        workspace={scenario.workspace}
        capabilities={scenario.capabilities}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Risk concentration diagnostic table")).toBeInTheDocument();
    });

    expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(1);
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledTimes(1);

    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "GROSS")
    );

    rerender(
      <PerformanceRiskMode
        workspace={scenario.workspace}
        capabilities={scenario.capabilities}
        period="YTD"
        detailBasis="GROSS"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
        isUpdating={false}
        isDetailsPending={false}
      />
    );

    await waitFor(() => {
      expect(getWorkbenchRiskSummaryClient).toHaveBeenCalledTimes(2);
    });
    expect(getWorkbenchRiskConcentrationClient).toHaveBeenCalledTimes(1);
  });

  it("shows partial live supportability when benchmark-relative risk is unavailable", async () => {
    const scenario = buildBenchmarkUnassignedPerformanceScenario();
    vi.mocked(getWorkbenchRiskSummaryClient).mockResolvedValue(
      buildFixtureRiskSummary(scenario.workspace, "YTD", "NET")
    );
    vi.mocked(getWorkbenchRiskConcentrationClient).mockResolvedValue(
      buildFixtureRiskConcentration(scenario.workspace, "YTD")
    );

    renderRiskMode(scenario);

    await waitFor(() => {
      expect(screen.getByLabelText("Risk support rail")).toHaveTextContent("Benchmark returns");
    });
    expect(screen.getByLabelText("Risk support rail")).toHaveTextContent(
      "Benchmark-relative risk requires benchmark context."
    );
  });

  it("renders controlled unavailable states when both live BFF requests fail", async () => {
    vi.mocked(getWorkbenchRiskSummaryClient).mockRejectedValue(new Error("summary down"));
    vi.mocked(getWorkbenchRiskConcentrationClient).mockRejectedValue(
      new Error("concentration down")
    );

    renderRiskMode();

    await waitFor(() => {
      expect(screen.getByText("Risk unavailable")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Risk provenance")).toHaveTextContent("Stateful only");
    expect(screen.queryByLabelText("Risk snapshot metric table")).not.toBeInTheDocument();
  });
});
