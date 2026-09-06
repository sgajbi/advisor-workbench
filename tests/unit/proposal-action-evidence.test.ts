import { describe, expect, it } from "vitest";

import {
  confirmProposalTransitionResponse,
  confirmRefreshedProposalActionEvidence,
  confirmRefreshedProposalVersionEvidence,
  evaluateProposalActionEvidence,
} from "../../src/features/proposals/proposal-action-evidence";
import type { ProposalLifecycleCommandIntent } from "../../src/features/proposals/use-proposal-command-recovery";

const riskIntent: ProposalLifecycleCommandIntent = {
  action: "approve-risk",
  expectedState: "AWAITING_CLIENT_CONSENT",
  idempotencyKey: "risk-1",
  kind: "lifecycle",
  previousState: "RISK_REVIEW",
  proposalId: "proposal-1",
  request: { actor_id: "risk_officer_1", expected_state: "RISK_REVIEW" },
};

function riskResponse() {
  return {
    contract_version: "v1",
    correlation_id: "corr-1",
    data: {
      approval: {
        approval_id: "approval-risk-1",
        approval_type: "RISK",
        approved: true,
        actor_id: "risk_officer_1",
        occurred_at: "2026-09-06T01:00:00Z",
        proposal_id: "proposal-1",
      },
      current_state: "AWAITING_CLIENT_CONSENT",
      latest_workflow_event: {
        actor_id: "risk_officer_1",
        event_id: "event-risk-1",
        event_type: "RISK_APPROVED",
        from_state: "RISK_REVIEW",
        occurred_at: "2026-09-06T01:00:00Z",
        proposal_id: "proposal-1",
        to_state: "AWAITING_CLIENT_CONSENT",
      },
      proposal_id: "proposal-1",
    },
  };
}

function evidence(versionNo = 2, proposalId = "proposal-1") {
  return {
    approvals: {
      proposal_id: proposalId,
      current_state: "DRAFT",
      approvals: [],
    },
    detail: {
      proposal: {
        proposal_id: proposalId,
        portfolio_id: "portfolio-1",
        current_state: "DRAFT",
        current_version_no: versionNo,
      },
    },
    lineage: {
      proposal_id: proposalId,
      versions: [{
        version_no: versionNo,
        request_hash: "request-hash",
        simulation_hash: "simulation-hash",
        artifact_hash: "artifact-hash",
      }],
    },
    workflow: {
      proposal_id: proposalId,
      current_state: "DRAFT",
      events: [],
    },
  };
}

describe("proposal action evidence", () => {
  it("accepts a transition response only for the expected proposal and posture", () => {
    expect(confirmProposalTransitionResponse(riskResponse(), riskIntent)).toEqual({
      actorId: "risk_officer_1",
      approvalId: "approval-risk-1",
      approvalOccurredAt: "2026-09-06T01:00:00Z",
      approvalType: "RISK",
      eventId: "event-risk-1",
      eventOccurredAt: "2026-09-06T01:00:00Z",
      eventType: "RISK_APPROVED",
    });
  });

  it("rejects a transition response for another proposal", () => {
    const response = riskResponse();
    response.data.proposal_id = "proposal-2";
    expect(() => confirmProposalTransitionResponse(response, riskIntent)).toThrow(
      "did not confirm the expected proposal",
    );
  });

  it("rejects a transition response that does not match the requested target state", () => {
    const response = riskResponse();
    response.data.current_state = "COMPLIANCE_REVIEW";
    expect(() => confirmProposalTransitionResponse(response, riskIntent)).toThrow(
      "did not confirm the expected proposal",
    );
  });

  it("rejects an approval response for a different review action", () => {
    const response = riskResponse();
    response.data.approval.approval_type = "COMPLIANCE";
    expect(() => confirmProposalTransitionResponse(response, riskIntent)).toThrow(
      "did not confirm the expected proposal",
    );
  });

  it("distinguishes compliance evidence from the same target posture", () => {
    const intent: ProposalLifecycleCommandIntent = {
      ...riskIntent,
      action: "approve-compliance",
      previousState: "COMPLIANCE_REVIEW",
      request: { actor_id: "compliance_officer_1", expected_state: "COMPLIANCE_REVIEW" },
    };
    const response = riskResponse();
    response.data.latest_workflow_event.event_type = "COMPLIANCE_APPROVED";
    response.data.latest_workflow_event.from_state = "COMPLIANCE_REVIEW";
    response.data.latest_workflow_event.actor_id = "compliance_officer_1";
    response.data.approval.approval_type = "COMPLIANCE";
    response.data.approval.actor_id = "compliance_officer_1";

    expect(confirmProposalTransitionResponse(response, intent)).toMatchObject({
      actorId: "compliance_officer_1",
      approvalType: "COMPLIANCE",
      eventType: "COMPLIANCE_APPROVED",
    });
  });

  it("requires the exact returned event and approval in refreshed source evidence", () => {
    const confirmation = confirmProposalTransitionResponse(riskResponse(), riskIntent);
    const current = evidence();
    current.detail.proposal.current_state = "AWAITING_CLIENT_CONSENT";
    current.workflow.current_state = "AWAITING_CLIENT_CONSENT";
    current.approvals.current_state = "AWAITING_CLIENT_CONSENT";
    const confirmedEvidence = {
      ...current,
      approvals: { ...current.approvals, approvals: [riskResponse().data.approval] },
      workflow: { ...current.workflow, events: [riskResponse().data.latest_workflow_event] },
    };

    expect(confirmRefreshedProposalActionEvidence({
      approvals: confirmedEvidence.approvals,
      confirmation,
      expectedProposalId: "proposal-1",
      expectedState: "AWAITING_CLIENT_CONSENT",
      lineage: current.lineage,
      previousState: "RISK_REVIEW",
      proposalDetail: current.detail,
      workflow: confirmedEvidence.workflow,
    })).toBe("AWAITING_CLIENT_CONSENT");

    expect(() => confirmRefreshedProposalActionEvidence({
      approvals: confirmedEvidence.approvals,
      confirmation,
      expectedProposalId: "proposal-1",
      expectedState: "AWAITING_CLIENT_CONSENT",
      lineage: current.lineage,
      previousState: "RISK_REVIEW",
      proposalDetail: current.detail,
      workflow: current.workflow,
    })).toThrow("does not contain its exact workflow or approval record");

    expect(() => confirmRefreshedProposalActionEvidence({
      approvals: current.approvals,
      confirmation,
      expectedProposalId: "proposal-1",
      expectedState: "AWAITING_CLIENT_CONSENT",
      lineage: current.lineage,
      previousState: "RISK_REVIEW",
      proposalDetail: current.detail,
      workflow: confirmedEvidence.workflow,
    })).toThrow("does not contain its exact workflow or approval record");
  });

  it("retains exact action proof when coherent source posture has advanced", () => {
    const confirmation = confirmProposalTransitionResponse(riskResponse(), riskIntent);
    const current = evidence();
    current.detail.proposal.current_state = "EXECUTION_READY";
    current.workflow.current_state = "EXECUTION_READY";
    current.approvals.current_state = "EXECUTION_READY";
    const advancedEvidence = {
      ...current,
      approvals: { ...current.approvals, approvals: [riskResponse().data.approval] },
      workflow: { ...current.workflow, events: [riskResponse().data.latest_workflow_event] },
    };

    expect(confirmRefreshedProposalActionEvidence({
      approvals: advancedEvidence.approvals,
      confirmation,
      expectedProposalId: "proposal-1",
      expectedState: "AWAITING_CLIENT_CONSENT",
      lineage: current.lineage,
      previousState: "RISK_REVIEW",
      proposalDetail: current.detail,
      workflow: advancedEvidence.workflow,
    })).toBe("EXECUTION_READY");
  });

  it("accepts source evidence only when proposal, posture, and active version agree", () => {
    expect(evaluateProposalActionEvidence({
      ...evidence(),
      expectedProposalId: "proposal-1",
    })).toEqual({ issue: null, currentState: "DRAFT" });
  });

  it("confirms the newly created version from the refreshed source set", () => {
    const current = evidence(3);
    expect(confirmRefreshedProposalVersionEvidence({
      ...current,
      proposalDetail: current.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 3,
      previousVersionNo: 2,
    })).toBe(3);
  });

  it("confirms a created version retained in lineage after a later version becomes active", () => {
    const advanced = evidence(4);
    advanced.lineage.versions.unshift({
      artifact_hash: "artifact-3",
      request_hash: "request-3",
      simulation_hash: "simulation-3",
      version_no: 3,
    });

    expect(confirmRefreshedProposalVersionEvidence({
      ...advanced,
      proposalDetail: advanced.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 3,
      previousVersionNo: 2,
    })).toBe(3);
  });

  it("rejects a response version that is newer than refreshed proposal evidence", () => {
    const current = evidence(2);
    expect(() => confirmRefreshedProposalVersionEvidence({
      ...current,
      proposalDetail: current.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 3,
      previousVersionNo: 2,
    })).toThrow(
      "The source action returned lineage that does not confirm the newly created proposal version.",
    );
  });

  it("rejects lineage that omits the refreshed active version", () => {
    const mismatched = evidence(3);
    mismatched.lineage.versions[0].version_no = 2;

    expect(() => confirmRefreshedProposalVersionEvidence({
      ...mismatched,
      proposalDetail: mismatched.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 3,
      previousVersionNo: 2,
    })).toThrow(
      "The source action returned lineage that does not confirm the newly created proposal version.",
    );
  });

  it("rejects advanced active evidence when lineage omits the exact created version", () => {
    const advanced = evidence(4);

    expect(() => confirmRefreshedProposalVersionEvidence({
      ...advanced,
      proposalDetail: advanced.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 3,
      previousVersionNo: 2,
    })).toThrow(
      "The source action returned lineage that does not confirm the newly created proposal version.",
    );
  });

  it("rejects a refreshed source set for another proposal", () => {
    const current = evidence(2, "proposal-2");
    expect(() => confirmRefreshedProposalVersionEvidence({
      ...current,
      proposalDetail: current.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 2,
      previousVersionNo: 1,
    })).toThrow("The source action returned evidence for a different proposal.");
  });

  it("rejects a created-version replay that does not advance the active version", () => {
    const current = evidence(2);
    expect(() => confirmRefreshedProposalVersionEvidence({
      ...current,
      proposalDetail: current.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 2,
      previousVersionNo: 2,
    })).toThrow("does not confirm the newly created proposal version");
  });
});
