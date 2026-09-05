export const ADVISOR_IDEA_REASON_CODES = [
  "high_cash_ratio",
  "cash_source_ready",
  "concentration_attention",
  "underperformance_attention",
  "allocation_drift_attention",
  "maturity_window",
  "income_attention",
  "volatility_attention",
  "drawdown_attention",
  "missing_benchmark",
  "missing_risk_profile",
  "suitability_context_missing",
  "mandate_restriction_review",
  "source_stale",
  "source_date_mismatch",
  "source_generated_after_evaluation",
  "source_partial",
  "duplicate_suppressed",
  "below_materiality",
  "review_required",
  "materiality_score",
  "urgency_score",
  "confidence_score",
  "evidence_quality_score",
  "freshness_score",
  "relevance_score",
  "downstream_fit_score",
  "conflict_penalty",
  "queue_priority",
  "queue_excluded",
  "review_approved_for_conversion",
  "review_rejected",
  "review_no_action",
  "review_suppressed",
  "review_snoozed",
  "review_escalated",
  "feedback_recorded",
  "entitlement_denied",
  "ai_redaction_applied",
  "ai_fallback_used",
  "ai_verifier_passed",
  "ai_unsupported_claim_blocked",
  "ai_forbidden_action_blocked",
  "ai_action_content_blocked",
] as const;

export type AdvisorIdeaReasonCode = (typeof ADVISOR_IDEA_REASON_CODES)[number];

export type AdvisorIdeaReviewAction =
  | "approve_for_conversion"
  | "reject"
  | "no_action"
  | "suppress"
  | "snooze"
  | "escalate_to_pm"
  | "escalate_to_compliance";

export type IdeaBusinessReasonOption = {
  value: AdvisorIdeaReasonCode;
  label: string;
};

const ADVISOR_DECISION_BASIS_LABELS: Partial<
  Record<AdvisorIdeaReasonCode, string>
> = {
  high_cash_ratio: "Cash balance requires review",
  cash_source_ready: "Cash evidence is ready",
  concentration_attention: "Concentration requires attention",
  underperformance_attention: "Performance requires attention",
  allocation_drift_attention: "Allocation drift requires attention",
  maturity_window: "A holding is approaching maturity",
  income_attention: "Income delivery requires attention",
  volatility_attention: "Portfolio volatility requires attention",
  drawdown_attention: "Drawdown requires attention",
  missing_benchmark: "Benchmark assignment is missing",
  missing_risk_profile: "Risk profile evidence is missing",
  suitability_context_missing: "Suitability context is incomplete",
  mandate_restriction_review: "Mandate restrictions require review",
  source_stale: "Source evidence is stale",
  source_date_mismatch: "Source dates are inconsistent",
  source_generated_after_evaluation: "Source evidence changed after evaluation",
  source_partial: "Source evidence is partial",
  duplicate_suppressed: "A duplicate candidate was suppressed",
  below_materiality: "The opportunity is below materiality",
  review_required: "Advisor review is required",
};

const reasonCodeSet = new Set<string>(ADVISOR_IDEA_REASON_CODES);
const decisionBasisCodeSet = new Set<string>(
  Object.keys(ADVISOR_DECISION_BASIS_LABELS),
);

const REVIEW_ACTION_REASON: Record<
  AdvisorIdeaReviewAction,
  AdvisorIdeaReasonCode
> = {
  approve_for_conversion: "review_approved_for_conversion",
  reject: "review_rejected",
  no_action: "review_no_action",
  suppress: "review_suppressed",
  snooze: "review_snoozed",
  escalate_to_pm: "review_escalated",
  escalate_to_compliance: "review_escalated",
};

export function isAdvisorIdeaReasonCode(
  value: string,
): value is AdvisorIdeaReasonCode {
  return reasonCodeSet.has(value);
}

export function buildIdeaBusinessReasonOptions(
  sourceReasonCodes: readonly string[],
): IdeaBusinessReasonOption[] {
  const seen = new Set<string>();
  const options = sourceReasonCodes.flatMap((value) => {
    if (
      seen.has(value) ||
      !decisionBasisCodeSet.has(value) ||
      !isAdvisorIdeaReasonCode(value)
    ) {
      return [];
    }
    seen.add(value);
    return [
      {
        value,
        label: ADVISOR_DECISION_BASIS_LABELS[value] ?? value,
      },
    ];
  });
  return options.length > 0
    ? options
    : [{ value: "review_required", label: "Advisor review is required" }];
}

export function ideaBusinessReasonLabel(
  reasonCodes: readonly AdvisorIdeaReasonCode[],
): string {
  for (const reasonCode of reasonCodes) {
    const label = ADVISOR_DECISION_BASIS_LABELS[reasonCode];
    if (label) {
      return label;
    }
  }
  return "Adviser review required";
}

export function buildIdeaActionReasonCodes({
  basis,
  kind,
  reviewAction,
}: {
  basis: AdvisorIdeaReasonCode;
  kind: "review" | "conversion";
  reviewAction?: AdvisorIdeaReviewAction;
}): AdvisorIdeaReasonCode[] {
  const actionReason =
    kind === "review"
      ? REVIEW_ACTION_REASON[reviewAction ?? "no_action"]
      : "review_approved_for_conversion";
  return actionReason === basis ? [actionReason] : [actionReason, basis];
}
