import { describe, expect, it } from "vitest";

import {
  buildProposalMemoPostureModel,
  confirmMemoCommentaryRefresh,
  confirmMemoCreateRefresh,
  confirmMemoReportPackageRefresh,
  confirmMemoReviewRefresh,
  proposalMemoArchiveRefsLabel,
  proposalMemoStatusLabel,
  type ProposalMemoRefreshEvidence,
} from "../../src/features/proposals/proposal-memo-posture-view-model";

const MEMO_HASH = "sha256:memo-001";

function alignedEvidence(): ProposalMemoRefreshEvidence {
  return {
    selectedAudience: "COMPLIANCE",
    memo: {
      memo_id: "memo_2",
      memo_hash: MEMO_HASH,
      memo_status: "READY",
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
    },
    projection: {
      memo_id: "memo_2",
      memo_hash: MEMO_HASH,
      audience: "COMPLIANCE",
      sections: [{ section_id: "SUMMARY" }, { section_id: "DISCLOSURES" }],
      projection_posture: { client_ready_publication: "BLOCKED" },
    },
    lineage: {
      memo_count: 2,
      latest_memo_id: "memo_2",
      lineage_complete: true,
      memos: [
        {
          memo_id: "memo_1",
          memo_hash: "sha256:older",
          event_count: 1,
        },
        {
          memo_id: "memo_2",
          memo_hash: MEMO_HASH,
          event_count: 4,
          archive_refs: [{ document_id: "doc_memo_001" }],
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

describe("buildProposalMemoPostureModel", () => {
  it("projects a dense advisor workflow from source-aligned memo evidence", () => {
    const evidence = alignedEvidence();
    const model = buildProposalMemoPostureModel({
      selectedAudience: evidence.selectedAudience,
      memoData: evidence.memo,
      projectionData: evidence.projection,
      lineageData: evidence.lineage,
      replayData: evidence.replay,
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
      projectionData: evidence.projection,
      lineageData: evidence.lineage,
      replayData: evidence.replay,
    });

    expect(model.statusLabel).toBe("Review required");
    expect(model.reviewPostureLabel).toBe("Review required");
    expect(model.reviewConfirmed).toBe(false);
    expect(model.sourceEvidenceAligned).toBe(false);
    expect(model.canRequestReportPackage).toBe(false);
    expect(model.canRequestCommentary).toBe(false);
    expect(model.nextActionKey).toBe("review");
    expect(proposalMemoStatusLabel("SOURCE_VALIDATED_BY_RISK")).toBe("Review required");
  });

  it("shows a truthful preparation action when no memo exists", () => {
    const model = buildProposalMemoPostureModel({
      selectedAudience: "CLIENT_DRAFT",
    });

    expect(model.hasMemo).toBe(false);
    expect(model.statusLabel).toBe("Memo not prepared");
    expect(model.reviewPostureLabel).toBe("Review required");
    expect(model.nextActionKey).toBe("prepare");
    expect(model.clientDraftPublicationLabel).toBe("Unavailable");
    expect(model.reportPackageStatusLabel).toBe("Not requested");
  });

  it("summarizes archive evidence without exposing storage references", () => {
    expect(proposalMemoArchiveRefsLabel([{ document_id: "doc_1" }])).toBe("1 archived item");
    expect(proposalMemoArchiveRefsLabel([{ document_id: "doc_1" }, { document_id: "doc_2" }])).toBe(
      "2 archived items",
    );
    expect(proposalMemoArchiveRefsLabel([])).toBe("No archived material");
  });
});

describe("proposal memo source-refresh confirmation", () => {
  it("confirms memo preparation only when every refreshed source agrees", () => {
    expect(() =>
      confirmMemoCreateRefresh({
        action: { memo_hash: MEMO_HASH },
        refreshed: alignedEvidence(),
      }),
    ).not.toThrow();

    const stale = alignedEvidence();
    stale.replay = { hashes: { memo_hash: "sha256:stale" } };
    expect(() =>
      confirmMemoCreateRefresh({ action: { memo_hash: MEMO_HASH }, refreshed: stale }),
    ).toThrow("Refreshed memo evidence is not aligned across the source record.");
  });

  it("confirms review only from the review event and refreshed approved posture", () => {
    const action = {
      memo: alignedEvidence().memo,
      review_event: { event_type: "MEMO_REVIEW_RECORDED" },
      replayed: false,
    };
    expect(() =>
      confirmMemoReviewRefresh({ action, refreshed: alignedEvidence() }),
    ).not.toThrow();

    expect(() =>
      confirmMemoReviewRefresh({
        action: { ...action, review_event: { event_type: "MEMO_REVIEW_REQUESTED" } },
        refreshed: alignedEvidence(),
      }),
    ).toThrow("Advisor review was recorded, but refreshed memo evidence did not confirm it.");
  });

  it("confirms discussion material only after the report event appears in refreshed posture", () => {
    const action = {
      memo: alignedEvidence().memo,
      report_package_event: { event_type: "MEMO_REPORT_PACKAGE_RECORDED" },
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

  it("keeps commentary non-authoritative and requires refreshed source evidence", () => {
    const action = {
      memo: alignedEvidence().memo,
      ai_event: { event_type: "MEMO_AI_REFERENCE_RECORDED" },
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
          commentary: { status: "READY", authoritative_for_memo_status: true },
        },
        refreshed: alignedEvidence(),
      }),
    ).toThrow("Advisor commentary was requested, but refreshed memo evidence did not confirm it.");
  });
});
