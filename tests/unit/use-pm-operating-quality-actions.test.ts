import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
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
  listDpmPmOperatingQualityFairnessAnalyses,
  listDpmPmOperatingQualityReviewActions,
  listDpmPmOperatingQualitySummaryInvocations,
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
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

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
  listDpmPmOperatingQualityFairnessAnalyses: vi.fn(),
  listDpmPmOperatingQualityReviewActions: vi.fn(),
  listDpmPmOperatingQualitySummaryInvocations: vi.fn(),
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

const replacementScoreRuns: DpmPmOperatingQualityGatewayResponse = {
  ...scoreRuns,
  correlation_id: "corr-score-replacement",
  data: {
    score_runs: [
      {
        ...(
          (scoreRuns.data.score_runs as Array<Record<string, unknown>>)[0] ?? {}
        ),
        score_run_id: "pmq_run_002",
        content_hash: "sha256:pm-quality-replacement",
      },
    ],
    fairness_segments: [],
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
  data: buildDpmAiWorkflowExecution("pm-quality-summary", { runId: "packrun_pmq_1" }),
};

const replacementSummaryResponse: DpmPmOperatingQualitySummaryResponse = {
  ...summaryResponse,
  correlation_id: "corr-pmq-summary-replacement",
  supportability: {
    ...summaryResponse.supportability,
    score_run_id: "pmq_run_002",
  },
  score_run: {
    score_run_id: "pmq_run_002",
    content_hash: "sha256:pm-quality-replacement",
  },
  data: buildDpmAiWorkflowExecution("pm-quality-summary", {
    runId: "packrun_pmq_2",
  }),
};

function fairnessDetailOf(fairness: Record<string, unknown>) {
  return {
    ...fairnessAnalysisResponse,
    supportability: {
      ...fairnessAnalysisResponse.supportability,
      fairness_analysis_id: fairness.fairness_analysis_id as string,
    },
    data: { fairness_analysis: fairness },
  } as DpmPmOperatingQualityGatewayResponse;
}

function reviewActionDetailOf(reviewAction: Record<string, unknown>) {
  return {
    ...reviewActionResponse,
    supportability: {
      ...reviewActionResponse.supportability,
      review_action_id: reviewAction.review_action_id as string,
    },
    data: { review_action: reviewAction },
  } as DpmPmOperatingQualityGatewayResponse;
}

function renderActions(overrides: Partial<Parameters<typeof usePmOperatingQualityActions>[0]> = {}) {
  seedListReads(overrides);
  return renderHook(
    () =>
      usePmOperatingQualityActions({
        policies,
        scoreRuns,
        ...overrides,
      }),
    { wrapper: createQueryWrapper() },
  );
}

// Persisted commands stay pending until the exact affected source list refreshes, so
// every render gives the governed list reads a canonical response to return.
function seedListReads(overrides: Partial<Parameters<typeof usePmOperatingQualityActions>[0]>) {
  const emptyList = (payload: Record<string, unknown>) => ({
    ...policies,
    data: payload,
  });
  vi.mocked(listDpmPmOperatingQualityFairnessAnalyses).mockResolvedValue(
    overrides.fairnessAnalyses ?? emptyList({ fairness_analyses: [] }),
  );
  vi.mocked(listDpmPmOperatingQualityReviewActions).mockResolvedValue(
    overrides.reviewActions ?? emptyList({ review_actions: [] }),
  );
  vi.mocked(listDpmPmOperatingQualitySummaryInvocations).mockResolvedValue(
    overrides.summaryInvocations ?? emptyList({ summary_invocations: [] }),
  );
}

function createQueryWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children);
  };
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

  it("binds support summaries to the explicitly selected score run across reorder", async () => {
    const firstScoreRun = (scoreRuns.data.score_runs as Array<Record<string, unknown>>)[0];
    const secondScoreRun = {
      ...firstScoreRun,
      score_run_id: "pmq_run_002",
      pm_id: "PM_SG_002",
      book_id: "PM_BOOK_SG_INCOME",
      as_of_date: "2026-05-14",
    };
    const multipleScoreRuns = {
      ...scoreRuns,
      data: { ...scoreRuns.data, score_runs: [firstScoreRun, secondScoreRun] },
    };
    vi.mocked(requestDpmPmOperatingQualitySummary).mockResolvedValue(
      replacementSummaryResponse,
    );
    const { result, rerender } = renderHook(
      ({ currentScoreRuns }) =>
        usePmOperatingQualityActions({ policies, scoreRuns: currentScoreRuns }),
      {
        initialProps: { currentScoreRuns: multipleScoreRuns },
        wrapper: createQueryWrapper(),
      },
    );

    act(() => result.current.selectScoreRun("pmq_run_002"));

    expect(result.current.selection.scoreRunId).toBe("pmq_run_002");
    expect(result.current.model.selectedScoreRun).toMatchObject({
      scoreRunId: "pmq_run_002",
      pmId: "PM_SG_002",
    });
    expect(result.current.summaryInvocationForm.scoreRunId).toBe("pmq_run_002");

    rerender({
      currentScoreRuns: {
        ...multipleScoreRuns,
        data: { ...multipleScoreRuns.data, score_runs: [secondScoreRun, firstScoreRun] },
      },
    });
    expect(result.current.selection.scoreRunId).toBe("pmq_run_002");

    await act(async () => {
      await result.current.requestSupportSummary();
    });
    expect(requestDpmPmOperatingQualitySummary).toHaveBeenCalledWith({
      scoreRunId: "pmq_run_002",
    });
    await waitFor(() =>
      expect(result.current.model.summaryPosture.runId).toBe("packrun_pmq_2"),
    );
  });

  it("loads selected fairness and review-action detail and binds the visible action target", async () => {
    const firstFairness = {
      ...(fairnessAnalysisResponse.data.fairness_analysis as Record<string, unknown>),
      fairness_analysis_id: "pmq_fair_001",
      as_of_date: "2026-05-13",
    };
    const secondFairness = {
      ...firstFairness,
      fairness_analysis_id: "pmq_fair_002",
      as_of_date: "2026-05-14",
    };
    const fairnessList = {
      ...fairnessAnalysisResponse,
      data: { fairness_analyses: [firstFairness, secondFairness] },
    };
    const firstReviewAction = {
      ...(reviewActionResponse.data.review_action as Record<string, unknown>),
      review_action_id: "pmq_review_001",
      review_action_ref: "PMQ-REVIEW-001",
    };
    const secondReviewAction = {
      ...firstReviewAction,
      review_action_id: "pmq_review_002",
      review_action_ref: "PMQ-REVIEW-002",
    };
    const reviewActionList = {
      ...reviewActionResponse,
      data: { review_actions: [firstReviewAction, secondReviewAction] },
    };
    const secondFairnessDetail = fairnessDetailOf(secondFairness);
    const secondReviewActionDetail = reviewActionDetailOf(secondReviewAction);
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(
      secondFairnessDetail,
    );
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(
      secondReviewActionDetail,
    );
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      secondReviewActionDetail,
    );
    const { result } = renderActions({
      fairnessAnalyses: fairnessList,
      fairnessAnalysisDetail: fairnessDetailOf(firstFairness),
      reviewActions: reviewActionList,
      reviewActionDetail: reviewActionDetailOf(firstReviewAction),
    });

    await act(async () => {
      await result.current.selectFairnessAnalysis("pmq_fair_002");
    });
    await waitFor(() =>
      expect(result.current.selection.fairnessAnalysisId).toBe("pmq_fair_002"),
    );
    await act(async () => {
      await result.current.selectReviewAction("pmq_review_002");
    });

    expect(getDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledWith(
      "pmq_fair_002",
      "client",
    );
    expect(getDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith(
      "pmq_review_002",
      "client",
    );
    expect(result.current.model.fairnessDetail.asOfDate).toBe("2026-05-14");
    expect(result.current.model.reviewActionDetail.reviewActionId).toBe("pmq_review_002");
    expect(result.current.reviewActionForm).toMatchObject({
      targetType: "FAIRNESS_ANALYSIS",
      targetId: "pmq_fair_002",
      reviewActionRef: "PMQ-REVIEW-pmq_fair_002",
    });
    expect(result.current.summaryInvocationForm.reviewActionId).toBe("pmq_review_002");

    await act(async () => {
      await result.current.previewReviewAction();
    });
    expect(previewDpmPmOperatingQualityReviewAction).toHaveBeenCalledWith({
      request: expect.objectContaining({
        target_type: "FAIRNESS_ANALYSIS",
        target_id: "pmq_fair_002",
        as_of_date: "2026-05-14",
      }),
      actorId: "workbench-pm-operating-quality-supervisor",
      correlationId: "corr-workbench-pm-quality-review-action-test",
    });
  });

  it("reuses fresh selected fairness detail instead of repaying the source read", async () => {
    const firstFairness = {
      ...(fairnessAnalysisResponse.data.fairness_analysis as Record<string, unknown>),
      fairness_analysis_id: "pmq_fair_001",
      as_of_date: "2026-05-13",
    };
    const secondFairness = {
      ...firstFairness,
      fairness_analysis_id: "pmq_fair_002",
      as_of_date: "2026-05-14",
    };
    const fairnessList = {
      ...fairnessAnalysisResponse,
      data: { fairness_analyses: [firstFairness, secondFairness] },
    };
    const firstFairnessDetail = fairnessDetailOf(firstFairness);
    const secondFairnessDetail = fairnessDetailOf(secondFairness);
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockResolvedValue(
      secondFairnessDetail,
    );
    const { result } = renderActions({
      fairnessAnalyses: fairnessList,
      fairnessAnalysisDetail: firstFairnessDetail,
    });

    await act(async () => {
      await result.current.selectFairnessAnalysis("pmq_fair_002");
    });
    await act(async () => {
      await result.current.selectFairnessAnalysis("pmq_fair_001");
    });
    await act(async () => {
      await result.current.selectFairnessAnalysis("pmq_fair_002");
    });

    expect(getDpmPmOperatingQualityFairnessAnalysis).toHaveBeenCalledTimes(1);
    expect(result.current.model.fairnessDetail.asOfDate).toBe("2026-05-14");
  });

  it("discards late selected-detail completion after the supervisor changes record", async () => {
    const firstFairness = {
      ...(fairnessAnalysisResponse.data.fairness_analysis as Record<string, unknown>),
      fairness_analysis_id: "pmq_fair_001",
      as_of_date: "2026-05-13",
    };
    const secondFairness = {
      ...firstFairness,
      fairness_analysis_id: "pmq_fair_002",
      as_of_date: "2026-05-14",
    };
    const fairnessList = {
      ...fairnessAnalysisResponse,
      data: { fairness_analyses: [firstFairness, secondFairness] },
    };
    let resolveFirstRequest!: (value: DpmPmOperatingQualityGatewayResponse) => void;
    let resolveSecondRequest!: (value: DpmPmOperatingQualityGatewayResponse) => void;
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirstRequest = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecondRequest = resolve; }));
    const { result } = renderActions({ fairnessAnalyses: fairnessList });

    act(() => {
      void result.current.selectFairnessAnalysis("pmq_fair_002");
    });
    await waitFor(() => expect(result.current.pendingFairnessDetail).toBe(true));
    act(() => {
      void result.current.selectFairnessAnalysis("pmq_fair_001");
    });

    await act(async () => {
      resolveSecondRequest(fairnessDetailOf(firstFairness));
      await Promise.resolve();
    });
    expect(result.current.selection.fairnessAnalysisId).toBe("pmq_fair_001");
    expect(result.current.model.fairnessDetail.asOfDate).toBe("2026-05-13");

    await act(async () => {
      resolveFirstRequest(fairnessDetailOf(secondFairness));
      await Promise.resolve();
    });
    expect(result.current.selection.fairnessAnalysisId).toBe("pmq_fair_001");
    expect(result.current.model.fairnessDetail.asOfDate).toBe("2026-05-13");
  });

  it("lets unchanged fairness detail finish when only the score-run selection changes", async () => {
    const firstScoreRun = (scoreRuns.data.score_runs as Array<Record<string, unknown>>)[0];
    const secondScoreRun = {
      ...firstScoreRun,
      score_run_id: "pmq_run_002",
      pm_id: "PM_SG_002",
      book_id: "PM_BOOK_SG_INCOME",
    };
    const multipleScoreRuns = {
      ...scoreRuns,
      data: { ...scoreRuns.data, score_runs: [firstScoreRun, secondScoreRun] },
    };
    const firstFairness = {
      ...(fairnessAnalysisResponse.data.fairness_analysis as Record<string, unknown>),
      fairness_analysis_id: "pmq_fair_001",
      as_of_date: "2026-05-13",
    };
    const secondFairness = {
      ...firstFairness,
      fairness_analysis_id: "pmq_fair_002",
      as_of_date: "2026-05-14",
    };
    const fairnessList = {
      ...fairnessAnalysisResponse,
      data: { fairness_analyses: [firstFairness, secondFairness] },
    };
    let resolveFairness!: (value: DpmPmOperatingQualityGatewayResponse) => void;
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockReturnValue(
      new Promise((resolve) => { resolveFairness = resolve; }),
    );
    const { result } = renderActions({
      scoreRuns: multipleScoreRuns,
      fairnessAnalyses: fairnessList,
    });

    act(() => {
      void result.current.selectFairnessAnalysis("pmq_fair_002");
    });
    await waitFor(() => expect(result.current.pendingFairnessDetail).toBe(true));

    act(() => result.current.selectScoreRun("pmq_run_002"));
    expect(result.current.selection).toMatchObject({
      scoreRunId: "pmq_run_002",
      fairnessAnalysisId: "pmq_fair_002",
    });
    expect(result.current.pendingFairnessDetail).toBe(true);

    await act(async () => {
      resolveFairness(fairnessDetailOf(secondFairness));
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.pendingFairnessDetail).toBe(false));
    expect(result.current.model.fairnessDetail.asOfDate).toBe("2026-05-14");
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

  it("keeps every persisted fairness record selectable until the canonical list refreshes", async () => {
    const createdFairnessRecord = fairnessAnalysisResponse.data
      .fairness_analysis as Record<string, unknown>;
    const existingFairnessRecord = {
      ...createdFairnessRecord,
      fairness_analysis_id: "pmq_fair_001",
      as_of_date: "2026-05-13",
    };
    const existingFairnessDetail = {
      ...fairnessAnalysisResponse,
      correlation_id: "corr-pmq-fairness-detail-001",
      data: { fairness_analysis: existingFairnessRecord },
    };
    const initialFairnessList = {
      ...fairnessAnalysisResponse,
      correlation_id: "corr-pmq-fairness-list-initial",
      data: { fairness_analyses: [existingFairnessRecord] },
    };
    const thirdFairnessRecord = {
      ...createdFairnessRecord,
      fairness_analysis_id: "pmq_fair_003",
      as_of_date: "2026-05-15",
    };
    const thirdFairnessResponse = {
      ...fairnessAnalysisResponse,
      correlation_id: "corr-pmq-fairness-create-003",
      supportability: {
        ...fairnessAnalysisResponse.supportability,
        fairness_analysis_id: "pmq_fair_003",
      },
      data: { fairness_analysis: thirdFairnessRecord },
    };
    vi.mocked(createDpmPmOperatingQualityFairnessAnalysis)
      .mockResolvedValueOnce(fairnessAnalysisResponse)
      .mockResolvedValueOnce(thirdFairnessResponse);
    vi.mocked(getDpmPmOperatingQualityFairnessAnalysis).mockImplementation(
      async (fairnessAnalysisId) => {
        if (fairnessAnalysisId === "pmq_fair_001") return existingFairnessDetail;
        if (fairnessAnalysisId === "pmq_fair_003") return thirdFairnessResponse;
        return fairnessAnalysisResponse;
      },
    );
    const { result, rerender } = renderHook(
      ({ fairnessAnalyses }) =>
        usePmOperatingQualityActions({
          policies,
          scoreRuns,
          fairnessAnalyses,
        }),
      {
        initialProps: { fairnessAnalyses: initialFairnessList },
        wrapper: createQueryWrapper(),
      },
    );

    await act(async () => {
      await result.current.createFairnessAnalysis();
    });
    await act(async () => {
      await result.current.createFairnessAnalysis();
    });
    expect(result.current.selection.fairnessAnalysisId).toBe("pmq_fair_003");
    expect(result.current.model.fairnessAnalysisRows).toHaveLength(3);
    expect(result.current.model.fairnessAnalysisRows.map((row) => row.fairnessAnalysisId)).toEqual(
      expect.arrayContaining(["pmq_fair_001", "pmq_fair_002", "pmq_fair_003"]),
    );

    await act(async () => {
      await result.current.selectFairnessAnalysis("pmq_fair_002");
    });
    expect(result.current.selection.fairnessAnalysisId).toBe("pmq_fair_002");

    await act(async () => {
      await result.current.selectFairnessAnalysis("pmq_fair_001");
    });
    rerender({
      fairnessAnalyses: {
        ...initialFairnessList,
        correlation_id: "corr-pmq-fairness-list-refreshed",
        data: {
          fairness_analyses: [
            existingFairnessRecord,
            {
              ...createdFairnessRecord,
              fairness_analysis_id: "pmq_fair_002",
              as_of_date: "2026-05-16",
            },
            { ...thirdFairnessRecord, as_of_date: "2026-05-17" },
          ],
        },
      },
    });

    await waitFor(() => {
      expect(result.current.model.fairnessAnalysisRows).toHaveLength(3);
      expect(
        result.current.model.fairnessAnalysisRows.find(
          (row) => row.fairnessAnalysisId === "pmq_fair_002",
        )?.asOfDate,
      ).toBe("2026-05-16");
    });

    rerender({ fairnessAnalyses: initialFairnessList });
    expect(result.current.model.fairnessAnalysisRows.map((row) => row.fairnessAnalysisId)).toEqual([
      "pmq_fair_001",
    ]);
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
    await waitFor(() => expect(result.current.summaryOutcome?.family).toBe("pm-quality-summary"));
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.summaryOutcome?.disclosure).toMatchObject({
      availability: "live",
      humanReview: { state: "review-required" },
      clientUse: "internal-only",
    });
    expect(JSON.stringify(result.current.model.summaryPosture)).not.toContain("sha256:pm-quality");
  });

  it("removes a completed support summary when its score run is replaced", async () => {
    vi.mocked(requestDpmPmOperatingQualitySummary).mockResolvedValue(
      summaryResponse,
    );
    const { result, rerender } = renderHook(
      ({ currentScoreRuns }) =>
        usePmOperatingQualityActions({
          policies,
          scoreRuns: currentScoreRuns,
        }),
      {
        initialProps: { currentScoreRuns: scoreRuns },
        wrapper: createQueryWrapper(),
      },
    );

    await act(async () => {
      await result.current.requestSupportSummary();
    });
    await waitFor(() => expect(result.current.summaryOutcome).not.toBeNull());

    rerender({ currentScoreRuns: replacementScoreRuns });

    expect(result.current.model.selectedScoreRun?.scoreRunId).toBe("pmq_run_002");
    expect(result.current.summaryOutcome).toBeNull();
    expect(result.current.pendingSummaryAction).toBe(false);
  });

  it("discards an in-flight support summary after its score run is replaced", async () => {
    let resolveSummary!: (value: DpmPmOperatingQualitySummaryResponse) => void;
    vi.mocked(requestDpmPmOperatingQualitySummary).mockReturnValue(
      new Promise((resolve) => {
        resolveSummary = resolve;
      }),
    );
    const { result, rerender } = renderHook(
      ({ currentScoreRuns }) =>
        usePmOperatingQualityActions({
          policies,
          scoreRuns: currentScoreRuns,
        }),
      {
        initialProps: { currentScoreRuns: scoreRuns },
        wrapper: createQueryWrapper(),
      },
    );

    act(() => {
      void result.current.requestSupportSummary();
    });
    await waitFor(() =>
      expect(requestDpmPmOperatingQualitySummary).toHaveBeenCalledWith({
        scoreRunId: "pmq_run_001",
      }),
    );
    rerender({ currentScoreRuns: replacementScoreRuns });
    await act(async () => {
      resolveSummary(summaryResponse);
      await Promise.resolve();
    });

    expect(result.current.model.selectedScoreRun?.scoreRunId).toBe("pmq_run_002");
    expect(result.current.summaryOutcome).toBeNull();
    expect(result.current.pendingSummaryAction).toBe(false);
  });

  it("does not project summary posture from a mismatched score run", async () => {
    vi.mocked(requestDpmPmOperatingQualitySummary).mockResolvedValue({
      ...summaryResponse,
      score_run: { score_run_id: "pmq_run_other" },
    });
    const { result } = renderActions();

    await act(async () => {
      await result.current.requestSupportSummary();
    });

    await waitFor(() =>
      expect(result.current.summaryOutcome?.disclosure).toMatchObject({
        availability: "partial",
        clientUse: "blocked",
      }),
    );
    expect(result.current.model.summaryPosture).toMatchObject({
      status: "Not requested",
      reviewState: "N/A",
      workflowAuthority: "N/A",
      runId: "N/A",
    });
  });

  it("starts the newly selected score-run request while the prior run is pending", async () => {
    let resolveFirst!: (value: DpmPmOperatingQualitySummaryResponse) => void;
    let resolveSecond!: (value: DpmPmOperatingQualitySummaryResponse) => void;
    vi.mocked(requestDpmPmOperatingQualitySummary)
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveSecond = resolve;
      }));
    const { result, rerender } = renderHook(
      ({ currentScoreRuns }) =>
        usePmOperatingQualityActions({
          policies,
          scoreRuns: currentScoreRuns,
        }),
      {
        initialProps: { currentScoreRuns: scoreRuns },
        wrapper: createQueryWrapper(),
      },
    );

    act(() => {
      void result.current.requestSupportSummary();
    });
    await waitFor(() => expect(result.current.pendingSummaryAction).toBe(true));

    rerender({ currentScoreRuns: replacementScoreRuns });
    expect(result.current.pendingSummaryAction).toBe(false);
    act(() => {
      void result.current.requestSupportSummary();
    });
    await waitFor(() => {
      expect(requestDpmPmOperatingQualitySummary).toHaveBeenNthCalledWith(2, {
        scoreRunId: "pmq_run_002",
      });
      expect(result.current.pendingSummaryAction).toBe(true);
    });

    await act(async () => {
      resolveSecond(replacementSummaryResponse);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(result.current.model.summaryPosture.runId).toBe("packrun_pmq_2");
      expect(result.current.pendingSummaryAction).toBe(false);
    });

    await act(async () => {
      resolveFirst(summaryResponse);
      await Promise.resolve();
    });
    expect(result.current.model.summaryPosture.runId).toBe("packrun_pmq_2");
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
    await waitFor(() =>
      expect(result.current.actionError).toEqual(
        expect.objectContaining({
          statusClass: "blocked",
          body: "Preview the supervisory review action before recording it.",
        }),
      ),
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

  it("keeps every persisted review action selectable until the canonical list refreshes", async () => {
    const createdReviewActionRecord = reviewActionResponse.data
      .review_action as Record<string, unknown>;
    const existingReviewActionRecord = {
      ...createdReviewActionRecord,
      review_action_id: "pmq_review_001",
      review_action_ref: "PMQ-REVIEW-001",
    };
    const existingReviewActionDetail = {
      ...reviewActionResponse,
      correlation_id: "corr-pmq-review-action-detail-001",
      supportability: {
        ...reviewActionResponse.supportability,
        review_action_id: "pmq_review_001",
      },
      data: { review_action: existingReviewActionRecord },
    };
    const initialReviewActionList = {
      ...reviewActionResponse,
      correlation_id: "corr-pmq-review-action-list-initial",
      data: { review_actions: [existingReviewActionRecord] },
    };
    const thirdReviewActionRecord = {
      ...createdReviewActionRecord,
      review_action_id: "pmq_review_003",
      review_action_ref: "PMQ-REVIEW-003",
    };
    const thirdReviewActionResponse = {
      ...reviewActionResponse,
      correlation_id: "corr-pmq-review-action-create-003",
      supportability: {
        ...reviewActionResponse.supportability,
        review_action_id: "pmq_review_003",
      },
      data: { review_action: thirdReviewActionRecord },
    };
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(createDpmPmOperatingQualityReviewAction)
      .mockResolvedValueOnce(reviewActionResponse)
      .mockResolvedValueOnce(thirdReviewActionResponse);
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockImplementation(
      async (reviewActionId) => {
        if (reviewActionId === "pmq_review_001") return existingReviewActionDetail;
        if (reviewActionId === "pmq_review_003") return thirdReviewActionResponse;
        return reviewActionResponse;
      },
    );
    const { result } = renderActions({ reviewActions: initialReviewActionList });

    await act(async () => {
      await result.current.previewReviewAction();
    });
    await act(async () => {
      await result.current.createReviewAction();
    });
    await act(async () => {
      await result.current.createReviewAction();
    });

    expect(result.current.selection.reviewActionId).toBe("pmq_review_003");
    expect(result.current.model.reviewActionRows).toHaveLength(3);
    expect(result.current.model.reviewActionRows.map((row) => row.reviewActionId)).toEqual(
      expect.arrayContaining(["pmq_review_001", "pmq_review_002", "pmq_review_003"]),
    );

    await act(async () => {
      await result.current.selectReviewAction("pmq_review_002");
    });
    expect(result.current.selection.reviewActionId).toBe("pmq_review_002");
  });

  it("holds record selection until a persisted review action is acknowledged", async () => {
    const firstScoreRun = (scoreRuns.data.score_runs as Array<Record<string, unknown>>)[0];
    const secondScoreRun = {
      ...firstScoreRun,
      score_run_id: "pmq_run_002",
      pm_id: "PM_SG_002",
      book_id: "PM_BOOK_SG_INCOME",
    };
    const multipleScoreRuns = {
      ...scoreRuns,
      data: { ...scoreRuns.data, score_runs: [firstScoreRun, secondScoreRun] },
    };
    let resolveCreate!: (value: DpmPmOperatingQualityGatewayResponse) => void;
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(createDpmPmOperatingQualityReviewAction).mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    const { result } = renderActions({ scoreRuns: multipleScoreRuns });

    await act(async () => {
      await result.current.previewReviewAction();
    });
    act(() => {
      void result.current.createReviewAction();
    });
    await waitFor(() => expect(result.current.selectionLocked).toBe(true));

    act(() => result.current.selectScoreRun("pmq_run_002"));
    expect(result.current.selection.scoreRunId).toBe("pmq_run_001");

    await act(async () => {
      resolveCreate(reviewActionResponse);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.selectionLocked).toBe(false));
    expect(result.current.reviewActionCreateEvidence?.reviewActionId).toBe(
      "pmq_review_002",
    );
    expect(result.current.actionMessage).toBe(
      "Recorded Manage-owned supervisory review action.",
    );
  });

  it("derives PM quality command selectors from Gateway-returned source rows", async () => {
    const { result } = renderActions({
      fairnessAnalyses: fairnessAnalysisResponse,
      fairnessAnalysisDetail: fairnessAnalysisResponse,
      reviewActions: reviewActionResponse,
      reviewActionDetail: reviewActionResponse,
    });

    expect(result.current.reviewActionTargetOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetType: "SCORE_RUN",
          value: "pmq_run_001",
          label: "pmq_run_001 / PM_SG_001",
        }),
        expect.objectContaining({
          targetType: "FAIRNESS_ANALYSIS",
          value: "pmq_fair_002",
        }),
      ])
    );
    expect(result.current.summaryInvocationScoreRunOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "pmq_run_001",
          detail: "PM_BOOK_SG_BALANCED | READY | 2026-05-13",
        }),
      ])
    );
    expect(result.current.summaryInvocationReviewActionOptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "pmq_review_002",
          detail: "pmq_review_002 | Score Run / pmq_run_001 | REVIEW_REQUIRED",
        }),
      ])
    );

    await act(async () => {
      result.current.setReviewActionFormValue("targetType", "FAIRNESS_ANALYSIS");
    });

    expect(result.current.reviewActionForm.targetType).toBe("FAIRNESS_ANALYSIS");
    expect(result.current.reviewActionForm.targetId).toBe("pmq_fair_002");
    expect(result.current.reviewActionForm.reviewActionRef).toBe("PMQ-REVIEW-pmq_fair_002");
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
    await waitFor(() =>
      expect(result.current.actionError).toEqual(
        expect.objectContaining({
          statusClass: "blocked",
          body: "Preview the PM quality summary invocation before recording it.",
        }),
      ),
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

  it("serializes persisted commands: a second persist cannot start while one is in flight", async () => {
    let resolveCreate!: (value: DpmPmOperatingQualityGatewayResponse) => void;
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(createDpmPmOperatingQualityReviewAction).mockReturnValue(
      new Promise((resolve) => { resolveCreate = resolve; }),
    );
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(reviewActionResponse);
    const { result } = renderActions();

    await act(async () => {
      await result.current.previewReviewAction();
    });
    act(() => {
      void result.current.createReviewAction();
    });
    await waitFor(() => expect(result.current.selectionLocked).toBe(true));

    await act(async () => {
      await result.current.createFairnessAnalysis();
    });
    expect(createDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();

    await act(async () => {
      resolveCreate(reviewActionResponse);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.selectionLocked).toBe(false));
  });

  it("holds a persisted command pending until the exact affected list has refreshed", async () => {
    let resolveListRefetch!: (value: DpmPmOperatingQualityGatewayResponse) => void;
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(createDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(reviewActionResponse);
    const { result } = renderActions({ reviewActions: reviewActionResponse });
    vi.mocked(listDpmPmOperatingQualityReviewActions).mockReturnValue(
      new Promise((resolve) => { resolveListRefetch = resolve; }),
    );

    act(() => {
      void result.current.previewReviewAction();
    });
    await waitFor(() =>
      expect(previewDpmPmOperatingQualityReviewAction).toHaveBeenCalled(),
    );
    act(() => {
      void result.current.createReviewAction();
    });
    await waitFor(() =>
      expect(createDpmPmOperatingQualityReviewAction).toHaveBeenCalled(),
    );
    await waitFor(() =>
      expect(listDpmPmOperatingQualityReviewActions).toHaveBeenCalled(),
    );
    // The record and its detail are persisted, but the command stays pending -- and
    // selection stays locked -- until the exact affected source list refreshes. Only
    // the review-action list refetches; the untouched lists are not fanned out to.
    expect(result.current.pendingReviewActionCreate).toBe(true);
    expect(result.current.selectionLocked).toBe(true);
    expect(listDpmPmOperatingQualityFairnessAnalyses).not.toHaveBeenCalled();

    await act(async () => {
      resolveListRefetch(reviewActionResponse);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.pendingReviewActionCreate).toBe(false));
    await waitFor(() =>
      expect(result.current.actionMessage).toBe(
        "Recorded Manage-owned supervisory review action.",
      ),
    );
  });

  it("keeps a failed source refresh explicit and never shows completed confirmation", async () => {
    vi.mocked(previewDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(createDpmPmOperatingQualityReviewAction).mockResolvedValue(
      reviewActionResponse,
    );
    vi.mocked(getDpmPmOperatingQualityReviewAction).mockResolvedValue(reviewActionResponse);
    const { result } = renderActions({ reviewActions: reviewActionResponse });
    vi.mocked(listDpmPmOperatingQualityReviewActions).mockRejectedValue(
      new Error("HTTP 502 from Gateway"),
    );

    await act(async () => {
      await result.current.previewReviewAction();
    });
    await act(async () => {
      await result.current.createReviewAction();
    });

    expect(createDpmPmOperatingQualityReviewAction).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(result.current.actionError?.body).toContain(
        "source list refresh failed",
      ),
    );
    expect(result.current.actionMessage).toBeNull();
    expect(result.current.pendingReviewActionCreate).toBe(false);
    expect(result.current.selectionLocked).toBe(false);
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
    await waitFor(() =>
      expect(result.current.actionError).toEqual(
        expect.objectContaining({
          statusClass: "blocked",
          source: "Manage action register via Gateway supportability",
        }),
      ),
    );
  });
});
