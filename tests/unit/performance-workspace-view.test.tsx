import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { WorkbenchPerformanceWorkspace } from "../../src/features/workbench/types";
import PerformanceWorkspaceView from "../../src/apps/performance/components/performance-workspace-view";

vi.mock("../../src/apps/performance/components/performance-summary-mode", () => ({
  default: () => <div>Summary Mode Panel</div>,
}));

vi.mock("../../src/apps/performance/components/performance-analysis-mode", () => ({
  default: () => <div>Analysis Mode Panel</div>,
}));

vi.mock("../../src/apps/performance/components/performance-evidence-mode", () => ({
  default: () => <div>Evidence Mode Panel</div>,
}));

function buildWorkspace(): WorkbenchPerformanceWorkspace {
  return {
    correlation_id: "corr",
    contract_version: "v1",
    portfolio_id: "PF_1001",
    as_of_date: "2026-03-29",
    period: "YTD",
    report_start_date: "2026-01-01",
    report_end_date: "2026-03-29",
    chart_frequency: "monthly",
    contribution_dimension: "asset_class",
    attribution_dimension: "asset_class",
    detail_basis: "NET",
    segment: "asset_class",
    benchmark_code: "BMK_1",
    benchmark_options: [],
    portfolio: {
      portfolio_id: "PF_1001",
      client_id: "CIF_1",
      base_currency: "USD",
      booking_center_code: "SG",
    },
    overview: {
      market_value_base: 1000000,
      cash_weight_pct: 5,
      position_count: 3,
    },
    net_performance: {
      metric_basis: "NET",
      portfolio_return_pct: 1,
      benchmark_return_pct: 0.8,
      active_return_pct: 0.2,
      annualized_return_pct: 1,
      benchmark_id: "BMK_1",
      benchmark_return_source: "calculated",
    },
    gross_performance: {
      metric_basis: "GROSS",
      portfolio_return_pct: 1.1,
      benchmark_return_pct: 0.8,
      active_return_pct: 0.3,
      annualized_return_pct: 1.1,
      benchmark_id: "BMK_1",
      benchmark_return_source: "calculated",
    },
    money_weighted_return: null,
    net_chart: [],
    gross_chart: [],
    contribution: null,
    attribution: null,
    warnings: [],
    partial_failures: [],
  } as WorkbenchPerformanceWorkspace;
}

describe("PerformanceWorkspaceView", () => {
  it("switches between summary, analysis, and evidence modes", () => {
    render(
      <PerformanceWorkspaceView
        workspace={buildWorkspace()}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="asset_class"
        chartFrequency="monthly"
      />
    );

    expect(document.querySelector(".workstation-shell-main-only")).toBeTruthy();
    expect(document.querySelector(".workstation-shell-main")).toBeTruthy();
    expect(document.querySelector(".workspace-layout")).toBeFalsy();
    expect(document.querySelector(".lotus-workstation-header")).toBeFalsy();
    expect(document.querySelector(".workbench-page-header")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Performance Workbench" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Benchmark-aware portfolio performance, attribution, and contribution analysis"
      )
    ).toBeInTheDocument();
    expect(
      document.querySelector(".workbench-page-header-actions [role='tablist']")
    ).toBeTruthy();
    expect(screen.getByText("Summary Mode Panel")).toBeInTheDocument();
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
    expect(screen.queryByText("Evidence Mode Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Analysis" }));
    expect(screen.getByText("Analysis Mode Panel")).toBeInTheDocument();
    expect(screen.queryByText("Summary Mode Panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Evidence" }));
    expect(screen.getByText("Evidence Mode Panel")).toBeInTheDocument();
    expect(screen.queryByText("Analysis Mode Panel")).not.toBeInTheDocument();
  });
});
