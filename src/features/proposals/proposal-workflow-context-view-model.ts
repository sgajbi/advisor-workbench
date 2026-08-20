import type { SemanticBadgeTone } from "@/design-system";

export type ProposalWorkflowContextState =
  | "loading"
  | "refreshing"
  | "empty"
  | "partial"
  | "ready"
  | "error"
  | "permission_blocked";

export type ProposalWorkflowContextFact = {
  label: string;
  value: string;
};

export type ProposalWorkflowContextResponsivePriority = "persistent" | "supplementary";

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
  responsivePriority: ProposalWorkflowContextResponsivePriority;
};

type ProposalWorkflowContextInput = Omit<
  ProposalWorkflowContextModel,
  "stateLabel" | "stateTone" | "responsivePriority"
> & {
  responsivePriority?: ProposalWorkflowContextResponsivePriority;
};

const STATE_PRESENTATION: Record<
  ProposalWorkflowContextState,
  { label: string; tone: SemanticBadgeTone }
> = {
  loading: { label: "Loading", tone: "default" },
  refreshing: { label: "Refreshing", tone: "default" },
  empty: { label: "No record selected", tone: "default" },
  partial: { label: "Partial evidence", tone: "warn" },
  ready: { label: "Source current", tone: "success" },
  error: { label: "Unavailable", tone: "danger" },
  permission_blocked: { label: "Restricted", tone: "warn" },
};

function withStatePresentation(
  model: ProposalWorkflowContextInput
): ProposalWorkflowContextModel {
  return {
    ...model,
    stateLabel: STATE_PRESENTATION[model.state].label,
    stateTone: STATE_PRESENTATION[model.state].tone,
    responsivePriority: model.responsivePriority ?? "persistent",
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
    sourceLabel: "Approved advisory workflow",
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

export function buildPersistedProposalDraftWorkflowContext({
  portfolioId,
  proposalId,
}: {
  portfolioId: string;
  proposalId: string;
}): ProposalWorkflowContextModel {
  return withStatePresentation({
    state: "ready",
    title: "Advisor draft saved",
    summary:
      "The approved advisory service retained this proposal draft and returned its workflow identity.",
    currentPosture: "Draft retained for review",
    nextAction: "Open the saved proposal to review its current evidence and required business action.",
    blockers: [],
    facts: [
      { label: "Portfolio", value: portfolioId },
      { label: "Proposal", value: proposalId },
      { label: "Business stage", value: "Advisor draft" },
    ],
    sourceLabel: "Advisory proposal lifecycle",
    boundaryNote:
      "A saved draft does not imply suitability completion, approval, client publication, delivery, or execution readiness.",
  });
}

export function buildProposalQueueWorkflowContext({
  portfolioId,
  modeLabel,
  isLoading,
  isRefreshing,
  permissionBlocked,
  hasError,
  hasUnavailableEvidence,
  hasProposalRefreshFailure,
  hasSupportingEvidenceRefreshFailure,
  hasMoreResults,
  hasPreviousResults,
  windowNumber,
  totalCount,
  attentionCount,
  primaryDecision,
  recommendedAction,
  responsivePriority,
}: {
  portfolioId: string;
  modeLabel: string;
  isLoading: boolean;
  isRefreshing: boolean;
  permissionBlocked: boolean;
  hasError: boolean;
  hasUnavailableEvidence: boolean;
  hasProposalRefreshFailure: boolean;
  hasSupportingEvidenceRefreshFailure: boolean;
  hasMoreResults: boolean;
  hasPreviousResults: boolean;
  windowNumber: number;
  totalCount: number;
  attentionCount: number;
  primaryDecision: string;
  recommendedAction: string;
  responsivePriority?: ProposalWorkflowContextResponsivePriority;
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
      sourceLabel: "Advisory proposal lifecycle",
      boundaryNote: "Workbench does not show cached or fallback workflow claims while the source loads.",
      responsivePriority,
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
      sourceLabel: "Advisory proposal lifecycle",
      boundaryNote: "Workbench does not expose restricted workflow or entitlement details.",
      responsivePriority,
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
      sourceLabel: "Advisory proposal lifecycle",
      boundaryNote: "No fallback workflow, approval, or readiness state is shown.",
      responsivePriority,
    });
  }

  if (isRefreshing) {
    return withStatePresentation({
      state: "refreshing",
      title: "Refreshing proposal evidence",
      summary:
        "The current proposal view remains available while the approved advisory source refreshes.",
      currentPosture: "Source refresh in progress",
      nextAction: "Wait for refreshed evidence before relying on the current workflow posture.",
      blockers: [],
      facts: [
        ...facts,
        { label: "Current view", value: String(windowNumber) },
        { label: "In view", value: String(totalCount) },
      ],
      sourceLabel: "Advisory proposal lifecycle",
      boundaryNote:
        "Visible proposal evidence remains readable during refresh but is not labelled current until the source settles.",
      responsivePriority,
    });
  }

  const hasPartialQueueWindow = hasMoreResults || hasPreviousResults;
  const hasPartialEvidence =
    hasUnavailableEvidence ||
    hasProposalRefreshFailure ||
    hasSupportingEvidenceRefreshFailure ||
    hasPartialQueueWindow;

  if (hasPartialEvidence) {
    const blockers = [
      ...(hasProposalRefreshFailure
        ? ["The latest proposal view could not be confirmed."]
        : []),
      ...(hasUnavailableEvidence
        ? ["One or more supporting policy-evidence sources are unavailable."]
        : []),
      ...(hasSupportingEvidenceRefreshFailure
        ? ["The latest policy-evidence refresh did not complete."]
        : []),
      ...(hasMoreResults
        ? ["More proposals are available beyond this view."]
        : []),
      ...(hasPreviousResults
        ? ["Earlier proposals are not included in this view."]
        : []),
    ];
    const title =
      hasUnavailableEvidence ||
      hasProposalRefreshFailure ||
      hasSupportingEvidenceRefreshFailure
        ? hasPartialQueueWindow || hasProposalRefreshFailure
          ? "Proposal view is incomplete"
          : "Supporting evidence is incomplete"
        : attentionCount > 0
          ? `${attentionCount} ${attentionCount === 1 ? "proposal needs" : "proposals need"} attention in this view`
          : hasMoreResults
            ? "More proposals available"
            : "Current proposal view";
    const summary =
      totalCount > 0
        ? primaryDecision
        : hasProposalRefreshFailure
          ? "No proposals are visible while the latest proposal view remains unconfirmed."
        : hasMoreResults
          ? "No proposals match the current view; more proposals remain available."
          : hasPreviousResults
            ? "No proposals match the current view; earlier proposals remain available."
            : "No proposals are visible while supporting policy evidence remains incomplete.";
    const nextAction = hasProposalRefreshFailure
      ? hasUnavailableEvidence || hasSupportingEvidenceRefreshFailure
        ? "Retry the proposal view and restore supporting policy evidence before relying on the current workflow posture."
        : "Retry the proposal view before relying on the current queue posture."
      : hasUnavailableEvidence
        ? "Restore the unavailable policy-evidence source before relying on suitability workflow posture."
      : hasSupportingEvidenceRefreshFailure
        ? "Retry the policy-evidence refresh before relying on the current suitability posture."
        : totalCount === 0 && hasMoreResults
          ? "Review the next proposals before concluding this queue is clear."
          : totalCount === 0 && hasPreviousResults
            ? "Return to the previous proposals to continue the review."
            : recommendedAction;

    return withStatePresentation({
      state: "partial",
      title,
      summary,
      currentPosture: `${totalCount} ${totalCount === 1 ? "proposal" : "proposals"} in current view`,
      nextAction,
      blockers,
      facts: [
        ...facts,
        { label: "Current view", value: String(windowNumber) },
        { label: "In view", value: String(totalCount) },
        { label: "Need action", value: String(attentionCount) },
      ],
      sourceLabel: "Advisory proposal lifecycle",
      boundaryNote:
        "Counts apply only to proposals shown in this view. They do not establish complete queue posture while proposal or supporting evidence is partial.",
      responsivePriority,
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
      sourceLabel: "Advisory proposal lifecycle",
      boundaryNote: "An empty queue does not imply that suitability or approval checks are complete.",
      responsivePriority,
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
    sourceLabel: "Advisory proposal lifecycle",
    boundaryNote:
      "This is queue-level posture. Open a proposal to inspect its record-specific workflow, evidence, and approvals.",
    responsivePriority,
  });
}
