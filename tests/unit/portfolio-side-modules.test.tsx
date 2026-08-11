import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PortfolioContextModule from "../../src/apps/portfolio/modules/portfolio-context/portfolio-context-module";
import PortfolioReadinessModule from "../../src/apps/portfolio/modules/portfolio-readiness/portfolio-readiness-module";
import PortfolioWorkspaceSideRail, {
  PortfolioWorkspaceStateSideRail,
} from "../../src/apps/portfolio/components/portfolio-workspace-side-rail";
import type { PortfolioWorkspace } from "../../src/apps/portfolio/types";
import {
  buildPortfolioWorkspace,
  buildPortfolioWorkspaceContext,
} from "../fixtures/portfolio-workspace-component-fixtures";

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
  it.each(["READY", "COMPLETE"])(
    "hides attention-only reporting readiness for resolved %s source status",
    (status) => {
      render(
        <PortfolioReadinessModule
          workspace={
            {
              ...workspace,
              readiness: { reporting: { status } },
            } as PortfolioWorkspace
          }
          showDetailFootnote={false}
          onOpenException={vi.fn()}
          exceptions={[]}
        />
      );

      expect(
        screen.queryByRole("heading", { name: "Reporting Readiness" })
      ).not.toBeInTheDocument();
    }
  );

  it("keeps unresolved reporting status visible when no detailed exception is supplied", () => {
    render(
      <PortfolioReadinessModule
        workspace={workspace as PortfolioWorkspace}
        showDetailFootnote={false}
        onOpenException={vi.fn()}
        exceptions={[]}
      />
    );

    expect(screen.getByRole("heading", { name: "Reporting Readiness" })).toBeInTheDocument();
    expect(screen.getByText("Reporting prerequisites need attention")).toBeInTheDocument();
  });

  it("keeps source exceptions visible even when reporting status is resolved", () => {
    render(
      <PortfolioReadinessModule
        workspace={
          {
            ...workspace,
            readiness: { reporting: { status: "COMPLETE" } },
          } as PortfolioWorkspace
        }
        showDetailFootnote={false}
        onOpenException={vi.fn()}
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

    expect(screen.getByRole("heading", { name: "Reporting Readiness" })).toBeInTheDocument();
    expect(screen.getByText("Pricing coverage incomplete")).toBeInTheDocument();
  });

  it("renders portfolio context as grouped definition-list detail content with copy actions", () => {
    const onCopy = vi.fn();

    render(
      <PortfolioContextModule
        workspace={workspace as PortfolioWorkspace}
        copiedField={null}
        onCopy={onCopy}
      />
    );

    expect(screen.getByRole("heading", { name: "Book Context" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Identity" })).toBeInTheDocument();
    expect(screen.getAllByRole("term").map((term) => term.textContent)).toEqual(
      expect.arrayContaining(["Portfolio", "Client", "Relationship Manager", "Booking Centre"])
    );
    expect(screen.getByText("PB_SG_GLOBAL_BAL_001")).toHaveClass("workbench-definition-value");

    fireEvent.click(screen.getByRole("button", { name: "Copy Portfolio" }));
    expect(onCopy).toHaveBeenCalledWith("portfolio", "PB_SG_GLOBAL_BAL_001");
  });

  it("renders readiness exceptions as an accessible list and operational dates as definitions", () => {
    const onOpenException = vi.fn();

    render(
      <PortfolioReadinessModule
        workspace={workspace as PortfolioWorkspace}
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

  it("composes evidence, context, readiness, and actions in the portfolio workspace side rail", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText },
    });
    const onOpenException = vi.fn();
    const actions = [
      {
        sequence: 1,
        title: "Review proposal",
        impact: "Confirm allocation drift before client review.",
        target: "Performance",
        href: "/performance",
        cta_label: "Performance",
        recommended: true,
      },
    ];

    render(
      <PortfolioWorkspaceSideRail
        workspace={buildPortfolioWorkspace()}
        context={buildPortfolioWorkspaceContext({ viewMode: "detailed" })}
        exceptions={[
          {
            key: "pricing",
            title: "Pricing coverage incomplete",
            detail: "One position still needs current pricing.",
            tone: "warn",
            href: "#portfolio-attention",
          },
        ]}
        actions={actions}
        showDetailFootnote
        onOpenException={onOpenException}
      />
    );

    expect(screen.getByRole("heading", { name: "Recommended Actions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reporting Readiness" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Book Context" })).toBeInTheDocument();
    expect(screen.getByText("Review Evidence")).toBeInTheDocument();
    expect(screen.getByText("Review proposal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy Portfolio" }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("PB_SG_GLOBAL_BAL_001");
    });

    fireEvent.click(screen.getByRole("button", { name: /Pricing coverage incomplete/i }));
    expect(onOpenException).toHaveBeenCalledWith(expect.objectContaining({ key: "pricing" }));
  });

  it("keeps loading and terminal side guidance informative without duplicating recovery actions", () => {
    const { rerender } = render(<PortfolioWorkspaceStateSideRail status="loading" />);

    expect(screen.getByText("Portfolio selection")).toBeInTheDocument();
    expect(screen.getByText(/before review evidence is shown/i)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(<PortfolioWorkspaceStateSideRail status="unavailable" />);

    expect(screen.getByText("If this remains unavailable")).toBeInTheDocument();
    expect(screen.getByText(/review date and work area—not client data/i)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("replaces and cancels copy-status timers before unmount", async () => {
    vi.useFakeTimers();
    try {
      const setTimeoutSpy = vi.spyOn(window, "setTimeout");
      const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, { clipboard: { writeText } });
      const { unmount } = render(
        <PortfolioWorkspaceSideRail
          workspace={buildPortfolioWorkspace()}
          context={buildPortfolioWorkspaceContext()}
          exceptions={[]}
          actions={[]}
          showDetailFootnote={false}
          onOpenException={vi.fn()}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: "Copy Portfolio" }));
      await act(async () => Promise.resolve());
      const firstResetTimerIndex = setTimeoutSpy.mock.calls.findIndex(
        ([, delay]) => delay === 1600,
      );
      expect(firstResetTimerIndex).toBeGreaterThanOrEqual(0);
      const firstResetTimerId = setTimeoutSpy.mock.results[firstResetTimerIndex].value;

      fireEvent.click(screen.getByRole("button", { name: "Copy Client" }));
      await act(async () => Promise.resolve());
      const secondResetTimerIndex = setTimeoutSpy.mock.calls.findIndex(
        ([, delay], index) => index > firstResetTimerIndex && delay === 1600,
      );
      expect(secondResetTimerIndex).toBeGreaterThan(firstResetTimerIndex);
      const secondResetTimerId = setTimeoutSpy.mock.results[secondResetTimerIndex].value;
      expect(clearTimeoutSpy).toHaveBeenCalledWith(firstResetTimerId);

      unmount();
      expect(clearTimeoutSpy).toHaveBeenCalledWith(secondResetTimerId);
    } finally {
      vi.restoreAllMocks();
      vi.useRealTimers();
    }
  });
});
