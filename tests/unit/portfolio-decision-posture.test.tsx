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
    expect(screen.getByText("11 rows")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Performance" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByRole("link", { name: "Risk" })).toHaveAttribute(
      "href",
      "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&period=YTD&detailBasis=NET&contributionDimension=asset_class&attributionDimension=asset_class&chartFrequency=monthly&mode=risk&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
    );
    expect(screen.getByRole("link", { name: "Mandate Operations" })).toHaveAttribute(
      "href",
      "/workbench/PB_SG_GLOBAL_BAL_001"
    );
  });
});
