import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "./types";
import { ProposalActionBusinessError } from "./proposal-action-error";

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
  if (!detail?.proposal || !workflow || !approvals || !lineage) {
    return { issue: "missing-evidence" };
  }
  if (
    detail.proposal.proposal_id !== expectedProposalId ||
    workflow.proposal_id !== expectedProposalId ||
    approvals.proposal_id !== expectedProposalId ||
    lineage.proposal_id !== expectedProposalId
  ) {
    return { issue: "proposal-mismatch" };
  }
  const currentState = detail.proposal.current_state;
  if (
    !currentState ||
    workflow.current_state !== currentState ||
    approvals.current_state !== currentState
  ) {
    return { issue: "state-mismatch", currentState };
  }
  const activeVersionNo = detail.proposal.current_version_no;
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
  detail,
  expectedProposalId,
  lineage,
  previousState,
  workflow,
}: {
  approvals?: ProposalApprovalsData;
  detail?: ProposalDetailData;
  expectedProposalId: string;
  lineage?: ProposalLineageData;
  previousState: string;
  workflow?: ProposalWorkflowEventsData;
}): string {
  const agreement = evaluateProposalActionEvidence({
    approvals,
    detail,
    expectedProposalId,
    lineage,
    workflow,
  });
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
