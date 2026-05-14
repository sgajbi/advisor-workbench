import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioExceptionsSection from "../../src/apps/portfolio/components/portfolio-exceptions-section";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioExceptionsSection", () => {
  it("renders a clear empty state when the backend reports no active failures", () => {
    render(<PortfolioExceptionsSection workspace={buildPortfolioWorkspace()} />);

    expect(screen.getByRole("heading", { name: "Exceptions" })).toBeInTheDocument();
    expect(screen.getByText("No active exceptions")).toBeInTheDocument();
    expect(
      screen.getByText("Reporting and operational checks are currently clear.")
    ).toBeInTheDocument();
  });

  it("renders source service, error code, and detail for active coverage failures", () => {
    render(
      <PortfolioExceptionsSection
        workspace={buildPortfolioWorkspace({
          partial_failures: [
            {
              source_service: "lotus-core",
              error_code: "PORTFOLIO_CASH_BALANCES_UNAVAILABLE",
              detail: "cash balance service unavailable",
            },
          ],
        })}
      />
    );

    expect(
      screen.getByRole("heading", { name: "Critical Exceptions and Blockers" })
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Portfolio data")).toBeInTheDocument();
    expect(screen.getByText("PORTFOLIO_CASH_BALANCES_UNAVAILABLE")).toBeInTheDocument();
    expect(screen.getByText("cash balance service unavailable")).toBeInTheDocument();
  });
});
