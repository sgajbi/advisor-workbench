import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
import { WorkbenchApiError } from "../../src/features/workbench/api-client";

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
const COMMENTARY_EVENT_ID = "memo-ai-event-001";
const REPORT_EVENT_ID = "memo-report-event-001";
const REVIEW_EVENT_ID = "memo-review-event-001";
const PROPOSAL_ID = "pp_1";
const VERSION_NO = 2;

function proposalSummary(versionNo = VERSION_NO) {
  return {
    proposal_id: PROPOSAL_ID,
    current_state: "DRAFT",
    current_version_no: versionNo,
  };
}

function actionEvent(eventId: string, eventType: string, memoHash = MEMO_HASH) {
  return {
    event_id: eventId,
    event_type: eventType,
    reason: { source_memo_hash: memoHash },
  };
}

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
} = {}, versionNo = VERSION_NO): EvidenceState {
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
      proposal: proposalSummary(versionNo),
      proposal_version_no: versionNo,
      memo_id: "memo_1",
      memo_hash: MEMO_HASH,
      memo_status: "READY",
      memo: {
        memo_hash: MEMO_HASH,
        memo_id: "memo_1",
        proposal_id: PROPOSAL_ID,
        proposal_version_no: versionNo,
      },
      event_count:
        1 +
        Number(reviewed) +
        Number(reportRecorded) +
        Number(commentaryRecorded),
      review_posture: reviewPosture,
      report_package_posture: reportPosture,
      ai_commentary_posture: commentaryPosture,
      audit_events: [
        ...(reviewed
          ? [actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED")]
          : []),
        ...(reportRecorded
          ? [
              actionEvent(
                REPORT_EVENT_ID,
                "MEMO_REPORT_PACKAGE_RECORDED",
              ),
            ]
          : []),
        ...(commentaryRecorded
          ? [
              actionEvent(
                COMMENTARY_EVENT_ID,
                "MEMO_AI_REFERENCE_RECORDED",
              ),
            ]
          : []),
      ],
    },
    projection: {
      proposal: proposalSummary(versionNo),
      proposal_version_no: versionNo,
      memo_id: "memo_1",
      memo_hash: MEMO_HASH,
      audience: "ADVISOR",
      sections: [{ section_id: "SUMMARY" }, { section_id: "DISCLOSURES" }],
      projection_posture: { client_ready_publication: "BLOCKED" },
    },
    lineage: {
      proposal: proposalSummary(versionNo),
      memo_count: 1,
      latest_memo_id: "memo_1",
      lineage_complete: true,
      memos: [
        {
          memo_id: "memo_1",
          proposal_version_no: versionNo,
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
      subject: {
        proposal_id: PROPOSAL_ID,
        proposal_version_no: versionNo,
        memo_id: "memo_1",
      },
      hashes: { memo_hash: MEMO_HASH },
      audit_events: [
        { event_type: "MEMO_DRAFT_CREATED" },
        ...(reviewed
          ? [actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED")]
          : []),
        ...(reportRecorded
          ? [
              actionEvent(
                REPORT_EVENT_ID,
                "MEMO_REPORT_PACKAGE_RECORDED",
              ),
            ]
          : []),
        ...(commentaryRecorded
          ? [
              actionEvent(
                COMMENTARY_EVENT_ID,
                "MEMO_AI_REFERENCE_RECORDED",
              ),
            ]
          : []),
      ],
      explanation: { client_ready_publication: "BLOCKED" },
    },
  };
}

function withProposalCurrentVersion(
  evidence: EvidenceState,
  currentVersionNo: number,
): EvidenceState {
  const proposal = proposalSummary(currentVersionNo);
  return {
    memo: { ...evidence.memo, proposal },
    projection: { ...evidence.projection, proposal },
    lineage: { ...evidence.lineage, proposal },
    replay: evidence.replay,
  };
}

function withMemoIdentity(
  evidence: EvidenceState,
  memoId: string,
  memoHash: string,
): EvidenceState {
  const updatePosture = (posture: Record<string, unknown> | undefined) =>
    posture?.status === "RECORDED"
      ? { ...posture, source_memo_hash: memoHash }
      : posture;
  const updateEvents = (events: Array<Record<string, unknown>> | undefined) =>
    events?.map((event) => ({
      ...event,
      reason:
        typeof event.reason === "object" && event.reason !== null
          ? { ...event.reason, source_memo_hash: memoHash }
          : event.reason,
    }));
  return {
    memo: {
      ...evidence.memo,
      memo_id: memoId,
      memo_hash: memoHash,
      memo: { ...evidence.memo.memo, memo_id: memoId, memo_hash: memoHash },
      review_posture: updatePosture(evidence.memo.review_posture),
      report_package_posture: updatePosture(evidence.memo.report_package_posture),
      ai_commentary_posture: updatePosture(evidence.memo.ai_commentary_posture),
      audit_events: updateEvents(evidence.memo.audit_events),
    },
    projection: {
      ...evidence.projection,
      memo_id: memoId,
      memo_hash: memoHash,
    },
    lineage: {
      ...evidence.lineage,
      latest_memo_id: memoId,
      memos: evidence.lineage.memos?.map((memo) => ({
        ...memo,
        memo_id: memoId,
        memo_hash: memoHash,
      })),
    },
    replay: {
      ...evidence.replay,
      subject: { ...evidence.replay.subject, memo_id: memoId },
      hashes: { ...evidence.replay.hashes, memo_hash: memoHash },
      audit_events: updateEvents(evidence.replay.audit_events),
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
      proposal: proposalSummary(),
      proposal_id: PROPOSAL_ID,
    },
    replay: { hashes: {}, audit_events: [] },
  };
}

function mockMemoNotPrepared() {
  sourceState = emptyEvidenceState();
  vi.mocked(getProposalMemo).mockImplementation(async () => {
    if (!sourceState.memo.memo_id) {
      throw new WorkbenchApiError("proposal memo", 404);
    }
    return sourceState.memo;
  });
  vi.mocked(getProposalMemoProjection).mockImplementation(async () => {
    if (!sourceState.projection.memo_id) {
      throw new WorkbenchApiError("proposal memo projection", 404);
    }
    return sourceState.projection;
  });
  vi.mocked(getProposalMemoReplayEvidence).mockImplementation(async () => {
    if (!sourceState.replay.subject?.memo_id) {
      throw new WorkbenchApiError("proposal memo replay evidence", 404);
    }
    return sourceState.replay;
  });
}

function renderPanel(
  currentVersionNo: number | null = 2,
  proposalId = PROPOSAL_ID,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <ProposalMemoPosturePanel
        proposalId={proposalId}
        currentVersionNo={currentVersionNo}
      />
    </QueryClientProvider>,
  );
  return {
    queryClient,
    rerenderPanel(
      nextVersionNo: number | null,
      nextProposalId = proposalId,
    ) {
      view.rerender(
        <QueryClientProvider client={queryClient}>
          <ProposalMemoPosturePanel
            proposalId={nextProposalId}
            currentVersionNo={nextVersionNo}
          />
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

function enterActor(reference = "advisor_9") {
  fireEvent.change(screen.getByLabelText("Advisor or reviewer reference"), {
    target: { value: reference },
  });
}

async function openMemoDetails() {
  fireEvent.click(await screen.findByText("Memo record details"));
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

  it("withholds lifecycle actions until every source view has settled", async () => {
    let resolveSource!: (value: EvidenceState) => void;
    const pendingSource = new Promise<EvidenceState>((resolve) => {
      resolveSource = resolve;
    });
    vi.mocked(getProposalMemo).mockImplementation(
      async () => (await pendingSource).memo,
    );
    vi.mocked(getProposalMemoProjection).mockImplementation(
      async () => (await pendingSource).projection,
    );
    vi.mocked(getProposalMemoLineage).mockImplementation(
      async () => (await pendingSource).lineage,
    );
    vi.mocked(getProposalMemoReplayEvidence).mockImplementation(
      async () => (await pendingSource).replay,
    );

    renderPanel();

    expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "loading",
    );
    expect(
      screen.getByText(/Checking the current memo, review and retained evidence/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Prepare advisor memo" }),
    ).not.toBeInTheDocument();

    await act(async () => resolveSource(emptyEvidenceState()));

    await waitFor(() =>
      expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
        "data-source-state",
        "unavailable",
      ),
    );
    expect(
      screen.getByText(/Current memo evidence is unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Prepare advisor memo" }),
    ).not.toBeInTheDocument();
  });

  it("rejects empty success envelopes even when lineage retains only prior versions", async () => {
    sourceState = emptyEvidenceState();
    sourceState.lineage = {
      ...sourceState.lineage,
      latest_memo_id: "memo_previous",
      memo_count: 1,
      memos: [{
        memo_hash: "sha256:previous",
        memo_id: "memo_previous",
        proposal_version_no: VERSION_NO - 1,
      }],
    };

    renderPanel();

    expect(
      await screen.findByText(/Current memo evidence is unavailable/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "unavailable",
    );
    expect(
      screen.queryByRole("button", { name: "Prepare advisor memo" }),
    ).not.toBeInTheDocument();
  });

  it("offers preparation when Gateway confirms the current memo is not prepared", async () => {
    mockMemoNotPrepared();

    renderPanel();

    await waitFor(() =>
      expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
        "data-source-state",
        "not-prepared",
      ),
    );
    expect(screen.getAllByText("Memo not prepared").length).toBeGreaterThan(0);
    expect(
      screen.queryByText(/Current memo evidence is unavailable/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Prepare advisor memo" }),
    ).toBeDisabled();

    await openMemoDetails();
    enterActor();

    expect(
      screen.getByRole("button", { name: "Prepare advisor memo" }),
    ).toBeEnabled();
  });

  it("withholds preparation when retained current memo data conflicts with refreshed absence", async () => {
    const { queryClient } = renderPanel();

    await waitFor(() =>
      expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
        "data-source-state",
        "ready",
      ),
    );

    mockMemoNotPrepared();
    await act(async () => {
      await queryClient.refetchQueries();
    });

    await waitFor(() =>
      expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
        "data-source-state",
        "unavailable",
      ),
    );
    expect(
      screen.getByText(/Current memo evidence is unavailable/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Prepare advisor memo" }),
    ).not.toBeInTheDocument();
  });

  it("withholds mutation controls when a required source view is unavailable", async () => {
    vi.mocked(getProposalMemo).mockRejectedValue(
      new Error("upstream memo read unavailable"),
    );

    renderPanel();

    expect(
      await screen.findByText(/Current memo evidence is unavailable/),
    ).toBeInTheDocument();
    expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "unavailable",
    );
    expect(screen.getByRole("button", { name: "Refresh record" })).toBeEnabled();
    expect(
      screen.queryByRole("button", {
        name: /advisor memo|advisor review|discussion material/i,
      }),
    ).not.toBeInTheDocument();
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

    await openMemoDetails();
    expect(screen.getByText("Current proposal version")).toBeInTheDocument();
    expect(screen.getByLabelText("Audience view")).toBeInTheDocument();
    expect(screen.getAllByText("1 archived item").length).toBeGreaterThan(0);
    expect(screen.getByText("sha256:memo-001")).toBeInTheDocument();
  });

  it("prepares a memo and confirms success only after all source views refresh", async () => {
    mockMemoNotPrepared();
    vi.mocked(createProposalMemo).mockImplementation(async () => {
      sourceState = evidenceState();
      return sourceState.memo;
    });
    renderPanel();
    await openMemoDetails();
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
        review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
        replayed: false,
      };
    });
    renderPanel();
    await openMemoDetails();
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
        report_package_event: actionEvent(
          REPORT_EVENT_ID,
          "MEMO_REPORT_PACKAGE_RECORDED",
        ),
        report: { status: "ARCHIVED" },
        replayed: false,
      };
    });
    renderPanel();
    await openMemoDetails();
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
          ai_event: actionEvent(
            COMMENTARY_EVENT_ID,
            "MEMO_AI_REFERENCE_RECORDED",
          ),
          commentary: {
            status: "REVIEW_REQUIRED",
            authoritative_for_memo_status: false,
          },
          replayed: false,
        };
      },
    );
    renderPanel();
    await openMemoDetails();
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

  it("does not confirm repeated commentary from stale aggregate posture", async () => {
    sourceState = evidenceState({
      reviewed: true,
      reportRecorded: true,
      commentaryRecorded: true,
    });
    vi.mocked(requestProposalMemoAdvisorCommentary).mockResolvedValue({
      memo: sourceState.memo,
      ai_event: actionEvent(
        "memo-ai-event-current",
        "MEMO_AI_REFERENCE_RECORDED",
      ),
      commentary: {
        status: "REVIEW_REQUIRED",
        authoritative_for_memo_status: false,
      },
      replayed: false,
    });
    renderPanel();
    await openMemoDetails();
    enterActor();

    fireEvent.click(
      await screen.findByRole("button", { name: "Refresh advisor commentary" }),
    );

    expect(
      await screen.findByText(
        "The commentary request was submitted, but the current memo record could not confirm it. Refresh before retrying.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("proposal-memo-action-status"),
    ).not.toBeInTheDocument();
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
      review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
      replayed: false,
    });
    renderPanel();
    await openMemoDetails();
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
    expect(
      screen.getByTestId("proposal-memo-confirmation-recovery"),
    ).toHaveAttribute("data-confirmation-state", "awaiting-source");
    expect(screen.getByText("Awaiting confirmation")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh record" })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("Advisor or reviewer reference")).toBeDisabled();

    sourceState = evidenceState({ reviewed: true });
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("proposal-memo-confirmation-recovery"),
    ).not.toBeInTheDocument();
    expect(reviewProposalMemo).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Request discussion material" }),
    ).toBeEnabled();
  });

  it("keeps the same recovery path after a confirmation refresh fails", async () => {
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
      review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
      replayed: false,
    });
    renderPanel();
    await openMemoDetails();
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
    await screen.findByRole("button", { name: "Refresh record" });

    vi.mocked(getProposalMemo).mockRejectedValue(
      new Error("current memo read unavailable"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText(
        "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh record" })).toBeEnabled();
    expect(
      screen.getByTestId("proposal-memo-confirmation-recovery"),
    ).toHaveAttribute("data-confirmation-state", "awaiting-source");
    expect(reviewProposalMemo).toHaveBeenCalledTimes(1);
  });

  it("retains a historical confirmation without locking the advanced version", async () => {
    let originalState = evidenceState();
    let currentState = withMemoIdentity(
      evidenceState({}, VERSION_NO + 1),
      "memo_3",
      "sha256:memo-003",
    );
    const regressedState = evidenceState({}, VERSION_NO - 1);
    const stateForVersion = (versionNo: number) =>
      versionNo === VERSION_NO
        ? originalState
        : versionNo < VERSION_NO
          ? regressedState
          : currentState;
    let lineageState = originalState;
    vi.mocked(getProposalMemo).mockImplementation(async (_proposalId, versionNo) =>
      stateForVersion(versionNo).memo,
    );
    vi.mocked(getProposalMemoProjection).mockImplementation(
      async (_proposalId, versionNo) =>
        stateForVersion(versionNo).projection,
    );
    vi.mocked(getProposalMemoLineage).mockImplementation(
      async () => lineageState.lineage,
    );
    vi.mocked(getProposalMemoReplayEvidence).mockImplementation(
      async (_proposalId, versionNo) =>
        stateForVersion(versionNo).replay,
    );
    vi.mocked(reviewProposalMemo).mockImplementation(async (_proposalId, versionNo) => {
      const state = stateForVersion(versionNo);
      if (versionNo !== VERSION_NO) {
        currentState = withMemoIdentity(
          evidenceState({ reviewed: true }, VERSION_NO + 1),
          "memo_3",
          "sha256:memo-003",
        );
      }
      return {
        memo: {
          ...state.memo,
          review_posture: {
            status: "RECORDED",
            review_action: "APPROVE_FOR_ADVISOR_USE",
            source_memo_hash: MEMO_HASH,
          },
        },
        review_event: actionEvent(
          REVIEW_EVENT_ID,
          "MEMO_REVIEW_RECORDED",
          state.memo.memo_hash,
        ),
        replayed: false,
      };
    });
    const { rerenderPanel } = renderPanel();
    await openMemoDetails();
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
    await screen.findByRole("button", { name: "Refresh record" });

    lineageState = regressedState;
    rerenderPanel(VERSION_NO - 1);

    expect(
      await screen.findByText(
        "Advisor review is recorded for proposal version 2, but the active proposal record reports version 1. Refresh the proposal record before taking another action.",
      ),
    ).toBeInTheDocument();
    await openMemoDetails();
    expect(
      screen.getByPlaceholderText("Enter the advisor or reviewer reference"),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
    expect(reviewProposalMemo).toHaveBeenCalledTimes(1);

    originalState = withProposalCurrentVersion(originalState, VERSION_NO + 1);
    lineageState = {
      ...currentState,
      lineage: {
        ...currentState.lineage,
        memo_count: 2,
        memos: [
          ...(originalState.lineage.memos ?? []),
          ...(currentState.lineage.memos ?? []),
        ],
      },
    };
    rerenderPanel(VERSION_NO + 1);

    expect(
      await screen.findByRole("button", { name: "Refresh record" }),
    ).toBeEnabled();
    expect(screen.queryByText("Awaiting confirmation")).not.toBeInTheDocument();
    expect(await screen.findByText("Memo prepared")).toBeInTheDocument();
    expect(reviewProposalMemo).toHaveBeenCalledTimes(1);

    await openMemoDetails();
    enterActor("advisor_10");
    fireEvent.change(
      await screen.findByPlaceholderText(
        "Explain why the memo evidence is appropriate for advisor use.",
      ),
      { target: { value: "Current-version evidence supports advisor use." } },
    );
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeEnabled();
    expect(
      screen.getByText(
        "Advisor review for proposal version 2 was recorded, but its retained evidence has not yet confirmed the action. Recheck this earlier record before relying on it, and use the current source posture to determine the next available action.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("proposal-memo-confirmation-recovery"),
    ).toBeInTheDocument();

    originalState = withProposalCurrentVersion(
      evidenceState({ reviewed: true }),
      VERSION_NO + 1,
    );
    lineageState = originalState;
    fireEvent.click(screen.getByRole("button", { name: "Refresh record" }));

    expect(
      await screen.findByText("Advisor review confirmed for proposal version 2."),
    ).toBeInTheDocument();
    expect(getProposalMemo).toHaveBeenLastCalledWith(PROPOSAL_ID, VERSION_NO);
    expect(reviewProposalMemo).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByTestId("proposal-memo-confirmation-recovery"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        "Explain why the memo evidence is appropriate for advisor use.",
      ),
    ).toHaveValue("Current-version evidence supports advisor use.");

    rerenderPanel(VERSION_NO - 1);
    expect(
      await screen.findByText(
        "Memo evidence is confirmed through proposal version 2, but the active proposal record reports version 1. Refresh the proposal record before taking another action.",
      ),
    ).toBeInTheDocument();
    await openMemoDetails();
    expect(
      screen.getByPlaceholderText("Enter the advisor or reviewer reference"),
    ).toBeDisabled();
  });

  it("keeps an in-flight review fenced without attributing its failure to a new version", async () => {
    sourceState = evidenceState();
    const reviewRequest = createDeferred<
      Awaited<ReturnType<typeof reviewProposalMemo>>
    >();
    vi.mocked(reviewProposalMemo).mockReturnValue(reviewRequest.promise);
    const { rerenderPanel } = renderPanel();
    await openMemoDetails();
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
      await screen.findByRole("button", { name: "Recording review…" }),
    ).toBeDisabled();
    sourceState = evidenceState({}, VERSION_NO + 1);
    rerenderPanel(VERSION_NO + 1);
    await openMemoDetails();
    enterActor("advisor_10");
    fireEvent.change(
      await screen.findByPlaceholderText(
        "Explain why the memo evidence is appropriate for advisor use.",
      ),
      { target: { value: "New-version evidence supports advisor use." } },
    );
    const remountedReview = screen.getByRole("button", {
      name: "Recording review…",
    });
    expect(remountedReview).toBeDisabled();
    fireEvent.click(remountedReview);
    expect(reviewProposalMemo).toHaveBeenCalledTimes(1);

    reviewRequest.reject(new Error("SOURCE_UNAVAILABLE"));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Record advisor review" }),
      ).toBeEnabled(),
    );
    expect(
      screen.queryByText(
        "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
      ),
    ).not.toBeInTheDocument();
  });

  it("resets an unresolved confirmation when proposal identity changes", async () => {
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
      review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
      replayed: false,
    });
    const { rerenderPanel } = renderPanel();
    await openMemoDetails();
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
    await screen.findByRole("button", { name: "Refresh record" });

    rerenderPanel(VERSION_NO, "pp_2");

    await waitFor(() =>
      expect(
        screen.queryByTestId("proposal-memo-confirmation-recovery"),
      ).not.toBeInTheDocument(),
    );
    expect(
      screen.queryByText(
        "The review was submitted, but the current memo evidence could not confirm it. Refresh before taking another action.",
      ),
    ).not.toBeInTheDocument();
  });

  it("clears version-bound action state when the active proposal version changes", async () => {
    sourceState = evidenceState();
    vi.mocked(reviewProposalMemo).mockRejectedValue(
      new Error("upstream review unavailable"),
    );
    const { rerenderPanel } = renderPanel(VERSION_NO);
    await openMemoDetails();
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
        "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
      ),
    ).toBeInTheDocument();

    sourceState = evidenceState({}, VERSION_NO + 1);
    rerenderPanel(VERSION_NO + 1);

    await waitFor(() =>
      expect(
        screen.queryByText(
          "Advisor review was not recorded. Recheck the rationale and reviewer reference, then try again.",
        ),
      ).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByPlaceholderText(
        "Explain why the memo evidence is appropriate for advisor use.",
      ),
    ).toHaveValue("");
    const details = screen.getByText("Memo record details").closest("details");
    if (!details?.hasAttribute("open")) {
      await openMemoDetails();
    }
    expect(screen.getByLabelText("Advisor or reviewer reference")).toHaveValue(
      "",
    );
    expect(
      screen.getByRole("button", { name: "Record advisor review" }),
    ).toBeDisabled();
  });

  it("does not unlock current-version actions from coherent stale-version evidence", async () => {
    sourceState = evidenceState({ reviewed: true, reportRecorded: false });
    sourceState.memo = {
      ...sourceState.memo,
      proposal: proposalSummary(1),
      proposal_version_no: 1,
      memo: {
        ...sourceState.memo.memo,
        memo_hash: MEMO_HASH,
        memo_id: "memo_1",
        proposal_id: PROPOSAL_ID,
        proposal_version_no: 1,
      },
    };
    sourceState.projection = {
      ...sourceState.projection,
      proposal: proposalSummary(1),
      proposal_version_no: 1,
    };
    sourceState.lineage = {
      ...sourceState.lineage,
      proposal: proposalSummary(1),
      memos: sourceState.lineage.memos?.map((memo) => ({
        ...memo,
        proposal_version_no: 1,
      })),
    };
    sourceState.replay = {
      ...sourceState.replay,
      subject: {
        ...sourceState.replay.subject,
        proposal_id: PROPOSAL_ID,
        proposal_version_no: 1,
      },
    };

    renderPanel();

    expect(await screen.findByText("Refresh the memo evidence")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Prepare advisor memo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Request discussion material" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /advisor commentary/i }),
    ).not.toBeInTheDocument();
  });

  it("sanitizes source failures and never invents an actor reference", async () => {
    mockMemoNotPrepared();
    vi.mocked(createProposalMemo).mockRejectedValue(
      new Error("upstream 500: secret host"),
    );
    renderPanel();
    await openMemoDetails();

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
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("proposal-memo-source-state")).toHaveAttribute(
      "data-source-state",
      "unavailable",
    );
  });
});
