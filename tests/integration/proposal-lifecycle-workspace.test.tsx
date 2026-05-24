import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import ProposalLifecycleWorkspace from "../../src/features/proposals/components/proposal-lifecycle-workspace";

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
      title: "Execution handoff",
    },
  ],
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

describe("ProposalLifecycleWorkspace", () => {
  it("renders a focused risk and impact screen from proposal lifecycle data", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="risk-impact" />
    );

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
    });

    expect(await screen.findByRole("heading", { level: 2, name: "Risk And Impact" })).toBeInTheDocument();
    expect(screen.getByText("Technology concentration trim")).toBeInTheDocument();
    expect(screen.queryByText("Execution handoff")).not.toBeInTheDocument();
    expect(screen.getByText("Risk officer approval needed")).toBeInTheDocument();
    expect(screen.getByLabelText("Proposal lifecycle counts")).toHaveTextContent(/1\s*In view/);
  });

  it("does not show fallback rows when lifecycle data is unavailable", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="approval-queue" />
    );

    expect(
      await screen.findByText("Proposal lifecycle is unavailable. No fallback proposal queue is shown.")
    ).toBeInTheDocument();
    expect(screen.getByText("Proposal lifecycle unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Technology concentration trim")).not.toBeInTheDocument();
  });
});
