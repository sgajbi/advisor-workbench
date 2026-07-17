import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioSummaryHeaderSection from "../../src/apps/portfolio/components/portfolio-summary-header-section";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioSummaryHeaderSection", () => {
  it("renders portfolio identity, governed context, and published KPI figures", () => {
    render(
      <PortfolioSummaryHeaderSection
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext()}
        onOpenMetricDrawer={vi.fn()}
      />
    );

    expect(screen.getByText("Selected portfolio")).toBeInTheDocument();
    expect(screen.queryByText("Portfolio book PB_SG_GLOBAL_BAL_001")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Global Balanced Mandate" })).toBeInTheDocument();
    expect(screen.getByText("CIF_SG_000184")).toBeInTheDocument();
    expect(screen.getByText("Singapore")).toBeInTheDocument();
    expect(screen.getAllByText("As of 12 May 2026")).toHaveLength(2);
    expect(screen.getByText("1,000,000 USD")).toBeInTheDocument();
    expect(screen.getByText("920,000 USD")).toBeInTheDocument();
    expect(screen.getByText("80,000 USD")).toBeInTheDocument();
    expect(screen.getByText("0.40%")).toBeInTheDocument();
    expect(screen.getByText("0.90%")).toBeInTheDocument();
    expect(screen.getByText("1.20%")).toBeInTheDocument();
  });

  it("opens metric drawers only for supported KPI tiles", () => {
    const onOpenMetricDrawer = vi.fn();
    render(
      <PortfolioSummaryHeaderSection
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext()}
        onOpenMetricDrawer={onOpenMetricDrawer}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /AUM:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Invested Assets:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cash:/ }));

    expect(onOpenMetricDrawer).toHaveBeenNthCalledWith(1, "aum");
    expect(onOpenMetricDrawer).toHaveBeenNthCalledWith(2, "invested_assets");
    expect(onOpenMetricDrawer).toHaveBeenNthCalledWith(3, "available_cash");
    expect(screen.queryByRole("button", { name: /Cash Accounts:/ })).not.toBeInTheDocument();
  });
});
