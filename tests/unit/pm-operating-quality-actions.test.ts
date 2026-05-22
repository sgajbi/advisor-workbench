import { describe, expect, it } from "vitest";

import {
  buildPmQualityActionError,
  buildPmQualityBlockedActionError,
  buildPmQualityFairnessCreateEvidence,
  buildPmQualityReviewActionEvidence,
  buildPmQualitySummaryInvocationEvidence,
  readPmQualityFairnessAnalysisId,
  readPmQualityReviewActionId,
  readPmQualitySummaryInvocationId,
} from "../../src/features/workbench/pm-operating-quality-actions";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const response: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-pmq-fairness-create",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    blocked_actions: [],
    fairness_analysis_id: "pmq_fair_supportability",
  },
  data: {
    fairness_analysis: {
      fairness_analysis_id: "pmq_fair_payload",
      content_hash: "sha256:pm-quality",
    },
  },
};

const summaryInvocationResponse: DpmPmOperatingQualityGatewayResponse = {
  ...response,
  correlation_id: "corr-pmq-summary-create",
  supportability: {
    ...response.supportability,
    summary_invocation_id: "pmq_summary_supportability",
  },
  data: {
    summary_invocation: {
      summary_invocation_id: "pmq_summary_payload",
      summary_content_hash: "sha256:summary-invocation",
      generated_summary_text: "Raw summary text must not enter evidence.",
      prompt_body: "Raw prompt must not enter evidence.",
      model_response: "Raw model response must not enter evidence.",
    },
  },
};

const reviewActionResponse: DpmPmOperatingQualityGatewayResponse = {
  ...response,
  correlation_id: "corr-pmq-review-action-create",
  supportability: {
    ...response.supportability,
    review_action_id: "pmq_review_supportability",
  },
  data: {
    review_action: {
      review_action_id: "pmq_review_payload",
      bounded_review_rationale: "Bounded supervisory review evidence.",
      review_rationale: "Raw rationale must not enter evidence.",
      reviewer_notes: "Reviewer notes must not enter evidence.",
      client_contact_instruction: "Client instruction must not enter evidence.",
      order_instruction: "Order instruction must not enter evidence.",
      oms_claim: "OMS claim must not enter evidence.",
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityReviewAction",
          source_id: "pmq_review_payload",
        },
      ],
    },
  },
};

describe("PM operating quality action helpers", () => {
  it("classifies Gateway action failures into product-safe status classes", () => {
    expect(
      buildPmQualityActionError(
        new Error("Failed to fetch PM operating quality route (403)"),
        "fallback"
      )
    ).toEqual({
      body: "Failed to fetch PM operating quality route (403)",
      status: "403",
      statusClass: "permission blocked",
      source: "Gateway PM operating quality route",
    });

    expect(
      buildPmQualityActionError(
        new Error("Failed to fetch PM operating quality route (409)"),
        "fallback"
      ).statusClass
    ).toBe("business blocked");
    expect(
      buildPmQualityActionError(
        new Error("Failed to fetch PM operating quality route (503)"),
        "fallback"
      ).statusClass
    ).toBe("upstream unavailable");
  });

  it("builds blocked action posture from Manage supportability", () => {
    expect(buildPmQualityBlockedActionError("Blocked by Manage action register")).toEqual({
      body: "Blocked by Manage action register",
      status: "N/A",
      statusClass: "blocked",
      source: "Manage action register via Gateway supportability",
    });
  });

  it("prefers supportability fairness-analysis id and falls back to payload id", () => {
    expect(readPmQualityFairnessAnalysisId(response)).toBe("pmq_fair_supportability");
    expect(
      readPmQualityFairnessAnalysisId({
        ...response,
        supportability: {
          ...response.supportability,
          fairness_analysis_id: null,
        },
      })
    ).toBe("pmq_fair_payload");
  });

  it("builds persisted fairness create evidence without exposing payload hashes", () => {
    const evidence = buildPmQualityFairnessCreateEvidence(response);

    expect(evidence).toEqual({
      fairnessAnalysisId: "pmq_fair_supportability",
      correlationId: "corr-pmq-fairness-create",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(JSON.stringify(evidence)).not.toContain("sha256:pm-quality");
  });

  it("builds persisted review-action evidence without raw rationale or workflow claims", () => {
    expect(readPmQualityReviewActionId(reviewActionResponse)).toBe(
      "pmq_review_supportability"
    );
    expect(
      readPmQualityReviewActionId({
        ...reviewActionResponse,
        supportability: {
          ...reviewActionResponse.supportability,
          review_action_id: null,
        },
      })
    ).toBe("pmq_review_payload");

    const evidence = buildPmQualityReviewActionEvidence(reviewActionResponse);

    expect(evidence).toEqual({
      reviewActionId: "pmq_review_supportability",
      correlationId: "corr-pmq-review-action-create",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(JSON.stringify(evidence)).not.toContain("Bounded supervisory review");
    expect(JSON.stringify(evidence)).not.toContain("Raw rationale");
    expect(JSON.stringify(evidence)).not.toContain("Reviewer notes");
    expect(JSON.stringify(evidence)).not.toContain("Client instruction");
    expect(JSON.stringify(evidence)).not.toContain("Order instruction");
    expect(JSON.stringify(evidence)).not.toContain("OMS claim");
  });

  it("builds persisted summary-invocation evidence without generated text", () => {
    expect(readPmQualitySummaryInvocationId(summaryInvocationResponse)).toBe(
      "pmq_summary_supportability"
    );
    expect(
      readPmQualitySummaryInvocationId({
        ...summaryInvocationResponse,
        supportability: {
          ...summaryInvocationResponse.supportability,
          summary_invocation_id: null,
        },
      })
    ).toBe("pmq_summary_payload");

    const evidence = buildPmQualitySummaryInvocationEvidence(summaryInvocationResponse);

    expect(evidence).toEqual({
      summaryInvocationId: "pmq_summary_supportability",
      correlationId: "corr-pmq-summary-create",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(JSON.stringify(evidence)).not.toContain("Raw summary text");
    expect(JSON.stringify(evidence)).not.toContain("Raw prompt");
    expect(JSON.stringify(evidence)).not.toContain("Raw model response");
    expect(JSON.stringify(evidence)).not.toContain("sha256:summary-invocation");
  });
});
