import { describe, expect, it } from "vitest";

import { buildPerformanceReviewContextStrip } from "../../src/apps/performance/performance-review-context-strip-view-model";
import { buildSupportedPerformanceScenario } from "../fixtures/performance-workspace-fixtures";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("performance review context strip view model", () => {
  it("combines the exact supporting portfolio shell with current performance evidence", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const portfolioContext = buildPortfolioWorkspace({
      portfolio: {
        ...buildPortfolioWorkspace().portfolio,
        portfolio_id: workspace.portfolio_id,
      },
    });

    expect(
      buildPerformanceReviewContextStrip({ workspace, portfolioContext }),
    ).toMatchObject({
      portfolioName: "Global Balanced Mandate",
      portfolioId: workspace.portfolio_id,
      clientId: "CIF_SG_000184",
      mandateType: "Discretionary",
      bookingCenter: "Singapore",
      businessDate: expect.stringMatching(/2026/),
      reportingCurrency: workspace.portfolio.base_currency,
      sourceState: "confirmed",
    });
  });

  it("rejects cross-portfolio support context and degrades only the strip", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;

    expect(
      buildPerformanceReviewContextStrip({
        workspace,
        portfolioContext: buildPortfolioWorkspace(),
      }),
    ).toMatchObject({
      portfolioName: "Performance portfolio",
      portfolioId: workspace.portfolio_id,
      sourceState: "partial",
      notice: {
        label: "Portfolio context limited",
      },
    });
  });

  it("keeps performance evidence usable when supporting context is unavailable", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    const model = buildPerformanceReviewContextStrip({
      workspace,
      portfolioContext: null,
    });

    expect(model.portfolioId).toBe(workspace.portfolio_id);
    expect(model.clientId).toBe(workspace.portfolio.client_id);
    expect(model.mandateType).toBeUndefined();
    expect(model.sourceState).toBe("partial");
  });

  it("leaves an absent performance date unconfirmed for the shared strip", () => {
    const workspace = buildSupportedPerformanceScenario().workspace;
    workspace.as_of_date = "";

    expect(
      buildPerformanceReviewContextStrip({
        workspace,
        portfolioContext: null,
      }).businessDate,
    ).toBeNull();
  });
});
