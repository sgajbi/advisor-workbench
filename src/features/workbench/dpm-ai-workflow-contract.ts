export type DpmAiWorkflowRuntimeState =
  "STAGED" | "RUNNING" | "COMPLETED" | "FAILED" | "EXPIRED" | "SUPERSEDED";

export type DpmAiWorkflowReviewState =
  | "NOT_REVIEW_REQUIRED"
  | "AWAITING_REVIEW"
  | "ACCEPTED"
  | "REJECTED"
  | "REVISED"
  | "SUPERSEDED"
  | "ABANDONED";

export type DpmAiWorkflowSupportabilityStatus =
  "READY" | "ACTION_REQUIRED" | "HISTORICAL";

export type DpmAiEvidenceDescriptor = {
  evidence_type: string;
  summary: string;
};

export type DpmAiWorkflowReviewSummary = {
  latest_review_event_at: string | null;
  latest_review_actor: string | null;
  review_transition_count: number;
  has_review_history: boolean;
};

export type DpmAiArtifactReference = {
  artifact_id: string;
  domain: string;
  artifact_type: string;
  source_object_kind: string;
  source_object_id: string;
  lifecycle_status: string;
  retention_posture: string;
  media_type: string;
  byte_size: number;
  checksum_sha256: string;
  lineage_parent_artifact_id: string | null;
  superseded_by_artifact_id: string | null;
  created_at: string;
};

export type DpmAiRecoveryLineage = {
  recovery_action_type: "RETRY" | "REPLAY";
  source_queue_item_id: string;
  recovery_decision_event_id: string;
  recovery_attempt_number: number | null;
  source_workflow_pack_run_id: string | null;
  requested_by: string | null;
  evidence_ref: string | null;
};

export type DpmAiWorkflowPackRun = {
  run_id: string;
  pack_id: string;
  pack_family: string;
  pack_version: string;
  registration_ref: string;
  task_id: string;
  request_id: string;
  caller_app: string;
  correlation_id: string;
  workflow_surface: string | null;
  workflow_authority_owner: string;
  runtime_state: DpmAiWorkflowRuntimeState;
  review_state: DpmAiWorkflowReviewState;
  supportability_status: DpmAiWorkflowSupportabilityStatus;
  allowed_review_actions: Array<
    "ACCEPT" | "REJECT" | "REVISE" | "SUPERSEDE" | "ABANDON"
  >;
  review_summary: DpmAiWorkflowReviewSummary;
  review_required: boolean;
  provider_mode: string;
  stubbed: boolean;
  structured_output_keys: string[];
  evidence_descriptors: DpmAiEvidenceDescriptor[];
  artifact_refs: DpmAiArtifactReference[];
  supersedes_run_id: string | null;
  superseded_by_run_id: string | null;
  replacement_run_id: string | null;
  recovery_lineage: DpmAiRecoveryLineage | null;
  created_at: string;
  completed_at: string | null;
  last_updated_at: string;
};

export type DpmAiSafetyPosture = {
  safety_mode: string;
  output_label: string;
  redaction_posture: string;
  disposition: string;
  runtime_redaction_active: boolean;
  enforced_controls: string[];
};

export type DpmAiAuthorizationPosture = {
  caller_app: string;
  authenticated_caller_app: string | null;
  caller_identity_source: string;
  caller_identity_bound: boolean;
  capability_type: string;
  outcome: string;
  allowed: boolean;
  tenant_policy_mode: string;
  task_id: string;
};

export type DpmAiTaskAudit = {
  request_id: string;
  workflow_pack_run_id: string;
  task_id: string;
  output_label: string;
  provider_mode: string;
  provider_id: string;
  adapter_kind: string | null;
  model_id: string | null;
  model_version: string | null;
  safety: DpmAiSafetyPosture;
  authorization: DpmAiAuthorizationPosture;
  generated_at: string;
  stubbed: boolean;
};

export type DpmAiTaskExecution = {
  status: "COMPLETED" | "REJECTED" | "FAILED";
  task_id: string;
  category: string;
  output_label: string;
  result: {
    structured_output: Record<string, unknown>;
  };
  audit: DpmAiTaskAudit;
  evidence: {
    descriptors: DpmAiEvidenceDescriptor[];
  };
};

export type DpmAiWorkflowEligibility = {
  service: "lotus-ai";
  version: string;
  pack_id: string;
  requested_version: string;
  eligibility_result: string;
  allowed: boolean;
  evaluated_registration_ref: string | null;
  caller_app: string;
  environment: string;
  caller_identity_class: string;
  tenant_scope_applied: boolean;
  workflow_surface_applied: boolean;
};

export type DpmAiWorkflowExecution = {
  service: "lotus-ai";
  version: string;
  eligibility: DpmAiWorkflowEligibility;
  execution: DpmAiTaskExecution;
  workflow_pack_run: DpmAiWorkflowPackRun;
  summary: string[];
};
