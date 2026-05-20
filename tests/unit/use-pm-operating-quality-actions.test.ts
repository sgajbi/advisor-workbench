import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePmOperatingQualityActions } from "../../src/features/workbench/use-pm-operating-quality-actions";
import {
  createDpmPmOperatingQualityFairnessAnalysis,
  getDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityFairnessAnalysis,
  previewDpmPmOperatingQualityScoreRun,
  requestDpmPmOperatingQualitySummary,
} from "../../src/features/workbench/api";
import type {
  DpmPmOperatingQualityGatewayResponse,
  DpmPmOperatingQualitySummaryResponse,
} from "../../src/features/workbench/types";

vi.mock("../../src/features/workbench/api", () => ({
  createDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  getDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  previewDpmPmOperatingQualityFairnessAnalysis: vi.fn(),
  previewDpmPmOperatingQualityScoreRun: vi.fn(),
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
    });

    expect(previewDpmPmOperatingQualityScoreRun).not.toHaveBeenCalled();
    expect(previewDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
    expect(createDpmPmOperatingQualityFairnessAnalysis).not.toHaveBeenCalled();
    expect(requestDpmPmOperatingQualitySummary).not.toHaveBeenCalled();
    expect(result.current.actionError).toEqual(
      expect.objectContaining({
        statusClass: "blocked",
        source: "Manage action register via Gateway supportability",
      })
    );
  });
});
