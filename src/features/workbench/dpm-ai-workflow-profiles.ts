export const DPM_AI_WORKFLOW_PROFILES = {
  "proof-pack-memo": {
    scopeLabel: "Portfolio decision memo",
    packId: "dpm_pm_memo.pack",
    workflowSurface: "dpm-proof-pack-ai-evidence",
    sourceInputField: "ai_evidence_input",
    sourceIdentityField: "proof_pack_id",
  },
  "wave-memo": {
    scopeLabel: "Rebalance wave review memo",
    packId: "dpm_wave_pm_memo.pack",
    workflowSurface: "dpm-wave-ai-evidence",
    sourceInputField: "wave_report_input",
    sourceIdentityField: "wave_id",
  },
  "operations-handoff": {
    scopeLabel: "Operations handoff summary",
    packId: "dpm_operations_handoff_summary.pack",
    workflowSurface: "dpm-operations-handoff-ai-evidence",
    sourceInputField: "wave_report_input",
    sourceIdentityField: "wave_id",
  },
  "exception-summary": {
    scopeLabel: "Mandate exception review summary",
    packId: "dpm_exception_summary.pack",
    workflowSurface: "dpm-exception-summary-ai-evidence",
    sourceInputField: "exception_summary_input",
    sourceIdentityField: "exception_id",
  },
  "outcome-narrative": {
    scopeLabel: "Outcome review narrative",
    packId: "outcome_review_narrative.pack",
    workflowSurface: "dpm-outcome-review-ai-evidence",
    sourceInputField: "ai_evidence_input",
    sourceIdentityField: "outcome_review_id",
  },
  "pm-quality-summary": {
    scopeLabel: "Portfolio-manager quality support summary",
    packId: "pm_quality_summary.pack",
    workflowSurface: "dpm-pm-quality-ai-evidence",
    sourceInputField: "score_run",
    sourceIdentityField: "score_run_id",
  },
} as const;

export type DpmAiWorkflowFamily = keyof typeof DPM_AI_WORKFLOW_PROFILES;
export type DpmAiWorkflowProfile =
  (typeof DPM_AI_WORKFLOW_PROFILES)[DpmAiWorkflowFamily];

export function getDpmAiWorkflowProfile(family: DpmAiWorkflowFamily) {
  return DPM_AI_WORKFLOW_PROFILES[family];
}
