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
import { buildDpmAiWorkflowExecution } from "../fixtures/dpm-ai-workflow-fixtures";

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
    expect(result.current.handoffStatusMessages).toEqual([]);
    expect(result.current.aiNarrativeOutcome).toMatchObject({
      family: "outcome-narrative",
      disclosure: {
        availability: "live",
        humanReview: { state: "review-required" },
        clientUse: "internal-only",
      },
    });
    expect(result.current.clientCommunicationBoundary).toMatchObject({
      boundaryId: "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY",
      clientCommunicationProjected: false,
      clientApprovalProjected: false,
      requiredSourceProduct: "ClientCommunicationRecord:v1",
    });
  });

  it("keeps an earlier narrative completion outside the current outcome-review context", async () => {
    const firstRequest = deferred<DpmOutcomeReviewNarrativeResponse>();
    const secondRequest = deferred<DpmOutcomeReviewNarrativeResponse>();
    vi.mocked(requestDpmOutcomeReviewAiNarrative)
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let firstCompletion!: Promise<void>;
    act(() => {
      firstCompletion = result.current.requestOutcomeAiNarrative();
    });
    expect(result.current.aiNarrativePending).toBe(true);

    rerender({
      primaryReview: reviewItem({
        outcomeReviewId: "or_2",
        portfolioId: "PB_SG_INCOME_002",
        rebalanceRunId: "rr_2",
        waveId: "wave_2",
        proofPackId: "ppack_2",
        expectedSnapshotHash: "sha256:expected-2",
        realizedSnapshotHash: "sha256:realized-2",
        updatedAt: "2026-05-14T09:35:00Z",
      }),
    });

    expect(result.current.aiNarrativePending).toBe(false);
    expect(result.current.aiNarrativeOutcome).toBeNull();
    expect(result.current.clientCommunicationBoundary).toBeNull();

    let secondCompletion!: Promise<void>;
    act(() => {
      secondCompletion = result.current.requestOutcomeAiNarrative();
    });
    expect(requestDpmOutcomeReviewAiNarrative).toHaveBeenLastCalledWith({
      outcomeReviewId: "or_2",
    });

    await act(async () => {
      secondRequest.resolve(aiNarrativeResponse("or_2", "packrun_or_2"));
      await secondCompletion;
    });

    expect(result.current.aiNarrativeOutcome?.disclosure.diagnostics).toContainEqual({
      label: "Workflow run",
      value: "packrun_or_2",
    });
    expect(result.current.clientCommunicationBoundary?.boundaryId).toBe(
      "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY_or_2",
    );

    await act(async () => {
      firstRequest.resolve(aiNarrativeResponse("or_1", "packrun_or_1"));
      await firstCompletion;
    });

    expect(result.current.aiNarrativeOutcome?.disclosure.diagnostics).toContainEqual({
      label: "Workflow run",
      value: "packrun_or_2",
    });
    expect(result.current.clientCommunicationBoundary?.boundaryId).toBe(
      "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY_or_2",
    );
  });

  it("discards narrative evidence completed after the source review changes", async () => {
    const narrativeRequest = deferred<DpmOutcomeReviewNarrativeResponse>();
    vi.mocked(requestDpmOutcomeReviewAiNarrative).mockReturnValue(narrativeRequest.promise);

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let completion!: Promise<void>;
    act(() => {
      completion = result.current.requestOutcomeAiNarrative();
    });

    rerender({
      primaryReview: reviewItem({
        outcomeReviewId: "or_2",
        portfolioId: "PB_SG_INCOME_002",
      }),
    });

    await act(async () => {
      narrativeRequest.resolve(aiNarrativeResponse("or_1", "packrun_or_1"));
      await completion;
    });

    expect(result.current.aiNarrativeOutcome).toBeNull();
    expect(result.current.clientCommunicationBoundary).toBeNull();

    rerender({ primaryReview: reviewItem() });

    expect(result.current.aiNarrativePending).toBe(false);
    expect(result.current.aiNarrativeOutcome).toBeNull();
    expect(result.current.clientCommunicationBoundary).toBeNull();
  });

  it("allows a replacement narrative request after returning to an earlier review", async () => {
    const obsoleteRequest = deferred<DpmOutcomeReviewNarrativeResponse>();
    const replacementRequest = deferred<DpmOutcomeReviewNarrativeResponse>();
    vi.mocked(requestDpmOutcomeReviewAiNarrative)
      .mockReturnValueOnce(obsoleteRequest.promise)
      .mockReturnValueOnce(replacementRequest.promise);

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let obsoleteCompletion!: Promise<void>;
    act(() => {
      obsoleteCompletion = result.current.requestOutcomeAiNarrative();
    });

    rerender({
      primaryReview: reviewItem({
        outcomeReviewId: "or_2",
        portfolioId: "PB_SG_INCOME_002",
      }),
    });
    rerender({ primaryReview: reviewItem() });

    expect(result.current.aiNarrativePending).toBe(false);

    let replacementCompletion!: Promise<void>;
    act(() => {
      replacementCompletion = result.current.requestOutcomeAiNarrative();
    });

    expect(requestDpmOutcomeReviewAiNarrative).toHaveBeenCalledTimes(2);
    expect(result.current.aiNarrativePending).toBe(true);

    await act(async () => {
      obsoleteRequest.resolve(aiNarrativeResponse("or_1", "packrun_obsolete"));
      await obsoleteCompletion;
    });

    expect(result.current.aiNarrativePending).toBe(true);
    expect(result.current.aiNarrativeOutcome).toBeNull();

    await act(async () => {
      replacementRequest.resolve(aiNarrativeResponse("or_1", "packrun_replacement"));
      await replacementCompletion;
    });

    expect(result.current.aiNarrativePending).toBe(false);
    expect(result.current.aiNarrativeOutcome?.disclosure.diagnostics).toContainEqual({
      label: "Workflow run",
      value: "packrun_replacement",
    });
  });

  it("does not attach an earlier report handoff to a different review", async () => {
    const reportInput = deferred<DpmOutcomeReviewHandoffResponse>();
    vi.mocked(getDpmOutcomeReviewReportInput).mockReturnValue(reportInput.promise);
    vi.mocked(submitDpmOutcomeReviewReportJob).mockResolvedValue(reportJobHandle());

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let completion!: Promise<void>;
    act(() => {
      completion = result.current.requestOutcomeReportJob();
    });
    expect(result.current.reportJobPending).toBe(true);

    rerender({
      primaryReview: reviewItem({
        outcomeReviewId: "or_2",
        portfolioId: "PB_SG_INCOME_002",
      }),
    });
    expect(result.current.reportJobPending).toBe(false);

    await act(async () => {
      reportInput.resolve(reportInputResponse("or_1"));
      await completion;
    });

    expect(submitDpmOutcomeReviewReportJob).not.toHaveBeenCalled();
    expect(result.current.handoffStatusMessages).toEqual([]);
    expect(result.current.clientCommunicationBoundary).toBeNull();
  });

  it("discards a report completion when the source review changes after submission", async () => {
    const reportJob = deferred<ReportJobHandleResponse>();
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue(reportInputResponse());
    vi.mocked(submitDpmOutcomeReviewReportJob).mockReturnValue(reportJob.promise);

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let completion!: Promise<void>;
    act(() => {
      completion = result.current.requestOutcomeReportJob();
    });

    await waitFor(() => {
      expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledWith({
        outcomeReviewId: "or_1",
        outcomeReportInput: reportInputResponse().data,
      });
    });

    rerender({
      primaryReview: reviewItem({
        outcomeReviewId: "or_2",
        portfolioId: "PB_SG_INCOME_002",
      }),
    });

    await act(async () => {
      reportJob.resolve(reportJobHandle());
      await completion;
    });

    expect(result.current.handoffStatusMessages).toEqual([]);
    expect(result.current.clientCommunicationBoundary).toBeNull();

    rerender({ primaryReview: reviewItem() });

    expect(result.current.reportJobPending).toBe(false);
    expect(result.current.handoffStatusMessages).toEqual([]);
    expect(result.current.clientCommunicationBoundary).toBeNull();
  });

  it("does not let an obsolete report completion clear the selected review request", async () => {
    const firstReportJob = deferred<ReportJobHandleResponse>();
    const secondReportJob = deferred<ReportJobHandleResponse>();
    vi.mocked(getDpmOutcomeReviewReportInput)
      .mockResolvedValueOnce(reportInputResponse())
      .mockResolvedValueOnce(reportInputResponse("or_2"));
    vi.mocked(submitDpmOutcomeReviewReportJob)
      .mockReturnValueOnce(firstReportJob.promise)
      .mockReturnValueOnce(secondReportJob.promise);

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let firstCompletion!: Promise<void>;
    act(() => {
      firstCompletion = result.current.requestOutcomeReportJob();
    });
    await waitFor(() => {
      expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledTimes(1);
    });

    const secondReview = reviewItem({
      outcomeReviewId: "or_2",
      portfolioId: "PB_SG_INCOME_002",
    });
    rerender({ primaryReview: secondReview });

    let secondCompletion!: Promise<void>;
    act(() => {
      secondCompletion = result.current.requestOutcomeReportJob();
    });
    await waitFor(() => {
      expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      firstReportJob.resolve(reportJobHandle());
      await firstCompletion;
    });

    expect(result.current.reportJobPending).toBe(true);
    expect(result.current.handoffStatusMessages).toEqual([]);

    await act(async () => {
      secondReportJob.resolve(reportJobHandle());
      await secondCompletion;
    });

    expect(result.current.reportJobPending).toBe(false);
    expect(result.current.handoffStatusMessages).toEqual(["Report request Accepted."]);
  });

  it("allows a replacement report request after returning to an earlier review", async () => {
    const obsoleteReportJob = deferred<ReportJobHandleResponse>();
    const replacementReportJob = deferred<ReportJobHandleResponse>();
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue(reportInputResponse());
    vi.mocked(submitDpmOutcomeReviewReportJob)
      .mockReturnValueOnce(obsoleteReportJob.promise)
      .mockReturnValueOnce(replacementReportJob.promise);

    const { result, rerender } = renderHook(
      ({ primaryReview }) => useOutcomeReviewHandoffs({ primaryReview }),
      { initialProps: { primaryReview: reviewItem() } },
    );

    let obsoleteCompletion!: Promise<void>;
    act(() => {
      obsoleteCompletion = result.current.requestOutcomeReportJob();
    });
    await waitFor(() => {
      expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledTimes(1);
    });

    rerender({
      primaryReview: reviewItem({
        outcomeReviewId: "or_2",
        portfolioId: "PB_SG_INCOME_002",
      }),
    });
    rerender({ primaryReview: reviewItem() });

    expect(result.current.reportJobPending).toBe(false);

    let replacementCompletion!: Promise<void>;
    act(() => {
      replacementCompletion = result.current.requestOutcomeReportJob();
    });
    await waitFor(() => {
      expect(submitDpmOutcomeReviewReportJob).toHaveBeenCalledTimes(2);
    });

    expect(result.current.reportJobPending).toBe(true);

    await act(async () => {
      obsoleteReportJob.resolve(reportJobHandle());
      await obsoleteCompletion;
    });

    expect(result.current.reportJobPending).toBe(true);
    expect(result.current.handoffStatusMessages).toEqual([]);

    await act(async () => {
      replacementReportJob.resolve(reportJobHandle());
      await replacementCompletion;
    });

    expect(result.current.reportJobPending).toBe(false);
    expect(result.current.handoffStatusMessages).toEqual(["Report request Accepted."]);
  });

  it("rejects narrative evidence returned for a different outcome review", async () => {
    vi.mocked(requestDpmOutcomeReviewAiNarrative).mockResolvedValue(
      aiNarrativeResponse("or_2", "packrun_or_2"),
    );
    const { result } = renderHook(() =>
      useOutcomeReviewHandoffs({ primaryReview: reviewItem() }),
    );

    await act(async () => {
      await result.current.requestOutcomeAiNarrative();
    });

    expect(result.current.aiNarrativeOutcome).toBeNull();
    expect(result.current.clientCommunicationBoundary).toBeNull();
    expect(result.current.handoffStatusMessages).toEqual([
      "The returned evidence belongs to a different outcome review. Refresh this review before continuing.",
    ]);
  });

  it("rejects report input returned for a different outcome review", async () => {
    vi.mocked(getDpmOutcomeReviewReportInput).mockResolvedValue(reportInputResponse("or_2"));
    const { result } = renderHook(() =>
      useOutcomeReviewHandoffs({ primaryReview: reviewItem() }),
    );

    await act(async () => {
      await result.current.requestOutcomeReportJob();
    });

    expect(submitDpmOutcomeReviewReportJob).not.toHaveBeenCalled();
    expect(result.current.clientCommunicationBoundary).toBeNull();
    expect(result.current.handoffStatusMessages).toEqual([
      "The returned evidence belongs to a different outcome review. Refresh this review before continuing.",
    ]);
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

function reviewItem(overrides: Partial<OutcomeReviewListItem> = {}): OutcomeReviewListItem {
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
    ...overrides,
  };
}

function reportInputResponse(outcomeReviewId = "or_1"): DpmOutcomeReviewHandoffResponse {
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
      outcome_review_id: outcomeReviewId,
      content_hash: "sha256:report-input",
      client_communication_boundary: clientCommunicationBoundary(outcomeReviewId),
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

function aiNarrativeResponse(
  outcomeReviewId = "or_1",
  runId = "packrun_or_1",
): DpmOutcomeReviewNarrativeResponse {
  return {
    correlation_id: "corr-ai",
    contract_version: "v1",
    source_service: "lotus-ai",
    evidence_source_service: "lotus-manage",
    manage_upstream_status: 200,
    ai_upstream_status: 200,
    supportability: reportInputResponse().supportability,
    ai_evidence_input: {
      outcome_review_id: outcomeReviewId,
      content_hash: "sha256:ai-evidence",
      client_communication_boundary: clientCommunicationBoundary(outcomeReviewId),
    },
    narrative_request: {
      requested_outputs: ["pm_summary", "cio_summary", "control_summary", "evidence_gaps"],
      audience: ["portfolio_manager", "cio_office", "investment_control"],
    },
    data: buildDpmAiWorkflowExecution("outcome-narrative", { runId }),
  };
}

function clientCommunicationBoundary(outcomeReviewId = "or_1"): Record<string, unknown> {
  return {
    boundary_id:
      outcomeReviewId === "or_1"
        ? "DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY"
        : `DPM_OUTCOME_CLIENT_COMMUNICATION_BOUNDARY_${outcomeReviewId}`,
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}
