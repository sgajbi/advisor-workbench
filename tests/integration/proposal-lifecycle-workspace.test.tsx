import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalLifecycleWorkspace from "../../src/features/proposals/components/proposal-lifecycle-workspace";

const proposalListFixture = {
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
};
const policyReviewQueueFixture = {
  items: [
    {
      evaluation_id: "pev_001",
      proposal_id: "PRP-RISK",
      proposal_version_id: "ppv_001",
      policy_pack_id: "SG_PRIVATE_BANKING_REFERENCE",
      policy_version: "2026.05",
      evaluation_status: "PENDING_REVIEW",
      approval_dependencies: ["COMPLIANCE_REVIEW:SG_STRUCTURED_NOTE"],
      disclosure_requirements: ["advisor_reviewed_disclosure:SG_STRUCTURED_NOTE"],
      source_gaps: ["client_consent:SG_STRUCTURED_NOTE"],
    },
  ],
};
const listProposalsMock = vi.fn(async (_filters?: unknown) => proposalListFixture);
const getAdvisoryPolicyReviewQueueMock = vi.fn(
  async (_status?: string) => policyReviewQueueFixture
);

vi.mock("../../src/features/proposals/api", () => ({
  getAdvisoryPolicyReviewQueue: (status: string) => getAdvisoryPolicyReviewQueueMock(status),
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
  beforeEach(() => {
    listProposalsMock.mockReset();
    listProposalsMock.mockImplementation(async (_filters?: unknown) => proposalListFixture);
    getAdvisoryPolicyReviewQueueMock.mockReset();
    getAdvisoryPolicyReviewQueueMock.mockImplementation(
      async (_status?: string) => policyReviewQueueFixture
    );
  });

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

  it("renders Gateway-backed suitability policy evaluations without raw policy payload language", async () => {
    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    await waitFor(() => {
      expect(getAdvisoryPolicyReviewQueueMock).toHaveBeenCalledWith("PENDING_REVIEW");
    });

    expect(await screen.findByRole("heading", { level: 3, name: "Policy evaluations needing review" })).toBeInTheDocument();
    expect(screen.getByText("Review required")).toBeInTheDocument();
    expect(screen.getByText("Sign-off pending")).toBeInTheDocument();
    expect(screen.getByText("1 approval dependency, 1 disclosure review")).toBeInTheDocument();
    expect(screen.getByText("Complete required approval review.")).toBeInTheDocument();
    expect(screen.queryByText("PENDING_REVIEW")).not.toBeInTheDocument();
    expect(screen.queryByText("advisor_reviewed_disclosure:SG_STRUCTURED_NOTE")).not.toBeInTheDocument();
    expect(screen.queryByText("advisory-policy-evaluations")).not.toBeInTheDocument();
  });

  it("does not show fallback policy evaluations when the suitability queue is unavailable", async () => {
    getAdvisoryPolicyReviewQueueMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(
      <ProposalLifecycleWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" mode="suitability" />
    );

    expect(await screen.findByText("Policy review queue is unavailable. No fallback suitability policy queue is shown.")).toBeInTheDocument();
    expect(screen.getByText("Policy review queue unavailable")).toBeInTheDocument();
    expect(screen.queryByText("Review required")).not.toBeInTheDocument();
  });
});
