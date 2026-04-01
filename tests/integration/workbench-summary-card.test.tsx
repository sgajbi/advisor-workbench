import React from "react";
import { render, screen } from "@testing-library/react";

import AdvisorSummaryCard from "../../src/features/workbench/components/advisor-summary-card";

describe("AdvisorSummaryCard", () => {
  it("shows blocked readiness when failures exist", () => {
    render(
      <AdvisorSummaryCard
        portfolioId="PF_1001"
        warningCount={1}
        failureCount={2}
        netDeltaQuantity={3.5}
      />
    );
    expect(screen.getByText("BLOCKED")).toBeInTheDocument();
    expect(
      screen.getByText(/Resolve upstream exceptions before progressing client-ready actions/i)
    ).toBeInTheDocument();
  });
});
