import type {
  ProposalMemoAdvisorCommentaryRequest,
  ProposalMemoCreateRequest,
  ProposalMemoReportPackageRequest,
  ProposalMemoReviewRequest,
} from "./types";
import { buildProposalActionIdempotencyKey } from "./proposal-workflow-copy";

export const ADVISOR_MEMO_COMMENTARY_SECTIONS = [
  "EXECUTIVE_SUMMARY",
  "LIMITATIONS_AND_DISCLOSURES",
] as const;

export function requireMemoActorReference(actorReference: string): string {
  const normalizedReference = actorReference.trim();
  if (!normalizedReference) {
    throw new Error("An advisor or reviewer reference is required.");
  }
  return normalizedReference;
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
    created_by: requireMemoActorReference(advisorId),
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
    reviewed_by: requireMemoActorReference(advisorId),
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
    requested_by: requireMemoActorReference(advisorId),
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
    requested_by: requireMemoActorReference(advisorId),
    source_memo_hash: memoHash,
    requested_sections: [...ADVISOR_MEMO_COMMENTARY_SECTIONS],
    reason: { source: "workbench", purpose: "advisor-use commentary" },
  };
}
