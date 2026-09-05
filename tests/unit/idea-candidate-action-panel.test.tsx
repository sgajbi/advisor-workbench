import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import IdeaCandidateActionPanel from "../../src/features/proposals/components/idea-candidate-action-panel";
import { NOT_USEFUL_REASON_OPTIONS } from "../../src/features/proposals/idea-feedback";
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

const ideaApi = vi.hoisted(() => ({
  recordAdvisorIdeaConversionIntent: vi.fn(),
  recordAdvisorIdeaFeedback: vi.fn(),
  recordAdvisorIdeaReviewAction: vi.fn(),
  requestAdvisorIdeaAIExplanation: vi.fn(),
}));

const EVIDENCE_IDENTITY = {
  evidencePacketId: "evidence_high_cash_001",
  evidenceContentHash: "sha256:evidence-high-cash-001",
  sourceRevisionVectorDigest: "sha256:revision-high-cash-001",
};

vi.mock("../../src/features/proposals/api", () => ideaApi);

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function renderPanel(
  onRecorded: () => Promise<boolean>,
  evidenceIdentity: typeof EVIDENCE_IDENTITY | null = EVIDENCE_IDENTITY,
) {
  return render(
    <IdeaCandidateActionPanel
      candidateId="idea_high_cash_001"
      candidateReasonCodes={["high_cash_ratio", "review_required"]}
      evidenceIdentity={evidenceIdentity ?? undefined}
      portfolioId="PB_SG_GLOBAL_BAL_001"
      onRecorded={onRecorded}
    />,
    { wrapper },
  );
}

describe("IdeaCandidateActionPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    ideaApi.recordAdvisorIdeaReviewAction.mockResolvedValue({
      persistence: { decision: "accepted" },
      durableStorageBacked: true,
      supportedFeaturePromoted: false,
    });
    ideaApi.recordAdvisorIdeaConversionIntent.mockResolvedValue({
      persistence: { decision: "accepted" },
      durableStorageBacked: true,
      supportedFeaturePromoted: false,
    });
    ideaApi.recordAdvisorIdeaFeedback.mockImplementation(
      async ({ candidateId, request }) => ({
        feedbackEvent: {
          ...request,
          candidateId,
          evidencePacketId: "evidence_high_cash_001",
          actorRole: "advisor",
        },
        persistence: { decision: "accepted" },
        durableStorageBacked: true,
      }),
    );
  });

  it("shows persisted success only after source detail and queue refresh complete", async () => {
    let completeRefresh: ((result: boolean) => void) | undefined;
    const onRecorded = vi.fn(
      async () =>
        await new Promise<boolean>((resolve) => {
          completeRefresh = resolve;
        }),
    );
    renderPanel(onRecorded);

    expect(
      screen.getByRole("radiogroup", { name: "Feedback usefulness" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Useful" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByTestId("idea-feedback-reason-summary"),
    ).toHaveTextContent("Relevant to this client");
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
          taxonomyVersion: "idea-feedback-taxonomy-v1",
          reason: "relevant",
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
      "Feedback saved. Opportunity detail and worklist are current.",
    );
  });

  it("requires a reason for not-useful feedback and focuses the missing field", () => {
    renderPanel(async () => true);

    fireEvent.click(screen.getByRole("radio", { name: "Not useful" }));
    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));

    const reason = screen.getByLabelText("Why was it not useful?");
    expect(reason).toHaveFocus();
    expect(reason).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Select the reason this opportunity was not useful.",
    );
    expect(ideaApi.recordAdvisorIdeaFeedback).not.toHaveBeenCalled();
  });

  it.each(NOT_USEFUL_REASON_OPTIONS)(
    "submits the canonical $value reason selected by the adviser",
    async ({ label, value }) => {
      renderPanel(async () => true);

      fireEvent.click(screen.getByRole("radio", { name: "Not useful" }));
      fireEvent.change(screen.getByLabelText("Why was it not useful?"), {
        target: { value },
      });
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));

      await waitFor(() =>
        expect(ideaApi.recordAdvisorIdeaFeedback).toHaveBeenCalledWith(
          expect.objectContaining({
            request: expect.objectContaining({
              taxonomyVersion: "idea-feedback-taxonomy-v1",
              outcome: "not_useful",
              reason: value,
            }),
          }),
        ),
      );
    },
  );

  it("keeps failure explicit and reuses the original payload and idempotency key", async () => {
    const onRecorded = vi.fn(async () => true);
    ideaApi.recordAdvisorIdeaFeedback
      .mockRejectedValueOnce(new Error("source validation failed"))
      .mockImplementationOnce(async ({ candidateId, request }) => ({
        feedbackEvent: {
          ...request,
          candidateId,
          evidencePacketId: "evidence_high_cash_001",
          actorRole: "advisor",
        },
        persistence: { decision: "replayed" },
        durableStorageBacked: true,
      }));
    renderPanel(onRecorded);

    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));
    const error = await screen.findByTestId("idea-action-error");
    expect(error).toHaveAttribute("data-action-state", "not-recorded");
    expect(error).toHaveTextContent(
      "could not verify the saved feedback against source evidence",
    );
    expect(onRecorded).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));
    await screen.findByTestId("idea-action-feedback-status");

    const firstInput = ideaApi.recordAdvisorIdeaFeedback.mock.calls[0][0];
    const retryInput = ideaApi.recordAdvisorIdeaFeedback.mock.calls[1][0];
    expect(retryInput.idempotencyKey).toBe(firstInput.idempotencyKey);
    expect(retryInput.request).toEqual(firstInput.request);
    expect(onRecorded).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      status: 403,
      message: "Feedback is not available for your current access",
    },
    {
      status: 409,
      message: "The opportunity changed or conflicts with existing feedback",
    },
    {
      status: 503,
      message: "The feedback service is unavailable",
    },
  ])(
    "keeps a $status feedback failure explicit",
    async ({ status, message }) => {
      const onRecorded = vi.fn(async () => true);
      ideaApi.recordAdvisorIdeaFeedback.mockRejectedValueOnce(
        new WorkbenchApiError("advisor idea feedback", status),
      );
      renderPanel(onRecorded);

      fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));

      expect(await screen.findByTestId("idea-action-error")).toHaveTextContent(
        message,
      );
      expect(
        screen.queryByTestId("idea-action-feedback-status"),
      ).not.toBeInTheDocument();
      expect(onRecorded).not.toHaveBeenCalled();
    },
  );

  it("abandons a failed retry only after the adviser changes the feedback", async () => {
    const onRecorded = vi.fn(async () => true);
    ideaApi.recordAdvisorIdeaFeedback.mockRejectedValueOnce(
      new WorkbenchApiError("advisor idea feedback", 409),
    );
    renderPanel(onRecorded);

    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));
    await screen.findByTestId("idea-action-error");
    const failedInput = ideaApi.recordAdvisorIdeaFeedback.mock.calls[0][0];

    fireEvent.click(screen.getByRole("radio", { name: "Not useful" }));
    fireEvent.change(screen.getByLabelText("Why was it not useful?"), {
      target: { value: "wrong_timing" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record feedback" }));
    await screen.findByTestId("idea-action-feedback-status");

    const changedInput = ideaApi.recordAdvisorIdeaFeedback.mock.calls[1][0];
    expect(changedInput.idempotencyKey).not.toBe(failedInput.idempotencyKey);
    expect(changedInput.request).toMatchObject({
      outcome: "not_useful",
      reason: "wrong_timing",
    });
    expect(changedInput.request).not.toEqual(failedInput.request);
  });

  it("shows and replays the exact unconfirmed review payload and identity", async () => {
    const onRecorded = vi.fn(async () => true);
    ideaApi.recordAdvisorIdeaReviewAction
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({
        persistence: { decision: "replayed" },
        durableStorageBacked: true,
        supportedFeaturePromoted: false,
      });
    renderPanel(onRecorded);

    fireEvent.change(screen.getByLabelText("Review action"), {
      target: { value: "snooze" },
    });
    fireEvent.change(screen.getByLabelText("Snooze until"), {
      target: { value: "2026-09-08T10:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));

    const recovery = await screen.findByTestId("idea-review-retry");
    expect(recovery).toHaveTextContent("Review outcome not confirmed");
    expect(recovery).toHaveTextContent("Snooze candidate");
    expect(recovery).toHaveTextContent("Cash balance requires review");
    expect(
      screen.getByRole("button", { name: "Change review to record new" }),
    ).toBeDisabled();
    fireEvent.submit(
      screen.getByRole("heading", { name: "Record review" }).closest("form")!,
    );
    expect(ideaApi.recordAdvisorIdeaReviewAction).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/Retry the exact unconfirmed review/),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Retry exact review" }));
    await screen.findByTestId("idea-action-review-status");

    const first = ideaApi.recordAdvisorIdeaReviewAction.mock.calls[0][0];
    const retry = ideaApi.recordAdvisorIdeaReviewAction.mock.calls[1][0];
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
    expect(retry.request).toEqual(first.request);
    expect(onRecorded).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("idea-review-retry")).not.toBeInTheDocument();
  });

  it("records an edited review as a new visible intent with a fresh identity", async () => {
    ideaApi.recordAdvisorIdeaReviewAction.mockRejectedValueOnce(
      new Error("response lost"),
    );
    renderPanel(async () => true);

    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    await screen.findByTestId("idea-review-retry");
    const failed = ideaApi.recordAdvisorIdeaReviewAction.mock.calls[0][0];

    fireEvent.change(screen.getByLabelText("Review action"), {
      target: { value: "reject" },
    });
    fireEvent.change(screen.getByLabelText("Review basis"), {
      target: { value: "review_required" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Record updated review" }),
    );
    await screen.findByTestId("idea-action-review-status");

    const updated = ideaApi.recordAdvisorIdeaReviewAction.mock.calls[1][0];
    expect(updated.idempotencyKey).not.toBe(failed.idempotencyKey);
    expect(updated.request).toMatchObject({
      action: "reject",
      reasonCodes: ["review_rejected", "review_required"],
    });
    expect(updated.request).not.toEqual(failed.request);
  });

  it("treats an edited snooze time as a new review intent", async () => {
    ideaApi.recordAdvisorIdeaReviewAction.mockRejectedValueOnce(
      new Error("response lost"),
    );
    renderPanel(async () => true);

    fireEvent.change(screen.getByLabelText("Review action"), {
      target: { value: "snooze" },
    });
    fireEvent.change(screen.getByLabelText("Snooze until"), {
      target: { value: "2026-09-08T10:30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    await screen.findByTestId("idea-review-retry");
    const failed = ideaApi.recordAdvisorIdeaReviewAction.mock.calls[0][0];

    fireEvent.change(screen.getByLabelText("Snooze until"), {
      target: { value: "2026-09-09T14:15" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Record updated review" }),
    );
    await screen.findByTestId("idea-action-review-status");

    const updated = ideaApi.recordAdvisorIdeaReviewAction.mock.calls[1][0];
    expect(updated.idempotencyKey).not.toBe(failed.idempotencyKey);
    expect(updated.request.snoozedUntilUtc).toBe(
      new Date("2026-09-09T14:15").toISOString(),
    );
  });

  it("separates exact conversion retry from an edited target and basis", async () => {
    ideaApi.recordAdvisorIdeaConversionIntent.mockRejectedValueOnce(
      new Error("response lost"),
    );
    renderPanel(async () => true);

    fireEvent.click(screen.getByRole("button", { name: "Record intent" }));
    const recovery = await screen.findByTestId("idea-conversion-retry");
    expect(recovery).toHaveTextContent("Advise proposal review");
    const failed = ideaApi.recordAdvisorIdeaConversionIntent.mock.calls[0][0];

    fireEvent.change(screen.getByLabelText("Target workflow"), {
      target: { value: "manage_review" },
    });
    fireEvent.change(screen.getByLabelText("Conversion basis"), {
      target: { value: "review_required" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Record updated intent" }),
    );
    await screen.findByTestId("idea-action-conversion-status");

    const updated = ideaApi.recordAdvisorIdeaConversionIntent.mock.calls[1][0];
    expect(updated.idempotencyKey).not.toBe(failed.idempotencyKey);
    expect(updated.request).toMatchObject({
      target: "manage_review",
      reasonCodes: ["review_approved_for_conversion", "review_required"],
    });
  });

  it("freezes material action fields while a review completion is delayed", async () => {
    let completeReview: ((value: unknown) => void) | undefined;
    ideaApi.recordAdvisorIdeaReviewAction.mockImplementationOnce(
      async () =>
        await new Promise((resolve) => {
          completeReview = resolve;
        }),
    );
    renderPanel(async () => true);

    fireEvent.click(screen.getByRole("button", { name: "Record review" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Review action")).toBeDisabled(),
    );
    expect(screen.getByLabelText("Review basis")).toBeDisabled();
    expect(screen.getByLabelText("Target workflow")).toBeDisabled();
    expect(screen.getByLabelText("Conversion basis")).toBeDisabled();

    completeReview?.({
      persistence: { decision: "accepted" },
      durableStorageBacked: true,
      supportedFeaturePromoted: false,
    });
    await screen.findByTestId("idea-action-review-status");
  });

  it("does not carry an unconfirmed attempt across a candidate panel remount", async () => {
    ideaApi.recordAdvisorIdeaReviewAction.mockRejectedValueOnce(
      new Error("response lost"),
    );
    const rendered = renderPanel(async () => true);

    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    await screen.findByTestId("idea-review-retry");
    rendered.unmount();
    renderPanel(async () => true);

    expect(screen.queryByTestId("idea-review-retry")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record review" })).toBeEnabled();
    expect(ideaApi.recordAdvisorIdeaReviewAction).toHaveBeenCalledTimes(1);
  });

  it("does not offer mutation retry after persistence succeeds but refresh fails", async () => {
    renderPanel(async () => false);

    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    const status = await screen.findByTestId("idea-action-review-status");

    expect(status).toHaveAttribute(
      "data-action-state",
      "recorded-refresh-failed",
    );
    expect(screen.queryByTestId("idea-review-retry")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry exact review" }),
    ).not.toBeInTheDocument();
  });

  it("stops retrying when Idea returns a deterministic owner conflict", async () => {
    ideaApi.recordAdvisorIdeaReviewAction
      .mockRejectedValueOnce(new Error("response lost"))
      .mockRejectedValueOnce(new WorkbenchApiError("advisor idea review", 409));
    renderPanel(async () => true);

    fireEvent.click(screen.getByRole("button", { name: "Record review" }));
    await screen.findByTestId("idea-review-retry");
    fireEvent.click(screen.getByRole("button", { name: "Retry exact review" }));

    expect(await screen.findByTestId("idea-action-error")).toHaveTextContent(
      "source rejected this review",
    );
    expect(screen.queryByTestId("idea-review-retry")).not.toBeInTheDocument();
  });

  it("keeps advisor actions available when explanation evidence is unavailable", () => {
    renderPanel(async () => true, null);

    expect(
      screen.getByRole("button", { name: "Explanation unavailable" }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record review" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Record feedback" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record intent" })).toBeEnabled();
  });

  it("keeps all advisor actions available when the optional explanation fails", async () => {
    ideaApi.requestAdvisorIdeaAIExplanation.mockRejectedValueOnce(
      new WorkbenchApiError("explanation", 502),
    );
    renderPanel(async () => true);

    fireEvent.click(screen.getByRole("button", { name: "Explain this idea" }));
    await screen.findByTestId("idea-explanation-error");

    expect(screen.getByRole("button", { name: "Record review" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Record feedback" }),
    ).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record intent" })).toBeEnabled();
  });
});
