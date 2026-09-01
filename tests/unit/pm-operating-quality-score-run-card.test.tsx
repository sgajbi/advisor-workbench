import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PmOperatingQualityScoreRunCard from "../../src/features/workbench/components/pm-operating-quality-score-run-card";
import type { PmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";

const baseModel: PmOperatingQualityPanelModel = {
  state: "ready",
  supportabilityState: "READY",
  authority: "lotus-manage:RFC-0042/PM_OPERATING_QUALITY",
  policyId: "pmq_sg_dpm",
  policyVersion: "2026.05",
  scoreRunId: "pmq_run_001",
  fairnessAnalysisId: "N/A",
  summaryInvocationId: "N/A",
  count: "1",
  reasonCodes: ["PM_QUALITY_READY"],
  blockedActions: [],
  blockedActionPosture: "No blocked actions",
  policyRows: [],
  scoreRunRows: [
    {
      key: "pmq_run_001",
      scoreRunId: "pmq_run_001",
      pmId: "PM_SG_001",
      bookId: "PM_BOOK_SG_BALANCED",
      policy: "pmq_sg_dpm / 2026.05",
      state: "READY",
      score: "90.00",
      asOfDate: "2026-05-13",
      forbiddenUses: "Protected Class Inference (protected_class_inference), Autonomous PM Ranking (autonomous_pm_ranking)",
      sourceRefs: "System: lotus-manage | Product: PmOperatingQualityScoreRun | ID: pmq_run_001",
      reasonCodes: "PM_QUALITY_READY",
      contentHash: "sha256:hidden",
      sourceService: "lotus-manage",
    },
  ],
  fairnessSegmentRequests: [],
  sourceSegmentRows: [],
  fairnessAnalysisRows: [],
  reviewActionRows: [],
  summaryInvocationRows: [],
  fairnessSegmentRows: [],
  selectedFairnessAnalysis: null,
  selectedReviewAction: null,
  selectedScoreRun: null,
  fairnessAsOfDate: "2026-05-13",
  forbiddenUsePosture: "Protected Class Inference (protected_class_inference), Autonomous PM Ranking (autonomous_pm_ranking)",
  fairnessState: "PENDING",
  fairnessSpread: "N/A",
  fairnessDetail: {
    product: "N/A",
    asOfDate: "N/A",
    minimumSegmentScoreRunCount: "N/A",
    maximumAverageScoreSpread: "N/A",
    observedAverageScoreSpread: "N/A",
    generatedAt: "N/A",
    generatedBy: "N/A",
    sourceRefs: "N/A",
    forbiddenUses: "N/A",
    reasonCodes: "N/A",
  },
  reviewActionDetail: {
    reviewActionId: "N/A",
    reviewActionRef: "N/A",
    target: "N/A",
    actionType: "N/A",
    actionState: "N/A",
    actorId: "N/A",
    asOfDate: "N/A",
    policy: "N/A",
    rationale: "No review-action detail returned by Gateway.",
    supportability: "N/A",
    sourceRefs: "N/A",
    reasonCodes: "N/A",
    operatingBoundaries: "No client communication, HR, conduct, PM ranking, OMS, trade, execution, fills, or settlement capability is enabled.",
  },
  summaryInvocationDetail: {
    summaryInvocationId: "N/A",
    summaryRef: "N/A",
    scoreRunId: "N/A",
    reviewActionId: "N/A",
    invocationState: "N/A",
    workflowPack: "N/A",
    workflowRunId: "N/A",
    artifactRef: "N/A",
    requestedBy: "N/A",
    policy: "N/A",
    sourceRefs: "N/A",
    reasonCodes: "N/A",
    contentHash: "N/A",
    textBoundary: "Generated summary text, prompts, model responses, client communication, orders, and OMS execution are not exposed by Workbench.",
    operatingBoundaries: "Persisted invocation history only; no summary text, prompt, model response, client communication, order, trade, execution, fill, settlement, or OMS capability is enabled.",
  },
  operationEvidence: {
    operation: "Score-run evidence load",
    correlationId: "corr-score",
    contractVersion: "v1",
    sourceService: "lotus-manage",
    upstreamStatus: "200",
  },
  summaryPosture: {
    status: "Not requested",
    reviewState: "N/A",
    workflowAuthority: "N/A",
    runId: "N/A",
    requestedOutputs: "N/A",
    audience: "N/A",
    evidenceSource: "N/A",
    supportability: "N/A",
    boundary: "Support summary requires review; no autonomous PM ranking or HR/conduct decision",
  },
  summaryRequestReadinessState: "READY",
  summaryRequestReadiness: "Ready for score run pmq_run_001",
  scoreRunPreviewReadinessState: "READY",
  scoreRunPreviewReadiness: "Ready for policy pmq_sg_dpm / 2026.05",
  fairnessPreviewReadinessState: "READY",
  fairnessPreviewReadiness: "Ready: 2 source-defined segments from Manage",
};

function renderCard(overrides: Partial<PmOperatingQualityPanelModel> = {}) {
  const model = { ...baseModel, ...overrides };
  const actions = {
    onPreviewScoreRun: vi.fn(),
    onRequestSupportSummary: vi.fn(),
    onPreviewFairness: vi.fn(),
    onPersistFairness: vi.fn(),
  };
  render(
    <PmOperatingQualityScoreRunCard
      model={model}
      pendingScorePreview={false}
      pendingSummaryRequest={false}
      pendingFairnessPreview={false}
      pendingFairnessPersist={false}
      actionMessage="Preview returned Manage operating-quality evidence."
      actionError={null}
      fairnessCreateEvidence={{
        fairnessAnalysisId: "pmq_fair_002",
        correlationId: "corr-create",
        sourceService: "lotus-manage",
        upstreamStatus: "201",
      }}
      {...actions}
    />
  );
  return actions;
}

describe("PmOperatingQualityScoreRunCard", () => {
  it("renders score-run evidence and delegates Gateway-backed PM quality actions", () => {
    const actions = renderCard();

    expect(screen.getByRole("heading", { name: "Score-Run Evidence" })).toBeInTheDocument();
    expect(screen.getByLabelText("PM operating quality command readiness")).toHaveTextContent(
      "Ready for policy pmq_sg_dpm / 2026.05"
    );
    expect(screen.getByLabelText("PM operating quality operation evidence")).toHaveTextContent("corr-score");
    expect(screen.getByLabelText("PM operating quality persisted fairness create evidence")).toHaveTextContent(
      "pmq_fair_002"
    );
    expect(screen.getByLabelText("PM operating quality support summary status")).toHaveTextContent("Not requested");

    expect(
      screen.queryByRole("table", { name: "PM operating quality score runs" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("sha256:hidden")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview Score Run" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Support Summary" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview Fairness" }));
    fireEvent.click(screen.getByRole("button", { name: "Persist Fairness" }));

    expect(actions.onPreviewScoreRun).toHaveBeenCalledTimes(1);
    expect(actions.onRequestSupportSummary).toHaveBeenCalledTimes(1);
    expect(actions.onPreviewFairness).toHaveBeenCalledTimes(1);
    expect(actions.onPersistFairness).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /trade/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /oms/i })).not.toBeInTheDocument();
  });

  it("disables action buttons from source-owned readiness state and renders action error posture", () => {
    render(
      <PmOperatingQualityScoreRunCard
        model={{
          ...baseModel,
          scoreRunPreviewReadinessState: "BLOCKED",
          summaryRequestReadinessState: "BLOCKED",
          fairnessPreviewReadinessState: "BLOCKED",
        }}
        pendingScorePreview={false}
        pendingSummaryRequest={false}
        pendingFairnessPreview={false}
        pendingFairnessPersist={false}
        actionError={{
          body: "Blocked by Manage action register",
          status: "N/A",
          statusClass: "blocked",
          source: "Manage action register via Gateway supportability",
        }}
        onPreviewScoreRun={vi.fn()}
        onRequestSupportSummary={vi.fn()}
        onPreviewFairness={vi.fn()}
        onPersistFairness={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Preview Score Run" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Request Support Summary" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Preview Fairness" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Persist Fairness" })).toBeDisabled();
    expect(screen.getByLabelText("PM operating quality action error status")).toHaveTextContent("blocked");
  });
});
