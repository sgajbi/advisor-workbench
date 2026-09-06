import { describe, expect, it } from "vitest";

import {
  confirmProposalTransitionResponse,
  confirmRefreshedProposalVersionEvidence,
  evaluateProposalActionEvidence,
} from "../../src/features/proposals/proposal-action-evidence";

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
    expect(confirmProposalTransitionResponse({
      contract_version: "v1",
      correlation_id: "corr-1",
      data: {
        approval: null,
        current_state: "RISK_REVIEW",
        latest_workflow_event: {},
        proposal_id: "proposal-1",
      },
    }, "proposal-1", "RISK_REVIEW")).toBe("RISK_REVIEW");
  });

  it("rejects a transition response for another proposal", () => {
    expect(() => confirmProposalTransitionResponse({
      contract_version: "v1",
      correlation_id: "corr-1",
      data: {
        approval: null,
        current_state: "RISK_REVIEW",
        latest_workflow_event: {},
        proposal_id: "proposal-2",
      },
    }, "proposal-1", "RISK_REVIEW")).toThrow("did not confirm the expected proposal");
  });

  it("rejects a transition response that does not match the requested target state", () => {
    expect(() => confirmProposalTransitionResponse({
      contract_version: "v1",
      correlation_id: "corr-1",
      data: {
        approval: null,
        current_state: "COMPLIANCE_REVIEW",
        latest_workflow_event: {},
        proposal_id: "proposal-1",
      },
    }, "proposal-1", "RISK_REVIEW")).toThrow("did not confirm the expected proposal");
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
