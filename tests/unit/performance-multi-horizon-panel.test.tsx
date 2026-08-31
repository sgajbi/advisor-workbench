import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PerformanceMultiHorizonPanel from "../../src/apps/performance/components/performance-multi-horizon-panel";
import type { WorkbenchPerformanceHorizonComparison } from "../../src/features/workbench/types";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";
import { buildPerformanceHorizonComparison } from "../fixtures/performance-workspace-fixtures";

const getHorizonComparisonClientMock = vi.fn();

vi.mock("../../src/features/workbench/api", () => ({
  getWorkbenchPerformanceHorizonComparisonClient: (...args: unknown[]) =>
    getHorizonComparisonClientMock(...args),
}));

function buildHorizonComparison(
  overrides: Partial<WorkbenchPerformanceHorizonComparison> = {}
): WorkbenchPerformanceHorizonComparison {
  return {
    ...buildPerformanceHorizonComparison(),
    ...overrides,
  } as WorkbenchPerformanceHorizonComparison;
}

describe("PerformanceMultiHorizonPanel", () => {
  afterEach(() => {
    getHorizonComparisonClientMock.mockReset();
  });

  it("loads standard horizons from the dedicated horizon comparison contract", async () => {
    getHorizonComparisonClientMock.mockImplementation(
      async (
        _portfolioId: string,
        params: {
          period: string;
          detailBasis: string;
          benchmark?: string;
          reportStartDate?: string;
          reportEndDate?: string;
        },
      ) =>
        buildHorizonComparison({
          period: params.period,
          detail_basis: params.detailBasis,
          benchmark_code: params.benchmark ?? "BMK_GLOBAL_BALANCED_60_40",
          report_start_date: params.reportStartDate ?? "2026-01-01",
          report_end_date: params.reportEndDate ?? "2026-02-24",
        })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
        benchmarkOptions={[
          {
            benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
            benchmark_name: "Global Balanced 60/40",
            is_assigned: true,
          },
        ]}
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading horizon comparison");
    expect(screen.getByRole("status")).toHaveTextContent("Loading horizon comparison.");

    await waitFor(() => {
      expect(screen.getByText("Horizon Comparison")).toBeInTheDocument();
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    });

    expect(document.querySelector(".performance-summary-driver-module.workbench-chart-shell")).toBeTruthy();
    expect(document.querySelector("[data-performance-horizon-review-bar='true']")).toBeTruthy();
    expect(screen.queryByText("Portfolio vs Global Balanced 60/40")).not.toBeInTheDocument();
    expect(screen.queryByText("NET")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Horizon comparison context" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Horizon comparison display context")).toHaveTextContent(
      "Uses analysis selectionNet basis · Absolute return view",
    );
    expect(
      document.querySelector("[data-performance-comparison-display='inherited']"),
    ).toBeTruthy();
    expect(document.querySelector("[data-performance-horizon-panel-body='true']")).toBeTruthy();
    expect(document.querySelectorAll(".performance-horizon-matrix-row")).toHaveLength(4);
    expect(document.querySelector(".performance-horizon-bar-support-grid")).toBeFalsy();
    expect(screen.getByText("Detailed table")).toBeInTheDocument();
    expect(
      screen.queryByText("Open the full economics and return breakdown. Scroll horizontally for wide columns.")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Horizon table view" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Horizon basis view" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Horizon visual mode" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Portfolio").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Benchmark").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("Detailed table"));
    const horizonTable = screen.getByLabelText("Multi-horizon return table");
    expect(screen.getByRole("region", { name: "Scrollable horizon comparison table" })).toBeInTheDocument();
    expect(
      horizonTable.closest(".performance-horizon-table.analytics-table-variant-observation")
    ).toBeTruthy();
    expect(within(horizonTable).getByText("Opening market value")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Opening cash flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Closing cash flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Flow-adjusted market value")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Net cash flow")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Gross TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Fee drag")).not.toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative net TWR")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative gross TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative benchmark TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative active return")).toBeInTheDocument();
    expect(within(horizonTable).getAllByText("$450,000")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$26,000")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("-$3,500")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$486,370")).toHaveLength(2);
    expect(within(horizonTable).getAllByText("$22,500")).toHaveLength(2);
    expect(within(horizonTable).queryByText("5.88%")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("0.46%")).not.toBeInTheDocument();
    expect(screen.getAllByText("MTD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("QTD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("YTD").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("1Y").length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByText("Adjust comparison display"));
    fireEvent.change(screen.getByLabelText("Evidence columns"), {
      target: { value: "returns" },
    });
    expect(screen.getByLabelText("Horizon comparison display context")).toHaveTextContent(
      "Comparison display overrideNet basis · Absolute return view · Returns only",
    );
    expect(
      document.querySelector("[data-performance-comparison-display='override']"),
    ).toBeTruthy();
    expect(within(horizonTable).queryByText("Opening market value")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Opening cash flow")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Closing cash flow")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Flow-adjusted market value")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Net cash flow")).not.toBeInTheDocument();
    expect(within(horizonTable).getByText("Benchmark TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative net TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative benchmark TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Annualised net TWR")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Evidence columns"), {
      target: { value: "economics" },
    });
    expect(within(horizonTable).getByText("Opening market value")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Opening cash flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Closing cash flow")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Flow-adjusted market value")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Net cash flow")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Benchmark TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative active return")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Return comparison"), {
      target: { value: "relative" },
    });
    expect(screen.getAllByText("Active").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cumulative").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("MTD Active")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Cumulative")).toBeInTheDocument();
    expect(screen.queryByText("Support")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Evidence columns"), {
      target: { value: "combined" },
    });
    expect(within(horizonTable).getByText("Net TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative net TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Annualised net TWR")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Gross TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative gross TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Fee drag")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Basis comparison"), {
      target: { value: "both" },
    });
    expect(screen.getByLabelText("Horizon comparison display context")).toHaveTextContent(
      "Comparison display overrideNet and gross basis · Relative return view",
    );
    expect(within(horizonTable).getByText("Gross TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Fee drag")).toBeInTheDocument();
    expect(within(horizonTable).getAllByText("5.88%").length).toBeGreaterThan(0);
    expect(within(horizonTable).getAllByText("0.46%").length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText("Return comparison"), {
      target: { value: "basis" },
    });
    expect(screen.getAllByText("Net").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Gross").length).toBeGreaterThan(0);
    expect(screen.getByText("Support")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Net")).toBeInTheDocument();
    expect(screen.getByLabelText("MTD Gross")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Basis comparison"), {
      target: { value: "gross" },
    });
    expect(within(horizonTable).getByText("Gross TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Cumulative gross TWR")).toBeInTheDocument();
    expect(within(horizonTable).getByText("Annualised gross TWR")).toBeInTheDocument();
    expect(within(horizonTable).queryByText("Net TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Cumulative net TWR")).not.toBeInTheDocument();
    expect(within(horizonTable).queryByText("Fee drag")).not.toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);
    expect(getHorizonComparisonClientMock).toHaveBeenCalledWith("PF_1001", {
      period: "YTD",
      detailBasis: "NET",
      benchmark: "BMK_GLOBAL_BALANCED_60_40",
      chartFrequency: "monthly",
      reportStartDate: "2026-01-01",
      reportEndDate: "2026-03-27",
    });
  });

  it("withholds horizon economics when the source does not confirm review context", async () => {
    getHorizonComparisonClientMock
      .mockResolvedValueOnce(
        buildHorizonComparison({
          as_of_date: "2026-03-27",
          reporting_currency: "USD",
        }),
      )
      .mockResolvedValueOnce(
        buildHorizonComparison({
          period: "3M",
          as_of_date: "2026-03-27",
          reporting_currency: "SGD",
        }),
      )
      .mockResolvedValueOnce(
        buildHorizonComparison({
          as_of_date: "2026-03-27",
          reporting_currency: "SGD",
        }),
      );

    const view = render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        asOfDate="2026-03-27"
        reportingCurrency="SGD"
      />
    );

    expect(
      await screen.findByText("Horizon comparison not available for this review")
    ).toBeInTheDocument();
    expect(screen.getByText(/No base-currency figures have been mixed/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Multi-horizon returns")).not.toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledWith(
      "PF_1001",
      expect.objectContaining({ asOfDate: "2026-03-27", reportingCurrency: "SGD" })
    );

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="3M"
        detailBasis="NET"
        chartFrequency="monthly"
        asOfDate="2026-03-27"
        reportingCurrency="SGD"
      />,
    );
    expect(await screen.findByLabelText("Multi-horizon returns")).toBeInTheDocument();

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        asOfDate="2026-03-27"
        reportingCurrency="SGD"
      />,
    );
    await waitFor(() => expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(3));
    expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
  });

  it("withholds a horizon response that does not confirm the explicit review window", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        period: "EXPLICIT",
        report_start_date: "2026-01-01",
        report_end_date: "2026-03-28",
      }),
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="EXPLICIT"
        detailBasis="NET"
        chartFrequency="monthly"
        reportStartDate="2026-01-01"
        reportEndDate="2026-03-27"
      />,
    );

    expect(
      await screen.findByText("Horizon comparison not available for this review"),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Multi-horizon returns")).not.toBeInTheDocument();
  });

  it("inherits page basis and return view and clears local overrides when that source context changes", async () => {
    getHorizonComparisonClientMock.mockImplementation(
      async (_portfolioId: string, params: { period: string; detailBasis: string }) =>
        buildHorizonComparison({
          period: params.period,
          detail_basis: params.detailBasis,
        }),
    );

    const view = render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        returnView="combined"
      />,
    );

    await screen.findByLabelText("Multi-horizon returns");
    expect(screen.getByLabelText("Horizon comparison display context")).toHaveTextContent(
      "Horizon view adjusted to available evidenceNet basis · Absolute return view",
    );
    expect(
      document.querySelector("[data-performance-comparison-display='adjusted']"),
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Adjust comparison display"));
    fireEvent.change(screen.getByLabelText("Evidence columns"), {
      target: { value: "returns" },
    });
    fireEvent.change(screen.getByLabelText("Basis comparison"), {
      target: { value: "both" },
    });
    fireEvent.change(screen.getByLabelText("Return comparison"), {
      target: { value: "basis" },
    });
    expect(
      document.querySelector("[data-performance-comparison-display='override']"),
    ).toBeTruthy();

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="1Y"
        detailBasis="NET"
        chartFrequency="monthly"
        returnView="combined"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Basis comparison")).toHaveValue("inherit");
      expect(screen.getByLabelText("Return comparison")).toHaveValue("inherit");
      expect(screen.getByLabelText("Evidence columns")).toHaveValue("combined");
    });
    fireEvent.change(screen.getByLabelText("Evidence columns"), {
      target: { value: "returns" },
    });
    fireEvent.change(screen.getByLabelText("Basis comparison"), {
      target: { value: "both" },
    });
    fireEvent.change(screen.getByLabelText("Return comparison"), {
      target: { value: "basis" },
    });

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="1Y"
        detailBasis="GROSS"
        chartFrequency="monthly"
        returnView="relative"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Basis comparison")).toHaveValue("inherit");
      expect(screen.getByLabelText("Return comparison")).toHaveValue("inherit");
      expect(screen.getByLabelText("Evidence columns")).toHaveValue("combined");
      expect(screen.getByLabelText("Horizon comparison display context")).toHaveTextContent(
        "Uses analysis selectionGross basis · Relative return view",
      );
    });
    expect(
      document.querySelector("[data-performance-comparison-display='inherited']"),
    ).toBeTruthy();
    fireEvent.click(screen.getByText("Detailed table"));
    const table = screen.getByLabelText("Multi-horizon return table");
    expect(within(table).getByText("Gross TWR")).toBeInTheDocument();
    expect(within(table).queryByText("Net TWR")).not.toBeInTheDocument();
    expect(screen.getByLabelText("MTD Active")).toBeInTheDocument();

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
        returnView="absolute"
      />,
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Basis comparison")).toHaveValue("inherit");
      expect(screen.getByLabelText("Return comparison")).toHaveValue("inherit");
      expect(screen.getByLabelText("Evidence columns")).toHaveValue("combined");
      expect(screen.getByLabelText("Horizon comparison display context")).toHaveTextContent(
        "Uses analysis selectionNet basis · Absolute return view",
      );
    });
    const resetTable = screen.getByLabelText("Multi-horizon return table");
    expect(within(resetTable).getByText("Net TWR")).toBeInTheDocument();
    expect(within(resetTable).queryByText("Gross TWR")).not.toBeInTheDocument();
  });

  it("reuses cached horizon data when rerendered with the same analytical inputs", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        detail_basis: "NET",
        benchmark_code: "BMK_GLOBAL_BALANCED_60_40",
        benchmark_options: [],
        rows: [
          {
            period: "YTD",
            portfolio_return_pct: 5.4,
            benchmark_return_pct: 4.9,
            active_return_pct: 0.5,
            annualized_return_pct: 5.4,
          },
          {
            period: "1Y",
            portfolio_return_pct: 6.4,
            benchmark_return_pct: 5.9,
            active_return_pct: 0.5,
            annualized_return_pct: 6.4,
          },
        ],
      })
    );

    const view = render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    });
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    expect(screen.getByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(1);
  });

  it("keeps benchmark context honest when the selected-period active return is unavailable", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        detail_basis: "NET",
        benchmark_code: null,
        benchmark_options: [],
        rows: [
          {
            period: "YTD",
            portfolio_return_pct: 5.4,
            benchmark_return_pct: null,
            active_return_pct: null,
            annualized_return_pct: 5.4,
          },
        ],
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        chartFrequency="monthly"
      />
    );

    expect(await screen.findByText("One published horizon")).toBeInTheDocument();
    expect(screen.getByText(/A comparison requires at least two published horizons/)).toBeInTheDocument();
    expect(screen.getByText("Return evidence")).toBeInTheDocument();
    expect(screen.queryByLabelText("Multi-horizon returns")).not.toBeInTheDocument();
    expect(screen.queryByRole("radiogroup", { name: "Horizon visual mode" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Horizon comparison context" })).not.toBeInTheDocument();
  });

  it("shows a normalization notice when the horizon endpoint adjusts an unsupported frequency", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        chart_frequency: "monthly",
        requested_chart_frequency_supported: false,
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="weekly"
      />
    );

    const notice = await screen.findByRole("status", {
      name: "Horizon comparison normalization",
    });
    expect(notice).toHaveTextContent("Selection adjusted");
    expect(notice).toHaveTextContent("Unsupported frequency was replaced with Monthly.");
  });

  it("renders a designed unavailable state when no horizon rows are exposed", async () => {
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        rows: [],
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    expect(await screen.findByText("No published horizon comparison")).toBeInTheDocument();
    expect(screen.getByText(/source returned no horizon observations/)).toBeInTheDocument();
    expect(screen.queryByText("Still available")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs source support")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Multi-horizon return table")).not.toBeInTheDocument();
  });

  it("keeps request failure distinct from source-confirmed absence and retries the exact selection", async () => {
    getHorizonComparisonClientMock
      .mockRejectedValueOnce(new WorkbenchApiError("performance horizon comparison", 503))
      .mockResolvedValueOnce(buildHorizonComparison());

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("Horizon comparison could not be refreshed");
    expect(failure).toHaveTextContent("Source response 503");
    expect(screen.queryByText("No published horizon comparison")).not.toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Refresh comparison" });
    refresh.focus();
    fireEvent.click(refresh);

    expect(screen.getByRole("button", { name: "Refreshing…" })).toBeDisabled();
    expect(await screen.findByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh comparison" })).toHaveFocus();
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(2);
    expect(getHorizonComparisonClientMock.mock.calls[1]).toEqual(
      getHorizonComparisonClientMock.mock.calls[0],
    );
  });

  it("fails permission blocks closed without exposing a retry", async () => {
    getHorizonComparisonClientMock.mockRejectedValue(
      new WorkbenchApiError("performance horizon comparison", 403),
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />
    );

    const failure = await screen.findByRole("alert");
    expect(failure).toHaveTextContent("Horizon comparison restricted");
    expect(failure).toHaveTextContent("Source response 403");
    expect(screen.getByRole("button", { name: "Comparison restricted" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Refresh comparison" })).not.toBeInTheDocument();
  });

  it("does not move retry focus back after the advisor continues elsewhere", async () => {
    let resolveRetry: ((value: WorkbenchPerformanceHorizonComparison) => void) | undefined;
    getHorizonComparisonClientMock
      .mockRejectedValueOnce(new WorkbenchApiError("performance horizon comparison", 503))
      .mockImplementationOnce(
        () => new Promise<WorkbenchPerformanceHorizonComparison>((resolve) => {
          resolveRetry = resolve;
        }),
      );

    render(
      <>
        <PerformanceMultiHorizonPanel
          portfolioId="PF_1001"
          period="YTD"
          detailBasis="NET"
          benchmark="BMK_GLOBAL_BALANCED_60_40"
          chartFrequency="monthly"
        />
        <button type="button">Continue review</button>
      </>,
    );

    const refresh = await screen.findByRole("button", { name: "Refresh comparison" });
    refresh.focus();
    fireEvent.click(refresh);
    const continueReview = screen.getByRole("button", { name: "Continue review" });
    continueReview.focus();
    await act(async () => {
      resolveRetry?.(buildHorizonComparison());
      await Promise.resolve();
    });

    expect(await screen.findByLabelText("Multi-horizon returns")).toBeInTheDocument();
    expect(continueReview).toHaveFocus();
  });

  it("does not let an obsolete horizon request replace a newer selection", async () => {
    let resolveObsolete: ((value: WorkbenchPerformanceHorizonComparison) => void) | undefined;
    getHorizonComparisonClientMock
      .mockImplementationOnce(
        () => new Promise<WorkbenchPerformanceHorizonComparison>((resolve) => {
          resolveObsolete = resolve;
        }),
      )
      .mockResolvedValueOnce(
        buildHorizonComparison({
          period: "3M",
          rows: [
            {
              period: "3M",
              portfolio_return_pct: 2.1,
              benchmark_return_pct: 1.9,
              active_return_pct: 0.2,
              annualized_return_pct: 8.4,
            },
          ],
        }),
      );

    const view = render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />,
    );
    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="3M"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />,
    );

    expect(await screen.findByText(/3M is available as exact return evidence/)).toBeInTheDocument();
    await act(async () => {
      resolveObsolete?.(buildHorizonComparison());
      await Promise.resolve();
    });
    expect(screen.getByText(/3M is available as exact return evidence/)).toBeInTheDocument();
    expect(screen.queryByText(/YTD is available as exact return evidence/)).not.toBeInTheDocument();
  });

  it("revokes cached horizon evidence after a later permission denial", async () => {
    getHorizonComparisonClientMock
      .mockResolvedValueOnce(buildHorizonComparison())
      .mockRejectedValueOnce(new WorkbenchApiError("performance horizon comparison", 403))
      .mockResolvedValueOnce(buildHorizonComparison({ period: "3M" }))
      .mockRejectedValueOnce(new WorkbenchApiError("performance horizon comparison", 403));

    const view = render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />,
    );
    await screen.findByLabelText("Multi-horizon returns");
    fireEvent.click(screen.getByRole("button", { name: "Refresh comparison" }));
    await screen.findByText("Horizon comparison restricted");

    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="3M"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />,
    );
    await screen.findByLabelText("Multi-horizon returns");
    view.rerender(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="monthly"
      />,
    );

    await screen.findByText("Horizon comparison restricted");
    expect(getHorizonComparisonClientMock).toHaveBeenCalledTimes(4);
  });

  it("pushes the resolved horizon frequency back through the shared request handler", async () => {
    const onRequestChange = vi.fn();
    getHorizonComparisonClientMock.mockResolvedValue(
      buildHorizonComparison({
        chart_frequency: "monthly",
        requested_chart_frequency_supported: false,
      })
    );

    render(
      <PerformanceMultiHorizonPanel
        portfolioId="PF_1001"
        period="YTD"
        detailBasis="NET"
        benchmark="BMK_GLOBAL_BALANCED_60_40"
        chartFrequency="weekly"
        onRequestChange={onRequestChange}
      />
    );

    await waitFor(() => {
      expect(onRequestChange).toHaveBeenCalledWith({ chartFrequency: "monthly" });
    });
  });
});
