import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportOrderingPage } from "../../src/features/report-ordering/report-ordering-page";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

const getPortfolioCatalogMock = vi.fn();
const getPortfolioWorkspaceShellMock = vi.fn();

vi.mock("@/apps/portfolio/api", () => ({
  getPortfolioCatalog: (...args: unknown[]) => getPortfolioCatalogMock(...args),
  getPortfolioWorkspaceShell: (...args: unknown[]) =>
    getPortfolioWorkspaceShellMock(...args),
}));

vi.mock(
  "@/features/report-ordering/components/report-ordering-workspace",
  () => ({
    ReportOrderingWorkspace: () => (
      <div data-testid="report-ordering-workspace" />
    ),
  }),
);

describe("ReportOrderingPage", () => {
  beforeEach(() => {
    getPortfolioCatalogMock.mockReset();
    getPortfolioWorkspaceShellMock.mockReset();
  });

  it("fails closed when the source shell does not confirm the selected portfolio", async () => {
    const selectedPortfolioId = "PB_SG_GLOBAL_BAL_001";
    const foreignWorkspace = buildPortfolioWorkspace({
      portfolio: {
        ...buildPortfolioWorkspace().portfolio,
        portfolio_id: "PB_FOREIGN_001",
        client_id: "CLIENT_FOREIGN_001",
      },
    });
    getPortfolioCatalogMock.mockResolvedValue([
      { ...foreignWorkspace.portfolio, portfolio_id: selectedPortfolioId },
    ]);
    getPortfolioWorkspaceShellMock.mockResolvedValue(foreignWorkspace);

    render(
      await ReportOrderingPage({
        searchParams: Promise.resolve({ portfolioId: selectedPortfolioId }),
      }),
    );

    expect(
      screen.getByText(
        /source did not confirm the selected portfolio identity/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("report-ordering-workspace"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("PB_FOREIGN_001")).not.toBeInTheDocument();
    expect(getPortfolioWorkspaceShellMock).toHaveBeenCalledWith(
      selectedPortfolioId,
    );
  });
});
