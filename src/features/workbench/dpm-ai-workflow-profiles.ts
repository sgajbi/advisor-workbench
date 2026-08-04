export const DPM_AI_WORKFLOW_PROFILES = {
  "proof-pack-memo": {
    scopeLabel: "Portfolio decision memo",
    packId: "dpm_pm_memo.pack",
    workflowSurface: "dpm-proof-pack-ai-evidence",
  },
  "wave-memo": {
    scopeLabel: "Rebalance wave review memo",
    packId: "dpm_wave_pm_memo.pack",
    workflowSurface: "dpm-wave-ai-evidence",
  },
  "operations-handoff": {
    scopeLabel: "Operations handoff summary",
    packId: "dpm_operations_handoff_summary.pack",
    workflowSurface: "dpm-operations-handoff-ai-evidence",
  },
  "exception-summary": {
    scopeLabel: "Mandate exception review summary",
    packId: "dpm_exception_summary.pack",
    workflowSurface: "dpm-exception-summary-ai-evidence",
  },
  "outcome-narrative": {
    scopeLabel: "Outcome review narrative",
    packId: "outcome_review_narrative.pack",
    workflowSurface: "dpm-outcome-review-ai-evidence",
  },
  "pm-quality-summary": {
    scopeLabel: "Portfolio-manager quality support summary",
    packId: "pm_quality_summary.pack",
    workflowSurface: "dpm-pm-quality-ai-evidence",
  },
} as const;

export type DpmAiWorkflowFamily = keyof typeof DPM_AI_WORKFLOW_PROFILES;
export type DpmAiWorkflowProfile =
  (typeof DPM_AI_WORKFLOW_PROFILES)[DpmAiWorkflowFamily];

export function getDpmAiWorkflowProfile(family: DpmAiWorkflowFamily) {
  return DPM_AI_WORKFLOW_PROFILES[family];
}
