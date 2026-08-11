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
    apiMocks.getPortfolioWorkspaceSummaryDetails.mockResolvedValue({ positions: [] });
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
    expect(result.workspace?.workflow_actions?.[0]?.title).toBe("Review source evidence");
  });
});
