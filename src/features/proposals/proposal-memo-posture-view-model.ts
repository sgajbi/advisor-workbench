import { projectBusinessState } from "@/copy/business-state-copy";

import type {
  ProposalMemoAdvisorCommentaryData,
  ProposalMemoData,
  ProposalMemoLineageData,
  ProposalMemoProjectionData,
  ProposalMemoReplayEvidenceData,
  ProposalMemoReportPackageData,
  ProposalMemoReviewData,
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

export type ProposalMemoWorkflowItem = {
  label: string;
  support: string;
  tone: "default" | "success" | "warn" | "danger";
  value: string;
};

export type ProposalMemoNextAction = "prepare" | "review" | "report" | "track";

export type ProposalMemoPostureModel = {
  archiveRefCount: number;
  canRecordReview: boolean;
  canRequestCommentary: boolean;
  canRequestReportPackage: boolean;
  clientDraftPublicationLabel: string;
  commentaryAuthorityLabel: string;
  commentaryRecorded: boolean;
  commentaryStatusLabel: string;
  eventCount: number;
  hasMemo: boolean;
  lineageHashLabel: string;
  lineageStatusLabel: string;
  memoHash: string | null;
  nextActionDetail: string;
  nextActionKey: ProposalMemoNextAction;
  nextActionTitle: string;
  projectionAudienceLabel: string;
  projectionSectionCount: number;
  reportArchiveRefsLabel: string;
  reportPackageRecorded: boolean;
  reportPackageStatusLabel: string;
  replayHashLabel: string;
  reviewConfirmed: boolean;
  reviewPostureLabel: string;
  sourceEvidenceAligned: boolean;
  statusLabel: string;
  supportabilityLabel: string;
  workflowItems: ProposalMemoWorkflowItem[];
};

type MemoLineageItem = NonNullable<ProposalMemoLineageData["memos"]>[number];

type BuildProposalMemoPostureModelInput = {
  lineageData?: ProposalMemoLineageData | null;
  memoData?: ProposalMemoData | null;
  projectionData?: ProposalMemoProjectionData | null;
  replayData?: ProposalMemoReplayEvidenceData | null;
  selectedAudience: ProposalMemoProjectionAudience;
};

const MEMO_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  APPROVED_FOR_ADVISOR_USE: "Approved for advisor use",
  DRAFT: "Memo prepared",
  READY: "Memo prepared",
});

const REVIEW_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  NOT_RECORDED: "Review required",
  RECORDED: "Review recorded",
});

const REPORT_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  ACCEPTED: "Preparation requested",
  ARCHIVED: "Available in the record",
  BLOCKED: "Needs attention",
  CANCELLED: "Unavailable",
  COMPLETED: "Available in the record",
  COMPLETED_WITH_WARNINGS: "Available with exceptions",
  DEGRADED: "Needs attention",
  FAILED: "Unavailable",
  NOT_RECORDED: "Not requested",
  RECORDED: "Request recorded",
  READY: "Available in the record",
});

const COMMENTARY_STATUS_LABELS: Readonly<Record<string, string>> = Object.freeze({
  NOT_RECORDED: "Not requested",
  RECORDED: "Available for review",
  REVIEW_REQUIRED: "Review required",
  UNAVAILABLE: "Unavailable",
});

export function buildProposalMemoPostureModel({
  lineageData,
  memoData,
  projectionData,
  replayData,
  selectedAudience,
}: BuildProposalMemoPostureModelInput): ProposalMemoPostureModel {
  const memoHash = firstString(memoData, ["memo_hash"]);
  const hasMemo = Boolean(memoData?.memo_id && memoHash);
  const latestMemo = selectLatestMemo(lineageData, memoData?.memo_id, memoHash);
  const replayHash = firstString(replayData?.hashes, ["memo_hash"]);
  const reviewConfirmed = isReviewConfirmed(memoData?.review_posture, memoHash);
  const reportPackageRecorded = isSourceEventRecorded(
    memoData?.report_package_posture,
    memoHash,
  );
  const commentaryRecorded = isSourceEventRecorded(
    memoData?.ai_commentary_posture,
    memoHash,
  );
  const archiveRefCount = latestMemo?.archive_refs?.length ?? 0;
  const projectionAudience = proposalMemoProjectionAudienceLabel(
    projectionData?.audience,
    selectedAudience,
  );
  const sourceEvidenceAligned = Boolean(
    hasMemo
      && projectionData?.memo_hash === memoHash
      && latestMemo?.memo_hash === memoHash
      && replayHash === memoHash
      && lineageData?.lineage_complete !== false,
  );
  const reportStatus =
    firstString(memoData?.report_package_posture, ["report_status", "report_package_status"])
    ?? firstString(memoData?.report_package_posture, ["status"]);
  const commentaryStatus =
    firstString(memoData?.ai_commentary_posture, ["ai_status"])
    ?? firstString(memoData?.ai_commentary_posture, ["status"]);
  const reviewStatus = firstString(memoData?.review_posture, ["status"]);
  const clientDraftPublication =
    firstString(projectionData?.projection_posture, ["client_ready_publication"])
    ?? firstString(projectionData?.projection, ["client_ready_publication"]);
  const eventCount = Math.max(
    memoData?.event_count ?? memoData?.audit_events?.length ?? 0,
    latestMemo?.event_count ?? 0,
    replayData?.audit_events?.length ?? 0,
  );
  const nextAction = projectMemoNextAction({
    hasMemo,
    reportPackageRecorded,
    reviewConfirmed,
  });
  const reviewPostureLabel = reviewConfirmed
    ? "Approved for advisor use"
    : sourceLabel(reviewStatus, REVIEW_STATUS_LABELS, "Review required");
  const reportPackageStatusLabel = sourceLabel(
    reportStatus,
    REPORT_STATUS_LABELS,
    "Not requested",
  );
  const commentaryStatusLabel = sourceLabel(
    commentaryStatus,
    COMMENTARY_STATUS_LABELS,
    "Not requested",
  );

  return {
    archiveRefCount,
    canRecordReview: hasMemo && !reviewConfirmed,
    canRequestCommentary: reviewConfirmed,
    canRequestReportPackage: reviewConfirmed && !reportPackageRecorded,
    clientDraftPublicationLabel: sourceLabel(
      clientDraftPublication,
      { BLOCKED: "Unavailable" },
      "Unavailable",
    ),
    commentaryAuthorityLabel: "Review aid only",
    commentaryRecorded,
    commentaryStatusLabel,
    eventCount,
    hasMemo,
    lineageHashLabel: latestMemo?.memo_hash ?? "Not available",
    lineageStatusLabel: sourceEvidenceAligned ? "Evidence aligned" : "Review required",
    memoHash,
    nextActionDetail: nextAction.detail,
    nextActionKey: nextAction.key,
    nextActionTitle: nextAction.title,
    projectionAudienceLabel: projectionAudience,
    projectionSectionCount: projectionData?.sections?.length ?? 0,
    reportArchiveRefsLabel: proposalMemoArchiveRefsLabel(latestMemo?.archive_refs),
    reportPackageRecorded,
    reportPackageStatusLabel,
    replayHashLabel: replayHash ?? "Not available",
    reviewConfirmed,
    reviewPostureLabel,
    sourceEvidenceAligned,
    statusLabel: sourceLabel(
      memoData?.memo_status,
      MEMO_STATUS_LABELS,
      hasMemo ? "Review required" : "Memo not prepared",
    ),
    supportabilityLabel: sourceEvidenceAligned
      ? "Source evidence aligned"
      : "Source evidence review required",
    workflowItems: [
      {
        label: "Memo evidence",
        value: hasMemo ? "Prepared" : "Not prepared",
        support: hasMemo ? "Current proposal version retained" : "Prepare evidence for this version",
        tone: hasMemo ? "success" : "warn",
      },
      {
        label: "Advisor review",
        value: reviewPostureLabel,
        support: reviewConfirmed
          ? "Confirmed against the current memo"
          : "Required before discussion material",
        tone: reviewConfirmed ? "success" : "warn",
      },
      {
        label: "Discussion material",
        value: reportPackageStatusLabel,
        support: reportPackageRecorded
          ? proposalMemoArchiveRefsLabel(latestMemo?.archive_refs)
          : "Available after advisor review",
        tone: reportPackageRecorded ? "success" : "default",
      },
      {
        label: "Record and audience",
        value: sourceEvidenceAligned ? "Evidence aligned" : "Review required",
        support: `${projectionAudience} · ${projectionSectionCountLabel(
          projectionData?.sections?.length ?? 0,
        )}`,
        tone: sourceEvidenceAligned ? "success" : "warn",
      },
    ],
  };
}

export function proposalMemoStatusLabel(value: unknown, fallback = "Not reported"): string {
  return sourceLabel(asString(value), MEMO_STATUS_LABELS, fallback);
}

export function proposalMemoArchiveRefsLabel(value: unknown): string {
  const count = Array.isArray(value) ? value.length : value ? 1 : 0;
  if (count === 0) {
    return "No archived material";
  }
  return count === 1 ? "1 archived item" : `${count} archived items`;
}

export function proposalMemoProjectionAudienceLabel(
  value: unknown,
  fallback: ProposalMemoProjectionAudience,
): string {
  if (
    typeof value === "string"
    && Object.hasOwn(PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS, value)
  ) {
    return PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS[value as ProposalMemoProjectionAudience];
  }
  return PROPOSAL_MEMO_PROJECTION_AUDIENCE_LABELS[fallback];
}

export function confirmMemoCreateRefresh({
  action,
  refreshed,
}: {
  action: ProposalMemoData;
  refreshed: ProposalMemoRefreshEvidence;
}): void {
  const actionHash = firstString(action, ["memo_hash"]);
  const refreshedModel = assertRefreshEvidence(refreshed);
  if (!actionHash || actionHash !== refreshedModel.memoHash) {
    throw new Error("Memo preparation completed, but refreshed source evidence did not confirm it.");
  }
}

export function confirmMemoReviewRefresh({
  action,
  refreshed,
}: {
  action: ProposalMemoReviewData;
  refreshed: ProposalMemoRefreshEvidence;
}): void {
  const actionHash = firstString(action.memo, ["memo_hash"]);
  const refreshedModel = assertRefreshEvidence(refreshed);
  if (
    action.review_event?.event_type !== "MEMO_REVIEW_RECORDED"
    || !isReviewConfirmed(action.memo?.review_posture, actionHash)
    || actionHash !== refreshedModel.memoHash
    || !refreshedModel.reviewConfirmed
  ) {
    throw new Error("Advisor review was recorded, but refreshed memo evidence did not confirm it.");
  }
}

export function confirmMemoReportPackageRefresh({
  action,
  refreshed,
}: {
  action: ProposalMemoReportPackageData;
  refreshed: ProposalMemoRefreshEvidence;
}): void {
  const actionHash = firstString(action.memo, ["memo_hash"]);
  const refreshedModel = assertRefreshEvidence(refreshed);
  if (
    action.report_package_event?.event_type !== "MEMO_REPORT_PACKAGE_RECORDED"
    || !action.report
    || actionHash !== refreshedModel.memoHash
    || !refreshedModel.reportPackageRecorded
  ) {
    throw new Error(
      "Discussion material was requested, but refreshed memo evidence did not confirm it.",
    );
  }
}

export function confirmMemoCommentaryRefresh({
  action,
  refreshed,
}: {
  action: ProposalMemoAdvisorCommentaryData;
  refreshed: ProposalMemoRefreshEvidence;
}): void {
  const actionHash = firstString(action.memo, ["memo_hash"]);
  const refreshedModel = assertRefreshEvidence(refreshed);
  if (
    action.ai_event?.event_type !== "MEMO_AI_REFERENCE_RECORDED"
    || !action.commentary
    || action.commentary.authoritative_for_memo_status !== false
    || actionHash !== refreshedModel.memoHash
    || !refreshedModel.commentaryRecorded
  ) {
    throw new Error(
      "Advisor commentary was requested, but refreshed memo evidence did not confirm it.",
    );
  }
}

export type ProposalMemoRefreshEvidence = {
  lineage?: ProposalMemoLineageData;
  memo?: ProposalMemoData;
  projection?: ProposalMemoProjectionData;
  replay?: ProposalMemoReplayEvidenceData;
  selectedAudience: ProposalMemoProjectionAudience;
};

function assertRefreshEvidence(refreshed: ProposalMemoRefreshEvidence): ProposalMemoPostureModel {
  const model = buildProposalMemoPostureModel({
    lineageData: refreshed.lineage,
    memoData: refreshed.memo,
    projectionData: refreshed.projection,
    replayData: refreshed.replay,
    selectedAudience: refreshed.selectedAudience,
  });
  if (!model.sourceEvidenceAligned) {
    throw new Error("Refreshed memo evidence is not aligned across the source record.");
  }
  return model;
}

function isReviewConfirmed(
  posture: Record<string, unknown> | undefined,
  memoHash: string | null,
): boolean {
  return Boolean(
    memoHash
      && posture?.status === "RECORDED"
      && posture.review_action === "APPROVE_FOR_ADVISOR_USE"
      && posture.source_memo_hash === memoHash,
  );
}

function isSourceEventRecorded(
  posture: Record<string, unknown> | undefined,
  memoHash: string | null,
): boolean {
  return Boolean(
    memoHash
      && posture?.status === "RECORDED"
      && posture.source_memo_hash === memoHash,
  );
}

function selectLatestMemo(
  lineageData: ProposalMemoLineageData | null | undefined,
  currentMemoId: string | undefined,
  currentMemoHash: string | null,
): MemoLineageItem | undefined {
  const memos = lineageData?.memos ?? [];
  const latestMemoId = lineageData?.latest_memo_id;
  return (
    memos.find((memo) => memo.memo_id === latestMemoId)
    ?? memos.find((memo) => memo.memo_id === currentMemoId)
    ?? memos.find((memo) => memo.memo_hash === currentMemoHash)
    ?? memos.at(-1)
  );
}

function projectMemoNextAction({
  hasMemo,
  reportPackageRecorded,
  reviewConfirmed,
}: {
  hasMemo: boolean;
  reportPackageRecorded: boolean;
  reviewConfirmed: boolean;
}): { detail: string; key: ProposalMemoNextAction; title: string } {
  if (!hasMemo) {
    return {
      key: "prepare",
      title: "Prepare the advisor memo",
      detail: "Create the evidence-backed working memo for this proposal version.",
    };
  }
  if (!reviewConfirmed) {
    return {
      key: "review",
      title: "Record advisor review",
      detail: "Confirm the memo evidence before requesting material for the client discussion.",
    };
  }
  if (!reportPackageRecorded) {
    return {
      key: "report",
      title: "Request discussion material",
      detail: "The reviewed memo can now be packaged for the advisor-led client discussion.",
    };
  }
  return {
    key: "track",
    title: "Review the evidence record",
    detail: "Confirm the latest material, audience view and retained evidence before the meeting.",
  };
}

function projectionSectionCountLabel(count: number): string {
  return `${count} visible section${count === 1 ? "" : "s"}`;
}

function firstString(
  source: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = source?.[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceLabel(
  value: string | null | undefined,
  labels: Readonly<Record<string, string>>,
  fallback: string,
): string {
  if (!value) {
    return fallback;
  }
  return labels[value] ?? projectBusinessState(value).label;
}
