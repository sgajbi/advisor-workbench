import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PerformanceSourceSelectionControls from "../../src/apps/performance/components/performance-source-selection-controls";
import { buildPerformanceCapabilities } from "../fixtures/performance-workspace-fixtures";

const benchmarkOptions = [
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
];

const baseProps = {
  portfolioId: "PB_SG_GLOBAL_BAL_001",
  period: "YTD",
  detailBasis: "NET",
  contributionDimension: "asset_class",
  attributionDimension: "sector",
  chartFrequency: "monthly",
  benchmark: "BMK_GLOBAL_BALANCED_60_40",
  benchmarkOptions,
  reportStartDate: "2026-01-01",
  reportEndDate: "2026-04-14",
  capabilities: buildPerformanceCapabilities(),
  isUpdating: false,
  ariaLabel: "Performance Analysis source selection",
};

describe("PerformanceSourceSelectionControls", () => {
  it("routes every source selection through one complete request-shaping path", async () => {
    const onRequestChange = vi.fn();
    render(<PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />);

    await waitFor(() => {
      expect(
        screen.getByRole("group", { name: "Performance Analysis source selection" }),
      ).not.toHaveAttribute("aria-busy");
    });

    fireEvent.click(screen.getByRole("radio", { name: "QTD" }));
    expect(onRequestChange).toHaveBeenLastCalledWith({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      period: "QTD",
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "sector",
      chartFrequency: "monthly",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: undefined,
      reportEndDate: undefined,
    });

    fireEvent.click(screen.getByRole("radio", { name: "GROSS" }));
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ detailBasis: "GROSS", period: "YTD" }),
    );

    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "quarterly" },
    });
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ chartFrequency: "quarterly", period: "YTD" }),
    );

    fireEvent.change(screen.getByLabelText("Benchmark"), {
      target: { value: "BMK_PRIVATE_BANK" },
    });
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ benchmark: "BMK_PRIVATE_BANK", period: "YTD" }),
    );
  });

  it("submits an explicit review window through the same complete request path", async () => {
    const onRequestChange = vi.fn();
    render(<PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />);

    await screen.findByRole("group", { name: "Performance Analysis source selection" });
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onRequestChange).toHaveBeenCalledWith({
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      period: "EXPLICIT",
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "sector",
      chartFrequency: "monthly",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      reportStartDate: "2026-02-01",
      reportEndDate: "2026-03-31",
    });
  });

  it("disables unsupported frequencies from the source capability contract", async () => {
    render(
      <PerformanceSourceSelectionControls
        {...baseProps}
        capabilities={{
          ...buildPerformanceCapabilities(),
          returnPath: {
            ...buildPerformanceCapabilities().returnPath,
            supportedFrequencies: ["monthly"],
          },
        }}
        onRequestChange={vi.fn()}
      />,
    );

    await screen.findByRole("group", { name: "Performance Analysis source selection" });
    expect(screen.getByRole("option", { name: "Quarterly" })).toBeDisabled();
  });

  it("locks every source-changing control while source confirmation is pending", async () => {
    render(
      <PerformanceSourceSelectionControls
        {...baseProps}
        isUpdating
        onRequestChange={vi.fn()}
      />,
    );

    await screen.findByRole("group", { name: "Performance Analysis source selection" });
    for (const option of ["YTD", "3Y", "NET", "GROSS"]) {
      expect(screen.getByRole("radio", { name: option })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
    expect(screen.getByLabelText("Frequency")).toBeDisabled();
    expect(screen.getByLabelText("Benchmark")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Updating..." })).toBeDisabled();
  });

  it("restores source-select focus after confirmation when the user has not moved", async () => {
    const onRequestChange = vi.fn();
    const { rerender } = render(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );
    const benchmark = await screen.findByLabelText("Benchmark");
    act(() => benchmark.focus());
    fireEvent.change(benchmark, { target: { value: "BMK_PRIVATE_BANK" } });

    rerender(
      <PerformanceSourceSelectionControls
        {...baseProps}
        isUpdating
        onRequestChange={onRequestChange}
      />,
    );
    act(() => benchmark.blur());
    rerender(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );

    await waitFor(() => expect(benchmark).toHaveFocus());
  });

  it("does not steal focus when the user moves during source confirmation", async () => {
    const onRequestChange = vi.fn();
    const { rerender } = render(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );
    const benchmark = await screen.findByLabelText("Benchmark");
    fireEvent.change(benchmark, { target: { value: "BMK_PRIVATE_BANK" } });

    rerender(
      <PerformanceSourceSelectionControls
        {...baseProps}
        isUpdating
        onRequestChange={onRequestChange}
      />,
    );
    const fromDate = screen.getByLabelText("From");
    act(() => fromDate.focus());
    rerender(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );

    await waitFor(() => expect(fromDate).toHaveFocus());
  });
});
