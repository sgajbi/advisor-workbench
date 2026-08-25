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
import type {
  ProposalMemoData,
  ProposalMemoLineageData,
  ProposalMemoProjectionData,
  ProposalMemoReplayEvidenceData,
} from "../../src/features/proposals/types";

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

const MEMO_HASH = "sha256:memo-001";

type EvidenceState = {
  lineage: ProposalMemoLineageData;
  memo: ProposalMemoData;
  projection: ProposalMemoProjectionData;
  replay: ProposalMemoReplayEvidenceData;
};

let sourceState: EvidenceState;

function evidenceState({
  commentaryRecorded = false,
  reportRecorded = false,
  reviewed = false,
}: {
  commentaryRecorded?: boolean;
  reportRecorded?: boolean;
  reviewed?: boolean;
} = {}): EvidenceState {
  const reviewPosture = reviewed
    ? {
        status: "RECORDED",
        review_action: "APPROVE_FOR_ADVISOR_USE",
        source_memo_hash: MEMO_HASH,
      }
    : { status: "NOT_RECORDED" };
  const reportPosture = reportRecorded
    ? {
        status: "RECORDED",
        report_status: "ARCHIVED",
        source_memo_hash: MEMO_HASH,
      }
    : { status: "NOT_RECORDED" };
  const commentaryPosture = commentaryRecorded
    ? {
        status: "RECORDED",
        ai_status: "REVIEW_REQUIRED",
        source_memo_hash: MEMO_HASH,
        authoritative_for_memo_status: false,
      }
    : { status: "NOT_RECORDED" };
  return {
    memo: {
      memo_id: "memo_1",
      memo_hash: MEMO_HASH,
      memo_status: "READY",
      event_count:
        1 +
        Number(reviewed) +
        Number(reportRecorded) +
        Number(commentaryRecorded),
      review_posture: reviewPosture,
      report_package_posture: reportPosture,
      ai_commentary_posture: commentaryPosture,
    },
    projection: {
      memo_id: "memo_1",
      memo_hash: MEMO_HASH,
      audience: "ADVISOR",
      sections: [{ section_id: "SUMMARY" }, { section_id: "DISCLOSURES" }],
      projection_posture: { client_ready_publication: "BLOCKED" },
    },
    lineage: {
      memo_count: 1,
      latest_memo_id: "memo_1",
      lineage_complete: true,
      memos: [
        {
          memo_id: "memo_1",
          memo_hash: MEMO_HASH,
          event_count:
            1 +
            Number(reviewed) +
            Number(reportRecorded) +
            Number(commentaryRecorded),
          archive_refs: reportRecorded ? [{ document_id: "doc_memo_001" }] : [],
        },
      ],
    },
    replay: {
      hashes: { memo_hash: MEMO_HASH },
      audit_events: [{ event_type: "MEMO_DRAFT_CREATED" }],
      explanation: { client_ready_publication: "BLOCKED" },
    },
  };
}

function emptyEvidenceState(): EvidenceState {
  return {
    memo: {},
    projection: { audience: "ADVISOR", sections: [] },
    lineage: {
      memo_count: 0,
      latest_memo_id: null,
      lineage_complete: true,
      memos: [],
    },
    replay: { hashes: {}, audit_events: [] },
  };
}

function renderPanel(currentVersionNo: number | null = 2) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ProposalMemoPosturePanel
        proposalId="pp_1"
        currentVersionNo={currentVersionNo}
      />
    </QueryClientProvider>,
  );
}

function enterActor(reference = "advisor_9") {
  fireEvent.change(screen.getByLabelText("Advisor or reviewer reference"), {
    target: { value: reference },
  });
}

describe("ProposalMemoPosturePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sourceState = evidenceState({ reviewed: true, reportRecorded: true });
    vi.mocked(getProposalMemo).mockImplementation(async () => sourceState.memo);
    vi.mocked(getProposalMemoProjection).mockImplementation(
      async () => sourceState.projection,
    );
    vi.mocked(getProposalMemoLineage).mockImplementation(
      async () => sourceState.lineage,
    );
    vi.mocked(getProposalMemoReplayEvidence).mockImplementation(
      async () => sourceState.replay,
    );
  });

  it("renders the business workflow with one next decision and progressive evidence detail", async () => {
    renderPanel();

    expect(
      screen.getByRole("heading", { name: "Advisor memo and evidence pack" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Review the evidence record"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Advisor memo workflow")).toBeInTheDocument();
    expect(screen.getByText("Discussion material")).toBeInTheDocument();
    expect(screen.getByText("Record and audience")).toBeInTheDocument();
    expect(
      screen.getByText(/Client release, delivery, suitability approval/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /send to client/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(MEMO_HASH).closest("details")).not.toHaveAttribute(
      "open",
    );

    fireEvent.click(screen.getByText("Memo record details"));
    expect(screen.getByText("Current proposal version")).toBeInTheDocument();
    expect(screen.getByLabelText("Audience view")).toBeInTheDocument();
    expect(screen.getAllByText("1 archived item").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:memo-001")).toBeInTheDocument();
  });

  it("prepares a memo and confirms success only after all source views refresh", async () => {
    sourceState = emptyEvidenceState();
    vi.mocked(createProposalMemo).mockImplementation(async () => {
      sourceState = evidenceState();
      return { memo_hash: MEMO_HASH };
    });
    renderPanel();
    fireEvent.click(screen.getByText("Memo record details"));
    enterActor(" advisor_9 ");

    const prepareButton = screen.getByRole("button", {
      name: "Prepare advisor memo",
    });
    await waitFor(() => expect(prepareButton).toBeEnabled());
    fireEvent.click(prepareButton);

    expect(
      await screen.findByText("Advisor memo confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(createProposalMemo).toHaveBeenCalledWith(
      "pp_1",
      2,
      expect.objectContaining({
        created_by: "advisor_9",
        lifecycle_status: "DRAFT",
      }),
      expect.stringContaining("ui-memo-create-2-pp_1"),
    );
    expect(
      await screen.findByRole("button", { name: "Record advisor review" }),
    ).toBeInTheDocument();
  });

  it("records advisor review against the current memo before unlocking downstream actions", async () => {
    sourceState = evidenceState();
    vi.mocked(reviewProposalMemo).mockImplementation(async () => {
      sourceState = evidenceState({ reviewed: true });
      return {
        memo: sourceState.memo,
        review_event: { event_type: "MEMO_REVIEW_RECORDED" },
        replayed: false,
      };
    });
    renderPanel();
    fireEvent.click(screen.getByText("Memo record details"));
    enterActor();
    fireEvent.change(
      await screen.findByPlaceholderText(
        "Explain why the memo evidence is appropriate for advisor use.",
      ),
      {
        target: {
          value: "Evidence supports use in the advisor-led discussion.",
        },
      },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );

    expect(
      await screen.findByText(
        "Advisor review confirmed for proposal version 2.",
      ),
    ).toBeInTheDocument();
    expect(reviewProposalMemo).toHaveBeenCalledWith(
      "pp_1",
      2,
      expect.objectContaining({
        action: "APPROVE_FOR_ADVISOR_USE",
        reviewed_by: "advisor_9",
        source_memo_hash: MEMO_HASH,
        client_ready_release_requested: false,
      }),
      expect.stringContaining("ui-memo-review-2-pp_1"),
    );
    expect(
      await screen.findByRole("button", {
        name: "Request discussion material",
      }),
    ).toBeEnabled();
  });

  it("confirms discussion material from the report event and refreshed source posture", async () => {
    sourceState = evidenceState({ reviewed: true });
    vi.mocked(requestProposalMemoReportPackage).mockImplementation(async () => {
      sourceState = evidenceState({ reviewed: true, reportRecorded: true });
      return {
        memo: sourceState.memo,
        report_package_event: { event_type: "MEMO_REPORT_PACKAGE_RECORDED" },
        report: { status: "ARCHIVED" },
        replayed: false,
      };
    });
    renderPanel();
    fireEvent.click(screen.getByText("Memo record details"));
    enterActor();

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Request discussion material",
      }),
    );

    expect(
      await screen.findByText(
        "Discussion material confirmed for proposal version 2.",
      ),
    ).toBeInTheDocument();
    expect(requestProposalMemoReportPackage).toHaveBeenCalledWith(
      "pp_1",
      2,
      expect.objectContaining({
        requested_by: "advisor_9",
        source_memo_hash: MEMO_HASH,
        client_ready_document_requested: false,
      }),
      expect.stringContaining("ui-memo-report-package-2-pp_1"),
    );
  });

  it("keeps commentary a non-authoritative review aid", async () => {
    sourceState = evidenceState({ reviewed: true, reportRecorded: true });
    vi.mocked(requestProposalMemoAdvisorCommentary).mockImplementation(
      async () => {
        sourceState = evidenceState({
          reviewed: true,
          reportRecorded: true,
          commentaryRecorded: true,
        });
        return {
          memo: sourceState.memo,
          ai_event: { event_type: "MEMO_AI_REFERENCE_RECORDED" },
          commentary: {
            status: "REVIEW_REQUIRED",
            authoritative_for_memo_status: false,
          },
          replayed: false,
        };
      },
    );
    renderPanel();
    fireEvent.click(screen.getByText("Memo record details"));
    enterActor();

    fireEvent.click(
      await screen.findByRole("button", { name: "Request advisor commentary" }),
    );

    expect(
      await screen.findByText(
        "Advisor commentary confirmed for proposal version 2.",
      ),
    ).toBeInTheDocument();
    expect(requestProposalMemoAdvisorCommentary).toHaveBeenCalledWith(
      "pp_1",
      2,
      expect.objectContaining({
        requested_by: "advisor_9",
        source_memo_hash: MEMO_HASH,
        requested_sections: [
          "EXECUTIVE_SUMMARY",
          "LIMITATIONS_AND_DISCLOSURES",
        ],
      }),
      expect.stringContaining("ui-memo-advisor-commentary-2-pp_1"),
    );
    expect(screen.getByText("Review aid only")).toBeInTheDocument();
  });

  it("does not show success when refreshed source evidence remains stale", async () => {
    sourceState = evidenceState();
    vi.mocked(reviewProposalMemo).mockResolvedValue({
      memo: {
        ...sourceState.memo,
        review_posture: {
          status: "RECORDED",
          review_action: "APPROVE_FOR_ADVISOR_USE",
          source_memo_hash: MEMO_HASH,
        },
      },
      review_event: { event_type: "MEMO_REVIEW_RECORDED" },
      replayed: false,
    });
    renderPanel();
    fireEvent.click(screen.getByText("Memo record details"));
    enterActor();
    fireEvent.change(
      await screen.findByPlaceholderText(
        "Explain why the memo evidence is appropriate for advisor use.",
      ),
      { target: { value: "Evidence supports advisor use." } },
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Record advisor review" }),
    );

    expect(
      await screen.findByText(
        "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("proposal-memo-action-status"),
    ).not.toBeInTheDocument();
  });

  it("sanitizes source failures and never invents an actor reference", async () => {
    sourceState = emptyEvidenceState();
    vi.mocked(createProposalMemo).mockRejectedValue(
      new Error("upstream 500: secret host"),
    );
    renderPanel();
    fireEvent.click(screen.getByText("Memo record details"));

    expect(
      screen.getByRole("button", { name: "Prepare advisor memo" }),
    ).toBeDisabled();
    expect(createProposalMemo).not.toHaveBeenCalled();
    enterActor();
    const enabledPrepareButton = screen.getByRole("button", {
      name: "Prepare advisor memo",
    });
    await waitFor(() => expect(enabledPrepareButton).toBeEnabled());
    fireEvent.click(enabledPrepareButton);

    expect(
      await screen.findByText(
        "The advisor memo was not prepared. Recheck the advisor reference and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret host/i)).not.toBeInTheDocument();
  });

  it("blocks memo work when no current proposal version is available", () => {
    renderPanel(null);

    expect(
      screen.getByText(
        "A current proposal version is required before memo evidence can be prepared or reviewed.",
      ),
    ).toBeInTheDocument();
    expect(getProposalMemo).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Prepare advisor memo" }),
    ).toBeDisabled();
  });
});
