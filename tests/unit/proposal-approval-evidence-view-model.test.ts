import { describe, expect, it } from "vitest";

import { buildProposalApprovalEvidenceModel } from "../../src/features/proposals/proposal-approval-evidence-view-model";
import type {
  ProposalApprovalsData,
  ProposalDetailData,
  ProposalLineageData,
  ProposalWorkflowEventsData,
} from "../../src/features/proposals/types";

const proposalId = "PRP-APPROVAL-001";

function evidenceFixture() {
  const detail: ProposalDetailData = {
    proposal: {
      proposal_id: proposalId,
      portfolio_id: "PB_SG_GLOBAL_BAL_001",
      current_state: "COMPLIANCE_REVIEW",
      current_version_no: 3,
      title: "Income mandate rebalance",
      created_at: "2026-08-20T09:30:00Z",
    },
  };
  const workflow: ProposalWorkflowEventsData = {
    proposal_id: proposalId,
    current_state: "COMPLIANCE_REVIEW",
    events: [
      {
        event_id: "event-1",
        event_type: "RISK_APPROVED",
        from_state: "RISK_REVIEW",
        to_state: "COMPLIANCE_REVIEW",
        actor_id: "risk-officer-1",
        occurred_at: "2026-08-21T09:00:00Z",
      },
    ],
  };
  const approvals: ProposalApprovalsData = {
    proposal_id: proposalId,
    current_state: "COMPLIANCE_REVIEW",
    approvals: [
      {
        approval_id: "approval-risk-1",
        approval_type: "RISK",
        approved: true,
        actor_id: "risk-officer-1",
        occurred_at: "2026-08-21T09:00:00Z",
      },
    ],
  };
  const lineage: ProposalLineageData = {
    proposal_id: proposalId,
    versions: [{ version_no: 3, created_at: "2026-08-20T09:30:00Z" }],
  };
  return { approvals, detail, lineage, workflow };
}

describe("proposal approval evidence view model", () => {
  it("derives recorded maker-checker posture from agreeing source records", () => {
    const model = buildProposalApprovalEvidenceModel({
      ...evidenceFixture(),
      expectedProposalId: proposalId,
    });

    expect(model.agreement.issue).toBeNull();
    expect(model.posture).toMatchObject({
      state: "ready",
      label: "Approval evidence recorded",
      title: "1 approval record confirmed",
    });
    expect(model.approvals.records[0]).toMatchObject({
      type: "Risk",
      decision: "Approved",
      actor: "risk-officer-1",
    });
    expect(model.workflow.recentEvents[0]).toMatchObject({
      event: "Risk Approved",
      transition: "Risk review → Compliance review",
    });
  });

  it("treats an empty approval register as unknown requirement posture", () => {
    const fixture = evidenceFixture();
    fixture.approvals.approvals = [];

    const model = buildProposalApprovalEvidenceModel({
      ...fixture,
      expectedProposalId: proposalId,
    });

    expect(model.posture).toMatchObject({
      state: "empty",
      label: "No approval records",
      title: "No approval decision is recorded",
    });
    expect(model.posture.summary).toContain(
      "does not mean that approval is not required",
    );
  });

  it("surfaces a recorded not-approved decision as an exception", () => {
    const fixture = evidenceFixture();
    fixture.approvals.approvals[0].approved = false;

    const model = buildProposalApprovalEvidenceModel({
      ...fixture,
      expectedProposalId: proposalId,
    });

    expect(model.posture).toMatchObject({
      state: "attention",
      label: "Approval exception",
      title: "1 decision is not approved",
    });
    expect(model.approvals.notApprovedCount).toBe(1);
  });

  it.each([
    ["proposal identity", (fixture: ReturnType<typeof evidenceFixture>) => {
      fixture.approvals.proposal_id = "PRP-OTHER";
    }, "proposal-mismatch", "Proposal identity does not agree"],
    ["workflow state", (fixture: ReturnType<typeof evidenceFixture>) => {
      fixture.workflow.current_state = "RISK_REVIEW";
    }, "state-mismatch", "Workflow state does not agree"],
    ["active version", (fixture: ReturnType<typeof evidenceFixture>) => {
      fixture.lineage.versions = [{ version_no: 2 }];
    }, "active-version-mismatch", "Active version lineage is not confirmed"],
  ])("fails closed when %s evidence conflicts", (_name, mutate, issue, title) => {
    const fixture = evidenceFixture();
    mutate(fixture);

    const model = buildProposalApprovalEvidenceModel({
      ...fixture,
      expectedProposalId: proposalId,
    });

    expect(model.agreement.issue).toBe(issue);
    expect(model.posture).toMatchObject({ state: "conflict", title });
  });
});
