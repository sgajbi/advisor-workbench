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

describe("ProposalNarrativePosturePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({
      proposal: activeProposalSummary,
      reporting: {
        report_request_id: "report-001",
        report_type: "PORTFOLIO_REVIEW",
        related_version_no: 2,
        status: "READY",
        report_reference_id: "report-document-001",
        generated_at: "2026-05-22T09:01:00Z",
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    });
    vi.mocked(getProposalDeliveryEvents).mockResolvedValue({
      proposal: activeProposalSummary,
      event_count: 1,
      latest_event: {
        event_type: "REPORT_REQUESTED",
        occurred_at: "2026-05-22T09:00:00Z",
      },
    });
    vi.mocked(getProposalNarrativeReviewEvidence).mockResolvedValue(
      confirmedNarrativeReview,
    );
    vi.mocked(reviewProposalNarrative).mockResolvedValue(
      confirmedNarrativeReview,
    );
    vi.mocked(createProposalReportRequest).mockResolvedValue({
      report_request_id: "report-001",
      report_type: "PORTFOLIO_REVIEW",
      status: "REQUESTED",
      explanation: {
        related_version_no: 2,
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "REQUESTED",
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
    expect(await screen.findByText("Included Reviewed Narrative")).toBeInTheDocument();
    expect(await screen.findByText("Report Requested")).toBeInTheDocument();
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

    expect(await screen.findByText("Not Requested")).toBeInTheDocument();
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
      .mockResolvedValueOnce(confirmedNarrativeReview);
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
        proposal: activeProposalSummary,
        reporting: {
          report_request_id: "report-001",
          report_type: "PORTFOLIO_REVIEW",
          related_version_no: 2,
          status: "REQUESTED",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            review_state: "APPROVED_FOR_ADVISOR_USE",
            package_status: "REQUESTED",
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
          status: "REQUESTED",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            related_version_no: 2,
            package_status: "REQUESTED",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      });
    renderPanel();

    expect(await screen.findByText("Not Requested")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Reviewer reference" }), {
      target: { value: "advisor_1" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Request discussion pack" }));

    expect(
      await screen.findByText(
        "The discussion-pack request was submitted, but current preparation status could not confirm it. Refresh before retrying.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Discussion-pack request confirmed for proposal version 2."),
    ).not.toBeInTheDocument();
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
    expect(screen.queryByTestId("proposal-narrative-action-status")).not.toBeInTheDocument();
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

  it("resets transient action state when the active proposal version changes", async () => {
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
