import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
  ProposalStateTransitionEnvelopeResponse,
} from "./types";
import { timestampsRepresentSameInstant } from "@/design-system/utils/financial-formatters";
import { ProposalActionBusinessError } from "./proposal-action-error";
import type { ProposalLifecycleCommandIntent } from "./use-proposal-command-recovery";

export class ProposalPersistedEvidenceConfirmationError extends ProposalActionBusinessError {}

export type ProposalActionEvidenceIssue =
  | "missing-evidence"
  | "proposal-mismatch"
  | "state-mismatch"
  | "active-version-mismatch";

export type ProposalActionEvidenceAgreement =
  | { issue: null; currentState: string }
  | { issue: ProposalActionEvidenceIssue; currentState?: string };

export type ProposalTransitionConfirmation = Readonly<{
  actorId: string;
  approvalId: string | null;
  approvalOccurredAt: string | null;
  approvalType: "CLIENT_CONSENT" | "COMPLIANCE" | "RISK" | null;
  eventId: string;
  eventOccurredAt: string;
  eventType: string;
}>;

function expectedTransitionEvidence(intent: ProposalLifecycleCommandIntent) {
  switch (intent.action) {
    case "submit":
      return {
        approvalType: null,
        eventType: `SUBMITTED_FOR_${intent.request.review_type}_REVIEW`,
      } as const;
    case "approve-risk":
      return { approvalType: "RISK", eventType: "RISK_APPROVED" } as const;
    case "approve-compliance":
      return { approvalType: "COMPLIANCE", eventType: "COMPLIANCE_APPROVED" } as const;
    case "record-client-consent":
      return { approvalType: "CLIENT_CONSENT", eventType: "CLIENT_CONSENT_RECORDED" } as const;
  }
}

function confirmsReachedTransition(currentState: string, expectedState: string): boolean {
  if (currentState === expectedState) return true;
  if (expectedState === "RISK_REVIEW" || expectedState === "COMPLIANCE_REVIEW") {
    return currentState === "AWAITING_CLIENT_CONSENT" || currentState === "EXECUTION_READY";
  }
  return expectedState === "AWAITING_CLIENT_CONSENT" && currentState === "EXECUTION_READY";
}

export function confirmProposalTransitionResponse(
  response: ProposalStateTransitionEnvelopeResponse,
  intent: ProposalLifecycleCommandIntent,
): ProposalTransitionConfirmation {
  const responseData = response?.data;
  const event = responseData?.latest_workflow_event;
  const expected = expectedTransitionEvidence(intent);
  const approval = responseData?.approval;
  if (
    responseData?.proposal_id !== intent.proposalId
    || responseData.current_state !== intent.expectedState
    || !event?.event_id
    || event.proposal_id != null && event.proposal_id !== intent.proposalId
    || event.event_type !== expected.eventType
    || event.from_state !== intent.previousState
    || event.to_state !== intent.expectedState
    || event.actor_id !== intent.request.actor_id
    || !event.occurred_at
    || (expected.approvalType === null && approval !== null)
    || (expected.approvalType !== null && (
      !approval?.approval_id
      || approval.proposal_id != null && approval.proposal_id !== intent.proposalId
      || approval.approval_type !== expected.approvalType
      || approval.approved !== true
      || approval.actor_id !== intent.request.actor_id
      || !approval.occurred_at
    ))
  ) {
    throw new ProposalActionBusinessError(
      "The source action completed, but did not confirm the expected proposal and workflow posture. Use Recheck earlier action before continuing.",
    );
  }
  return {
    actorId: intent.request.actor_id,
    approvalId: approval?.approval_id ?? null,
    approvalOccurredAt: approval?.occurred_at ?? null,
    approvalType: expected.approvalType,
    eventId: event.event_id,
    eventOccurredAt: event.occurred_at,
    eventType: expected.eventType,
  };
}

export function evaluateProposalActionEvidence({
  approvals,
  detail,
  expectedProposalId,
  lineage,
  workflow,
}: {
  approvals?: ProposalApprovalsData;
  detail?: ProposalDetailData;
  expectedProposalId: string;
  lineage?: ProposalLineageData;
  workflow?: ProposalWorkflowEventsData;
}): ProposalActionEvidenceAgreement {
  return evaluateProposalActionEvidenceValues(
    { approvals, expectedProposalId, lineage, workflow },
    detail,
  );
}

function evaluateProposalActionEvidenceValues(
  {
    approvals,
    expectedProposalId,
    lineage,
    workflow,
  }: {
    approvals?: ProposalApprovalsData;
    expectedProposalId: string;
    lineage?: ProposalLineageData;
    workflow?: ProposalWorkflowEventsData;
  },
  proposalRecord?: ProposalDetailData,
): ProposalActionEvidenceAgreement {
  if (!proposalRecord?.proposal || !workflow || !approvals || !lineage) {
    return { issue: "missing-evidence" };
  }
  if (
    proposalRecord.proposal.proposal_id !== expectedProposalId ||
    workflow.proposal_id !== expectedProposalId ||
    approvals.proposal_id !== expectedProposalId ||
    lineage.proposal_id !== expectedProposalId
  ) {
    return { issue: "proposal-mismatch" };
  }
  const currentState = proposalRecord.proposal.current_state;
  if (
    !currentState ||
    workflow.current_state !== currentState ||
    approvals.current_state !== currentState
  ) {
    return { issue: "state-mismatch", currentState };
  }
  const activeVersionNo = proposalRecord.proposal.current_version_no;
  if (
    !Number.isInteger(activeVersionNo) ||
    !lineage.versions?.some(
      (version) => version.version_no === activeVersionNo,
    )
  ) {
    return { issue: "active-version-mismatch", currentState };
  }
  return { issue: null, currentState };
}

export function confirmRefreshedProposalActionEvidence({
  approvals,
  confirmation,
  expectedState,
  expectedProposalId,
  lineage,
  previousState,
  proposalDetail,
  workflow,
}: {
  approvals?: ProposalApprovalsData;
  confirmation: ProposalTransitionConfirmation;
  expectedState: string;
  expectedProposalId: string;
  lineage?: ProposalLineageData;
  previousState: string;
  proposalDetail?: ProposalDetailData;
  workflow?: ProposalWorkflowEventsData;
}): string {
  const agreement = evaluateProposalActionEvidenceValues(
    { approvals, expectedProposalId, lineage, workflow },
    proposalDetail,
  );
  if (agreement.issue === "proposal-mismatch") {
    throw new ProposalActionBusinessError(
      "The source action returned evidence for a different proposal. Use Recheck earlier action before continuing.",
    );
  }
  if (
    agreement.issue === "state-mismatch" ||
    agreement.issue === "missing-evidence"
  ) {
    throw new ProposalActionBusinessError(
      "The source action returned review evidence that does not agree on the current proposal posture. Use Recheck earlier action before continuing.",
    );
  }
  if (agreement.issue === "active-version-mismatch") {
    throw new ProposalActionBusinessError(
      "The source action returned lineage that does not confirm the active proposal version. Use Recheck earlier action before continuing.",
    );
  }
  const refreshedState = agreement.currentState;
  if (!refreshedState || !confirmsReachedTransition(refreshedState, expectedState)) {
    throw new ProposalActionBusinessError(
      "The source action returned, but the current proposal posture does not confirm that transition. Use Recheck earlier action before continuing.",
    );
  }
  const eventConfirmed = workflow?.events.some(
    (event) => event.event_id === confirmation.eventId
      && event.event_type === confirmation.eventType
      && event.from_state === previousState
      && event.to_state === expectedState
      && event.actor_id === confirmation.actorId
      && timestampsRepresentSameInstant(event.occurred_at, confirmation.eventOccurredAt),
  );
  const approvalConfirmed = confirmation.approvalId === null
    ? confirmation.approvalType === null
    : approvals?.approvals.some(
      (approval) => approval.approval_id === confirmation.approvalId
        && approval.approval_type === confirmation.approvalType
        && approval.approved === true
        && approval.actor_id === confirmation.actorId
        && timestampsRepresentSameInstant(
          approval.occurred_at,
          confirmation.approvalOccurredAt,
        ),
    );
  if (!eventConfirmed || !approvalConfirmed) {
    throw new ProposalActionBusinessError(
      "The source action returned, but the refreshed review history does not contain its exact workflow or approval record. Use Recheck earlier action before continuing.",
    );
  }
  return refreshedState;
}

export function confirmRefreshedProposalVersionEvidence({
  approvals,
  expectedProposalId,
  previousVersionNo,
  expectedVersionNo,
  lineage,
  proposalDetail,
  workflow,
}: {
  approvals?: ProposalApprovalsData;
  expectedProposalId: string;
  previousVersionNo: number;
  expectedVersionNo: number;
  lineage?: ProposalLineageData;
  proposalDetail?: ProposalDetailData;
  workflow?: ProposalWorkflowEventsData;
}): number {
  const agreement = evaluateProposalActionEvidenceValues(
    { approvals, expectedProposalId, lineage, workflow },
    proposalDetail,
  );
  if (agreement.issue === "proposal-mismatch") {
    throw new ProposalActionBusinessError(
      "The source action returned evidence for a different proposal. Use Recheck earlier action before continuing.",
    );
  }
  if (agreement.issue === "state-mismatch" || agreement.issue === "missing-evidence") {
    throw new ProposalActionBusinessError(
      "The source action returned review evidence that does not agree on the current proposal posture. Use Recheck earlier action before continuing.",
    );
  }
  const refreshedVersionNo = proposalDetail?.proposal.current_version_no;
  const createdVersionRetained = lineage?.versions?.some(
    (version) => version.version_no === expectedVersionNo,
  );
  if (
    agreement.issue === "active-version-mismatch" ||
    expectedVersionNo <= previousVersionNo ||
    !Number.isInteger(refreshedVersionNo) ||
    (refreshedVersionNo ?? 0) < expectedVersionNo ||
    !createdVersionRetained
  ) {
    throw new ProposalActionBusinessError(
      "The source action returned lineage that does not confirm the newly created proposal version. Use Recheck earlier action before continuing.",
    );
  }
  return expectedVersionNo;
}
