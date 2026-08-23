import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioSummaryHeaderSection from "../../src/apps/portfolio/components/portfolio-summary-header-section";
import {
  buildPortfolioWorkspace,
} from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioSummaryHeaderSection", () => {
  it("renders published KPI figures without repeating shell-owned identity", () => {
    render(
      <PortfolioSummaryHeaderSection
        workspace={buildPortfolioWorkspace()}
        onOpenMetricDrawer={vi.fn()}
      />
    );

    expect(screen.queryByText("Selected portfolio")).not.toBeInTheDocument();
    expect(screen.queryByText("Global Balanced Mandate")).not.toBeInTheDocument();
    expect(screen.queryByText("CIF_SG_000184")).not.toBeInTheDocument();
    expect(screen.queryByText("Singapore")).not.toBeInTheDocument();
    expect(screen.queryByText("Valuation as of 12 May 2026")).not.toBeInTheDocument();
    expect(screen.getByText("1,000,000 USD")).toBeInTheDocument();
    expect(screen.getByText("920,000 USD")).toBeInTheDocument();
    expect(screen.getByText("80,000 USD")).toBeInTheDocument();
    expect(screen.getByText("0.40%")).toBeInTheDocument();
    expect(screen.getByText("0.90%")).toBeInTheDocument();
    expect(screen.getByText("1.20%")).toBeInTheDocument();
  });

  it("keeps source valuation dates out of the shell-owned KPI context", () => {
    render(
      <PortfolioSummaryHeaderSection
        workspace={buildPortfolioWorkspace({ as_of_date: "2026-05-12" })}
        onOpenMetricDrawer={vi.fn()}
      />
    );

    expect(screen.queryByText("Valuation as of 12 May 2026")).not.toBeInTheDocument();
    expect(screen.queryByText("Valuation as of 30 Apr 2026")).not.toBeInTheDocument();
  });

  it("opens metric drawers only for supported KPI tiles", () => {
    const onOpenMetricDrawer = vi.fn();
    render(
      <PortfolioSummaryHeaderSection
        workspace={buildPortfolioWorkspace()}
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
