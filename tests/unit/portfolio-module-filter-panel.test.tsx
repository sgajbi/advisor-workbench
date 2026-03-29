import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioModuleFilterPanel from "@/apps/portfolio/components/portfolio-module-filter-panel";

describe("PortfolioModuleFilterPanel", () => {
  it("renders only the requested filters and emits business-friendly control updates", async () => {
    const onControlsChange = vi.fn();
    const onReset = vi.fn();

    render(
      <PortfolioModuleFilterPanel
        controls={{
          asOfDate: "2026-03-29",
          reportingCurrency: "USD",
          includeCash: true,
          viewMode: "summary",
          timeWindow: "30D",
          customStartDate: "",
          customEndDate: "",
          columnMode: "essential",
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
        filterOptions={{
          assetClasses: ["Equity", "Fixed Income"],
          sectors: ["Technology"],
          regions: ["North America"],
          positionStatuses: ["ALL", "OPEN", "CLOSED"],
          transactionTypes: ["BUY", "SELL"],
        }}
        availableFilters={[
          "asOfDate",
          "reportingCurrency",
          "includeCash",
          "assetClass",
          "positionStatus",
          "timeWindow",
          "showOnlyNonZeroRows",
        ]}
        reportingCurrencies={["USD", "EUR"]}
        onControlsChange={onControlsChange}
        onReset={onReset}
      />
    );

    expect(screen.getByText("As of")).toBeInTheDocument();
    expect(screen.getByText("Reporting Currency")).toBeInTheDocument();
    expect(screen.getByText("Asset Class")).toBeInTheDocument();
    expect(screen.queryByText("Sector")).not.toBeInTheDocument();
    expect(screen.queryByText("Region")).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("2026-03-29"), {
      target: { value: "2026-03-28" },
    });
    expect(onControlsChange).toHaveBeenCalledWith({ asOfDate: "2026-03-28" });

    fireEvent.click(screen.getByLabelText("Include Cash"));
    expect(onControlsChange).toHaveBeenCalledWith({ includeCash: false });

    fireEvent.click(screen.getByLabelText("Show only non-zero rows"));
    expect(onControlsChange).toHaveBeenCalledWith({ showOnlyNonZeroRows: true });

    fireEvent.click(screen.getByRole("button", { name: "Reset to default" }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
