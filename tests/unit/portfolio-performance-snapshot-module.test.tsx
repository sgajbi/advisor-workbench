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

  it("renders expanded future-ready metrics when performance data exists", () => {
    const onToggle = vi.fn();

    render(
      <PortfolioPerformanceSnapshotModule
        capability={{ state: "supported" }}
        performance={{
          period: "YTD",
          return_pct: 5.12,
          benchmark_return_pct: 4.91,
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
        selectedPeriod="YTD"
        expanded
        onToggle={onToggle}
      />
    );

    expect(screen.getByText("5.12%")).toBeInTheDocument();
    expect(screen.getByText("4.91%")).toBeInTheDocument();
    expect(screen.getByText("0.21%")).toBeInTheDocument();
    expect(screen.getByText("Pending source-backed series")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(onToggle).toHaveBeenCalled();
  });
});
