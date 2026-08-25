import type { SemanticBadgeTone } from "@/design-system";
import {
  formatDateValue,
  formatTimestampValue,
} from "@/design-system/utils/financial-formatters";
import {
  PROPOSAL_IMPLEMENTATION_COPY,
  proposalImplementationEvidenceCopy,
  proposalImplementationEventLabel,
  proposalImplementationNextActionCopy,
  proposalImplementationStatusCopy,
  proposalImplementationVersionCopy,
} from "@/copy/proposal-implementation-copy";

import type { ProposalImplementationStatusEnvelope } from "./proposal-implementation-status-contract";

type StatusPresentation = {
  label: string;
  tone: SemanticBadgeTone;
  summary: string;
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
  currentness: {
    observedAt: string;
    basis: string;
  };
  supportDetails: Array<{ label: string; value: string }>;
};

export function buildProposalImplementationStatusModel(
  envelope: ProposalImplementationStatusEnvelope,
): ProposalImplementationStatusModel {
  const { data } = envelope;
  const handoff = proposalImplementationStatusCopy(data.handoff_status);
  const version = proposalImplementationVersionCopy(data.version_posture);
  const isPartial = data.evidence_state === "partial";
  const evidence = proposalImplementationEvidenceCopy(isPartial);
  const freshness = formatTimestampValue(data.freshness.observed_at, {
    nullDisplay: "Time not reported",
  });
  const freshnessBasis =
    data.freshness.basis === "LATEST_EXECUTION_EVENT"
      ? "Latest implementation event"
      : "Latest proposal event";

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
      nextAction: proposalImplementationNextActionCopy(data.next_action),
    },
    evidence: {
      isPartial,
      ...evidence,
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
        label: "Implementation requested",
        value: formatDateValue(data.handoff_requested_at, {
          nullDisplay: "Not requested",
        }),
      },
      {
        label: PROPOSAL_IMPLEMENTATION_COPY.currentnessLabel,
        value: freshness,
      },
      {
        label: PROPOSAL_IMPLEMENTATION_COPY.currentnessBasisLabel,
        value: freshnessBasis,
      },
    ],
    event: data.latest_workflow_event
      ? {
          type: proposalImplementationEventLabel(
            data.latest_workflow_event.event_type,
          ),
          actor: data.latest_workflow_event.actor_id,
          occurredAt: formatTimestampValue(data.latest_workflow_event.occurred_at, {
            nullDisplay: "Time not reported",
          }),
          eventId: data.latest_workflow_event.event_id,
        }
      : null,
    boundary: PROPOSAL_IMPLEMENTATION_COPY.boundary,
    currentness: {
      observedAt: freshness,
      basis: freshnessBasis,
    },
    supportDetails: [
      {
        label: "Source area",
        value: PROPOSAL_IMPLEMENTATION_COPY.supportSourceArea,
      },
      { label: "Source system", value: data.lineage.source_service },
      { label: "Response contract", value: data.lineage.source_contract },
      { label: "Response version", value: envelope.contract_version },
      { label: "Correlation reference", value: envelope.correlation_id },
      {
        label: "Implementation provider",
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
      {
        label: "Latest event reference",
        value: data.latest_workflow_event?.event_id ?? "Not reported",
      },
      { label: "Handoff status code", value: data.handoff_status },
      { label: "Next-action code", value: data.next_action },
      { label: "Reason code", value: data.reason_code },
    ],
  };
}
