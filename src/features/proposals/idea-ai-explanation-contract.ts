import { z } from "zod";

function isValidBusinessDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

const sourceRefSchema = z
  .object({
    productId: z.string().min(1),
    sourceSystem: z.string().min(1),
    productVersion: z.string().min(1),
    asOfDate: z.string().refine(isValidBusinessDate, "Invalid source business date"),
    freshness: z.string().min(1),
    dataQualityStatus: z.string().min(1),
  })
  .passthrough();

const groundedClaimSchema = z
  .object({
    claimId: z.string().min(1),
    claimText: z.string().min(1),
    sourceRefs: z.array(sourceRefSchema),
  })
  .passthrough();

const verifiedOutputSchema = z
  .object({
    groundedClaims: z.array(groundedClaimSchema),
  })
  .passthrough();

const redactedEvidenceSchema = z
  .object({
    evidencePacketId: z.string().min(1),
    evidenceContentHash: z.string().min(1),
    sourceRevisionVectorDigest: z.string().min(1),
    reasonCodes: z.array(z.string().min(1)),
    unsupportedReasons: z.array(z.string().min(1)),
    scorePolicyVersion: z.string().min(1).nullable(),
    sourceRefs: z.array(sourceRefSchema),
  })
  .passthrough();

const explanationSchema = z
  .object({
    requestId: z.string().min(1),
    candidateId: z.string().min(1),
    posture: z.string().min(1),
    verifierOutcome: z.string().min(1),
    explanationText: z.string().min(1),
    fallbackUsed: z.boolean(),
    fallbackReason: z.string().nullable(),
    grantsDownstreamAuthority: z.boolean(),
    supportedFeaturePromoted: z.boolean(),
    executionProvenancePosture: z.string().min(1),
    aiLineageRecorded: z.boolean(),
    verifiedOutput: verifiedOutputSchema.nullable().optional(),
    redactedEvidence: redactedEvidenceSchema.optional(),
  })
  .passthrough();

const responseSchema = z
  .object({
    status: z.enum(["EXPLANATION_SERVED", "EXPLANATION_UNAVAILABLE"]),
    disposition: z.string().min(1),
    lotusAiRunId: z.string().min(1).nullable(),
    lotusAiRuntimeExecutionConfirmed: z.boolean(),
    evaluationVerdict: z.string().min(1),
    explanation: explanationSchema,
  })
  .passthrough();

export const ADVISOR_RATIONALE_DRAFT_PURPOSE = "advisor_rationale_draft" as const;

const SERVED_EXPLANATION_PROVENANCE = new Set([
  "lotus_ai_attestation_verified",
  "unattested_local_test_fixture",
]);

export type AdvisorIdeaAIExplanationRequest = {
  requestId: string;
  purpose: typeof ADVISOR_RATIONALE_DRAFT_PURPOSE;
  requestedAtUtc: string;
};

export type AdvisorIdeaAIExplanationResponse = z.infer<typeof responseSchema>;
export type AdvisorIdeaAIExplanation = AdvisorIdeaAIExplanationResponse["explanation"];
export type AdvisorIdeaEvidenceIdentity = {
  evidencePacketId: string;
  evidenceContentHash: string;
  sourceRevisionVectorDigest: string;
};

const evidenceIdentitySchema = z.object({
  evidencePacketId: z.string().min(1),
  evidenceContentHash: z.string().min(1),
  sourceRevisionVectorDigest: z.string().min(1),
});

export function readAdvisorIdeaEvidenceIdentity(
  value: unknown,
): AdvisorIdeaEvidenceIdentity | undefined {
  const result = evidenceIdentitySchema.safeParse(value);
  return result.success ? result.data : undefined;
}

export function isSameAdvisorIdeaEvidence(
  left: AdvisorIdeaEvidenceIdentity | undefined,
  right: AdvisorIdeaEvidenceIdentity | undefined,
): boolean {
  return Boolean(
    left &&
      right &&
      left.evidencePacketId === right.evidencePacketId &&
      left.evidenceContentHash === right.evidenceContentHash &&
      left.sourceRevisionVectorDigest === right.sourceRevisionVectorDigest,
  );
}

export function parseAdvisorIdeaAIExplanationResponse(
  value: unknown,
  expected: {
    candidateId: string;
    requestId: string;
    evidenceIdentity: AdvisorIdeaEvidenceIdentity;
  },
): AdvisorIdeaAIExplanationResponse {
  const response = responseSchema.parse(value);
  if (
    response.explanation.candidateId !== expected.candidateId ||
    response.explanation.requestId !== expected.requestId
  ) {
    throw new Error(
      "Idea explanation response did not match the requested candidate and request identity.",
    );
  }
  if (
    !isSameAdvisorIdeaEvidence(
      response.explanation.redactedEvidence,
      expected.evidenceIdentity,
    )
  ) {
    throw new Error(
      "Idea explanation response did not match the requested candidate evidence.",
    );
  }
  if (
    response.explanation.grantsDownstreamAuthority ||
    response.explanation.supportedFeaturePromoted
  ) {
    throw new Error(
      "Idea explanation response attempted to grant unsupported downstream authority.",
    );
  }
  if (
    response.status === "EXPLANATION_SERVED" &&
    response.evaluationVerdict !== "accepted"
  ) {
    throw new Error(
      "Idea explanation response was served without an accepted source evaluation.",
    );
  }
  if (
    response.status === "EXPLANATION_SERVED" &&
    response.disposition !== "executed"
  ) {
    throw new Error(
      "Idea explanation response paired served status with a failure disposition.",
    );
  }
  if (
    response.status === "EXPLANATION_SERVED" &&
    !response.lotusAiRuntimeExecutionConfirmed
  ) {
    throw new Error(
      "Idea explanation response was served without confirmed runtime execution.",
    );
  }
  if (
    response.status === "EXPLANATION_SERVED" &&
    !response.lotusAiRunId
  ) {
    throw new Error(
      "Idea explanation response was served without a workflow run identifier.",
    );
  }
  if (
    response.status === "EXPLANATION_SERVED" &&
    (response.explanation.posture !== "ready_for_advisor_review" ||
      response.explanation.verifierOutcome !== "passed" ||
      !SERVED_EXPLANATION_PROVENANCE.has(
        response.explanation.executionProvenancePosture,
      ) ||
      !response.explanation.aiLineageRecorded)
  ) {
    throw new Error(
      "Idea explanation response was served without complete source-owned explanation proof.",
    );
  }
  if (
    response.status === "EXPLANATION_UNAVAILABLE" &&
    !response.explanation.fallbackUsed
  ) {
    throw new Error(
      "Unavailable Idea explanation response did not confirm deterministic fallback evidence.",
    );
  }
  if (
    response.status === "EXPLANATION_SERVED" &&
    response.explanation.fallbackUsed
  ) {
    throw new Error(
      "Served Idea explanation response was marked as fallback evidence.",
    );
  }
  return response;
}
