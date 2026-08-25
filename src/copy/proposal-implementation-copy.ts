import type {
  ProposalImplementationEventType,
  ProposalImplementationHandoffStatus,
  ProposalImplementationNextAction,
  ProposalImplementationVersionPosture,
} from "@/features/proposals/proposal-implementation-status-contract";

type ImplementationCopyTone = "default" | "success" | "warn" | "danger";

type ImplementationStatusCopy = Readonly<{
  label: string;
  tone: ImplementationCopyTone;
  summary: string;
}>;

export const PROPOSAL_IMPLEMENTATION_COPY = Object.freeze({
  workspaceTitle: "Implementation follow-up",
  workspaceSubtitle:
    "Select a proposal, review its current handoff, and resolve any material difficulty before returning to the proposal record.",
  primaryDecision: "What requires implementation follow-up now?",
  recommendedAction:
    "Review the selected handoff, version relationship and latest update before taking the next action.",
  emptyTitle: "No implementation follow-up in this view",
  emptyBody:
    "No proposals in the current worklist require handoff, completion or exception follow-up.",
  worklistAriaLabel: "Implementation follow-up proposals",
  defaultNextAction: "Select to review implementation status",
  selectedRegionAriaLabel: "Selected proposal implementation review",
  selectedRecordLabel: "Selected proposal · implementation follow-up",
  selectionStatus:
    "Implementation information is being checked for the selected proposal version.",
  missingVersion: Object.freeze({
    title: "Proposal version is not available",
    body:
      "Implementation information cannot be matched safely because the selected proposal has no version. The proposal remains available. Recheck the proposal version before continuing.",
  }),
  restricted: Object.freeze({
    title: "Implementation information is restricted",
    body:
      "You cannot view the current implementation handoff. The selected proposal remains available, but no implementation status is shown. Select an entitled portfolio or contact access support.",
  }),
  loading: Object.freeze({
    title: "Checking implementation status",
    body:
      "Loading the current handoff status, proposal-version relationship and latest update.",
  }),
  unavailable: Object.freeze({
    title: "Implementation status is unavailable",
    body:
      "The current handoff record could not be loaded. The selected proposal remains available, but its lifecycle stage is not used as implementation evidence. Retry before relying on this status.",
  }),
  decisionLabel: "Implementation status",
  evidenceLabel: "Information completeness",
  versionLabel: "Related proposal version",
  nextActionLabel: "Next business action",
  currentnessLabel: "Last update",
  currentnessBasisLabel: "Update basis",
  noEvent: "No implementation event has been reported for this proposal.",
  supportDetailsLabel: "Implementation support details",
  supportSourceArea: "Advisory implementation handoff",
  footer:
    "Open the full proposal record to review the complete evidence and take any available implementation action.",
  boundary:
    "This screen confirms the advisory implementation handoff only. It does not provide order, fill, allocation, settlement, custody-booking or accounting confirmation.",
  refresh: Object.freeze({
    retryIdleLabel: "Retry implementation status",
    retryBusyLabel: "Retrying implementation status…",
    refreshIdleLabel: "Refresh implementation status",
    refreshBusyLabel: "Refreshing implementation status…",
    failedEyebrow: "Implementation status not updated",
    failedTitle: "Update failed",
    failedWithEvidence:
      "Earlier confirmed information remains visible. Retry before treating it as current.",
    failedWithoutEvidence:
      "No current implementation status is available. Retry before continuing.",
    pendingEyebrow: "Updating implementation status",
    pendingTitle: "Checking the selected proposal",
    pendingMessage:
      "Refreshing the proposal worklist and its implementation handoff.",
    confirmedEyebrow: "Implementation status updated",
    confirmedTitle: "Current handoff available",
  }),
});

const STATUS_COPY = Object.freeze({
  NOT_REQUESTED: Object.freeze({
    label: "Handoff not requested",
    tone: "default",
    summary:
      "No implementation handoff has been requested for this proposal.",
  }),
  REQUESTED: Object.freeze({
    label: "Handoff requested",
    tone: "default",
    summary:
      "The implementation request has been recorded and is awaiting acceptance.",
  }),
  ACCEPTED: Object.freeze({
    label: "Accepted for implementation",
    tone: "success",
    summary:
      "The implementation request has been accepted. Monitor for completion or a material difficulty.",
  }),
  PARTIALLY_EXECUTED: Object.freeze({
    label: "Partially implemented",
    tone: "warn",
    summary:
      "Part of the proposal has been implemented. Review the outstanding position before treating it as complete.",
  }),
  EXECUTED: Object.freeze({
    label: "Implementation reported complete",
    tone: "success",
    summary:
      "Implementation has been reported complete for this handoff. Review the boundary below before relying on downstream completion.",
  }),
  REJECTED: Object.freeze({
    label: "Handoff rejected",
    tone: "danger",
    summary:
      "The implementation request was rejected. Review the rejection before deciding whether to resubmit.",
  }),
  CANCELLED: Object.freeze({
    label: "Handoff cancelled",
    tone: "warn",
    summary:
      "The implementation request was cancelled. Confirm the client's current instruction and proposal version before restarting.",
  }),
  EXPIRED: Object.freeze({
    label: "Handoff expired",
    tone: "warn",
    summary:
      "The implementation request is no longer active. Revalidate the proposal and client instruction before requesting a new handoff.",
  }),
} satisfies Record<ProposalImplementationHandoffStatus, ImplementationStatusCopy>);

const NEXT_ACTION_COPY = Object.freeze({
  REQUEST_HANDOFF:
    "Open the proposal record to request implementation when all required approvals and client instructions are complete.",
  MONITOR_HANDOFF:
    "Monitor for acceptance and follow up if the request remains unacknowledged.",
  MONITOR_IMPLEMENTATION:
    "Monitor for completion or a material difficulty requiring follow-up.",
  REVIEW_PARTIAL_EXECUTION:
    "Review the outstanding implementation with the implementation team and agree the remaining action.",
  NO_ACTION: "No implementation follow-up is required from this screen.",
  INVESTIGATE_REJECTION:
    "Review the rejection with the implementation team before resubmitting.",
  REVIEW_CANCELLATION:
    "Confirm why the handoff was cancelled and whether a new client instruction is required.",
  REVALIDATE_HANDOFF:
    "Revalidate the proposal and client instruction before requesting a new handoff.",
} satisfies Record<ProposalImplementationNextAction, string>);

const VERSION_COPY = Object.freeze({
  not_correlated: Object.freeze({
    label: "Not linked",
    tone: "default",
    summary:
      "No implementation handoff is linked to a proposal version.",
  }),
  current_version: Object.freeze({
    label: "Current version",
    tone: "success",
    summary:
      "The implementation handoff relates to the selected proposal version.",
  }),
  historical_version: Object.freeze({
    label: "Earlier version",
    tone: "warn",
    summary:
      "The implementation handoff relates to an earlier proposal version. It must not be treated as implementation of the current version.",
  }),
} satisfies Record<
  ProposalImplementationVersionPosture,
  Readonly<{ label: string; tone: ImplementationCopyTone; summary: string }>
>);

const EVENT_LABELS = Object.freeze({
  EXECUTION_REQUESTED: "Implementation requested",
  EXECUTION_ACCEPTED: "Implementation accepted",
  EXECUTION_PARTIALLY_EXECUTED: "Partial implementation reported",
  EXECUTION_REJECTED: "Implementation rejected",
  EXECUTION_CANCELLED: "Implementation cancelled",
  EXECUTION_EXPIRED: "Implementation request expired",
  EXECUTED: "Implementation reported complete",
} satisfies Record<ProposalImplementationEventType, string>);

export function proposalImplementationStatusCopy(
  status: ProposalImplementationHandoffStatus,
): ImplementationStatusCopy {
  return STATUS_COPY[status];
}

export function proposalImplementationNextActionCopy(
  action: ProposalImplementationNextAction,
): string {
  return NEXT_ACTION_COPY[action];
}

export function proposalImplementationVersionCopy(
  version: ProposalImplementationVersionPosture,
) {
  return VERSION_COPY[version];
}

export function proposalImplementationEventLabel(
  event: ProposalImplementationEventType,
): string {
  return EVENT_LABELS[event];
}

export function proposalImplementationEvidenceCopy(isPartial: boolean) {
  return isPartial
    ? {
        label: "Handoff information incomplete",
        tone: "warn" as const,
        summary:
          "The current status is available, but one or more provider, version or event references are missing. Review the available information and support details before following up.",
      }
    : {
        label: "Handoff information complete",
        tone: "success" as const,
        summary:
          "The implementation status and required supporting references agree with the selected proposal.",
      };
}
