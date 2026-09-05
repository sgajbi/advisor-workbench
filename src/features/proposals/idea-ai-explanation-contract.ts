import { z } from "zod";

const sourceRefSchema = z
  .object({
    productId: z.string().min(1),
    sourceSystem: z.string().min(1),
    productVersion: z.string().min(1),
    asOfDate: z.string().min(1),
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

export type AdvisorIdeaAIExplanationRequest = {
  requestId: string;
  purpose: typeof ADVISOR_RATIONALE_DRAFT_PURPOSE;
  requestedAtUtc: string;
};

export type AdvisorIdeaAIExplanationResponse = z.infer<typeof responseSchema>;
export type AdvisorIdeaAIExplanation = AdvisorIdeaAIExplanationResponse["explanation"];

export function parseAdvisorIdeaAIExplanationResponse(
  value: unknown,
  expected: { candidateId: string; requestId: string },
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
  return response;
}
