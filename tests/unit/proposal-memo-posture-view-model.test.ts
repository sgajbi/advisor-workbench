import { describe, expect, it } from "vitest";

import { buildProposalMemoPostureModel } from "../../src/features/proposals/proposal-memo-posture-view-model";

describe("buildProposalMemoPostureModel", () => {
  it("builds advisor memo posture from memo, projection, lineage, and replay evidence", () => {
    const model = buildProposalMemoPostureModel({
      selectedAudience: "ADVISOR",
      memoData: {
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
      },
      projectionData: {
        projection: {
          audience: "COMPLIANCE",
          client_ready_publication: "BLOCKED",
        },
      },
      lineageData: {
        memos: [
          {
            memo_hash: "sha256:memo-001",
            memo_status: "APPROVED_FOR_ADVISOR_USE",
          },
        ],
      },
      replayData: {
        hashes: {
          memo_hash: "sha256:memo-001",
        },
      },
    });

    expect(model).toMatchObject({
      clientDraftPublicationLabel: "BLOCKED",
      commentaryAuthorityLabel: "NON_AUTHORITATIVE",
      commentaryStatusLabel: "AVAILABLE",
      hasMemo: true,
      lineageHashLabel: "sha256:memo-001",
      lineageStatusLabel: "APPROVED_FOR_ADVISOR_USE",
      memoHash: "sha256:memo-001",
      projectionAudienceLabel: "COMPLIANCE",
      reportArchiveRefsLabel: "archive://memo/report/1",
      reportPackageStatusLabel: "READY",
      reviewPostureLabel: "APPROVED_FOR_ADVISOR_USE",
      statusLabel: "APPROVED_FOR_ADVISOR_USE",
      supportabilityLabel: "SUPPORTED_ADVISOR_USE",
      replayHashLabel: "sha256:memo-001",
    });
  });

  it("falls back to source-owned projection and replay posture without inventing readiness", () => {
    const model = buildProposalMemoPostureModel({
      selectedAudience: "CLIENT_DRAFT",
      memoData: undefined,
      projectionData: {
        projection_posture: { supportability: "DEGRADED_SOURCE_EVIDENCE" },
      },
      replayData: {
        supportability: { status: "REPLAY_PENDING" },
      },
    });

    expect(model.hasMemo).toBe(false);
    expect(model.statusLabel).toBe("Memo Pending");
    expect(model.memoHash).toBeNull();
    expect(model.reviewPostureLabel).toBe("Pending");
    expect(model.projectionAudienceLabel).toBe("CLIENT_DRAFT");
    expect(model.clientDraftPublicationLabel).toBe("Blocked");
    expect(model.supportabilityLabel).toBe("DEGRADED_SOURCE_EVIDENCE");
    expect(model.replayHashLabel).toBe("Not available");
    expect(model.reportPackageStatusLabel).toBe("Not requested");
    expect(model.commentaryAuthorityLabel).toBe("Non-authoritative");
  });
});
