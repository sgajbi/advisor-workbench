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

export type ProposalEnvelopeResponse = {
  correlation_id: string;
  contract_version: string;
  data: Record<string, unknown>;
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
