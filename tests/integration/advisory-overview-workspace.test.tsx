import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
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
      });
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Advisory Overview" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisory overview summary")).toHaveTextContent(
      /Open Proposals\s*2/
    );
    expect(screen.getByText("Resolve review blockers before preparing any client discussion material.")).toBeInTheDocument();
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
  });

  it("does not show fallback proposals when the advisory queue fails", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(<AdvisoryOverviewWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    expect(
      await screen.findByText("Advisory proposal posture is unavailable. No fallback proposals are shown.")
    ).toBeInTheDocument();
    expect(screen.getByText("Advisory queue unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Technology concentration trim")).not.toBeInTheDocument();
  });
});
