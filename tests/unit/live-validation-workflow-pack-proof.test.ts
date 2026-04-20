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
  }) => Promise<void>;
};

function createSummary() {
  return {
    apiChecks: [],
    workflowPackChecks: [],
  };
}

describe("live validation workflow-pack proof", () => {
  it("records advisor-brief review-action lineage checks for accept, supersede, and revise", async () => {
    const summary = createSummary();
    const getCalls: string[] = [];
    const postCalls: Array<{ url: string; body: Record<string, unknown> }> = [];

    await validateAdvisorBriefWorkflowPackReviewChain({
      summary,
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      canonicalAsOfDate: "2026-04-10",
      timeoutMs: 1000,
      fetchJson: async (_summary: unknown, url: string) => {
        getCalls.push(url);
        if (url.includes("report_start_date=2026-02-01")) {
          return {
            workflow_pack_run: {
              run_id: "packrun-revise-replacement",
              review_state: "AWAITING_REVIEW",
            },
          };
        }
        if (url.includes("detail_basis=NET") && url.includes("period=EXPLICIT")) {
          return { workflow_pack_run: { run_id: "packrun-explicit-net", review_state: "AWAITING_REVIEW" } };
        }
        if (url.includes("detail_basis=GROSS") && url.includes("period=EXPLICIT")) {
          return { workflow_pack_run: { run_id: "packrun-explicit-gross", review_state: "AWAITING_REVIEW" } };
        }
        if (url.includes("detail_basis=GROSS") && url.includes("period=YTD")) {
          return { workflow_pack_run: { run_id: "packrun-ytd-gross", review_state: "AWAITING_REVIEW" } };
        }
        return { workflow_pack_run: { run_id: "packrun-explicit-net", review_state: "AWAITING_REVIEW" } };
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
          return {
            workflow_pack_run: {
              run_id: "packrun-ytd-net",
              review_state: "ACCEPTED",
              supportability_status: "READY",
            },
          };
        }
        if (body.action_type === "SUPERSEDE") {
          return {
            workflow_pack_run: {
              run_id: "packrun-explicit-net",
              review_state: "SUPERSEDED",
              supportability_status: "HISTORICAL",
              superseded: true,
              replacement_run_id: body.replacement_run_id,
            },
          };
        }
        return {
          workflow_pack_run: {
            run_id: "packrun-ytd-gross",
            review_state: "REVISED",
            supportability_status: "HISTORICAL",
            superseded: true,
            replacement_run_id: body.replacement_run_id,
          },
        };
      },
    });

    expect(getCalls).toHaveLength(4);
    expect(postCalls).toEqual([
      expect.objectContaining({
        url: expect.stringContaining("/performance/advisor-brief/review-actions?period=YTD"),
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
        sourceRunId: "packrun-ytd-net",
        resultReviewState: "ACCEPTED",
        resultSupportabilityStatus: "READY",
      }),
      expect.objectContaining({
        actionType: "SUPERSEDE",
        sourceRunId: "packrun-explicit-net",
        replacementRunId: "packrun-explicit-gross",
        resultReviewState: "SUPERSEDED",
        resultSupportabilityStatus: "HISTORICAL",
      }),
      expect.objectContaining({
        actionType: "REVISE",
        sourceRunId: "packrun-ytd-gross",
        replacementRunId: "packrun-revise-replacement",
        resultReviewState: "REVISED",
        resultSupportabilityStatus: "HISTORICAL",
      }),
    ]);
  });

  it("accepts truthfully action-required accept posture when the run remains degraded", async () => {
    const summary = createSummary();

    await validateAdvisorBriefWorkflowPackReviewChain({
      summary,
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: "PB_SG_GLOBAL_BAL_001",
      benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
      canonicalAsOfDate: "2026-04-10",
      timeoutMs: 1000,
      fetchJson: async (_summary: unknown, url: string) => {
        if (url.includes("report_start_date=2026-02-01")) {
          return { workflow_pack_run: { run_id: "packrun-revise-replacement", review_state: "AWAITING_REVIEW" } };
        }
        if (url.includes("detail_basis=NET") && url.includes("period=EXPLICIT")) {
          return { workflow_pack_run: { run_id: "packrun-explicit-net", review_state: "AWAITING_REVIEW" } };
        }
        if (url.includes("detail_basis=GROSS") && url.includes("period=EXPLICIT")) {
          return { workflow_pack_run: { run_id: "packrun-explicit-gross", review_state: "AWAITING_REVIEW" } };
        }
        if (url.includes("detail_basis=GROSS") && url.includes("period=YTD")) {
          return { workflow_pack_run: { run_id: "packrun-ytd-gross", review_state: "AWAITING_REVIEW" } };
        }
        return { workflow_pack_run: { run_id: "packrun-ytd-net", review_state: "AWAITING_REVIEW" } };
      },
      postJson: async (
        _summary: unknown,
        _url: string,
        _description: string,
        _timeoutMs: number,
        body: Record<string, unknown>
      ) => {
        if (body.action_type === "ACCEPT") {
          return {
            workflow_pack_run: {
              run_id: "packrun-ytd-net",
              review_state: "ACCEPTED",
              supportability_status: "ACTION_REQUIRED",
              superseded: false,
            },
          };
        }
        if (body.action_type === "SUPERSEDE") {
          return {
            workflow_pack_run: {
              run_id: "packrun-explicit-net",
              review_state: "SUPERSEDED",
              supportability_status: "HISTORICAL",
              superseded: true,
              replacement_run_id: body.replacement_run_id,
            },
          };
        }
        return {
          workflow_pack_run: {
            run_id: "packrun-ytd-gross",
            review_state: "REVISED",
            supportability_status: "HISTORICAL",
            superseded: true,
            replacement_run_id: body.replacement_run_id,
          },
        };
      },
    });

    expect(summary.workflowPackChecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          actionType: "ACCEPT",
          sourceRunId: "packrun-ytd-net",
          resultReviewState: "ACCEPTED",
          resultSupportabilityStatus: "ACTION_REQUIRED",
        }),
      ])
    );
  });
});
