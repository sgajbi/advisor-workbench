export const ADVISORY_COPILOT_COPY = Object.freeze({
  title: "Advisory Copilot",
  subtitle:
    "AI-assisted preparation for proposal review, with proposal evidence and mandatory human review before any client use.",
  loading: "Loading Advisory Copilot",
  unavailable:
    "Advisory Copilot is unavailable for this portfolio. Proposal information remains available elsewhere in Workbench; try again before preparing generated review material.",
  decisionLabel: "Adviser decision",
  decisionTitle: "Prepare an evidence-led proposal review",
  decisionBody:
    "Start from the selected proposal evidence, then review every generated statement before internal use.",
  clientBoundary: "Not approved for client use",
  statusAriaLabel: "Advisory Copilot status",
  noProposal: Object.freeze({
    title: "No proposal available",
    body: "No proposal is available for this portfolio. Create or select a supported proposal before preparing an AI-assisted review.",
  }),
  actionFailure:
    "The AI-assisted review could not be prepared. The proposal remains unchanged; try again before relying on generated material.",
  evidenceTitle: "Proposal evidence",
  evidenceSubtitle: "Evidence used to prepare the selected internal review.",
  evidenceEmpty: Object.freeze({
    title: "No proposal evidence prepared",
    body: "Select a review task to prepare the evidence needed for AI-assisted output.",
  }),
  reviewTitle: "Human review",
  reviewSubtitle:
    "Generated material remains internal until a reviewer records approval for internal use.",
  reviewStatusLabel: "Review status",
  outputEmpty: "No AI-assisted review has been prepared for this portfolio.",
  reviewFailure:
    "Internal review was not recorded. Generated material remains unapproved; try again before internal use.",
  unavailableActions: Object.freeze({
    title: "No AI-assisted review tasks available",
    body: "AI-assisted review tasks are not available for this portfolio. The proposal remains unchanged; use the standard proposal review workflow.",
  }),
});

const SUPPORTED_STATUS =
  "ADVISE_COPILOT_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED";

export function advisoryCopilotAvailabilityLabel(
  sourceValue: string | null | undefined,
): string {
  return sourceValue === SUPPORTED_STATUS ? "Available" : "Review required";
}

export function advisoryCopilotClientUseLabel(
  sourceValue: string | null | undefined,
): string {
  switch (sourceValue) {
    case "APPROVED":
    case "CLIENT_READY":
      return "Approved for client use";
    case "ELIGIBLE_AFTER_REVIEW":
      return "Eligible after review";
    case "INTERNAL_ONLY":
      return "Internal use only";
    case "BLOCKED":
      return "Not approved for client use";
    default:
      return "Review required";
  }
}

export function advisoryCopilotReviewLabel(
  sourceValue: string | null | undefined,
): string {
  switch (sourceValue) {
    case "APPROVED_FOR_INTERNAL_USE":
      return "Approved for internal use";
    case "GUARDRAIL_REJECTED":
      return "Review controls not met";
    case "REJECTED":
      return "Rejected";
    case "REVIEW_REQUIRED":
      return "Review required";
    default:
      return "Not prepared";
  }
}
