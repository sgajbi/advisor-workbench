import {
  createAiAssistanceDisclosure,
  type AiAssistanceDisclosureModel,
  type AiClientUseState,
  type AiHumanReviewState,
  type AiOutputAvailability,
  type AiPreparationMethod,
} from "@/design-system";

import {
  normalizeDpmAiWorkflowExecution,
  type NormalizedDpmAiExecution,
} from "./dpm-ai-workflow-normalization";
import {
  getDpmAiWorkflowProfile,
  type DpmAiWorkflowFamily,
} from "./dpm-ai-workflow-profiles";

export type DpmAiWorkflowOutcome = {
  family: DpmAiWorkflowFamily;
  scopeLabel: string;
  businessSummary: string;
  disclosure: AiAssistanceDisclosureModel;
};

export function buildDpmAiWorkflowOutcome(
  family: DpmAiWorkflowFamily,
  response: unknown,
): DpmAiWorkflowOutcome {
  const profile = getDpmAiWorkflowProfile(family);
  const normalized = normalizeDpmAiWorkflowExecution(response, profile);
  const limitations = buildLimitations(normalized);
  const disclosure = createAiAssistanceDisclosure({
    scopeLabel: profile.scopeLabel,
    preparation: resolvePreparation(normalized),
    availability: resolveAvailability(normalized),
    evidence: {
      state:
        normalized.evidenceCount === 0
          ? "missing"
          : normalized.contractComplete
            ? "supported"
            : "limited",
      sourceCount: normalized.evidenceCount,
    },
    humanReview: resolveHumanReview(normalized),
    clientUse: normalized.contractComplete
      ? resolveClientUse(normalized.outputLabel)
      : "blocked",
    freshness: normalized.historical
      ? { state: "stale", asOf: normalized.lastUpdatedAt }
      : { state: "not-reported" },
    limitations,
    diagnostics: buildDiagnostics(normalized),
  });

  return {
    family,
    scopeLabel: profile.scopeLabel,
    businessSummary: describeBusinessOutcome(profile.scopeLabel, disclosure),
    disclosure,
  };
}

function resolvePreparation(
  normalized: NormalizedDpmAiExecution,
): AiPreparationMethod {
  if (
    normalized.runtimeState === "STAGED" ||
    normalized.runtimeState === "RUNNING" ||
    (normalized.executionStatus === "COMPLETED" && normalized.outputCount === 0)
  ) {
    return "requested";
  }
  if (
    !normalized.contractComplete ||
    normalized.executionStatus !== "COMPLETED"
  ) {
    return "unavailable";
  }
  return "ai-assisted";
}

function resolveAvailability(
  normalized: NormalizedDpmAiExecution,
): AiOutputAvailability {
  if (normalized.historical && normalized.outputCount > 0) {
    return "stale";
  }
  if (
    normalized.executionStatus !== "COMPLETED" ||
    normalized.runtimeState !== "COMPLETED" ||
    normalized.outputCount === 0
  ) {
    return "unavailable";
  }
  if (!normalized.contractComplete) {
    return "partial";
  }
  return normalized.stubbed ? "simulation" : "live";
}

function resolveHumanReview(normalized: NormalizedDpmAiExecution): {
  state: AiHumanReviewState;
  sourceRecorded: boolean;
  actor?: string;
  occurredAt?: string;
} {
  const recordComplete = Boolean(
    normalized.reviewSummary.hasHistory &&
    normalized.reviewSummary.actor &&
    normalized.reviewSummary.occurredAt,
  );
  const record = recordComplete
    ? {
        sourceRecorded: true,
        actor: normalized.reviewSummary.actor ?? undefined,
        occurredAt: normalized.reviewSummary.occurredAt ?? undefined,
      }
    : { sourceRecorded: false };

  switch (normalized.reviewState) {
    case "ACCEPTED":
    case "REVISED":
      return recordComplete
        ? { state: "reviewed", ...record }
        : { state: "unavailable", ...record };
    case "REJECTED":
    case "ABANDONED":
      return { state: "rejected", ...record };
    case "AWAITING_REVIEW":
      return { state: "review-required", sourceRecorded: false };
    case "NOT_REVIEW_REQUIRED":
      return { state: "not-required", sourceRecorded: false };
    default:
      return { state: "unavailable", sourceRecorded: false };
  }
}

function resolveClientUse(outputLabel: string | null): AiClientUseState {
  switch (outputLabel) {
    case "EXPLANATION_ONLY":
    case "INTERNAL_ONLY":
    case "SUPPORT_ONLY":
      return "internal-only";
    case "ELIGIBLE_AFTER_REVIEW":
      return "eligible-after-review";
    case "CLIENT_USE_APPROVED":
      return "approved";
    case "CLIENT_USE_BLOCKED":
      return "blocked";
    default:
      return "unavailable";
  }
}

function buildLimitations(normalized: NormalizedDpmAiExecution): string[] {
  return [
    !normalized.contractComplete
      ? "The returned workflow contract or authority evidence was incomplete or inconsistent."
      : null,
    !normalized.authorized
      ? "The source did not publish a bound authorization decision."
      : null,
    normalized.outputCount === 0
      ? "No usable generated output was returned."
      : null,
    normalized.evidenceCount === 0
      ? "No supporting evidence descriptors were published."
      : null,
    normalized.stubbed
      ? "This result was prepared by a deterministic simulation and is not live AI output."
      : null,
    normalized.supportabilityStatus === "ACTION_REQUIRED"
      ? "The source requires an additional control or review action before this result can progress."
      : null,
    normalized.historical
      ? "This result is historical or superseded; review the replacement run before use."
      : null,
    normalized.outputLabel === null
      ? "The source did not publish a permitted-use label for this output."
      : null,
    (normalized.reviewState === "ACCEPTED" ||
      normalized.reviewState === "REVISED") &&
    !normalized.reviewSummary.hasHistory
      ? "The source did not publish the review record supporting its review state."
      : null,
    normalized.runtimeRedactionActive === false
      ? "Runtime redaction was not reported as active; keep the result within its governed internal scope."
      : null,
  ].filter((item): item is string => item !== null);
}

function buildDiagnostics(normalized: NormalizedDpmAiExecution) {
  return [
    normalized.runId
      ? { label: "Workflow run", value: normalized.runId }
      : null,
    normalized.packId
      ? {
          label: "Workflow pack",
          value: `${normalized.packId}${normalized.packVersion ? `@${normalized.packVersion}` : ""}`,
        }
      : null,
    normalized.workflowAuthorityOwner
      ? {
          label: "Workflow authority",
          value: normalized.workflowAuthorityOwner,
        }
      : null,
    normalized.generatedAt
      ? { label: "Prepared", value: normalized.generatedAt }
      : null,
    normalized.providerId
      ? { label: "Execution provider", value: normalized.providerId }
      : null,
    normalized.modelId ? { label: "Model", value: normalized.modelId } : null,
    normalized.artifactCount > 0
      ? { label: "Governed artifacts", value: String(normalized.artifactCount) }
      : null,
    normalized.supersededByRunId
      ? { label: "Superseded by", value: normalized.supersededByRunId }
      : null,
    normalized.replacementRunId
      ? { label: "Replacement run", value: normalized.replacementRunId }
      : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
}

function describeBusinessOutcome(
  scopeLabel: string,
  disclosure: AiAssistanceDisclosureModel,
): string {
  if (disclosure.availability === "unavailable") {
    return `${scopeLabel} is not available. Review the disclosed limitation before requesting it again.`;
  }
  if (disclosure.availability === "stale") {
    return `${scopeLabel} is historical and must not be used in the current decision.`;
  }
  if (disclosure.availability === "simulation") {
    return `${scopeLabel} is available as a simulation for internal evaluation only.`;
  }
  if (disclosure.availability === "partial") {
    return `${scopeLabel} is incomplete and requires source or control follow-up.`;
  }
  if (disclosure.humanReview.state === "review-required") {
    return `${scopeLabel} is available for internal review and is not approved for client use.`;
  }
  if (disclosure.humanReview.state === "reviewed") {
    return `${scopeLabel} has a source-recorded review; permitted use remains governed by its disclosure.`;
  }
  return `${scopeLabel} is available within its disclosed internal-use boundary.`;
}
