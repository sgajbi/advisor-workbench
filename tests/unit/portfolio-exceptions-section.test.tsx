import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PortfolioExceptionsSection from "../../src/apps/portfolio/components/portfolio-exceptions-section";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("PortfolioExceptionsSection", () => {
  it("does not repeat an all-clear conclusion when no source limitation exists", () => {
    const { container } = render(
      <PortfolioExceptionsSection workspace={buildPortfolioWorkspace()} />
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/No active exceptions/i)).not.toBeInTheDocument();
  });

  it("renders service area and advisor-readable detail for active coverage failures", () => {
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
      screen.getByRole("heading", { name: "Source Limitations" })
    ).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Portfolio data")).toBeInTheDocument();
    expect(screen.queryByText("PORTFOLIO_CASH_BALANCES_UNAVAILABLE")).not.toBeInTheDocument();
    expect(screen.getByText("cash balance service unavailable")).toBeInTheDocument();
  });
});
