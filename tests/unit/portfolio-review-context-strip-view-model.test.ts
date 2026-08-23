import { describe, expect, it } from "vitest";

import {
  buildPortfolioReviewContextStrip,
  buildUnavailablePortfolioReviewContextStrip,
} from "../../src/apps/portfolio/portfolio-review-context-strip-view-model";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio review context strip view model", () => {
  it("maps source-confirmed portfolio identity into business display values", () => {
    expect(
      buildPortfolioReviewContextStrip(buildPortfolioWorkspace(), {
        businessDate: "2026-04-10",
        reportingCurrency: "SGD",
      }),
    ).toEqual({
      portfolioName: "Global Balanced Mandate",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      clientId: "CIF_SG_000184",
      mandateType: "Discretionary",
      bookingCenter: "Singapore",
      businessDate: "10 Apr 2026",
      reportingCurrency: "SGD",
      sourceState: "confirmed",
    });
  });

  it("marks incomplete source context as partial without inventing missing facts", () => {
    const workspace = buildPortfolioWorkspace({
      portfolio: {
        ...buildPortfolioWorkspace().portfolio,
        client_id: null,
        booking_center_code: null,
      },
      profile: {
        ...buildPortfolioWorkspace().profile,
        portfolio_type: null,
      },
    });

    expect(buildPortfolioReviewContextStrip(workspace)).toMatchObject({
      clientId: null,
      mandateType: null,
      bookingCenter: null,
      sourceState: "partial",
    });
  });

  it("uses an explicit empty recovery model when no portfolio is source-confirmed", () => {
    expect(buildUnavailablePortfolioReviewContextStrip()).toEqual({
      portfolioName: "Portfolio not confirmed",
      sourceState: "unavailable",
    });
  });
});
