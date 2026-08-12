import type { PortfolioPositionView } from "./types";

export type PortfolioPositionStateKind =
  | "current"
  | "review_required"
  | "not_reported"
  | "not_applicable";

export type PortfolioPositionStateTone = "clear" | "warn" | "neutral";

export type PortfolioPositionStatePresentation = {
  kind: PortfolioPositionStateKind;
  label: "Current" | "Review required" | "Not reported" | "Not applicable";
  tone: PortfolioPositionStateTone;
};

export type PortfolioPositionStateSummary = {
  positionCount: number;
  currentCount: number;
  reviewRequiredCount: number;
  notReportedCount: number;
  staleSourceKeyCount: number;
  state: "current" | "review_required" | "not_reported" | "empty";
  status: "Current" | "Review required" | "Not reported" | "Empty";
  detail: string;
  tone: "success" | "warn" | "default";
};

type PositionStateInput = Pick<
  PortfolioPositionView,
  "reprocessing_status" | "source_record_type"
>;

export function buildPortfolioPositionState(
  position: PositionStateInput,
): PortfolioPositionStatePresentation {
  if (position.source_record_type === "cash_balance") {
    return {
      kind: "not_applicable",
      label: "Not applicable",
      tone: "neutral",
    };
  }

  const sourceStatus = position.reprocessing_status?.trim().toUpperCase();
  if (sourceStatus === "CURRENT") {
    return {
      kind: "current",
      label: "Current",
      tone: "clear",
    };
  }

  if (!sourceStatus) {
    return {
      kind: "not_reported",
      label: "Not reported",
      tone: "warn",
    };
  }

  return {
    kind: "review_required",
    label: "Review required",
    tone: "warn",
  };
}

export function buildPortfolioPositionStateSummary(
  positions: PositionStateInput[],
  staleSourceKeyCount = 0,
): PortfolioPositionStateSummary {
  const positionStates = positions
    .filter((position) => position.source_record_type !== "cash_balance")
    .map(buildPortfolioPositionState);
  const positionCount = positionStates.length;
  const currentCount = countState(positionStates, "current");
  const reviewRequiredCount = countState(positionStates, "review_required");
  const notReportedCount = countState(positionStates, "not_reported");
  const normalizedStaleSourceKeyCount = Number.isFinite(staleSourceKeyCount)
    ? Math.max(0, staleSourceKeyCount)
    : 0;

  if (!positionCount) {
    return {
      positionCount,
      currentCount,
      reviewRequiredCount,
      notReportedCount,
      staleSourceKeyCount: normalizedStaleSourceKeyCount,
      state: normalizedStaleSourceKeyCount ? "review_required" : "empty",
      status: normalizedStaleSourceKeyCount ? "Review required" : "Empty",
      detail: normalizedStaleSourceKeyCount
        ? `${formatCount(normalizedStaleSourceKeyCount, "source key")} requires review; no booked positions are available`
        : "No booked position status is available for review",
      tone: normalizedStaleSourceKeyCount ? "warn" : "default",
    };
  }

  if (reviewRequiredCount || normalizedStaleSourceKeyCount) {
    return {
      positionCount,
      currentCount,
      reviewRequiredCount,
      notReportedCount,
      staleSourceKeyCount: normalizedStaleSourceKeyCount,
      state: "review_required",
      status: "Review required",
      detail: formatStateSummary({
        reviewRequiredCount,
        notReportedCount,
        currentCount,
        staleSourceKeyCount: normalizedStaleSourceKeyCount,
      }),
      tone: "warn",
    };
  }

  if (notReportedCount) {
    return {
      positionCount,
      currentCount,
      reviewRequiredCount,
      notReportedCount,
      staleSourceKeyCount: normalizedStaleSourceKeyCount,
      state: "not_reported",
      status: "Not reported",
      detail: formatStateSummary({
        reviewRequiredCount,
        notReportedCount,
        currentCount,
        staleSourceKeyCount: normalizedStaleSourceKeyCount,
      }),
      tone: "warn",
    };
  }

  return {
    positionCount,
    currentCount,
    reviewRequiredCount,
    notReportedCount,
    staleSourceKeyCount: normalizedStaleSourceKeyCount,
    state: "current",
    status: "Current",
    detail: `${formatCount(currentCount, "position status", "position statuses")} current`,
    tone: "success",
  };
}

function countState(
  states: PortfolioPositionStatePresentation[],
  kind: PortfolioPositionStateKind,
): number {
  return states.filter((state) => state.kind === kind).length;
}

function formatStateSummary({
  reviewRequiredCount,
  notReportedCount,
  currentCount,
  staleSourceKeyCount,
}: {
  reviewRequiredCount: number;
  notReportedCount: number;
  currentCount: number;
  staleSourceKeyCount: number;
}): string {
  return [
    reviewRequiredCount
      ? `${formatCount(reviewRequiredCount, "position")} ${
          reviewRequiredCount === 1 ? "requires" : "require"
        } review`
      : null,
    notReportedCount
      ? `${formatCount(
          notReportedCount,
          "position status",
          "position statuses",
        )} not reported`
      : null,
    staleSourceKeyCount
      ? `${formatCount(staleSourceKeyCount, "source key")} stale`
      : null,
    currentCount
      ? `${formatCount(currentCount, "position status", "position statuses")} current`
      : null,
  ]
    .filter((part): part is string => Boolean(part))
    .join("; ");
}

function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
