import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";
const PROOF_MODULE_PATH: string =
  "../../scripts/live/validation/advisor-cockpit-proof.mjs";

type ProofSummary = { apiChecks: unknown[]; workflowPackChecks: unknown[] };
type ValidateCanonicalAdvisorCockpit = (args: {
  summary: ProofSummary;
  scenario: {
    expectedClientReadyPublication: string;
  };
  gatewayBaseUrl: string;
  portfolioId: string;
  proposalId: string;
  proposalVersionId: string;
  timeoutMs: number;
}) => Promise<{
  actionItemId: string;
  actionItemVersion: number;
  actionCount: number;
  snapshotId: string;
  supportabilityPosture: string;
  clientReadyPublication: string;
}>;

let validateCanonicalAdvisorCockpit: ValidateCanonicalAdvisorCockpit;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function actionListResponse({
  actionItemId = "aci_policy_review_001",
  portfolioId = PORTFOLIO_ID,
  acknowledged = false,
} = {}): Response {
  return jsonResponse({
    data: {
      total_count: 1,
      items: [
        {
          action_item_id: actionItemId,
          action_item_version: 7,
          action_family: "POLICY_REVIEW_REQUIRED",
          status: "PENDING_REVIEW",
          portfolio_id: portfolioId,
          reason_codes: ["POLICY_PENDING_REVIEW", "CLIENT_READY_BLOCKED"],
          acknowledgement_state: acknowledged
            ? {
                acknowledged: true,
                acknowledgement_id: `ack_${actionItemId}`,
                acknowledged_by: "workbench-canonical-validator",
                acknowledged_at: "2026-05-27T00:00:00Z",
              }
            : { acknowledged: false },
        },
      ],
    },
  });
}

function snapshotResponse(): Response {
  return jsonResponse({
    data: {
      snapshot_id: "cockpit_snapshot_001",
      action_counts: {
        "status.PENDING_REVIEW": 1,
      },
      supportability: {
        client_ready_publication: "BLOCKED",
      },
    },
  });
}

function supportabilityResponse(): Response {
  return jsonResponse({
    data: {
      posture: "SUPPORTED_BY_LOTUS_WORKBENCH_RFC0026",
    },
  });
}

function acknowledgementResponse(): Response {
  return jsonResponse({
    data: {
      action_item: {
        action_item_id: "aci_policy_review_001",
      },
      acknowledgement: {
        acknowledged: true,
      },
      replayed: true,
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("advisor cockpit live proof", () => {
  beforeAll(async () => {
    const module = (await import(PROOF_MODULE_PATH)) as {
      validateCanonicalAdvisorCockpit: ValidateCanonicalAdvisorCockpit;
    };
    validateCanonicalAdvisorCockpit = module.validateCanonicalAdvisorCockpit;
  });

  it("validates action list, snapshot posture, supportability, and repeatable acknowledgement", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(actionListResponse())
      .mockResolvedValueOnce(snapshotResponse())
      .mockResolvedValueOnce(supportabilityResponse())
      .mockResolvedValueOnce(acknowledgementResponse());
    vi.stubGlobal("fetch", fetchMock);

    const summary = { apiChecks: [], workflowPackChecks: [] };

    const proof = await validateCanonicalAdvisorCockpit({
      summary,
      scenario: { expectedClientReadyPublication: "BLOCKED" },
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: PORTFOLIO_ID,
      proposalId: "proposal_001",
      proposalVersionId: "version_001",
      timeoutMs: 1000,
    });

    expect(proof).toMatchObject({
      actionItemId: "aci_policy_review_001",
      actionItemVersion: 7,
      actionCount: 1,
      snapshotId: "cockpit_snapshot_001",
      clientReadyPublication: "BLOCKED",
    });
    expect(fetchMock.mock.calls[0][0].toString()).toContain(
      `/api/v1/advisor-cockpit/actions?portfolio_id=${PORTFOLIO_ID}`,
    );
    expect(fetchMock.mock.calls[3][0].toString()).toContain(
      "/api/v1/advisor-cockpit/actions/aci_policy_review_001/acknowledgements",
    );
    expect(fetchMock.mock.calls[3][1].headers["Idempotency-Key"]).toMatch(
      /^wb-advisor-cockpit-ack-/,
    );
    expect(JSON.parse(fetchMock.mock.calls[3][1].body as string)).toMatchObject(
      {
        action_item_version: 7,
        acknowledged_by: "workbench-canonical-validator",
      },
    );
    expect(summary.workflowPackChecks[0]).toMatchObject({
      actionType: "ADVISOR_COCKPIT_ACTION_ACKNOWLEDGED",
      portfolioId: PORTFOLIO_ID,
      actionItemId: "aci_policy_review_001",
      clientReadyPublication: "BLOCKED",
      replayed: true,
    });
  });

  it("scopes acknowledgement idempotency keys to the action identity", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        actionListResponse({ actionItemId: "aci_policy_review_001" }),
      )
      .mockResolvedValueOnce(snapshotResponse())
      .mockResolvedValueOnce(supportabilityResponse())
      .mockResolvedValueOnce(acknowledgementResponse())
      .mockResolvedValueOnce(
        actionListResponse({ actionItemId: "aci_policy_review_002" }),
      )
      .mockResolvedValueOnce(snapshotResponse())
      .mockResolvedValueOnce(supportabilityResponse())
      .mockResolvedValueOnce(acknowledgementResponse());
    vi.stubGlobal("fetch", fetchMock);

    const baseArgs = {
      summary: { apiChecks: [], workflowPackChecks: [] },
      scenario: { expectedClientReadyPublication: "BLOCKED" },
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: PORTFOLIO_ID,
      proposalId: "proposal_001",
      proposalVersionId: "version_001",
      timeoutMs: 1000,
    };

    await validateCanonicalAdvisorCockpit(baseArgs);
    await validateCanonicalAdvisorCockpit({
      ...baseArgs,
      summary: { apiChecks: [], workflowPackChecks: [] },
    });

    expect(fetchMock.mock.calls[3][1].headers["Idempotency-Key"]).toMatch(
      /^wb-advisor-cockpit-ack-/,
    );
    expect(fetchMock.mock.calls[7][1].headers["Idempotency-Key"]).toMatch(
      /^wb-advisor-cockpit-ack-/,
    );
    expect(fetchMock.mock.calls[3][1].headers["Idempotency-Key"]).not.toBe(
      fetchMock.mock.calls[7][1].headers["Idempotency-Key"],
    );
  });

  it("treats already acknowledged source state as repeatable canonical proof", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(actionListResponse({ acknowledged: true }))
      .mockResolvedValueOnce(snapshotResponse())
      .mockResolvedValueOnce(supportabilityResponse());
    vi.stubGlobal("fetch", fetchMock);

    const summary = { apiChecks: [], workflowPackChecks: [] };

    const proof = await validateCanonicalAdvisorCockpit({
      summary,
      scenario: { expectedClientReadyPublication: "BLOCKED" },
      gatewayBaseUrl: "http://gateway.dev.lotus",
      portfolioId: PORTFOLIO_ID,
      proposalId: "proposal_001",
      proposalVersionId: "version_001",
      timeoutMs: 1000,
    });

    expect(proof.actionItemId).toBe("aci_policy_review_001");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      fetchMock.mock.calls.some((call) =>
        call[0].toString().includes("/acknowledgements"),
      ),
    ).toBe(false);
    expect(summary.workflowPackChecks[0]).toMatchObject({
      actionType: "ADVISOR_COCKPIT_ACTION_ACKNOWLEDGED",
      portfolioId: PORTFOLIO_ID,
      actionItemId: "aci_policy_review_001",
      alreadyAcknowledged: true,
      replayed: true,
    });
  });

  it("rejects action lists that escape the requested portfolio scope", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        actionListResponse({ portfolioId: "PB_OTHER_001" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      validateCanonicalAdvisorCockpit({
        summary: { apiChecks: [], workflowPackChecks: [] },
        scenario: { expectedClientReadyPublication: "BLOCKED" },
        gatewayBaseUrl: "http://gateway.dev.lotus",
        portfolioId: PORTFOLIO_ID,
        proposalId: "proposal_001",
        proposalVersionId: "version_001",
        timeoutMs: 1000,
      }),
    ).rejects.toThrow("Advisor cockpit returned out-of-scope action");
  });
});
