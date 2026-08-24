import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioRecordGridShell from "../../src/apps/portfolio/components/portfolio-record-grid-shell";

describe("PortfolioRecordGridShell", () => {
  it("renders the shared record-grid heading, utility controls, and body slot", () => {
    render(
      <PortfolioRecordGridShell
        kicker="Positions"
        title="Holdings"
        description="As of 28 Mar 2026 in USD"
        summaryLabel="2 positions"
        summaryValue="USD 1.2m"
        searchControl={<input aria-label="Search positions" />}
        actions={<button type="button">Export</button>}
      >
        <div>Grid body</div>
      </PortfolioRecordGridShell>
    );

    expect(screen.getByText("Positions")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Holdings" })).toBeInTheDocument();
    expect(screen.getByText("As of 28 Mar 2026 in USD")).toBeInTheDocument();
    expect(screen.getByText("2 positions")).toBeInTheDocument();
    expect(screen.getByText("USD 1.2m")).toBeInTheDocument();
    expect(screen.getByLabelText("Search positions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByText("Grid body")).toBeInTheDocument();
  });
});
