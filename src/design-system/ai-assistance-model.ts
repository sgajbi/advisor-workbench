export type AiPreparationMethod =
  | "source-authored"
  | "deterministic"
  | "ai-assisted"
  | "ai-generated"
  | "requested"
  | "unavailable";

export type AiOutputAvailability =
  | "live"
  | "partial"
  | "simulation"
  | "stale"
  | "unavailable";

export type AiEvidenceState = "supported" | "limited" | "missing" | "conflicted";

export type AiHumanReviewState =
  | "not-required"
  | "review-required"
  | "reviewed"
  | "rejected"
  | "unavailable";

export type AiClientUseState =
  | "internal-only"
  | "eligible-after-review"
  | "approved"
  | "blocked"
  | "unavailable";

export type AiFreshnessState = "current" | "stale" | "not-reported";

export type AiAssistanceDiagnostic = {
  label: string;
  value: string;
};

export type AiAssistanceDisclosure = {
  scopeLabel: string;
  preparation: AiPreparationMethod;
  availability: AiOutputAvailability;
  evidence: {
    state: AiEvidenceState;
    sourceCount: number;
  };
  humanReview: {
    state: AiHumanReviewState;
    sourceRecorded: boolean;
    actor?: string;
    occurredAt?: string;
  };
  clientUse: AiClientUseState;
  freshness: {
    state: AiFreshnessState;
    asOf?: string;
  };
  limitations: string[];
  diagnostics: AiAssistanceDiagnostic[];
};

export type AiAssistanceDisclosureInput = Omit<
  AiAssistanceDisclosure,
  "evidence" | "humanReview" | "freshness" | "limitations" | "diagnostics"
> & {
  evidence: Partial<AiAssistanceDisclosure["evidence"]> & {
    state: AiEvidenceState;
  };
  humanReview: Partial<AiAssistanceDisclosure["humanReview"]> & {
    state: AiHumanReviewState;
  };
  freshness: Partial<AiAssistanceDisclosure["freshness"]> & {
    state: AiFreshnessState;
  };
  limitations?: string[];
  diagnostics?: AiAssistanceDiagnostic[];
};

/**
 * Applies the bank-facing disclosure invariants at one reusable boundary.
 * Unknown or contradictory source posture is downgraded; it is never upgraded
 * from technical completion to evidence, review, or client-use approval.
 */
export function createAiAssistanceDisclosure(
  input: AiAssistanceDisclosureInput,
): AiAssistanceDisclosure {
  const limitations = new Set(input.limitations ?? []);
  const sourceCount = Math.max(0, input.evidence.sourceCount ?? 0);
  let evidenceState = input.evidence.state;
  let reviewState = input.humanReview.state;
  let sourceRecorded = input.humanReview.sourceRecorded ?? false;
  let clientUse = input.clientUse;
  let freshnessState = input.freshness.state;

  if (evidenceState === "supported" && sourceCount === 0) {
    evidenceState = "limited";
    limitations.add("Source evidence was not published with this output.");
  }

  if (reviewState === "reviewed" && !sourceRecorded) {
    reviewState = "unavailable";
    limitations.add("A source-recorded human review was not published.");
  }

  if (freshnessState === "current" && !input.freshness.asOf) {
    freshnessState = "not-reported";
    limitations.add("The source did not publish a freshness date.");
  }

  if (input.preparation === "requested" || input.preparation === "unavailable") {
    reviewState = "unavailable";
    sourceRecorded = false;
    clientUse = "blocked";
    limitations.add("No usable generated output is available for review or client use.");
  }

  if (input.availability === "unavailable") {
    clientUse = "blocked";
  }

  if (input.availability === "simulation" && clientUse === "approved") {
    clientUse = "blocked";
    limitations.add("Simulation output is not approved for client use.");
  }

  if (
    clientUse === "approved" &&
    (reviewState !== "reviewed" ||
      !sourceRecorded ||
      evidenceState !== "supported" ||
      input.availability !== "live")
  ) {
    clientUse = "blocked";
    limitations.add(
      "Client use requires live output, source evidence, and a source-recorded human review.",
    );
  }

  return {
    scopeLabel: input.scopeLabel,
    preparation: input.preparation,
    availability: input.availability,
    evidence: {
      state: evidenceState,
      sourceCount,
    },
    humanReview: {
      state: reviewState,
      sourceRecorded,
      ...(input.humanReview.actor ? { actor: input.humanReview.actor } : {}),
      ...(input.humanReview.occurredAt ? { occurredAt: input.humanReview.occurredAt } : {}),
    },
    clientUse,
    freshness: {
      state: freshnessState,
      ...(input.freshness.asOf ? { asOf: input.freshness.asOf } : {}),
    },
    limitations: Array.from(limitations),
    diagnostics: input.diagnostics ?? [],
  };
}
