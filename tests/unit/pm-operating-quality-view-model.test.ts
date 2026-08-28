import { describe, expect, it } from "vitest";

import {
  buildPmOperatingQualityPanelModel,
  resolvePmOperatingQualitySelection,
} from "../../src/features/workbench/pm-operating-quality-view-model";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "../../src/features/workbench/types";
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

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

const fairnessAnalyses: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-fairness-list",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    fairness_analysis_id: "pmq_fair_001",
    count: 1,
  },
  data: {
    fairness_analyses: [
      {
        fairness_analysis_id: "pmq_fair_001",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        state: "PENDING_REVIEW",
        as_of_date: "2026-05-13",
        observed_average_score_spread: "31.00",
        segment_count: 2,
        generated_by: "lotus-manage",
        reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
        source_refs: [
          {
            source_system: "lotus-manage",
            source_product: "PmOperatingQualityFairnessAnalysis",
            source_id: "pmq_fair_001",
          },
        ],
      },
    ],
  },
};

const reviewActions: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-review-actions",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    review_action_id: "pmq_review_001",
    count: 1,
  },
  data: {
    review_actions: [
      {
        review_action_id: "pmq_review_001",
        review_action_ref: "PMQ-RA-001",
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        action_type: "SUPERVISORY_REVIEW",
        action_state: "PENDING_REVIEW",
        actor_id: "supervisor_sg_1",
        as_of_date: "2026-05-13",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
        operating_boundaries: ["NO_CLIENT_COMMUNICATION", "NO_PM_RANKING"],
        source_refs: [
          {
            source_system: "lotus-manage",
            source_product: "PmOperatingQualityReviewAction",
            source_id: "pmq_review_001",
          },
        ],
      },
    ],
  },
};

const reviewActionDetail: DpmPmOperatingQualityGatewayResponse = {
  ...reviewActions,
  correlation_id: "corr-review-action-detail",
  data: {
    review_action: {
      review_action_id: "pmq_review_001",
      review_action_ref: "PMQ-RA-001",
      target_type: "FAIRNESS_ANALYSIS",
      target_ref: "pmq_fair_001",
      action_type: "SUPERVISORY_REVIEW",
      action_state: "PENDING_REVIEW",
      actor_id: "supervisor_sg_1",
      as_of_date: "2026-05-13",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      bounded_review_rationale:
        "Bounded supervisory review of source-owned fairness posture.",
      review_reason: "Gateway bounded supervisory review reason.",
      review_rationale: "raw rationale from Manage must not render",
      reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
      forbidden_uses: ["client_contact", "trade_approval", "oms_routing"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityReviewAction",
          source_id: "pmq_review_001",
        },
      ],
    },
  },
};

const summaryInvocations: DpmPmOperatingQualityGatewayResponse = {
  correlation_id: "corr-summary-invocations",
  contract_version: "v1",
  source_service: "lotus-manage",
  upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    score_run_id: "pmq_run_001",
    review_action_id: "pmq_review_001",
    summary_invocation_id: "pmq_summary_001",
    count: 1,
  },
  data: {
    summary_invocations: [
      {
        summary_invocation_id: "pmq_summary_001",
        summary_ref: "PMQ-SUMMARY-001",
        score_run_id: "pmq_run_001",
        review_action_id: "pmq_review_001",
        invocation_state: "PENDING_REVIEW",
        workflow_run_id: "wf_pmq_summary_001",
        summary_artifact_ref: "artifact://pmq-summary/001",
        summary_content_hash: "sha256:summary-invocation",
        requested_by: "supervisor_sg_1",
        as_of_date: "2026-05-13",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
        text_boundary: {
          generated_summary_text_stored: false,
          prompt_body_stored: false,
          model_response_stored: false,
          client_communication_projected: false,
          order_or_oms_projected: false,
        },
        source_refs: [
          {
            source_system: "lotus-manage",
            source_product: "PmOperatingQualitySummaryInvocation",
            source_id: "pmq_summary_001",
          },
        ],
      },
    ],
  },
};

const summaryInvocationDetail: DpmPmOperatingQualityGatewayResponse = {
  ...summaryInvocations,
  correlation_id: "corr-summary-invocation-detail",
  data: {
    summary_invocation: {
      summary_invocation_id: "pmq_summary_001",
      summary_ref: "PMQ-SUMMARY-001",
      score_run_id: "pmq_run_001",
      review_action_id: "pmq_review_001",
      invocation_state: "PENDING_REVIEW",
      workflow_pack_name: "pm-operating-quality-summary",
      workflow_pack_version: "2026.05",
      workflow_run_id: "wf_pmq_summary_001",
      summary_artifact_ref: "artifact://pmq-summary/001",
      summary_content_hash: "sha256:summary-invocation",
      requested_by: "supervisor_sg_1",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
      generated_summary_text: "Raw generated PM summary narrative must stay hidden.",
      prompt_body: "Prompt body must stay hidden.",
      model_response: "Model response must stay hidden.",
      pm_ranking_claim: "PM ranking must stay hidden.",
      client_contact_instruction: "Contact the client about this summary.",
      order_instruction: "Generate an OMS order.",
      text_boundary: {
        generated_summary_text_stored: false,
        prompt_body_stored: false,
        model_response_stored: false,
        client_communication_projected: false,
        order_or_oms_projected: false,
      },
      forbidden_uses: ["client_contact", "order_generation", "oms_routing"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualitySummaryInvocation",
          source_id: "pmq_summary_001",
        },
      ],
    },
  },
};

const summary: DpmPmOperatingQualitySummaryResponse = {
  correlation_id: "corr-summary",
  contract_version: "v1",
  source_service: "lotus-ai",
  evidence_source_service: "lotus-manage",
  manage_upstream_status: 200,
  ai_upstream_status: 200,
  supportability: {
    source_service: "lotus-manage",
    authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
    state: "READY",
    reason_codes: ["PM_QUALITY_READY"],
    blocked_actions: [],
    policy_id: "pmq_sg_dpm",
    policy_version: "2026.05",
    score_run_id: "pmq_run_001",
  },
  score_run: {
    score_run_id: "pmq_run_001",
    content_hash: "sha256:pm-quality",
  },
  summary_request: {
    requested_outputs: ["score_run_summary", "governance_summary"],
    audience: ["portfolio_manager", "investment_control"],
  },
  data: buildDpmAiWorkflowExecution("pm-quality-summary", {
    runId: "packrun_pmq_1",
    structuredOutput: { summary_status: "REVIEW_REQUIRED" },
  }),
};

describe("PM operating quality view model", () => {
  it("preserves explicit record selections across reorder and falls back on removal", () => {
    const first = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessAnalyses,
      reviewActions,
    });
    const secondScoreRun = {
      ...first.scoreRunRows[0],
      key: "pmq_run_002-1",
      scoreRunId: "pmq_run_002",
    };
    const secondFairnessAnalysis = {
      ...first.fairnessAnalysisRows[0],
      key: "pmq_fair_002-1",
      fairnessAnalysisId: "pmq_fair_002",
    };
    const secondReviewAction = {
      ...first.reviewActionRows[0],
      key: "pmq_review_002-1",
      reviewActionId: "pmq_review_002",
    };

    expect(
      resolvePmOperatingQualitySelection({
        scoreRunRows: [secondScoreRun, ...first.scoreRunRows],
        fairnessAnalysisRows: [secondFairnessAnalysis, ...first.fairnessAnalysisRows],
        reviewActionRows: [secondReviewAction, ...first.reviewActionRows],
        preferredSelection: {
          scoreRunId: "pmq_run_001",
          fairnessAnalysisId: "pmq_fair_001",
          reviewActionId: "pmq_review_001",
        },
      })
    ).toEqual({
      scoreRunId: "pmq_run_001",
      fairnessAnalysisId: "pmq_fair_001",
      reviewActionId: "pmq_review_001",
    });

    expect(
      resolvePmOperatingQualitySelection({
        scoreRunRows: [secondScoreRun],
        fairnessAnalysisRows: [secondFairnessAnalysis],
        reviewActionRows: [secondReviewAction],
        preferredSelection: {
          scoreRunId: "pmq_run_001",
          fairnessAnalysisId: "pmq_fair_001",
          reviewActionId: "pmq_review_001",
        },
      })
    ).toEqual({
      scoreRunId: "pmq_run_002",
      fairnessAnalysisId: "pmq_fair_002",
      reviewActionId: "pmq_review_002",
    });
  });

  it("projects only the explicitly selected PM quality records", () => {
    const secondScoreRun = {
      ...(scoreRuns.data.score_runs as Array<Record<string, unknown>>)[0],
      score_run_id: "pmq_run_002",
      pm_id: "PM_SG_002",
      book_id: "PM_BOOK_SG_INCOME",
      as_of_date: "2026-05-14",
    };
    const secondFairnessAnalysis = {
      ...(fairnessAnalyses.data.fairness_analyses as Array<Record<string, unknown>>)[0],
      fairness_analysis_id: "pmq_fair_002",
      as_of_date: "2026-05-14",
      observed_average_score_spread: "12.00",
    };
    const secondReviewAction = {
      ...(reviewActions.data.review_actions as Array<Record<string, unknown>>)[0],
      review_action_id: "pmq_review_002",
      review_action_ref: "PMQ-RA-002",
      target_id: "pmq_run_002",
      as_of_date: "2026-05-14",
    };
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns: {
        ...scoreRuns,
        data: { ...scoreRuns.data, score_runs: [secondScoreRun, ...(scoreRuns.data.score_runs as unknown[])] },
      },
      fairnessAnalyses: {
        ...fairnessAnalyses,
        data: {
          fairness_analyses: [
            secondFairnessAnalysis,
            ...(fairnessAnalyses.data.fairness_analyses as unknown[]),
          ],
        },
      },
      fairnessAnalysisDetail: fairnessPreview,
      reviewActions: {
        ...reviewActions,
        data: {
          review_actions: [
            secondReviewAction,
            ...(reviewActions.data.review_actions as unknown[]),
          ],
        },
      },
      reviewActionDetail,
      summary,
      selection: {
        scoreRunId: "pmq_run_002",
        fairnessAnalysisId: "pmq_fair_002",
        reviewActionId: "pmq_review_002",
      },
    });

    expect(model.selectedScoreRun).toMatchObject({
      scoreRunId: "pmq_run_002",
      pmId: "PM_SG_002",
      asOfDate: "2026-05-14",
    });
    expect(model.selectedFairnessAnalysis).toMatchObject({
      fairnessAnalysisId: "pmq_fair_002",
      observedSpread: "12.00",
    });
    expect(model.selectedReviewAction).toMatchObject({
      reviewActionId: "pmq_review_002",
      reviewActionRef: "PMQ-RA-002",
    });
    expect(model.scoreRunId).toBe("pmq_run_002");
    expect(model.fairnessAnalysisId).toBe("pmq_fair_002");
    expect(model.fairnessDetail.asOfDate).toBe("2026-05-14");
    expect(model.reviewActionDetail).toMatchObject({
      reviewActionId: "pmq_review_002",
      reviewActionRef: "PMQ-RA-002",
      asOfDate: "2026-05-14",
    });
    expect(model.summaryPosture.status).toBe("Not requested");
  });

  it("retains persisted source records until refreshed canonical lists supersede them", () => {
    const existingFairness = (
      fairnessAnalyses.data.fairness_analyses as Array<Record<string, unknown>>
    )[0];
    const retainedFairnessRecord = {
      ...existingFairness,
      fairness_analysis_id: "pmq_fair_002",
      as_of_date: "2026-05-14",
    };
    const retainedFairnessAnalysis = {
      ...fairnessAnalyses,
      correlation_id: "corr-fairness-create-002",
      data: { fairness_analysis: retainedFairnessRecord },
    };
    const anotherRetainedFairnessRecord = {
      ...retainedFairnessRecord,
      fairness_analysis_id: "pmq_fair_003",
      as_of_date: "2026-05-15",
    };
    const anotherRetainedFairnessAnalysis = {
      ...retainedFairnessAnalysis,
      correlation_id: "corr-fairness-create-003",
      data: { fairness_analysis: anotherRetainedFairnessRecord },
    };
    const existingReviewAction = (
      reviewActions.data.review_actions as Array<Record<string, unknown>>
    )[0];
    const retainedReviewActionRecord = {
      ...existingReviewAction,
      review_action_id: "pmq_review_002",
      review_action_ref: "PMQ-RA-002",
      as_of_date: "2026-05-14",
    };
    const retainedReviewAction = {
      ...reviewActions,
      correlation_id: "corr-review-action-create-002",
      data: { review_action: retainedReviewActionRecord },
    };
    const anotherRetainedReviewActionRecord = {
      ...retainedReviewActionRecord,
      review_action_id: "pmq_review_003",
      review_action_ref: "PMQ-RA-003",
      as_of_date: "2026-05-15",
    };
    const anotherRetainedReviewAction = {
      ...retainedReviewAction,
      correlation_id: "corr-review-action-create-003",
      data: { review_action: anotherRetainedReviewActionRecord },
    };

    const retainedModel = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessAnalyses,
      retainedFairnessAnalyses: [
        retainedFairnessAnalysis,
        anotherRetainedFairnessAnalysis,
      ],
      reviewActions,
      retainedReviewActions: [retainedReviewAction, anotherRetainedReviewAction],
      selection: {
        fairnessAnalysisId: "pmq_fair_003",
        reviewActionId: "pmq_review_003",
      },
    });

    expect(retainedModel.fairnessAnalysisRows.map((row) => row.fairnessAnalysisId)).toEqual([
      "pmq_fair_001",
      "pmq_fair_002",
      "pmq_fair_003",
    ]);
    expect(retainedModel.reviewActionRows.map((row) => row.reviewActionId)).toEqual([
      "pmq_review_001",
      "pmq_review_002",
      "pmq_review_003",
    ]);
    expect(retainedModel.fairnessDetail.asOfDate).toBe("2026-05-15");
    expect(retainedModel.reviewActionDetail.reviewActionRef).toBe("PMQ-RA-003");

    const refreshedFairnessRecord = {
      ...retainedFairnessRecord,
      as_of_date: "2026-05-15",
    };
    const refreshedReviewActionRecord = {
      ...retainedReviewActionRecord,
      review_action_ref: "PMQ-RA-002-CANONICAL",
      as_of_date: "2026-05-15",
    };
    const refreshedModel = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessAnalyses: {
        ...fairnessAnalyses,
        data: {
          fairness_analyses: [
            existingFairness,
            refreshedFairnessRecord,
            anotherRetainedFairnessRecord,
          ],
        },
      },
      retainedFairnessAnalyses: [
        retainedFairnessAnalysis,
        anotherRetainedFairnessAnalysis,
      ],
      reviewActions: {
        ...reviewActions,
        data: {
          review_actions: [
            existingReviewAction,
            refreshedReviewActionRecord,
            anotherRetainedReviewActionRecord,
          ],
        },
      },
      retainedReviewActions: [retainedReviewAction, anotherRetainedReviewAction],
      selection: {
        fairnessAnalysisId: "pmq_fair_001",
        reviewActionId: "pmq_review_001",
      },
    });

    expect(refreshedModel.fairnessAnalysisRows).toHaveLength(3);
    expect(refreshedModel.reviewActionRows).toHaveLength(3);
    expect(
      refreshedModel.fairnessAnalysisRows.find(
        (row) => row.fairnessAnalysisId === "pmq_fair_002",
      )?.asOfDate,
    ).toBe("2026-05-15");
    expect(
      refreshedModel.reviewActionRows.find(
        (row) => row.reviewActionId === "pmq_review_002",
      )?.reviewActionRef,
    ).toBe("PMQ-RA-002-CANONICAL");
  });

  it("preserves Manage PM quality policy, score-run, and source-defined segment posture", () => {
    const model = buildPmOperatingQualityPanelModel({ policies, scoreRuns });

    expect(model.state).toBe("ready");
    expect(model.policyId).toBe("pmq_sg_dpm");
    expect(model.policyRows).toHaveLength(1);
    expect(model.scoreRunRows).toHaveLength(1);
    expect(model.scoreRunRows[0].score).toBe("90.00");
    expect(model.scoreRunRows[0].sourceRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityScoreRun | ID: pmq_run_001"
    );
    expect(model.scoreRunRows[0].forbiddenUses).toBe(
      "Protected Class Inference (protected_class_inference), Autonomous PM Ranking (autonomous_pm_ranking)"
    );
    expect(model.scoreRunPreviewReadinessState).toBe("READY");
    expect(model.scoreRunPreviewReadiness).toBe("Ready for policy pmq_sg_dpm / 2026.05");
    expect(model.summaryRequestReadinessState).toBe("READY");
    expect(model.summaryRequestReadiness).toBe("Ready for score run pmq_run_001");
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
        segmentType: "Mandate type",
        sourceRefs: "System: lotus-core | Product: MandateTypeSegment",
      })
    );
    expect(model.forbiddenUsePosture).toContain(
      "Protected Class Inference (protected_class_inference)"
    );
  });

  it("renders governed PM quality summary posture without exposing score-run hashes", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      summary,
    });

    expect(model.operationEvidence).toEqual({
      operation: "PM quality support summary",
      correlationId: "corr-summary",
      contractVersion: "v1",
      sourceService: "lotus-ai",
      upstreamStatus: "200",
    });
    expect(model.summaryPosture).toEqual({
      status: "COMPLETED",
      reviewState: "REVIEW_REQUIRED",
      workflowAuthority: "lotus-manage",
      runId: "packrun_pmq_1",
      requestedOutputs: "score_run_summary, governance_summary",
      audience: "portfolio_manager, investment_control",
      evidenceSource: "lotus-manage",
      supportability: "Review required",
      boundary:
        "Support-only, review-required summary from Gateway and lotus-ai; not approval, ranking, HR, compensation, conduct, client-contact, execution, or OMS evidence.",
    });
    expect(JSON.stringify(model.summaryPosture)).not.toContain("sha256:pm-quality");
  });

  it("fails closed before projecting posture for another score run", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      summary: {
        ...summary,
        score_run: { score_run_id: "pmq_run_other" },
      },
    });

    expect(model.operationEvidence.operation).not.toBe("PM quality support summary");
    expect(model.summaryPosture).toMatchObject({
      status: "Not requested",
      reviewState: "N/A",
      workflowAuthority: "N/A",
      runId: "N/A",
    });
  });

  it("renders persisted fairness-analysis list posture without browser-side fairness calculation", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessAnalyses,
    });

    expect(model.state).toBe("partial");
    expect(model.fairnessAnalysisId).toBe("pmq_fair_001");
    expect(model.fairnessAnalysisRows).toHaveLength(1);
    expect(model.fairnessAnalysisRows[0]).toEqual(
      expect.objectContaining({
        fairnessAnalysisId: "pmq_fair_001",
        policy: "pmq_sg_dpm / 2026.05",
        state: "PENDING_REVIEW",
        observedSpread: "31.00",
        segmentCount: "2",
        generatedBy: "lotus-manage",
      })
    );
    expect(model.fairnessAnalysisRows[0].sourceRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityFairnessAnalysis | ID: pmq_fair_001"
    );
    expect(model.operationEvidence).toEqual({
      operation: "Fairness analysis list load",
      correlationId: "corr-fairness-list",
      contractVersion: "v1",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(model.reasonCodes).toContain("PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED");
  });

  it("keeps populated source evidence ready when summary text is intentionally absent", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      summaryInvocations: {
        ...summaryInvocations,
        supportability: {
          ...summaryInvocations.supportability,
          state: "UNKNOWN",
          reason_codes: ["PM_QUALITY_SUMMARY_HISTORY_NO_TEXT_STORED"],
        },
      },
      summaryInvocationDetail: {
        ...summaryInvocationDetail,
        supportability: {
          ...summaryInvocationDetail.supportability,
          state: "EMPTY",
          reason_codes: ["PM_QUALITY_SUMMARY_HISTORY_NO_TEXT_STORED"],
        },
      },
    });

    expect(model.state).toBe("ready");
    expect(model.supportabilityState).toBe("READY");
    expect(model.scoreRunId).toBe("pmq_run_001");
    expect(model.summaryInvocationId).toBe("pmq_summary_001");
  });

  it("renders Manage-owned review-action ledger and detail without workflow claims", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      reviewActions,
      reviewActionDetail,
    });

    expect(model.reviewActionRows).toHaveLength(1);
    expect(model.selectedReviewAction).toEqual(
      expect.objectContaining({
        reviewActionId: "pmq_review_001",
        reviewActionRef: "PMQ-RA-001",
        target: "Fairness Analysis / pmq_fair_001",
        actionType: "Supervisory Review",
        actionState: "PENDING_REVIEW",
      })
    );
    expect(model.reviewActionDetail).toEqual(
      expect.objectContaining({
        reviewActionId: "pmq_review_001",
        reviewActionRef: "PMQ-RA-001",
        target: "Fairness Analysis / pmq_fair_001",
        rationale: "Bounded supervisory review of source-owned fairness posture.",
        operatingBoundaries:
          "Client Contact (client_contact), Trade Approval (trade_approval), OMS Routing (oms_routing)",
      })
    );
    expect(model.operationEvidence).toEqual({
      operation: "Review-action detail load",
      correlationId: "corr-review-action-detail",
      contractVersion: "v1",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(JSON.stringify(model)).not.toContain("sha256:");
    expect(JSON.stringify(model)).not.toContain("raw rationale from Manage");
    expect(JSON.stringify(model)).not.toContain("client approval");
  });

  it("renders persisted summary-invocation history without exposing generated text or prompts", () => {
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      summaryInvocations,
      summaryInvocationDetail,
    });

    expect(model.summaryInvocationId).toBe("pmq_summary_001");
    expect(model.summaryInvocationRows).toHaveLength(1);
    expect(model.summaryInvocationRows[0]).toEqual(
      expect.objectContaining({
        summaryInvocationId: "pmq_summary_001",
        summaryRef: "PMQ-SUMMARY-001",
        scoreRunId: "pmq_run_001",
        reviewActionId: "pmq_review_001",
        workflowRunId: "wf_pmq_summary_001",
        artifactRef: "artifact://pmq-summary/001",
        contentHash: "sha256:summary-invocation",
      })
    );
    expect(model.summaryInvocationDetail).toEqual(
      expect.objectContaining({
        summaryInvocationId: "pmq_summary_001",
        summaryRef: "PMQ-SUMMARY-001",
        workflowPack: "pm-operating-quality-summary / 2026.05",
        workflowRunId: "wf_pmq_summary_001",
        contentHash: "sha256:summary-invocation",
      })
    );
    expect(model.summaryInvocationDetail.textBoundary).toContain("Generated text stored: No");
    expect(model.summaryInvocationDetail.operatingBoundaries).toContain("Client Contact");
    expect(model.operationEvidence).toEqual({
      operation: "Summary invocation detail load",
      correlationId: "corr-summary-invocation-detail",
      contractVersion: "v1",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    const rendered = JSON.stringify(model);
    expect(rendered).not.toContain("Raw generated PM summary narrative");
    expect(rendered).not.toContain("Prompt body must stay hidden");
    expect(rendered).not.toContain("Model response must stay hidden");
    expect(rendered).not.toContain("PM ranking must stay hidden");
    expect(rendered).not.toContain("Contact the client");
    expect(rendered).not.toContain("Generate an OMS order");
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
        generatedAt: "13 May 2026, 09:40 UTC",
        generatedBy: "lotus-manage",
        sourceRefs: "System: lotus-manage | Product: PmOperatingQualityScoreRun | ID: pmq_run_001",
      })
    );
    expect(model.fairnessDetail.forbiddenUses).toContain(
      "Protected Class Inference (protected_class_inference)"
    );
    expect(model.operationEvidence).toEqual({
      operation: "Fairness analysis preview",
      correlationId: "corr-fairness",
      contractVersion: "v1",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(model.blockedActions).toEqual(["CREATE_SCORE_RUN"]);
    expect(model.blockedActionPosture).toBe("Create Score Run (CREATE_SCORE_RUN; lotus-manage)");
    expect(model.fairnessSegmentRows.map((row) => row.segment)).toEqual([
      "Balanced DPM Mandates",
      "Income DPM Mandates",
    ]);
    expect(model.fairnessSegmentRows[0].segmentType).toBe("Mandate type");
    expect(model.fairnessSegmentRows[0].sourceRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityScoreRun | ID: pmq_run_001"
    );
    expect(model.fairnessSegmentRows[0].scoreRunRefs).toBe(
      "System: lotus-manage | Product: PmOperatingQualityScoreRun | ID: pmq_run_001"
    );
    expect(model.fairnessSegmentRows[0].minimumScore).toBe("89.00");
    expect(model.fairnessSegmentRows[0].maximumScore).toBe("91.00");
    expect(model.reasonCodes).toContain("PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED");
  });

  it("fails closed when fairness generation time lacks source timezone evidence", () => {
    const sourceData = fairnessPreview.data as Record<string, unknown>;
    const sourceFairnessAnalysis = sourceData.fairness_analysis as Record<string, unknown>;
    const model = buildPmOperatingQualityPanelModel({
      policies,
      scoreRuns,
      fairnessPreview: {
        ...fairnessPreview,
        data: {
          ...sourceData,
          fairness_analysis: {
            ...sourceFairnessAnalysis,
            generated_at: "2026-05-13T09:40:00",
          },
        },
      },
    });

    expect(model.fairnessDetail.generatedAt).toBe("Not reported");
    expect(JSON.stringify(model.fairnessDetail)).not.toContain("2026-05-13T09:40:00");
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
    expect(model.blockedActionPosture).toBe(
      "Preview Fairness Analysis (PREVIEW_FAIRNESS_ANALYSIS; lotus-manage)"
    );
    expect(model.scoreRunPreviewReadinessState).toBe("READY");
  });
});
