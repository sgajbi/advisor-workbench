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

const baseCapabilities = buildPerformanceCapabilities();

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
  capabilities: {
    ...baseCapabilities,
    returnPath: {
      ...baseCapabilities.returnPath,
      earliestAvailableDate: "2023-01-01",
      latestAvailableDate: "2026-04-14",
    },
  },
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
    expect(onRequestChange).toHaveBeenLastCalledWith(
      {
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        period: "QTD",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "sector",
        chartFrequency: "monthly",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        reportStartDate: undefined,
        reportEndDate: undefined,
      },
      { kind: "choice", groupLabel: "Horizon", optionLabel: "QTD" },
    );

    fireEvent.click(screen.getByRole("radio", { name: "GROSS" }));
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ detailBasis: "GROSS", period: "YTD" }),
      { kind: "choice", groupLabel: "Basis", optionLabel: "GROSS" },
    );

    fireEvent.change(screen.getByLabelText("Frequency"), {
      target: { value: "quarterly" },
    });
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ chartFrequency: "quarterly", period: "YTD" }),
      { kind: "field", fieldLabel: "Frequency" },
    );

    fireEvent.change(screen.getByLabelText("Benchmark"), {
      target: { value: "BMK_PRIVATE_BANK" },
    });
    expect(onRequestChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ benchmark: "BMK_PRIVATE_BANK", period: "YTD" }),
      { kind: "field", fieldLabel: "Benchmark" },
    );
  });

  it("submits an explicit review window through the same complete request path", async () => {
    const onRequestChange = vi.fn();
    const { rerender } = render(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );

    await screen.findByRole("group", { name: "Performance Analysis source selection" });
    const windowTrigger = screen.getByRole("button", {
      name: "Review window 01 Jan 2026 – 14 Apr 2026",
    });
    expect(windowTrigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(windowTrigger);
    expect(await screen.findByRole("dialog", { name: "Choose a custom review window" })).toBeVisible();
    expect(windowTrigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply window" }));

    expect(onRequestChange).toHaveBeenCalledTimes(1);
    expect(onRequestChange).toHaveBeenLastCalledWith(
      {
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        period: "EXPLICIT",
        detailBasis: "NET",
        contributionDimension: "asset_class",
        attributionDimension: "sector",
        chartFrequency: "monthly",
        benchmark: "BMK_GLOBAL_BALANCED_60_40",
        reportStartDate: "2026-02-01",
        reportEndDate: "2026-03-31",
      },
      { kind: "action", actionLabel: "Apply" },
    );
    expect(windowTrigger).toHaveTextContent("01 Jan 2026 – 14 Apr 2026");
    expect(screen.getByRole("button", { name: "Applying…" })).toBeDisabled();

    rerender(
      <PerformanceSourceSelectionControls
        {...baseProps}
        isUpdating
        onRequestChange={onRequestChange}
      />,
    );
    rerender(
      <PerformanceSourceSelectionControls
        {...baseProps}
        period="EXPLICIT"
        reportStartDate="2026-02-01"
        reportEndDate="2026-03-31"
        onRequestChange={onRequestChange}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Choose a custom review window" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Review window 01 Feb 2026 – 31 Mar 2026" }),
      ).toHaveFocus();
    });
  });

  it("discards dialog drafts on Cancel and Escape without requesting a source refresh", async () => {
    const onRequestChange = vi.fn();
    render(<PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />);

    const windowTrigger = await screen.findByRole("button", {
      name: "Review window 01 Jan 2026 – 14 Apr 2026",
    });
    fireEvent.click(windowTrigger);
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(windowTrigger).toHaveFocus();
    });
    expect(onRequestChange).not.toHaveBeenCalled();

    fireEvent.click(windowTrigger);
    expect(screen.getByLabelText(/^From/)).toHaveValue("2026-01-01");
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-03-31" } });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape", code: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(windowTrigger).toHaveFocus();
    });
    expect(onRequestChange).not.toHaveBeenCalled();
  });

  it("rejects incomplete, out-of-order, and out-of-bounds drafts before transport", async () => {
    const onRequestChange = vi.fn();
    render(<PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />);

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Review window 01 Jan 2026 – 14 Apr 2026",
      }),
    );
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: "2026-04-10" } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply window" }));

    expect(screen.getByText("The first day must be on or before the last day.")).toBeVisible();
    expect(screen.getByText("The last day must be on or after the first day.")).toBeVisible();
    expect(onRequestChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: "2022-12-31" } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-04-15" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply window" }));

    expect(screen.getByText("Performance history begins 01 Jan 2023.")).toBeVisible();
    expect(screen.getByText("Performance history is available through 14 Apr 2026.")).toBeVisible();
    expect(onRequestChange).not.toHaveBeenCalled();
  });

  it("keeps the last confirmed window after a rejected source refresh", async () => {
    const onRequestChange = vi.fn();
    const { rerender } = render(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );
    const windowTrigger = await screen.findByRole("button", {
      name: "Review window 01 Jan 2026 – 14 Apr 2026",
    });
    fireEvent.click(windowTrigger);
    fireEvent.change(screen.getByLabelText(/^From/), { target: { value: "2026-02-01" } });
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-03-31" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply window" }));

    rerender(
      <PerformanceSourceSelectionControls
        {...baseProps}
        isUpdating
        onRequestChange={onRequestChange}
      />,
    );
    rerender(
      <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />,
    );

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(windowTrigger).toHaveTextContent("01 Jan 2026 – 14 Apr 2026");
      expect(windowTrigger).toHaveFocus();
    });
    expect(onRequestChange).toHaveBeenCalledTimes(1);
  });

  it("preserves the source-published date range after confirming a shorter explicit window", async () => {
    const capabilities = buildPerformanceCapabilities();
    const sourceRange = {
      ...capabilities,
      returnPath: {
        ...capabilities.returnPath,
        earliestAvailableDate: "2023-01-01",
        latestAvailableDate: "2026-04-14",
      },
    };
    const { rerender } = render(
      <PerformanceSourceSelectionControls
        {...baseProps}
        capabilities={sourceRange}
        onRequestChange={vi.fn()}
      />,
    );

    const initialTrigger = await screen.findByRole("button", {
      name: "Review window 01 Jan 2026 – 14 Apr 2026",
    });
    fireEvent.click(initialTrigger);
    const fromDate = screen.getByLabelText(/^From/);
    const toDate = screen.getByLabelText(/^To/);
    expect(fromDate).toHaveAttribute("min", "2023-01-01");
    expect(toDate).toHaveAttribute("max", "2026-04-14");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    rerender(
      <PerformanceSourceSelectionControls
        {...baseProps}
        reportStartDate="2026-02-01"
        reportEndDate="2026-03-31"
        capabilities={sourceRange}
        onRequestChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Review window 01 Feb 2026 – 31 Mar 2026" }),
    );
    expect(screen.getByLabelText(/^From/)).toHaveValue("2026-02-01");
    expect(screen.getByLabelText(/^To/)).toHaveValue("2026-03-31");
    expect(screen.getByLabelText(/^To/)).toHaveAttribute("max", "2026-04-14");
    fireEvent.change(screen.getByLabelText(/^To/), { target: { value: "2026-04-10" } });
    expect(screen.getByLabelText(/^To/)).toHaveValue("2026-04-10");
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
    expect(
      screen.getByRole("button", { name: "Review window 01 Jan 2026 – 14 Apr 2026" }),
    ).toBeDisabled();
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
      <>
        <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />
        <button type="button">Continue review</button>
      </>,
    );
    const benchmark = await screen.findByLabelText("Benchmark");
    fireEvent.change(benchmark, { target: { value: "BMK_PRIVATE_BANK" } });

    rerender(
      <>
        <PerformanceSourceSelectionControls
          {...baseProps}
          isUpdating
          onRequestChange={onRequestChange}
        />
        <button type="button">Continue review</button>
      </>,
    );
    const continueReview = screen.getByRole("button", { name: "Continue review" });
    act(() => continueReview.focus());
    rerender(
      <>
        <PerformanceSourceSelectionControls {...baseProps} onRequestChange={onRequestChange} />
        <button type="button">Continue review</button>
      </>,
    );

    await waitFor(() => expect(continueReview).toHaveFocus());
  });
});
