import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceAnalysisControlBar from "../../src/apps/performance/components/performance-analysis-control-bar";
import { buildPerformanceCapabilities } from "../fixtures/performance-workspace-fixtures";

describe("PerformanceAnalysisControlBar", () => {
  it("routes horizon, basis, frequency, benchmark, and chart view changes through the shared handlers", async () => {
    const onRequestChange = vi.fn();
    const onChartViewModeChange = vi.fn();

    render(
      <PerformanceAnalysisControlBar
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        resolvedBenchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
          {
            benchmark_code: "BMK_PRIVATE_BANK",
            benchmark_name: "Private Bank Composite",
            is_assigned: false,
          },
        ]}
        fromDate="2026-01-01"
        toDate="2026-04-14"
        maxEndDate="2026-04-14"
        minEndDate="2026-01-01"
        chartViewMode="absolute"
        hasBenchmarkSeries
        hasActiveSeries
        capabilities={buildPerformanceCapabilities()}
        isUpdating={false}
        onRequestChange={onRequestChange}
        onApplyExplicitDates={(event) => event.preventDefault()}
        onFromDateChange={vi.fn()}
        onToDateChange={vi.fn()}
        onChartViewModeChange={onChartViewModeChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("group", { name: "Analysis control bar" })).not.toHaveAttribute(
        "aria-busy"
      );
    });

    fireEvent.click(screen.getByRole("radio", { name: "QTD" }));
    expect(onRequestChange).toHaveBeenCalledWith({
      period: "QTD",
      reportStartDate: undefined,
      reportEndDate: undefined,
    });

    fireEvent.click(screen.getByRole("radio", { name: "GROSS" }));
    expect(onRequestChange).toHaveBeenCalledWith({
      detailBasis: "GROSS",
    });

    fireEvent.click(screen.getByRole("radio", { name: "Relative" }));
    expect(onChartViewModeChange).toHaveBeenCalledWith("relative");

    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "quarterly" },
    });
    expect(onRequestChange).toHaveBeenCalledWith({
      chartFrequency: "quarterly",
    });

    fireEvent.change(screen.getByLabelText("Benchmark"), {
      target: { value: "BMK_PRIVATE_BANK" },
    });
    expect(onRequestChange).toHaveBeenCalledWith({
      benchmark: "BMK_PRIVATE_BANK",
    });
  });

  it("disables relative mode and unsupported frequencies when the backend capability contract does not allow them", async () => {
    render(
      <PerformanceAnalysisControlBar
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        resolvedBenchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
        fromDate="2026-01-01"
        toDate="2026-04-14"
        chartViewMode="absolute"
        hasBenchmarkSeries
        hasActiveSeries={false}
        capabilities={{
          ...buildPerformanceCapabilities(),
          returnPath: {
            ...buildPerformanceCapabilities().returnPath,
            supportedFrequencies: ["monthly"],
          },
        }}
        isUpdating={false}
        onRequestChange={vi.fn()}
        onApplyExplicitDates={(event) => event.preventDefault()}
        onFromDateChange={vi.fn()}
        onToDateChange={vi.fn()}
        onChartViewModeChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("group", { name: "Analysis control bar" })).not.toHaveAttribute(
        "aria-busy"
      );
    });

    expect(screen.getByRole("radio", { name: "Relative" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    expect(
      screen.getByRole("option", { name: "Quarterly" })
    ).toBeDisabled();
  });

  it("locks every source-changing selection while an analytical refresh is pending", () => {
    render(
      <PerformanceAnalysisControlBar
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        resolvedBenchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
        fromDate="2026-01-01"
        toDate="2026-04-14"
        maxEndDate="2026-04-14"
        minEndDate="2026-01-01"
        chartViewMode="absolute"
        hasBenchmarkSeries
        hasActiveSeries
        capabilities={buildPerformanceCapabilities()}
        isUpdating
        onRequestChange={vi.fn()}
        onApplyExplicitDates={(event) => event.preventDefault()}
        onFromDateChange={vi.fn()}
        onToDateChange={vi.fn()}
        onChartViewModeChange={vi.fn()}
      />
    );

    for (const option of ["YTD", "3Y", "NET", "GROSS"]) {
      expect(screen.getByRole("radio", { name: option })).toHaveAttribute(
        "aria-disabled",
        "true"
      );
    }
    expect(screen.getByLabelText("Frequency")).toBeDisabled();
    expect(screen.getByLabelText("Benchmark")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
  });
});
