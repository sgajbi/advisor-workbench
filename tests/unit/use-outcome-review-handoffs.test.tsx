import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDpmOutcomeReviewReportInput,
  requestDpmOutcomeReviewAiNarrative,
  submitDpmOutcomeReviewReportJob,
} from "../../src/features/workbench/outcome-review-api";
import { useOutcomeReviewHandoffs } from "../../src/features/workbench/use-outcome-review-handoffs";
import type {
  DpmOutcomeReviewHandoffResponse,
  DpmOutcomeReviewNarrativeResponse,
  ReportJobHandleResponse,
} from "../../src/features/workbench/types";
import type { OutcomeReviewListItem } from "../../src/features/workbench/outcome-review-view-model";

vi.mock("../../src/features/workbench/outcome-review-api", () => ({
  getDpmOutcomeReviewReportInput: vi.fn(),
  requestDpmOutcomeReviewAiNarrative: vi.fn(),
  submitDpmOutcomeReviewReportJob: vi.fn(),
}));

describe("useOutcomeReviewHandoffs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("submits outcome-review report jobs through Gateway and preserves the returned boundary", async () => {
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue(reportInputResponse());
    vi.mocked(submitDpmOutcomeReviewReportJob).mockResolvedValue(reportJobHandle());

    const { result } = renderHook(() =>
      useOutcomeReviewHandoffs({ primaryReview: reviewItem() }),
    );

    await act(async () => {
      await result.current.requestOutcomeReportJob();
    });

    expect(getDpmOutcomeReviewReportInput).toHaveBeenCalledWith("or_1");
    expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledWith({
      outcomeReviewId: "or_1",
      outcomeReportInput: reportInputResponse().data,
    });
    expect(result.current.handoffStatusMessages).toEqual(["Report request Accepted."]);
    expect(result.current.clientCommunicationBoundary).toMatchObject({
      boundaryId: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
      clientCommunicationProjected: false,
      clientApprovalProjected: false,
      requiredSourceProduct: "ClientCommunicationRecord:v1",
    });
  });

  it("requests advisor memo evidence through Gateway and keeps workflow-pack status display-only", async () => {
    vi.mocked(requestDpmOutcomeReviewAiNarrative).mockResolvedValue(aiNarrativeResponse());

    const { result } = renderHook(() =>
      useOutcomeReviewHandoffs({ primaryReview: reviewItem() }),
    );

    await act(async () => {
      await result.current.requestOutcomeAiNarrative();
    });

    expect(requestDpmOutcomeReviewAiNarrative).toHaveBeenCalledWith({
      outcomeReviewId: "or_1",
    });
    expect(result.current.handoffStatusMessages).toEqual(["Review request Completed."]);
    expect(result.current.clientCommunicationBoundary).toMatchObject({
      boundaryId: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
      clientCommunicationProjected: false,
      clientApprovalProjected: false,
      requiredSourceProduct: "ClientCommunicationRecord:v1",
    });
  });

  it("keeps blocked handoffs fail-closed without calling Gateway", async () => {
    const { result } = renderHook(() =>
      useOutcomeReviewHandoffs({
        primaryReview: {
          ...reviewItem(),
          reportInputBlocked: true,
          aiEvidenceBlocked: true,
        },
      }),
    );

    await act(async () => {
      await result.current.requestOutcomeReportJob();
      await result.current.requestOutcomeAiNarrative();
    });

    await waitFor(() => {
      expect(result.current.reportJobPending).toBe(false);
      expect(result.current.aiNarrativePending).toBe(false);
    });
    expect(result.current.reportJobAvailable).toBe(false);
    expect(result.current.aiNarrativeAvailable).toBe(false);
    expect(getDpmOutcomeReviewReportInput).not.toHaveBeenCalled();
    expect(submitDpmOutcomeReviewReportJob).not.toHaveBeenCalled();
    expect(requestDpmOutcomeReviewAiNarrative).not.toHaveBeenCalled();
  });
});

function reviewItem(): OutcomeReviewListItem {
  return {
    outcomeReviewId: "or_1",
    reviewLabel: "13 May 2026 review",
    state: "READY",
    overallOutcome: "READY_WITHIN_TOLERANCE",
    reviewWindow: "01 May 2026 - 13 May 2026",
    outcomeStatusLabel: "Within Mandate",
    reviewPostureLabel: "Ready for Advisor Review",
    driftImprovementLabel: "72.4%",
    mandateImpact: "Drift reduction achieved within tolerance.",
    clientRationale: "Outcome remains within mandate tolerance for advisor handoff.",
    portfolioId: "PB_SG_GLOBAL_BAL_001",
    rebalanceRunId: "rr_1",
    waveId: "wave_1",
    proofPackId: "ppack_1",
    expectedSnapshotHash: "sha256:expected",
    realizedSnapshotHash: "sha256:realized",
    retentionUntil: "2026-06-13T09:35:00Z",
    updatedAt: "2026-05-13T09:35:00Z",
    reportInputBlocked: false,
    aiEvidenceBlocked: false,
    clientCommunicationBoundary: null,
    dimensions: [],
    lineage: [],
  };
}

function reportInputResponse(): DpmOutcomeReviewHandoffResponse {
  return {
    correlation_id: "corr-report",
    contract_version: "v1",
    source_service: "lotus-manage",
    upstream_status: 200,
    supportability: {
      source_service: "lotus-manage",
      authority: "lotus-manage:RFC-0042",
      state: "SUPPORTED",
      reason_codes: [],
      blocked_actions: [],
      remediation_owner: null,
    },
    data: {
      outcome_review_id: "or_1",
      content_hash: "sha256:report-input",
      client_communication_boundary: clientCommunicationBoundary(),
    },
  };
}

function reportJobHandle(): ReportJobHandleResponse {
  return {
    report_request_id: "rrq_outcome_1",
    report_job_id: "rjob_outcome_1",
    status: "accepted",
    status_url: "/api/v1/report-jobs/rjob_outcome_1",
    idempotency_key: "outcome-review-or_1-pdf",
  };
}

function aiNarrativeResponse(): DpmOutcomeReviewNarrativeResponse {
  return {
    correlation_id: "corr-ai",
    contract_version: "v1",
    source_service: "lotus-ai",
    evidence_source_service: "lotus-manage",
    manage_upstream_status: 200,
    ai_upstream_status: 200,
    supportability: reportInputResponse().supportability,
    ai_evidence_input: {
      outcome_review_id: "or_1",
      content_hash: "sha256:ai-evidence",
      client_communication_boundary: clientCommunicationBoundary(),
    },
    narrative_request: {
      requested_outputs: ["pm_summary", "cio_summary", "control_summary", "evidence_gaps"],
      audience: ["portfolio_manager", "cio_office", "investment_control"],
    },
    data: {
      execution: { status: "COMPLETED" },
      workflow_pack_run: { run_id: "packrun_or_1", workflow_authority_owner: "lotus-manage" },
    },
  };
}

function clientCommunicationBoundary(): Record<string, unknown> {
  return {
    boundary_id: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
    supportability_state: "BLOCKED",
    client_communication_projected: false,
    client_approval_projected: false,
    reason_code: "OUTCOME_CLIENT_COMMUNICATION_NOT_SUPPORTED",
    blocked_capabilities: ["client_message_generation"],
    required_owner: "future client-communication owner",
    required_source_product: "ClientCommunicationRecord:v1",
    summary: "Manage does not publish client communication events for this outcome review.",
    content_hash: "sha256:client-communication-boundary",
  };
}
