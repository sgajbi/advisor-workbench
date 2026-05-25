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

export const PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS: Record<
  ProposalMemoProjectionAudience,
  string
> = {
  ADVISOR: "Advisor use",
  COMPLIANCE: "Compliance review",
  OPERATIONS: "Operations handoff",
  CLIENT_DRAFT: "Client discussion draft",
};

const PROPOSAL_MEMO_STATUS_LABELS: Record<string, string> = {
  APPROVED_FOR_ADVISOR_USE: "Approved for advisor use",
  AVAILABLE: "Available",
  BLOCKED: "Blocked",
  DEGRADED_SOURCE_EVIDENCE: "Source evidence degraded",
  NON_AUTHORITATIVE: "Non-authoritative",
  READY: "Ready",
  REPLAY_PENDING: "Replay pending",
  SOURCE_BACKED: "Source backed",
  SUPPORTED_ADVISOR_USE: "Advisor-use evidence ready",
};

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

function humanizeStatusToken(value: string): string {
  const normalized = value.trim().replaceAll("_", " ").toLowerCase();
  return normalized.length > 0 ? normalized[0].toUpperCase() + normalized.slice(1) : value;
}

export function proposalMemoStatusLabel(value: unknown, fallback = "Not reported"): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return PROPOSAL_MEMO_STATUS_LABELS[value] ?? humanizeStatusToken(value);
  }
  return textValue(value, fallback);
}

export function proposalMemoArchiveRefsLabel(value: unknown): string {
  if (Array.isArray(value)) {
    const count = value.length;
    if (count === 0) {
      return "No archived report items";
    }
    return count === 1 ? "1 archived report item" : `${count} archived report items`;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return "1 archived report item";
  }
  return "No archived report items";
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

export function proposalMemoProjectionAudienceLabel(
  value: unknown,
  fallback: ProposalMemoProjectionAudience,
): string {
  if (
    typeof value === "string" &&
    Object.hasOwn(PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS, value)
  ) {
    return PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS[value as ProposalMemoProjectionAudience];
  }
  return textValue(value, PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS[fallback]);
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
    clientDraftPublicationLabel: proposalMemoStatusLabel(
      recordValue(projection, "client_ready_publication"),
      "Blocked",
    ),
    commentaryAuthorityLabel: proposalMemoStatusLabel(
      recordValue(commentaryPosture, "authority"),
      "Non-authoritative",
    ),
    commentaryStatusLabel: proposalMemoStatusLabel(
      recordValue(commentaryPosture, "status"),
      "Not requested",
    ),
    hasMemo,
    lineageHashLabel: latestMemo?.memo_hash ?? "No lineage hash",
    lineageStatusLabel: proposalMemoStatusLabel(latestMemo?.memo_status, "No lineage memo"),
    memoHash,
    projectionAudienceLabel: proposalMemoProjectionAudienceLabel(
      recordValue(projection, "audience"),
      selectedAudience,
    ),
    reportArchiveRefsLabel: proposalMemoArchiveRefsLabel(recordValue(reportPosture, "archive_refs")),
    reportPackageStatusLabel: proposalMemoStatusLabel(
      recordValue(reportPosture, "status"),
      "Not requested",
    ),
    reviewPostureLabel: proposalMemoStatusLabel(
      recordValue(reviewPosture, "advisor_use"),
      "Pending",
    ),
    statusLabel: proposalMemoStatusLabel(
      memoData?.memo_status,
      hasMemo ? "Memo available" : "Memo pending",
    ),
    supportabilityLabel: proposalMemoStatusLabel(supportability),
    replayHashLabel: textValue(recordValue(replayHashes, "memo_hash"), "Not available"),
  };
}
