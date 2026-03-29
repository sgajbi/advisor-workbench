import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PerformanceControlStrip from "@/apps/performance/components/performance-control-strip";

describe("PerformanceControlStrip", () => {
  it("renders horizon and basis links using the selected performance query state", () => {
    render(
      <PerformanceControlStrip
        selectedPortfolioId="PORT_1001"
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="sector"
        chartFrequency="monthly"
        benchmark="BMK_60_40"
      />
    );

    expect(screen.getByText("Horizon")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "MTD" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_1001&period=MTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=sector&chartFrequency=monthly&benchmark=BMK_60_40"
    );
    expect(screen.getByRole("link", { name: "YTD" })).toHaveClass("performance-control-option-active");
    expect(screen.getByRole("link", { name: "NET" })).toHaveClass("performance-control-option-active");
    expect(screen.getByRole("link", { name: "GROSS" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PORT_1001&period=YTD&detailBasis=GROSS&contributionDimension=asset_class&attributionDimension=sector&chartFrequency=monthly&benchmark=BMK_60_40"
    );
  });

  it("renders nothing when no mandate is selected", () => {
    const { container } = render(
      <PerformanceControlStrip
        selectedPortfolioId={null}
        period="YTD"
        detailBasis="NET"
        contributionDimension="asset_class"
        attributionDimension="sector"
        chartFrequency="monthly"
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
