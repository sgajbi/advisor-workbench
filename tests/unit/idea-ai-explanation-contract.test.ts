import { describe, expect, it } from "vitest";

import { parseAdvisorIdeaAIExplanationResponse } from "../../src/features/proposals/idea-ai-explanation-contract";

const EVIDENCE_IDENTITY = {
  evidencePacketId: "evidence-001",
  evidenceContentHash: "sha256:evidence-001",
  sourceRevisionVectorDigest: "sha256:revision-001",
};

function response(overrides: Record<string, unknown> = {}) {
  return {
    status: "EXPLANATION_SERVED",
    disposition: "executed",
    lotusAiRunId: "wpr_idea_explanation_001",
    lotusAiRuntimeExecutionConfirmed: true,
    evaluationVerdict: "accepted",
    explanation: {
      requestId: "request-001",
      candidateId: "idea-001",
      posture: "ready_for_advisor_review",
      verifierOutcome: "passed",
      explanationText: "Cash weight is above the idle-liquidity policy threshold.",
      fallbackUsed: false,
      fallbackReason: null,
      grantsDownstreamAuthority: false,
      supportedFeaturePromoted: false,
      executionProvenancePosture: "unattested_local_test_fixture",
      aiLineageRecorded: true,
      verifiedOutput: {
        groundedClaims: [
          {
            claimId: "claim-001",
            claimText: "Cash weight is above the idle-liquidity policy threshold.",
            sourceRefs: [
              {
                productId: "lotus-core:PortfolioStateSnapshot:v1",
                sourceSystem: "lotus-core",
                productVersion: "v1",
                asOfDate: "2026-06-21",
                freshness: "current",
                dataQualityStatus: "complete",
              },
            ],
          },
        ],
      },
      redactedEvidence: {
        ...EVIDENCE_IDENTITY,
        reasonCodes: ["high_cash_ratio"],
        unsupportedReasons: [],
        scorePolicyVersion: "idle-liquidity-v2",
        sourceRefs: [],
      },
    },
    ...overrides,
  };
}

describe("parseAdvisorIdeaAIExplanationResponse", () => {
  it("preserves the typed source rationale and evidence fields", () => {
    const result = parseAdvisorIdeaAIExplanationResponse(response(), {
      candidateId: "idea-001",
      evidenceIdentity: EVIDENCE_IDENTITY,
      requestId: "request-001",
    });

    expect(result.explanation.verifiedOutput?.groundedClaims[0]).toMatchObject({
      claimId: "claim-001",
      sourceRefs: [{ sourceSystem: "lotus-core" }],
    });
    expect(result.explanation.redactedEvidence?.scorePolicyVersion).toBe(
      "idle-liquidity-v2",
    );
  });

  it.each([
    ["evidence packet", { evidencePacketId: "evidence-other" }],
    ["evidence content", { evidenceContentHash: "sha256:evidence-other" }],
    ["source revision", { sourceRevisionVectorDigest: "sha256:revision-other" }],
  ])("rejects mismatched %s identity", (_name, evidenceOverride) => {
    const value = response();
    value.explanation.redactedEvidence = {
      ...value.explanation.redactedEvidence,
      ...evidenceOverride,
    };

    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(value, {
        candidateId: "idea-001",
        evidenceIdentity: EVIDENCE_IDENTITY,
        requestId: "request-001",
      }),
    ).toThrow(/did not match the requested candidate evidence/);
  });

  it("rejects an explanation without source revision identity", () => {
    const value = response();
    const redactedEvidence = value.explanation.redactedEvidence as Record<
      string,
      unknown
    >;
    delete redactedEvidence.sourceRevisionVectorDigest;

    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(value, {
        candidateId: "idea-001",
        evidenceIdentity: EVIDENCE_IDENTITY,
        requestId: "request-001",
      }),
    ).toThrow();
  });

  it.each([
    ["mismatched candidate", { candidateId: "idea-other" }],
    ["mismatched request", { requestId: "request-other" }],
    ["downstream authority", { grantsDownstreamAuthority: true }],
    ["unsupported promotion", { supportedFeaturePromoted: true }],
  ])("rejects %s evidence", (_name, explanationOverride) => {
    const value = response();
    value.explanation = { ...value.explanation, ...explanationOverride };

    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(value, {
        candidateId: "idea-001",
        evidenceIdentity: EVIDENCE_IDENTITY,
        requestId: "request-001",
      }),
    ).toThrow();
  });

  it("rejects a served explanation without source acceptance", () => {
    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(
        response({ evaluationVerdict: "rejected" }),
        {
          candidateId: "idea-001",
          evidenceIdentity: EVIDENCE_IDENTITY,
          requestId: "request-001",
        },
      ),
    ).toThrow(/without an accepted source evaluation/);
  });

  it("rejects a failure disposition paired with served status", () => {
    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(
        response({ disposition: "output_not_accepted" }),
        {
          candidateId: "idea-001",
          evidenceIdentity: EVIDENCE_IDENTITY,
          requestId: "request-001",
        },
      ),
    ).toThrow(/served status with a failure disposition/);
  });

  it("rejects a source reference with an invalid business date", () => {
    const value = response();
    value.explanation = {
      ...value.explanation,
      verifiedOutput: {
        groundedClaims: [
          {
            ...value.explanation.verifiedOutput.groundedClaims[0],
            sourceRefs: [
              {
                ...value.explanation.verifiedOutput.groundedClaims[0].sourceRefs[0],
                asOfDate: "2026-02-30",
              },
            ],
          },
        ],
      },
    };

    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(value, {
        candidateId: "idea-001",
        evidenceIdentity: EVIDENCE_IDENTITY,
        requestId: "request-001",
      }),
    ).toThrow(/Invalid source business date/);
  });

  it("rejects a served explanation without confirmed runtime execution", () => {
    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(
        response({ lotusAiRuntimeExecutionConfirmed: false }),
        {
          candidateId: "idea-001",
          evidenceIdentity: EVIDENCE_IDENTITY,
          requestId: "request-001",
        },
      ),
    ).toThrow(/without confirmed runtime execution/);
  });

  it("rejects a served explanation without a workflow run identifier", () => {
    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(
        response({ lotusAiRunId: null }),
        {
          candidateId: "idea-001",
          evidenceIdentity: EVIDENCE_IDENTITY,
          requestId: "request-001",
        },
      ),
    ).toThrow(/without a workflow run identifier/);
  });

  it("rejects unavailable text that the source does not attest as fallback evidence", () => {
    const value = response({
      status: "EXPLANATION_UNAVAILABLE",
      disposition: "runtime_unavailable",
      evaluationVerdict: "not_evaluated",
    });

    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(value, {
        candidateId: "idea-001",
        evidenceIdentity: EVIDENCE_IDENTITY,
        requestId: "request-001",
      }),
    ).toThrow(/did not confirm deterministic fallback evidence/);
  });

  it("rejects served text that the source identifies as fallback evidence", () => {
    const value = response();
    value.explanation = {
      ...value.explanation,
      fallbackUsed: true,
    };

    expect(() =>
      parseAdvisorIdeaAIExplanationResponse(value, {
        candidateId: "idea-001",
        evidenceIdentity: EVIDENCE_IDENTITY,
        requestId: "request-001",
      }),
    ).toThrow(/was marked as fallback evidence/);
  });
});
