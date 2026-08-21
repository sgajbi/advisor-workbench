import type { SemanticBadgeTone } from "@/design-system";
import { formatDateValue } from "@/design-system/utils/financial-formatters";

import type {
  ProposalImplementationHandoffStatus,
  ProposalImplementationNextAction,
  ProposalImplementationStatusEnvelope,
  ProposalImplementationVersionPosture,
} from "./proposal-implementation-status-contract";

type StatusPresentation = {
  label: string;
  tone: SemanticBadgeTone;
  summary: string;
};

const STATUS_PRESENTATION: Record<
  ProposalImplementationHandoffStatus,
  StatusPresentation
> = {
  NOT_REQUESTED: {
    label: "Handoff not requested",
    tone: "default",
    summary:
      "The proposal is ready for implementation, but no execution handoff has been recorded.",
  },
  REQUESTED: {
    label: "Handoff requested",
    tone: "default",
    summary:
      "The execution provider has received the handoff request. Acceptance has not yet been confirmed.",
  },
  ACCEPTED: {
    label: "Accepted for implementation",
    tone: "success",
    summary:
      "The execution provider has accepted the handoff. Implementation remains in progress until a later source event is received.",
  },
  PARTIALLY_EXECUTED: {
    label: "Partially implemented",
    tone: "warn",
    summary:
      "The source reports partial implementation. Review the downstream exception before treating the proposal as complete.",
  },
  EXECUTED: {
    label: "Implementation reported complete",
    tone: "success",
    summary:
      "The source reports implementation complete for this handoff. Settlement and custody booking are outside this evidence contract.",
  },
  REJECTED: {
    label: "Handoff rejected",
    tone: "danger",
    summary:
      "The execution provider rejected the handoff. Investigate the source exception before resubmission.",
  },
  CANCELLED: {
    label: "Handoff cancelled",
    tone: "warn",
    summary:
      "The handoff was cancelled. Confirm the client and proposal posture before deciding whether to restart implementation.",
  },
  EXPIRED: {
    label: "Handoff expired",
    tone: "warn",
    summary:
      "The handoff is no longer active. Revalidate the proposal and supporting evidence before creating a new request.",
  },
};

const NEXT_ACTION_LABELS: Record<ProposalImplementationNextAction, string> = {
  REQUEST_HANDOFF:
    "Request the governed implementation handoff when the proposal is ready to proceed.",
  MONITOR_HANDOFF:
    "Monitor for provider acceptance; follow up if the request remains unacknowledged.",
  MONITOR_IMPLEMENTATION:
    "Monitor source updates until implementation completes or an exception is reported.",
  REVIEW_PARTIAL_EXECUTION:
    "Review the partial implementation with the execution team and agree the remaining action.",
  NO_ACTION: "No implementation follow-up is required from this handoff view.",
  INVESTIGATE_REJECTION:
    "Investigate the rejection reason with the execution team before resubmission.",
  REVIEW_CANCELLATION:
    "Confirm why the handoff was cancelled and whether a new client instruction is required.",
  REVALIDATE_HANDOFF:
    "Revalidate proposal evidence and client intent before requesting a new handoff.",
};

const VERSION_PRESENTATION: Record<
  ProposalImplementationVersionPosture,
  { label: string; tone: SemanticBadgeTone; summary: string }
> = {
  not_correlated: {
    label: "No version correlation",
    tone: "default",
    summary: "No implementation request is correlated to a proposal version.",
  },
  current_version: {
    label: "Current version",
    tone: "success",
    summary:
      "The handoff evidence is correlated to the selected proposal version.",
  },
  historical_version: {
    label: "Earlier version",
    tone: "warn",
    summary:
      "The handoff evidence relates to an earlier proposal version. Do not assume it implements the current version.",
  },
};

export type ProposalImplementationStatusModel = {
  identity: {
    proposalId: string;
    portfolioId: string;
    title: string;
    currentVersion: string;
  };
  handoff: StatusPresentation & {
    attentionRequired: boolean;
    nextAction: string;
  };
  evidence: {
    isPartial: boolean;
    label: string;
    tone: SemanticBadgeTone;
    summary: string;
  };
  version: {
    label: string;
    tone: SemanticBadgeTone;
    summary: string;
    relatedVersion: string;
  };
  facts: Array<{ label: string; value: string }>;
  event: {
    type: string;
    actor: string;
    occurredAt: string;
    eventId: string;
  } | null;
  boundary: string;
  lineage: {
    source: string;
    freshness: string;
    freshnessBasis: string;
    correlationId: string;
  };
};

export function buildProposalImplementationStatusModel(
  envelope: ProposalImplementationStatusEnvelope,
): ProposalImplementationStatusModel {
  const { data } = envelope;
  const handoff = STATUS_PRESENTATION[data.handoff_status];
  const version = VERSION_PRESENTATION[data.version_posture];
  const isPartial = data.evidence_state === "partial";

  return {
    identity: {
      proposalId: data.proposal_id,
      portfolioId: data.portfolio_id,
      title: data.title?.trim() || data.proposal_id,
      currentVersion: `Version ${data.current_version_no}`,
    },
    handoff: {
      ...handoff,
      attentionRequired: data.attention_required,
      nextAction: NEXT_ACTION_LABELS[data.next_action],
    },
    evidence: {
      isPartial,
      label: isPartial ? "Partial source evidence" : "Source-confirmed",
      tone: isPartial ? "warn" : "success",
      summary: isPartial
        ? "The source status is shown, but one or more provider, version, or event references are unavailable. Treat the posture as incomplete evidence."
        : "The handoff status and its supporting references agree with the selected proposal.",
    },
    version: {
      ...version,
      relatedVersion:
        data.related_version_no === null
          ? "Not linked"
          : `Version ${data.related_version_no}`,
    },
    facts: [
      {
        label: "Handoff requested",
        value: formatDateValue(data.handoff_requested_at, {
          nullDisplay: "Not requested",
        }),
      },
      {
        label: "Execution provider",
        value: data.execution_provider ?? "Not reported",
      },
      {
        label: "Provider request",
        value: data.execution_request_id ?? "Not reported",
      },
      {
        label: "Downstream reference",
        value: data.external_execution_id ?? "Not reported",
      },
    ],
    event: data.latest_workflow_event
      ? {
          type: eventLabel(data.latest_workflow_event.event_type),
          actor: data.latest_workflow_event.actor_id,
          occurredAt: formatDateTime(data.latest_workflow_event.occurred_at),
          eventId: data.latest_workflow_event.event_id,
        }
      : null,
    boundary:
      "This view confirms advisory handoff and reconciliation status only. Order, fill, allocation, settlement, custody-booking, and accounting detail are not supported by this contract and are not inferred.",
    lineage: {
      source: "Advisory implementation handoff through Gateway",
      freshness: formatDateTime(data.freshness.observed_at),
      freshnessBasis:
        data.freshness.basis === "LATEST_EXECUTION_EVENT"
          ? "Latest implementation event"
          : "Latest proposal event",
      correlationId: envelope.correlation_id,
    },
  };
}

function eventLabel(eventType: string): string {
  return eventType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}
