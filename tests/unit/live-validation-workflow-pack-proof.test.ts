// @ts-expect-error The live validator proof helper is authored as .mjs and exercised here at runtime.
import * as workflowPackProofModule from "../../scripts/live/validation/workflow-pack-proof.mjs";

const {
  validateAdvisorBriefWorkflowPackReviewChain,
} = workflowPackProofModule as {
  validateAdvisorBriefWorkflowPackReviewChain: (options: {
    summary: { apiChecks: unknown[]; workflowPackChecks: unknown[] };
    gatewayBaseUrl: string;
    portfolioId: string;
    benchmarkCode: string;
    canonicalStartDate: string;
    canonicalAsOfDate: string;
    timeoutMs: number;
    fetchJson: (
      summary: unknown,
      url: string,
      description: string,
      timeoutMs: number,
    ) => Promise<unknown>;
    postJson: (
      summary: unknown,
      url: string,
      description: string,
      timeoutMs: number,
      body: Record<string, unknown>,
    ) => Promise<unknown>;
    preRecordedAcceptReviewer?: string;
  }) => Promise<void>;
};

function createSummary() {
  return {
    apiChecks: [],
    workflowPackChecks: [],
  };
}

function createTaskFlow({
  taskFlowId,
  runId,
  reviewState,
  flowStatus,
  supportabilityStatus,
  replacementRunId,
  handoffStatus,
}: {
  taskFlowId: string;
  runId: string;
  reviewState: string;
  flowStatus: string;
  supportabilityStatus: string;
  replacementRunId?: unknown;
  handoffStatus?: string;
}) {
  return {
    task_flow_id: taskFlowId,
    run_refs: [runId],
    review_states: {
      [runId]: reviewState,
    },
    flow_status: flowStatus,
    supportability_status: supportabilityStatus,
    replacement_lineage:
      replacementRunId === undefined ? [] : [{ replacement_run_id: replacementRunId }],
    handoff_refs: handoffStatus === undefined ? [] : [{ status: handoffStatus }],
  };
}

function createAdvisorBriefPayload({
  runId,
  reviewState = "AWAITING_REVIEW",
  supportabilityStatus,
  runtimeState = "COMPLETED",
  allowedReviewActions = ["ACCEPT", "REJECT", "REVISE", "SUPERSEDE", "ABANDON"],
  superseded,
  replacementRunId,
  taskFlowId,
  taskFlowStatus = "AWAITING_REVIEW",
  taskFlowSupportabilityStatus = "ACTION_REQUIRED",
  handoffStatus,
  latestReviewActor,
}: {
  runId: string;
  reviewState?: string;
  supportabilityStatus?: string;
  runtimeState?: string;
  allowedReviewActions?: string[];
  superseded?: boolean;
  replacementRunId?: unknown;
  taskFlowId: string;
  taskFlowStatus?: string;
  taskFlowSupportabilityStatus?: string;
  handoffStatus?: string;
  latestReviewActor?: string;
}) {
  return {
    workflow_pack_run: {
      run_id: runId,
      runtime_state: runtimeState,
      review_state: reviewState,
      allowed_review_actions: allowedReviewActions,
      ...(supportabilityStatus === undefined
        ? {}
        : { supportability_status: supportabilityStatus }),
      ...(superseded === undefined ? {} : { superseded }),
      ...(replacementRunId === undefined ? {} : { replacement_run_id: replacementRunId }),
      ...(latestReviewActor === undefined
        ? {}
        : {
            latest_review_actor: latestReviewActor,
            latest_review_event_at: "2026-04-21T03:22:00Z",
            review_transition_count: 1,
            has_review_history: true,
            review_pending: false,
          }),
    },
    workflow_pack_task_flow: createTaskFlow({
      taskFlowId,
      runId,
      reviewState,
      flowStatus: taskFlowStatus,
      supportabilityStatus: taskFlowSupportabilityStatus,
      replacementRunId,
      handoffStatus,
    }),
  };
}

function createFetchAdvisorBriefPayload() {
  return (url: string) => {
    if (url.includes("report_start_date=2026-02-01")) {
      return createAdvisorBriefPayload({
        runId: "packrun-revise-replacement",
        taskFlowId: "taskflow-revise-replacement",
      });
    }
    if (url.includes("detail_basis=NET") && url.includes("period=EXPLICIT")) {
      return createAdvisorBriefPayload({
        runId: "packrun-explicit-net",
        taskFlowId: "taskflow-explicit-net",
      });
    }
    if (url.includes("detail_basis=GROSS") && url.includes("period=EXPLICIT")) {
      return createAdvisorBriefPayload({
        runId: "packrun-explicit-gross",
        taskFlowId: "taskflow-explicit-gross",
      });
    }
    return createAdvisorBriefPayload({
      runId: "packrun-explicit-net",
      taskFlowId: "taskflow-explicit-net",
    });
  };
}

describe("live validation workflow-pack proof", () => {
  it("records advisor-brief review-action lineage checks for accept, supersede, and revise", async () => {
    const summary = createSummary();
    const getCalls: string[] = [];
    const postCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchAdvisorBriefPayload = createFetchAdvisorBriefPayload();

    await validateAdvisorBriefWorkflowPackReviewChain({
      summary,
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      canonicalStartDate: "2025-03-31",
      canonicalAsOfDate: "2026-04-10",
      timeoutMs: 1000,
      fetchJson: async (_summary: unknown, url: string) => {
        getCalls.push(url);
        return fetchAdvisorBriefPayload(url);
      },
      postJson: async (
        _summary: unknown,
        url: string,
        _description: string,
        _timeoutMs: number,
        body: Record<string, unknown>
      ) => {
        postCalls.push({ url, body });
        if (body.action_type === "ACCEPT") {
          return createAdvisorBriefPayload({
            runId: "packrun-explicit-net",
            reviewState: "ACCEPTED",
            supportabilityStatus: "READY",
            taskFlowId: "taskflow-explicit-net",
            taskFlowStatus: "COMPLETED",
            taskFlowSupportabilityStatus: "READY",
            handoffStatus: "READY_FOR_HANDOFF",
            latestReviewActor: "live.validator.accept",
          });
        }
        if (body.action_type === "SUPERSEDE") {
          return createAdvisorBriefPayload({
            runId: "packrun-explicit-net",
            reviewState: "SUPERSEDED",
            supportabilityStatus: "HISTORICAL",
            superseded: true,
            replacementRunId: body.replacement_run_id,
            taskFlowId: "taskflow-explicit-net",
            taskFlowStatus: "SUPERSEDED",
            taskFlowSupportabilityStatus: "HISTORICAL",
          });
        }
        return createAdvisorBriefPayload({
          runId: "packrun-explicit-gross",
          reviewState: "REVISED",
          supportabilityStatus: "HISTORICAL",
          superseded: true,
          replacementRunId: body.replacement_run_id,
          taskFlowId: "taskflow-explicit-gross",
          taskFlowStatus: "SUPERSEDED",
          taskFlowSupportabilityStatus: "HISTORICAL",
        });
      },
    });

    expect(getCalls).toHaveLength(5);
    expect(postCalls).toEqual([
      expect.objectContaining({
        url: expect.stringContaining("/performance/advisor-brief/review-actions?period=EXPLICIT"),
        body: expect.objectContaining({ action_type: "ACCEPT" }),
      }),
      expect.objectContaining({
        body: expect.objectContaining({
          action_type: "SUPERSEDE",
          replacement_run_id: "packrun-explicit-gross",
        }),
      }),
      expect.objectContaining({
        body: expect.objectContaining({
          action_type: "REVISE",
          replacement_run_id: "packrun-revise-replacement",
        }),
      }),
    ]);
    expect(summary.workflowPackChecks).toEqual([
      expect.objectContaining({
        actionType: "ACCEPT",
        sourceRunId: "packrun-explicit-net",
        taskFlowId: "taskflow-explicit-net",
        taskFlowStatus: "COMPLETED",
        taskFlowSupportabilityStatus: "READY",
        resultReviewState: "ACCEPTED",
        resultSupportabilityStatus: "READY",
      }),
      expect.objectContaining({
        actionType: "SUPERSEDE",
        sourceRunId: "packrun-explicit-net",
        replacementRunId: "packrun-explicit-gross",
        taskFlowId: "taskflow-explicit-net",
        taskFlowStatus: "SUPERSEDED",
        taskFlowSupportabilityStatus: "HISTORICAL",
        resultReviewState: "SUPERSEDED",
        resultSupportabilityStatus: "HISTORICAL",
      }),
      expect.objectContaining({
        actionType: "REVISE",
        sourceRunId: "packrun-explicit-gross",
        replacementRunId: "packrun-revise-replacement",
        taskFlowId: "taskflow-explicit-gross",
        taskFlowStatus: "SUPERSEDED",
        taskFlowSupportabilityStatus: "HISTORICAL",
        resultReviewState: "REVISED",
        resultSupportabilityStatus: "HISTORICAL",
      }),
    ]);
  });

  it("verifies the browser-recorded acceptance before continuing API lineage proof", async () => {
    const summary = createSummary();
    const postCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const fetchAdvisorBriefPayload = createFetchAdvisorBriefPayload();

    await validateAdvisorBriefWorkflowPackReviewChain({
      summary,
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      canonicalStartDate: "2025-03-31",
      canonicalAsOfDate: "2026-04-10",
      timeoutMs: 1000,
      preRecordedAcceptReviewer: "live.validator.ui",
      fetchJson: async (_summary: unknown, url: string) => {
        if (
          url.includes("detail_basis=NET") &&
          url.includes("report_start_date=2025-03-31")
        ) {
          return createAdvisorBriefPayload({
            runId: "packrun-explicit-net",
            reviewState: "ACCEPTED",
            allowedReviewActions: [],
            supportabilityStatus: "READY",
            taskFlowId: "taskflow-explicit-net",
            taskFlowStatus: "COMPLETED",
            taskFlowSupportabilityStatus: "READY",
            handoffStatus: "READY_FOR_HANDOFF",
            latestReviewActor: "live.validator.ui",
          });
        }
        return fetchAdvisorBriefPayload(url);
      },
      postJson: async (
        _summary: unknown,
        url: string,
        _description: string,
        _timeoutMs: number,
        body: Record<string, unknown>
      ) => {
        postCalls.push({ url, body });
        if (body.action_type === "SUPERSEDE") {
          return createAdvisorBriefPayload({
            runId: "packrun-explicit-net",
            reviewState: "SUPERSEDED",
            supportabilityStatus: "HISTORICAL",
            superseded: true,
            replacementRunId: body.replacement_run_id,
            taskFlowId: "taskflow-explicit-net",
            taskFlowStatus: "SUPERSEDED",
            taskFlowSupportabilityStatus: "HISTORICAL",
          });
        }
        return createAdvisorBriefPayload({
          runId: "packrun-explicit-gross",
          reviewState: "REVISED",
          supportabilityStatus: "HISTORICAL",
          superseded: true,
          replacementRunId: body.replacement_run_id,
          taskFlowId: "taskflow-explicit-gross",
          taskFlowStatus: "SUPERSEDED",
          taskFlowSupportabilityStatus: "HISTORICAL",
        });
      },
    });

    expect(postCalls.map(({ body }) => body.action_type)).toEqual([
      "SUPERSEDE",
      "REVISE",
    ]);
    expect(summary.workflowPackChecks[0]).toEqual(
      expect.objectContaining({
        actionType: "ACCEPT",
        sourceRunId: "packrun-explicit-net",
        resultReviewState: "ACCEPTED",
        proofSource: "source-confirmed-browser-action",
      })
    );
  });

  it("accepts truthfully action-required accept posture when the run remains degraded", async () => {
    const summary = createSummary();
    const fetchAdvisorBriefPayload = createFetchAdvisorBriefPayload();

    await validateAdvisorBriefWorkflowPackReviewChain({
      summary,
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      canonicalStartDate: "2025-03-31",
      canonicalAsOfDate: "2026-04-10",
      timeoutMs: 1000,
      fetchJson: async (_summary: unknown, url: string) => {
        return fetchAdvisorBriefPayload(url);
      },
      postJson: async (
        _summary: unknown,
        _url: string,
        _description: string,
        _timeoutMs: number,
        body: Record<string, unknown>
      ) => {
        if (body.action_type === "ACCEPT") {
          return createAdvisorBriefPayload({
            runId: "packrun-explicit-net",
            reviewState: "ACCEPTED",
            supportabilityStatus: "ACTION_REQUIRED",
            superseded: false,
            taskFlowId: "taskflow-explicit-net",
            taskFlowStatus: "COMPLETED",
            taskFlowSupportabilityStatus: "READY",
            handoffStatus: "READY_FOR_HANDOFF",
            latestReviewActor: "live.validator.accept",
          });
        }
        if (body.action_type === "SUPERSEDE") {
          return createAdvisorBriefPayload({
            runId: "packrun-explicit-net",
            reviewState: "SUPERSEDED",
            supportabilityStatus: "HISTORICAL",
            superseded: true,
            replacementRunId: body.replacement_run_id,
            taskFlowId: "taskflow-explicit-net",
            taskFlowStatus: "SUPERSEDED",
            taskFlowSupportabilityStatus: "HISTORICAL",
          });
        }
        return createAdvisorBriefPayload({
          runId: "packrun-explicit-gross",
          reviewState: "REVISED",
          supportabilityStatus: "HISTORICAL",
          superseded: true,
          replacementRunId: body.replacement_run_id,
          taskFlowId: "taskflow-explicit-gross",
          taskFlowStatus: "SUPERSEDED",
          taskFlowSupportabilityStatus: "HISTORICAL",
        });
      },
    });

    expect(summary.workflowPackChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "ACCEPT",
          sourceRunId: "packrun-explicit-net",
          taskFlowId: "taskflow-explicit-net",
          taskFlowStatus: "COMPLETED",
          taskFlowSupportabilityStatus: "READY",
          resultReviewState: "ACCEPTED",
          resultSupportabilityStatus: "ACTION_REQUIRED",
        }),
      ])
    );
  });

  it("records degraded advisor-brief review posture without posting an invalid action", async () => {
    const summary = createSummary();
    const getCalls: string[] = [];
    const postCalls: Array<{ url: string; body: Record<string, unknown> }> = [];

    await validateAdvisorBriefWorkflowPackReviewChain({
      summary,
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      canonicalStartDate: "2025-03-31",
      canonicalAsOfDate: "2026-04-10",
      timeoutMs: 1000,
      fetchJson: async (_summary: unknown, url: string) => {
        getCalls.push(url);
        return createAdvisorBriefPayload({
          runId: "packrun-explicit-net-failed",
          runtimeState: "FAILED",
          reviewState: "AWAITING_REVIEW",
          allowedReviewActions: [],
          supportabilityStatus: "ACTION_REQUIRED",
          taskFlowId: "taskflow-explicit-net-failed",
          taskFlowStatus: "FAILED",
          taskFlowSupportabilityStatus: "ACTION_REQUIRED",
        });
      },
      postJson: async (
        _summary: unknown,
        url: string,
        _description: string,
        _timeoutMs: number,
        body: Record<string, unknown>
      ) => {
        postCalls.push({ url, body });
        throw new Error("postJson should not be called for a non-reviewable run.");
      },
    });

    expect(getCalls).toHaveLength(1);
    expect(postCalls).toEqual([]);
    expect(summary.workflowPackChecks).toEqual([
      expect.objectContaining({
        actionType: "ACCEPT",
        sourceRunId: "packrun-explicit-net-failed",
        taskFlowId: "taskflow-explicit-net-failed",
        taskFlowStatus: "FAILED",
        taskFlowSupportabilityStatus: "ACTION_REQUIRED",
        resultReviewState: "AWAITING_REVIEW",
        resultSupportabilityStatus: "ACTION_REQUIRED",
        skipped: true,
        runtimeState: "FAILED",
        allowedReviewActions: [],
      }),
    ]);
  });
});
