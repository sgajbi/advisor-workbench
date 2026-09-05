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
            identity:
              "lotus-core:PortfolioStateSnapshot:v1 · lotus-core · Version v1",
            asOf: "21 Jun 2026",
          }),
        ],
      }),
    ]);
    expect(model.evidenceSignals).toEqual(["High Cash Ratio", "Review Required"]);
    expect(model.evidenceGaps).toEqual(["Benchmark Evidence Missing"]);
    expect(model.supportingSources).toEqual([
      expect.objectContaining({
        identity: "idea-eligibility-v1 · lotus-idea · Version v1",
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
    const currentSource =
      servedResponse.explanation.redactedEvidence!.sourceRefs[0];
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      explanation: {
        ...servedResponse.explanation,
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          sourceRefs: [
            currentSource,
            {
              ...currentSource,
              freshness: "stale",
              dataQualityStatus: "partial",
            },
          ],
        },
      },
    });

    expect(model.disclosure.freshness).toEqual({
      state: "stale",
      asOf: "2026-06-21",
    });
    expect(model.disclosure.availability).toBe("stale");
    expect(model.supportingSources).toEqual([
      expect.objectContaining({ freshness: "Current", quality: "Complete" }),
      expect.objectContaining({ freshness: "Stale", quality: "Partial" }),
    ]);
  });

  it("fails evidence support closed when current source quality is partial", () => {
    const source = servedResponse.explanation.redactedEvidence!.sourceRefs[0];
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      explanation: {
        ...servedResponse.explanation,
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          unsupportedReasons: [],
          sourceRefs: [{ ...source, dataQualityStatus: "partial" }],
        },
      },
    });

    expect(model.disclosure.freshness.state).toBe("current");
    expect(model.disclosure.evidence.state).toBe("limited");
    expect(model.disclosure.availability).toBe("partial");
  });

  it("downgrades a served explanation when source evidence is missing", () => {
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      explanation: {
        ...servedResponse.explanation,
        verifiedOutput: {
          groundedClaims: [
            {
              claimId: "claim-001",
              claimText: "Cash weight is above the policy threshold.",
              sourceRefs: [],
            },
          ],
        },
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          unsupportedReasons: [],
          sourceRefs: [],
        },
      },
    });

    expect(model.disclosure.evidence.state).toBe("missing");
    expect(model.disclosure.freshness.state).toBe("not-reported");
    expect(model.disclosure.availability).toBe("partial");
  });

  it("does not let response-level evidence mask an unreferenced claim", () => {
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      explanation: {
        ...servedResponse.explanation,
        verifiedOutput: {
          groundedClaims: [
            {
              claimId: "claim-001",
              claimText: "Cash weight is above the policy threshold.",
              sourceRefs: [],
            },
          ],
        },
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          unsupportedReasons: [],
        },
      },
    });

    expect(model.supportingSources).toHaveLength(1);
    expect(model.disclosure.evidence.state).toBe("limited");
    expect(model.disclosure.availability).toBe("partial");
  });

  it("keeps stale source evidence explicit for deterministic fallbacks", () => {
    const source = servedResponse.explanation.redactedEvidence!.sourceRefs[0];
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      status: "EXPLANATION_UNAVAILABLE",
      disposition: "runtime_unavailable",
      lotusAiRunId: null,
      lotusAiRuntimeExecutionConfirmed: false,
      evaluationVerdict: "not_evaluated",
      explanation: {
        ...servedResponse.explanation,
        fallbackUsed: true,
        fallbackReason: "ai_unavailable",
        verifiedOutput: null,
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          sourceRefs: [{ ...source, freshness: "stale" }],
        },
      },
    });

    expect(model.disclosure.preparation).toBe("deterministic");
    expect(model.disclosure.freshness.state).toBe("stale");
    expect(model.disclosure.availability).toBe("stale");
  });

  it("preserves claim provenance carried by an unavailable fallback", () => {
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      status: "EXPLANATION_UNAVAILABLE",
      disposition: "output_not_accepted",
      lotusAiRuntimeExecutionConfirmed: true,
      evaluationVerdict: "rejected",
      explanation: {
        ...servedResponse.explanation,
        fallbackUsed: true,
        fallbackReason: "output_not_accepted",
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          sourceRefs: [],
        },
      },
    });

    expect(model.state).toBe("unavailable");
    expect(model.supportingSources).toEqual([
      expect.objectContaining({
        identity:
          "lotus-core:PortfolioStateSnapshot:v1 · lotus-core · Version v1",
        freshness: "Current",
        quality: "Complete",
      }),
    ]);
  });

  it("preserves distinct source references whose values contain delimiters", () => {
    const source = servedResponse.explanation.redactedEvidence!.sourceRefs[0];
    const model = buildAdvisorIdeaExplanationViewModel({
      ...servedResponse,
      explanation: {
        ...servedResponse.explanation,
        redactedEvidence: {
          ...servedResponse.explanation.redactedEvidence!,
          sourceRefs: [
            { ...source, productId: "a-b", sourceSystem: "c" },
            { ...source, productId: "a", sourceSystem: "b-c" },
          ],
        },
      },
    });

    expect(model.supportingSources).toHaveLength(2);
    expect(model.supportingSources.map((item) => item.identity)).toEqual([
      "a-b · c · Version v1",
      "a · b-c · Version v1",
    ]);
  });
});
