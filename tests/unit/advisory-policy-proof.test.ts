import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const PORTFOLIO_ID = "PB_SG_GLOBAL_BAL_001";
const PROOF_MODULE_PATH: string = "../../scripts/live/validation/advisory-policy-proof.mjs";

type CanonicalScenario = ReturnType<typeof canonicalScenario>;
type ProofSummary = { apiChecks: unknown[]; workflowPackChecks: unknown[] };
type CreateCanonicalPolicyEvaluation = (args: {
  summary: ProofSummary;
  scenario: CanonicalScenario;
  gatewayBaseUrl: string;
  proposalId: string;
  proposalVersionId: string;
  timeoutMs: number;
}) => Promise<unknown>;

let createCanonicalPolicyEvaluation: CreateCanonicalPolicyEvaluation;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function canonicalScenario() {
  return {
    scenarioId: "RFC23_25_ADVISORY_PROPOSAL_POLICY_CANONICAL",
    policyPackId: "SG_PRIVATE_BANKING_REFERENCE",
    policyVersion: "2026.05",
    createdBy: "workbench-canonical-validator",
    expectedEvaluationStatus: "PENDING_REVIEW",
    expectedClientReadyPublication: "BLOCKED",
    evidenceBundle: {
      inputs: {
        portfolio_snapshot: {
          portfolio_id: PORTFOLIO_ID,
        },
      },
    },
  };
}

function policyPackVersionResponse(): Response {
  return jsonResponse({
    data: {
      policy_pack_version: {
        policy_pack: {
          content_hash: "policy-content-hash",
        },
      },
    },
  });
}

function createdEvaluationResponse({ portfolioId = PORTFOLIO_ID } = {}): Response {
  return jsonResponse({
    data: {
      record: {
        evaluation_id: "pev_001",
        evaluation_hash: "evaluation-hash",
        evaluation_status: "PENDING_REVIEW",
        portfolio_id: portfolioId,
      },
    },
  });
}

function reviewQueueResponse({ portfolioId = PORTFOLIO_ID } = {}): Response {
  return jsonResponse({
    data: {
      items: [
        {
          evaluation_id: "pev_001",
          evaluation_status: "PENDING_REVIEW",
          portfolio_id: portfolioId,
        },
      ],
      queue_posture: {
        client_ready_publication: "BLOCKED",
      },
    },
  });
}

function workflowResponse(): Response {
  return jsonResponse({
    data: {
      sign_off_status: "PENDING_REVIEW",
      client_ready_publication: "BLOCKED",
    },
  });
}

function signOffPackageResponse(): Response {
  return jsonResponse({
    data: {
      package_posture: {
        client_ready_publication: "BLOCKED",
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("advisory policy live proof", () => {
  beforeAll(async () => {
    const module = (await import(PROOF_MODULE_PATH)) as {
      createCanonicalPolicyEvaluation: CreateCanonicalPolicyEvaluation;
    };
    createCanonicalPolicyEvaluation = module.createCanonicalPolicyEvaluation;
  });

  it("uses maker-checker actors and portfolio-scoped review queue validation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(policyPackVersionResponse())
      .mockResolvedValueOnce(jsonResponse({ data: { status: "validated" } }))
      .mockResolvedValueOnce(jsonResponse({ data: { status: "active" } }))
      .mockResolvedValueOnce(createdEvaluationResponse())
      .mockResolvedValueOnce(reviewQueueResponse())
      .mockResolvedValueOnce(workflowResponse())
      .mockResolvedValueOnce(signOffPackageResponse())
      .mockResolvedValueOnce(jsonResponse({ data: { status: "recorded" } }));
    vi.stubGlobal("fetch", fetchMock);

    const summary = { apiChecks: [], workflowPackChecks: [] };

    await createCanonicalPolicyEvaluation({
      summary,
      scenario: canonicalScenario(),
      gatewayBaseUrl: "http://gateway.dev.lotus",
      proposalId: "proposal_001",
      proposalVersionId: "version_001",
      timeoutMs: 1000,
    });

    const validateBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    const activateBody = JSON.parse(fetchMock.mock.calls[2][1].body as string);
    expect(validateBody.body.requested_by).toBe("workbench-canonical-validator");
    expect(activateBody.body.activated_by).toBe("workbench-canonical-policy-checker");
    expect(activateBody.body.activated_by).not.toBe(validateBody.body.requested_by);

    const reviewQueueUrl = fetchMock.mock.calls[4][0].toString();
    expect(reviewQueueUrl).toContain("evaluation_status=PENDING_REVIEW");
    expect(reviewQueueUrl).toContain(`portfolio_id=${PORTFOLIO_ID}`);
    expect(summary.workflowPackChecks[0]).toMatchObject({
      actionType: "POLICY_EVALUATION_PENDING_REVIEW_CREATED",
      portfolioId: PORTFOLIO_ID,
      clientReadyPublication: "BLOCKED",
    });
  });

  it("rejects review queue responses that are not scoped to the canonical portfolio", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(policyPackVersionResponse())
      .mockResolvedValueOnce(jsonResponse({ data: { status: "validated" } }))
      .mockResolvedValueOnce(jsonResponse({ data: { status: "active" } }))
      .mockResolvedValueOnce(createdEvaluationResponse())
      .mockResolvedValueOnce(reviewQueueResponse({ portfolioId: "PB_OTHER_001" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCanonicalPolicyEvaluation({
        summary: { apiChecks: [], workflowPackChecks: [] },
        scenario: canonicalScenario(),
        gatewayBaseUrl: "http://gateway.dev.lotus",
        proposalId: "proposal_001",
        proposalVersionId: "version_001",
        timeoutMs: 1000,
      })
    ).rejects.toThrow(
      "Canonical policy review queue returned item outside portfolio scope PB_SG_GLOBAL_BAL_001"
    );
  });
});
