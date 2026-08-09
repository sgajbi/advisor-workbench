import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import AdvisoryOverviewWorkspace from "../../src/features/proposals/components/advisory-overview-workspace";

const listProposalsMock = vi.fn(async (_filters?: unknown) => ({
  items: [
    {
      proposal_id: "PRP-RISK",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "RISK_REVIEW",
      title: "Technology concentration trim",
    },
    {
      proposal_id: "PRP-READY",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "EXECUTION_READY",
      title: "Implementation handoff",
    },
  ],
  next_cursor: null as string | null,
}));

vi.mock("../../src/features/proposals/api", () => ({
  listProposals: (filters: unknown) => listProposalsMock(filters),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("AdvisoryOverviewWorkspace", () => {
  it("renders portfolio-scoped advisory posture and priority actions", async () => {
    renderWithQueryClient(<AdvisoryOverviewWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        cursor: undefined,
        limit: 8,
      });
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Advisor Priorities" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisory overview summary")).toHaveTextContent(
      /Visible Proposals\s*2/
    );
    expect(screen.getByText("Resolve review blockers before preparing any client discussion material.")).toBeInTheDocument();
    expect(screen.getByTestId("advisory-lifecycle-summary")).toHaveTextContent(
      /Identify.*Construct.*Review & discuss.*Implement/
    );
    expect(screen.queryByLabelText("Advisory journey screens")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Build Proposal" })).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
    expect(screen.getByRole("link", { name: "Open Approval Queue" })).toHaveAttribute(
      "href",
      "/proposals?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
    expect(screen.getByText("Technology concentration trim")).toBeInTheDocument();
    expect(screen.getByText("Risk officer approval needed")).toBeInTheDocument();
    expect(screen.getByTestId("advisory-source-window-posture")).toHaveTextContent(
      "Complete source window"
    );
  });

  it("does not show fallback proposals when the advisory queue fails", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(<AdvisoryOverviewWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    expect(await screen.findByText("Advisory priorities are unavailable")).toBeInTheDocument();
    expect(
      screen.getByText("No fallback proposal, review, or implementation posture is shown.")
    ).toBeInTheDocument();
    expect(screen.queryByText("Technology concentration trim")).not.toBeInTheDocument();
  });

  it("discloses a partial proposal window instead of overstating portfolio totals", async () => {
    listProposalsMock.mockResolvedValueOnce({
      items: [
        {
          proposal_id: "PRP-PARTIAL",
          portfolio_id: "PB_SG_GLOBAL_BAL_001",
          current_state: "DRAFT",
          title: "Income allocation review",
        },
      ],
      next_cursor: "cursor-2",
    });

    renderWithQueryClient(<AdvisoryOverviewWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    expect(await screen.findByText("Income allocation review")).toBeInTheDocument();
    expect(screen.getByTestId("advisory-source-window-posture")).toHaveTextContent(
      /Proposal window 1.*Counts and ranking apply only/
    );
    expect(screen.getByLabelText("Advisory overview summary")).toHaveTextContent(
      /Visible Proposals\s*1.*additional proposals may sit outside this view/
    );
    expect(screen.getByRole("button", { name: "Next proposals" })).toBeEnabled();
  });

  it("keeps restricted proposal posture behind the source entitlement boundary", async () => {
    listProposalsMock.mockRejectedValueOnce(
      new Error("Proposal list failed (403): forbidden")
    );

    renderWithQueryClient(<AdvisoryOverviewWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    expect(
      await screen.findByText("Advisory proposal access is not available")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("advisory-priority-worklist")).not.toBeInTheDocument();
  });

  it("lets the advisor return after a later proposal window fails", async () => {
    listProposalsMock
      .mockResolvedValueOnce({
        items: [],
        next_cursor: "cursor-2",
      })
      .mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(<AdvisoryOverviewWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    fireEvent.click(await screen.findByRole("button", { name: "Next proposals" }));
    expect(await screen.findByText("This proposal window is unavailable")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Return to previous proposals" }));
    expect(await screen.findByText("No proposals in this source window")).toBeInTheDocument();
    expect(screen.getByText("Proposal view 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next proposals" })).toBeEnabled();
  });
});
