import {
  createAiAssistanceDisclosure,
  type AiAssistanceDisclosureModel,
} from "@/design-system";
import { formatBusinessDateValue } from "@/design-system/utils/financial-formatters";

import { formatCode } from "./advisory-copilot-view-model";
import type { AdvisorIdeaAIExplanationResponse } from "./idea-ai-explanation-contract";

type EvidenceSource = {
  id: string;
  identity: string;
  asOf: string;
  freshness: string;
  quality: string;
};

export type AdvisorIdeaExplanationViewModel = {
  state: "served" | "unavailable";
  disposition: string;
  dispositionLabel: string;
  displayText: string;
  deterministicFallback?: string;
  rationale: Array<{
    id: string;
    text: string;
    sources: EvidenceSource[];
  }>;
  evidenceGaps: string[];
  evidenceSignals: string[];
  evidenceDetailAvailable: boolean;
  disclosure: AiAssistanceDisclosureModel;
};

export function buildAdvisorIdeaExplanationViewModel(
  response: AdvisorIdeaAIExplanationResponse,
): AdvisorIdeaExplanationViewModel {
  const explanation = response.explanation;
  const claims = explanation.verifiedOutput?.groundedClaims ?? [];
  const evidence = explanation.redactedEvidence;
  const allSourceRefs = [
    ...(evidence?.sourceRefs ?? []),
    ...claims.flatMap((claim) => claim.sourceRefs),
  ];
  const sourceIdentities = new Set(
    allSourceRefs.map(
      (source) =>
        `${source.productId}\u0000${source.productVersion}\u0000${source.asOfDate}`,
    ),
  );
  const served = response.status === "EXPLANATION_SERVED";
  const evidenceGaps = uniqueBusinessLabels(evidence?.unsupportedReasons ?? []);
  const evidenceSignals = uniqueBusinessLabels(evidence?.reasonCodes ?? []);
  const limitations = [
    "Internal advisor review aid only. It does not approve suitability, client communication, a proposal, or an order.",
    ...(claims.length === 0 && served
      ? ["The source did not publish grounded claim detail with this rationale."]
      : []),
    ...(explanation.executionProvenancePosture.startsWith("unattested")
      ? [
          `Execution provenance is ${formatCode(explanation.executionProvenancePosture)}; it is not verified production provenance.`,
        ]
      : []),
  ];

  return {
    state: served ? "served" : "unavailable",
    disposition: response.disposition,
    dispositionLabel: formatCode(response.disposition),
    displayText: served
      ? explanation.explanationText
      : "An AI-assisted rationale is not available for this opportunity.",
    ...(served
      ? {}
      : { deterministicFallback: explanation.explanationText }),
    rationale: claims.map((claim) => ({
      id: claim.claimId,
      text: claim.claimText,
      sources: claim.sourceRefs.map((source) => ({
        id: `${source.productId}-${source.productVersion}-${source.asOfDate}`,
        identity: `${source.productId} · ${source.sourceSystem}`,
        asOf: formatBusinessDateValue(source.asOfDate, {
          nullDisplay: "Date not reported",
        }),
        freshness: formatCode(source.freshness),
        quality: formatCode(source.dataQualityStatus),
      })),
    })),
    evidenceGaps,
    evidenceSignals,
    evidenceDetailAvailable: Boolean(evidence),
    disclosure: createAiAssistanceDisclosure({
      scopeLabel: "Idea rationale draft",
      preparation: served ? "ai-assisted" : "deterministic",
      availability: served ? "live" : "partial",
      evidence: {
        state:
          sourceIdentities.size === 0
            ? "missing"
            : evidenceGaps.length > 0
              ? "limited"
              : "supported",
        sourceCount: sourceIdentities.size,
      },
      humanReview: {
        state: served ? "review-required" : "unavailable",
        sourceRecorded: false,
      },
      clientUse: served ? "internal-only" : "blocked",
      freshness: { state: "not-reported" },
      limitations,
      diagnostics: [
        ...(response.lotusAiRunId
          ? [{ label: "AI workflow run", value: response.lotusAiRunId }]
          : []),
        { label: "Evaluation verdict", value: response.evaluationVerdict },
        {
          label: "Execution provenance",
          value: explanation.executionProvenancePosture,
        },
        {
          label: "Runtime execution confirmed",
          value: response.lotusAiRuntimeExecutionConfirmed ? "Yes" : "No",
        },
        {
          label: "AI lineage recorded",
          value: explanation.aiLineageRecorded ? "Yes" : "No",
        },
        ...(evidence?.scorePolicyVersion
          ? [{ label: "Evidence policy", value: evidence.scorePolicyVersion }]
          : []),
      ],
    }),
  };
}

function uniqueBusinessLabels(values: readonly string[]): string[] {
  return [...new Set(values.map(formatCode))];
}
