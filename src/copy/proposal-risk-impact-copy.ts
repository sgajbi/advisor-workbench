export type ProposalEvidenceAvailability =
  | "ready"
  | "partial"
  | "unavailable"
  | "not_supported";

const PROPOSAL_EVIDENCE_AVAILABILITY_LABELS = Object.freeze({
  ready: "Evidence available",
  partial: "Evidence incomplete",
  unavailable: "Evidence unavailable",
  not_supported: "Not supported",
} satisfies Record<ProposalEvidenceAvailability, string>);

export const PROPOSAL_RISK_IMPACT_COPY = Object.freeze({
  missingVersion: Object.freeze({
    title: "Proposal version is not available",
    body: "Risk and impact evidence cannot be matched to this proposal version. The selected proposal remains available in the worklist. Open the full proposal record before progressing.",
  }),
  loading: Object.freeze({
    title: "Loading proposal evidence",
    body: "Loading current and proposed allocation, risk evidence, and decision requirements.",
  }),
  unavailable: Object.freeze({
    title: "Risk and impact evidence is unavailable",
    body: "Current risk and impact evidence could not be retrieved. The selected proposal remains visible, but it must not progress on earlier evidence. Retry before continuing.",
  }),
  selectedProposalLabel: "Selected proposal",
  decisionReadinessLabel: "Decision readiness",
  allocationUnavailable: Object.freeze({
    title: "Allocation comparison is not available",
    body: "Current and proposed allocation were not returned for this proposal. Risk evidence and workflow requirements remain available where shown. Refresh before comparing portfolio impact.",
  }),
  riskUnavailable: Object.freeze({
    title: "Risk evidence is not available",
    body: "Risk evidence was not returned for this proposal. Allocation and workflow requirements remain available where shown. Refresh before drawing a risk conclusion.",
  }),
  workflowUnavailable: Object.freeze({
    title: "Workflow requirements are not available",
    body: "Workflow requirements were not returned. Allocation and risk evidence remain available where shown. Refresh before progressing the proposal.",
  }),
  decisionRegisterUnavailable: Object.freeze({
    title: "Decision register is not available",
    body: "Approval requirements, material changes, and evidence gaps were not returned. Other proposal evidence remains available where shown. Refresh before treating the proposal as clear to progress.",
  }),
  continuePrompt:
    "Continue in the proposal record to review evidence and record available workflow actions.",
  refresh: Object.freeze({
    retryIdleLabel: "Retry proposal evidence",
    retryBusyLabel: "Retrying proposal evidence",
    refreshIdleLabel: "Refresh proposal evidence",
    refreshBusyLabel: "Refreshing proposal evidence",
    failedEyebrow: "Proposal evidence not updated",
    failedTitle: "Refresh failed",
    failedWithEvidence:
      "Previously retrieved evidence remains visible but could not be refreshed.",
    failedWithoutEvidence:
      "Risk and impact evidence is not available. The retry did not complete.",
    pendingEyebrow: "Updating proposal evidence",
    pendingTitle: "Checking selected proposal evidence",
    pendingWithEvidence:
      "Previously retrieved evidence remains visible while the latest record is checked.",
    pendingWithoutEvidence:
      "Risk and impact evidence is being retrieved. Decision readiness will appear when it is available.",
    confirmedEyebrow: "Proposal evidence updated",
    confirmedTitle: "Selected proposal evidence is current",
  }),
  evidenceAvailableExplanation:
    "Risk, allocation, and workflow evidence is available for this proposal version. Approval is still required where shown.",
  evidenceIncompleteExplanation:
    "Some proposal evidence is available. Review the named gaps and fallback evidence before progressing.",
  evidenceUnavailableExplanation:
    "Risk and impact evidence is insufficient to support the next decision.",
  decisionUnavailableSummary:
    "A decision record is not available for this proposal version.",
  decisionUnavailableNextAction: "Refresh proposal evidence before progressing",
  riskUnavailableSummary: "Risk evidence is not available for this proposal.",
  workflowNextStepUnavailable: "Next step not confirmed",
});

export function proposalEvidenceAvailabilityLabel(
  state: ProposalEvidenceAvailability,
): string {
  return PROPOSAL_EVIDENCE_AVAILABILITY_LABELS[state];
}

export function missingAllocationViewsBody(dimensions: readonly string[]): string {
  return `The comparison does not include ${dimensions.join(", ")}. Available allocation views remain visible. Review the full proposal record before relying on the missing view.`;
}
