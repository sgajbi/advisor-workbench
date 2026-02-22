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

export type ProposalSubmitRequest = {
  actor_id: string;
  expected_state: string;
  review_type: "RISK" | "COMPLIANCE";
  reason?: Record<string, unknown>;
  related_version_no?: number;
};
