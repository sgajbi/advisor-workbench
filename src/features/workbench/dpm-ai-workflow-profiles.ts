export const DPM_AI_WORKFLOW_PROFILES = {
  "proof-pack-memo": {
    scopeLabel: "Portfolio decision memo",
    packId: "dpm_pm_memo.pack",
    workflowSurface: "dpm-proof-pack-ai-evidence",
    sourceInputField: "ai_evidence_input",
    sourceIdentityField: "proof_pack_id",
    materialTitle: "Decision memo material",
    materialFields: [
      { key: "pm_memo", label: "Portfolio manager memo" },
      { key: "memo", label: "Portfolio manager memo" },
      { key: "memo_sections", label: "Memo sections" },
      { key: "evidence_gaps", label: "Evidence gaps" },
      { key: "evidence_gap_count", label: "Evidence gaps" },
      { key: "escalation_required", label: "Escalation required" },
      { key: "dpm_pm_memo_status", label: "Review posture" },
      { key: "state", label: "Review posture" },
      { key: "scope", label: "Permitted scope" },
    ],
  },
  "wave-memo": {
    scopeLabel: "Rebalance wave review memo",
    packId: "dpm_wave_pm_memo.pack",
    workflowSurface: "dpm-wave-ai-evidence",
    sourceInputField: "wave_report_input",
    sourceIdentityField: "wave_id",
    materialTitle: "Rebalance review material",
    materialFields: [
      { key: "wave_pm_memo", label: "Rebalance memo" },
      { key: "memo_sections", label: "Memo sections" },
      { key: "approval_checklist", label: "Approval checklist" },
      { key: "evidence_gaps", label: "Evidence gaps" },
      { key: "review_required", label: "Review required" },
      { key: "state", label: "Review posture" },
      { key: "scope", label: "Permitted scope" },
    ],
  },
  "operations-handoff": {
    scopeLabel: "Operations handoff summary",
    packId: "dpm_operations_handoff_summary.pack",
    workflowSurface: "dpm-operations-handoff-ai-evidence",
    sourceInputField: "wave_report_input",
    sourceIdentityField: "wave_id",
    materialTitle: "Operations handoff material",
    materialFields: [
      { key: "operations_summary", label: "Operations summary" },
      { key: "sections", label: "Handoff sections" },
      { key: "blocking_conditions", label: "Blocking conditions" },
      { key: "review_required", label: "Review required" },
      { key: "state", label: "Review posture" },
      { key: "scope", label: "Permitted scope" },
    ],
  },
  "exception-summary": {
    scopeLabel: "Mandate exception review summary",
    packId: "dpm_exception_summary.pack",
    workflowSurface: "dpm-exception-summary-ai-evidence",
    sourceInputField: "exception_summary_input",
    sourceIdentityField: "exception_id",
    materialTitle: "Exception review material",
    materialFields: [
      { key: "exception_summary", label: "Exception summary" },
      { key: "recommended_triage", label: "Recommended triage" },
      { key: "exception_count", label: "Exceptions covered" },
      { key: "exception_summary_status", label: "Review posture" },
      { key: "state", label: "Review posture" },
      { key: "scope", label: "Permitted scope" },
    ],
  },
  "outcome-narrative": {
    scopeLabel: "Outcome review narrative",
    packId: "outcome_review_narrative.pack",
    workflowSurface: "dpm-outcome-review-ai-evidence",
    sourceInputField: "ai_evidence_input",
    sourceIdentityField: "outcome_review_id",
    materialTitle: "Outcome review material",
    materialFields: [
      { key: "pm_summary", label: "Portfolio manager summary" },
      { key: "narrative", label: "Outcome narrative" },
      { key: "evidence_gaps", label: "Evidence gaps" },
      { key: "outcome_review_narrative_status", label: "Review posture" },
      { key: "state", label: "Review posture" },
      { key: "scope", label: "Permitted scope" },
    ],
  },
  "pm-quality-summary": {
    scopeLabel: "Portfolio-manager quality support summary",
    packId: "pm_quality_summary.pack",
    workflowSurface: "dpm-pm-quality-ai-evidence",
    sourceInputField: "score_run",
    sourceIdentityField: "score_run_id",
    materialTitle: "Portfolio-manager quality material",
    materialFields: [
      { key: "score_run_summary", label: "Quality summary" },
      { key: "summary", label: "Quality summary" },
      { key: "support_references", label: "Supporting references" },
      { key: "summary_status", label: "Review posture" },
      { key: "state", label: "Review posture" },
      { key: "scope", label: "Permitted scope" },
    ],
  },
} as const;

export type DpmAiWorkflowFamily = keyof typeof DPM_AI_WORKFLOW_PROFILES;
export type DpmAiWorkflowProfile =
  (typeof DPM_AI_WORKFLOW_PROFILES)[DpmAiWorkflowFamily];

export function getDpmAiWorkflowProfile(family: DpmAiWorkflowFamily) {
  return DPM_AI_WORKFLOW_PROFILES[family];
}
