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

  it("renders service area and adviser-readable detail for active coverage failures", () => {
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
      screen.getByRole("heading", { name: "Source limitations" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence coverage" })).toBeInTheDocument();
    expect(screen.queryByText(/Unresolved source issues/i)).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Reporting coverage needs attention")).toBeInTheDocument();
    expect(screen.getByText("Source: Portfolio data")).toBeInTheDocument();
    expect(screen.queryByText("PORTFOLIO_CASH_BALANCES_UNAVAILABLE")).not.toBeInTheDocument();
    expect(screen.getByText("cash balance service unavailable")).toBeInTheDocument();
  });

  it("surfaces period-specific supporting evidence failures without hiding book evidence", () => {
    render(
      <PortfolioExceptionsSection
        workspace={buildPortfolioWorkspace({
          supporting_evidence_failures: [
            {
              evidence_scope: "standard_period_performance",
              period: "MTD",
              source_service: "lotus-gateway",
              title: "MTD performance unavailable",
              detail: "MTD performance evidence could not be retrieved through Gateway. No return is shown.",
            },
          ],
        })}
      />
    );

    expect(screen.getByText("MTD performance unavailable")).toBeInTheDocument();
    expect(screen.getByText(/No return is shown/)).toBeInTheDocument();
    expect(screen.getByText("Source: Gateway")).toBeInTheDocument();
  });
});
