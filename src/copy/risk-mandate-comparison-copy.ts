export type RiskMandateContextPosture =
  | "aligned"
  | "conflict"
  | "insufficient_evidence";

export const RISK_MANDATE_COMPARISON_COPY = Object.freeze({
  contextConflict:
    "Portfolio risk and concentration evidence describe different mandate contexts. Review the source evidence before relying on this comparison.",
  contextInsufficient:
    "Portfolio risk and concentration evidence provide insufficient mandate context to prove alignment. Review the missing source facts before relying on this comparison.",
  constraintEvidenceUnavailable: "Evidence unavailable",
  reviewStateUnavailable: "Review state unavailable",
  notReported: "Not reported",
});

export function riskMandateContextNotice(
  posture: RiskMandateContextPosture,
): string | null {
  if (posture === "conflict") {
    return RISK_MANDATE_COMPARISON_COPY.contextConflict;
  }
  if (posture === "insufficient_evidence") {
    return RISK_MANDATE_COMPARISON_COPY.contextInsufficient;
  }
  return null;
}
