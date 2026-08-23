import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";

import PortfolioRecordScreenShell from "../../src/apps/portfolio/components/portfolio-record-screen-shell";
import { buildPortfolioWorkspace } from "../fixtures/portfolio-workspace-component-fixtures";

vi.mock("../../src/apps/portfolio/components/portfolio-screen-rail", () => ({
  default: ({ portfolioId }: { portfolioId: string }) => (
    <nav aria-label="Portfolio recovery navigation">{portfolioId}</nav>
  ),
}));

vi.mock("../../src/apps/portfolio/components/portfolio-page-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("PortfolioRecordScreenShell", () => {
  it("keeps source identity in the shell review context and out of record content", () => {
    const workspace = buildPortfolioWorkspace();

    render(
      <PortfolioRecordScreenShell
        screen="positions"
        portfolioId={workspace.portfolio.portfolio_id}
        workspace={workspace}
      />,
    );

    const recordContent = document.querySelector(".portfolio-record-screen-main");
    expect(recordContent).not.toBeNull();
    expect(recordContent).toHaveTextContent("Positions");
    expect(recordContent).toHaveTextContent("Invested");
    expect(recordContent).not.toHaveTextContent("Global Balanced Mandate");
    expect(recordContent).not.toHaveTextContent("CIF_SG_000184");
    expect(recordContent).not.toHaveTextContent("12 May 2026");
  });

  it("retains portfolio navigation while the main record surface explains recovery", () => {
    render(
      <PortfolioRecordScreenShell
        screen="income"
        portfolioId="PB_SG_GLOBAL_BAL_001"
        workspace={null}
        reviewContextError="The selected portfolio could not be confirmed for this record view."
      />,
    );

    expect(
      screen.getByRole("navigation", { name: "Portfolio recovery navigation" }),
    ).toHaveTextContent("PB_SG_GLOBAL_BAL_001");
    expect(
      screen.getByText(
        "The selected portfolio could not be confirmed for this record view.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open My book" })).toHaveAttribute(
      "href",
      "/book",
    );
  });

  it.each(["income", "positions", "cashflow", "transactions"] as const)(
    "withholds %s portfolio navigation when no source identity is confirmed",
    (screenKind) => {
      render(
        <PortfolioRecordScreenShell
          screen={screenKind}
          portfolioId={null}
          workspace={null}
          reviewContextError="Select a source-confirmed portfolio from My book before opening portfolio records."
        />,
      );

      expect(
        screen.queryByRole("navigation", {
          name: "Portfolio recovery navigation",
        }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("No portfolio")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: "Open My book" }),
      ).toHaveAttribute("href", "/book");
    },
  );
});
