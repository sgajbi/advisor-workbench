import { describe, expect, it } from "vitest";

import { buildAdvisorIdeaExplanationViewModel } from "../../src/features/proposals/idea-ai-explanation-view-model";
import type { AdvisorIdeaAIExplanationResponse } from "../../src/features/proposals/idea-ai-explanation-contract";

const servedResponse: AdvisorIdeaAIExplanationResponse = {
  status: "EXPLANATION_SERVED",
  disposition: "executed",
  lotusAiRunId: "run-001",
  lotusAiRuntimeExecutionConfirmed: true,
  evaluationVerdict: "accepted",
  explanation: {
    requestId: "request-001",
    candidateId: "idea-001",
    posture: "ready_for_advisor_review",
    verifierOutcome: "passed",
    explanationText: "Cash weight is above the policy threshold.",
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
          claimText: "Cash weight is above the policy threshold.",
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
      reasonCodes: ["high_cash_ratio", "review_required"],
      unsupportedReasons: ["benchmark_evidence_missing"],
      scorePolicyVersion: "idle-liquidity-v2",
      sourceRefs: [
        {
          productId: "idea-eligibility-v1",
          sourceSystem: "lotus-idea",
          productVersion: "v1",
          asOfDate: "2026-06-21",
          freshness: "current",
          dataQualityStatus: "complete",
        },
      ],
    },
  },
};

describe("buildAdvisorIdeaExplanationViewModel", () => {
  it("separates grounded rationale, source signals, and evidence gaps", () => {
    const model = buildAdvisorIdeaExplanationViewModel(servedResponse);

    expect(model.state).toBe("served");
    expect(model.rationale).toEqual([
      expect.objectContaining({
        text: "Cash weight is above the policy threshold.",
        sources: [
          expect.objectContaining({
            identity: "lotus-core:PortfolioStateSnapshot:v1 · lotus-core",
            asOf: "21 Jun 2026",
          }),
        ],
      }),
    ]);
    expect(model.evidenceSignals).toEqual(["High Cash Ratio", "Review Required"]);
    expect(model.evidenceGaps).toEqual(["Benchmark Evidence Missing"]);
    expect(model.supportingSources).toEqual([
      expect.objectContaining({
        identity: "idea-eligibility-v1 · lotus-idea",
        asOf: "21 Jun 2026",
      }),
    ]);
    expect(model.disclosure.clientUse).toBe("internal-only");
    expect(model.disclosure.humanReview.state).toBe("review-required");
    expect(model.disclosure.freshness).toEqual({
      state: "current",
      asOf: "2026-06-21",
    });
    expect(model.disclosure.limitations).toContain(
      "Execution provenance is Unattested Local Test Fixture; it is not verified production provenance.",
    );
  });

  it("labels source fallback text as deterministic when AI is unavailable", () => {
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      status: "EXPLANATION_UNAVAILABLE",
      disposition: "runtime_unavailable",
      lotusAiRunId: null,
      lotusAiRuntimeExecutionConfirmed: false,
      evaluationVerdict: "not_evaluated",
      explanation: {
        ...servedResponse.explanation,
        explanationText: "Cash remains above the source policy threshold.",
        fallbackUsed: true,
        fallbackReason: "ai_unavailable",
        verifiedOutput: null,
      },
    });

    expect(model).toMatchObject({
      state: "unavailable",
      dispositionLabel: "Runtime Unavailable",
      deterministicFallback: "Cash remains above the source policy threshold.",
    });
    expect(model.disclosure.preparation).toBe("deterministic");
    expect(model.disclosure.clientUse).toBe("blocked");
  });

  it("fails freshness closed when any published source reference is stale", () => {
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      explanation: {
        ...servedResponse.explanation,
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          sourceRefs: servedResponse.explanation.redactedEvidence!.sourceRefs.map(
            (source) => ({ ...source, freshness: "stale" }),
          ),
        },
      },
    });

    expect(model.disclosure.freshness).toEqual({
      state: "stale",
      asOf: "2026-06-21",
    });
    expect(model.disclosure.availability).toBe("stale");
  });
});
