import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceRail from "@/apps/performance/components/performance-rail";

describe("PerformanceRail", () => {
  it("renders mandate navigation with the active mandate highlighted", () => {
    render(
      <PerformanceRail
        portfolios={[
          { id: "PORT_1001", label: "Balanced USD" },
          { id: "PORT_2001", label: "Income CHF" },
        ]}
        selectedPortfolioId="PORT_2001"
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="currency"
        chartFrequency="monthly"
        benchmark="BMK_60_40"
      />
    );

    expect(screen.getByText("Performance")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mandates" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Balanced USD/i })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_1001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=currency&chartFrequency=monthly&benchmark=BMK_60_40"
    );
    expect(screen.getByRole("link", { name: /Income CHF/i })).toHaveClass("portfolio-rail-item-active");
  });
});
