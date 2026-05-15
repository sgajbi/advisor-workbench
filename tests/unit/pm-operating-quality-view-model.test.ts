import { describe, expect, it } from "vitest";

import { buildPmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";
import type { DpmPmOperatingQualityGatewayResponse } from "../../src/features/workbench/types";

const policies: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-policy",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 1,
  },
  data: {
    policies: [
      {
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        enabled: true,
        state: "READY",
        as_of_date: "2026-05-13",
        reason_codes: ["PM_QUALITY_POLICY_APPROVED"],
      },
    ],
  },
};

const scoreRuns: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-score",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    count: 2,
  },
  data: {
    score_runs: [
      {
        score_run_id: "pmq_run_001",
        pm_id: "PM_SG_001",
        book_id: "PM_BOOK_SG_BALANCED",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        state: "READY",
        score: "90.00",
        reason_codes: ["PM_QUALITY_READY"],
        forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
        source_refs: [
          {
            source_system: "lotus-manage",
            source_product: "PmOperatingQualityScoreRun",
            source_id: "pmq_run_001",
          },
        ],
      },
    ],
    fairness_segments: [
      {
        segment_id: "mandate_balanced",
        segment_type: "MANDATE_TYPE",
        display_name: "Balanced DPM Mandates",
        score_run_ids: ["pmq_run_001"],
        source_refs: [{ source_system: "lotus-core", source_type: "MandateTypeSegment" }],
      },
      {
        segment_id: "mandate_income",
        segment_type: "MANDATE_TYPE",
        display_name: "Income DPM Mandates",
        score_run_ids: ["pmq_run_002"],
      },
    ],
  },
};

const fairnessPreview: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-fairness",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    blocked_actions: ["CREATE_SCORE_RUN"],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    fairness_analysis_id: "pmq_fair_001",
  },
  data: {
    fairness_analysis: {
      product_name: "PmOperatingQualityFairnessAnalysis",
      product_version: "v1",
      fairness_analysis_id: "pmq_fair_001",
      state: "PENDING_REVIEW",
      as_of_date: "2026-05-13",
      minimum_segment_score_run_count: 2,
      maximum_average_score_spread: "15.00",
      observed_average_score_spread: "31.00",
      generated_at: "2026-05-13T09:40:00Z",
      generated_by: "lotus-manage",
      forbidden_uses: [
        "protected_class_inference",
        "compensation_decision",
        "hr_decision",
        "conduct_enforcement",
        "autonomous_pm_ranking",
      ],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityScoreRun",
          source_id: "pmq_run_001",
        },
      ],
      reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
      segment_results: [
        {
          segment_id: "mandate_balanced",
          segment_type: "MANDATE_TYPE",
          display_name: "Balanced DPM Mandates",
          state: "READY",
          score_run_count: 2,
          average_score: "90.00",
          minimum_score: "89.00",
          maximum_score: "91.00",
          score_run_refs: [
            {
              source_system: "lotus-manage",
              source_product: "PmOperatingQualityScoreRun",
              source_id: "pmq_run_001",
            },
          ],
          source_refs: [
            {
              source_system: "lotus-manage",
              source_product: "PmOperatingQualityScoreRun",
              source_id: "pmq_run_001",
            },
          ],
          reason_codes: ["PM_QUALITY_SEGMENT_READY"],
        },
        {
          segment_id: "mandate_income",
          segment_type: "MANDATE_TYPE",
          display_name: "Income DPM Mandates",
          state: "REVIEW_REQUIRED",
          score_run_count: 2,
          average_score: "59.00",
          reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
        },
      ],
    },
  },
};

describe("PM operating quality view model", () => {
  it("preserves Manage PM quality policy, score-run, and source-defined segment posture", () => {
    const model = buildPmOperatingQualityPanelModel({ policies, scoreRuns });

    expect(model.state).toBe("ready");
    expect(model.policyId).toBe("pmq_sg_dpm");
    expect(model.policyRows).toHaveLength(1);
    expect(model.scoreRunRows).toHaveLength(1);
    expect(model.scoreRunRows[0].score).toBe("90.00");
    expect(model.scoreRunRows[0].sourceRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityScoreRun | Id: pmq_run_001"
    );
    expect(model.scoreRunRows[0].forbiddenUses).toBe(
      "protected class inference, autonomous pm ranking"
    );
    expect(model.scoreRunPreviewReadinessState).toBe("READY");
    expect(model.scoreRunPreviewReadiness).toBe("Ready for policy pmq_sg_dpm / 2026.05");
    expect(model.operationEvidence).toEqual({
      operation: "Score-run evidence load",
      correlationId: "corr-score",
      contractVersion: "v1",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(model.fairnessSegmentRequests.map((segment) => segment.segment_id)).toEqual([
      "mandate_balanced",
      "mandate_income",
    ]);
    expect(model.fairnessPreviewReadinessState).toBe("READY");
    expect(model.fairnessPreviewReadiness).toBe("Ready: 2 source-defined segments from Manage");
    expect(model.sourceSegmentRows[0]).toEqual(
      expect.objectContaining({
        segment: "Balanced DPM Mandates",
        sourceRefs: "System: lotus-core | Product: MandateTypeSegment",
      })
    );
    expect(model.forbiddenUsePosture).toContain("protected class inference");
  });

  it("renders fairness preview as review-required evidence without client-side analysis", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessPreview,
    });

    expect(model.state).toBe("partial");
    expect(model.supportabilityState).toBe("PENDING_REVIEW");
    expect(model.fairnessAnalysisId).toBe("pmq_fair_001");
    expect(model.fairnessState).toBe("PENDING_REVIEW");
    expect(model.fairnessSpread).toBe("31.00");
    expect(model.fairnessDetail).toEqual(
      expect.objectContaining({
        product: "PmOperatingQualityFairnessAnalysis / v1",
        asOfDate: "2026-05-13",
        minimumSegmentScoreRunCount: "2",
        maximumAverageScoreSpread: "15.00",
        observedAverageScoreSpread: "31.00",
        generatedBy: "lotus-manage",
        sourceRefs: "System: lotus-manage | Product: PmOperatingQualityScoreRun | Id: pmq_run_001",
      })
    );
    expect(model.fairnessDetail.forbiddenUses).toContain("protected class inference");
    expect(model.operationEvidence).toEqual({
      operation: "Fairness analysis preview",
      correlationId: "corr-fairness",
      contractVersion: "v1",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(model.blockedActions).toEqual(["CREATE_SCORE_RUN"]);
    expect(model.blockedActionPosture).toBe("CREATE_SCORE_RUN (lotus-manage)");
    expect(model.fairnessSegmentRows.map((row) => row.segment)).toEqual([
      "Balanced DPM Mandates",
      "Income DPM Mandates",
    ]);
    expect(model.fairnessSegmentRows[0].sourceRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityScoreRun | Id: pmq_run_001"
    );
    expect(model.fairnessSegmentRows[0].scoreRunRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityScoreRun | Id: pmq_run_001"
    );
    expect(model.fairnessSegmentRows[0].minimumScore).toBe("89.00");
    expect(model.fairnessSegmentRows[0].maximumScore).toBe("91.00");
    expect(model.reasonCodes).toContain("PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED");
  });

  it("blocks fairness preview readiness when Manage returns too few source-defined segments", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns: {
        ...scoreRuns,
        data: {
          ...scoreRuns.data,
          fairness_segments: [
            {
              segment_id: "mandate_balanced",
              segment_type: "MANDATE_TYPE",
              display_name: "Balanced DPM Mandates",
              score_run_ids: ["pmq_run_001"],
            },
          ],
        },
      },
    });

    expect(model.fairnessPreviewReadinessState).toBe("BLOCKED");
    expect(model.fairnessPreviewReadiness).toBe(
      "Blocked: 1 source-defined segment returned"
    );
  });

  it("blocks score-run preview readiness when Manage does not return policy context", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies: {
        ...policies,
        supportability: {
          ...policies.supportability,
          policy_id: null,
          policy_version: null,
        },
        data: { policies: [] },
      },
      scoreRuns: {
        ...scoreRuns,
        supportability: {
          ...scoreRuns.supportability,
          policy_id: null,
          policy_version: null,
        },
        data: { score_runs: [] },
      },
    });

    expect(model.scoreRunPreviewReadinessState).toBe("BLOCKED");
    expect(model.scoreRunPreviewReadiness).toBe(
      "Blocked until Manage returns policy id and version"
    );
  });

  it("preserves Manage action-register fairness preview blocks", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns: {
        ...scoreRuns,
        supportability: {
          ...scoreRuns.supportability,
          state: "BLOCKED",
          blocked_actions: ["PREVIEW_FAIRNESS_ANALYSIS"],
        },
      },
    });

    expect(model.state).toBe("blocked");
    expect(model.fairnessPreviewReadinessState).toBe("BLOCKED");
    expect(model.fairnessPreviewReadiness).toBe("Blocked by Manage action register");
    expect(model.blockedActionPosture).toBe("PREVIEW_FAIRNESS_ANALYSIS (lotus-manage)");
    expect(model.scoreRunPreviewReadinessState).toBe("READY");
  });
});
