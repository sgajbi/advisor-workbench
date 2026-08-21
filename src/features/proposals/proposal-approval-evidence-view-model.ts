import type { SemanticBadgeTone } from "@/design-system";
import { formatDateValue } from "@/design-system/utils/financial-formatters";

import {
  evaluateProposalActionEvidence,
  type ProposalActionEvidenceIssue,
} from "./proposal-action-evidence";
import {
  businessEventLabel,
  proposalNextAction,
  proposalStageLabel,
} from "./proposal-workflow-copy";
import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "./types";

export type ProposalApprovalEvidenceModel = ReturnType<
  typeof buildProposalApprovalEvidenceModel
>;

export type ProposalApprovalEvidenceIssue =
  | ProposalActionEvidenceIssue
  | "portfolio-mismatch"
  | "selected-state-mismatch"
  | "selected-version-mismatch";

export type ProposalApprovalEvidenceAgreement =
  | { issue: null; currentState: string }
  | { issue: ProposalApprovalEvidenceIssue; currentState?: string };

type ProposalApprovalEvidenceExpectation = {
  expectedPortfolioId: string;
  expectedProposalId: string;
  expectedState: string;
  expectedVersionNo: number | null;
};

export function buildProposalApprovalEvidenceModel({
  approvals,
  detail,
  expectedPortfolioId,
  expectedProposalId,
  expectedState,
  expectedVersionNo,
  lineage,
  workflow,
}: ProposalApprovalEvidenceExpectation & {
  approvals: ProposalApprovalsData;
  detail: ProposalDetailData;
  lineage: ProposalLineageData;
  workflow: ProposalWorkflowEventsData;
}) {
  const agreement = evaluateProposalApprovalEvidence({
    approvals,
    detail,
    expectedPortfolioId,
    expectedProposalId,
    expectedState,
    expectedVersionNo,
    lineage,
    workflow,
  });
  const proposal = detail.proposal;
  const approvalRecords = [...approvals.approvals]
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .map((approval) => ({
      id: approval.approval_id,
      type: businessEventLabel(approval.approval_type),
      decision: approval.approved ? "Approved" : "Not approved",
      actor: approval.actor_id || "Actor not reported",
      recorded: formatDateValue(approval.occurred_at, {
        nullDisplay: "Date not reported",
      }),
      tone: approval.approved
        ? ("success" as const)
        : ("danger" as const),
    }));
  const workflowEvents = [...workflow.events]
    .sort((left, right) => right.occurred_at.localeCompare(left.occurred_at))
    .slice(0, 3)
    .map((event) => ({
      id: event.event_id,
      event: businessEventLabel(event.event_type),
      transition: `${event.from_state ? proposalStageLabel(event.from_state) : "Start"} → ${proposalStageLabel(event.to_state)}`,
      actor: event.actor_id || "Actor not reported",
      recorded: formatDateValue(event.occurred_at, {
        nullDisplay: "Date not reported",
      }),
    }));
  const notApprovedCount = approvals.approvals.filter(
    (approval) => !approval.approved,
  ).length;

  return {
    identity: {
      proposalId: expectedProposalId,
      title: proposal.title || expectedProposalId,
      stage: proposalStageLabel(proposal.current_state),
      version:
        typeof proposal.current_version_no === "number"
          ? `Version ${proposal.current_version_no}`
          : "Version not reported",
      createdOn: formatDateValue(proposal.created_at, {
        nullDisplay: "Date not reported",
      }),
    },
    agreement,
    posture: approvalPosture({
      issue: agreement.issue,
      approvalCount: approvals.approvals.length,
      notApprovedCount,
      currentState: proposal.current_state,
    }),
    approvals: {
      count: approvals.approvals.length,
      approvedCount: approvals.approvals.length - notApprovedCount,
      notApprovedCount,
      records: approvalRecords,
    },
    workflow: {
      currentStage: proposalStageLabel(workflow.current_state),
      eventCount: workflow.events.length,
      recentEvents: workflowEvents,
    },
    lineage: {
      activeVersion:
        typeof proposal.current_version_no === "number"
          ? String(proposal.current_version_no)
          : "Not reported",
      versionCount: lineage.versions?.length ?? 0,
    },
  };
}

export function evaluateProposalApprovalEvidence({
  approvals,
  detail,
  expectedPortfolioId,
  expectedProposalId,
  expectedState,
  expectedVersionNo,
  lineage,
  workflow,
}: ProposalApprovalEvidenceExpectation & {
  approvals?: ProposalApprovalsData;
  detail?: ProposalDetailData;
  lineage?: ProposalLineageData;
  workflow?: ProposalWorkflowEventsData;
}): ProposalApprovalEvidenceAgreement {
  const sourceAgreement = evaluateProposalActionEvidence({
    approvals,
    detail,
    expectedProposalId,
    lineage,
    workflow,
  });
  if (sourceAgreement.issue) {
    return sourceAgreement;
  }
  const proposal = detail?.proposal;
  if (!proposal || proposal.portfolio_id !== expectedPortfolioId) {
    return {
      issue: "portfolio-mismatch",
      currentState: sourceAgreement.currentState,
    };
  }
  if (proposal.current_state !== expectedState) {
    return {
      issue: "selected-state-mismatch",
      currentState: sourceAgreement.currentState,
    };
  }
  if (
    expectedVersionNo === null ||
    proposal.current_version_no !== expectedVersionNo
  ) {
    return {
      issue: "selected-version-mismatch",
      currentState: sourceAgreement.currentState,
    };
  }
  return sourceAgreement;
}

export function confirmRefreshedProposalApprovalEvidence(
  expectation: ProposalApprovalEvidenceExpectation & {
    approvals?: ProposalApprovalsData;
    detail?: ProposalDetailData;
    lineage?: ProposalLineageData;
    workflow?: ProposalWorkflowEventsData;
  },
): void {
  const agreement = evaluateProposalApprovalEvidence(expectation);
  if (agreement.issue) {
    throw new Error(
      "The refreshed approval evidence does not agree with the current worklist record. Refresh the queue before relying on this proposal posture.",
    );
  }
}

function approvalPosture({
  issue,
  approvalCount,
  notApprovedCount,
  currentState,
}: {
  issue: ProposalApprovalEvidenceIssue | null;
  approvalCount: number;
  notApprovedCount: number;
  currentState: string;
}): {
  state: "ready" | "attention" | "empty" | "conflict";
  label: string;
  tone: SemanticBadgeTone;
  title: string;
  summary: string;
  nextAction: string;
} {
  if (issue) {
    const selectedRecordConflict =
      issue === "portfolio-mismatch" ||
      issue === "selected-state-mismatch" ||
      issue === "selected-version-mismatch";
    return {
      state: "conflict",
      label: "Evidence conflict",
      tone: "danger",
      title: evidenceConflictTitle(issue),
      summary: selectedRecordConflict
        ? "The selected worklist record no longer agrees with the current proposal detail, workflow, approvals, and lineage."
        : "The selected proposal's detail, workflow, approvals, and active-version lineage do not form one current source record.",
      nextAction: selectedRecordConflict
        ? "Refresh the proposal queue before relying on maker-checker posture."
        : "Refresh the selected proposal evidence before relying on maker-checker posture.",
    };
  }
  if (notApprovedCount > 0) {
    return {
      state: "attention",
      label: "Approval exception",
      tone: "danger",
      title: `${notApprovedCount} ${notApprovedCount === 1 ? "decision is" : "decisions are"} not approved`,
      summary:
        "The source approval register contains a decision that prevents an all-clear maker-checker interpretation.",
      nextAction:
        "Open the full proposal review and resolve the recorded approval exception.",
    };
  }
  if (approvalCount === 0) {
    return {
      state: "empty",
      label: "No approval records",
      tone: "warn",
      title: "No approval decision is recorded",
      summary:
        "Gateway returned an empty approval register. This does not mean that approval is not required.",
      nextAction:
        "Open the full proposal review and confirm the required maker-checker step.",
    };
  }
  return {
    state: "ready",
    label: "Approval evidence recorded",
    tone: "success",
    title: `${approvalCount} ${approvalCount === 1 ? "approval record" : "approval records"} confirmed`,
    summary:
      "Gateway confirms source approval records for the current workflow state. This does not by itself prove that every required gate is complete.",
    nextAction: `${proposalNextAction(currentState)}. Confirm the full proposal record before acting.`,
  };
}

function evidenceConflictTitle(
  issue: ProposalApprovalEvidenceIssue,
): string {
  if (issue === "proposal-mismatch") {
    return "Proposal identity does not agree";
  }
  if (issue === "state-mismatch") {
    return "Workflow state does not agree";
  }
  if (issue === "active-version-mismatch") {
    return "Active version lineage is not confirmed";
  }
  if (issue === "portfolio-mismatch") {
    return "Portfolio identity does not agree";
  }
  if (issue === "selected-state-mismatch") {
    return "Worklist stage is no longer current";
  }
  if (issue === "selected-version-mismatch") {
    return "Worklist version is no longer current";
  }
  return "Required approval evidence is incomplete";
}
