const apiMocks = vi.hoisted(() => ({
  getPortfolioCatalog: vi.fn(),
  getPortfolioWorkspaceShell: vi.fn(),
  getPortfolioWorkspaceSummaryDetails: vi.fn(),
  getPortfolioWorkspaceDetailedDetails: vi.fn(),
  mergePortfolioWorkspace: vi.fn((shell, details) => ({ ...shell, ...details })),
}));

vi.mock("../../src/apps/portfolio/api", () => apiMocks);

import { loadPortfolioRecordScreenData } from "../../src/apps/portfolio/portfolio-record-screen-data";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

describe("portfolio record screen data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const shell = buildPortfolioWorkspace();
    apiMocks.getPortfolioCatalog.mockResolvedValue([shell.portfolio]);
    apiMocks.getPortfolioWorkspaceShell.mockResolvedValue(shell);
    apiMocks.getPortfolioWorkspaceSummaryDetails.mockResolvedValue({
      as_of_date: shell.as_of_date,
      portfolio: shell.portfolio,
      positions: [],
    });
    apiMocks.getPortfolioWorkspaceDetailedDetails.mockResolvedValue({
      workflow_actions: [
        {
          sequence: 1,
          title: "Review source evidence",
          impact: "Resolve the selected-date exception.",
          target: "Selected portfolio",
          href: "/performance",
          cta_label: "Open Performance",
          recommended: true,
        },
      ],
      record_data_availability: {
        liquidity: "ready",
        transactions: "ready",
      },
    });
  });

  it("assigns the dated workflow read to the detailed record loader only", async () => {
    const shell = await apiMocks.getPortfolioWorkspaceShell();
    const result = await loadPortfolioRecordScreenData({
      searchParams: Promise.resolve({ portfolioId: shell.portfolio.portfolio_id }),
    });

    expect(apiMocks.getPortfolioWorkspaceSummaryDetails).toHaveBeenCalledWith(
      shell.portfolio.portfolio_id,
      expect.objectContaining({
        asOfDate: shell.as_of_date,
        includeWorkflowActions: false,
      })
    );
    expect(apiMocks.getPortfolioWorkspaceDetailedDetails).toHaveBeenCalledTimes(1);
    expect(result.portfolioContext).toBe(shell);
    expect(result.workspace?.workflow_actions?.[0]?.title).toBe("Review source evidence");
  });

  it.each([
    {},
    { portfolioId: ["PB_ONE", "PB_TWO"] },
    { portfolioId: "PB_SG_GLOBAL_BAL_001", period: "ONE_YEAR" },
  ])("does not call a source for invalid or missing review context %o", async (search) => {
    const result = await loadPortfolioRecordScreenData({
      searchParams: Promise.resolve(search),
    });

    expect(result.workspace).toBeNull();
    expect(result.portfolioContext).toBeNull();
    expect(result.reviewContextError).toBeTruthy();
    expect(apiMocks.getPortfolioCatalog).not.toHaveBeenCalled();
    expect(apiMocks.getPortfolioWorkspaceShell).not.toHaveBeenCalled();
    expect(apiMocks.getPortfolioWorkspaceSummaryDetails).not.toHaveBeenCalled();
    expect(apiMocks.getPortfolioWorkspaceDetailedDetails).not.toHaveBeenCalled();
  });

  it("does not fetch records for a portfolio absent from the source catalogue", async () => {
    const result = await loadPortfolioRecordScreenData({
      searchParams: Promise.resolve({ portfolioId: "PB_NOT_ASSIGNED_001" }),
    });

    expect(result.workspace).toBeNull();
    expect(result.portfolioContext).toBeNull();
    expect(result.reviewContextError).toMatch(/No alternative portfolio/i);
    expect(apiMocks.getPortfolioCatalog).toHaveBeenCalledOnce();
    expect(apiMocks.getPortfolioWorkspaceShell).not.toHaveBeenCalled();
    expect(apiMocks.getPortfolioWorkspaceSummaryDetails).not.toHaveBeenCalled();
  });

  it("rejects a portfolio shell that does not confirm the selected portfolio identity", async () => {
    const selectedShell = buildPortfolioWorkspace();
    const foreignShell = buildPortfolioWorkspace({
      portfolio: {
        ...selectedShell.portfolio,
        portfolio_id: "PB_FOREIGN_001",
        client_id: "CLIENT_FOREIGN_001",
      },
    });
    apiMocks.getPortfolioWorkspaceShell.mockResolvedValueOnce(foreignShell);

    const result = await loadPortfolioRecordScreenData({
      searchParams: Promise.resolve({
        portfolioId: selectedShell.portfolio.portfolio_id,
      }),
    });

    expect(result.workspace).toBeNull();
    expect(result.portfolioContext).toBeNull();
    expect(result.reviewContextError).toMatch(/could not be confirmed/i);
    expect(apiMocks.getPortfolioWorkspaceSummaryDetails).not.toHaveBeenCalled();
    expect(apiMocks.getPortfolioWorkspaceDetailedDetails).not.toHaveBeenCalled();
  });

  it("uses the carried period for every source-backed record request", async () => {
    const shell = await apiMocks.getPortfolioWorkspaceShell();
    const result = await loadPortfolioRecordScreenData({
      searchParams: Promise.resolve({
        portfolioId: shell.portfolio.portfolio_id,
        asOfDate: shell.as_of_date,
        period: "YTD",
        reportingCurrency: shell.portfolio.base_currency,
        selectedRecordId: "EQ_US_1",
      }),
    });

    expect(apiMocks.getPortfolioWorkspaceSummaryDetails).toHaveBeenCalledWith(
      shell.portfolio.portfolio_id,
      expect.objectContaining({
        timeWindow: "YTD",
        reportStartDate: `${shell.as_of_date.slice(0, 4)}-01-01`,
        reportEndDate: shell.as_of_date,
      }),
    );
    expect(apiMocks.getPortfolioWorkspaceDetailedDetails).toHaveBeenCalledWith(
      shell.portfolio.portfolio_id,
      expect.objectContaining({
        startDate: `${shell.as_of_date.slice(0, 4)}-01-01`,
        endDate: shell.as_of_date,
      }),
    );
    expect(result).toMatchObject({
      timeWindow: "YTD",
      startDate: `${shell.as_of_date.slice(0, 4)}-01-01`,
      endDate: shell.as_of_date,
      selectedRecordId: "EQ_US_1",
    });
  });

  it("stops before detail reads when the record surface cannot support the period", async () => {
    const shell = await apiMocks.getPortfolioWorkspaceShell();
    const result = await loadPortfolioRecordScreenData({
      searchParams: Promise.resolve({
        portfolioId: shell.portfolio.portfolio_id,
        period: "5Y",
      }),
    });

    expect(result.workspace).toBeNull();
    expect(result.portfolioContext).toBe(shell);
    expect(result.reviewContextError).toMatch(/not supported/i);
    expect(apiMocks.getPortfolioWorkspaceSummaryDetails).not.toHaveBeenCalled();
    expect(apiMocks.getPortfolioWorkspaceDetailedDetails).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null],
    ["unqualified", { positions: [] }],
    ["stale", { as_of_date: "2026-08-20", positions: [] }],
  ] as const)(
    "withholds %s source evidence that does not confirm the requested valuation date",
    async (_posture, summaryDetails) => {
      const shell = await apiMocks.getPortfolioWorkspaceShell();
      apiMocks.getPortfolioWorkspaceSummaryDetails.mockResolvedValueOnce(
        summaryDetails,
      );

      const result = await loadPortfolioRecordScreenData({
        searchParams: Promise.resolve({
          portfolioId: shell.portfolio.portfolio_id,
          asOfDate: shell.as_of_date,
        }),
      });

      expect(result.workspace).toBeNull();
      expect(result.portfolioContext).toBe(shell);
      expect(result.reviewContextError).toMatch(/did not confirm/i);
      expect(apiMocks.mergePortfolioWorkspace).not.toHaveBeenCalled();
    },
  );
});
