import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import ProposalListView from "../../src/features/proposals/components/proposal-list-view";

vi.mock("../../src/features/proposals/api", () => ({
  listProposals: vi.fn(async () => ({
    items: [{ proposal_id: "pp_1", current_state: "DRAFT" }],
  })),
}));

describe("ProposalListView", () => {
  it("renders proposal rows", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalListView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/ID:\s*PP-7720/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Storyboard Mode/)).toBeInTheDocument();
    expect(screen.getByText(/DRAFT: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Cash Deployment Plan/)).toBeInTheDocument();
    expect(screen.getByText(/Next:\s*Submit for risk or compliance review/i)).toBeInTheDocument();
  });
});
