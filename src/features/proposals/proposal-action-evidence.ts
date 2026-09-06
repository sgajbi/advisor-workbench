import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "./types";
import { ProposalActionBusinessError } from "./proposal-action-error";

export class ProposalPersistedEvidenceConfirmationError extends ProposalActionBusinessError {}

export type ProposalActionEvidenceIssue =
  | "missing-evidence"
  | "proposal-mismatch"
  | "state-mismatch"
  | "active-version-mismatch";

export type ProposalActionEvidenceAgreement =
  | { issue: null; currentState: string }
  | { issue: ProposalActionEvidenceIssue; currentState?: string };

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
  expectedProposalId,
  lineage,
  previousState,
  proposalDetail,
  workflow,
}: {
  approvals?: ProposalApprovalsData;
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
      "The source action returned evidence for a different proposal. Reload the proposal before continuing.",
    );
  }
  if (
    agreement.issue === "state-mismatch" ||
    agreement.issue === "missing-evidence"
  ) {
    throw new ProposalActionBusinessError(
      "The source action returned review evidence that does not agree on the current proposal posture. Reload the proposal before continuing.",
    );
  }
  if (agreement.issue === "active-version-mismatch") {
    throw new ProposalActionBusinessError(
      "The source action returned lineage that does not confirm the active proposal version. Reload the proposal before continuing.",
    );
  }
  const refreshedState = agreement.currentState;
  if (!refreshedState || refreshedState === previousState) {
    throw new ProposalActionBusinessError(
      "The source action returned, but the proposal posture has not changed. Reload the proposal before continuing.",
    );
  }
  return refreshedState;
}

export function confirmRefreshedProposalVersionEvidence({
  approvals,
  expectedProposalId,
  expectedVersionNo,
  lineage,
  proposalDetail,
  workflow,
}: {
  approvals?: ProposalApprovalsData;
  expectedProposalId: string;
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
      "The source action returned evidence for a different proposal. Reload the proposal before continuing.",
    );
  }
  if (agreement.issue === "state-mismatch" || agreement.issue === "missing-evidence") {
    throw new ProposalActionBusinessError(
      "The source action returned review evidence that does not agree on the current proposal posture. Reload the proposal before continuing.",
    );
  }
  if (
    agreement.issue === "active-version-mismatch" ||
    proposalDetail?.proposal.current_version_no !== expectedVersionNo
  ) {
    throw new ProposalActionBusinessError(
      "The source action returned lineage that does not confirm the newly created proposal version. Reload the proposal before continuing.",
    );
  }
  return expectedVersionNo;
}
