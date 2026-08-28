import { projectBusinessState } from "@/copy/business-state-copy";

import {
  isCurrentVersionNoMemoLineage,
  lineageItemIdentity,
  memoIdentitiesEqual,
  resolveHistoricalMemoLineageSource,
  resolveHistoricalMemoSourceIdentity,
  resolveHistoricalProjectionSourceIdentity,
  resolveMemoSourceIdentity,
  resolveMemoLineageSource,
  resolveProjectionSourceIdentity,
  resolveReplaySourceIdentity,
  type ProposalMemoIdentity,
} from "./proposal-memo-source-identity";

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
  memoId: string | null;
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
  sourceEvidenceFailureReason: "alignment" | "historical-lineage-unavailable" | null;
  sourceIdentityCurrent: boolean;
  statusLabel: string;
  supportabilityLabel: string;
  workflowItems: ProposalMemoWorkflowItem[];
};

type BuildProposalMemoPostureModelInput = {
  lineageData?: ProposalMemoLineageData | null;
  memoData?: ProposalMemoData | null;
  proposalId: string;
  projectionData?: ProposalMemoProjectionData | null;
  replayData?: ProposalMemoReplayEvidenceData | null;
  selectedAudience: ProposalMemoProjectionAudience;
  sourceConfirmsMemoAbsent?: boolean;
  versionNo: number | null;
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

export function buildProposalMemoPostureModel(
  input: BuildProposalMemoPostureModelInput,
): ProposalMemoPostureModel {
  return buildProposalMemoPostureModelForVersion(input, false);
}

function buildProposalMemoPostureModelForVersion({
  lineageData,
  memoData,
  proposalId,
  projectionData,
  replayData,
  selectedAudience,
  sourceConfirmsMemoAbsent = false,
  versionNo,
}: BuildProposalMemoPostureModelInput, allowNewerProposalVersion: boolean): ProposalMemoPostureModel {
  const memoIdentityResolver = allowNewerProposalVersion
    ? resolveHistoricalMemoSourceIdentity
    : resolveMemoSourceIdentity;
  const projectionIdentityResolver = allowNewerProposalVersion
    ? resolveHistoricalProjectionSourceIdentity
    : resolveProjectionSourceIdentity;
  const memoLineageResolver = allowNewerProposalVersion
    ? resolveHistoricalMemoLineageSource
    : resolveMemoLineageSource;
  const memoIdentity = memoIdentityResolver(
    memoData,
    proposalId,
    versionNo,
  );
  const projectionIdentity = projectionIdentityResolver(
    projectionData,
    proposalId,
    versionNo,
  );
  const replayIdentity = resolveReplaySourceIdentity(
    replayData,
    proposalId,
    versionNo,
  );
  const memoHash = memoIdentity?.memoHash ?? null;
  const memoId = memoIdentity?.memoId ?? null;
  const hasMemo = Boolean(memoIdentity);
  const lineageResolution = memoLineageResolver(
    lineageData,
    memoIdentity,
    proposalId,
    versionNo,
  );
  const latestMemo = lineageResolution.kind === "matched"
    ? lineageResolution.item
    : undefined;
  const projectionMatchesCurrentMemo = memoIdentitiesEqual(
    projectionIdentity,
    memoIdentity,
  );
  const replayMatchesCurrentMemo = memoIdentitiesEqual(
    replayIdentity,
    memoIdentity,
  );
  const replayHash = replayMatchesCurrentMemo ? replayIdentity?.memoHash ?? null : null;
  const reviewConfirmed = Boolean(
    memoIdentity && isReviewConfirmed(memoData?.review_posture, memoHash),
  );
  const reportPackageRecorded = isSourceEventRecorded(
    memoIdentity ? memoData?.report_package_posture : undefined,
    memoHash,
  );
  const commentaryRecorded = isSourceEventRecorded(
    memoIdentity ? memoData?.ai_commentary_posture : undefined,
    memoHash,
  );
  const archiveRefCount = latestMemo?.archive_refs?.length ?? 0;
  const projectionAudience = proposalMemoProjectionAudienceLabel(
    projectionMatchesCurrentMemo ? projectionData?.audience : undefined,
    selectedAudience,
  );
  const sourceEvidenceAligned = Boolean(
    memoIdentity
      && memoIdentitiesEqual(projectionIdentity, memoIdentity)
      && memoIdentitiesEqual(lineageItemIdentity(latestMemo, proposalId), memoIdentity)
      && memoIdentitiesEqual(replayIdentity, memoIdentity)
      && lineageData?.lineage_complete === true,
  );
  const sourceIdentityCurrent = sourceEvidenceAligned
    || (
      sourceConfirmsMemoAbsent
      && versionNo !== null
      && lineageData !== null
      && lineageData !== undefined
      && isCurrentVersionNoMemoLineage(lineageData, proposalId, versionNo)
    );
  const sourceEvidenceFailureReason = sourceEvidenceAligned
    ? null
    : lineageResolution.kind === "historical-item-missing"
      ? "historical-lineage-unavailable" as const
      : "alignment" as const;
  const reportStatus =
    firstString(
      memoIdentity ? memoData?.report_package_posture : undefined,
      ["report_status", "report_package_status"],
    )
    ?? firstString(
      memoIdentity ? memoData?.report_package_posture : undefined,
      ["status"],
    );
  const commentaryStatus =
    firstString(
      memoIdentity ? memoData?.ai_commentary_posture : undefined,
      ["ai_status"],
    )
    ?? firstString(
      memoIdentity ? memoData?.ai_commentary_posture : undefined,
      ["status"],
    );
  const reviewStatus = firstString(
    memoIdentity ? memoData?.review_posture : undefined,
    ["status"],
  );
  const clientDraftPublication =
    firstString(
      projectionMatchesCurrentMemo ? projectionData?.projection_posture : undefined,
      ["client_ready_publication"],
    )
    ?? firstString(
      projectionMatchesCurrentMemo ? projectionData?.projection : undefined,
      ["client_ready_publication"],
    );
  const eventCount = Math.max(
    memoIdentity
      ? (memoData?.event_count ?? memoData?.audit_events?.length ?? 0)
      : 0,
    latestMemo?.event_count ?? 0,
    replayMatchesCurrentMemo ? (replayData?.audit_events?.length ?? 0) : 0,
  );
  const nextAction = projectMemoNextAction({
    hasMemo,
    reportPackageRecorded,
    reviewConfirmed,
    sourceEvidenceAligned,
    sourceIdentityCurrent,
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
    canRecordReview: sourceEvidenceAligned && !reviewConfirmed,
    canRequestCommentary: sourceEvidenceAligned && reviewConfirmed,
    canRequestReportPackage:
      sourceEvidenceAligned && reviewConfirmed && !reportPackageRecorded,
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
    memoId,
    nextActionDetail: nextAction.detail,
    nextActionKey: nextAction.key,
    nextActionTitle: nextAction.title,
    projectionAudienceLabel: projectionAudience,
    projectionSectionCount: projectionMatchesCurrentMemo
      ? (projectionData?.sections?.length ?? 0)
      : 0,
    reportArchiveRefsLabel: proposalMemoArchiveRefsLabel(latestMemo?.archive_refs),
    reportPackageRecorded,
    reportPackageStatusLabel,
    replayHashLabel: replayHash ?? "Not available",
    reviewConfirmed,
    reviewPostureLabel,
    sourceEvidenceAligned,
    sourceEvidenceFailureReason,
    sourceIdentityCurrent,
    statusLabel: sourceLabel(
      memoIdentity ? memoData?.memo_status : undefined,
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
          projectionMatchesCurrentMemo ? (projectionData?.sections?.length ?? 0) : 0,
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
  const actionIdentity = resolveHistoricalMemoSourceIdentity(
    action,
    refreshed.proposalId,
    refreshed.versionNo,
  );
  const refreshedModel = assertRefreshEvidence(
    refreshed,
    actionIdentity ? action.proposal?.current_version_no : undefined,
  );
  if (
    !actionMatchesRefreshedMemo(actionIdentity, refreshed, refreshedModel)
  ) {
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
  const actionIdentity = resolveHistoricalMemoSourceIdentity(
    action.memo,
    refreshed.proposalId,
    refreshed.versionNo,
  );
  const refreshedModel = assertRefreshEvidence(
    refreshed,
    actionIdentity ? action.memo?.proposal?.current_version_no : undefined,
  );
  if (
    !actionMatchesRefreshedMemo(actionIdentity, refreshed, refreshedModel)
    || !memoActionEventConfirmed({
      event: action.review_event,
      eventType: "MEMO_REVIEW_RECORDED",
      memoHash: actionIdentity?.memoHash ?? null,
      refreshed,
    })
    || !isReviewConfirmed(action.memo?.review_posture, actionIdentity?.memoHash ?? null)
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
  const actionIdentity = resolveHistoricalMemoSourceIdentity(
    action.memo,
    refreshed.proposalId,
    refreshed.versionNo,
  );
  const refreshedModel = assertRefreshEvidence(
    refreshed,
    actionIdentity ? action.memo?.proposal?.current_version_no : undefined,
  );
  if (
    !actionMatchesRefreshedMemo(actionIdentity, refreshed, refreshedModel)
    || !memoActionEventConfirmed({
      event: action.report_package_event,
      eventType: "MEMO_REPORT_PACKAGE_RECORDED",
      memoHash: actionIdentity?.memoHash ?? null,
      refreshed,
    })
    || !action.report
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
  const actionIdentity = resolveHistoricalMemoSourceIdentity(
    action.memo,
    refreshed.proposalId,
    refreshed.versionNo,
  );
  const refreshedModel = assertRefreshEvidence(
    refreshed,
    actionIdentity ? action.memo?.proposal?.current_version_no : undefined,
  );
  if (
    !actionMatchesRefreshedMemo(actionIdentity, refreshed, refreshedModel)
    || !memoActionEventConfirmed({
      event: action.ai_event,
      eventType: "MEMO_AI_REFERENCE_RECORDED",
      memoHash: actionIdentity?.memoHash ?? null,
      refreshed,
    })
    || !action.commentary
    || action.commentary.authoritative_for_memo_status !== false
    || !refreshedModel.commentaryRecorded
  ) {
    throw new Error(
      "Advisor commentary was requested, but refreshed memo evidence did not confirm it.",
    );
  }
}

function memoActionEventConfirmed({
  event,
  eventType,
  memoHash,
  refreshed,
}: {
  event: Record<string, unknown> | null | undefined;
  eventType: string;
  memoHash: string | null;
  refreshed: ProposalMemoRefreshEvidence;
}): boolean {
  const eventId = exactString(event, "event_id");
  const reason = event?.reason;
  if (
    !eventId
    || !memoHash
    || exactString(event, "event_type") !== eventType
    || typeof reason !== "object"
    || reason === null
    || Array.isArray(reason)
    || exactString(reason as Record<string, unknown>, "source_memo_hash") !== memoHash
  ) {
    return false;
  }
  return hasRefreshedMemoAuditEvent(refreshed, eventId, eventType, memoHash);
}

function hasRefreshedMemoAuditEvent(
  refreshed: ProposalMemoRefreshEvidence,
  eventId: string,
  eventType: string,
  memoHash: string,
): boolean {
  return [
    ...(refreshed.memo?.audit_events ?? []),
    ...(refreshed.replay?.audit_events ?? []),
  ].some(
    (event) =>
      exactString(event, "event_id") === eventId
      && exactString(event, "event_type") === eventType
      && typeof event.reason === "object"
      && event.reason !== null
      && !Array.isArray(event.reason)
      && exactString(
        event.reason as Record<string, unknown>,
        "source_memo_hash",
      ) === memoHash,
  );
}

function actionMatchesRefreshedMemo(
  actionIdentity: ProposalMemoIdentity | null,
  refreshed: ProposalMemoRefreshEvidence,
  refreshedModel: ProposalMemoPostureModel,
): boolean {
  if (!refreshedModel.memoId || !refreshedModel.memoHash) {
    return false;
  }
  return memoIdentitiesEqual(actionIdentity, {
    memoHash: refreshedModel.memoHash,
    memoId: refreshedModel.memoId,
    proposalId: refreshed.proposalId,
    versionNo: refreshed.versionNo,
  });
}

export type ProposalMemoRefreshEvidence = {
  lineage?: ProposalMemoLineageData;
  memo?: ProposalMemoData;
  proposalId: string;
  projection?: ProposalMemoProjectionData;
  replay?: ProposalMemoReplayEvidenceData;
  selectedAudience: ProposalMemoProjectionAudience;
  versionNo: number;
};

export class ProposalMemoRefreshVerificationError extends Error {
  constructor(
    readonly reason: "alignment" | "historical-lineage-unavailable",
  ) {
    super(
      reason === "historical-lineage-unavailable"
        ? "Historical memo evidence is unavailable for this proposal version."
        : "Refreshed memo evidence is not aligned across the source record.",
    );
    this.name = "ProposalMemoRefreshVerificationError";
  }
}

export function confirmedProposalVersionFromMemoRefresh(
  refreshed: ProposalMemoRefreshEvidence,
): number {
  const sourceVersions = [
    refreshed.memo?.proposal?.current_version_no,
    refreshed.projection?.proposal?.current_version_no,
    refreshed.lineage?.proposal?.current_version_no,
  ];
  const confirmedVersion = sourceVersions[0];
  if (
    !Number.isSafeInteger(confirmedVersion)
    || Number(confirmedVersion) < refreshed.versionNo
    || sourceVersions.some((versionNo) => versionNo !== confirmedVersion)
  ) {
    throw new ProposalMemoRefreshVerificationError("alignment");
  }
  return Number(confirmedVersion);
}

function assertRefreshEvidence(
  refreshed: ProposalMemoRefreshEvidence,
  actionCurrentVersionNo?: number,
): ProposalMemoPostureModel {
  const confirmedVersionNo = confirmedProposalVersionFromMemoRefresh(refreshed);
  if (
    actionCurrentVersionNo !== undefined
    && confirmedVersionNo < actionCurrentVersionNo
  ) {
    throw new ProposalMemoRefreshVerificationError("alignment");
  }
  const model = buildProposalMemoPostureModelForVersion({
    lineageData: refreshed.lineage,
    memoData: refreshed.memo,
    proposalId: refreshed.proposalId,
    projectionData: refreshed.projection,
    replayData: refreshed.replay,
    selectedAudience: refreshed.selectedAudience,
    versionNo: refreshed.versionNo,
  }, true);
  if (!model.sourceEvidenceAligned) {
    if (model.sourceEvidenceFailureReason === "historical-lineage-unavailable") {
      throw new ProposalMemoRefreshVerificationError(
        "historical-lineage-unavailable",
      );
    }
    throw new ProposalMemoRefreshVerificationError("alignment");
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

function isExactNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value === value.trim();
}

function exactString(
  source: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = source?.[key];
  return isExactNonBlankString(value) ? value : null;
}

function projectMemoNextAction({
  hasMemo,
  reportPackageRecorded,
  reviewConfirmed,
  sourceEvidenceAligned,
  sourceIdentityCurrent,
}: {
  hasMemo: boolean;
  reportPackageRecorded: boolean;
  reviewConfirmed: boolean;
  sourceEvidenceAligned: boolean;
  sourceIdentityCurrent: boolean;
}): { detail: string; key: ProposalMemoNextAction; title: string } {
  if (!sourceIdentityCurrent) {
    return {
      key: "track",
      title: "Refresh the memo evidence",
      detail:
        "Current proposal, projection, lineage and replay evidence must identify this proposal version before the next advisor action.",
    };
  }
  if (!hasMemo) {
    return {
      key: "prepare",
      title: "Prepare the advisor memo",
      detail: "Create the evidence-backed working memo for this proposal version.",
    };
  }
  if (!sourceEvidenceAligned) {
    return {
      key: "track",
      title: "Refresh the memo evidence",
      detail:
        "Current proposal, projection, lineage and replay evidence must agree before the next advisor action.",
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
