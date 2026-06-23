import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import AdvisoryOpportunitiesWorkspace from "../../src/features/proposals/components/advisory-opportunities-workspace";

const getAdvisorIdeaReviewQueueMock = vi.fn(async (_filters?: unknown) => ({
  policyVersion: "idea-deterministic-ranking-v1",
  evaluatedAtUtc: "2026-06-21T10:10:00Z",
  durableStorageBacked: true,
  supportedFeaturePromoted: false,
  exclusions: [],
  items: [
    {
      rank: 1,
      score: "82",
      priorityBucket: "high",
      reasonCodes: ["high_cash_ratio", "review_required"],
      candidate: {
        candidateId: "idea_high_cash_001",
        family: "high_cash",
        reviewPosture: "advisor_review_required",
        score: "82",
        sourceSignalIds: ["signal_high_cash_001"],
      },
    },
  ],
}));

vi.mock("../../src/features/proposals/api", () => ({
  getAdvisorIdeaReviewQueue: (filters: unknown) => getAdvisorIdeaReviewQueueMock(filters),
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
  it("loads Gateway-backed Lotus Idea candidates", async () => {
    renderWithQueryClient(<AdvisoryOpportunitiesWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    await waitFor(() => {
      expect(getAdvisorIdeaReviewQueueMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
    });

    expect(
      await screen.findByRole("heading", { level: 2, name: "Opportunities And Ideas" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Idea candidates")).toHaveTextContent(/1\s*Idea candidates/);
    expect(screen.getByLabelText("Idea queue proof posture")).toHaveTextContent(
      "Policy: idea-deterministic-ranking-v1"
    );
    expect(screen.getByText("High Cash - idea_high_cash_001")).toBeInTheDocument();
    expect(screen.getByText("Advisor Review Required")).toBeInTheDocument();
    expect(screen.getByText("signal_high_cash_001")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Proposal Builder" })).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001"
    );
  });

  it("shows no fallback ideas when the Idea queue fails", async () => {
    getAdvisorIdeaReviewQueueMock.mockRejectedValueOnce(new Error("gateway unavailable"));

    renderWithQueryClient(<AdvisoryOpportunitiesWorkspace portfolioId="PB_SG_GLOBAL_BAL_001" />);

    expect(
      await screen.findByText("Idea candidates are unavailable. No fallback opportunity list is shown.")
    ).toBeInTheDocument();
    expect(screen.getByText("Idea queue unavailable")).toBeInTheDocument();
    expect(screen.queryByText("High Cash - idea_high_cash_001")).not.toBeInTheDocument();
  });
});
