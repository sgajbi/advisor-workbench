import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioWorkspaceToolbar from "@/apps/portfolio/components/portfolio-workspace-toolbar";

describe("PortfolioWorkspaceToolbar", () => {
  it("renders context, exposes filter chips, and emits control changes through the active menus", () => {
    const onControlsChange = vi.fn();
    const onFilterReset = vi.fn();
    const onFilterChipRemove = vi.fn();
    const onExport = vi.fn();

    render(
      <PortfolioWorkspaceToolbar
        controls={{
          asOfDate: "2026-03-29",
          reportingCurrency: "USD",
          viewMode: "detailed",
          timeWindow: "30D",
          customStartDate: "2026-03-01",
          customEndDate: "2026-03-29",
          columnMode: "essential",
          includeCash: true,
          assetClass: "ALL",
          sector: "ALL",
          region: "ALL",
          positionStatus: "ALL",
          transactionType: "ALL",
          showOnlyNonZeroRows: true,
          showOnlyExceptions: false,
          hideEmptyModules: false,
          focusExceptions: false,
        }}
        context={{
          selectedAsOfDate: "2026-03-29",
          selectedReportingCurrency: "USD",
          timeWindow: "30D",
          periodLabel: "30D",
          viewMode: "detailed",
          columnMode: "essential",
          hideEmptyModules: false,
          focusExceptions: false,
          effectivePeriodStartDate: "2026-03-01",
          effectivePeriodEndDate: "2026-03-29",
          usesCustomDateRange: false,
          hasHistoricalGap: false,
          currencyOptions: ["USD", "EUR"],
          historicalSnapshotState: "supported",
          historicalSnapshotReason: "Historical snapshots are fully source-backed.",
          supportsHistoricalSnapshots: true,
          reportingCurrencyRestatementState: "partial",
          reportingCurrencyRestatementReason:
            "Book-style holdings honor reporting currency, but performance snapshot does not.",
          supportsReportingCurrencyRestatement: false,
        }}
        filterOptions={{
          assetClasses: ["Equity"],
          sectors: ["Technology"],
          regions: ["North America"],
          positionStatuses: ["ALL", "OPEN"],
          transactionTypes: ["BUY", "SELL"],
        }}
        activeFilterChips={[
          { key: "showOnlyNonZeroRows", label: "Rows", value: "Non-zero only" },
          { key: "timeWindow", label: "Period", value: "30D" },
        ]}
        onControlsChange={onControlsChange}
        onFilterReset={onFilterReset}
        onFilterChipRemove={onFilterChipRemove}
        onExport={onExport}
        quickActions={[
          { key: "review", label: "Review performance", href: "/performance?portfolioId=PORT_1001" },
        ]}
      />
    );

    expect(screen.getByText(/As of 29 Mar 2026\./i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Some workflow views keep book currency until full restatement is available\./i
      )
    ).toBeInTheDocument();
    expect(
      screen
        .getByLabelText("Reporting Currency")
        .closest("div[title='Full currency restatement is not available for every workflow yet.']")
    ).not.toBeNull();
    expect(screen.getByText(/Period 30D\./i)).toBeInTheDocument();
    const contextControls = screen.getByRole("group", { name: "Context controls" });
    const periodControls = screen.getByRole("group", { name: "Period controls" });
    expect(contextControls).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "View controls" })).not.toBeInTheDocument();
    expect(periodControls).toBeInTheDocument();
    expect(within(contextControls).getByText("Context")).toHaveClass("workbench-toolbar-group-title");
    expect(within(periodControls).getAllByText("Period")[0]).toHaveClass("workbench-toolbar-group-title");
    expect(document.querySelector(".workbench-segmented-control[aria-label='Portfolio period presets']"))
      .toBeTruthy();
    expect(
      document.querySelector(
        ".workbench-segmented-control.portfolio-workspace-toolbar-period-control[aria-label='Portfolio period presets']"
      )
    ).toBeTruthy();
    expect(screen.queryByRole("tablist", { name: "Portfolio view navigation" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "YTD" }));
    expect(onControlsChange).toHaveBeenCalledWith({ timeWindow: "YTD" });
    fireEvent.click(screen.getByRole("button", { name: /Export portfolio data/i }));
    expect(onExport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Filters, 2 active/i }));
    const filtersMenu = screen.getByRole("menu");
    fireEvent.click(within(filtersMenu).getByLabelText("Include Cash"));
    expect(onControlsChange).toHaveBeenCalledWith({ includeCash: false });
    fireEvent.click(within(filtersMenu).getByRole("button", { name: /Reset to default/i }));
    expect(onFilterReset).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "More actions", hidden: true }));
    const actionsMenu = screen.getByRole("menu");
    expect(within(actionsMenu).getByRole("link", { name: "Review performance" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_1001"
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByText("Rows: Non-zero only")).toBeInTheDocument();
    expect(screen.getByText("Period: 30D")).toBeInTheDocument();
  });

  it("renders gateway historical and reporting capability reasons when controls are not fully supported", () => {
    render(
      <PortfolioWorkspaceToolbar
        controls={{
          asOfDate: "2026-03-29",
          reportingCurrency: "USD",
          viewMode: "summary",
          timeWindow: "30D",
          customStartDate: "",
          customEndDate: "",
          columnMode: "essential",
          includeCash: true,
          assetClass: "ALL",
          sector: "ALL",
          region: "ALL",
          positionStatus: "ALL",
          transactionType: "ALL",
          showOnlyNonZeroRows: false,
          showOnlyExceptions: false,
          hideEmptyModules: false,
          focusExceptions: false,
        }}
        context={{
          selectedAsOfDate: "2026-03-29",
          selectedReportingCurrency: "USD",
          timeWindow: "30D",
          periodLabel: "30D",
          viewMode: "summary",
          columnMode: "essential",
          hideEmptyModules: false,
          focusExceptions: false,
          effectivePeriodStartDate: "2026-03-01",
          effectivePeriodEndDate: "2026-03-29",
          usesCustomDateRange: false,
          hasHistoricalGap: false,
          currencyOptions: ["USD"],
          historicalSnapshotState: "partial",
          historicalSnapshotReason:
            "Most portfolio modules honor as_of_date, but rebalance and performance snapshot still follow separate control semantics.",
          supportsHistoricalSnapshots: false,
          reportingCurrencyRestatementState: "unsupported",
          reportingCurrencyRestatementReason:
            "Workflow, readiness, and performance snapshot do not yet share reporting currency.",
          supportsReportingCurrencyRestatement: false,
        }}
        filterOptions={{
          assetClasses: [],
          sectors: [],
          regions: [],
          positionStatuses: [],
          transactionTypes: [],
        }}
        activeFilterChips={[]}
        onControlsChange={vi.fn()}
        onFilterReset={vi.fn()}
        onFilterChipRemove={vi.fn()}
        onExport={vi.fn()}
        quickActions={[]}
      />
    );

    expect(
      screen.getByText(
        /Some adjacent workflows keep their own date controls\./i
      )
    ).toBeInTheDocument();
    expect(
      screen
        .getByLabelText("As of")
        .closest(
          "div[title='Historical review is not available for every adjacent workflow yet.']"
        )
    ).not.toBeNull();
    expect(
      screen.getByText(
        /Some workflow views keep book currency until full restatement is available\./i
      )
    ).toBeInTheDocument();
    expect(
      screen
        .getByLabelText("Reporting Currency")
        .closest(
          "div[title='Full currency restatement is not available for every workflow yet.']"
        )
    ).not.toBeNull();
  });
});
