import type {
  DpmAiEvidenceDescriptor,
  DpmAiWorkflowExecution,
  DpmAiWorkflowReviewState,
  DpmAiWorkflowRuntimeState,
  DpmAiWorkflowSupportabilityStatus,
} from "@/features/workbench/dpm-ai-workflow-contract";
import {
  getDpmAiWorkflowProfile,
  type DpmAiWorkflowFamily,
} from "@/features/workbench/dpm-ai-workflow-profiles";

type DpmAiWorkflowFixtureOptions = {
  runId?: string;
  runtimeState?: DpmAiWorkflowRuntimeState;
  reviewState?: DpmAiWorkflowReviewState;
  supportabilityStatus?: DpmAiWorkflowSupportabilityStatus;
  stubbed?: boolean;
  providerMode?: string;
  outputLabel?: string;
  structuredOutput?: Record<string, unknown>;
  evidenceDescriptors?: DpmAiEvidenceDescriptor[];
  supersededByRunId?: string | null;
  replacementRunId?: string | null;
  authorizationAllowed?: boolean;
  callerIdentityBound?: boolean;
  runtimeRedactionActive?: boolean;
  sourceReference?: string;
  workflowSurfaceApplied?: boolean;
  sourceSupportabilityState?: string;
  safetyMode?: string;
  safetyDisposition?: string;
  enforcedSafetyControls?: string[];
  callerIdentityClass?: string;
  callerIdentitySource?: string;
  reviewTransitionCount?: number;
};

const SOURCE_REFERENCE_BY_FAMILY: Record<DpmAiWorkflowFamily, string> = {
  "proof-pack-memo": "ppack_1",
  "wave-memo": "dwv_001",
  "operations-handoff": "dwv_001",
  "exception-summary": "me_1",
  "outcome-narrative": "outcome_review_001",
  "pm-quality-summary": "score_run_001",
};

export function getDpmAiWorkflowFixtureSourceReference(
  family: DpmAiWorkflowFamily,
): string {
  return SOURCE_REFERENCE_BY_FAMILY[family];
}

export function buildDpmAiWorkflowExecution(
  family: DpmAiWorkflowFamily,
  options: DpmAiWorkflowFixtureOptions = {},
): DpmAiWorkflowExecution {
  const profile = getDpmAiWorkflowProfile(family);
  const runtimeState = options.runtimeState ?? "COMPLETED";
  const reviewState = options.reviewState ?? "AWAITING_REVIEW";
  const stubbed = options.stubbed ?? false;
  const outputLabel = options.outputLabel ?? "EXPLANATION_ONLY";
  const structuredOutput = options.structuredOutput ?? {
    state: "REVIEW_REQUIRED",
    scope: "support_only",
  };
  const evidenceDescriptors = options.evidenceDescriptors ?? [
    {
      evidence_type: "source_contract",
      summary: "Governed source evidence supports this result.",
    },
  ];
  const packFamily = profile.packId.replace(/\.pack$/, "");
  const runId = options.runId ?? `packrun_${packFamily}_001`;
  const requestId = `air_${packFamily}_001`;
  const reviewRecorded = [
    "ACCEPTED",
    "REJECTED",
    "REVISED",
    "ABANDONED",
  ].includes(reviewState);
  const providerMode = options.providerMode ?? (stubbed ? "disabled" : "openai");

  return {
    service: "lotus-ai",
    version: "0.1.0",
    eligibility: {
      service: "lotus-ai",
      version: "0.1.0",
      pack_id: profile.packId,
      requested_version: "v1",
      eligibility_result: "ALLOWED",
      allowed: true,
      evaluated_registration_ref: `${profile.packId}@v1`,
      caller_app: "lotus-gateway",
      environment: "DEVELOPMENT",
      caller_identity_class: options.callerIdentityClass ?? "INTERNAL_SERVICE",
      tenant_scope_applied: false,
      workflow_surface_applied: options.workflowSurfaceApplied ?? true,
    },
    execution: {
      status: runtimeState === "FAILED" ? "FAILED" : "COMPLETED",
      task_id: "explain.v1",
      category: "explain",
      output_label: outputLabel,
      result: { structured_output: structuredOutput },
      audit: {
        request_id: requestId,
        workflow_pack_run_id: runId,
        task_id: "explain.v1",
        output_label: outputLabel,
        provider_mode: providerMode,
        provider_id: stubbed ? "text.stub" : "text.openai",
        adapter_kind: stubbed ? "STUB" : "OPENAI",
        model_id: stubbed ? null : "governed-model",
        model_version: stubbed ? null : "2026-08-01",
        safety: {
          safety_mode: options.safetyMode ?? "runtime_enforced",
          output_label: outputLabel,
          redaction_posture: "MINIMIZATION_REQUIRED",
          disposition: options.safetyDisposition ?? "ENFORCED_PASSTHROUGH",
          runtime_redaction_active: options.runtimeRedactionActive ?? true,
          enforced_controls: options.enforcedSafetyControls ?? [
            "response_labeling",
            "correlation_and_audit",
            "runtime_redaction_engine",
          ],
        },
        authorization: {
          caller_app: "lotus-gateway",
          authenticated_caller_app: "lotus-gateway",
          caller_identity_source:
            options.callerIdentitySource ?? "trusted_http_header",
          caller_identity_bound: options.callerIdentityBound ?? true,
          capability_type: "task_execution",
          outcome:
            options.authorizationAllowed === false ? "DENIED" : "ALLOWED",
          allowed: options.authorizationAllowed ?? true,
          tenant_policy_mode: "OPTIONAL",
          task_id: "explain.v1",
        },
        generated_at: "2026-08-05T08:00:00Z",
        stubbed,
      },
      evidence: { descriptors: evidenceDescriptors },
    },
    workflow_pack_run: {
      run_id: runId,
      pack_id: profile.packId,
      pack_family: packFamily,
      pack_version: "v1",
      registration_ref: `${profile.packId}@v1`,
      task_id: "explain.v1",
      request_id: requestId,
      caller_app: "lotus-gateway",
      correlation_id: `corr-${family}`,
      workflow_surface: profile.workflowSurface,
      workflow_authority_owner: "lotus-manage",
      runtime_state: runtimeState,
      review_state: reviewState,
      supportability_status: options.supportabilityStatus ?? "ACTION_REQUIRED",
      allowed_review_actions:
        reviewState === "AWAITING_REVIEW"
          ? ["ACCEPT", "REJECT", "REVISE", "SUPERSEDE", "ABANDON"]
          : [],
      review_summary: {
        latest_review_event_at: reviewRecorded ? "2026-08-05T08:05:00Z" : null,
        latest_review_actor: reviewRecorded ? "investment-control-001" : null,
        review_transition_count:
          options.reviewTransitionCount ?? (reviewRecorded ? 1 : 0),
        has_review_history: reviewRecorded,
      },
      review_required: reviewState !== "NOT_REVIEW_REQUIRED",
      provider_mode: providerMode,
      stubbed,
      structured_output_keys: Object.keys(structuredOutput).sort(),
      evidence_descriptors: evidenceDescriptors,
      artifact_refs: [
        {
          artifact_id: `artifact_${packFamily}_001`,
          domain: "workflow_pack",
          artifact_type: "run_output_summary",
          source_object_kind: "workflow_pack_run",
          source_object_id: runId,
          lifecycle_status: "runtime_generated",
          retention_posture: "retained_for_review",
          media_type: "application/json",
          byte_size: 512,
          checksum_sha256: "a".repeat(64),
          lineage_parent_artifact_id: null,
          superseded_by_artifact_id: null,
          created_at: "2026-08-05T08:00:00Z",
        },
      ],
      supersedes_run_id: null,
      superseded_by_run_id: options.supersededByRunId ?? null,
      replacement_run_id: options.replacementRunId ?? null,
      recovery_lineage: null,
      created_at: "2026-08-05T08:00:00Z",
      completed_at:
        runtimeState === "COMPLETED" ? "2026-08-05T08:00:00Z" : null,
      last_updated_at: "2026-08-05T08:05:00Z",
    },
    summary: ["The governed workflow result is available for internal review."],
  };
}

export function buildDpmAiWorkflowResponse(
  family: DpmAiWorkflowFamily,
  options: DpmAiWorkflowFixtureOptions = {},
) {
  const profile = getDpmAiWorkflowProfile(family);
  const sourceReference =
    options.sourceReference ?? getDpmAiWorkflowFixtureSourceReference(family);
  return {
    correlation_id: `corr-${family}`,
    contract_version: "1.0.0",
    source_service: "lotus-ai",
    evidence_source_service: "lotus-manage",
    manage_upstream_status: 200,
    ai_upstream_status: 200,
    supportability: {
      source_service: "lotus-manage",
      authority: profile.sourceSupportabilityAuthority,
      state:
        options.sourceSupportabilityState ??
        profile.liveSourceSupportabilityStates[0],
      reason_codes: [],
    },
    ...buildSourceInput(family, sourceReference),
    data: buildDpmAiWorkflowExecution(family, options),
  };
}

function buildSourceInput(
  family: DpmAiWorkflowFamily,
  sourceReference: string,
): Record<string, Record<string, unknown>> {
  switch (family) {
    case "proof-pack-memo":
      return { ai_evidence_input: { proof_pack_id: sourceReference } };
    case "wave-memo":
    case "operations-handoff":
      return { wave_report_input: { wave_id: sourceReference } };
    case "exception-summary":
      return { exception_summary_input: { exception_id: sourceReference } };
    case "outcome-narrative":
      return { ai_evidence_input: { outcome_review_id: sourceReference } };
    case "pm-quality-summary":
      return { score_run: { score_run_id: sourceReference } };
  }
}
