import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import AdvisoryOpportunitiesWorkspace from "../../src/features/proposals/components/advisory-opportunities-workspace";

const listProposalsMock = vi.fn(async (_filters?: unknown) => ({
  items: [
    {
      proposal_id: "PRP-DRAFT",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "DRAFT",
      title: "Emerging markets sleeve",
      created_by: "rm_1",
      created_at: "2026-05-25T01:00:00Z",
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

describe("AdvisoryOpportunitiesWorkspace", () => {
  it("loads draft proposals as advisory ideas", async () => {
    renderWithQueryClient(<AdvisoryOpportunitiesWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    await waitFor(() => {
      expect(listProposalsMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        state: "DRAFT",
      });
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Opportunities And Ideas" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Draft advisory ideas")).toHaveTextContent(/1\s*Draft ideas/);
    expect(screen.getByText("Emerging markets sleeve")).toBeInTheDocument();
    expect(screen.getByText("Submit for risk or compliance review")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start New Idea" })).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });

  it("shows no fallback ideas when the draft queue fails", async () => {
    listProposalsMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(<AdvisoryOpportunitiesWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    expect(
      await screen.findByText("Advisory ideas are unavailable. No fallback opportunity list is shown.")
    ).toBeInTheDocument();
    expect(screen.getByText("Idea queue unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Emerging markets sleeve")).not.toBeInTheDocument();
  });
});
