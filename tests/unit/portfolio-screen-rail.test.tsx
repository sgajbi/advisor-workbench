import { fireEvent, render, screen, within } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import PortfolioScreenRail from "../../src/apps/portfolio/components/portfolio-screen-rail";

const usePathnameMock = vi.fn();
const useAdvisorBookMock = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

vi.mock("@/features/advisor-book/use-advisor-book", () => ({
  useAdvisorBook: (...args: unknown[]) => useAdvisorBookMock(...args),
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

function openPortfolioContextOptions() {
  const summary = screen.getByLabelText("Change portfolio");
  const disclosure = summary.closest("details");

  if (!disclosure) {
    throw new Error("Portfolio context disclosure is missing");
  }

  disclosure.open = true;
  fireEvent(disclosure, new Event("toggle"));
}

describe("PortfolioScreenRail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue("/income");
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/income?period=YTD&portfolioId=PB_SG_GLOBAL_BAL_001");
    useAdvisorBookMock.mockReturnValue({
      loading: false,
      error: null,
      response: {
        items: [
          {
            portfolio_id: "PB_SG_GLOBAL_BAL_001",
            display_name: "Global Balanced",
            client_id: "CIF_SG_001",
          },
          {
            portfolio_id: "PB_SG_INCOME_002",
            display_name: "Income Mandate",
            client_id: "CIF_SG_002",
          },
        ],
      },
    });
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
    expect(screen.getByRole("navigation", { name: "Workbench screen navigation" })).toHaveAttribute(
      "data-navigation-state",
      "collapsed",
    );
    expect(screen.getByRole("link", { name: /income and activity booked income/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("group", { name: "Primary workspaces" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /all workspaces/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.queryByRole("link", { name: /holdings valuation/i })).not.toBeInTheDocument();
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
    expect(navigation).toHaveAttribute("data-navigation-state", "expanded");

    fireEvent.click(screen.getByRole("button", { name: /all workspaces/i }));
    fireEvent.click(within(navigation).getByRole("link", { name: /holdings/i }));

    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(navigation).toHaveAttribute("data-navigation-state", "collapsed");
  });

  it("returns nested navigation to its closed default when the compact rail closes", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="advisory"
        modeNavigationLabel="Advisory lifecycle navigation"
        modeItems={[
          {
            key: "overview",
            label: "Overview",
            detail: "Advisor priorities",
            active: true,
            href: "/recommendations?portfolioId=PB_SG_GLOBAL_BAL_001",
          },
          {
            key: "suitability",
            label: "Suitability",
            detail: "Mandate fit",
            active: false,
            href: "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=suitability",
          },
        ]}
      />,
    );

    const railDisclosure = screen.getByRole("button", {
      name: /current view overview/i,
    });
    fireEvent.click(railDisclosure);

    const allWorkspaces = screen.getByRole("button", { name: /all workspaces/i });
    const changeStep = screen.getByRole("button", {
      name: /change workflow step/i,
    });
    fireEvent.click(allWorkspaces);
    fireEvent.click(changeStep);

    expect(allWorkspaces).toHaveAttribute("aria-expanded", "true");
    expect(changeStep).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /holdings valuation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Suitability" })).toBeInTheDocument();

    fireEvent.click(railDisclosure);
    expect(railDisclosure).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(railDisclosure);
    expect(allWorkspaces).toHaveAttribute("aria-expanded", "false");
    expect(changeStep).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /holdings valuation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Suitability" })).not.toBeInTheDocument();
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
    const performanceLink = screen.getByRole("link", { name: /performance/i });
    performanceLink.focus();
    fireEvent.keyDown(performanceLink, { key: "Escape" });

    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveFocus();
  });

  it("reveals the grouped workspace directory and restores disclosure focus on Escape", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    const allWorkspaces = screen.getByRole("button", { name: /all workspaces/i });
    fireEvent.click(allWorkspaces);

    expect(allWorkspaces).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Portfolio records")).toBeInTheDocument();
    expect(screen.getByText("Analysis")).toBeInTheDocument();
    expect(screen.getByText("Advice and proposals")).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /income and activity booked income/i }),
    ).toHaveLength(1);
    const holdingsLink = screen.getByRole("link", { name: /holdings valuation/i });
    expect(holdingsLink).toHaveAttribute(
      "href",
      "/positions?portfolioId=PB_SG_GLOBAL_BAL_001",
    );

    holdingsLink.focus();
    fireEvent.keyDown(holdingsLink, { key: "Escape" });

    expect(allWorkspaces).toHaveAttribute("aria-expanded", "false");
    expect(allWorkspaces).toHaveFocus();
    expect(screen.queryByRole("link", { name: /holdings valuation/i })).not.toBeInTheDocument();
  });

  it("keeps only the current workflow step visible until the advisor changes it", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="advisory"
        modeNavigationLabel="Advisory lifecycle navigation"
        modeItems={[
          {
            key: "overview",
            label: "Overview",
            detail: "Advisor priorities",
            active: true,
            href: "/recommendations?portfolioId=PB_SG_GLOBAL_BAL_001",
          },
          {
            key: "suitability",
            label: "Suitability",
            detail: "Mandate fit",
            active: false,
            href: "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001&mode=suitability",
          },
        ]}
      />,
    );

    const workflow = screen.getByRole("group", {
      name: "Advisory lifecycle navigation",
    });
    expect(within(workflow).getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(workflow).queryByRole("link", { name: "Suitability" })).not.toBeInTheDocument();

    const changeStep = within(workflow).getByRole("button", {
      name: /change workflow step/i,
    });
    fireEvent.click(changeStep);
    const suitability = within(workflow).getByRole("link", { name: "Suitability" });
    expect(suitability).toBeInTheDocument();

    suitability.focus();
    fireEvent.keyDown(suitability, { key: "Escape" });
    expect(changeStep).toHaveFocus();
    expect(changeStep).toHaveAttribute("aria-expanded", "false");
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
      /current view mandate health mandate management · mandate controls and exceptions/i,
    );
    fireEvent.click(disclosure);
    fireEvent.click(screen.getByRole("button", { name: "Mandate health" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
  });

  it("builds source-backed portfolio links without losing the active business task", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    openPortfolioContextOptions();
    const option = screen.getByRole("link", { name: /Income Mandate CIF_SG_002/i });

    expect(option).toHaveAttribute(
      "href",
      "/income?period=YTD&portfolioId=PB_SG_INCOME_002",
    );
    fireEvent.click(option);
    expect(window.sessionStorage.getItem("lotus:advisor-book-context-focus")).toBe("true");
  });

  it("refreshes portfolio links when the active task query changes", () => {
    usePathnameMock.mockReturnValue("/performance");
    window.history.replaceState(
      {},
      "",
      "/performance?mode=summary&period=YTD&portfolioId=PB_SG_GLOBAL_BAL_001",
    );
    const { rerender } = render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="performance"
      />,
    );
    openPortfolioContextOptions();

    expect(
      screen.getByRole("link", { name: /Income Mandate CIF_SG_002/i }),
    ).toHaveAttribute(
      "href",
      "/performance?mode=summary&period=YTD&portfolioId=PB_SG_INCOME_002",
    );

    window.history.replaceState(
      {},
      "",
      "/performance?mode=risk&period=YTD&portfolioId=PB_SG_GLOBAL_BAL_001",
    );
    rerender(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="performance"
      />,
    );

    expect(
      screen.getByRole("link", { name: /Income Mandate CIF_SG_002/i }),
    ).toHaveAttribute(
      "href",
      "/performance?mode=risk&period=YTD&portfolioId=PB_SG_INCOME_002",
    );
  });

  it("loads own-book options only when the advisor opens portfolio context", () => {
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    expect(useAdvisorBookMock).not.toHaveBeenCalled();

    openPortfolioContextOptions();

    expect(useAdvisorBookMock).toHaveBeenCalledOnce();
  });

  it("does not claim membership when the selected portfolio is outside the returned book page", () => {
    render(
      <PortfolioScreenRail portfolioId="UNCONFIRMED" activeScreen="income" />,
    );

    openPortfolioContextOptions();
    expect(screen.getByText(/not confirmed in the returned own-book page/i)).toBeInTheDocument();
  });

  it("restores keyboard focus after a portfolio context change", () => {
    window.sessionStorage.setItem("lotus:advisor-book-context-focus", "true");
    render(
      <PortfolioScreenRail
        portfolioId="PB_SG_GLOBAL_BAL_001"
        activeScreen="income"
      />,
    );

    expect(screen.getByLabelText("Change portfolio")).toHaveFocus();
    expect(window.sessionStorage.getItem("lotus:advisor-book-context-focus")).toBeNull();
  });
});
