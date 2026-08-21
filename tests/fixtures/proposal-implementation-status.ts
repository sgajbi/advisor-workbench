import type { ProposalImplementationStatusEnvelope } from "../../src/features/proposals/proposal-implementation-status-contract";

export function proposalImplementationStatusFixture(): ProposalImplementationStatusEnvelope {
  return {
    correlation_id: "corr-implementation-1",
    contract_version: "proposal-implementation-status.v1",
    data: {
      proposal_id: "PRP-IMPLEMENT",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      title: "Rebalance global balanced mandate",
      current_state: "EXECUTION_READY",
      current_version_no: 3,
      handoff_status: "ACCEPTED",
      status_family: "pending",
      next_action: "MONITOR_IMPLEMENTATION",
      attention_required: false,
      terminal: false,
      evidence_state: "supported",
      reason_code: "implementation_handoff_accepted",
      execution_request_id: "pex_001",
      execution_provider: "lotus-manage",
      related_version_no: 3,
      version_posture: "current_version",
      handoff_requested_at: "2026-08-20T09:00:00Z",
      executed_at: null,
      external_execution_id: null,
      latest_workflow_event: {
        event_id: "pwe_002",
        event_type: "EXECUTION_ACCEPTED",
        actor_id: "lotus-manage",
        occurred_at: "2026-08-20T09:05:00Z",
        related_version_no: 3,
      },
      ownership: {
        advisory_role: "HANDOFF_REQUEST_AND_STATUS_RECONCILIATION",
        execution_system_of_record: "DOWNSTREAM_EXECUTION_PROVIDER",
        ownership_boundary: "DOWNSTREAM_EXECUTION_SYSTEM_OF_RECORD",
      },
      freshness: {
        observed_at: "2026-08-20T09:05:00Z",
        basis: "LATEST_EXECUTION_EVENT",
      },
      capabilities: [
        {
          key: "handoff_posture",
          state: "supported",
          reason_code: "advise_handoff_status_available",
          source_service: "lotus-advise",
        },
        {
          key: "provider_reference",
          state: "supported",
          reason_code: "provider_and_request_reference_available",
          source_service: "lotus-advise",
        },
        {
          key: "downstream_reference",
          state: "not_available",
          reason_code: "downstream_execution_reference_not_available",
          source_service: null,
        },
        {
          key: "event_lineage",
          state: "supported",
          reason_code: "latest_execution_event_available",
          source_service: "lotus-advise",
        },
        {
          key: "order_fill_settlement_detail",
          state: "not_supported",
          reason_code: "downstream_execution_authority_not_exposed",
          source_service: null,
        },
      ],
      lineage: {
        source_service: "lotus-advise",
        source_contract: "ProposalExecutionStatusResponse",
        proposal_id: "PRP-IMPLEMENT",
        portfolio_id: "PB_SG_GLOBAL_BAL_001",
        related_version_no: 3,
        latest_event_id: "pwe_002",
        gateway_correlation_id: "corr-implementation-1",
      },
    },
  };
}
