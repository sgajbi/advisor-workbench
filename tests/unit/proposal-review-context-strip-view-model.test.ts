import { describe, expect, it } from "vitest";

import { buildProposalReviewContextStrip } from "@/features/proposals/proposal-review-context-strip-view-model";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("proposal review context strip view model", () => {
  it("uses the exact Gateway-backed portfolio context", () => {
    const portfolioContext = buildPortfolioWorkspace();

    expect(
      buildProposalReviewContextStrip({
        portfolioId: portfolioContext.portfolio.portfolio_id,
        portfolioContext,
      }),
    ).toMatchObject({
      portfolioName: "Global Balanced Mandate",
      portfolioId: portfolioContext.portfolio.portfolio_id,
      clientId: "CIF_SG_000184",
      mandateType: "Discretionary",
      bookingCenter: "Singapore",
      sourceState: "confirmed",
    });
  });

  it("does not promote a URL portfolio when supporting source identity differs", () => {
    expect(
      buildProposalReviewContextStrip({
        portfolioId: "PB_REQUESTED_001",
        portfolioContext: buildPortfolioWorkspace(),
      }),
    ).toEqual({
      portfolioName: "Portfolio not confirmed",
      sourceState: "unavailable",
      notice: {
        label: "Supporting context unavailable",
        message:
          "Advisory evidence remains available, but portfolio identity and mandate context could not be confirmed.",
        tone: "attention",
      },
    });
  });
});
