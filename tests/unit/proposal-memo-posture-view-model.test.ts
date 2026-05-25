import { describe, expect, it } from "vitest";

import {
  buildProposalMemoPostureModel,
  proposalMemoArchiveRefsLabel,
  proposalMemoStatusLabel,
} from "../../src/features/proposals/proposal-memo-posture-view-model";

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
      clientDraftPublicationLabel: "Blocked",
      commentaryAuthorityLabel: "Non-authoritative",
      commentaryStatusLabel: "Available",
      hasMemo: true,
      lineageHashLabel: "sha256:memo-001",
      lineageStatusLabel: "Approved for advisor use",
      memoHash: "sha256:memo-001",
      projectionAudienceLabel: "Compliance review",
      reportArchiveRefsLabel: "1 archived report item",
      reportPackageStatusLabel: "Ready",
      reviewPostureLabel: "Approved for advisor use",
      statusLabel: "Approved for advisor use",
      supportabilityLabel: "Advisor-use evidence ready",
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
    expect(model.statusLabel).toBe("Memo pending");
    expect(model.memoHash).toBeNull();
    expect(model.reviewPostureLabel).toBe("Pending");
    expect(model.projectionAudienceLabel).toBe("Client discussion draft");
    expect(model.clientDraftPublicationLabel).toBe("Blocked");
    expect(model.supportabilityLabel).toBe("Source evidence degraded");
    expect(model.replayHashLabel).toBe("Not available");
    expect(model.reportPackageStatusLabel).toBe("Not requested");
    expect(model.commentaryAuthorityLabel).toBe("Non-authoritative");
  });

  it("humanizes future source states instead of leaking enum tokens", () => {
    expect(proposalMemoStatusLabel("SOURCE_VALIDATED_BY_RISK")).toBe("Source validated by risk");
    expect(proposalMemoStatusLabel("")).toBe("Not reported");
  });

  it("summarizes report archive references without exposing archive URIs", () => {
    expect(proposalMemoArchiveRefsLabel(["archive://memo/report/1"])).toBe("1 archived report item");
    expect(proposalMemoArchiveRefsLabel(["archive://memo/report/1", "archive://memo/report/2"])).toBe(
      "2 archived report items",
    );
    expect(proposalMemoArchiveRefsLabel([])).toBe("No archived report items");
  });
});
