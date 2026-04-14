import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioContextModule from "../../src/apps/portfolio/modules/portfolio-context/portfolio-context-module";
import PortfolioReadinessModule from "../../src/apps/portfolio/modules/portfolio-readiness/portfolio-readiness-module";

const workspace = {
  portfolio: {
    portfolio_id: "PB_SG_GLOBAL_BAL_001",
    client_id: "CIF_1001",
    base_currency: "USD",
    booking_center_code: "SG",
  },
  profile: {
    advisor_id: "RM_123",
    open_date: "2025-01-15",
  },
  readiness: {
    reporting: {
      status: "PARTIAL",
    },
  },
  operations: {
    latest_booked_transaction_date: "2026-02-20",
    latest_booked_position_snapshot_date: "2026-02-24",
  },
};

describe("portfolio side rail modules", () => {
  it("renders portfolio context as grouped definition-list detail content with copy actions", () => {
    const onCopy = vi.fn();

    render(
      <PortfolioContextModule
        workspace={workspace as any}
        context={{ selectedAsOfDate: "2026-02-24" } as any}
        copiedField={null}
        onCopy={onCopy}
      />
    );

    expect(screen.getByRole("heading", { name: "Portfolio Context" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Identity" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Book Setup" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      expect.arrayContaining(["Portfolio", "Client", "Base Currency", "As of"])
    );
    expect(screen.getByText("PB_SG_GLOBAL_BAL_001")).toHaveClass("workbench-definition-value");

    fireEvent.click(screen.getByRole("button", { name: "Copy Portfolio" }));
    expect(onCopy).toHaveBeenCalledWith("portfolio", "PB_SG_GLOBAL_BAL_001");
  });

  it("renders readiness exceptions as an accessible list and operational dates as definitions", () => {
    const onOpenException = vi.fn();

    render(
      <PortfolioReadinessModule
        workspace={workspace as any}
        showDetailFootnote
        onOpenException={onOpenException}
        exceptions={[
          {
            key: "pricing",
            title: "Pricing coverage incomplete",
            detail: "One position still needs current pricing.",
            tone: "warn",
            href: "#portfolio-attention",
          },
        ]}
      />
    );

    const exceptionList = screen.getByRole("list", { name: "Readiness exceptions" });
    expect(within(exceptionList).getAllByRole("listitem")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Pricing coverage incomplete/i }));
    expect(onOpenException).toHaveBeenCalledWith(
      expect.objectContaining({ key: "pricing", title: "Pricing coverage incomplete" })
    );

    const operationalDates = screen.getByLabelText("Readiness operational dates");
    expect(within(operationalDates).getByText("Latest transaction")).toHaveClass("workbench-definition-term");
    expect(within(operationalDates).getByText("20 Feb 2026")).toHaveClass("workbench-definition-value");
  });
});
