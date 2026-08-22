import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPortfolioCatalog, getPortfolioWorkspaceShell } from "@/apps/portfolio/api";
import { ReportOrderingPage } from "@/features/report-ordering/report-ordering-page";

vi.mock("@/apps/portfolio/api", () => ({
  getPortfolioCatalog: vi.fn(),
  getPortfolioWorkspaceShell: vi.fn(),
}));

vi.mock("@/features/report-ordering/components/report-ordering-workspace", () => ({
  ReportOrderingWorkspace: ({
    portfolio,
  }: {
    portfolio: { portfolioId: string; displayName: string; asOfDate: string; baseCurrency: string };
  }) => (
    <div>
      <h1>Report Centre Workspace</h1>
      <span>{portfolio.portfolioId}</span>
      <span>{portfolio.displayName}</span>
      <span>{portfolio.asOfDate}</span>
      <span>{portfolio.baseCurrency}</span>
    </div>
  ),
}));

const catalogMock = vi.mocked(getPortfolioCatalog);
const shellMock = vi.mocked(getPortfolioWorkspaceShell);

describe("reports page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    catalogMock.mockResolvedValue([
      {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        base_currency: "SGD",
        client_id: "CLIENT_001",
        booking_center_code: "SG",
      },
    ]);
    shellMock.mockResolvedValue({
      as_of_date: "2026-04-22",
      portfolio: {
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        display_name: "Global Balanced Mandate",
        client_id: "CLIENT_001",
        base_currency: "SGD",
        booking_center_code: "SG",
      },
    } as Awaited<ReturnType<typeof getPortfolioWorkspaceShell>>);
  });

  it("resolves selected portfolio context before rendering the ordering workspace", async () => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
      }),
    );

    expect(shellMock).toHaveBeenCalledWith("PB_SG_GLOBAL_BAL_001");
    expect(screen.getByRole("heading", { name: "Report Centre Workspace" })).toBeInTheDocument();
    expect(screen.getByText("Global Balanced Mandate")).toBeInTheDocument();
    expect(screen.getByText("2026-04-22")).toBeInTheDocument();
    expect(screen.getByText("SGD")).toBeInTheDocument();
  });

  it("fails closed when portfolio workspace context cannot be loaded", async () => {
    shellMock.mockResolvedValue(null);

    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({ portfolioId: "PB_SG_GLOBAL_BAL_001" }),
      }),
    );

    expect(screen.getByText("Portfolio reporting context is unavailable")).toBeInTheDocument();
    expect(screen.getByText(/No report choices or submission controls/)).toBeInTheDocument();
    expect(screen.getByText(/confirmed portfolio context/)).toBeInTheDocument();
    expect(screen.queryByText(/source-backed portfolio context/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
  });

  it.each([
    {},
    { portfolioId: ["PB_SG_GLOBAL_BAL_001", "PB_OTHER_001"] },
  ])("makes no source calls without one governed report context: %o", async (searchParams) => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve(searchParams),
      }),
    );

    expect(screen.getByText("Portfolio reporting context is unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
    expect(catalogMock).not.toHaveBeenCalled();
    expect(shellMock).not.toHaveBeenCalled();
  });

  it("does not request report choices for unsupported review controls", async () => {
    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          period: "5Y",
        }),
      }),
    );

    expect(screen.getByText(/not supported for report ordering/i)).toBeInTheDocument();
    expect(screen.queryByText("Report Centre Workspace")).not.toBeInTheDocument();
  });
});
