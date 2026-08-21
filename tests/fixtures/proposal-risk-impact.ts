import type { ProposalRiskImpactEnvelope } from "../../src/features/proposals/proposal-risk-impact-contract";

export function proposalRiskImpactFixture(): ProposalRiskImpactEnvelope {
  return {
    correlation_id: "corr-proposal-risk-impact-001",
    contract_version: "proposal-risk-impact.v1",
    data: {
      proposal_id: "PRP-RISK",
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      title: "Technology concentration trim",
      current_state: "RISK_REVIEW",
      version_no: 3,
      version_created_at: "2026-08-19T09:30:00Z",
      overall_state: "ready",
      allocation: {
        state: "ready",
        reason_code: "allocation_comparison_available",
        source_service: "lotus-core",
        source_mode: "LOTUS_CORE",
        contract_version: "advisory-simulation.v1",
        calculator_version: "lotus-core.allocation-calculator.v1",
        expected_dimensions: ["asset_class"],
        views: [
          {
            dimension: "asset_class",
            current: {
              total_value: { amount: "1250000.00", currency: "USD" },
              buckets: [
                {
                  key: "EQUITY",
                  weight: "0.6800",
                  value: { amount: "850000.00", currency: "USD" },
                  position_count: 12,
                },
                {
                  key: "CASH",
                  weight: "0.3200",
                  value: { amount: "400000.00", currency: "USD" },
                  position_count: 1,
                },
              ],
            },
            proposed: {
              total_value: { amount: "1250000.00", currency: "USD" },
              buckets: [
                {
                  key: "EQUITY",
                  weight: "0.6200",
                  value: { amount: "775000.00", currency: "USD" },
                  position_count: 13,
                },
                {
                  key: "CASH",
                  weight: "0.3800",
                  value: { amount: "475000.00", currency: "USD" },
                  position_count: 1,
                },
              ],
            },
          },
        ],
      },
      risk: {
        state: "ready",
        reason_code: "proposal_risk_lens_available",
        source_service: "lotus-risk",
        summary:
          "Concentration falls while the proposal remains within the review workflow.",
        highlights: [
          "Equity concentration reduces by six percentage points.",
          "Risk officer review remains required before client discussion.",
        ],
      },
      decision: {
        state: "ready",
        reason_code: "proposal_decision_available",
        source_service: "lotus-advise",
        support_reference:
          "current_version.proposal_result.proposal_decision_summary",
        decision_status: "REQUIRES_RISK_REVIEW",
        top_level_status: "PENDING_REVIEW",
        primary_reason_code: "MATERIAL_CONCENTRATION_CHANGE",
        primary_summary:
          "Review the proposed reduction in concentrated equity exposure.",
        recommended_next_action: "REVIEW_RISK",
        confidence: "HIGH",
        decision_policy_version: "proposal-decision.2026-04",
        risk_posture_status: "AVAILABLE",
        risk_posture_source_service: "lotus-risk",
        risk_posture_summary: "The proposal risk lens is available for review.",
        approval_requirements: [
          {
            approval_type: "RISK_REVIEW",
            required: true,
            severity: "HIGH",
            reason_code: "MATERIAL_CONCENTRATION_CHANGE",
            summary: "Risk review is required before client discussion.",
            blocking_until_approved: true,
            evidence_refs: ["artifact.risk_lens"],
            policy_version: "proposal-decision.2026-04",
          },
        ],
        material_changes: [
          {
            change_id: "change-equity-concentration",
            family: "CONCENTRATION_CHANGE",
            severity: "HIGH",
            summary: "Equity concentration reduces from 68% to 62%.",
            evidence_refs: [
              "proposal_result.before",
              "proposal_result.after_simulated",
            ],
          },
        ],
        missing_evidence: [],
        evidence_refs: ["current_version.proposal_result"],
      },
      workflow_gate: {
        state: "ready",
        reason_code: "workflow_gate_available",
        support_reference:
          "current_version.proposal_result.workflow_gate_snapshot",
        gate: "RISK_REVIEW_REQUIRED",
        recommended_next_step: "RISK_REVIEW",
        reasons: [
          {
            reason_code: "MATERIAL_CONCENTRATION_CHANGE",
            severity: "HIGH",
            source: "RULE_ENGINE",
          },
        ],
      },
      capabilities: [
        [
          "allocation_comparison",
          "Allocation comparison",
          "ready",
          "allocation_comparison_available",
          "lotus-core",
          "current_version.proposal_result",
        ],
        [
          "proposal_risk_lens",
          "Proposal risk lens",
          "ready",
          "proposal_risk_lens_available",
          "lotus-risk",
          "current_version.artifact.risk_lens",
        ],
        [
          "decision_posture",
          "Decision posture",
          "ready",
          "proposal_decision_available",
          "lotus-advise",
          "current_version.proposal_result.proposal_decision_summary",
        ],
        [
          "workflow_gate",
          "Workflow gate",
          "ready",
          "workflow_gate_available",
          "lotus-advise",
          "current_version.proposal_result.workflow_gate_snapshot",
        ],
        [
          "benchmark_and_limits",
          "Benchmark and limits",
          "not_supported",
          "benchmark_and_limits_not_supported",
          null,
          null,
        ],
        [
          "scenario_analysis",
          "Scenario analysis",
          "not_supported",
          "scenario_analysis_not_supported",
          null,
          null,
        ],
        [
          "valuation_as_of",
          "Valuation as of",
          "not_supported",
          "valuation_as_of_not_supported",
          null,
          null,
        ],
      ].map(
        ([
          key,
          label,
          state,
          reason_code,
          source_service,
          support_reference,
        ]) => ({
          key,
          label,
          state,
          reason_code,
          source_service,
          support_reference,
        }),
      ) as ProposalRiskImpactEnvelope["data"]["capabilities"],
      lineage: {
        proposal_version_id: "ppv_003",
        request_hash: "sha256:risk-request-003",
        artifact_hash: "sha256:risk-artifact-003",
        simulation_hash: "sha256:risk-simulation-003",
      },
    },
  };
}
