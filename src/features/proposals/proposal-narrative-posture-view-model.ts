import {
  formatTimestampValue,
  isTimestampValue,
} from "@/design-system/utils/financial-formatters";

import type {
  ProposalDeliveryEventsData,
  ProposalDeliverySummaryData,
  ProposalNarrativeReviewData,
  ProposalReportRequestData,
} from "./types";

export type ProposalNarrativePostureModel = {
  canRequestDiscussionPack: boolean;
  reviewTone: "success" | "warn";
  reviewState: string;
  reportPackageState: string;
  deliveryState: string;
  sourceNarrativeHash: string | null;
  eventCount: number;
  latestEventLabel: string;
  latestEventTime: string | null;
  policyVersion: string | null;
  nextActionDetail: string;
  nextActionTitle: string;
  workflowItems: ProposalNarrativeWorkflowItem[];
};

export type ProposalNarrativeWorkflowItem = {
  label: string;
  support: string;
  tone: "default" | "success" | "warn";
  value: string;
};

const DISCUSSION_PACK_REPORT_TYPE = "PORTFOLIO_REVIEW";

export function buildProposalNarrativePostureModel({
  proposalId,
  versionNo,
  review,
  summary,
  events,
}: {
  proposalId: string;
  versionNo: number | null;
  review?: ProposalNarrativeReviewData | null;
  summary?: ProposalDeliverySummaryData | null;
  events?: ProposalDeliveryEventsData | null;
}): ProposalNarrativePostureModel {
  const reviewRecord = review?.narrative_review ?? null;
  const summaryPackage = summary?.reporting?.proposal_narrative_package ?? null;
  const summaryReporting = summary?.reporting ?? null;
  const reportingSummary = summary?.reporting_summary ?? null;
  const activeProposalIdentityIsValid =
    isNonBlankString(proposalId) && isPositiveSafeInteger(versionNo);
  const reviewMatchesActiveVersion = Boolean(
    activeProposalIdentityIsValid &&
      reviewRecord?.proposal_id === proposalId &&
      reviewRecord.proposal_version_no === versionNo,
  );
  const reviewedNarrativeHash = reviewMatchesActiveVersion
    ? (reviewRecord?.source_narrative_hash ?? null)
    : null;
  const reviewedVersionNo = reviewMatchesActiveVersion
    ? (reviewRecord?.proposal_version_no ?? null)
    : null;
  const reviewedNarrativeIdentity = resolveNarrativeIdentity({
    hashes: [reviewedNarrativeHash],
    versions: [reviewedVersionNo],
  });
  const reviewConfirmed =
    reviewMatchesActiveVersion && isAdvisorReviewConfirmed(reviewRecord);
  const summaryMatchesActiveProposal = Boolean(
    summary?.proposal?.proposal_id === proposalId &&
      summary.proposal.current_version_no === versionNo,
  );
  const summaryMatchesReviewedNarrative =
    reviewConfirmed &&
    summaryMatchesActiveProposal &&
    narrativeIdentitiesMatch(
      reviewedNarrativeIdentity,
      resolveNarrativeIdentity({
        hashes: [
          summaryPackage?.source_narrative_hash,
          reportingSummary?.source_narrative_hash,
        ],
        versions: [
          summaryReporting?.related_version_no,
          summaryPackage?.related_version_no,
          reportingSummary?.related_version_no,
        ],
      }),
    ) &&
    allPresentBooleanMarkersAreTrue([
      summaryReporting?.include_reviewed_narrative,
      reportingSummary?.include_reviewed_narrative,
    ]) &&
    isNonBlankString(summaryReporting?.report_request_id) &&
    summaryReporting?.report_type === DISCUSSION_PACK_REPORT_TYPE &&
    isCoherentDiscussionPackRecord({
      status: summaryReporting.status,
      packageStatus: summaryPackage?.package_status,
      packageReviewState: summaryPackage?.review_state,
      reportReferenceId: summaryReporting.report_reference_id,
      generatedAt: summaryReporting.generated_at,
    });

  const currentEvents = deliveryEventsMatchActiveProposal({
    events,
    proposalId,
    versionNo,
  })
    ? events
    : null;
  const latestEvent =
    currentEvents?.latest_event ?? currentEvents?.events?.[0] ?? null;
  const eventCount = resolveEventCount(currentEvents);

  const sourceNarrativeHash = reviewConfirmed ? reviewedNarrativeHash : null;

  const reviewState = normalizeLabel(
    reviewConfirmed ? reviewRecord?.review_state : null,
    "Not Reviewed",
  );
  const reportPackageState = normalizeLabel(
    summaryMatchesReviewedNarrative ? summaryPackage?.package_status : null,
    "Not Requested",
  );
  const deliveryState = normalizeLabel(
    summaryMatchesReviewedNarrative ? summaryReporting?.status : null,
    "No Report",
  );
  const discussionPackRequested = reportPackageState !== "Not Requested";
  const nextAction = projectNarrativeNextAction({
    discussionPackRequested,
    eventCount,
    reviewConfirmed,
  });
  const latestEventLabel = normalizeLabel(
    latestEvent?.event_type,
    "No delivery activity",
  );

  return {
    canRequestDiscussionPack: reviewConfirmed && !discussionPackRequested,
    reviewTone: reviewConfirmed ? "success" : "warn",
    reviewState,
    reportPackageState,
    deliveryState,
    sourceNarrativeHash,
    eventCount,
    latestEventLabel,
    latestEventTime: latestEvent?.occurred_at
      ? formatTimestampValue(latestEvent.occurred_at, {
          nullDisplay: "Not reported",
        })
      : null,
    policyVersion:
      review?.policy_version ?? review?.proposal_narrative?.policy_version ?? null,
    nextActionDetail: nextAction.detail,
    nextActionTitle: nextAction.title,
    workflowItems: [
      {
        label: "Recommendation rationale",
        value: sourceNarrativeHash ? "Available" : "Awaiting review",
        support: sourceNarrativeHash
          ? "Evidence reference retained"
          : "Record the advisor rationale for this version",
        tone: sourceNarrativeHash ? "success" : "warn",
      },
      {
        label: "Advisor review",
        value: reviewState,
        support: reviewConfirmed
          ? "Confirmed for advisor use"
          : "Client release remains unavailable",
        tone: reviewConfirmed ? "success" : "warn",
      },
      {
        label: "Discussion pack",
        value: reportPackageState,
        support: discussionPackRequested
          ? `Preparation status: ${deliveryState}`
          : "Available after advisor review",
        tone: discussionPackRequested ? "success" : "default",
      },
      {
        label: "Delivery record",
        value: eventCount === 0 ? "No activity" : latestEventLabel,
        support:
          eventCount === 0
            ? "No downstream event has been recorded"
            : `${eventCount} recorded event${eventCount === 1 ? "" : "s"}`,
        tone: eventCount === 0 ? "default" : "success",
      },
    ],
  };
}
type ConfirmedNarrativeReview = NonNullable<
  ProposalNarrativeReviewData["narrative_review"]
> & {
  review_id: string;
  reviewed_at: string;
  reviewed_by: string;
  source_narrative_hash: string;
};

function isAdvisorReviewConfirmed(
  reviewRecord: ProposalNarrativeReviewData["narrative_review"] | null,
): reviewRecord is ConfirmedNarrativeReview {
  if (
    !isNonBlankString(reviewRecord?.review_id) ||
    !isNonBlankString(reviewRecord.source_narrative_hash) ||
    !isNonBlankString(reviewRecord.reviewed_by) ||
    !isTimestampValue(reviewRecord.reviewed_at) ||
    (reviewRecord.action !== undefined && reviewRecord.action !== "APPROVE")
  ) {
    return false;
  }
  return reviewRecord.review_state === "APPROVED_FOR_ADVISOR_USE";
}

function isPositiveSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isCoherentDiscussionPackRecord({
  status,
  packageStatus,
  packageReviewState,
  reportReferenceId,
  generatedAt,
}: {
  status: unknown;
  packageStatus: unknown;
  packageReviewState: unknown;
  reportReferenceId: unknown;
  generatedAt: unknown;
}): boolean {
  if (
    packageReviewState !== undefined &&
    packageReviewState !== null &&
    packageReviewState !== "APPROVED_FOR_ADVISOR_USE"
  ) {
    return false;
  }
  if (status === "REQUESTED" && packageStatus === "REQUESTED") {
    return (
      (reportReferenceId === undefined || reportReferenceId === null) &&
      (generatedAt === undefined || generatedAt === null)
    );
  }
  return (
    status === "READY" &&
    packageStatus === "INCLUDED_REVIEWED_NARRATIVE" &&
    isNonBlankString(reportReferenceId) &&
    typeof generatedAt === "string" &&
    isTimestampValue(generatedAt)
  );
}

function deliveryEventsMatchActiveProposal({
  events,
  proposalId,
  versionNo,
}: {
  events: ProposalDeliveryEventsData | null | undefined;
  proposalId: string;
  versionNo: number | null;
}): boolean {
  return Boolean(
    isNonBlankString(proposalId) &&
      isPositiveSafeInteger(versionNo) &&
      events?.proposal?.proposal_id === proposalId &&
      events.proposal.current_version_no === versionNo &&
      deliveryEventAggregateIsCoherent(events),
  );
}

function deliveryEventAggregateIsCoherent(
  events: ProposalDeliveryEventsData,
): boolean {
  const count = events.event_count;
  if (
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    return false;
  }
  const listedCount = events.events?.length ?? 0;
  const hasLatestEvent = events.latest_event !== undefined;
  if (count === 0) {
    return listedCount === 0 && !hasLatestEvent;
  }
  if (listedCount > count) {
    return false;
  }
  const latestEvent = events.latest_event ?? events.events?.[0];
  const recordsAgree =
    !events.latest_event ||
    !events.events?.[0] ||
    (events.latest_event.event_type === events.events[0].event_type &&
      events.latest_event.occurred_at === events.events[0].occurred_at &&
      events.latest_event.to_state === events.events[0].to_state);
  return Boolean(
    latestEvent &&
      latestEvent.event_type === "REPORT_REQUESTED" &&
      isTimestampValue(latestEvent.occurred_at) &&
      recordsAgree,
  );
}

function resolveEventCount(
  events: ProposalDeliveryEventsData | null | undefined,
): number {
  if (
    typeof events?.event_count === "number" &&
    Number.isSafeInteger(events.event_count) &&
    events.event_count >= 0
  ) {
    return events.event_count;
  }
  return events?.events?.length ?? 0;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type NarrativeIdentity = {
  hash: string;
  versionNo: number;
};

function resolveNarrativeIdentity({
  hashes,
  versions,
}: {
  hashes: readonly unknown[];
  versions: readonly unknown[];
}): NarrativeIdentity | null {
  const presentHashes = hashes.filter(
    (hash) => hash !== null && hash !== undefined,
  );
  const presentVersions = versions.filter(
    (version) => version !== null && version !== undefined,
  );
  if (
    presentHashes.length === 0 ||
    presentVersions.length === 0 ||
    !presentHashes.every(isNonBlankString) ||
    !presentVersions.every(
      (version) =>
        typeof version === "number" &&
        Number.isSafeInteger(version) &&
        version > 0,
    )
  ) {
    return null;
  }
  const hash = presentHashes[0] as string;
  const versionNo = presentVersions[0] as number;
  if (
    !presentHashes.every((candidate) => candidate === hash) ||
    !presentVersions.every((candidate) => candidate === versionNo)
  ) {
    return null;
  }
  return { hash, versionNo };
}

function narrativeIdentitiesMatch(
  expected: NarrativeIdentity | null,
  candidate: NarrativeIdentity | null,
): boolean {
  return Boolean(
    expected &&
      candidate &&
      expected.hash === candidate.hash &&
      expected.versionNo === candidate.versionNo,
  );
}

function allPresentBooleanMarkersAreTrue(
  markers: readonly unknown[],
): boolean {
  const presentMarkers = markers.filter(
    (marker) => marker !== null && marker !== undefined,
  );
  return (
    presentMarkers.length > 0 &&
    presentMarkers.every((marker) => marker === true)
  );
}

function projectNarrativeNextAction({
  discussionPackRequested,
  eventCount,
  reviewConfirmed,
}: {
  discussionPackRequested: boolean;
  eventCount: number;
  reviewConfirmed: boolean;
}): { detail: string; title: string } {
  if (!reviewConfirmed) {
    return {
      title: "Record advisor review",
      detail:
        "Confirm why the recommendation is appropriate for advisor use before requesting client-discussion material.",
    };
  }
  if (!discussionPackRequested) {
    return {
      title: "Request the discussion pack",
      detail:
        "The reviewed rationale is confirmed for this proposal version and can now be packaged for the client discussion.",
    };
  }
  if (eventCount === 0) {
    return {
      title: "Track discussion-pack preparation",
      detail:
        "The pack request is recorded. Wait for a downstream preparation or delivery event before relying on completion.",
    };
  }
  return {
    title: "Review the latest delivery activity",
    detail:
      "Confirm the most recent downstream event before using the discussion pack in the client meeting.",
  };
}

export function confirmNarrativeReviewRefresh({
  proposalId,
  versionNo,
  review,
  refreshedReview,
}: {
  proposalId: string;
  versionNo: number;
  review: ProposalNarrativeReviewData;
  refreshedReview: ProposalNarrativeReviewData | undefined;
}): void {
  const actionRecord = review.narrative_review;
  const refreshedRecord = refreshedReview?.narrative_review;
  if (
    !isNonBlankString(proposalId) ||
    !isPositiveSafeInteger(versionNo) ||
    !isAdvisorReviewConfirmed(actionRecord) ||
    !isAdvisorReviewConfirmed(refreshedRecord) ||
    actionRecord.review_id !== refreshedRecord?.review_id ||
    actionRecord.proposal_id !== proposalId ||
    refreshedRecord.proposal_id !== proposalId ||
    actionRecord.proposal_version_no !== versionNo ||
    refreshedRecord.proposal_version_no !== versionNo ||
    actionRecord.source_narrative_hash !==
      refreshedRecord.source_narrative_hash ||
    actionRecord.review_state !== refreshedRecord?.review_state ||
    actionRecord.reviewed_by !== refreshedRecord?.reviewed_by ||
    actionRecord.reviewed_at !== refreshedRecord.reviewed_at
  ) {
    throw new Error(
      "Advisor review was recorded, but the refreshed proposal evidence did not confirm it.",
    );
  }
}

export function confirmDiscussionPackRefresh({
  proposalId,
  versionNo,
  report,
  summary,
  events,
}: {
  proposalId: string;
  versionNo: number;
  report: ProposalReportRequestData;
  summary: ProposalDeliverySummaryData | undefined;
  events: ProposalDeliveryEventsData | undefined;
}): void {
  const actionIdentity = resolveNarrativeIdentity({
    hashes: [
      report.explanation?.proposal_narrative_package?.source_narrative_hash,
    ],
    versions: [
      report.explanation?.related_version_no,
      report.explanation?.proposal_narrative_package?.related_version_no,
    ],
  });
  const refreshedIdentity = resolveNarrativeIdentity({
    hashes: [
      summary?.reporting?.proposal_narrative_package?.source_narrative_hash,
      summary?.reporting_summary?.source_narrative_hash,
    ],
    versions: [
      summary?.reporting?.related_version_no,
      summary?.reporting?.proposal_narrative_package?.related_version_no,
      summary?.reporting_summary?.related_version_no,
    ],
  });
  const actionPackageState =
    report.explanation?.proposal_narrative_package?.package_status;
  const refreshedPackageState =
    summary?.reporting?.proposal_narrative_package?.package_status;
  const actionIncludesReviewedNarrative = allPresentBooleanMarkersAreTrue([
    report.explanation?.include_reviewed_narrative,
  ]);
  const refreshedIncludesReviewedNarrative = allPresentBooleanMarkersAreTrue([
    summary?.reporting?.include_reviewed_narrative,
    summary?.reporting_summary?.include_reviewed_narrative,
  ]);
  const actionRequestId = report.report_request_id;
  const refreshedRequestId = summary?.reporting?.report_request_id;
  const actionStatus = report.status;
  const refreshedStatus = summary?.reporting?.status;
  const lifecycleIsMonotonic =
    (actionStatus === "REQUESTED" &&
      (refreshedStatus === "REQUESTED" || refreshedStatus === "READY")) ||
    (actionStatus === "READY" && refreshedStatus === "READY");
  const readyArtifactsAgree =
    actionStatus !== "READY" ||
    (report.report_reference_id === summary?.reporting?.report_reference_id &&
      report.generated_at === summary?.reporting?.generated_at);
  if (
    !isNonBlankString(proposalId) ||
    !isPositiveSafeInteger(versionNo) ||
    summary?.proposal?.proposal_id !== proposalId ||
    summary.proposal.current_version_no !== versionNo ||
    !deliveryEventsMatchActiveProposal({ events, proposalId, versionNo }) ||
    !narrativeIdentitiesMatch(actionIdentity, refreshedIdentity) ||
    actionIdentity?.versionNo !== versionNo ||
    refreshedIdentity?.versionNo !== versionNo ||
    !actionIncludesReviewedNarrative ||
    !refreshedIncludesReviewedNarrative ||
    !isNonBlankString(actionRequestId) ||
    !isNonBlankString(refreshedRequestId) ||
    actionRequestId !== refreshedRequestId ||
    !lifecycleIsMonotonic ||
    !readyArtifactsAgree ||
    report.report_type !== DISCUSSION_PACK_REPORT_TYPE ||
    summary.reporting?.report_type !== DISCUSSION_PACK_REPORT_TYPE ||
    !isCoherentDiscussionPackRecord({
      status: report.status,
      packageStatus: actionPackageState,
      packageReviewState:
        report.explanation?.proposal_narrative_package?.review_state,
      reportReferenceId: report.report_reference_id,
      generatedAt: report.generated_at,
    }) ||
    !isCoherentDiscussionPackRecord({
      status: summary.reporting?.status,
      packageStatus: refreshedPackageState,
      packageReviewState:
        summary.reporting?.proposal_narrative_package?.review_state,
      reportReferenceId: summary.reporting?.report_reference_id,
      generatedAt: summary.reporting?.generated_at,
    })
  ) {
    throw new Error(
      "The discussion-pack request completed, but refreshed preparation status for the reviewed proposal version was not available.",
    );
  }
}

export function normalizeLabel(
  value: string | null | undefined,
  fallback: string,
): string {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }
  return normalized
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
