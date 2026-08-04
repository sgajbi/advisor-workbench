import type { SemanticBadgeTone } from "@/design-system";

export type ProposalWorkflowContextState =
  | "loading"
  | "empty"
  | "partial"
  | "ready"
  | "error"
  | "permission_blocked";

export type ProposalWorkflowContextFact = {
  label: string;
  value: string;
};

export type ProposalWorkflowContextModel = {
  state: ProposalWorkflowContextState;
  stateLabel: string;
  stateTone: SemanticBadgeTone;
  title: string;
  summary: string;
  currentPosture: string;
  nextAction: string;
  blockers: string[];
  facts: ProposalWorkflowContextFact[];
  sourceLabel: string;
  boundaryNote: string;
};

const STATE_PRESENTATION: Record<
  ProposalWorkflowContextState,
  { label: string; tone: SemanticBadgeTone }
> = {
  loading: { label: "Loading", tone: "default" },
  empty: { label: "No record selected", tone: "default" },
  partial: { label: "Partial evidence", tone: "warn" },
  ready: { label: "Source current", tone: "success" },
  error: { label: "Unavailable", tone: "danger" },
  permission_blocked: { label: "Restricted", tone: "warn" },
};

function withStatePresentation(
  model: Omit<ProposalWorkflowContextModel, "stateLabel" | "stateTone">
): ProposalWorkflowContextModel {
  return {
    ...model,
    stateLabel: STATE_PRESENTATION[model.state].label,
    stateTone: STATE_PRESENTATION[model.state].tone,
  };
}

export function buildNeutralProposalWorkflowContext({
  portfolioId,
  surfaceLabel,
}: {
  portfolioId: string;
  surfaceLabel: string;
}): ProposalWorkflowContextModel {
  return withStatePresentation({
    state: "empty",
    title: "Select a source record",
    summary:
      "Workflow posture appears here only when the active workspace supplies a proposal or policy record.",
    currentPosture: "No proposal workflow is selected",
    nextAction: "Choose a proposal or policy evaluation to review its current business action.",
    blockers: [],
    facts: [
      { label: "Portfolio", value: portfolioId },
      { label: "Workspace", value: surfaceLabel },
    ],
    sourceLabel: "Gateway-backed advisory workflow",
    boundaryNote:
      "No approval, suitability, KYC, client-delivery, or execution status is inferred by Workbench.",
  });
}

export function buildSimulationProposalWorkflowContext({
  portfolioId,
}: {
  portfolioId: string;
}): ProposalWorkflowContextModel {
  return withStatePresentation({
    state: "empty",
    title: "Draft not yet persisted",
    summary:
      "Simulation is an advisor-use construction step. It has no proposal workflow record until a draft is created through the approved service.",
    currentPosture: "Construction only",
    nextAction: "Review the proposed changes, then create a draft when the analysis is ready to retain.",
    blockers: [],
    facts: [
      { label: "Portfolio", value: portfolioId },
      { label: "Business stage", value: "Proposal construction" },
    ],
    sourceLabel: "No persisted advisory workflow record",
    boundaryNote:
      "Simulation does not imply suitability review, approval, client consent, publication, or execution readiness.",
  });
}

export function buildProposalQueueWorkflowContext({
  portfolioId,
  modeLabel,
  isLoading,
  permissionBlocked,
  hasError,
  hasPartialEvidence,
  totalCount,
  attentionCount,
  primaryDecision,
  recommendedAction,
}: {
  portfolioId: string;
  modeLabel: string;
  isLoading: boolean;
  permissionBlocked: boolean;
  hasError: boolean;
  hasPartialEvidence: boolean;
  totalCount: number;
  attentionCount: number;
  primaryDecision: string;
  recommendedAction: string;
}): ProposalWorkflowContextModel {
  const facts = [
    { label: "Portfolio", value: portfolioId },
    { label: "Queue", value: modeLabel },
  ];

  if (isLoading) {
    return withStatePresentation({
      state: "loading",
      title: "Loading proposal posture",
      summary: "Retrieving the current proposal queue from the approved advisory service.",
      currentPosture: "Source refresh in progress",
      nextAction: "Wait for the source response before taking an advisory action.",
      blockers: [],
      facts,
      sourceLabel: "Gateway · advisory proposal lifecycle",
      boundaryNote: "Workbench does not show cached or fallback workflow claims while the source loads.",
    });
  }

  if (permissionBlocked) {
    return withStatePresentation({
      state: "permission_blocked",
      title: "Proposal posture is restricted",
      summary: "Your current access does not permit this portfolio's advisory workflow to be viewed.",
      currentPosture: "Access required",
      nextAction: "Use an entitled portfolio or request access through the bank's support process.",
      blockers: ["Proposal workflow details are hidden by the source entitlement boundary."],
      facts,
      sourceLabel: "Gateway · advisory proposal lifecycle",
      boundaryNote: "Workbench does not expose restricted workflow or entitlement details.",
    });
  }

  if (hasError) {
    return withStatePresentation({
      state: "error",
      title: "Proposal posture is unavailable",
      summary: "The advisory workflow could not be retrieved from the approved source.",
      currentPosture: "Source unavailable",
      nextAction: "Retry after the advisory service recovers; do not rely on previously displayed status.",
      blockers: ["Current proposal workflow evidence is unavailable."],
      facts,
      sourceLabel: "Gateway · advisory proposal lifecycle",
      boundaryNote: "No fallback workflow, approval, or readiness state is shown.",
    });
  }

  if (hasPartialEvidence) {
    return withStatePresentation({
      state: "partial",
      title: "Supporting evidence is unavailable",
      summary:
        totalCount === 0
          ? "The proposal queue is empty, but one or more suitability evidence sources could not be confirmed."
          : primaryDecision,
      currentPosture:
        totalCount === 0
          ? "No proposals in view; evidence incomplete"
          : `${totalCount} ${totalCount === 1 ? "proposal" : "proposals"} in view`,
      nextAction:
        "Restore the unavailable policy-evidence source before relying on suitability workflow posture.",
      blockers: ["One or more supporting policy-evidence sources are unavailable."],
      facts: [
        ...facts,
        { label: "In view", value: String(totalCount) },
        { label: "Need action", value: String(attentionCount) },
      ],
      sourceLabel: "Gateway · advisory proposal lifecycle",
      boundaryNote:
        "Proposal counts do not establish suitability posture while supporting policy evidence is unavailable.",
    });
  }

  if (totalCount === 0) {
    return withStatePresentation({
      state: "empty",
      title: "No proposals in this queue",
      summary: `The approved source returned no proposals for ${modeLabel.toLowerCase()}.`,
      currentPosture: "No queue item selected",
      nextAction: recommendedAction,
      blockers: [],
      facts: [...facts, { label: "Proposals", value: "0" }],
      sourceLabel: "Gateway · advisory proposal lifecycle",
      boundaryNote: "An empty queue does not imply that suitability or approval checks are complete.",
    });
  }

  return withStatePresentation({
    state: "ready",
    title: attentionCount > 0 ? `${attentionCount} need attention` : "Queue ready for review",
    summary: primaryDecision,
    currentPosture: `${totalCount} ${totalCount === 1 ? "proposal" : "proposals"} in view`,
    nextAction: recommendedAction,
    blockers:
      attentionCount > 0
        ? [`${attentionCount} ${attentionCount === 1 ? "proposal needs" : "proposals need"} advisor action.`]
        : [],
    facts: [
      ...facts,
      { label: "In view", value: String(totalCount) },
      { label: "Need action", value: String(attentionCount) },
    ],
    sourceLabel: "Gateway · advisory proposal lifecycle",
    boundaryNote:
      "This is queue-level posture. Open a proposal to inspect its record-specific workflow, evidence, and approvals.",
  });
}
