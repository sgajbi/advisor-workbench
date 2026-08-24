export const MANAGE_WORKFLOW_LABELS = {
  portfolioManagementDecisions: "Portfolio management decisions",
  mandateReview: "Mandate review",
  mandateHealth: "Mandate health",
  attentionItems: "Attention items",
  openAttentionItems: "Open attention items",
  sourceExceptions: "Source exceptions",
  needsAttention: "Needs attention",
  dataAvailability: "Data availability",
  mandateHealthDimensions: "Mandate health dimensions",
  asOfDate: "As-of date",
} as const;

export const MANAGE_HEALTH_DIMENSION_LABELS = {
  dataAvailability: MANAGE_WORKFLOW_LABELS.dataAvailability,
  allocationDrift: "Allocation drift",
  riskDrift: "Risk drift",
  cashLiquidity: "Cash liquidity",
  taxAndTurnover: "Tax and turnover",
  eligibilityRestrictions: "Eligibility restrictions",
  performanceReview: "Performance review",
  reviewReadiness: "Review readiness",
  reviewCadence: "Review cadence",
  modelFreshness: "Model freshness",
  mandateConstraints: "Mandate constraints",
} as const;

export const MANAGE_REBALANCE_LABELS = {
  campaignLaunchDecision: "Campaign launch decision",
  campaignLaunchHistory: "Campaign launch history",
  campaignLifecycleEvidence: "Campaign lifecycle evidence",
  previewReadiness: "Preview readiness",
  launchReadiness: "Launch readiness",
  asOfDate: "As-of date",
  previewAsOfDate: "Preview as-of date",
  reviewedBy: "Reviewed by",
  previewReviewedBy: "Preview reviewed by",
  rebalanceWave: "Rebalance wave",
  rebalanceWaveReference: "Rebalance wave reference",
  supportReference: "Support reference",
  replayKey: "Replay key",
} as const;
