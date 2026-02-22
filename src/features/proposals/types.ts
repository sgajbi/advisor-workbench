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
