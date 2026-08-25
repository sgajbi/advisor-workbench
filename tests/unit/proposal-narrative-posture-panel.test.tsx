import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalNarrativePosturePanel from "../../src/features/proposals/components/proposal-narrative-posture-panel";
import {
  createProposalReportRequest,
  getProposalDeliveryEvents,
  getProposalDeliverySummary,
  reviewProposalNarrative,
} from "../../src/features/proposals/api";

vi.mock("../../src/features/proposals/api", () => ({
  createProposalReportRequest: vi.fn(),
  getProposalDeliveryEvents: vi.fn(),
  getProposalDeliverySummary: vi.fn(),
  reviewProposalNarrative: vi.fn(),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ProposalNarrativePosturePanel proposalId="pp_1" currentVersionNo={2} />
    </QueryClientProvider>,
  );
}

describe("ProposalNarrativePosturePanel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getProposalDeliverySummary).mockResolvedValue({
      reporting: {
        status: "READY",
        include_reviewed_narrative: true,
        proposal_narrative_package: {
          package_status: "INCLUDED_REVIEWED_NARRATIVE",
          source_narrative_hash: "sha256:narrative-001",
        },
      },
    });
    vi.mocked(getProposalDeliveryEvents).mockResolvedValue({
      event_count: 1,
      latest_event: {
        event_type: "REPORT_REQUESTED",
        occurred_at: "2026-05-22T09:00:00Z",
      },
    });
    vi.mocked(reviewProposalNarrative).mockResolvedValue({
      policy_version: "proposal-narrative-deterministic.v1",
      narrative_review: {
        review_state: "APPROVED_FOR_ADVISOR_USE",
        source_narrative_hash: "sha256:narrative-001",
      },
    });
    vi.mocked(createProposalReportRequest).mockResolvedValue({
      status: "READY",
      explanation: {
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
    expect(await screen.findByText("Included Reviewed Narrative")).toBeInTheDocument();
    expect(await screen.findByText("Report Requested")).toBeInTheDocument();
    expect(await screen.findByText(/22 May 2026, 09:00 UTC/)).toBeInTheDocument();
    expect(screen.queryByText(/2026-05-22T09:00:00Z/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /render/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request discussion pack" })).toBeDisabled();
  });

  it("confirms narrative review before admitting a discussion-pack request", async () => {
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({
        reporting: {
          status: "NO_REPORT",
          include_reviewed_narrative: false,
          proposal_narrative_package: { review_state: "REVIEW_REQUIRED" },
        },
      })
      .mockResolvedValueOnce({
        reporting: {
          status: "NOT_REQUESTED",
          include_reviewed_narrative: false,
          proposal_narrative_package: {
            review_state: "APPROVED_FOR_ADVISOR_USE",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      })
      .mockResolvedValueOnce({
        reporting: {
          status: "REQUESTED",
          include_reviewed_narrative: true,
          proposal_narrative_package: {
            review_state: "APPROVED_FOR_ADVISOR_USE",
            package_status: "REQUESTED",
            source_narrative_hash: "sha256:narrative-001",
          },
        },
      });
    renderPanel();

    expect((await screen.findAllByText("Review Required")).length).toBeGreaterThan(0);
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

  it("does not claim review success when refreshed source evidence disagrees", async () => {
    vi.mocked(getProposalDeliverySummary)
      .mockResolvedValueOnce({
        reporting: {
          status: "NO_REPORT",
          include_reviewed_narrative: false,
          proposal_narrative_package: { review_state: "REVIEW_REQUIRED" },
        },
      })
      .mockResolvedValueOnce({
        reporting: {
          proposal_narrative_package: {
            review_state: "APPROVED_FOR_ADVISOR_USE",
            source_narrative_hash: "sha256:different",
          },
        },
      });
    renderPanel();

    expect((await screen.findAllByText("Review Required")).length).toBeGreaterThan(0);
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
});
