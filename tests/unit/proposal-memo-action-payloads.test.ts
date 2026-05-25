import { describe, expect, it } from "vitest";

import {
  buildAdvisorCommentaryPayload,
  buildApproveMemoPayload,
  buildCreateMemoPayload,
  buildMemoActionIdempotencyKey,
  buildMemoReportPackagePayload,
  resolveMemoAdvisorId,
} from "../../src/features/proposals/proposal-memo-action-payloads";

describe("proposal memo action payloads", () => {
  it("normalizes advisor identity with a governed fallback", () => {
    expect(resolveMemoAdvisorId(" advisor_9 ")).toBe("advisor_9");
    expect(resolveMemoAdvisorId("   ")).toBe("advisor_1");
  });

  it("builds domain-named idempotency keys for memo actions", () => {
    const key = buildMemoActionIdempotencyKey({
      proposalId: "pp_1",
      versionNo: 2,
      operation: "advisor-commentary",
    });

    expect(key).toContain("ui-memo-advisor-commentary-2-pp_1");
    expect(key).not.toContain("ai-commentary");
  });

  it("builds advisor-use memo creation and review payloads without client release", () => {
    expect(buildCreateMemoPayload(" advisor_9 ")).toEqual({
      created_by: "advisor_9",
      lifecycle_status: "DRAFT",
      reason: { source: "workbench", purpose: "advisor memo review" },
    });

    expect(
      buildApproveMemoPayload({
        advisorId: " advisor_9 ",
        memoHash: "sha256:memo-001",
        reviewReason: " Evidence-backed memo is ready. ",
      }),
    ).toEqual({
      action: "APPROVE_FOR_ADVISOR_USE",
      reviewed_by: "advisor_9",
      reason: "Evidence-backed memo is ready.",
      source_memo_hash: "sha256:memo-001",
      client_ready_release_requested: false,
    });
  });

  it("builds report package and commentary payloads with source memo hash boundaries", () => {
    expect(
      buildMemoReportPackagePayload({
        advisorId: "",
        memoHash: "sha256:memo-001",
      }),
    ).toEqual({
      requested_by: "advisor_1",
      source_memo_hash: "sha256:memo-001",
      requested_output_formats: ["pdf"],
      client_ready_document_requested: false,
      reason: { source: "workbench", purpose: "advisor-use memo package" },
    });

    expect(
      buildAdvisorCommentaryPayload({
        advisorId: "advisor_9",
        memoHash: "sha256:memo-001",
      }),
    ).toEqual({
      requested_by: "advisor_9",
      source_memo_hash: "sha256:memo-001",
      requested_sections: ["EXECUTIVE_SUMMARY", "LIMITATIONS_AND_DISCLOSURES"],
      reason: { source: "workbench", purpose: "advisor-use commentary" },
    });
  });
});
