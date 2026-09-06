import { describe, expect, it } from "vitest";

import {
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
    })).toBe(3);
  });

  it("rejects a response version that is newer than refreshed proposal evidence", () => {
    const current = evidence(2);
    expect(() => confirmRefreshedProposalVersionEvidence({
      ...current,
      proposalDetail: current.detail,
      expectedProposalId: "proposal-1",
      expectedVersionNo: 3,
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
    })).toThrow("The source action returned evidence for a different proposal.");
  });
});
