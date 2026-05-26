export type ProposalSimulateRequest = {
  body: Record<string, unknown>;
};

export type ProposalSimulateResponse = {
  correlation_id: string;
  contract_version: string;
  data: {
    status?: string;
    proposal_run_id?: string;
    [key: string]: unknown;
  };
};

export type ProposalCreateRequest = {
  body: {
    created_by: string;
    simulate_request: Record<string, unknown>;
    metadata?: {
      title?: string;
      advisor_notes?: string;
      jurisdiction?: string;
      mandate_id?: string;
    };
  };
};

export type ProposalBodyRequest = {
  body: Record<string, unknown>;
};

export type AdvisoryWorkspaceEnvelopeResponse = {
  correlation_id: string;
  contract_version: string;
  data: Record<string, unknown>;
};

export type AdvisoryWorkspaceCreateRequest = {
  body: {
    workspace_name: string;
    created_by: string;
    input_mode: "stateful";
    stateful_input: {
      portfolio_id: string;
      as_of: string;
      household_id?: string;
      mandate_id?: string;
      benchmark_id?: string;
    };
  };
};

export type AdvisoryWorkspaceDraftActionRequest = {
  body: {
    actor_id: string;
    action_type:
      | "ADD_TRADE"
      | "UPDATE_TRADE"
      | "REMOVE_TRADE"
      | "ADD_CASH_FLOW"
      | "UPDATE_CASH_FLOW"
      | "REMOVE_CASH_FLOW"
      | "REPLACE_OPTIONS";
    workspace_trade_id?: string;
    workspace_cash_flow_id?: string;
    trade?: Record<string, unknown>;
    cash_flow?: Record<string, unknown>;
    options?: Record<string, unknown>;
  };
};

export type AdvisoryWorkspaceSaveRequest = {
  body: {
    saved_by: string;
    version_label?: string;
  };
};

export type AdvisoryWorkspaceHandoffRequest = {
  body: {
    handoff_by: string;
    metadata?: {
      title?: string;
      advisor_notes?: string;
      jurisdiction?: string;
      mandate_id?: string;
    };
  };
};

export type AdvisoryWorkspaceBodyRequest = {
  body: Record<string, unknown>;
};

export type ProposalEnvelopeResponse = {
  correlation_id: string;
  contract_version: string;
  data: Record<string, unknown>;
};

export type AdvisoryPolicyEnvelopeResponse = {
  correlation_id: string;
  contract_version: string;
  data: Record<string, unknown>;
};

export type AdvisoryPolicyEvaluationRecord = {
  evaluation_id?: string;
  proposal_id?: string;
  proposal_version_id?: string;
  policy_pack_id?: string;
  policy_version?: string;
  evaluation_status?: string;
  source_refs?: string[];
  source_gaps?: string[];
  approval_dependencies?: string[];
  disclosure_requirements?: string[];
  consent_requirements?: string[];
  review_events_json?: Array<Record<string, unknown>>;
  sign_off_events_json?: Array<Record<string, unknown>>;
  report_archive_refs_json?: Array<Record<string, unknown>>;
  replay_metadata_json?: Record<string, unknown>;
  evaluation_json?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AdvisoryPolicyReviewQueueData = {
  items?: AdvisoryPolicyEvaluationRecord[];
  queue_posture?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AdvisoryPolicyEvaluationData = AdvisoryPolicyEvaluationRecord;

export type AdvisoryPolicyRequirementProjection = {
  requirement_id?: string;
  requirement_type?: string;
  status?: string;
  owner_role?: string;
  review_sla?: string;
  due_at?: string | null;
  reason_codes?: string[];
  [key: string]: unknown;
};

export type AdvisoryPolicyWorkflowData = {
  evaluation_id?: string;
  proposal_id?: string;
  proposal_version_id?: string;
  evaluation_status?: string;
  approval_dependencies?: AdvisoryPolicyRequirementProjection[];
  disclosure_requirements?: AdvisoryPolicyRequirementProjection[];
  consent_requirements?: AdvisoryPolicyRequirementProjection[];
  conflict_posture?: Record<string, unknown>;
  sla_posture?: Record<string, unknown>;
  sign_off_status?: string;
  sign_off_blockers?: string[];
  maker_checker_required?: boolean;
  latest_sign_off_event?: Record<string, unknown> | null;
  client_ready_publication?: string;
  [key: string]: unknown;
};

export type AdvisoryPolicySignOffPackageData = {
  evaluation?: AdvisoryPolicyEvaluationRecord;
  lineage?: {
    evaluation_id?: string;
    source_refs?: string[];
    source_gaps?: string[];
    audit_events?: Array<Record<string, unknown>>;
    lineage_posture?: Record<string, unknown>;
    [key: string]: unknown;
  };
  package_posture?: Record<string, unknown>;
  [key: string]: unknown;
};

export type AdvisoryPolicySignOffDecisionRequest = {
  body: {
    actor_id: string;
    decision: "APPROVE_FOR_POLICY_SIGN_OFF" | "REQUEST_MORE_EVIDENCE" | "REJECT_POLICY_SIGN_OFF";
    source_evaluation_hash: string;
    resolved_approval_dependencies?: string[];
    satisfied_disclosure_requirements?: string[];
    satisfied_consent_requirements?: string[];
    conflict_review_outcome?: string | null;
    reason?: Record<string, unknown>;
  };
};

export type AdvisoryPolicySignOffDecisionData = {
  workflow?: AdvisoryPolicyWorkflowData;
  sign_off_event?: Record<string, unknown>;
  replay_metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProposalSummary = {
  proposal_id: string;
  portfolio_id?: string;
  current_state: string;
  current_version_no?: number;
  title?: string | null;
  created_by?: string;
  created_at?: string;
};

export type ProposalListData = {
  items: ProposalSummary[];
  next_cursor?: string | null;
};

export type ProposalDetailData = {
  proposal: ProposalSummary;
  current_version?: {
    version_no?: number;
    status_at_creation?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ProposalVersionData = {
  proposal_id?: string;
  version_no?: number;
  status_at_creation?: string;
  created_at?: string;
  artifact_hash?: string;
  [key: string]: unknown;
};

export type ProposalLineageData = {
  proposal_id?: string;
  versions?: Array<{
    version_no?: number;
    request_hash?: string;
    simulation_hash?: string;
    artifact_hash?: string;
    created_at?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type ProposalSubmitRequest = {
  actor_id: string;
  expected_state: string;
  review_type: "RISK" | "COMPLIANCE";
  reason?: Record<string, unknown>;
  related_version_no?: number;
};

export type ProposalApprovalActionRequest = {
  actor_id: string;
  expected_state: string;
  details?: Record<string, unknown>;
  related_version_no?: number;
};

export type ProposalWorkflowEvent = {
  event_id: string;
  event_type: string;
  from_state?: string | null;
  to_state: string;
  actor_id: string;
  occurred_at: string;
};

export type ProposalWorkflowEventsData = {
  proposal_id: string;
  current_state: string;
  events: ProposalWorkflowEvent[];
};

export type ProposalApprovalRecord = {
  approval_id: string;
  approval_type: string;
  approved: boolean;
  actor_id: string;
  occurred_at: string;
};

export type ProposalApprovalsData = {
  proposal_id: string;
  current_state: string;
  approvals: ProposalApprovalRecord[];
};

export type ProposalNarrativeReviewRequest = {
  action: "APPROVE" | "REJECT" | "REQUEST_REGENERATION";
  reviewed_by: string;
  reason: string;
  client_ready_release_requested?: boolean;
  replacement_narrative_id?: string;
};

export type ProposalReportRequest = {
  report_type: string;
  requested_by: string;
  related_version_no?: number;
  include_execution_summary?: boolean;
  include_reviewed_narrative?: boolean;
};

export type ProposalNarrativeReviewData = {
  narrative_review?: {
    review_state?: string;
    action?: string;
    source_narrative_hash?: string | null;
    reviewed_by?: string | null;
    reviewed_at?: string | null;
    client_ready_status?: string | null;
    [key: string]: unknown;
  };
  policy_version?: string | null;
  audience?: string | null;
  [key: string]: unknown;
};

export type ProposalReportRequestData = {
  report_request_id?: string;
  status?: string;
  report_type?: string;
  report_reference_id?: string | null;
  generated_at?: string | null;
  explanation?: {
    include_reviewed_narrative?: boolean;
    proposal_narrative_package?: {
      package_status?: string;
      review_state?: string;
      source_narrative_hash?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ProposalDeliverySummaryData = {
  proposal?: ProposalSummary;
  reporting?: {
    status?: string;
    report_request_id?: string;
    report_type?: string;
    report_reference_id?: string | null;
    requested_by?: string | null;
    include_reviewed_narrative?: boolean;
    proposal_narrative_package?: {
      package_status?: string;
      review_state?: string;
      source_narrative_hash?: string | null;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  reporting_summary?: {
    include_reviewed_narrative?: boolean;
    source_narrative_hash?: string | null;
    [key: string]: unknown;
  };
  explanation?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProposalDeliveryEventsData = {
  proposal?: ProposalSummary;
  proposal_id?: string;
  event_count?: number;
  latest_event?: {
    event_type?: string;
    to_state?: string;
    occurred_at?: string;
    [key: string]: unknown;
  };
  events?: Array<{
    event_id?: string;
    event_type?: string;
    to_state?: string;
    occurred_at?: string;
    actor_id?: string;
    reason?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  explanation?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProposalMemoCreateRequest = {
  created_by: string;
  lifecycle_status?: string;
  reason?: Record<string, unknown>;
};

export type ProposalMemoReviewRequest = {
  action: "APPROVE_FOR_ADVISOR_USE" | "REJECT" | "REQUEST_CHANGES";
  reviewed_by: string;
  reason: string;
  source_memo_hash: string;
  client_ready_release_requested?: boolean;
};

export type ProposalMemoReportPackageRequest = {
  requested_by: string;
  source_memo_hash: string;
  requested_output_formats?: string[];
  client_ready_document_requested?: boolean;
  reason?: Record<string, unknown>;
};

export type ProposalMemoAiCommentaryRequest = {
  requested_by: string;
  source_memo_hash: string;
  requested_sections?: string[];
  reason?: Record<string, unknown>;
};

export type ProposalMemoAdvisorCommentaryRequest = ProposalMemoAiCommentaryRequest;

export type ProposalMemoData = {
  proposal?: ProposalSummary;
  proposal_version_no?: number;
  memo_id?: string;
  memo_status?: string;
  lifecycle_status?: string;
  memo_hash?: string;
  memo?: Record<string, unknown>;
  projection?: Record<string, unknown>;
  review_posture?: Record<string, unknown>;
  report_package_posture?: Record<string, unknown>;
  ai_commentary_posture?: Record<string, unknown>;
  replay_metadata?: Record<string, unknown>;
  audit_events?: Array<Record<string, unknown>>;
  event_count?: number;
  read_posture?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProposalMemoProjectionData = {
  proposal?: ProposalSummary;
  projection?: Record<string, unknown>;
  sections?: Array<Record<string, unknown>>;
  projection_posture?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ProposalMemoReportPackageData = {
  memo?: Record<string, unknown>;
  report_package_event?: Record<string, unknown>;
  report?: Record<string, unknown>;
  replayed?: boolean;
  [key: string]: unknown;
};

export type ProposalMemoAiCommentaryData = {
  memo?: Record<string, unknown>;
  ai_event?: Record<string, unknown>;
  commentary?: Record<string, unknown>;
  replayed?: boolean;
  [key: string]: unknown;
};

export type ProposalMemoAdvisorCommentaryData = ProposalMemoAiCommentaryData;

export type ProposalMemoLineageData = {
  proposal?: ProposalSummary;
  proposal_id?: string;
  memos?: Array<{
    memo_id?: string;
    memo_hash?: string;
    memo_status?: string;
    report_package_posture?: Record<string, unknown>;
    ai_commentary_posture?: Record<string, unknown>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type ProposalMemoReplayEvidenceData = {
  proposal?: ProposalSummary;
  hashes?: Record<string, unknown>;
  audit_events?: Array<Record<string, unknown>>;
  supportability?: Record<string, unknown>;
  [key: string]: unknown;
};
