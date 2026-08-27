import {
  formatTimestampValue,
  isTimestampValue,
  timestampsRepresentSameInstant,
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
const DISCUSSION_PACK_STATUS_RANK = Object.freeze({
  REQUESTED: 0,
  ACCEPTED: 1,
  READY: 2,
} as const);

type DiscussionPackStatus = keyof typeof DISCUSSION_PACK_STATUS_RANK;

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
    isExactNonBlankString(proposalId) && isPositiveSafeInteger(versionNo);
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
          summaryPackage?.proposal_version_no,
          reportingSummary?.related_version_no,
        ],
      }),
    ) &&
    allPresentBooleanMarkersAreTrue([
      summaryReporting?.include_reviewed_narrative,
      reportingSummary?.include_reviewed_narrative,
    ]) &&
    isExactNonBlankString(summaryReporting?.report_request_id) &&
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
    currentEvents?.latest_event ?? currentEvents?.events?.at(-1) ?? null;
  const eventCount = resolveEventCount(currentEvents);

  const sourceNarrativeHash = reviewConfirmed ? reviewedNarrativeHash : null;

  const reviewState = normalizeLabel(
    reviewConfirmed ? reviewRecord?.review_state : null,
    "Not Reviewed",
  );
  const reportPackageState = summaryMatchesReviewedNarrative
    ? formatDiscussionPackPackageState(summaryPackage?.package_status)
    : "Not requested";
  const deliveryState = summaryMatchesReviewedNarrative
    ? formatDiscussionPackDeliveryState(summaryReporting?.status)
    : "No request";
  const discussionPackRequested = summaryMatchesReviewedNarrative;
  const nextAction = projectNarrativeNextAction({
    discussionPackRequested,
    eventCount,
    reviewConfirmed,
  });
  const latestEventLabel = normalizeLabel(
    latestEvent ? formatDeliveryEventLabel(latestEvent.event_type) : null,
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
    !isExactNonBlankString(reviewRecord?.review_id) ||
    !isExactNonBlankString(reviewRecord.source_narrative_hash) ||
    !isExactNonBlankString(reviewRecord.reviewed_by) ||
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
  const statusAndPackageAgree =
    (status === "REQUESTED" && packageStatus === "REQUESTED") ||
    ((status === "ACCEPTED" || status === "READY") &&
      packageStatus === "INCLUDED_REVIEWED_NARRATIVE");
  return (
    statusAndPackageAgree &&
    isExactNonBlankString(reportReferenceId) &&
    typeof generatedAt === "string" &&
    isTimestampValue(generatedAt)
  );
}

function isDiscussionPackStatus(value: unknown): value is DiscussionPackStatus {
  return typeof value === "string" && value in DISCUSSION_PACK_STATUS_RANK;
}

function discussionPackLifecycleIsMonotonic(
  actionStatus: unknown,
  refreshedStatus: unknown,
): boolean {
  return Boolean(
    isDiscussionPackStatus(actionStatus) &&
      isDiscussionPackStatus(refreshedStatus) &&
      DISCUSSION_PACK_STATUS_RANK[refreshedStatus] >=
        DISCUSSION_PACK_STATUS_RANK[actionStatus],
  );
}

function formatDiscussionPackPackageState(value: unknown): string {
  switch (value) {
    case "REQUESTED":
      return "Request recorded";
    case "INCLUDED_REVIEWED_NARRATIVE":
      return "Reviewed rationale included";
    default:
      return "Not requested";
  }
}

function formatDiscussionPackDeliveryState(value: unknown): string {
  switch (value) {
    case "REQUESTED":
    case "ACCEPTED":
      return "Preparation requested";
    case "READY":
      return "Available for review";
    default:
      return "No request";
  }
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
    isExactNonBlankString(proposalId) &&
      isPositiveSafeInteger(versionNo) &&
      events?.proposal?.proposal_id === proposalId &&
      events.proposal.current_version_no === versionNo &&
      deliveryEventAggregateIsCoherent(events, proposalId, versionNo),
  );
}

function deliveryEventAggregateIsCoherent(
  events: ProposalDeliveryEventsData,
  proposalId: string,
  versionNo?: number,
): boolean {
  const count = events.event_count;
  if (
    typeof count !== "number" ||
    !Number.isSafeInteger(count) ||
    count < 0
  ) {
    return false;
  }
  if (!Array.isArray(events.events)) {
    return false;
  }
  const eventHistory = events.events;
  const listedCount = eventHistory.length;
  const hasLatestEvent = events.latest_event !== undefined;
  if (count === 0) {
    return listedCount === 0 && !hasLatestEvent;
  }
  if (listedCount !== count || !hasLatestEvent) {
    return false;
  }
  const latestEvent = events.latest_event;
  const finalListedEvent = eventHistory.at(-1);
  const eventIds = eventHistory.map((event) => event.event_id);
  const allEventsAreGoverned = eventHistory.every(
    (event) =>
      isExactNonBlankString(event.event_id) &&
      event.proposal_id === proposalId &&
      isPositiveSafeInteger(event.related_version_no) &&
      isPositiveSafeInteger(events.proposal?.current_version_no) &&
      event.related_version_no <= events.proposal.current_version_no &&
      (versionNo === undefined || event.related_version_no === versionNo) &&
      isSupportedDeliveryEventType(event.event_type) &&
      isTimestampValue(event.occurred_at),
  );
  const eventIdsAreUnique = new Set(eventIds).size === eventIds.length;
  const eventsAreChronological = eventHistory.every((event, index) => {
    if (index === 0) return true;
    const previousTime = eventHistory[index - 1]?.occurred_at;
    return (
      typeof previousTime === "string" &&
      typeof event.occurred_at === "string" &&
      Date.parse(event.occurred_at) >= Date.parse(previousTime)
    );
  });
  return Boolean(
    latestEvent &&
      finalListedEvent &&
      allEventsAreGoverned &&
      eventIdsAreUnique &&
      eventsAreChronological &&
      jsonValuesAreEqual(latestEvent, finalListedEvent),
  );
}

function jsonValuesAreEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => jsonValuesAreEqual(value, right[index]))
    );
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        jsonValuesAreEqual(leftRecord[key], rightRecord[key]),
    )
  );
}

function deliveryHistoryConfirmsReportRequest(
  events: ProposalDeliveryEventsData | undefined,
  proposalId: string,
  versionNo: number,
  reportRequestId: string,
): boolean {
  const eventHistory = events?.events;
  const currentVersionNo = events?.proposal?.current_version_no;
  if (
    !events ||
    !eventHistory ||
    events.proposal?.proposal_id !== proposalId ||
    !isPositiveSafeInteger(currentVersionNo) ||
    currentVersionNo < versionNo ||
    !deliveryEventAggregateIsCoherent(events, proposalId)
  ) {
    return false;
  }
  const requestEvents = eventHistory.filter(
    (event) =>
      event.event_type === "REPORT_REQUESTED" &&
      event.reason?.report_request_id === reportRequestId,
  );
  const versionRequestEvents = eventHistory.filter(
    (event) =>
      event.event_type === "REPORT_REQUESTED" &&
      event.related_version_no === versionNo,
  );
  const latestVersionRequest = versionRequestEvents.at(-1);
  return (
    requestEvents.length === 1 &&
    requestEvents[0]?.related_version_no === versionNo &&
    latestVersionRequest?.event_id === requestEvents[0]?.event_id
  );
}

function isSupportedDeliveryEventType(value: unknown): value is string {
  switch (value) {
    case "REPORT_REQUESTED":
    case "EXECUTION_REQUESTED":
    case "EXECUTION_ACCEPTED":
    case "EXECUTION_PARTIALLY_EXECUTED":
    case "EXECUTION_REJECTED":
    case "EXECUTION_CANCELLED":
    case "EXECUTION_EXPIRED":
    case "EXECUTED":
      return true;
    default:
      return false;
  }
}

function formatDeliveryEventLabel(value: unknown): string | null {
  switch (value) {
    case "REPORT_REQUESTED":
      return "Discussion pack requested";
    case "EXECUTION_REQUESTED":
      return "Implementation requested";
    case "EXECUTION_ACCEPTED":
      return "Implementation accepted";
    case "EXECUTION_PARTIALLY_EXECUTED":
      return "Partially implemented";
    case "EXECUTION_REJECTED":
      return "Implementation rejected";
    case "EXECUTION_CANCELLED":
      return "Implementation cancelled";
    case "EXECUTION_EXPIRED":
      return "Implementation request expired";
    case "EXECUTED":
      return "Implementation completed";
    default:
      return null;
  }
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

function isExactNonBlankString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value === value.trim()
  );
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
    !presentHashes.every(isExactNonBlankString) ||
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
    !isExactNonBlankString(proposalId) ||
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
    !timestampsRepresentSameInstant(
      actionRecord.reviewed_at,
      refreshedRecord.reviewed_at,
    )
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
      report.explanation?.proposal_narrative_package?.proposal_version_no,
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
      summary?.reporting?.proposal_narrative_package?.proposal_version_no,
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
  const lifecycleIsMonotonic = discussionPackLifecycleIsMonotonic(
    actionStatus,
    refreshedStatus,
  );
  const artifactsAgree =
    report.report_reference_id === summary?.reporting?.report_reference_id &&
    timestampsRepresentSameInstant(
      report.generated_at,
      summary?.reporting?.generated_at,
    );
  if (
    !isExactNonBlankString(proposalId) ||
    !isPositiveSafeInteger(versionNo) ||
    summary?.proposal?.proposal_id !== proposalId ||
    !isPositiveSafeInteger(summary.proposal.current_version_no) ||
    summary.proposal.current_version_no < versionNo ||
    !narrativeIdentitiesMatch(actionIdentity, refreshedIdentity) ||
    actionIdentity?.versionNo !== versionNo ||
    refreshedIdentity?.versionNo !== versionNo ||
    !actionIncludesReviewedNarrative ||
    !refreshedIncludesReviewedNarrative ||
    !isExactNonBlankString(actionRequestId) ||
    !isExactNonBlankString(refreshedRequestId) ||
    actionRequestId !== refreshedRequestId ||
    !deliveryHistoryConfirmsReportRequest(
      events,
      proposalId,
      versionNo,
      actionRequestId,
    ) ||
    !lifecycleIsMonotonic ||
    !artifactsAgree ||
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
