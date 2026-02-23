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
