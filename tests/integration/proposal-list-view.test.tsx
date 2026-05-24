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
      expect(screen.getByText(/ID:\s*pp_1/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Live Queue Mode/)).toBeInTheDocument();
    expect(screen.getByLabelText("Advisory queue summary")).toHaveTextContent(/DRAFT\s*1/);
    expect(screen.getByRole("columnheader", { name: "Next Action" })).toBeInTheDocument();
    expect(screen.getAllByText(/pp_1/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Submit for risk or compliance review/i).length).toBeGreaterThan(0);
  });

  it("supports advisory workspace copy and portfolio-scoped draft entry", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ProposalListView
          initialPortfolioId="PB_SG_GLOBAL_BAL_001"
          title="Advisory Workspace"
          subtitle="Review live advisory proposals."
          createDraftHref="/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001"
        />
      </QueryClientProvider>
    );

    expect(
      await screen.findByRole("heading", { level: 2, name: "Advisory Workspace" })
    ).toBeInTheDocument();
    expect(screen.getByText("Review live advisory proposals.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create Draft" })).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });
});
