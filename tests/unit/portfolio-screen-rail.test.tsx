import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PortfolioScreenRail from "../../src/apps/portfolio/components/portfolio-screen-rail";

const usePathnameMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    onClick,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  ),
}));

describe("PortfolioScreenRail", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/income");
  });

  it("keeps the selected portfolio and active business view in the compact disclosure", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    expect(screen.getByTitle("PB_SG_GLOBAL_BAL_001")).toHaveTextContent(
      "PB_SG_GLOBAL_BAL_001",
    );
    const disclosure = screen.getByRole("button", { name: /current view income/i });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveAttribute("aria-controls");
    expect(screen.getByRole("navigation", { name: "Workbench screen navigation" })).toHaveClass(
      "portfolio-screen-rail-nav-collapsed",
    );
    expect(screen.getByRole("link", { name: /income income and activity/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens with native button behavior and closes after destination selection", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    const disclosure = screen.getByRole("button", { name: /current view income/i });
    fireEvent.click(disclosure);

    const navigation = screen.getByRole("navigation", {
      name: "Workbench screen navigation",
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(navigation).toHaveClass("portfolio-screen-rail-nav-expanded");

    fireEvent.click(within(navigation).getByRole("link", { name: /positions/i }));

    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(navigation).toHaveClass("portfolio-screen-rail-nav-collapsed");
  });

  it("closes on Escape and restores focus to the disclosure control", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    const disclosure = screen.getByRole("button", { name: /current view income/i });
    fireEvent.click(disclosure);
    const positionsLink = screen.getByRole("link", { name: /positions/i });
    positionsLink.focus();
    fireEvent.keyDown(positionsLink, { key: "Escape" });

    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveFocus();
  });

  it("identifies the active nested workspace and runs its supported action", () => {
    const onSelect = vi.fn();
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="manage"
        modeNavigationLabel="Manage workspace navigation"
        modeItems={[
          {
            key: "overview",
            label: "Overview",
            detail: "Operating posture",
            active: false,
            onSelect: vi.fn(),
          },
          {
            key: "mandate",
            label: "Mandate health",
            detail: "Mandate controls and exceptions",
            active: true,
            onSelect,
          },
        ]}
      />,
    );

    const disclosure = screen.getByRole("button", { name: /current view mandate health/i });
    expect(disclosure).toHaveAccessibleName(
      /current view mandate health manage · mandate controls and exceptions/i,
    );
    fireEvent.click(disclosure);
    fireEvent.click(screen.getByRole("button", { name: "Mandate health" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
  });
});
