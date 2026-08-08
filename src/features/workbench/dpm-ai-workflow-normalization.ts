import type { DpmAiWorkflowReviewState } from "./dpm-ai-workflow-contract";
import type { DpmAiWorkflowProfile } from "./dpm-ai-workflow-profiles";

export type NormalizedDpmAiExecution = ReturnType<
  typeof normalizeDpmAiWorkflowExecution
>;

export type DpmAiWorkflowMaterial = {
  title: string;
  sections: Array<{
    label: string;
    values: string[];
  }>;
};

const SUPPORTED_OUTPUT_LABELS = new Set([
  "EXPLANATION_ONLY",
  "INTERNAL_ONLY",
  "SUPPORT_ONLY",
  "ELIGIBLE_AFTER_REVIEW",
  "CLIENT_USE_APPROVED",
  "CLIENT_USE_BLOCKED",
]);

export function normalizeDpmAiWorkflowExecution(
  response: unknown,
  profile: DpmAiWorkflowProfile,
  expectedSourceReference: string,
) {
  const envelope = asRecord(response);
  const sourceInput = asRecord(envelope[profile.sourceInputField]);
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
  const usableOutputKeys = outputKeys.filter((key) =>
    isUsableStructuredOutputValue(structuredOutput[key]),
  );
  const evidenceDescriptors = normalizeEvidenceDescriptors([
    ...readArray(evidence.descriptors),
    ...readArray(run.evidence_descriptors),
  ]);
  const normalizedMaterial = normalizeWorkflowMaterial(structuredOutput, profile);
  const runId = readString(run.run_id);
  const taskId = readString(execution.task_id);
  const requestId = readString(run.request_id);
  const requestedVersion = readString(eligibility.requested_version);
  const packVersion = readString(run.pack_version);
  const evaluatedRegistrationRef = readString(
    eligibility.evaluated_registration_ref,
  );
  const registrationRef = readString(run.registration_ref);
  const requestedSourceReference = readString(expectedSourceReference);
  const sourceReference = readString(sourceInput[profile.sourceIdentityField]);
  const outputLabel = readString(execution.output_label);
  const providerMode = readString(run.provider_mode);
  const stubbed = readBoolean(run.stubbed);
  const runtimeState = readString(run.runtime_state);
  const executionStatus = readString(execution.status);
  const materialRuntimeComplete =
    executionStatus === "COMPLETED" &&
    (runtimeState === "COMPLETED" || runtimeState === "SUPERSEDED");
  const reviewState = readReviewState(run.review_state);
  const supportabilityStatus = readString(run.supportability_status);
  const supersededByRunId = readString(run.superseded_by_run_id);
  const replacementRunId = readString(run.replacement_run_id);
  const historical =
    runtimeState === "SUPERSEDED" ||
    reviewState === "SUPERSEDED" ||
    supportabilityStatus === "HISTORICAL" ||
    Boolean(supersededByRunId || replacementRunId);
  const eligibilityCallerApp = readString(eligibility.caller_app);
  const authorizationCallerApp = readString(authorization.caller_app);
  const authenticatedCallerApp = readString(authorization.authenticated_caller_app);
  const runCallerApp = readString(run.caller_app);
  const workflowAuthorityOwner = readString(run.workflow_authority_owner);
  const authorized =
    readString(eligibility.eligibility_result) === "ALLOWED" &&
    eligibility.allowed === true &&
    readString(authorization.outcome) === "ALLOWED" &&
    authorization.allowed === true &&
    authorization.caller_identity_bound === true &&
    eligibilityCallerApp !== null &&
    eligibilityCallerApp === authorizationCallerApp &&
    eligibilityCallerApp === authenticatedCallerApp &&
    eligibilityCallerApp === runCallerApp;
  const identityChecks = [
    data.service === "lotus-ai",
    readString(data.version) !== null,
    readString(envelope.source_service) === "lotus-ai",
    readString(envelope.evidence_source_service) === "lotus-manage",
    readHttpSuccess(envelope.manage_upstream_status),
    readHttpSuccess(envelope.ai_upstream_status),
    requestedSourceReference !== null &&
      sourceReference === requestedSourceReference,
    readString(eligibility.pack_id) === profile.packId,
    readString(run.pack_id) === profile.packId,
    readString(run.workflow_surface) === profile.workflowSurface,
    workflowAuthorityOwner === "lotus-manage",
    requestedVersion !== null && requestedVersion === packVersion,
    evaluatedRegistrationRef !== null &&
      evaluatedRegistrationRef === registrationRef,
    eligibilityCallerApp === runCallerApp,
    readString(eligibility.version) === readString(data.version),
    taskId !== null && taskId === readString(run.task_id),
    taskId === readString(audit.task_id),
    taskId === readString(authorization.task_id),
    requestId !== null && requestId === readString(audit.request_id),
    runId !== null && runId === readString(audit.workflow_pack_run_id),
    outputLabel !== null && outputLabel === readString(audit.output_label),
    outputLabel === readString(safety.output_label),
    outputLabel !== null && SUPPORTED_OUTPUT_LABELS.has(outputLabel),
    providerMode !== null && providerMode === readString(audit.provider_mode),
    stubbed !== null && stubbed === readBoolean(audit.stubbed),
    outputKeys.length === structuredOutputKeys.length &&
      outputKeys.every((key, index) => key === structuredOutputKeys[index]),
    usableOutputKeys.length > 0,
    normalizedMaterial.sections.length > 0,
  ];

  const contractComplete = identityChecks.every(Boolean) && authorized;

  return {
    contractComplete,
    authorized,
    runtimeState,
    executionStatus,
    materialRuntimeComplete,
    reviewState,
    supportabilityStatus,
    outputLabel,
    outputCount: usableOutputKeys.length,
    evidenceCount: evidenceDescriptors.length,
    stubbed,
    historical,
    sourceReference,
    runId,
    packId: readString(run.pack_id),
    packVersion,
    workflowAuthorityOwner,
    material: contractComplete && materialRuntimeComplete
      ? normalizedMaterial
      : { title: profile.materialTitle, sections: [] },
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

function normalizeWorkflowMaterial(
  structuredOutput: Record<string, unknown>,
  profile: DpmAiWorkflowProfile,
): DpmAiWorkflowMaterial {
  const materialByLabel = new Map<string, string[]>();
  for (const { key, label } of profile.materialFields) {
    const values = formatMaterialValues(structuredOutput[key]);
    if (values.length > 0) {
      materialByLabel.set(label, [
        ...(materialByLabel.get(label) ?? []),
        ...values,
      ]);
    }
  }
  const sections = Array.from(materialByLabel, ([label, values]) => ({
    label,
    values,
  }));
  return { title: profile.materialTitle, sections };
}

function formatMaterialValues(value: unknown, depth = 0): string[] {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized ? [formatMaterialText(normalized)] : [];
  }
  if (typeof value === "boolean") {
    return [value ? "Yes" : "No"];
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => formatMaterialValues(item, depth));
  }
  if (depth < 2 && value !== null && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(
      ([key, nestedValue]) => {
        const nestedValues = formatMaterialValues(nestedValue, depth + 1);
        return nestedValues.map(
          (nested) => `${formatMaterialLabel(key)}: ${nested}`,
        );
      },
    );
  }
  return [];
}

function formatMaterialText(value: string): string {
  return /^[A-Za-z0-9_-]+$/.test(value) && /[_-]/.test(value)
    ? formatMaterialLabel(value)
    : value;
}

function formatMaterialLabel(value: string): string {
  const words = value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : value;
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

function isUsableStructuredOutputValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(isUsableStructuredOutputValue);
  }
  if (value && typeof value === "object") {
    return Object.values(value).some(isUsableStructuredOutputValue);
  }
  return false;
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
