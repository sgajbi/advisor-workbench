import { describe, expect, it } from "vitest";

import {
  buildPortfolioReviewContextStrip,
} from "../../src/apps/portfolio/portfolio-review-context-strip-view-model";
import { buildUnavailableReviewContextStrip } from "../../src/shell/review-context-strip-view-model";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio review context strip view model", () => {
  it("maps source-confirmed portfolio identity into business display values", () => {
    expect(
      buildPortfolioReviewContextStrip(buildPortfolioWorkspace()),
    ).toEqual({
      portfolioName: "Global Balanced Mandate",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      clientId: "CIF_SG_000184",
      mandateType: "Discretionary",
      bookingCenter: "Singapore",
      businessDate: "12 May 2026",
      currency: { kind: "base", value: "USD" },
      sourceState: "confirmed",
    });
  });

  it("labels currency as reporting only when the source confirms a non-base restatement", () => {
    const workspace = buildPortfolioWorkspace();
    workspace.control_capabilities = {
      historical_snapshots: {
        state: "supported",
        reason: "available",
        requested_as_of_date: workspace.as_of_date,
        effective_as_of_date: workspace.as_of_date,
        module_capabilities: [],
      },
      reporting_currency_restatement: {
        state: "supported",
        reason: "accepted",
        requested_reporting_currency: "SGD",
        effective_reporting_currency: "SGD",
        supported_currencies: ["USD", "SGD"],
        module_capabilities: [],
      },
    };

    expect(buildPortfolioReviewContextStrip(workspace).currency).toEqual({
      kind: "reporting",
      value: "SGD",
    });
  });

  it("keeps requested but unaccepted currency labelled as source base currency", () => {
    const workspace = buildPortfolioWorkspace();
    workspace.control_capabilities = {
      historical_snapshots: {
        state: "supported",
        reason: "available",
        requested_as_of_date: workspace.as_of_date,
        effective_as_of_date: workspace.as_of_date,
        module_capabilities: [],
      },
      reporting_currency_restatement: {
        state: "partial",
        reason: "not accepted",
        requested_reporting_currency: "SGD",
        effective_reporting_currency: "USD",
        supported_currencies: ["USD", "SGD"],
        module_capabilities: [],
      },
    };

    expect(buildPortfolioReviewContextStrip(workspace).currency).toEqual({
      kind: "base",
      value: "USD",
    });
  });

  it("keeps unrequested source reporting echoes labelled as base currency", () => {
    const workspace = buildPortfolioWorkspace();
    workspace.income_summary = {
      ...workspace.income_summary!,
      reporting_currency: "SGD",
    };
    workspace.activity_summary = {
      ...workspace.activity_summary!,
      reporting_currency: "SGD",
    };

    expect(buildPortfolioReviewContextStrip(workspace).currency).toEqual({
      kind: "base",
      value: "USD",
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
    expect(buildUnavailableReviewContextStrip()).toEqual({
      portfolioName: "Portfolio not confirmed",
      sourceState: "unavailable",
    });
  });
});
