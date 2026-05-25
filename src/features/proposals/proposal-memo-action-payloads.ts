import type {
  ProposalMemoAdvisorCommentaryRequest,
  ProposalMemoCreateRequest,
  ProposalMemoReportPackageRequest,
  ProposalMemoReviewRequest,
} from "./types";
import { buildProposalActionIdempotencyKey } from "./proposal-workflow-copy";

export const DEFAULT_MEMO_ADVISOR_ID = "advisor_1";

export const ADVISOR_MEMO_COMMENTARY_SECTIONS = [
  "EXECUTIVE_SUMMARY",
  "LIMITATIONS_AND_DISCLOSURES",
] as const;

export function resolveMemoAdvisorId(advisorId: string): string {
  return advisorId.trim() || DEFAULT_MEMO_ADVISOR_ID;
}

export type MemoActionIdempotencyOperation =
  | "create"
  | "review"
  | "report-package"
  | "advisor-commentary";

export function buildMemoActionIdempotencyKey({
  proposalId,
  versionNo,
  operation,
}: {
  proposalId: string;
  versionNo: number;
  operation: MemoActionIdempotencyOperation;
}): string {
  return buildProposalActionIdempotencyKey(proposalId, `memo-${operation}-${versionNo}`);
}

export function buildCreateMemoPayload(advisorId: string): ProposalMemoCreateRequest {
  return {
    created_by: resolveMemoAdvisorId(advisorId),
    lifecycle_status: "DRAFT",
    reason: { source: "workbench", purpose: "advisor memo review" },
  };
}

export function buildApproveMemoPayload({
  advisorId,
  memoHash,
  reviewReason,
}: {
  advisorId: string;
  memoHash: string;
  reviewReason: string;
}): ProposalMemoReviewRequest {
  return {
    action: "APPROVE_FOR_ADVISOR_USE",
    reviewed_by: resolveMemoAdvisorId(advisorId),
    reason: reviewReason.trim(),
    source_memo_hash: memoHash,
    client_ready_release_requested: false,
  };
}

export function buildMemoReportPackagePayload({
  advisorId,
  memoHash,
}: {
  advisorId: string;
  memoHash: string;
}): ProposalMemoReportPackageRequest {
  return {
    requested_by: resolveMemoAdvisorId(advisorId),
    source_memo_hash: memoHash,
    requested_output_formats: ["pdf"],
    client_ready_document_requested: false,
    reason: { source: "workbench", purpose: "advisor-use memo package" },
  };
}

export function buildAdvisorCommentaryPayload({
  advisorId,
  memoHash,
}: {
  advisorId: string;
  memoHash: string;
}): ProposalMemoAdvisorCommentaryRequest {
  return {
    requested_by: resolveMemoAdvisorId(advisorId),
    source_memo_hash: memoHash,
    requested_sections: [...ADVISOR_MEMO_COMMENTARY_SECTIONS],
    reason: { source: "workbench", purpose: "advisor-use commentary" },
  };
}
