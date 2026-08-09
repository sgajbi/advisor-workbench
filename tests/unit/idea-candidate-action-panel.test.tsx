import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IdeaCandidateActionPanel from "../../src/features/proposals/components/idea-candidate-action-panel";

const ideaApi = vi.hoisted(() => ({
  recordAdvisorIdeaConversionIntent: vi.fn(),
  recordAdvisorIdeaFeedback: vi.fn(),
  recordAdvisorIdeaReviewAction: vi.fn(),
}));

vi.mock("../../src/features/proposals/api", () => ideaApi);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderPanel(onRecorded: () => Promise<boolean>) {
  return render(
    <IdeaCandidateActionPanel
      candidateId="idea_high_cash_001"
      candidateReasonCodes={["high_cash_ratio", "review_required"]}
      portfolioId="PB_SG_GLOBAL_BAL_001"
      onRecorded={onRecorded}
    />,
    { wrapper },
  );
}

describe("IdeaCandidateActionPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows persisted success only after source detail and queue refresh complete", async () => {
    let completeRefresh: ((result: boolean) => void) | undefined;
    const onRecorded = vi.fn(
      async () =>
        await new Promise<boolean>((resolve) => {
          completeRefresh = resolve;
        }),
    );
    ideaApi.recordAdvisorIdeaFeedback.mockResolvedValue({
      durableStorageBacked: true,
    });
    renderPanel(onRecorded);

    const feedbackBasis = screen.getByLabelText("Feedback basis");
    expect(feedbackBasis).toHaveValue("high_cash_ratio");
    expect(feedbackBasis).not.toHaveAttribute("tabindex", "-1");
    fireEvent.change(feedbackBasis, { target: { value: "review_required" } });
    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));

    await waitFor(() => expect(onRecorded).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByTestId("idea-action-feedback-status"),
    ).not.toBeInTheDocument();
    expect(ideaApi.recordAdvisorIdeaFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        candidateId: "idea_high_cash_001",
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        request: expect.objectContaining({
          outcome: "useful",
          reasonCodes: ["feedback_recorded", "review_required"],
        }),
      }),
    );

    completeRefresh?.(true);
    const status = await screen.findByTestId("idea-action-feedback-status");
    expect(status).toHaveAttribute(
      "data-action-state",
      "recorded-and-refreshed",
    );
    expect(status).toHaveTextContent(
      "Feedback recorded through Gateway. Source-owned detail and queue posture have been refreshed.",
    );
  });

  it("keeps failure explicit and reuses the original payload and idempotency key", async () => {
    const onRecorded = vi.fn(async () => true);
    ideaApi.recordAdvisorIdeaFeedback
      .mockRejectedValueOnce(new Error("source validation failed"))
      .mockResolvedValueOnce({ durableStorageBacked: true });
    renderPanel(onRecorded);

    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));
    const error = await screen.findByTestId("idea-action-error");
    expect(error).toHaveAttribute("data-action-state", "not-recorded");
    expect(error).toHaveTextContent("could not be recorded through Gateway");
    expect(onRecorded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));
    await screen.findByTestId("idea-action-feedback-status");

    const firstInput = ideaApi.recordAdvisorIdeaFeedback.mock.calls[0][0];
    const retryInput = ideaApi.recordAdvisorIdeaFeedback.mock.calls[1][0];
    expect(retryInput.idempotencyKey).toBe(firstInput.idempotencyKey);
    expect(retryInput.request).toEqual(firstInput.request);
    expect(onRecorded).toHaveBeenCalledTimes(1);
  });
});
