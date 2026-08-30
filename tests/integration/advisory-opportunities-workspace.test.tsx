import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdvisoryOpportunitiesWorkspace from "../../src/features/proposals/components/advisory-opportunities-workspace";
import type { WorkspaceReviewContext } from "../../src/shell/review-context";

function reviewContext(portfolioId: string): WorkspaceReviewContext {
  return {
    portfolioId,
    asOfDate: "2026-04-10",
    period: "YTD",
    reportingCurrency: "SGD",
  };
}

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
const getAdvisorIdeaCandidateDetailMock = vi.fn(async (_filters?: unknown) => ({
  candidate: {
    candidateId: "idea_high_cash_001",
    family: "high_cash",
    lifecycleStatus: "generated",
    reviewPosture: "advisor_review_required",
  },
  evidence: {
    supportability: "ready",
    sourceRefs: [{ productId: "lotus-core:PortfolioStateSnapshot:v1" }],
  },
  auditSummary: { eventCount: 1 },
  durableStorageBacked: true,
  supportedFeaturePromoted: false,
}));
const recordAdvisorIdeaReviewActionMock = vi.fn(async (_input?: unknown) => ({
  persistence: { decision: "accepted" },
  durableStorageBacked: true,
  supportedFeaturePromoted: false,
}));
const recordAdvisorIdeaFeedbackMock = vi.fn(async (_input?: unknown) => ({
  persistence: { decision: "accepted" },
  durableStorageBacked: true,
  supportedFeaturePromoted: false,
}));
const recordAdvisorIdeaConversionIntentMock = vi.fn(
  async (_input?: unknown) => ({
    persistence: { decision: "accepted" },
    durableStorageBacked: true,
    supportedFeaturePromoted: false,
  }),
);

vi.mock("../../src/features/proposals/api", () => ({
  getAdvisorIdeaCandidateDetail: (filters: unknown) =>
    getAdvisorIdeaCandidateDetailMock(filters),
  getAdvisorIdeaReviewQueue: (filters: unknown) =>
    getAdvisorIdeaReviewQueueMock(filters),
  recordAdvisorIdeaReviewAction: (input: unknown) =>
    recordAdvisorIdeaReviewActionMock(input),
  recordAdvisorIdeaFeedback: (input: unknown) =>
    recordAdvisorIdeaFeedbackMock(input),
  recordAdvisorIdeaConversionIntent: (input: unknown) =>
    recordAdvisorIdeaConversionIntentMock(input),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("AdvisoryOpportunitiesWorkspace", () => {
  beforeEach(() => {
    getAdvisorIdeaCandidateDetailMock.mockClear();
    getAdvisorIdeaReviewQueueMock.mockClear();
    recordAdvisorIdeaReviewActionMock.mockClear();
    recordAdvisorIdeaFeedbackMock.mockClear();
    recordAdvisorIdeaConversionIntentMock.mockClear();
  });

  it("loads Gateway-backed Lotus Idea candidates", async () => {
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
      />,
    );

    await waitFor(() => {
      expect(getAdvisorIdeaReviewQueueMock).toHaveBeenCalledWith({
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
    });

    expect(
      await screen.findByRole("heading", {
        level: 2,
        name: "Opportunities And Ideas",
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Idea candidates")).toHaveTextContent(
      /1\s*Idea candidates/,
    );
    expect(screen.getByLabelText("Idea worklist evidence status")).toHaveTextContent(
      "Policy: idea-deterministic-ranking-v1",
    );
    expect(
      screen.getByText("High Cash - idea_high_cash_001"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("table", { name: "Idea candidate review queue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "High Cash - idea_high_cash_001" }),
    ).toHaveAttribute(
      "href",
      "/recommendations?mode=opportunities&portfolioId=PB_SG_GLOBAL_BAL_001&candidateId=idea_high_cash_001",
    );
    expect(screen.getByText("Advisor Review Required")).toBeInTheDocument();
    expect(screen.getByText("signal_high_cash_001")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Proposal Builder" }),
    ).toHaveAttribute(
      "href",
      "/proposals/simulate?portfolioId=PB_SG_GLOBAL_BAL_001&asOfDate=2026-04-10&period=YTD&reportingCurrency=SGD",
    );
  });

  it("explains the supported opportunity-review scope in business language", () => {
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_UNCERTIFIED_001"
        reviewContext={reviewContext("PB_UNCERTIFIED_001")}
      />,
    );

    expect(
      screen.getByText(
        "Advisory opportunity review is not available for this portfolio",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Select the supported demonstration portfolio before opening the opportunity queue.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("PB_SG_GLOBAL_BAL_001")).not.toBeInTheDocument();
    expect(getAdvisorIdeaReviewQueueMock).not.toHaveBeenCalled();
  });

  it("loads selected candidate detail through the scoped Gateway helper", async () => {
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
        selectedCandidateId="idea_high_cash_001"
      />,
    );

    expect(
      await screen.findByLabelText("Idea candidate source-safe detail"),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(getAdvisorIdeaCandidateDetailMock).toHaveBeenCalledWith({
        candidateId: "idea_high_cash_001",
        portfolioId: "PB_SG_GLOBAL_BAL_001",
      });
    });
    expect(screen.getByText("Lifecycle: Generated")).toBeInTheDocument();
    expect(screen.getByText("Sources: 1")).toBeInTheDocument();
    expect(
      screen.getByText("Source refs: lotus-core:PortfolioStateSnapshot:v1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Source signals: signal_high_cash_001"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Queue policy: idea-deterministic-ranking-v1"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Queue evaluated: 2026-06-21T10:10:00Z"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Evidence hash: Not provided by Idea detail contract",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Close detail" })).toHaveAttribute(
      "href",
      "/recommendations?mode=opportunities&portfolioId=PB_SG_GLOBAL_BAL_001",
    );
  });

  it("shows no fallback ideas when the Idea queue fails", async () => {
    getAdvisorIdeaReviewQueueMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );

    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
      />,
    );

    expect(
      await screen.findByText(
        "Idea candidates are unavailable. No fallback opportunity list is shown.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Idea queue unavailable")).toBeInTheDocument();
    expect(
      screen.queryByText("High Cash - idea_high_cash_001"),
    ).not.toBeInTheDocument();
  });

  it("records an advisor review through Gateway and refreshes source-owned detail", async () => {
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
        selectedCandidateId="idea_high_cash_001"
      />,
    );

    await screen.findByLabelText("Idea candidate advisor actions");
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));

    await waitFor(() => {
      expect(recordAdvisorIdeaReviewActionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          candidateId: "idea_high_cash_001",
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          request: expect.objectContaining({
            action: "approve_for_conversion",
            reasonCodes: [
              "review_approved_for_conversion",
              "high_cash_ratio",
            ],
          }),
        }),
      );
    });
    const recordedStatus = await screen.findByTestId(
      "idea-action-review-status",
    );
    expect(recordedStatus).toHaveAttribute(
      "data-action-state",
      "recorded-and-refreshed",
    );
    expect(recordedStatus).toHaveTextContent(
      "Review saved. Opportunity detail and worklist are current.",
    );
    expect(recordAdvisorIdeaConversionIntentMock).not.toHaveBeenCalled();
  });

  it("warns when a recorded advisor action cannot refresh source-owned posture", async () => {
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
        selectedCandidateId="idea_high_cash_001"
      />,
    );

    await screen.findByLabelText("Idea candidate advisor actions");
    getAdvisorIdeaReviewQueueMock.mockRejectedValueOnce(
      new Error("source refresh unavailable"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));

    const refreshStatus = await screen.findByTestId(
      "idea-action-review-status",
    );
    expect(refreshStatus).toHaveAttribute(
      "data-action-state",
      "recorded-refresh-failed",
    );
    expect(refreshStatus).toHaveTextContent(
      "Review was saved, but the latest opportunity detail and worklist could not be loaded.",
    );
    expect(refreshStatus).not.toHaveTextContent(
      "Opportunity detail and worklist are current.",
    );
  });

  it("shows an explicit failure state when Gateway cannot record an action", async () => {
    recordAdvisorIdeaFeedbackMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
        selectedCandidateId="idea_high_cash_001"
      />,
    );

    await screen.findByLabelText("Idea candidate advisor actions");
    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));

    const error = await screen.findByTestId("idea-action-error");
    expect(error).toHaveAttribute("data-action-state", "not-recorded");
    expect(error).toHaveTextContent(
      "Workbench could not verify the saved feedback against source evidence.",
    );
  });

  it("retries a failed advisor action with the original idempotent submission", async () => {
    recordAdvisorIdeaReviewActionMock.mockRejectedValueOnce(
      new Error("gateway unavailable"),
    );
    renderWithQueryClient(
      <AdvisoryOpportunitiesWorkspace
        portfolioId="PB_SG_GLOBAL_BAL_001"
        reviewContext={reviewContext("PB_SG_GLOBAL_BAL_001")}
        selectedCandidateId="idea_high_cash_001"
      />,
    );

    await screen.findByLabelText("Idea candidate advisor actions");
    const reviewForm = screen
      .getByRole("heading", { name: "Record review" })
      .closest("form");
    expect(reviewForm).not.toBeNull();
    const reviewControls = within(reviewForm!);
    fireEvent.click(
      reviewControls.getByRole("button", { name: "Record review" }),
    );

    const error = await screen.findByTestId("idea-action-error");
    expect(error).toHaveAttribute("data-action-state", "not-recorded");
    expect(error).toHaveTextContent(
      "We could not confirm that the adviser action was saved.",
    );
    const firstSubmission = recordAdvisorIdeaReviewActionMock.mock.calls[0][0];
    fireEvent.change(reviewControls.getByLabelText("Review action"), {
      target: { value: "reject" },
    });
    fireEvent.click(
      reviewControls.getByRole("button", { name: "Record review" }),
    );

    await waitFor(() => {
      expect(recordAdvisorIdeaReviewActionMock).toHaveBeenCalledTimes(2);
    });
    expect(recordAdvisorIdeaReviewActionMock.mock.calls[1][0]).toEqual(
      firstSubmission,
    );
  });
});
