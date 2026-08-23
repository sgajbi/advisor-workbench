import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PortfolioExperiencePage from "@/apps/portfolio/portfolio-experience-page";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

const getPortfolioCatalogMock = vi.fn();
const getPortfolioWorkspaceShellMock = vi.fn();

vi.mock("@/apps/portfolio/api", () => ({
  getPortfolioCatalog: (...args: unknown[]) => getPortfolioCatalogMock(...args),
  getPortfolioWorkspaceShell: (...args: unknown[]) =>
    getPortfolioWorkspaceShellMock(...args),
}));

vi.mock("@/apps/portfolio/components/portfolio-workspace-client", () => ({
  default: () => <div data-testid="portfolio-workspace-client" />,
}));

describe("PortfolioExperiencePage", () => {
  beforeEach(() => {
    getPortfolioCatalogMock.mockReset();
    getPortfolioWorkspaceShellMock.mockReset();
  });

  it("preserves confirmed identity when requested controls need recovery", async () => {
    const workspace = buildPortfolioWorkspace();
    getPortfolioCatalogMock.mockResolvedValue([
      {
        portfolio_id: workspace.portfolio.portfolio_id,
        display_name: workspace.portfolio.display_name,
        client_id: workspace.portfolio.client_id,
        base_currency: workspace.portfolio.base_currency,
        booking_center_code: workspace.portfolio.booking_center_code,
      },
    ]);
    getPortfolioWorkspaceShellMock.mockResolvedValue(workspace);

    render(
      await PortfolioExperiencePage({
        searchParams: Promise.resolve({
          portfolioId: workspace.portfolio.portfolio_id,
          asOfDate: "2024-01-01",
        }),
      }),
    );

    const reviewContext = screen.getByTestId("review-context-strip");
    expect(within(reviewContext).getByText("Global Balanced Mandate")).toBeInTheDocument();
    expect(within(reviewContext).getByText("CIF_SG_000184")).toBeInTheDocument();
    expect(within(reviewContext).queryByText("Portfolio not confirmed")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Use available portfolio context" })).toHaveAttribute(
      "href",
      expect.stringContaining(`portfolioId=${workspace.portfolio.portfolio_id}`),
    );
    expect(screen.queryByTestId("portfolio-workspace-client")).not.toBeInTheDocument();
  });

  it("withholds foreign source identity before unsupported-control recovery", async () => {
    const selectedWorkspace = buildPortfolioWorkspace();
    const foreignWorkspace = buildPortfolioWorkspace({
      portfolio: {
        ...selectedWorkspace.portfolio,
        portfolio_id: "PB_FOREIGN_001",
        display_name: "Foreign mandate",
        client_id: "CLIENT_FOREIGN_001",
      },
    });
    getPortfolioCatalogMock.mockResolvedValue([selectedWorkspace.portfolio]);
    getPortfolioWorkspaceShellMock.mockResolvedValue(foreignWorkspace);

    render(
      await PortfolioExperiencePage({
        searchParams: Promise.resolve({
          portfolioId: selectedWorkspace.portfolio.portfolio_id,
          asOfDate: "2024-01-01",
        }),
      }),
    );

    expect(
      screen.getByText(/source did not confirm the selected portfolio identity/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("review-context-strip")).toHaveTextContent(
      "Portfolio not confirmed",
    );
    expect(screen.queryByText("Foreign mandate")).not.toBeInTheDocument();
    expect(screen.queryByText("CLIENT_FOREIGN_001")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Choose another portfolio" }),
    ).toHaveAttribute("href", "/book");
    expect(
      screen.queryByTestId("portfolio-workspace-client"),
    ).not.toBeInTheDocument();
  });
});
