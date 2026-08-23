import { describe, expect, it } from "vitest";

import {
  loadProposalPortfolioContext,
  resolveProposalPortfolioContext,
} from "@/features/proposals/proposal-portfolio-context";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("proposal workspace shell context", () => {
  it("passes through source context only when portfolio identity agrees", () => {
    const workspace = buildPortfolioWorkspace();

    expect(
      resolveProposalPortfolioContext(
        workspace.portfolio.portfolio_id,
        workspace,
      ),
    ).toBe(workspace);
  });

  it("fails closed when the source returns another portfolio", () => {
    const workspace = buildPortfolioWorkspace();

    expect(resolveProposalPortfolioContext("PB_SG_OTHER_002", workspace)).toBeNull();
  });

  it("accepts an identity-matched portfolio book context without inventing mandate data", () => {
    const workspace = buildPortfolioWorkspace();
    const bookContext = {
      as_of_date: workspace.as_of_date,
      portfolio: workspace.portfolio,
    };

    expect(
      resolveProposalPortfolioContext(
        workspace.portfolio.portfolio_id,
        bookContext,
      ),
    ).toBe(bookContext);
    expect("profile" in bookContext).toBe(false);
  });

  it("rejects a foreign portfolio book recovery context", () => {
    const workspace = buildPortfolioWorkspace();

    expect(
      resolveProposalPortfolioContext("PB_SG_OTHER_002", {
        as_of_date: workspace.as_of_date,
        portfolio: workspace.portfolio,
      }),
    ).toBeNull();
  });

  it("recovers identity-matched book context when the workspace shell is unavailable", async () => {
    const workspace = buildPortfolioWorkspace();
    const bookContext = {
      as_of_date: workspace.as_of_date,
      portfolio: workspace.portfolio,
      summary: {
        assets_under_management_base: 1_000_000,
        invested_market_value_base: 900_000,
        cash_market_value_base: 100_000,
        cash_weight_pct: 10,
        position_count: 1,
        cash_balance_count: 1,
      },
      cash_balances: [],
      allocation_views: [],
      top_positions: [],
      positions: [],
    };
    const loadWorkspace = vi.fn().mockResolvedValue(null);
    const loadBook = vi.fn().mockResolvedValue(bookContext);

    await expect(
      loadProposalPortfolioContext({
        portfolioId: workspace.portfolio.portfolio_id,
        reviewContext: {
          asOfDate: workspace.as_of_date,
          reportingCurrency: workspace.portfolio.base_currency,
        },
        loaders: { loadWorkspace, loadBook },
      }),
    ).resolves.toBe(bookContext);
    expect(loadWorkspace).toHaveBeenCalledWith(workspace.portfolio.portfolio_id);
    expect(loadBook).toHaveBeenCalledWith(workspace.portfolio.portfolio_id, {
      asOfDate: workspace.as_of_date,
      reportingCurrency: workspace.portfolio.base_currency,
    });
  });

  it("does not request a second source when the workspace shell confirms identity", async () => {
    const workspace = buildPortfolioWorkspace();
    const loadBook = vi.fn();

    await expect(
      loadProposalPortfolioContext({
        portfolioId: workspace.portfolio.portfolio_id,
        reviewContext: {},
        loaders: {
          loadWorkspace: vi.fn().mockResolvedValue(workspace),
          loadBook,
        },
      }),
    ).resolves.toBe(workspace);
    expect(loadBook).not.toHaveBeenCalled();
  });

  it("fails closed when the fallback book belongs to another portfolio", async () => {
    const workspace = buildPortfolioWorkspace();

    await expect(
      loadProposalPortfolioContext({
        portfolioId: "PB_SG_OTHER_002",
        reviewContext: {},
        loaders: {
          loadWorkspace: vi.fn().mockResolvedValue(null),
          loadBook: vi.fn().mockResolvedValue({
            as_of_date: workspace.as_of_date,
            portfolio: workspace.portfolio,
            summary: {
              assets_under_management_base: 1_000_000,
              invested_market_value_base: 900_000,
              cash_market_value_base: 100_000,
              cash_weight_pct: 10,
              position_count: 1,
              cash_balance_count: 1,
            },
            cash_balances: [],
            allocation_views: [],
            top_positions: [],
            positions: [],
          }),
        },
      }),
    ).resolves.toBeNull();
  });
});
