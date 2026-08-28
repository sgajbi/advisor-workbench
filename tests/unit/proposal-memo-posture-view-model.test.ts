import { describe, expect, it } from "vitest";

import {
  buildProposalMemoPostureModel,
  confirmedProposalVersionFromMemoAction,
  confirmedProposalVersionFromMemoRefresh,
  confirmMemoCommentaryRefresh,
  confirmMemoCreateRefresh,
  confirmMemoReportPackageRefresh,
  confirmMemoReviewRefresh,
  proposalMemoArchiveRefsLabel,
  proposalMemoStatusLabel,
  type ProposalMemoRefreshEvidence,
} from "../../src/features/proposals/proposal-memo-posture-view-model";

const MEMO_HASH = "sha256:memo-001";
const COMMENTARY_EVENT_ID = "memo-ai-event-001";
const REPORT_EVENT_ID = "memo-report-event-001";
const REVIEW_EVENT_ID = "memo-review-event-001";
const PROPOSAL_ID = "pp_1";
const VERSION_NO = 2;

function proposalSummary() {
  return {
    proposal_id: PROPOSAL_ID,
    current_state: "DRAFT",
    current_version_no: VERSION_NO,
  };
}

function actionEvent(eventId: string, eventType: string, memoHash = MEMO_HASH) {
  return {
    event_id: eventId,
    event_type: eventType,
    reason: { source_memo_hash: memoHash },
  };
}

function alignedEvidence(): ProposalMemoRefreshEvidence {
  return {
    proposalId: PROPOSAL_ID,
    selectedAudience: "COMPLIANCE",
    versionNo: VERSION_NO,
    memo: {
      proposal: proposalSummary(),
      proposal_version_no: VERSION_NO,
      memo_id: "memo_2",
      memo_hash: MEMO_HASH,
      memo_status: "READY",
      memo: {
        memo_hash: MEMO_HASH,
        memo_id: "memo_2",
        proposal_id: PROPOSAL_ID,
        proposal_version_no: VERSION_NO,
      },
      event_count: 4,
      review_posture: {
        status: "RECORDED",
        review_action: "APPROVE_FOR_ADVISOR_USE",
        source_memo_hash: MEMO_HASH,
      },
      report_package_posture: {
        status: "RECORDED",
        report_status: "ARCHIVED",
        source_memo_hash: MEMO_HASH,
      },
      ai_commentary_posture: {
        status: "RECORDED",
        ai_status: "REVIEW_REQUIRED",
        source_memo_hash: MEMO_HASH,
        authoritative_for_memo_status: false,
      },
      audit_events: [
        actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
        actionEvent(REPORT_EVENT_ID, "MEMO_REPORT_PACKAGE_RECORDED"),
        actionEvent(COMMENTARY_EVENT_ID, "MEMO_AI_REFERENCE_RECORDED"),
      ],
    },
    projection: {
      proposal: proposalSummary(),
      proposal_version_no: VERSION_NO,
      memo_id: "memo_2",
      memo_hash: MEMO_HASH,
      audience: "COMPLIANCE",
      sections: [{ section_id: "SUMMARY" }, { section_id: "DISCLOSURES" }],
      projection_posture: { client_ready_publication: "BLOCKED" },
    },
    lineage: {
      proposal: proposalSummary(),
      memo_count: 2,
      latest_memo_id: "memo_2",
      lineage_complete: true,
      memos: [
        {
          memo_id: "memo_1",
          proposal_version_no: 1,
          memo_hash: "sha256:older",
          event_count: 1,
        },
        {
          memo_id: "memo_2",
          proposal_version_no: VERSION_NO,
          memo_hash: MEMO_HASH,
          event_count: 4,
          archive_refs: [{ document_id: "doc_memo_001" }],
        },
      ],
    },
    replay: {
      subject: {
        proposal_id: PROPOSAL_ID,
        proposal_version_no: VERSION_NO,
        memo_id: "memo_2",
      },
      hashes: { memo_hash: MEMO_HASH },
      audit_events: [
        { event_type: "MEMO_DRAFT_CREATED" },
        actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
        actionEvent(REPORT_EVENT_ID, "MEMO_REPORT_PACKAGE_RECORDED"),
        actionEvent(COMMENTARY_EVENT_ID, "MEMO_AI_REFERENCE_RECORDED"),
      ],
      explanation: { client_ready_publication: "BLOCKED" },
    },
  };
}

describe("buildProposalMemoPostureModel", () => {
  it("projects a dense advisor workflow from source-aligned memo evidence", () => {
    const evidence = alignedEvidence();
    const model = buildProposalMemoPostureModel({
      selectedAudience: evidence.selectedAudience,
      memoData: evidence.memo,
      proposalId: evidence.proposalId,
      projectionData: evidence.projection,
      lineageData: evidence.lineage,
      replayData: evidence.replay,
      versionNo: evidence.versionNo,
    });

    expect(model).toMatchObject({
      archiveRefCount: 1,
      canRecordReview: false,
      canRequestCommentary: true,
      canRequestReportPackage: false,
      clientDraftPublicationLabel: "Unavailable",
      commentaryAuthorityLabel: "Review aid only",
      commentaryRecorded: true,
      commentaryStatusLabel: "Review required",
      eventCount: 4,
      hasMemo: true,
      lineageHashLabel: MEMO_HASH,
      lineageStatusLabel: "Evidence aligned",
      memoHash: MEMO_HASH,
      memoId: "memo_2",
      nextActionKey: "track",
      nextActionTitle: "Review the evidence record",
      projectionAudienceLabel: "Compliance review",
      projectionSectionCount: 2,
      reportArchiveRefsLabel: "1 archived item",
      reportPackageRecorded: true,
      reportPackageStatusLabel: "Available in the record",
      replayHashLabel: MEMO_HASH,
      reviewConfirmed: true,
      reviewPostureLabel: "Approved for advisor use",
      sourceEvidenceAligned: true,
      statusLabel: "Memo prepared",
      supportabilityLabel: "Source evidence aligned",
    });
    expect(model.workflowItems.map((item) => item.label)).toEqual([
      "Memo evidence",
      "Advisor review",
      "Discussion material",
      "Record and audience",
    ]);
    expect(model.workflowItems[3]?.support).toBe("Compliance review · 2 visible sections");
  });

  it("fails closed when review posture or source hashes are unknown", () => {
    const evidence = alignedEvidence();
    evidence.memo = {
      ...evidence.memo,
      memo_status: "SOURCE_VALIDATED_BY_RISK",
      review_posture: {
        status: "SOURCE_VALIDATED_BY_RISK",
        review_action: "APPROVE_FOR_ADVISOR_USE",
        source_memo_hash: MEMO_HASH,
      },
    };
    evidence.projection = { ...evidence.projection, memo_hash: "sha256:stale" };

    const model = buildProposalMemoPostureModel({
      selectedAudience: evidence.selectedAudience,
      memoData: evidence.memo,
      proposalId: evidence.proposalId,
      projectionData: evidence.projection,
      lineageData: evidence.lineage,
      replayData: evidence.replay,
      versionNo: evidence.versionNo,
    });

    expect(model.statusLabel).toBe("Review required");
    expect(model.reviewPostureLabel).toBe("Review required");
    expect(model.reviewConfirmed).toBe(false);
    expect(model.sourceEvidenceAligned).toBe(false);
    expect(model.canRequestReportPackage).toBe(false);
    expect(model.canRequestCommentary).toBe(false);
    expect(model.nextActionKey).toBe("track");
    expect(model.nextActionTitle).toBe("Refresh the memo evidence");
    expect(proposalMemoStatusLabel("SOURCE_VALIDATED_BY_RISK")).toBe("Review required");
  });

  it("does not infer preparation authority from successful empty envelopes", () => {
    const model = buildProposalMemoPostureModel({
      lineageData: {
        lineage_complete: true,
        latest_memo_id: null,
        memo_count: 0,
        memos: [],
        proposal: proposalSummary(),
        proposal_id: PROPOSAL_ID,
      },
      memoData: {},
      proposalId: PROPOSAL_ID,
      projectionData: { audience: "CLIENT_DRAFT", sections: [] },
      replayData: { audit_events: [], hashes: {} },
      selectedAudience: "CLIENT_DRAFT",
      versionNo: VERSION_NO,
    });

    expect(model.hasMemo).toBe(false);
    expect(model.statusLabel).toBe("Memo not prepared");
    expect(model.reviewPostureLabel).toBe("Review required");
    expect(model.sourceIdentityCurrent).toBe(false);
    expect(model.nextActionKey).toBe("track");
    expect(model.clientDraftPublicationLabel).toBe("Unavailable");
    expect(model.reportPackageStatusLabel).toBe("Not requested");

    const historicalLineageModel = buildProposalMemoPostureModel({
      lineageData: {
        lineage_complete: true,
        latest_memo_id: "memo_previous",
        memo_count: 1,
        memos: [{
          memo_hash: "sha256:previous",
          memo_id: "memo_previous",
          proposal_version_no: VERSION_NO - 1,
        }],
        proposal: proposalSummary(),
        proposal_id: PROPOSAL_ID,
      },
      memoData: {},
      proposalId: PROPOSAL_ID,
      projectionData: { audience: "CLIENT_DRAFT", sections: [] },
      replayData: { audit_events: [], hashes: {} },
      selectedAudience: "CLIENT_DRAFT",
      versionNo: VERSION_NO,
    });

    expect(historicalLineageModel.sourceIdentityCurrent).toBe(false);
    expect(historicalLineageModel.nextActionKey).toBe("track");
  });

  it("projects a source-confirmed 404 absence without synthetic memo records", () => {
    const model = buildProposalMemoPostureModel({
      lineageData: {
        lineage_complete: true,
        latest_memo_id: null,
        memo_count: 0,
        memos: [],
        proposal: proposalSummary(),
        proposal_id: PROPOSAL_ID,
      },
      proposalId: PROPOSAL_ID,
      selectedAudience: "ADVISOR",
      sourceConfirmsMemoAbsent: true,
      versionNo: VERSION_NO,
    });

    expect(model.hasMemo).toBe(false);
    expect(model.sourceIdentityCurrent).toBe(true);
    expect(model.statusLabel).toBe("Memo not prepared");
    expect(model.nextActionKey).toBe("prepare");
    expect(model.nextActionTitle).toBe("Prepare the advisor memo");
  });

  it("withholds preparation when a current-version empty record is not proven", () => {
    const model = buildProposalMemoPostureModel({
      proposalId: PROPOSAL_ID,
      selectedAudience: "ADVISOR",
      versionNo: VERSION_NO,
    });

    expect(model.hasMemo).toBe(false);
    expect(model.sourceIdentityCurrent).toBe(false);
    expect(model.nextActionKey).toBe("track");
    expect(model.nextActionTitle).toBe("Refresh the memo evidence");
  });

  it("summarizes archive evidence without exposing storage references", () => {
    expect(proposalMemoArchiveRefsLabel([{ document_id: "doc_1" }])).toBe("1 archived item");
    expect(proposalMemoArchiveRefsLabel([{ document_id: "doc_1" }, { document_id: "doc_2" }])).toBe(
      "2 archived items",
    );
    expect(proposalMemoArchiveRefsLabel([])).toBe("No archived material");
  });

  it("rejects coherent memo evidence from a stale proposal version", () => {
    const evidence = alignedEvidence();
    const staleVersion = 1;
    evidence.memo = {
      ...evidence.memo,
      proposal: { ...proposalSummary(), current_version_no: staleVersion },
      proposal_version_no: staleVersion,
      memo: {
        ...evidence.memo?.memo,
        memo_hash: MEMO_HASH,
        memo_id: "memo_2",
        proposal_id: PROPOSAL_ID,
        proposal_version_no: staleVersion,
      },
    };
    evidence.projection = {
      ...evidence.projection,
      proposal: { ...proposalSummary(), current_version_no: staleVersion },
      proposal_version_no: staleVersion,
    };
    evidence.lineage = {
      ...evidence.lineage,
      proposal: { ...proposalSummary(), current_version_no: staleVersion },
      memos: evidence.lineage?.memos?.map((memo) => ({
        ...memo,
        proposal_version_no: staleVersion,
      })),
    };
    evidence.replay = {
      ...evidence.replay,
      subject: {
        ...evidence.replay?.subject,
        proposal_id: PROPOSAL_ID,
        proposal_version_no: staleVersion,
      },
    };

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: PROPOSAL_ID,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: VERSION_NO,
    });

    expect(model).toMatchObject({
      canRecordReview: false,
      canRequestCommentary: false,
      canRequestReportPackage: false,
      hasMemo: false,
      memoHash: null,
      sourceEvidenceAligned: false,
    });
  });

  it("keeps active actions disabled when source evidence belongs to an older requested version", () => {
    const evidence = alignedEvidence();
    const advancedProposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO + 1,
    };
    evidence.memo = { ...evidence.memo, proposal: advancedProposal };
    evidence.projection = { ...evidence.projection, proposal: advancedProposal };
    evidence.lineage = { ...evidence.lineage, proposal: advancedProposal };

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: evidence.proposalId,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: evidence.versionNo,
    });

    expect(model).toMatchObject({
      canRecordReview: false,
      canRequestCommentary: false,
      canRequestReportPackage: false,
      sourceEvidenceAligned: false,
      sourceIdentityCurrent: false,
    });
  });

  it("rejects aligned evidence when complete lineage repeats a memo identity", () => {
    const evidence = alignedEvidence();
    evidence.lineage = {
      ...evidence.lineage,
      memo_count: 2,
      memos: [
        ...(evidence.lineage?.memos ?? []),
        {
          memo_hash: "sha256:conflicting",
          memo_id: "memo_2",
          proposal_version_no: VERSION_NO - 1,
        },
      ],
    };

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: PROPOSAL_ID,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: VERSION_NO,
    });

    expect(model).toMatchObject({
      canRecordReview: false,
      canRequestCommentary: false,
      canRequestReportPackage: false,
      hasMemo: true,
      sourceEvidenceAligned: false,
      sourceIdentityCurrent: false,
    });
  });

  it("rejects coherent memo evidence owned by another proposal", () => {
    const evidence = alignedEvidence();
    const otherProposalId = "pp_other";
    const otherProposal = {
      ...proposalSummary(),
      proposal_id: otherProposalId,
    };
    evidence.memo = {
      ...evidence.memo,
      proposal: otherProposal,
      memo: {
        ...evidence.memo?.memo,
        memo_hash: MEMO_HASH,
        memo_id: "memo_2",
        proposal_id: otherProposalId,
        proposal_version_no: VERSION_NO,
      },
    };
    evidence.projection = {
      ...evidence.projection,
      proposal: otherProposal,
    };
    evidence.lineage = {
      ...evidence.lineage,
      proposal: otherProposal,
    };
    evidence.replay = {
      ...evidence.replay,
      subject: {
        ...evidence.replay?.subject,
        proposal_id: otherProposalId,
        proposal_version_no: VERSION_NO,
      },
    };

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: PROPOSAL_ID,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: VERSION_NO,
    });

    expect(model).toMatchObject({
      canRecordReview: false,
      canRequestCommentary: false,
      canRequestReportPackage: false,
      hasMemo: false,
      sourceEvidenceAligned: false,
    });
  });

  it.each([
    ["memo", (evidence: ProposalMemoRefreshEvidence) => {
      evidence.memo = { ...evidence.memo, proposal_version_no: 1 };
    }],
    ["projection", (evidence: ProposalMemoRefreshEvidence) => {
      evidence.projection = { ...evidence.projection, proposal_version_no: 1 };
    }],
    ["lineage", (evidence: ProposalMemoRefreshEvidence) => {
      evidence.lineage = {
        ...evidence.lineage,
        memos: evidence.lineage?.memos?.map((memo) =>
          memo.memo_id === "memo_2" ? { ...memo, proposal_version_no: 1 } : memo,
        ),
      };
    }],
    ["replay", (evidence: ProposalMemoRefreshEvidence) => {
      evidence.replay = {
        ...evidence.replay,
        subject: { ...evidence.replay?.subject, proposal_version_no: 1 },
      };
    }],
  ])("fails closed when the %s source view has a different version", (_source, mutate) => {
    const evidence = alignedEvidence();
    mutate(evidence);

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: evidence.proposalId,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: evidence.versionNo,
    });

    expect(model.sourceEvidenceAligned).toBe(false);
    expect(model.canRequestCommentary).toBe(false);
    expect(model.canRequestReportPackage).toBe(false);
  });

  it("rejects a nested memo pack that conflicts with the outer memo identity", () => {
    const evidence = alignedEvidence();
    evidence.memo = {
      ...evidence.memo,
      memo: {
        ...evidence.memo?.memo,
        memo_hash: "sha256:stale-pack",
        memo_id: "memo_stale",
      },
    };

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: evidence.proposalId,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: evidence.versionNo,
    });

    expect(model).toMatchObject({
      canRecordReview: false,
      canRequestCommentary: false,
      canRequestReportPackage: false,
      hasMemo: false,
      memoHash: null,
      memoId: null,
      sourceEvidenceAligned: false,
    });
  });

  it.each([
    ["memo id", { memo_id: " memo_2" }],
    ["memo hash", { memo_hash: `${MEMO_HASH} ` }],
  ])("rejects a padded %s instead of normalizing source identity", (_label, change) => {
    const evidence = alignedEvidence();
    evidence.memo = { ...evidence.memo, ...change };

    const model = buildProposalMemoPostureModel({
      lineageData: evidence.lineage,
      memoData: evidence.memo,
      proposalId: evidence.proposalId,
      projectionData: evidence.projection,
      replayData: evidence.replay,
      selectedAudience: evidence.selectedAudience,
      versionNo: evidence.versionNo,
    });

    expect(model.sourceEvidenceAligned).toBe(false);
    expect(model.canRequestCommentary).toBe(false);
  });
});

describe("proposal memo source-refresh confirmation", () => {
  it("confirms a historical receipt from its immutable evidence after the proposal advances", () => {
    const action = alignedEvidence().memo!;
    const refreshed = alignedEvidence();
    const advancedProposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO + 1,
    };
    refreshed.memo = { ...refreshed.memo, proposal: advancedProposal };
    refreshed.projection = { ...refreshed.projection, proposal: advancedProposal };
    refreshed.lineage = { ...refreshed.lineage, proposal: advancedProposal };

    expect(() => confirmMemoCreateRefresh({ action, refreshed })).not.toThrow();
    expect(confirmedProposalVersionFromMemoRefresh(refreshed)).toBe(
      VERSION_NO + 1,
    );

    refreshed.projection = {
      ...refreshed.projection,
      proposal: {
        ...advancedProposal,
        current_version_no: VERSION_NO + 2,
      },
    };
    expect(() => confirmMemoCreateRefresh({ action, refreshed })).toThrow(
      "Refreshed memo evidence is not aligned across the source record.",
    );
  });

  it("confirms version floors only for the requested proposal", () => {
    const action = alignedEvidence().memo!;
    expect(
      confirmedProposalVersionFromMemoAction(action, PROPOSAL_ID, VERSION_NO),
    ).toBe(VERSION_NO);
    expect(() =>
      confirmedProposalVersionFromMemoAction(
        action,
        "pp_other",
        VERSION_NO,
      ),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");

    const foreignEvidence = alignedEvidence();
    const foreignProposal = {
      ...proposalSummary(),
      proposal_id: "pp_other",
      current_version_no: VERSION_NO + 1,
    };
    foreignEvidence.memo = { ...foreignEvidence.memo, proposal: foreignProposal };
    foreignEvidence.projection = {
      ...foreignEvidence.projection,
      proposal: foreignProposal,
    };
    foreignEvidence.lineage = {
      ...foreignEvidence.lineage,
      proposal: foreignProposal,
    };

    expect(() => confirmedProposalVersionFromMemoRefresh(foreignEvidence)).toThrow(
      "Refreshed memo evidence is not aligned across the source record.",
    );
  });

  it("distinguishes unavailable historical lineage from source disagreement", () => {
    const action = alignedEvidence().memo!;
    const refreshed = alignedEvidence();
    const advancedProposal = {
      ...proposalSummary(),
      current_version_no: VERSION_NO + 1,
    };
    refreshed.memo = { ...refreshed.memo, proposal: advancedProposal };
    refreshed.projection = { ...refreshed.projection, proposal: advancedProposal };
    refreshed.lineage = {
      ...refreshed.lineage,
      proposal: advancedProposal,
      memo_count: 1,
      latest_memo_id: "memo_3",
      memos: [
        {
          memo_id: "memo_3",
          memo_hash: "sha256:memo-3",
          proposal_version_no: VERSION_NO + 1,
        },
      ],
    };

    expect(() => confirmMemoCreateRefresh({ action, refreshed })).toThrow(
      "Historical memo evidence is unavailable for this proposal version.",
    );
  });

  it("confirms memo preparation only when every refreshed source agrees", () => {
    expect(() =>
      confirmMemoCreateRefresh({
        action: alignedEvidence().memo!,
        refreshed: alignedEvidence(),
      }),
    ).not.toThrow();

    const stale = alignedEvidence();
    stale.replay = { hashes: { memo_hash: "sha256:stale" } };
    expect(() =>
      confirmMemoCreateRefresh({ action: alignedEvidence().memo!, refreshed: stale }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
  });

  it("rejects action confirmation when refreshed evidence belongs to another version", () => {
    const stale = alignedEvidence();
    stale.versionNo = 3;

    expect(() =>
      confirmMemoCreateRefresh({ action: alignedEvidence().memo!, refreshed: stale }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
  });

  it("rejects every action confirmation when refreshed evidence regresses behind its response", () => {
    const advancedActionMemo = {
      ...alignedEvidence().memo!,
      proposal: {
        ...proposalSummary(),
        current_version_no: VERSION_NO + 1,
      },
    };
    const refreshed = alignedEvidence();

    expect(() =>
      confirmMemoCreateRefresh({ action: advancedActionMemo, refreshed }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
    expect(() =>
      confirmMemoReviewRefresh({
        action: {
          memo: advancedActionMemo,
          review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
        },
        refreshed,
      }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
    expect(() =>
      confirmMemoReportPackageRefresh({
        action: {
          memo: advancedActionMemo,
          report_package_event: actionEvent(
            REPORT_EVENT_ID,
            "MEMO_REPORT_PACKAGE_RECORDED",
          ),
          report: { status: "ARCHIVED" },
        },
        refreshed,
      }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
    expect(() =>
      confirmMemoCommentaryRefresh({
        action: {
          memo: advancedActionMemo,
          ai_event: actionEvent(
            COMMENTARY_EVENT_ID,
            "MEMO_AI_REFERENCE_RECORDED",
          ),
          commentary: {
            authoritative_for_memo_status: false,
            status: "REVIEW_REQUIRED",
          },
        },
        refreshed,
      }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
  });

  it("rejects a stale-version action response even when refreshed evidence is current", () => {
    const staleAction = {
      ...alignedEvidence().memo!,
      proposal: { ...proposalSummary(), current_version_no: 1 },
      proposal_version_no: 1,
      memo: {
        memo_hash: MEMO_HASH,
        memo_id: "memo_2",
        proposal_id: PROPOSAL_ID,
        proposal_version_no: 1,
      },
    };

    expect(() =>
      confirmMemoCreateRefresh({ action: staleAction, refreshed: alignedEvidence() }),
    ).toThrow("Memo preparation completed, but refreshed source evidence did not confirm it.");
  });

  it("rejects every action response for another memo even when its hash matches", () => {
    const staleMemo = {
      ...alignedEvidence().memo!,
      memo_id: "memo_stale",
      memo: {
        ...alignedEvidence().memo?.memo,
        memo_hash: MEMO_HASH,
        memo_id: "memo_stale",
      },
    };
    const refreshed = alignedEvidence();

    expect(() =>
      confirmMemoCreateRefresh({ action: staleMemo, refreshed }),
    ).toThrow("Memo preparation completed, but refreshed source evidence did not confirm it.");
    expect(() =>
      confirmMemoReviewRefresh({
        action: {
          memo: staleMemo,
          review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
        },
        refreshed,
      }),
    ).toThrow("Advisor review was recorded, but refreshed memo evidence did not confirm it.");
    expect(() =>
      confirmMemoReportPackageRefresh({
        action: {
          memo: staleMemo,
          report_package_event: actionEvent(
            REPORT_EVENT_ID,
            "MEMO_REPORT_PACKAGE_RECORDED",
          ),
          report: { status: "ARCHIVED" },
        },
        refreshed,
      }),
    ).toThrow(
      "Discussion material was requested, but refreshed memo evidence did not confirm it.",
    );
    expect(() =>
      confirmMemoCommentaryRefresh({
        action: {
          memo: staleMemo,
          ai_event: actionEvent(
            COMMENTARY_EVENT_ID,
            "MEMO_AI_REFERENCE_RECORDED",
          ),
          commentary: {
            authoritative_for_memo_status: false,
            status: "REVIEW_REQUIRED",
          },
        },
        refreshed,
      }),
    ).toThrow(
      "Advisor commentary was requested, but refreshed memo evidence did not confirm it.",
    );
  });

  it("confirms review only from the review event and refreshed approved posture", () => {
    const action = {
      memo: alignedEvidence().memo,
      review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
      replayed: false,
    };
    expect(() =>
      confirmMemoReviewRefresh({ action, refreshed: alignedEvidence() }),
    ).not.toThrow();

    expect(() =>
      confirmMemoReviewRefresh({
        action: {
          ...action,
          review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_REQUESTED"),
        },
        refreshed: alignedEvidence(),
      }),
    ).toThrow("Advisor review was recorded, but refreshed memo evidence did not confirm it.");
  });

  it("confirms discussion material only after the report event appears in refreshed posture", () => {
    const action = {
      memo: alignedEvidence().memo,
      report_package_event: actionEvent(
        REPORT_EVENT_ID,
        "MEMO_REPORT_PACKAGE_RECORDED",
      ),
      report: { status: "ARCHIVED" },
      replayed: false,
    };
    expect(() =>
      confirmMemoReportPackageRefresh({ action, refreshed: alignedEvidence() }),
    ).not.toThrow();

    const stale = alignedEvidence();
    stale.memo = {
      ...stale.memo,
      report_package_posture: { status: "NOT_RECORDED" },
    };
    expect(() => confirmMemoReportPackageRefresh({ action, refreshed: stale })).toThrow(
      "Discussion material was requested, but refreshed memo evidence did not confirm it.",
    );
  });

  it("rejects action events that are absent, stale, or padded in refreshed evidence", () => {
    const withoutReviewEvent = alignedEvidence();
    withoutReviewEvent.memo = {
      ...withoutReviewEvent.memo,
      audit_events: withoutReviewEvent.memo?.audit_events?.filter(
        (event) => event.event_id !== REVIEW_EVENT_ID,
      ),
    };
    withoutReviewEvent.replay = {
      ...withoutReviewEvent.replay,
      audit_events: withoutReviewEvent.replay?.audit_events?.filter(
        (event) => event.event_id !== REVIEW_EVENT_ID,
      ),
    };
    expect(() =>
      confirmMemoReviewRefresh({
        action: {
          memo: alignedEvidence().memo,
          review_event: actionEvent(REVIEW_EVENT_ID, "MEMO_REVIEW_RECORDED"),
        },
        refreshed: withoutReviewEvent,
      }),
    ).toThrow("Advisor review was recorded, but refreshed memo evidence did not confirm it.");

    expect(() =>
      confirmMemoReportPackageRefresh({
        action: {
          memo: alignedEvidence().memo,
          report_package_event: actionEvent(
            REPORT_EVENT_ID,
            "MEMO_REPORT_PACKAGE_RECORDED",
            "sha256:stale",
          ),
          report: { status: "ARCHIVED" },
        },
        refreshed: alignedEvidence(),
      }),
    ).toThrow(
      "Discussion material was requested, but refreshed memo evidence did not confirm it.",
    );

    expect(() =>
      confirmMemoCommentaryRefresh({
        action: {
          memo: alignedEvidence().memo,
          ai_event: actionEvent(
            ` ${COMMENTARY_EVENT_ID}`,
            "MEMO_AI_REFERENCE_RECORDED",
          ),
          commentary: {
            authoritative_for_memo_status: false,
            status: "REVIEW_REQUIRED",
          },
        },
        refreshed: alignedEvidence(),
      }),
    ).toThrow(
      "Advisor commentary was requested, but refreshed memo evidence did not confirm it.",
    );
  });

  it("keeps commentary non-authoritative and requires refreshed source evidence", () => {
    const action = {
      memo: alignedEvidence().memo,
      ai_event: actionEvent(
        COMMENTARY_EVENT_ID,
        "MEMO_AI_REFERENCE_RECORDED",
      ),
      commentary: { status: "REVIEW_REQUIRED", authoritative_for_memo_status: false },
      replayed: false,
    };
    expect(() =>
      confirmMemoCommentaryRefresh({ action, refreshed: alignedEvidence() }),
    ).not.toThrow();

    expect(() =>
      confirmMemoCommentaryRefresh({
        action: {
          ...action,
          ai_event: actionEvent(
            "memo-ai-event-current",
            "MEMO_AI_REFERENCE_RECORDED",
          ),
        },
        refreshed: alignedEvidence(),
      }),
    ).toThrow("Advisor commentary was requested, but refreshed memo evidence did not confirm it.");

    expect(() =>
      confirmMemoCommentaryRefresh({
        action: {
          ...action,
          commentary: { status: "READY", authoritative_for_memo_status: true },
        },
        refreshed: alignedEvidence(),
      }),
    ).toThrow("Advisor commentary was requested, but refreshed memo evidence did not confirm it.");
  });
});
