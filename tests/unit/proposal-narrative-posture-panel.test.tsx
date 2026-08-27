import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalNarrativePosturePanel from "../../src/features/proposals/components/proposal-narrative-posture-panel";
import {
  createProposalReportRequest,
  getProposalDeliveryEvents,
  getProposalDeliverySummary,
  getProposalNarrativeReviewEvidence,
  reviewProposalNarrative,
} from "../../src/features/proposals/api";

vi.mock("../../src/features/proposals/api", () => ({
  createProposalReportRequest: vi.fn(),
  getProposalDeliveryEvents: vi.fn(),
  getProposalDeliverySummary: vi.fn(),
  getProposalNarrativeReviewEvidence: vi.fn(),
  reviewProposalNarrative: vi.fn(),
}));

const confirmedNarrativeReview = {
  proposal_narrative: {
    policy_version: "proposal-narrative-deterministic.v1",
  },
  narrative_review: {
    review_id: "review-001",
    proposal_id: "pp_1",
    proposal_version_no: 2,
    narrative_id: "narrative-001",
    review_state: "APPROVED_FOR_ADVISOR_USE",
    action: "APPROVE",
    source_narrative_hash: "sha256:narrative-001",
    reviewed_by: "advisor_1",
    reviewed_at: "2026-05-22T09:00:00Z",
  },
};

const activeProposalSummary = {
  proposal_id: "pp_1",
  current_state: "DRAFT",
  current_version_no: 2,
};

function proposalSummaryAt(currentVersionNo: number) {
  return { ...activeProposalSummary, current_version_no: currentVersionNo };
}

function deliveryEventsAt(currentVersionNo: number) {
  const reportRequestedEvent = {
    event_id: "delivery-event-001",
    proposal_id: "pp_1",
    related_version_no: 2,
    event_type: "REPORT_REQUESTED",
    occurred_at: "2026-05-22T09:00:00Z",
    reason: { report_request_id: "report-001" },
  } as const;
  return {
    proposal: proposalSummaryAt(currentVersionNo),
    event_count: 1,
    latest_event: reportRequestedEvent,
    events: [reportRequestedEvent],
  };
}

function renderPanel(
  props: { proposalId: string; currentVersionNo: number } = {
    proposalId: "pp_1",
    currentVersionNo: 2,
  },
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProposalNarrativePosturePanel {...props} />
    </QueryClientProvider>,
  );
  return {
    ...view,
    rerenderPanel(nextProps: { proposalId: string; currentVersionNo: number }) {
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <ProposalNarrativePosturePanel {...nextProps} />
        </QueryClientProvider>,
      );
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("ProposalNarrativePosturePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({
      proposal: activeProposalSummary,
      reporting: {
        report_request_id: "report-001",
        report_type: "PORTFOLIO_REVIEW",
        related_version_no: 2,
        status: "ACCEPTED",
        report_reference_id: "report-document-001",
        generated_at: "2026-05-22T09:01:00Z",
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          proposal_version_no: 2,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    });
    vi.mocked(getProposalDeliveryEvents).mockResolvedValue(
      deliveryEventsAt(2),
    );
    vi.mocked(getProposalNarrativeReviewEvidence).mockResolvedValue(
      confirmedNarrativeReview,
    );
    vi.mocked(reviewProposalNarrative).mockResolvedValue(
      confirmedNarrativeReview,
    );
    vi.mocked(createProposalReportRequest).mockResolvedValue({
      report_request_id: "report-001",
      report_type: "PORTFOLIO_REVIEW",
      status: "ACCEPTED",
      report_reference_id: "report-document-001",
      generated_at: "2026-05-22T09:01:00Z",
      explanation: {
        related_version_no: 2,
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    });
  });

  it("renders delivery posture and keeps unsupported client actions absent", async () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "Narrative review and discussion pack" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Narrative review workflow" })).toBeInTheDocument();
    expect(await screen.findByText("Reviewed rationale included")).toBeInTheDocument();
    expect(await screen.findByText("Discussion pack requested")).toBeInTheDocument();
    expect(await screen.findByText(/22 May 2026, 09:00 UTC/)).toBeInTheDocument();
    expect(screen.queryByText(/2026-05-22T09:00:00Z/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /render/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request discussion pack" })).toBeDisabled();
  });

  it("does not present an earlier discussion pack as current rationale evidence", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence).mockResolvedValue({});
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({
      reporting: {
        related_version_no: 2,
        status: "READY",
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-earlier",
        },
      },
    });
    renderPanel();

    const workflow = await screen.findByRole("region", {
      name: "Narrative review workflow",
    });
    expect(within(workflow).getByText("Awaiting review")).toBeInTheDocument();
    expect(within(workflow).queryByText("Available")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
  });

  it("does not suppress the current action when package version fields conflict", async () => {
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({
      reporting: {
        related_version_no: 2,
        status: "READY",
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          related_version_no: 1,
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    });
    renderPanel();

    expect(await screen.findByText("Not requested")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeEnabled();
  });

  it("does not admit an advisor review returned for another proposal version", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence).mockResolvedValue({
      ...confirmedNarrativeReview,
      narrative_review: {
        ...confirmedNarrativeReview.narrative_review,
        proposal_version_no: 1,
      },
    });
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({});
    renderPanel();

    const workflow = await screen.findByRole("region", {
      name: "Narrative review workflow",
    });
    expect(within(workflow).getByText("Not Reviewed")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
  });

  it.each(["APPROVED", "REVIEWED"])(
    "does not treat the unsupported %s review alias as advisor-use approval",
    async (reviewState) => {
      vi.mocked(getProposalNarrativeReviewEvidence).mockResolvedValue({
        ...confirmedNarrativeReview,
        narrative_review: {
          ...confirmedNarrativeReview.narrative_review,
          review_state: reviewState,
        },
      });
      vi.mocked(getProposalDeliverySummary).mockResolvedValue({});
      renderPanel();

      const workflow = await screen.findByRole("region", {
        name: "Narrative review workflow",
      });
      expect(within(workflow).getByText("Not Reviewed")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Request discussion pack" }),
      ).toBeDisabled();
    },
  );

  it("confirms narrative review before admitting a discussion-pack request", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({
        proposal_narrative: {
          policy_version: "proposal-narrative-deterministic.v1",
        },
      })
      .mockResolvedValueOnce({
        ...confirmedNarrativeReview,
        narrative_review: {
          ...confirmedNarrativeReview.narrative_review,
          reviewed_at: "2026-05-22T17:00:00+08:00",
        },
      });
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          status: "NO_REPORT",
          include_reviewed_narrative: false,
        },
      })
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          status: "NOT_REQUESTED",
          include_reviewed_narrative: false,
        },
      })
      .mockResolvedValueOnce({
        proposal: proposalSummaryAt(3),
        reporting: {
          report_request_id: "report-001",
          report_type: "PORTFOLIO_REVIEW",
          related_version_no: 2,
          status: "ACCEPTED",
          report_reference_id: "report-document-001",
          generated_at: "2026-05-22T17:01:00+08:00",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            proposal_version_no: 2,
            review_state: "APPROVED_FOR_ADVISOR_USE",
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      });
    renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    const requestButton = screen.getByRole("button", { name: "Request discussion pack" });
    expect(requestButton).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Advisor review rationale" }), {
      target: { value: "Evidence-grounded and suitable for advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record advisor review" }));

    await waitFor(() => {
      expect(reviewProposalNarrative).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          action: "APPROVE",
          reviewed_by: "advisor_1",
          client_ready_release_requested: false,
        }),
        expect.stringContaining("ui-narrative-review-2-pp_1"),
      );
    });
    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    await waitFor(() => expect(requestButton).toBeEnabled());

    fireEvent.click(requestButton);

    await waitFor(() => {
      expect(createProposalReportRequest).toHaveBeenCalledWith(
        "pp_1",
        expect.objectContaining({
          report_type: "PORTFOLIO_REVIEW",
          requested_by: "advisor_1",
          related_version_no: 2,
          include_reviewed_narrative: true,
        }),
      );
    });
    expect(
      await screen.findByText("Discussion-pack request confirmed for proposal version 2."),
    ).toBeInTheDocument();
  });

  it("confirms narrative review when independent delivery reads are unavailable", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(confirmedNarrativeReview);
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("DELIVERY_SUMMARY_UNAVAILABLE"));
    vi.mocked(getProposalDeliveryEvents)
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        event_count: 0,
        events: [],
      })
      .mockRejectedValueOnce(new Error("DELIVERY_EVENTS_UNAVAILABLE"));
    renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Advisor review rationale" }), {
      target: { value: "Evidence supports advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record advisor review" }));

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Advisor review was recorded, but current proposal evidence could not confirm it. Refresh before retrying.",
      ),
    ).not.toBeInTheDocument();
  });

  it("keeps action failure business-safe and does not expose source response text", async () => {
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({});
    vi.mocked(reviewProposalNarrative).mockRejectedValue(
      new Error("HTTP 500 INTERNAL_SOURCE_DETAIL"),
    );
    renderPanel();

    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Advisor review rationale" }), {
      target: { value: "Evidence supports advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record advisor review" }));

    expect(
      await screen.findByText(
        "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/INTERNAL_SOURCE_DETAIL/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("proposal-narrative-action-status")).not.toBeInTheDocument();
  });

  it("withholds discussion-pack success when refreshed request identity is stale", async () => {
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          status: "NOT_REQUESTED",
          include_reviewed_narrative: false,
        },
      })
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          report_request_id: "report-earlier",
          report_type: "PORTFOLIO_REVIEW",
          related_version_no: 2,
          status: "ACCEPTED",
          report_reference_id: "report-document-001",
          generated_at: "2026-05-22T09:01:00Z",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            proposal_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      });
    renderPanel();

    expect(await screen.findByText("Not requested")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request discussion pack" }));

    expect(
      await screen.findByText(
        "The discussion-pack request was submitted, but current preparation status could not confirm it. Refresh before retrying.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request discussion pack" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Record advisor review" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText("Discussion-pack request confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh record" })).not.toBeInTheDocument();
    expect(createProposalReportRequest).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
  });

  it("does not claim review success when refreshed source evidence disagrees", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        ...confirmedNarrativeReview,
        narrative_review: {
          ...confirmedNarrativeReview.narrative_review,
          review_id: "review-different",
          source_narrative_hash: "sha256:different",
        },
      });
    renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Advisor review rationale" }), {
      target: { value: "Evidence supports advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record advisor review" }));

    expect(
      await screen.findByText(
        "The review was submitted, but current proposal evidence could not confirm it. Refresh before taking another action.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record advisor review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Request discussion pack" })).toBeDisabled();
    expect(screen.queryByTestId("proposal-narrative-action-status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh record" })).not.toBeInTheDocument();
    expect(reviewProposalNarrative).toHaveBeenCalledTimes(1);
  });

  it("keeps narrative actions locked when confirmation refresh still fails", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        ...confirmedNarrativeReview,
        narrative_review: {
          ...confirmedNarrativeReview.narrative_review,
          review_id: "review-different",
          source_narrative_hash: "sha256:different",
        },
      })
      .mockRejectedValue(new Error("NARRATIVE_READ_UNAVAILABLE"));
    renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Advisor review rationale" }), {
      target: { value: "Evidence supports advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record advisor review" }));

    await screen.findByRole("button", { name: "Refresh record" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText(
        "The review was submitted, but current proposal evidence could not confirm it. Refresh before taking another action.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh record" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Record advisor review" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Request discussion pack" })).toBeDisabled();
    expect(reviewProposalNarrative).toHaveBeenCalledTimes(1);
  });

  it("withholds success when the authoritative narrative read cannot refresh", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("NARRATIVE_READ_UNAVAILABLE"));
    renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Advisor review rationale" }), {
      target: { value: "Evidence supports advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Record advisor review" }));

    expect(
      await screen.findByText(
        "The review was submitted, but current proposal evidence could not confirm it. Refresh before taking another action.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("proposal-narrative-action-status")).not.toBeInTheDocument();
  });

  it("preserves a submitted review across a version remount and confirms its original version", async () => {
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        ...confirmedNarrativeReview,
        narrative_review: {
          ...confirmedNarrativeReview.narrative_review,
          review_id: "review-different",
          source_narrative_hash: "sha256:different",
        },
      })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(confirmedNarrativeReview);
    const view = renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
      { target: { value: "Evidence supports advisor use." } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );

    await screen.findByRole("button", { name: "Refresh record" });
    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });

    expect(
      await screen.findByRole("button", { name: "Refresh record" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(getProposalNarrativeReviewEvidence).toHaveBeenLastCalledWith(
      "pp_1",
      2,
    );
    expect(reviewProposalNarrative).toHaveBeenCalledTimes(1);
  });

  it("keeps an in-flight advisor review fenced across a version remount", async () => {
    const reviewRequest = createDeferred<
      Awaited<ReturnType<typeof reviewProposalNarrative>>
    >();
    vi.mocked(reviewProposalNarrative).mockReturnValue(reviewRequest.promise);
    const view = renderPanel();

    await screen.findByRole("button", { name: "Record advisor review" });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
      { target: { value: "Evidence supports advisor use." } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );

    expect(
      await screen.findByRole("button", { name: "Recording review…" }),
    ).toBeDisabled();
    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });

    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_2" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
      { target: { value: "New-version rationale." } },
    );
    const remountedReview = screen.getByRole("button", {
      name: "Recording review…",
    });
    expect(remountedReview).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
    fireEvent.click(remountedReview);
    expect(reviewProposalNarrative).toHaveBeenCalledTimes(1);

    reviewRequest.reject(new Error("SOURCE_UNAVAILABLE"));
    expect(
      await screen.findByText(/Advisor review was not recorded/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Record advisor review" }),
      ).toBeEnabled(),
    );
  });

  it("delivers an in-flight advisor review confirmation to the remounted version session", async () => {
    const reviewRequest = createDeferred<
      Awaited<ReturnType<typeof reviewProposalNarrative>>
    >();
    vi.mocked(reviewProposalNarrative).mockReturnValue(reviewRequest.promise);
    const view = renderPanel();

    await screen.findByRole("button", { name: "Record advisor review" });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
      { target: { value: "Evidence supports advisor use." } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );
    await screen.findByRole("button", { name: "Recording review…" });

    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });
    reviewRequest.resolve(confirmedNarrativeReview);

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(reviewProposalNarrative).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
  });

  it("delivers an in-flight recovery confirmation to the remounted version session", async () => {
    const refreshRequest = createDeferred<
      Awaited<ReturnType<typeof getProposalNarrativeReviewEvidence>>
    >();
    vi.mocked(getProposalNarrativeReviewEvidence)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        ...confirmedNarrativeReview,
        narrative_review: {
          ...confirmedNarrativeReview.narrative_review,
          review_id: "review-different",
          source_narrative_hash: "sha256:different",
        },
      })
      .mockImplementationOnce(() => refreshRequest.promise)
      .mockResolvedValue(confirmedNarrativeReview);
    const view = renderPanel();

    expect((await screen.findAllByText("Not Reviewed")).length).toBeGreaterThan(0);
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
      { target: { value: "Evidence supports advisor use." } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );
    await screen.findByRole("button", { name: "Refresh record" });
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));
    await screen.findByRole("button", { name: "Refreshing…" });

    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });
    expect(
      screen.getByRole("button", { name: "Refreshing…" }),
    ).toBeDisabled();
    refreshRequest.resolve(confirmedNarrativeReview);

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Refresh record" })).not.toBeInTheDocument();
    expect(reviewProposalNarrative).toHaveBeenCalledTimes(1);
  });

  it("preserves a submitted discussion-pack request across a version remount", async () => {
    vi.mocked(getProposalDeliveryEvents)
      .mockResolvedValueOnce(deliveryEventsAt(2))
      .mockResolvedValueOnce(deliveryEventsAt(2))
      .mockResolvedValue(deliveryEventsAt(3));
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          status: "NOT_REQUESTED",
          include_reviewed_narrative: false,
        },
      })
      .mockResolvedValueOnce({
        proposal: proposalSummaryAt(3),
        reporting: {
          report_request_id: "report-earlier",
          report_type: "PORTFOLIO_REVIEW",
          related_version_no: 2,
          status: "ACCEPTED",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            proposal_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      })
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          report_request_id: "report-001",
          report_type: "PORTFOLIO_REVIEW",
          related_version_no: 2,
          status: "ACCEPTED",
          report_reference_id: "report-document-001",
          generated_at: "2026-05-22T09:01:00Z",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            proposal_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      });
    const view = renderPanel();

    expect(await screen.findByText("Not requested")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request discussion pack" }),
    );

    await screen.findByRole("button", { name: "Refresh record" });
    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });

    expect(
      await screen.findByRole("button", { name: "Refresh record" }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText(
        "Discussion-pack request confirmed for proposal version 2.",
      ),
    ).toBeInTheDocument();
    expect(createProposalReportRequest).toHaveBeenCalledTimes(1);
  });

  it("keeps an in-flight discussion-pack request fenced across a version remount", async () => {
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({
      proposal: activeProposalSummary,
      reporting: {
        status: "NOT_REQUESTED",
        include_reviewed_narrative: false,
      },
    });
    const reportRequest = createDeferred<
      Awaited<ReturnType<typeof createProposalReportRequest>>
    >();
    vi.mocked(createProposalReportRequest).mockReturnValue(
      reportRequest.promise,
    );
    const view = renderPanel();

    expect(await screen.findByText("Not requested")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request discussion pack" }),
    );

    expect(
      await screen.findByRole("button", {
        name: "Requesting discussion pack…",
      }),
    ).toBeDisabled();
    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });

    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_2" } },
    );
    const remountedRequest = screen.getByRole("button", {
      name: "Requesting discussion pack…",
    });
    expect(remountedRequest).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
    fireEvent.click(remountedRequest);
    expect(createProposalReportRequest).toHaveBeenCalledTimes(1);

    reportRequest.reject(new Error("SOURCE_UNAVAILABLE"));
    expect(
      await screen.findByText(/discussion-pack request was not recorded/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole("button", {
          name: "Requesting discussion pack…",
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it("delivers an in-flight discussion-pack confirmation to the remounted version session", async () => {
    vi.mocked(getProposalDeliveryEvents).mockResolvedValue(
      deliveryEventsAt(3),
    );
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({
        proposal: activeProposalSummary,
        reporting: {
          status: "NOT_REQUESTED",
          include_reviewed_narrative: false,
        },
      })
      .mockResolvedValue({
        proposal: proposalSummaryAt(3),
        reporting: {
          report_request_id: "report-001",
          report_type: "PORTFOLIO_REVIEW",
          related_version_no: 2,
          status: "ACCEPTED",
          report_reference_id: "report-document-001",
          generated_at: "2026-05-22T09:01:00Z",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            proposal_version_no: 2,
            package_status: "INCLUDED_REVIEWED_NARRATIVE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      });
    const reportRequest = createDeferred<
      Awaited<ReturnType<typeof createProposalReportRequest>>
    >();
    vi.mocked(createProposalReportRequest).mockReturnValue(
      reportRequest.promise,
    );
    const view = renderPanel();

    expect(await screen.findByText("Not requested")).toBeInTheDocument();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Request discussion pack" }),
    );
    await screen.findByRole("button", {
      name: "Requesting discussion pack…",
    });

    view.rerenderPanel({ proposalId: "pp_1", currentVersionNo: 3 });
    reportRequest.resolve({
      report_request_id: "report-001",
      report_type: "PORTFOLIO_REVIEW",
      status: "ACCEPTED",
      report_reference_id: "report-document-001",
      generated_at: "2026-05-22T09:01:00Z",
      explanation: {
        related_version_no: 2,
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    });

    expect(
      await screen.findByText(
        "Discussion-pack request confirmed for proposal version 2.",
      ),
    ).toBeInTheDocument();
    expect(createProposalReportRequest).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Request discussion pack" }),
    ).toBeDisabled();
  });

  it("resets transient action state when the active proposal changes", async () => {
    vi.mocked(reviewProposalNarrative).mockRejectedValueOnce(
      new Error("SOURCE_UNAVAILABLE"),
    );
    const view = renderPanel();

    fireEvent.change(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
      { target: { value: "advisor_1" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
      { target: { value: "Evidence supports advisor use." } },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );

    expect(
      await screen.findByText(/Advisor review was not recorded/),
    ).toBeInTheDocument();

    view.rerenderPanel({ proposalId: "pp_2", currentVersionNo: 1 });

    expect(screen.queryByText(/Advisor review was not recorded/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Reviewer reference" }),
    ).toHaveValue("");
    expect(
      screen.getByRole("textbox", { name: "Advisor review rationale" }),
    ).toHaveValue("");
  });
});
