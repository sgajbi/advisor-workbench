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
      screen.getByRole("heading", { name: "Advisor Narrative And Delivery" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("Included Reviewed Narrative")).toBeInTheDocument();
    expect(await screen.findByText("Report Requested")).toBeInTheDocument();
    expect(await screen.findByText(/22 May 2026, 09:00 UTC/)).toBeInTheDocument();
    expect(screen.queryByText(/2026-05-22T09:00:00Z/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /archive/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /render/i })).not.toBeInTheDocument();
  });

  it("records narrative review and report request through advisory actions", async () => {
    renderPanel();

    fireEvent.change(screen.getByPlaceholderText("Evidence-grounded and suitable for advisor use."), {
      target: { value: "Evidence-grounded and suitable for advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve Advisor Narrative" }));

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

    fireEvent.click(screen.getByRole("button", { name: "Request Reviewed Report" }));

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
  });
});
