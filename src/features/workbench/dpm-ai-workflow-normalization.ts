import type { DpmAiWorkflowReviewState } from "./dpm-ai-workflow-contract";
import type { DpmAiWorkflowProfile } from "./dpm-ai-workflow-profiles";

export type NormalizedDpmAiExecution = ReturnType<
  typeof normalizeDpmAiWorkflowExecution
>;

export function normalizeDpmAiWorkflowExecution(
  response: unknown,
  profile: DpmAiWorkflowProfile,
) {
  const envelope = asRecord(response);
  const data = asRecord(envelope.data);
  const eligibility = asRecord(data.eligibility);
  const execution = asRecord(data.execution);
  const result = asRecord(execution.result);
  const audit = asRecord(execution.audit);
  const authorization = asRecord(audit.authorization);
  const safety = asRecord(audit.safety);
  const evidence = asRecord(execution.evidence);
  const run = asRecord(data.workflow_pack_run);
  const reviewSummary = asRecord(run.review_summary);
  const structuredOutput = asRecord(result.structured_output);
  const structuredOutputKeys = readStringArray(run.structured_output_keys);
  const outputKeys = Object.keys(structuredOutput).sort();
  const evidenceDescriptors = normalizeEvidenceDescriptors([
    ...readArray(evidence.descriptors),
    ...readArray(run.evidence_descriptors),
  ]);
  const runId = readString(run.run_id);
  const taskId = readString(execution.task_id);
  const requestId = readString(run.request_id);
  const outputLabel = readString(execution.output_label);
  const providerMode = readString(run.provider_mode);
  const stubbed = readBoolean(run.stubbed);
  const runtimeState = readString(run.runtime_state);
  const reviewState = readReviewState(run.review_state);
  const supportabilityStatus = readString(run.supportability_status);
  const supersededByRunId = readString(run.superseded_by_run_id);
  const replacementRunId = readString(run.replacement_run_id);
  const historical =
    runtimeState === "SUPERSEDED" ||
    reviewState === "SUPERSEDED" ||
    supportabilityStatus === "HISTORICAL" ||
    Boolean(supersededByRunId || replacementRunId);
  const authorized =
    eligibility.allowed === true &&
    authorization.allowed === true &&
    authorization.caller_identity_bound === true;
  const identityChecks = [
    data.service === "lotus-ai",
    readString(data.version) !== null,
    readString(envelope.source_service) === "lotus-ai",
    readString(envelope.evidence_source_service) === "lotus-manage",
    readHttpSuccess(envelope.manage_upstream_status),
    readHttpSuccess(envelope.ai_upstream_status),
    readString(eligibility.pack_id) === profile.packId,
    readString(run.pack_id) === profile.packId,
    readString(run.workflow_surface) === profile.workflowSurface,
    readString(eligibility.requested_version) === readString(run.pack_version),
    readString(eligibility.evaluated_registration_ref) ===
      readString(run.registration_ref),
    readString(eligibility.caller_app) === readString(run.caller_app),
    readString(eligibility.version) === readString(data.version),
    taskId !== null && taskId === readString(run.task_id),
    taskId === readString(audit.task_id),
    taskId === readString(authorization.task_id),
    requestId !== null && requestId === readString(audit.request_id),
    runId !== null && runId === readString(audit.workflow_pack_run_id),
    outputLabel !== null && outputLabel === readString(audit.output_label),
    outputLabel === readString(safety.output_label),
    providerMode !== null && providerMode === readString(audit.provider_mode),
    stubbed !== null && stubbed === readBoolean(audit.stubbed),
    outputKeys.length === structuredOutputKeys.length &&
      outputKeys.every((key, index) => key === structuredOutputKeys[index]),
  ];

  return {
    contractComplete: identityChecks.every(Boolean) && authorized,
    authorized,
    runtimeState,
    executionStatus: readString(execution.status),
    reviewState,
    supportabilityStatus,
    outputLabel,
    outputCount: outputKeys.length,
    evidenceCount: evidenceDescriptors.length,
    stubbed,
    historical,
    runId,
    packId: readString(run.pack_id),
    packVersion: readString(run.pack_version),
    workflowAuthorityOwner: readString(run.workflow_authority_owner),
    providerId: readString(audit.provider_id),
    modelId: readString(audit.model_id),
    generatedAt: readString(audit.generated_at),
    lastUpdatedAt: readString(run.last_updated_at) ?? undefined,
    supersededByRunId,
    replacementRunId,
    artifactCount: normalizeArtifactIds(run.artifact_refs).length,
    reviewSummary: {
      actor: readString(reviewSummary.latest_review_actor),
      occurredAt: readString(reviewSummary.latest_review_event_at),
      hasHistory: reviewSummary.has_review_history === true,
    },
    runtimeRedactionActive: readBoolean(safety.runtime_redaction_active),
  };
}

function normalizeEvidenceDescriptors(values: unknown[]) {
  const descriptors = new Set<string>();
  for (const value of values) {
    const descriptor = asRecord(value);
    const type = readString(descriptor.evidence_type);
    const summary = readString(descriptor.summary);
    if (type && summary) {
      descriptors.add(`${type}\u0000${summary}`);
    }
  }
  return Array.from(descriptors);
}

function normalizeArtifactIds(value: unknown): string[] {
  return Array.from(
    new Set(
      readArray(value)
        .map((item) => readString(asRecord(item).artifact_id))
        .filter((item): item is string => item !== null),
    ),
  );
}

function readReviewState(value: unknown): DpmAiWorkflowReviewState | null {
  return REVIEW_STATES.has(value as DpmAiWorkflowReviewState)
    ? (value as DpmAiWorkflowReviewState)
    : null;
}

function readHttpSuccess(value: unknown): boolean {
  return typeof value === "number" && value >= 200 && value < 300;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return readArray(value)
    .map(readString)
    .filter((item): item is string => item !== null)
    .sort();
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const REVIEW_STATES = new Set<DpmAiWorkflowReviewState>([
  "NOT_REVIEW_REQUIRED",
  "AWAITING_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "REVISED",
  "SUPERSEDED",
  "ABANDONED",
]);
