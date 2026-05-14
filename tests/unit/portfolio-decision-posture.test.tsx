import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  PortfolioDecisionBand,
  PortfolioEvidenceModule,
} from "../../src/apps/portfolio/components/portfolio-decision-posture";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio decision posture", () => {
  it("renders decision posture from source-backed workspace state", () => {
    render(
      <PortfolioDecisionBand
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext()}
      />
    );

    expect(screen.getByText("Portfolio readiness")).toBeInTheDocument();
    expect(screen.getAllByText("Ready").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Exceptions")).toBeInTheDocument();
    expect(screen.getByText("Clear")).toBeInTheDocument();
    expect(screen.getByText("DPM operations")).toBeInTheDocument();
    expect(screen.getByText("rr_001")).toBeInTheDocument();
  });

  it("renders evidence and deep links to governed workspaces", () => {
    render(
      <PortfolioEvidenceModule
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext()}
      />
    );

    expect(screen.getByText("Evidence and Lineage")).toBeInTheDocument();
    expect(screen.getByText("11 rows")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&mode=risk&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByRole("link", { name: "DPM Operations" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001"
    );
  });
});
