import { formatTimestampValue } from "@/design-system/utils/financial-formatters";

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

export function buildProposalNarrativePostureModel({
  proposalId,
  versionNo,
  review,
  report,
  summary,
  events,
}: {
  proposalId: string;
  versionNo: number | null;
  review?: ProposalNarrativeReviewData | null;
  report?: ProposalReportRequestData | null;
  summary?: ProposalDeliverySummaryData | null;
  events?: ProposalDeliveryEventsData | null;
}): ProposalNarrativePostureModel {
  const reviewRecord = review?.narrative_review ?? null;
  const reportPackage = report?.explanation?.proposal_narrative_package ?? null;
  const summaryPackage = summary?.reporting?.proposal_narrative_package ?? null;
  const summaryReporting = summary?.reporting ?? null;
  const reportingSummary = summary?.reporting_summary ?? null;
  const latestEvent = events?.latest_event ?? events?.events?.[0] ?? null;
  const reviewMatchesActiveVersion = Boolean(
    versionNo !== null &&
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
  const reportMatchesReviewedNarrative =
    narrativeIdentitiesMatch(
      reviewedNarrativeIdentity,
      resolveNarrativeIdentity({
        hashes: [reportPackage?.source_narrative_hash],
        versions: [
          report?.explanation?.related_version_no,
          reportPackage?.related_version_no,
        ],
      }),
    ) &&
    allPresentBooleanMarkersAreTrue([
      report?.explanation?.include_reviewed_narrative,
    ]);
  const summaryMatchesReviewedNarrative =
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
    ]);

  const sourceNarrativeHash = reviewedNarrativeHash;

  const reviewState = normalizeLabel(
    reviewMatchesActiveVersion ? reviewRecord?.review_state : null,
    "Not Reviewed",
  );
  const reportPackageState = normalizeLabel(
    (reportMatchesReviewedNarrative ? reportPackage?.package_status : null) ??
      (summaryMatchesReviewedNarrative ? summaryPackage?.package_status : null),
    (reportMatchesReviewedNarrative &&
      report?.explanation?.include_reviewed_narrative) ||
      (summaryMatchesReviewedNarrative &&
        (summaryReporting?.include_reviewed_narrative ||
          reportingSummary?.include_reviewed_narrative))
      ? "Requested"
      : "Not Requested",
  );
  const deliveryState = normalizeLabel(
    (summaryMatchesReviewedNarrative ? summaryReporting?.status : null) ??
      (reportMatchesReviewedNarrative ? report?.status : null),
    "No Report",
  );
  const reviewConfirmed =
    reviewMatchesActiveVersion &&
    isAdvisorReviewConfirmed(
      reviewRecord?.review_state,
      reviewRecord?.source_narrative_hash ?? null,
    );
  const discussionPackRequested = reportPackageState !== "Not Requested";
  const nextAction = projectNarrativeNextAction({
    discussionPackRequested,
    eventCount: events?.event_count ?? events?.events?.length ?? 0,
    reviewConfirmed,
  });
  const eventCount = events?.event_count ?? events?.events?.length ?? 0;
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
function isAdvisorReviewConfirmed(
  reviewState: string | null | undefined,
  sourceNarrativeHash: string | null,
): boolean {
  if (!sourceNarrativeHash) {
    return false;
  }
  switch (reviewState?.trim().toUpperCase()) {
    case "APPROVED":
    case "APPROVED_FOR_ADVISOR_USE":
    case "REVIEWED":
      return true;
    default:
      return false;
  }
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
    !presentHashes.every(
      (hash) => typeof hash === "string" && hash.length > 0,
    ) ||
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
    !actionRecord?.review_id ||
    actionRecord.review_id !== refreshedRecord?.review_id ||
    actionRecord.proposal_id !== proposalId ||
    refreshedRecord.proposal_id !== proposalId ||
    actionRecord.proposal_version_no !== versionNo ||
    refreshedRecord.proposal_version_no !== versionNo ||
    !actionRecord.source_narrative_hash ||
    actionRecord.source_narrative_hash !== refreshedRecord?.source_narrative_hash ||
    actionRecord.review_state !== refreshedRecord?.review_state ||
    actionRecord.reviewed_by !== refreshedRecord?.reviewed_by ||
    !actionRecord.reviewed_at ||
    actionRecord.reviewed_at !== refreshedRecord?.reviewed_at ||
    !refreshedRecord.reviewed_at ||
    !isAdvisorReviewConfirmed(
      refreshedRecord.review_state,
      refreshedRecord.source_narrative_hash ?? null,
    )
  ) {
    throw new Error(
      "Advisor review was recorded, but the refreshed proposal evidence did not confirm it.",
    );
  }
}

export function confirmDiscussionPackRefresh({
  versionNo,
  report,
  summary,
}: {
  versionNo: number;
  report: ProposalReportRequestData;
  summary: ProposalDeliverySummaryData | undefined;
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
  const refreshedPackageState = normalizeLabel(
    summary?.reporting?.proposal_narrative_package?.package_status,
    summary?.reporting?.include_reviewed_narrative ||
      summary?.reporting_summary?.include_reviewed_narrative
      ? "Requested"
      : "Not Requested",
  );
  const actionIncludesReviewedNarrative = allPresentBooleanMarkersAreTrue([
    report.explanation?.include_reviewed_narrative,
  ]);
  const refreshedIncludesReviewedNarrative = allPresentBooleanMarkersAreTrue([
    summary?.reporting?.include_reviewed_narrative,
    summary?.reporting_summary?.include_reviewed_narrative,
  ]);
  const actionRequestId = report.report_request_id?.trim();
  const refreshedRequestId = summary?.reporting?.report_request_id?.trim();
  if (
    !narrativeIdentitiesMatch(actionIdentity, refreshedIdentity) ||
    actionIdentity?.versionNo !== versionNo ||
    refreshedIdentity?.versionNo !== versionNo ||
    !actionIncludesReviewedNarrative ||
    !refreshedIncludesReviewedNarrative ||
    !actionRequestId ||
    actionRequestId !== refreshedRequestId ||
    refreshedPackageState === "Not Requested"
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
