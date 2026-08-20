import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import RiskExecutiveOverview from "../../src/apps/performance/components/risk/risk-executive-overview";

describe("RiskExecutiveOverview", () => {
  it("renders exact source evidence and interpretation context through the shared metric layout", () => {
    const { container } = render(
      <RiskExecutiveOverview
        overview={[
          {
            key: "realized_volatility",
            label: "Realized volatility",
            value: "7.25%",
            support: "YTD annualized source measure",
            tone: "default",
          },
          {
            key: "max_drawdown",
            label: "Max drawdown",
            value: "-12.45%",
            support: "Still below the prior peak at period end",
            tone: "default",
          },
          {
            key: "largest_position",
            label: "Largest position",
            value: "18.40%",
            support: "PIMCO GIS Income Fund",
            tone: "default",
          },
          {
            key: "source_coverage",
            label: "Source coverage",
            value: "Partial",
            support: "Issuer coverage requires qualification",
            tone: "warn",
          },
        ]}
      />
    );

    const overview = screen.getByLabelText("Risk executive overview");
    expect(within(overview).getByText("Realized volatility")).toBeInTheDocument();
    expect(within(overview).getByText("7.25%")).toBeInTheDocument();
    expect(within(overview).getByText("YTD annualized source measure")).toBeInTheDocument();
    expect(
      within(overview).queryByText(/Contained|Moderate|Elevated|High|Acceptable/),
    ).not.toBeInTheDocument();
    expect(container.querySelector(".performance-risk-executive-grid")).toBeTruthy();
    expect(container.querySelectorAll(".performance-risk-executive-card")).toHaveLength(4);
    expect(container.querySelectorAll(".performance-risk-metric-card")).toHaveLength(4);
    expect(within(overview).queryByText("What matters now")).not.toBeInTheDocument();
  });
});
