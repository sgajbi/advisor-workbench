import { businessStateLabel, formatBusinessReason } from "@/copy/business-state-copy";
import type {
  OutcomeReviewListItem,
  OutcomeReviewPanelState,
} from "./outcome-review-view-model";

import { MANAGE_OUTCOME_REVIEW_LABELS } from "./manage-terminology";
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
      body: "Resolve the open review items before preparing adviser handoffs.",
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

export function outcomeReviewSupportReasonLabel(reason: string): string {
  const knownLabels: Record<string, string> = {
    READY_FOR_REPORT_INPUT: `${MANAGE_OUTCOME_REVIEW_LABELS.reportPreparation} ready`,
    CREATE_REPORT_INPUT: `${MANAGE_OUTCOME_REVIEW_LABELS.reportPreparation} blocked`,
    REQUEST_AI_NARRATIVE: `${MANAGE_OUTCOME_REVIEW_LABELS.aiAssistedReviewSummary} blocked`,
  };

  return knownLabels[reason.toUpperCase()] ?? formatBusinessReason(reason);
}

export function outcomeReviewDimensionStateLabel(state: string): string {
  const knownLabels: Record<string, string> = {
    READY: "Evidence ready",
    WITHIN_TOLERANCE: MANAGE_OUTCOME_REVIEW_LABELS.withinExpectedTolerance,
    BREACHED: MANAGE_OUTCOME_REVIEW_LABELS.outsideExpectedTolerance,
    PENDING_REVIEW: MANAGE_OUTCOME_REVIEW_LABELS.reviewPending,
  };
  return knownLabels[state.toUpperCase()] ?? formatBusinessReason(state);
}

export function outcomeReviewDimensionLabel(dimension: string): string {
  return formatBusinessReason(dimension);
}

export function outcomeReviewRequiredRecordLabel(value: string): string {
  if (/^ClientCommunicationRecord(?::v\d+)?$/i.test(value)) {
    return "Client communication record";
  }
  return formatBusinessReason(value.replace(/:v\d+$/i, ""));
}

export function outcomeReviewBoundaryReasonLabel(reason: string): string {
  const knownLabels: Record<string, string> = {
    OUTCOME_CLIENT_COMMUNICATION_NOT_SUPPORTED:
      "Client communication is not supported on this screen",
    CLIENT_COMMUNICATION_NOT_PROJECTED:
      "Client communication is not projected from this review",
  };
  return knownLabels[reason.toUpperCase()] ?? formatBusinessReason(reason);
}

export function outcomeReviewBlockedCapabilityLabel(capability: string): string {
  const knownLabels: Record<string, string> = {
    CLIENT_APPROVAL: "Client approval",
    CLIENT_CONTACT: "Client contact",
    CLIENT_MESSAGE_GENERATION: "Client message generation",
    COMMUNICATION_AUDIT: "Communication audit",
    DELIVERY_CONFIRMATION: "Delivery confirmation",
  };
  return knownLabels[capability.toUpperCase()] ?? formatBusinessReason(capability);
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
