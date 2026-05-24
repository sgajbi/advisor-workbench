import type {
  ProposalMemoData,
  ProposalMemoLineageData,
  ProposalMemoProjectionData,
  ProposalMemoReplayEvidenceData,
} from "./types";

export const PROPOSAL_MEMO_PROJECTION_AUDIENCES = [
  "ADVISOR",
  "COMPLIANCE",
  "OPERATIONS",
  "CLIENT_DRAFT",
] as const;

export type ProposalMemoProjectionAudience =
  (typeof PROPOSAL_MEMO_PROJECTION_AUDIENCES)[number];

export type ProposalMemoPostureModel = {
  clientDraftPublicationLabel: string;
  commentaryAuthorityLabel: string;
  commentaryStatusLabel: string;
  hasMemo: boolean;
  lineageHashLabel: string;
  lineageStatusLabel: string;
  memoHash: string | null;
  projectionAudienceLabel: string;
  reportArchiveRefsLabel: string;
  reportPackageStatusLabel: string;
  reviewPostureLabel: string;
  statusLabel: string;
  supportabilityLabel: string;
  replayHashLabel: string;
};

export function textValue(value: unknown, fallback = "Not reported"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value) && value.length > 0) {
    return value.map((item) => String(item)).join(", ");
  }
  return fallback;
}

function recordValue(source: Record<string, unknown> | undefined, key: string): unknown {
  return source?.[key];
}

function firstString(source: Record<string, unknown> | undefined, keys: string[]): string | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

type BuildProposalMemoPostureModelInput = {
  lineageData?: ProposalMemoLineageData;
  memoData?: ProposalMemoData;
  projectionData?: ProposalMemoProjectionData;
  replayData?: ProposalMemoReplayEvidenceData;
  selectedAudience: ProposalMemoProjectionAudience;
};

export function buildProposalMemoPostureModel({
  lineageData,
  memoData,
  projectionData,
  replayData,
  selectedAudience,
}: BuildProposalMemoPostureModelInput): ProposalMemoPostureModel {
  const memo = memoData?.memo;
  const memoHash =
    firstString(memoData, ["memo_hash", "source_memo_hash"]) ??
    firstString(memo, ["memo_hash", "source_memo_hash"]);
  const reviewPosture = memoData?.review_posture;
  const reportPosture = memoData?.report_package_posture;
  const commentaryPosture = memoData?.ai_commentary_posture;
  const readPosture = memoData?.read_posture;
  const projection = projectionData?.projection;
  const projectionPosture = projectionData?.projection_posture;
  const latestMemo = lineageData?.memos?.[0];
  const replayHashes = replayData?.hashes;
  const replaySupportability = replayData?.supportability;
  const hasMemo = Boolean(memoData?.memo_id || memoHash);
  const supportability =
    firstString(readPosture, ["supportability", "status"]) ??
    firstString(projectionPosture, ["supportability", "status"]) ??
    firstString(replaySupportability, ["supportability", "status"]);

  return {
    clientDraftPublicationLabel: textValue(
      recordValue(projection, "client_ready_publication"),
      "Blocked",
    ),
    commentaryAuthorityLabel: textValue(
      recordValue(commentaryPosture, "authority"),
      "Non-authoritative",
    ),
    commentaryStatusLabel: textValue(recordValue(commentaryPosture, "status"), "Not requested"),
    hasMemo,
    lineageHashLabel: latestMemo?.memo_hash ?? "No lineage hash",
    lineageStatusLabel: textValue(latestMemo?.memo_status, "No lineage memo"),
    memoHash,
    projectionAudienceLabel: textValue(recordValue(projection, "audience"), selectedAudience),
    reportArchiveRefsLabel: textValue(recordValue(reportPosture, "archive_refs"), "None"),
    reportPackageStatusLabel: textValue(recordValue(reportPosture, "status"), "Not requested"),
    reviewPostureLabel: textValue(recordValue(reviewPosture, "advisor_use"), "Pending"),
    statusLabel: textValue(memoData?.memo_status, hasMemo ? "Memo Available" : "Memo Pending"),
    supportabilityLabel: supportability ?? "Not reported",
    replayHashLabel: textValue(recordValue(replayHashes, "memo_hash"), "Not available"),
  };
}
