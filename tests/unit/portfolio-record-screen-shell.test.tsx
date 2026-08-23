import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { vi } from "vitest";

import PortfolioRecordScreenShell from "../../src/apps/portfolio/components/portfolio-record-screen-shell";

vi.mock("../../src/apps/portfolio/components/portfolio-screen-rail", () => ({
  default: ({ portfolioId }: { portfolioId: string }) => (
    <nav aria-label="Portfolio recovery navigation">{portfolioId}</nav>
  ),
}));

vi.mock("../../src/apps/portfolio/components/portfolio-page-layout", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("PortfolioRecordScreenShell", () => {
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
