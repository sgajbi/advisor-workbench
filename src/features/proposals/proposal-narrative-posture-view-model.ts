import type {
  ProposalDeliveryEventsData,
  ProposalDeliverySummaryData,
  ProposalNarrativeReviewData,
  ProposalReportRequestData,
} from "./types";

export type ProposalNarrativePostureModel = {
  reviewState: string;
  reportPackageState: string;
  deliveryState: string;
  sourceNarrativeHash: string | null;
  eventCount: number;
  latestEventLabel: string;
  latestEventTime: string | null;
  policyVersion: string | null;
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
    reviewRecord?.review_state ?? summaryPackage?.review_state ?? reportPackage?.review_state,
    "Not Reviewed"
  );
  const reportPackageState = normalizeLabel(
    reportPackage?.package_status ?? summaryPackage?.package_status,
    summaryReporting?.include_reviewed_narrative || reportingSummary?.include_reviewed_narrative
      ? "Requested"
      : "Not Requested"
  );
  const deliveryState = normalizeLabel(summaryReporting?.status ?? report?.status, "No Report");

  return {
    reviewState,
    reportPackageState,
    deliveryState,
    sourceNarrativeHash,
    eventCount: events?.event_count ?? events?.events?.length ?? 0,
    latestEventLabel: normalizeLabel(latestEvent?.event_type, "No Delivery Event"),
    latestEventTime: latestEvent?.occurred_at ?? null,
    policyVersion: review?.policy_version ?? null,
  };
}

export function normalizeLabel(value: string | null | undefined, fallback: string): string {
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

export function formatEvidenceHash(value: string | null | undefined): string {
  const normalized = value?.trim();
  if (!normalized) {
    return "Not available";
  }
  if (normalized.length <= 24) {
    return normalized;
  }
  return `${normalized.slice(0, 16)}...${normalized.slice(-8)}`;
}
