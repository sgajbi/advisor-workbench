import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PortfolioEvidenceModule,
} from "../../src/apps/portfolio/components/portfolio-decision-posture";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio decision posture", () => {
  it("renders evidence and deep links to governed workspaces", () => {
    render(
      <PortfolioEvidenceModule
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext()}
      />
    );

    expect(screen.getByText("Review Evidence")).toBeInTheDocument();
    expect(screen.getByText("Portfolio decision review")).toBeInTheDocument();
    expect(screen.getByText("Portfolio book, Performance, Cashflow, Reporting")).toBeInTheDocument();
    expect(screen.getByText("11 rows")).toBeInTheDocument();
    expect(screen.queryByText("Ready")).not.toBeInTheDocument();
    expect(screen.queryByText("Valuation date")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&asOfDate=2026-05-12&reportingCurrency=USD&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&asOfDate=2026-05-12&reportingCurrency=USD&mode=risk&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByRole("link", { name: "Mandate Operations" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001"
    );
  });

  it("preserves historical review identity in every performance handoff", () => {
    render(
      <PortfolioEvidenceModule
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext({
          selectedAsOfDate: "2026-04-30",
          selectedReportingCurrency: "SGD",
          hasHistoricalGap: true,
        })}
      />
    );

    for (const name of ["Performance", "Risk", "Advisor Brief", "Evidence"]) {
      expect(screen.getByRole("link", { name })).toHaveAttribute(
        "href",
        expect.stringContaining("asOfDate=2026-04-30&reportingCurrency=SGD")
      );
    }
  });

  it("uses the canonical valuation label only when the source date differs", () => {
    render(
      <PortfolioEvidenceModule
        workspace={buildPortfolioWorkspace({ as_of_date: "2026-04-10" })}
        context={buildPortfolioWorkspaceContext({
          selectedAsOfDate: "2026-04-01",
        })}
      />
    );

    expect(screen.getByText("Valuation date")).toBeInTheDocument();
    expect(screen.getByText("10 Apr 2026")).toBeInTheDocument();
    expect(screen.queryByText("Valuation as of")).not.toBeInTheDocument();
  });

  it("does not imply a benchmark assignment or absent evidence source", () => {
    render(
      <PortfolioEvidenceModule
        workspace={buildPortfolioWorkspace({
          performance: null,
          cashflow_outlook: null,
          readiness: {
            has_positions: true,
            reporting: { status: "PENDING", generated_at_utc: null, row_count: 0 },
          },
        })}
        context={buildPortfolioWorkspaceContext()}
      />
    );

    expect(screen.getByText("Portfolio book")).toBeInTheDocument();
    expect(screen.getByText("Not supplied")).toBeInTheDocument();
    expect(screen.queryByText(/Cashflow/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Assigned benchmark/)).not.toBeInTheDocument();
  });
});
