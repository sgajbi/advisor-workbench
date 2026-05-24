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
  requestProposalMemoAiCommentary,
  requestProposalMemoReportPackage,
  reviewProposalMemo,
} from "../../src/features/proposals/api";

vi.mock("../../src/features/proposals/api", () => ({
  createProposalMemo: vi.fn(),
  getProposalMemo: vi.fn(),
  getProposalMemoLineage: vi.fn(),
  getProposalMemoProjection: vi.fn(),
  getProposalMemoReplayEvidence: vi.fn(),
  requestProposalMemoAiCommentary: vi.fn(),
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
    vi.mocked(reviewProposalMemo).mockResolvedValue({ memo_hash: "sha256:memo-001" });
    vi.mocked(requestProposalMemoReportPackage).mockResolvedValue({
      report: { archive_refs: ["archive://memo/report/1"] },
    });
    vi.mocked(requestProposalMemoAiCommentary).mockResolvedValue({
      commentary: { authority: "NON_AUTHORITATIVE" },
    });
  });

  it("renders Gateway memo posture and keeps client-ready actions absent", async () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "Advisor Memo Product Surface" }),
    ).toBeInTheDocument();
    expect((await screen.findAllByText("APPROVED_FOR_ADVISOR_USE")).length).toBeGreaterThan(0);
    expect(await screen.findByText("SUPPORTED_ADVISOR_USE")).toBeInTheDocument();
    expect(await screen.findByText(/Client draft: BLOCKED/)).toBeInTheDocument();
    expect(await screen.findByText(/archive:\/\/memo\/report\/1/)).toBeInTheDocument();
    expect(screen.getByText(/Workbench uses Gateway memo endpoints only/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to client/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /client-ready release/i })).not.toBeInTheDocument();
  });

  it("routes memo actions through Gateway APIs with source memo hash", async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole("button", { name: "Create Or Replay Memo" }));
    await waitFor(() => {
      expect(createProposalMemo).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          created_by: "advisor_1",
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

    fireEvent.click(screen.getByRole("button", { name: "Request Memo Report Package" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Request AI Commentary" }));
    await waitFor(() => {
      expect(requestProposalMemoAiCommentary).toHaveBeenCalledWith(
        "pp_1",
        2,
        expect.objectContaining({
          source_memo_hash: "sha256:memo-001",
          requested_sections: ["EXECUTIVE_SUMMARY", "LIMITATIONS_AND_DISCLOSURES"],
        }),
        expect.stringContaining("ui-memo-ai-commentary-2-pp_1"),
      );
    });
  });

  it("shows degraded Gateway posture without inventing readiness", async () => {
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
      await screen.findByText(/Memo posture is degraded or blocked by Gateway/),
    ).toBeInTheDocument();
    expect(await screen.findByText("DEGRADED_SOURCE_EVIDENCE")).toBeInTheDocument();
    expect(screen.queryByText(/ready for client/i)).not.toBeInTheDocument();
  });
});
