import { classifyAiProviderPosture } from "@/design-system";

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
const REQUIRED_SAFETY_CONTROLS = [
  "response_labeling",
  "correlation_and_audit",
  "runtime_redaction_engine",
] as const;
const TRUSTED_SAFETY_DISPOSITIONS = new Set([
  "ENFORCED_PASSTHROUGH",
  "ENFORCED_REDACTED",
]);
const SUPPORTED_WORKFLOW_SUPPORTABILITY_STATUSES = new Set([
  "READY",
  "ACTION_REQUIRED",
  "HISTORICAL",
]);
const MATERIAL_MAX_DEPTH = 3;
const MATERIAL_MAX_CONTAINER_ITEMS = 20;
const MATERIAL_MAX_VALUES_PER_SECTION = 50;

type MaterialValueNormalization = {
  values: string[];
  withinBudget: boolean;
};

export function normalizeDpmAiWorkflowExecution(
  response: unknown,
  profile: DpmAiWorkflowProfile,
  expectedSourceReference: string,
) {
  const envelope = asRecord(response);
  const sourceSupportability = asRecord(envelope.supportability);
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
  const reviewRequired = readBoolean(run.review_required);
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
  const sourceSupportabilityState = readUpperString(sourceSupportability.state);
  const sourceSupportabilityIdentity =
    profile.sourceSupportabilityIdentityField === null
      ? null
      : readString(
          sourceSupportability[profile.sourceSupportabilityIdentityField],
        );
  const sourceSupportabilityIdentityTrusted =
    sourceSupportabilityIdentity === null ||
    sourceSupportabilityIdentity === requestedSourceReference;
  const sourceSupportabilityTrusted =
    readString(sourceSupportability.source_service) === "lotus-manage" &&
    readString(sourceSupportability.authority) ===
      profile.sourceSupportabilityAuthority &&
    sourceSupportabilityState !== null &&
    profile.liveSourceSupportabilityStates.some(
      (state) => state === sourceSupportabilityState,
    ) &&
    sourceSupportabilityIdentityTrusted;
  const safetyMode = readString(safety.safety_mode);
  const safetyDisposition = readUpperString(safety.disposition);
  const enforcedSafetyControls = new Set(
    readStringArray(safety.enforced_controls),
  );
  const safetyEnforced =
    safetyMode === "runtime_enforced" &&
    safety.runtime_redaction_active === true &&
    safetyDisposition !== null &&
    TRUSTED_SAFETY_DISPOSITIONS.has(safetyDisposition) &&
    REQUIRED_SAFETY_CONTROLS.every((control) =>
      enforcedSafetyControls.has(control),
    );
  const authorized =
    readString(eligibility.eligibility_result) === "ALLOWED" &&
    eligibility.allowed === true &&
    readString(authorization.outcome) === "ALLOWED" &&
    authorization.allowed === true &&
    authorization.caller_identity_bound === true &&
    readString(authorization.capability_type) === "task_execution" &&
    readString(authorization.caller_identity_source) ===
      "trusted_http_header" &&
    readString(eligibility.caller_identity_class) === "INTERNAL_SERVICE" &&
    eligibility.workflow_surface_applied === true &&
    eligibilityCallerApp !== null &&
    eligibilityCallerApp === authorizationCallerApp &&
    eligibilityCallerApp === authenticatedCallerApp &&
    eligibilityCallerApp === runCallerApp;
  const identityChecks = [
    data.service === "lotus-ai",
    readString(data.version) !== null,
    readString(eligibility.service) === "lotus-ai",
    readString(envelope.source_service) === "lotus-ai",
    readString(envelope.evidence_source_service) === "lotus-manage",
    readHttpSuccess(envelope.manage_upstream_status),
    readHttpSuccess(envelope.ai_upstream_status),
    sourceSupportabilityTrusted,
    safetyEnforced,
    matchesDpmAiWorkflowSource(response, profile, requestedSourceReference),
    supportabilityStatus !== null &&
      SUPPORTED_WORKFLOW_SUPPORTABILITY_STATUSES.has(supportabilityStatus),
    reviewState !== null,
    reviewRequired !== null &&
      reviewRequired === (reviewState !== "NOT_REVIEW_REQUIRED"),
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
    classifyAiProviderPosture(providerMode, stubbed) !== "untrusted",
    outputKeys.length === structuredOutputKeys.length &&
      outputKeys.every((key, index) => key === structuredOutputKeys[index]),
    usableOutputKeys.length > 0,
    normalizedMaterial.withinBudget,
    normalizedMaterial.material.sections.length > 0,
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
    sourceSupportabilityState,
    sourceSupportabilityTrusted,
    sourceReference,
    runId,
    packId: readString(run.pack_id),
    packVersion,
    workflowAuthorityOwner,
    material: contractComplete && materialRuntimeComplete
      ? normalizedMaterial.material
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
      transitionCount: readNonNegativeInteger(
        reviewSummary.review_transition_count,
      ),
    },
    safetyMode,
    safetyDisposition,
    safetyEnforced,
    runtimeRedactionActive: readBoolean(safety.runtime_redaction_active),
  };
}

export function matchesDpmAiWorkflowSource(
  response: unknown,
  profile: DpmAiWorkflowProfile,
  expectedSourceReference: unknown,
): boolean {
  const requestedSourceReference = readString(expectedSourceReference);
  if (requestedSourceReference === null) {
    return false;
  }
  return (
    readDpmAiWorkflowSourceReference(response, profile) ===
    requestedSourceReference
  );
}

export function readDpmAiWorkflowSourceReference(
  response: unknown,
  profile: DpmAiWorkflowProfile,
): string | null {
  const envelope = asRecord(response);
  const sourceInput = asRecord(envelope[profile.sourceInputField]);
  return readString(sourceInput[profile.sourceIdentityField]);
}

function normalizeWorkflowMaterial(
  structuredOutput: Record<string, unknown>,
  profile: DpmAiWorkflowProfile,
): { material: DpmAiWorkflowMaterial; withinBudget: boolean } {
  const materialByLabel = new Map<string, string[]>();
  for (const { key, label } of profile.materialFields) {
    if (!Object.hasOwn(structuredOutput, key)) {
      continue;
    }
    const normalized = formatMaterialValues(
      structuredOutput[key],
      0,
      isMaterialEnumField(key),
    );
    const existingValues = materialByLabel.get(label) ?? [];
    if (
      !normalized.withinBudget ||
      existingValues.length + normalized.values.length > MATERIAL_MAX_VALUES_PER_SECTION
    ) {
      return {
        material: { title: profile.materialTitle, sections: [] },
        withinBudget: false,
      };
    }
    if (normalized.values.length > 0) {
      materialByLabel.set(label, [...existingValues, ...normalized.values]);
    }
  }
  const sections = Array.from(materialByLabel, ([label, values]) => ({
    label,
    values,
  }));
  return {
    material: { title: profile.materialTitle, sections },
    withinBudget: true,
  };
}

function formatMaterialValues(
  value: unknown,
  depth = 0,
  formatEnumValues = false,
): MaterialValueNormalization {
  if (typeof value === "string") {
    const normalized = value.trim();
    return {
      values: normalized
        ? [formatEnumValues ? formatMaterialLabel(normalized) : normalized]
        : [],
      withinBudget: true,
    };
  }
  if (typeof value === "boolean") {
    return { values: [value ? "Yes" : "No"], withinBudget: true };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { values: [String(value)], withinBudget: true };
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { values: [], withinBudget: true };
    }
    if (depth >= MATERIAL_MAX_DEPTH || value.length > MATERIAL_MAX_CONTAINER_ITEMS) {
      return { values: [], withinBudget: false };
    }
    return combineMaterialValues(
      value.map((item) => formatMaterialValues(item, depth + 1, formatEnumValues)),
    );
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return { values: [], withinBudget: true };
    }
    if (depth >= MATERIAL_MAX_DEPTH || entries.length > MATERIAL_MAX_CONTAINER_ITEMS) {
      return { values: [], withinBudget: false };
    }
    return combineMaterialValues(
      entries.map(([key, nestedValue]) => {
        const nested = formatMaterialValues(
          nestedValue,
          depth + 1,
          isMaterialEnumField(key),
        );
        return {
          values: nested.values.map(
            (nestedValue) => `${formatMaterialLabel(key)}: ${nestedValue}`,
          ),
          withinBudget: nested.withinBudget,
        };
      }),
    );
  }
  return { values: [], withinBudget: true };
}

function combineMaterialValues(
  normalizedValues: MaterialValueNormalization[],
): MaterialValueNormalization {
  const values: string[] = [];
  for (const normalized of normalizedValues) {
    if (
      !normalized.withinBudget ||
      values.length + normalized.values.length > MATERIAL_MAX_VALUES_PER_SECTION
    ) {
      return { values: [], withinBudget: false };
    }
    values.push(...normalized.values);
  }
  return { values, withinBudget: true };
}

function isMaterialEnumField(key: string): boolean {
  return (
    key === "state" ||
    key === "scope" ||
    key === "status" ||
    key.endsWith("_state") ||
    key.endsWith("_status")
  );
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

function readUpperString(value: unknown): string | null {
  return readString(value)?.toUpperCase() ?? null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
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

function isUsableStructuredOutputValue(value: unknown, depth = 0): boolean {
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
    return (
      depth < MATERIAL_MAX_DEPTH &&
      value.length <= MATERIAL_MAX_CONTAINER_ITEMS &&
      value.some((item) => isUsableStructuredOutputValue(item, depth + 1))
    );
  }
  if (value && typeof value === "object") {
    const values = Object.values(value);
    return (
      depth < MATERIAL_MAX_DEPTH &&
      values.length <= MATERIAL_MAX_CONTAINER_ITEMS &&
      values.some((item) => isUsableStructuredOutputValue(item, depth + 1))
    );
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
