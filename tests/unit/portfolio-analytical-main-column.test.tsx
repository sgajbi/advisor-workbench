import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioAnalyticalMainColumn from "../../src/apps/portfolio/components/portfolio-analytical-main-column";

describe("PortfolioAnalyticalMainColumn", () => {
  it("keeps portfolio review content in one ordered composition band", () => {
    render(
      <PortfolioAnalyticalMainColumn
        summaryHeader={<section aria-label="Summary Header">Summary Header</section>}
        exceptions={<section aria-label="Exceptions">Exceptions</section>}
        insights={<section aria-label="Insights">Insights</section>}
      />
    );

    const summaryCluster = screen.getByRole("region", {
      name: "Portfolio analytical overview",
    });

    expect(summaryCluster).toContainElement(screen.getByLabelText("Summary Header"));
    expect(summaryCluster).toContainElement(screen.getByLabelText("Exceptions"));
    expect(summaryCluster).toContainElement(screen.getByLabelText("Insights"));
    expect(
      screen.queryByRole("region", { name: "Portfolio analytical detail" })
    ).not.toBeInTheDocument();
  });
});
