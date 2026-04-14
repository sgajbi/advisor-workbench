import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioAnalyticalMainColumn from "../../src/apps/portfolio/components/portfolio-analytical-main-column";

describe("PortfolioAnalyticalMainColumn", () => {
  it("groups summary and detailed analytical sections into separate composition bands", () => {
    render(
      <PortfolioAnalyticalMainColumn
        summaryHeader={<section aria-label="Summary Header">Summary Header</section>}
        exceptions={<section aria-label="Exceptions">Exceptions</section>}
        insights={<section aria-label="Insights">Insights</section>}
        health={<section aria-label="Health">Health</section>}
        changes={<section aria-label="Changes">Changes</section>}
        drilldown={<section aria-label="Drilldown">Drilldown</section>}
      />
    );

    const summaryCluster = screen.getByRole("region", {
      name: "Portfolio analytical overview",
    });
    const detailedCluster = screen.getByRole("region", {
      name: "Portfolio analytical detail",
    });

    expect(summaryCluster).toContainElement(screen.getByLabelText("Summary Header"));
    expect(summaryCluster).toContainElement(screen.getByLabelText("Exceptions"));
    expect(summaryCluster).toContainElement(screen.getByLabelText("Insights"));
    expect(detailedCluster).toContainElement(screen.getByLabelText("Health"));
    expect(detailedCluster).toContainElement(screen.getByLabelText("Changes"));
    expect(detailedCluster).toContainElement(screen.getByLabelText("Drilldown"));
  });
});
