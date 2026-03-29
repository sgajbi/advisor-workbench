import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioInsightsStrip from "../../src/apps/portfolio/modules/portfolio-insights/portfolio-insights-strip";

describe("PortfolioInsightsStrip", () => {
  it("renders nothing when there are no insights or readiness indicators", () => {
    const { container } = render(
      <PortfolioInsightsStrip
        insights={[]}
        readinessIndicators={[]}
        onDismissInsight={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders readiness indicators only when insights are absent", () => {
    render(
      <PortfolioInsightsStrip
        insights={[]}
        readinessIndicators={[
          {
            key: "pricing",
            label: "Pricing",
            status: "Partial",
            href: "#pricing",
          },
        ]}
        onDismissInsight={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Portfolio readiness indicators")).toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio insights")).not.toBeInTheDocument();
  });
});
