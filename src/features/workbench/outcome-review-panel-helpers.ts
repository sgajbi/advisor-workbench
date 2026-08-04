import type {
  OutcomeReviewListItem,
  OutcomeReviewPanelState,
} from "./outcome-review-view-model";
import { businessStateLabel } from "./manage-workspace-view-model";
import type { DpmAiWorkflowExecution } from "./dpm-ai-workflow-contract";

export type OutcomeReviewBadgeTone =
  | "default"
  | "success"
  | "warn"
  | "danger";

export type OutcomeReviewStatePanelCopy = {
  kind: "empty" | "permission_blocked" | "unavailable" | "partial";
  title: string;
  body: string;
};

export function outcomeReviewBadgeTone(
  state: string,
): OutcomeReviewBadgeTone {
  const normalized = state.toUpperCase();
  if (
    normalized === "SUPPORTED" ||
    normalized === "READY" ||
    normalized === "WITHIN_TOLERANCE"
  ) {
    return "success";
  }
  if (
    normalized === "DEGRADED" ||
    normalized === "PARTIAL" ||
    normalized.includes("REVIEW")
  ) {
    return "warn";
  }
  if (
    normalized === "BLOCKED" ||
    normalized === "UNSUPPORTED" ||
    normalized.includes("BREACH")
  ) {
    return "danger";
  }
  return "default";
}

export function buildOutcomeReviewStatePanelCopy(
  state: OutcomeReviewPanelState,
  portfolioId: string,
): OutcomeReviewStatePanelCopy {
  if (state === "empty") {
    return {
      kind: "empty",
      title: "No outcome reviews for this portfolio",
      body: `No outcome review is currently available for ${portfolioId}.`,
    };
  }
  if (state === "blocked") {
    return {
      kind: "permission_blocked",
      title: "Outcome review handoff is blocked",
      body: "Resolve the open review items before preparing advisor handoffs.",
    };
  }
  if (state === "unsupported") {
    return {
      kind: "unavailable",
      title: "Outcome review is not supported",
      body: "Outcome review is not available for this portfolio.",
    };
  }
  return {
    kind: "partial",
    title: "Outcome review data is unavailable",
    body: "Outcome review details are temporarily unavailable for this portfolio.",
  };
}

export function shouldShowOutcomeReviewStatePanel(
  state: OutcomeReviewPanelState,
  errorMessage: string | null,
): boolean {
  return (
    Boolean(errorMessage) ||
    state === "empty" ||
    state === "blocked" ||
    state === "unsupported" ||
    state === "unavailable"
  );
}

export function countReadyOutcomeReviewEvidence(
  review: OutcomeReviewListItem | null,
): number {
  if (!review) {
    return 0;
  }
  return [
    review.expectedSnapshotHash,
    review.realizedSnapshotHash,
    review.proofPackId,
    review.lineage.length > 0 ? "available" : "",
  ].filter((value) => value && value !== "N/A").length;
}

export function outcomeReviewAvailabilityLabel(value: string): string {
  return value && value !== "N/A" ? "Available" : "Not available";
}

export function outcomeReviewAvailabilityClass(value: string): string {
  return value && value !== "N/A" ? "is-available" : "is-muted";
}

export function outcomeReviewSourceEvidenceStatus(
  readyEvidenceCount: number,
): string {
  return readyEvidenceCount >= 3
    ? "Available"
    : readyEvidenceCount > 0
      ? "Partial"
      : "Not available";
}

export function buildOutcomeReviewHandoffMessages(
  reportJobMessage: string | null,
  aiNarrativeMessage: string | null,
): string[] {
  return [reportJobMessage, aiNarrativeMessage].filter(
    (message): message is string => Boolean(message),
  );
}

export function describeOutcomeNarrativeRun(
  data: DpmAiWorkflowExecution,
): string {
  return `Review request ${businessStateLabel(data.workflow_pack_run.review_state ?? data.execution.status)}.`;
}
