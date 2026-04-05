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
          supportsHistoricalSnapshots: true,
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
    expect(screen.getByText(/Reporting currency restatement is pending source support\./i)).toBeInTheDocument();
    expect(screen.getByText(/Period 30D: 01 Mar 2026 to 29 Mar 2026\./i)).toBeInTheDocument();
    expect(document.querySelector(".workbench-segmented-control[aria-label='Portfolio period presets']"))
      .toBeTruthy();
    expect(screen.getByRole("tablist", { name: "Portfolio page view mode" })).toHaveClass(
      "mode-tabs",
      "portfolio-workspace-view-mode-tabs"
    );
    expect(screen.getByRole("tab", { name: "Detailed" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "YTD" }));
    expect(onControlsChange).toHaveBeenCalledWith({ timeWindow: "YTD" });
    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
    expect(onControlsChange).toHaveBeenCalledWith({ viewMode: "summary" });

    fireEvent.click(screen.getByRole("button", { name: /Export portfolio data/i }));
    expect(onExport).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Filters, 2 active/i }));
    const filtersMenu = screen.getByRole("menu");
    fireEvent.click(within(filtersMenu).getByLabelText("Include Cash"));
    expect(onControlsChange).toHaveBeenCalledWith({ includeCash: false });
    fireEvent.click(within(filtersMenu).getByRole("button", { name: /Reset to default/i }));
    expect(onFilterReset).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Columns", hidden: true }));
    const columnsMenu = screen.getByRole("menu");
    fireEvent.click(within(columnsMenu).getByRole("menuitem", { name: "Expanded columns" }));
    expect(onControlsChange).toHaveBeenCalledWith({ columnMode: "expanded" });

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
});
