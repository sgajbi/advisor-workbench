import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePmOperatingQualityActions } from "../../src/features/workbench/use-pm-operating-quality-actions";
import {
  buildDpmPmOperatingQualityReviewActionCorrelationId,
  buildDpmPmOperatingQualitySummaryInvocationCorrelationId,
  createDpmPmOperatingQualityFairnessAnalysis,
  createDpmPmOperatingQualityReviewAction,
  createDpmPmOperatingQualitySummaryInvocation,
  getDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityReviewAction,
  getDpmPmOperatingQualitySummaryInvocation,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityReviewAction,
  previewDpmPmOperatingQualityScoreRun,
  previewDpmPmOperatingQualitySummaryInvocation,
  requestDpmPmOperatingQualitySummary,
} from "../../src/features/workbench/pm-operating-quality-api";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/pm-operating-quality-api", () => ({
  buildDpmPmOperatingQualityReviewActionCorrelationId: vi.fn(
    () => "corr-workbench-pm-quality-review-action-test"
  ),
  buildDpmPmOperatingQualitySummaryInvocationCorrelationId: vi.fn(
    () => "corr-workbench-pm-quality-summary-invocation-test"
  ),
  createDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  createDpmPmOperatingQualityReviewAction: vi.fn(),
  createDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  getDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  getDpmPmOperatingQualityReviewAction: vi.fn(),
  getDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  previewDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  previewDpmPmOperatingQualityReviewAction: vi.fn(),
  previewDpmPmOperatingQualityScoreRun: vi.fn(),
  previewDpmPmOperatingQualitySummaryInvocation: vi.fn(),
  requestDpmPmOperatingQualitySummary: vi.fn(),
}));

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
        as_of_date: "2026-05-13",
        content_hash: "sha256:pm-quality",
        reason_codes: ["PM_QUALITY_READY"],
        forbidden_uses: ["protected_class_inference", "autonomous_pm_ranking"],
      },
    ],
    fairness_segments: [
      {
        segment_id: "mandate_balanced",
        segment_type: "MANDATE_TYPE",
        display_name: "Balanced DPM Mandates",
        score_run_ids: ["pmq_run_001"],
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

const fairnessAnalysisResponse: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-pmq-fairness-create",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_FAIRNESS_SPREAD_REVIEW_REQUIRED"],
    fairness_analysis_id: "pmq_fair_002",
  },
  data: {
    fairness_analysis: {
      fairness_analysis_id: "pmq_fair_002",
      state: "PENDING_REVIEW",
      as_of_date: "2026-05-13",
      observed_average_score_spread: "18.00",
      segment_results: [],
    },
  },
};

const reviewActionResponse: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-pmq-review-action-create",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
    review_action_id: "pmq_review_002",
  },
  data: {
    review_action: {
      review_action_id: "pmq_review_002",
      review_action_ref: "PMQ-REVIEW-pmq_run_001",
      target_type: "SCORE_RUN",
      target_id: "pmq_run_001",
      action_type: "REQUEST_EVIDENCE_REMEDIATION",
      action_state: "REVIEW_REQUIRED",
      actor_id: "workbench-pm-operating-quality-supervisor",
      as_of_date: "2026-05-13",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      bounded_review_rationale:
        "Bounded supervisory review for Manage-owned PM operating quality evidence.",
      review_rationale: "raw rationale from Manage must not render",
      reason_codes: ["PM_QUALITY_REVIEW_ACTION_READY"],
      source_refs: [
        {
          source_system: "lotus-manage",
          source_product: "PmOperatingQualityReviewAction",
          source_id: "pmq_review_002",
        },
      ],
    },
  },
};

const summaryInvocationResponse: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-pmq-summary-invocation-create",
  supportability: {
    ...scoreRuns.supportability,
    state: "PENDING_REVIEW",
    reason_codes: ["PM_QUALITY_SUMMARY_INVOCATION_READY"],
    summary_invocation_id: "pmq_summary_002",
    review_action_id: "pmq_review_002",
    score_run_id: "pmq_run_001",
  },
  data: {
    summary_invocation: {
      summary_invocation_id: "pmq_summary_002",
      summary_ref: "PMQ-SUMMARY-pmq_run_001",
      score_run_id: "pmq_run_001",
      review_action_id: "pmq_review_002",
      invocation_state: "PENDING_REVIEW",
      workflow_pack_name: "pm-operating-quality-summary",
      workflow_pack_version: "2026.05",
      workflow_run_id: "wf_pmq_summary_002",
      summary_artifact_ref: "artifact://pmq-summary/002",
      summary_content_hash: "sha256:summary-invocation",
      requested_by: "workbench-pm-operating-quality-supervisor",
      as_of_date: "2026-05-13",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
      generated_summary_text: "Raw generated summary text must stay hidden.",
      prompt_body: "Raw prompt must stay hidden.",
      model_response: "Raw model response must stay hidden.",
      client_contact_claim: "Client communication must stay hidden.",
      order_claim: "Order claim must stay hidden.",
      oms_claim: "OMS claim must stay hidden.",
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
          source_id: "pmq_summary_002",
        },
      ],
    },
  },
};

const summaryResponse: DpmPmOperatingQualitySummaryResponse = {
  correlation_id: "corr-pmq-summary",
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
    requested_outputs: ["score_run_summary"],
    audience: ["portfolio_manager"],
  },
  data: {
    workflow_pack_run: {
      run_id: "packrun_pmq_1",
      review_state: "REVIEW_REQUIRED",
      workflow_authority_owner: "lotus-manage",
    },
  },
};

function renderActions(overrides: Partial<Parameters<typeof usePmOperatingQualityActions>[0]> = {}) {
  return renderHook(() =>
    usePmOperatingQualityActions({
      policies,
      scoreRuns,
      ...overrides,
    })
  );
}

describe("usePmOperatingQualityActions", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("derives the PM operating-quality model without exposing API integration to the panel", () => {
    const { result } = renderActions();

    expect(result.current.model.policyId).toBe("pmq_sg_dpm");
    expect(result.current.model.scoreRunId).toBe("pmq_run_001");
    expect(result.current.pendingAction).toBe(false);
    expect(result.current.actionError).toBeNull();
  });

  it("previews score-run evidence through Gateway with policy context", async () => {
    vi.mocked(previewDpmPmOperatingQualityScoreRun).mockResolvedValue(scoreRuns);
    const { result } = renderActions();

    await act(async () => {
      await result.current.previewScoreRun();
    });

    expect(previewDpmPmOperatingQualityScoreRun).toHaveBeenCalledWith({
      policyId: "pmq_sg_dpm",
      policyVersion: "2026.05",
    });
    await waitFor(() =>
      expect(result.current.actionMessage).toBe("Preview returned Manage operating-quality evidence.")
    );
  });

  it("previews and persists fairness analysis through Gateway using source-defined segments", async () => {
    vi.mocked(previewDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(fairnessAnalysisResponse);
    vi.mocked(createDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(fairnessAnalysisResponse);
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(fairnessAnalysisResponse);
    const { result } = renderActions();

    await act(async () => {
      await result.current.previewFairnessAnalysis();
    });

    expect(previewDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        policyId: "pmq_sg_dpm",
        policyVersion: "2026.05",
        segments: expect.arrayContaining([
          expect.objectContaining({ segment_id: "mandate_balanced" }),
          expect.objectContaining({ segment_id: "mandate_income" }),
        ]),
      })
    );
    await waitFor(() =>
      expect(result.current.actionMessage).toBe("Fairness preview returned Manage segment evidence.")
    );

    await act(async () => {
      await result.current.createFairnessAnalysis();
    });

    expect(createDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        policyId: "pmq_sg_dpm",
        policyVersion: "2026.05",
      })
    );
    expect(getDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith(
      "pmq_fair_002",
      "client"
    );
    await waitFor(() =>
      expect(result.current.actionMessage).toBe("Persisted fairness analysis returned Manage evidence.")
    );
    expect(result.current.fairnessCreateEvidence?.fairnessAnalysisId).toBe("pmq_fair_002");
  });

  it("requests support summary through Gateway without constructing prompts", async () => {
    vi.mocked(requestDpmPmOperatingQualitySummary).mockResolvedValue(summaryResponse);
    const { result } = renderActions();

    await act(async () => {
      await result.current.requestSupportSummary();
    });

    expect(requestDpmPmOperatingQualitySummary).toHaveBeenCalledWith({
      scoreRunId: "pmq_run_001",
    });
    await waitFor(() =>
      expect(result.current.actionMessage).toBe(
        "Support summary returned review-required PM quality evidence."
      )
    );
    expect(JSON.stringify(result.current.model.summaryPosture)).not.toContain("sha256:pm-quality");
  });

  it("previews before creating bounded supervisory review actions through Gateway", async () => {
    vi.mocked(buildDpmPmOperatingQualityReviewActionCorrelationId)
      .mockReturnValueOnce("corr-workbench-pm-quality-review-action-preview")
      .mockReturnValueOnce("corr-workbench-pm-quality-review-action-create");
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse
    );
    vi.mocked(createDpmPmOperatingQualityReviewAction).mockResolvedValue(reviewActionResponse);
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(reviewActionResponse);
    const { result } = renderActions();

    await act(async () => {
      await result.current.createReviewAction();
    });

    expect(createDpmPmOperatingQualityReviewAction).not.toHaveBeenCalled();
    expect(result.current.actionError).toEqual(
      expect.objectContaining({
        statusClass: "blocked",
        body: "Preview the supervisory review action before recording it.",
      })
    );

    await act(async () => {
      result.current.setReviewActionFormValue(
        "boundedRationale",
        "Bounded supervisory review for source-owned PM quality evidence."
      );
    });

    await act(async () => {
      await result.current.previewReviewAction();
    });

    expect(previewDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith({
      request: expect.objectContaining({
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        action_type: "REQUEST_EVIDENCE_REMEDIATION",
        action_state: "REVIEW_REQUIRED",
        review_action_ref: "PMQ-REVIEW-pmq_run_001",
        review_reason: "Bounded supervisory review for source-owned PM quality evidence.",
        actor_id: "workbench-pm-operating-quality-supervisor",
        policy_id: "pmq_sg_dpm",
        policy_version: "2026.05",
        as_of_date: "2026-05-13",
        source_refs: [],
      }),
      actorId: "workbench-pm-operating-quality-supervisor",
      correlationId: "corr-workbench-pm-quality-review-action-preview",
    });
    await waitFor(() =>
      expect(result.current.actionMessage).toBe(
        "Review-action preview returned Manage supervisory evidence."
      )
    );
    expect(result.current.reviewActionPreviewReady).toBe(true);

    await act(async () => {
      await result.current.createReviewAction();
    });

    expect(createDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith({
      request: expect.objectContaining({
        target_type: "SCORE_RUN",
        target_id: "pmq_run_001",
        review_reason: "Bounded supervisory review for source-owned PM quality evidence.",
      }),
      actorId: "workbench-pm-operating-quality-supervisor",
      correlationId: "corr-workbench-pm-quality-review-action-create",
    });
    expect(getDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith(
      "pmq_review_002",
      "client"
    );
    await waitFor(() =>
      expect(result.current.actionMessage).toBe(
        "Recorded Manage-owned supervisory review action."
      )
    );
    expect(result.current.reviewActionCreateEvidence).toEqual({
      reviewActionId: "pmq_review_002",
      correlationId: "corr-pmq-review-action-create",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    expect(JSON.stringify(result.current.model.reviewActionDetail)).not.toContain(
      "raw rationale from Manage"
    );
  });

  it("previews before creating PM quality summary invocations through Gateway", async () => {
    vi.mocked(buildDpmPmOperatingQualitySummaryInvocationCorrelationId)
      .mockReturnValueOnce("corr-workbench-pm-quality-summary-invocation-preview")
      .mockReturnValueOnce("corr-workbench-pm-quality-summary-invocation-create");
    vi.mocked(previewDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationResponse
    );
    vi.mocked(createDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationResponse
    );
    vi.mocked(getDpmPmOperatingQualitySummaryInvocation).mockResolvedValue(
      summaryInvocationResponse
    );
    const { result } = renderActions({
      reviewActions: reviewActionResponse,
      reviewActionDetail: reviewActionResponse,
    });

    await act(async () => {
      await result.current.createSummaryInvocation();
    });

    expect(createDpmPmOperatingQualitySummaryInvocation).not.toHaveBeenCalled();
    expect(result.current.actionError).toEqual(
      expect.objectContaining({
        statusClass: "blocked",
        body: "Preview the PM quality summary invocation before recording it.",
      })
    );

    await act(async () => {
      await result.current.previewSummaryInvocation();
    });

    expect(previewDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith({
      request: expect.objectContaining({
        score_run_id: "pmq_run_001",
        review_action_id: "pmq_review_002",
        invocation_state: "PENDING_REVIEW",
        summary_ref: "PMQ-SUMMARY-pmq_run_001",
        workflow_pack_name: "pm-operating-quality-summary",
        workflow_pack_version: "2026.05",
        requested_by: "workbench-pm-operating-quality-supervisor",
        source_refs: [],
      }),
      actorId: "workbench-pm-operating-quality-supervisor",
      correlationId: "corr-workbench-pm-quality-summary-invocation-preview",
    });
    await waitFor(() =>
      expect(result.current.actionMessage).toBe(
        "Summary-invocation preview returned Manage evidence."
      )
    );
    expect(result.current.summaryInvocationPreviewReady).toBe(true);

    await act(async () => {
      await result.current.createSummaryInvocation();
    });

    expect(createDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith({
      request: expect.objectContaining({
        score_run_id: "pmq_run_001",
        review_action_id: "pmq_review_002",
        summary_ref: "PMQ-SUMMARY-pmq_run_001",
      }),
      actorId: "workbench-pm-operating-quality-supervisor",
      correlationId: "corr-workbench-pm-quality-summary-invocation-create",
    });
    expect(getDpmPmOperatingQualitySummaryInvocation).toHaveBeenCalledWith(
      "pmq_summary_002",
      "client"
    );
    await waitFor(() =>
      expect(result.current.actionMessage).toBe(
        "Recorded Manage-owned PM quality summary invocation."
      )
    );
    expect(result.current.summaryInvocationCreateEvidence).toEqual({
      summaryInvocationId: "pmq_summary_002",
      correlationId: "corr-pmq-summary-invocation-create",
      sourceService: "lotus-manage",
      upstreamStatus: "200",
    });
    const renderedDetail = JSON.stringify(result.current.model.summaryInvocationDetail);
    expect(renderedDetail).not.toContain("Raw generated summary text must stay hidden");
    expect(renderedDetail).not.toContain("Raw prompt must stay hidden");
    expect(renderedDetail).not.toContain("Raw model response must stay hidden");
    expect(renderedDetail).not.toContain("Client communication must stay hidden");
    expect(renderedDetail).not.toContain("Order claim must stay hidden");
    expect(renderedDetail).not.toContain("OMS claim must stay hidden");
  });

  it("blocks Gateway calls when source-owned readiness is not available", async () => {
    const { result } = renderActions({
      policies: null,
      scoreRuns: null,
    });

    await act(async () => {
      await result.current.previewScoreRun();
      await result.current.previewFairnessAnalysis();
      await result.current.createFairnessAnalysis();
      await result.current.requestSupportSummary();
      await result.current.previewReviewAction();
      await result.current.createReviewAction();
      await result.current.previewSummaryInvocation();
      await result.current.createSummaryInvocation();
    });

    expect(previewDpmPmOperatingQualityScoreRun).not.toHaveBeenCalled();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
    expect(createDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
    expect(requestDpmPmOperatingQualitySummary).not.toHaveBeenCalled();
    expect(previewDpmPmOperatingQualityReviewAction).not.toHaveBeenCalled();
    expect(createDpmPmOperatingQualityReviewAction).not.toHaveBeenCalled();
    expect(previewDpmPmOperatingQualitySummaryInvocation).not.toHaveBeenCalled();
    expect(createDpmPmOperatingQualitySummaryInvocation).not.toHaveBeenCalled();
    expect(result.current.actionError).toEqual(
      expect.objectContaining({
        statusClass: "blocked",
        source: "Manage action register via Gateway supportability",
      })
    );
  });
});
