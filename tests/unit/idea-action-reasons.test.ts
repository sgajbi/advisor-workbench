import { describe, expect, it } from "vitest";

import {
  ADVISOR_IDEA_REASON_CODES,
  buildIdeaActionReasonCodes,
  buildIdeaBusinessReasonOptions,
  isAdvisorIdeaReasonCode,
} from "../../src/features/proposals/idea-action-reasons";

describe("Idea advisor action reasons", () => {
  it("keeps the Workbench request vocabulary aligned to the governed Idea enum", () => {
    expect(new Set(ADVISOR_IDEA_REASON_CODES)).toEqual(
      new Set([
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
      ]),
    );
    expect(isAdvisorIdeaReasonCode("feedback_recorded")).toBe(true);
    expect(isAdvisorIdeaReasonCode("advisor_feedback")).toBe(false);
  });

  it("offers only source-supported candidate reasons in business language", () => {
    expect(
      buildIdeaBusinessReasonOptions([
        "high_cash_ratio",
        "advisor_feedback",
        "high_cash_ratio",
        "materiality_score",
      ]),
    ).toEqual([
      {
        value: "high_cash_ratio",
        label: "Cash balance requires review",
      },
    ]);
    expect(buildIdeaBusinessReasonOptions([])).toEqual([
      { value: "review_required", label: "Advisor review is required" },
    ]);
  });

  it("combines the business basis with the deterministic action audit reason", () => {
    expect(
      buildIdeaActionReasonCodes({
        basis: "review_required",
        kind: "review",
        reviewAction: "reject",
      }),
    ).toEqual(["review_rejected", "review_required"]);
    expect(
      buildIdeaActionReasonCodes({
        basis: "review_approved_for_conversion",
        kind: "conversion",
      }),
    ).toEqual(["review_approved_for_conversion"]);
  });
});
