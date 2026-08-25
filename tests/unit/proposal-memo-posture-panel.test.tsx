import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProposalMemoPosturePanel from "../../src/features/proposals/components/proposal-memo-posture-panel";
import {
  createProposalMemo,
  getProposalMemo,
  getProposalMemoLineage,
  getProposalMemoProjection,
  getProposalMemoReplayEvidence,
  requestProposalMemoAdvisorCommentary,
  requestProposalMemoReportPackage,
  reviewProposalMemo,
} from "../../src/features/proposals/api";

vi.mock("../../src/features/proposals/api", () => ({
  createProposalMemo: vi.fn(),
  getProposalMemo: vi.fn(),
  getProposalMemoLineage: vi.fn(),
  getProposalMemoProjection: vi.fn(),
  getProposalMemoReplayEvidence: vi.fn(),
  requestProposalMemoAdvisorCommentary: vi.fn(),
  requestProposalMemoReportPackage: vi.fn(),
  reviewProposalMemo: vi.fn(),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <ProposalMemoPosturePanel proposalId="pp_1" currentVersionNo={2} />
    </QueryClientProvider>,
  );
}

describe("ProposalMemoPosturePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProposalMemo).mockResolvedValue({
      memo_id: "memo_1",
      memo_status: "APPROVED_FOR_ADVISOR_USE",
      memo_hash: "sha256:memo-001",
      review_posture: { advisor_use: "APPROVED_FOR_ADVISOR_USE" },
      report_package_posture: {
        status: "READY",
        archive_refs: ["archive://memo/report/1"],
      },
      ai_commentary_posture: {
        status: "AVAILABLE",
        authority: "NON_AUTHORITATIVE",
      },
      read_posture: { supportability: "SUPPORTED_ADVISOR_USE" },
    });
    vi.mocked(getProposalMemoProjection).mockResolvedValue({
      projection: {
        audience: "ADVISOR",
        client_ready_publication: "BLOCKED",
      },
      sections: [{ section_id: "DISCLOSURES", supportability: "SOURCE_BACKED" }],
      projection_posture: { supportability: "SUPPORTED_ADVISOR_USE" },
    });
    vi.mocked(getProposalMemoLineage).mockResolvedValue({
      memos: [
        {
          memo_id: "memo_1",
          memo_hash: "sha256:memo-001",
          memo_status: "APPROVED_FOR_ADVISOR_USE",
        },
      ],
    });
    vi.mocked(getProposalMemoReplayEvidence).mockResolvedValue({
      hashes: {
        memo_hash: "sha256:memo-001",
        artifact_hash: "sha256:artifact-001",
      },
      audit_events: [{ event_type: "MEMO_CREATED" }],
      supportability: { client_ready_publication: "BLOCKED" },
    });
    vi.mocked(createProposalMemo).mockResolvedValue({ memo_hash: "sha256:memo-001" });
    vi.mocked(reviewProposalMemo).mockResolvedValue({
      memo: {
        memo_hash: "sha256:memo-001",
        review_posture: {
          status: "RECORDED",
          review_action: "APPROVE_FOR_ADVISOR_USE",
          source_memo_hash: "sha256:memo-001",
        },
      },
      review_event: { event_type: "MEMO_REVIEW_RECORDED" },
      replayed: false,
    });
    vi.mocked(requestProposalMemoReportPackage).mockResolvedValue({
      report: { archive_refs: ["archive://memo/report/1"] },
    });
    vi.mocked(requestProposalMemoAdvisorCommentary).mockResolvedValue({
      commentary: { authority: "NON_AUTHORITATIVE" },
    });
  });

  it("renders advisor memo posture and keeps client-ready actions absent", async () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "Advisor Memo And Evidence Pack" }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText("Approved for advisor use")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Advisor-use evidence ready")).toBeInTheDocument();
    expect(await screen.findByText(/Client draft: Blocked/)).toBeInTheDocument();
    expect((await screen.findAllByText("Advisor use")).length).toBeGreaterThanOrEqual(2);
    expect(await screen.findByRole("option", { name: "Client discussion draft" })).toBeInTheDocument();
    expect(await screen.findByText(/Memo evidence: sha256:memo-001/)).toBeInTheDocument();
    expect(await screen.findByText(/Replay evidence: sha256:memo-001/)).toBeInTheDocument();
    expect(await screen.findByText("Evidence Readiness")).toBeInTheDocument();
    expect(await screen.findByText("Evidence Trail")).toBeInTheDocument();
    expect(await screen.findByText(/Evidence archive: 1 archived report item/)).toBeInTheDocument();
    expect(screen.getByText(/Advisor-use memo actions preserve source evidence/)).toBeInTheDocument();
    expect(screen.getByText("Advisor ID")).toBeInTheDocument();
    expect(screen.queryByText("Actor")).not.toBeInTheDocument();
    expect(screen.queryByText("AI Commentary")).not.toBeInTheDocument();
    expect(screen.queryByText("Supportability")).not.toBeInTheDocument();
    expect(screen.queryByText("APPROVED_FOR_ADVISOR_USE")).not.toBeInTheDocument();
    expect(screen.queryByText("SUPPORTED_ADVISOR_USE")).not.toBeInTheDocument();
    expect(screen.queryByText(/Archive refs:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/archive:\/\//)).not.toBeInTheDocument();
    expect(screen.queryByText(/Memo hash:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Replay hash:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Lineage")).not.toBeInTheDocument();
    expect(screen.queryByText("CLIENT_DRAFT")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client-ready release/i })).not.toBeInTheDocument();
  });

  it("routes memo actions through Gateway APIs with source memo hash", async () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Advisor ID"), {
      target: { value: " advisor_9 " },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Prepare Or Refresh Memo" }));
    await waitFor(() => {
      expect(createProposalMemo).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          created_by: "advisor_9",
          lifecycle_status: "DRAFT",
        }),
        expect.stringContaining("ui-memo-create-2-pp_1"),
      );
    });

    fireEvent.change(screen.getByPlaceholderText("Evidence-backed memo is ready for advisor use."), {
      target: { value: "Evidence-backed memo is ready for advisor use." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve Memo For Advisor Use" }));
    await waitFor(() => {
      expect(reviewProposalMemo).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          action: "APPROVE_FOR_ADVISOR_USE",
          source_memo_hash: "sha256:memo-001",
          client_ready_release_requested: false,
        }),
        expect.stringContaining("ui-memo-review-2-pp_1"),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Prepare Report Package" }));
    await waitFor(() => {
      expect(requestProposalMemoReportPackage).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          source_memo_hash: "sha256:memo-001",
          client_ready_document_requested: false,
        }),
        expect.stringContaining("ui-memo-report-package-2-pp_1"),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Request Advisor Commentary" }));
    await waitFor(() => {
      expect(requestProposalMemoAdvisorCommentary).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          source_memo_hash: "sha256:memo-001",
          requested_sections: ["EXECUTIVE_SUMMARY", "LIMITATIONS_AND_DISCLOSURES"],
        }),
        expect.stringContaining("ui-memo-advisor-commentary-2-pp_1"),
      );
    });
  });

  it("shows degraded memo posture without inventing readiness", async () => {
    vi.mocked(getProposalMemo).mockRejectedValue(new Error("Proposal memo fetch failed (409)"));
    vi.mocked(getProposalMemoProjection).mockResolvedValue({
      projection: {
        audience: "CLIENT_DRAFT",
        client_ready_publication: "BLOCKED",
      },
      projection_posture: { supportability: "DEGRADED_SOURCE_EVIDENCE" },
    });

    renderPanel();

    expect(
      await screen.findByText(/Memo posture is degraded or blocked by source advisory evidence/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/supportability/i)).not.toBeInTheDocument();
    expect(await screen.findByText("Source evidence degraded")).toBeInTheDocument();
    expect(screen.queryByText("DEGRADED_SOURCE_EVIDENCE")).not.toBeInTheDocument();
    expect(screen.queryByText(/ready for client/i)).not.toBeInTheDocument();
  });

  it("shows business-readable action failure copy for non-error failures", async () => {
    vi.mocked(createProposalMemo).mockRejectedValueOnce("network failure");

    renderPanel();

    fireEvent.change(screen.getByLabelText("Advisor ID"), {
      target: { value: "advisor_9" },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Prepare Or Refresh Memo" }));

    expect(
      await screen.findByText(
        "Memo preparation did not complete. Review source evidence and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Unknown memo/i)).not.toBeInTheDocument();
  });

  it("does not invent an advisor identity when the source actor is missing", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Prepare Or Refresh Memo" }));

    expect(
      await screen.findByText("An advisor or reviewer reference is required."),
    ).toBeInTheDocument();
    expect(createProposalMemo).not.toHaveBeenCalled();
  });
});
