import { formatTimestampValue } from "@/design-system/utils/financial-formatters";

import type {
  ProposalDeliveryEventsData,
  ProposalDeliverySummaryData,
  ProposalNarrativeReviewData,
  ProposalReportRequestData,
} from "./types";

export type ProposalNarrativePostureModel = {
  canRequestDiscussionPack: boolean;
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
  review,
  report,
  summary,
  events,
}: {
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

  const sourceNarrativeHash =
    reviewRecord?.source_narrative_hash ??
    reportPackage?.source_narrative_hash ??
    summaryPackage?.source_narrative_hash ??
    reportingSummary?.source_narrative_hash ??
    null;

  const reviewState = normalizeLabel(
    reviewRecord?.review_state ??
      summaryPackage?.review_state ??
      reportPackage?.review_state,
    "Not Reviewed",
  );
  const reportPackageState = normalizeLabel(
    reportPackage?.package_status ?? summaryPackage?.package_status,
    summaryReporting?.include_reviewed_narrative ||
      reportingSummary?.include_reviewed_narrative
      ? "Requested"
      : "Not Requested",
  );
  const deliveryState = normalizeLabel(
    summaryReporting?.status ?? report?.status,
    "No Report",
  );
  const reviewConfirmed = isAdvisorReviewConfirmed(
    reviewRecord?.review_state ??
      summaryPackage?.review_state ??
      reportPackage?.review_state,
    sourceNarrativeHash,
  );
  const discussionPackRequested = isDiscussionPackRequested({
    reportPackageState,
    report,
    summaryReporting,
    reportingSummary,
  });
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
    policyVersion: review?.policy_version ?? null,
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

function isDiscussionPackRequested({
  reportPackageState,
  report,
  summaryReporting,
  reportingSummary,
}: {
  reportPackageState: string;
  report?: ProposalReportRequestData | null;
  summaryReporting: ProposalDeliverySummaryData["reporting"] | null;
  reportingSummary: ProposalDeliverySummaryData["reporting_summary"] | null;
}): boolean {
  return Boolean(
    report ||
    summaryReporting?.include_reviewed_narrative ||
    reportingSummary?.include_reviewed_narrative ||
    reportPackageState !== "Not Requested",
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
  review,
  summary,
}: {
  review: ProposalNarrativeReviewData;
  summary: ProposalDeliverySummaryData | undefined;
}): void {
  const actionModel = buildProposalNarrativePostureModel({ review });
  const refreshedModel = buildProposalNarrativePostureModel({ summary });
  if (
    !actionModel.sourceNarrativeHash ||
    actionModel.sourceNarrativeHash !== refreshedModel.sourceNarrativeHash ||
    refreshedModel.nextActionTitle === "Record advisor review"
  ) {
    throw new Error(
      "Advisor review was recorded, but the refreshed proposal evidence did not confirm it.",
    );
  }
}

export function confirmDiscussionPackRefresh({
  report,
  summary,
}: {
  report: ProposalReportRequestData;
  summary: ProposalDeliverySummaryData | undefined;
}): void {
  const actionModel = buildProposalNarrativePostureModel({ report });
  const refreshedModel = buildProposalNarrativePostureModel({ summary });
  if (
    actionModel.reportPackageState === "Not Requested" ||
    refreshedModel.reportPackageState === "Not Requested"
  ) {
    throw new Error(
      "The discussion-pack request completed, but refreshed preparation status was not available.",
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
