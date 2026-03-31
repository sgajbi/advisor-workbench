import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioPerformanceSnapshotModule from "../../src/apps/portfolio/components/portfolio-performance-snapshot-module";

describe("portfolio performance snapshot module", () => {
  it("renders a collapsed unavailable placeholder in summary mode", () => {
    render(
      <PortfolioPerformanceSnapshotModule
        capability={{
          state: "unavailable",
          reason: "Requires valuation history, cashflow history, and a selected reporting period.",
        }}
        performance={null}
        rebalance={null}
        reportingRowCount={0}
        context={{
          selectedAsOfDate: "2026-03-28",
          selectedReportingCurrency: "USD",
          timeWindow: "30D",
          periodLabel: "30D",
          viewMode: "summary",
          columnMode: "essential",
          hideEmptyModules: false,
          focusExceptions: false,
          effectivePeriodStartDate: "2026-02-27",
          effectivePeriodEndDate: "2026-03-28",
          usesCustomDateRange: false,
          hasHistoricalGap: false,
          currencyOptions: ["USD"],
          supportsHistoricalSnapshots: false,
          supportsReportingCurrencyRestatement: false,
        }}
        selectedPeriod="30D"
        expanded={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByRole("heading", { name: "Performance Snapshot" })).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/Requires valuation history, cashflow history, and a selected reporting period/i)
    ).toBeInTheDocument();
  });

  it("renders expanded unsupported performance through the shared capability panel contract", () => {
    const { container } = render(
      <PortfolioPerformanceSnapshotModule
        capability={{
          state: "partial",
          reason: "Performance history is incomplete for the current selection.",
        }}
        performance={null}
        rebalance={null}
        reportingRowCount={0}
        context={{
          selectedAsOfDate: "2026-03-28",
          selectedReportingCurrency: "USD",
          timeWindow: "30D",
          periodLabel: "30D",
          viewMode: "detailed",
          columnMode: "expanded",
          hideEmptyModules: false,
          focusExceptions: false,
          effectivePeriodStartDate: "2026-02-27",
          effectivePeriodEndDate: "2026-03-28",
          usesCustomDateRange: false,
          hasHistoricalGap: false,
          currencyOptions: ["USD"],
          supportsHistoricalSnapshots: false,
          supportsReportingCurrencyRestatement: false,
        }}
        selectedPeriod="30D"
        expanded
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText("Performance not available yet")).toBeInTheDocument();
    expect(
      screen.getByText("Performance history is incomplete for the current selection.")
    ).toBeInTheDocument();
    expect(container.querySelector(".portfolio-module-state")).not.toBeNull();
    expect(container.querySelector(".module-state-panel-partial")).not.toBeNull();
  });

  it("renders expanded source-backed performance summary fields when performance data exists", () => {
    const onToggle = vi.fn();

    render(
      <PortfolioPerformanceSnapshotModule
        capability={{ state: "supported" }}
        performance={{
          period: "QTD",
          report_start_date: "2026-01-01",
          report_end_date: "2026-03-28",
          return_pct: 5.12,
          money_weighted_return_pct: 4.88,
          money_weighted_method: "XIRR",
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          benchmark_label: "Global Balanced 60/40",
          benchmark_return_pct: 4.91,
          benchmark_return_source: "calculated",
          benchmark_input_mode: "stateful",
          excess_return_pct: 0.21,
          sparkline_points: null,
        }}
        rebalance={{ status: "READY", last_run_at_utc: null, last_rebalance_run_id: null }}
        reportingRowCount={14}
        context={{
          selectedAsOfDate: "2026-03-28",
          selectedReportingCurrency: "USD",
          timeWindow: "YTD",
          periodLabel: "YTD",
          viewMode: "detailed",
          columnMode: "expanded",
          hideEmptyModules: false,
          focusExceptions: false,
          effectivePeriodStartDate: "2026-01-01",
          effectivePeriodEndDate: "2026-03-28",
          usesCustomDateRange: false,
          hasHistoricalGap: false,
          currencyOptions: ["USD"],
          supportsHistoricalSnapshots: false,
          supportsReportingCurrencyRestatement: false,
        }}
        selectedPeriod="QTD"
        expanded
        onToggle={onToggle}
      />
    );

    expect(screen.getByText("5.12%")).toBeInTheDocument();
    expect(screen.getByText("4.91%")).toBeInTheDocument();
    expect(screen.getByText("0.21%")).toBeInTheDocument();
    expect(screen.getByText("4.88%")).toBeInTheDocument();
    expect(screen.getByText("Global Balanced 60/40")).toBeInTheDocument();
    expect(screen.getByText("Calculated • Stateful benchmark")).toBeInTheDocument();
    expect(screen.getByText("MWR XIRR")).toBeInTheDocument();
    expect(
      screen.getByText("Open Performance workspace for source-backed return path detail.")
    ).toBeInTheDocument();
    expect(screen.getByText("01 Jan 2026 - 28 Mar 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("renders collapsed active-return context when benchmark-relative values are available", () => {
    render(
      <PortfolioPerformanceSnapshotModule
        capability={{ state: "supported" }}
        performance={{
          period: "QTD",
          return_pct: 5.12,
          benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
          benchmark_label: "Global Balanced 60/40",
          benchmark_return_pct: 4.91,
          excess_return_pct: 0.21,
          sparkline_points: null,
        }}
        rebalance={null}
        reportingRowCount={0}
        context={{
          selectedAsOfDate: "2026-03-28",
          selectedReportingCurrency: "USD",
          timeWindow: "QTD",
          periodLabel: "QTD",
          viewMode: "summary",
          columnMode: "essential",
          hideEmptyModules: false,
          focusExceptions: false,
          effectivePeriodStartDate: "2026-01-01",
          effectivePeriodEndDate: "2026-03-28",
          usesCustomDateRange: false,
          hasHistoricalGap: false,
          currencyOptions: ["USD"],
          supportsHistoricalSnapshots: false,
          supportsReportingCurrencyRestatement: false,
        }}
        selectedPeriod="QTD"
        expanded={false}
        onToggle={vi.fn()}
      />
    );

    expect(screen.getByText("5.12%")).toBeInTheDocument();
    expect(
      screen.getByText("Active 0.21% versus Global Balanced 60/40 for QTD")
    ).toBeInTheDocument();
  });
});
