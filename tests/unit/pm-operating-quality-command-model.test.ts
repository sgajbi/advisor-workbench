import { describe, expect, it } from "vitest";

import {
  buildPmOperatingQualitySelectionKey,
  buildReviewActionRequest,
  buildReviewActionTargetOptions,
  buildSummaryInvocationRequest,
  pmOperatingQualitySelectionEquals,
  readPmOperatingQualitySelection,
  resolveReviewActionReadiness,
  resolveSummaryInvocationReadiness,
} from "../../src/features/workbench/pm-operating-quality-command-model";
import type { PmOperatingQualityPanelModel } from "../../src/features/workbench/pm-operating-quality-view-model";

const model = {
  policyId: "pmq_sg_dpm",
  policyVersion: "2026.05",
  selectedScoreRun: { scoreRunId: "run-2" },
  selectedFairnessAnalysis: { fairnessAnalysisId: "fairness-2" },
  selectedReviewAction: { reviewActionId: "review-2" },
  reviewActionDetail: { reviewActionId: "review-1" },
  scoreRunRows: [
    {
      scoreRunId: "run-2",
      pmId: "PM_SG_002",
      bookId: "INCOME_BOOK",
      state: "REVIEW_REQUIRED",
      asOfDate: "2026-05-13",
    },
  ],
  fairnessAnalysisRows: [
    {
      fairnessAnalysisId: "fairness-2",
      policy: "pmq_sg_dpm / 2026.05",
      state: "PENDING_REVIEW",
      asOfDate: "2026-05-14",
    },
  ],
  reviewActionRows: [],
} as unknown as PmOperatingQualityPanelModel;

describe("PM operating quality command model", () => {
  it("creates a stable identity for the three selected record families", () => {
    const selection = readPmOperatingQualitySelection(model);

    expect(selection).toEqual({
      scoreRunId: "run-2",
      fairnessAnalysisId: "fairness-2",
      reviewActionId: "review-2",
    });
    expect(buildPmOperatingQualitySelectionKey(selection)).toBe(
      "run-2|fairness-2|review-2"
    );
    expect(pmOperatingQualitySelectionEquals(selection, { ...selection })).toBe(true);
    expect(
      pmOperatingQualitySelectionEquals(selection, { ...selection, scoreRunId: "run-1" })
    ).toBe(false);
  });

  it("builds review commands from the chosen source record and its governed date", () => {
    const form = {
      actorId: "supervisor_sg_2",
      targetType: "FAIRNESS_ANALYSIS",
      targetId: "fairness-2",
      actionType: "REQUEST_EVIDENCE_REMEDIATION",
      actionState: "REVIEW_REQUIRED",
      reviewActionRef: "PMQ-RA-002",
      boundedRationale: "Request source-owned evidence remediation.",
    };

    expect(
      resolveReviewActionReadiness({
        form,
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        blockedActions: [],
      })
    ).toEqual({
      state: "READY",
      detail: "Ready to preview fairness analysis fairness-2",
    });
    expect(buildReviewActionRequest(form, model)).toMatchObject({
      target_type: "FAIRNESS_ANALYSIS",
      target_id: "fairness-2",
      as_of_date: "2026-05-14",
      policy_id: "pmq_sg_dpm",
      policy_version: "2026.05",
    });
    expect(buildReviewActionTargetOptions(model)).toHaveLength(2);
  });

  it("keeps summary invocation readiness and optional evidence normalization deterministic", () => {
    const form = {
      requestedBy: "supervisor_sg_2",
      summaryRef: "PMQ-SUMMARY-run-2",
      scoreRunId: "run-2",
      reviewActionId: "review-2",
      invocationState: "PENDING_REVIEW",
      workflowPackName: "pm-operating-quality-summary",
      workflowPackVersion: "2026.05",
      workflowRunId: "  ",
      artifactRef: "artifact://pmq/002",
      contentHash: " ",
    };

    expect(
      resolveSummaryInvocationReadiness({
        form,
        policyId: model.policyId,
        policyVersion: model.policyVersion,
        blockedActions: [],
      }).state
    ).toBe("READY");
    expect(buildSummaryInvocationRequest(form)).toEqual({
      score_run_id: "run-2",
      review_action_id: "review-2",
      invocation_state: "PENDING_REVIEW",
      summary_ref: "PMQ-SUMMARY-run-2",
      workflow_pack_name: "pm-operating-quality-summary",
      workflow_pack_version: "2026.05",
      workflow_run_id: undefined,
      summary_artifact_ref: "artifact://pmq/002",
      summary_content_hash: undefined,
      requested_by: "supervisor_sg_2",
      source_refs: [],
    });
  });
});
