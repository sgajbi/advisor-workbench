import { describe, expect, it } from "vitest";

import {
  buildDpmCampaignWorkflowCommand,
  type DpmCampaignWorkflowCommandForm,
} from "../../src/features/workbench/dpm-campaign-workflow-command-builder";

const baseForm: DpmCampaignWorkflowCommandForm = {
  commandType: "assignment_task",
  reference: "BRC-TASK-001",
  rationale: "Portfolio manager acknowledgement is required.",
  actorId: "pm_sg_1",
  assignedActorIds: "pm_sg_2, ops_sg_1",
  approvalDecision: "APPROVED",
  assignmentAction: "ASSIGNED",
  assignmentTaskType: "ASSIGNMENT",
  taskTransition: "ACKNOWLEDGED",
  escalationTier: "PM",
  slaPosture: "ON_TRACK",
  controlAction: "REVIEW_COMPLETED",
  controlOutcome: "PASSED",
  submitterActorId: "pm_sg_1",
  reviewerActorId: "governance_sg_1",
};

function build(form: DpmCampaignWorkflowCommandForm) {
  return buildDpmCampaignWorkflowCommand({
    campaignId: "campaign-holdings-202605",
    campaignVersion: "2026.05",
    form,
    nonce: 42,
  });
}

describe("buildDpmCampaignWorkflowCommand", () => {
  it("builds current approval, assignment, and task contracts with human rationale", () => {
    expect(build({ ...baseForm, commandType: "approval_decision" })).toEqual({
      commandType: "approval_decision",
      body: {
        decision_type: "APPROVED",
        decision_ref: "BRC-TASK-001",
        decided_by: "pm_sg_1",
        decision_reason: "Portfolio manager acknowledgement is required.",
        correlation_id:
          "workbench-campaign-approval_decision-campaign-holdings-202605-2026.05-42",
      },
    });
    expect(build({ ...baseForm, commandType: "assignment_action" })).toMatchObject({
      commandType: "assignment_action",
      body: {
        action_type: "ASSIGNED",
        recorded_by: "pm_sg_1",
        assigned_actor_ids: ["pm_sg_2", "ops_sg_1"],
        escalation_tier: "PM",
        sla_posture: "ON_TRACK",
      },
    });
    expect(build(baseForm)).toMatchObject({
      commandType: "assignment_task",
      body: {
        task_type: "ASSIGNMENT",
        opened_by: "pm_sg_1",
        assigned_actor_ids: ["pm_sg_2", "ops_sg_1"],
      },
    });
  });

  it("builds current task transition and independent-review contracts", () => {
    expect(build({ ...baseForm, commandType: "task_transition" })).toMatchObject({
      commandType: "task_transition",
      taskRef: "BRC-TASK-001",
      body: {
        transition_type: "ACKNOWLEDGED",
        transition_ref: "BRC-TASK-001:acknowledged",
        transitioned_by: "pm_sg_1",
        transition_reason: "Portfolio manager acknowledgement is required.",
      },
    });
    expect(build({ ...baseForm, commandType: "maker_checker_control" })).toMatchObject({
      commandType: "maker_checker_control",
      body: {
        control_action: "REVIEW_COMPLETED",
        recorded_by: "pm_sg_1",
        submitter_actor_id: "pm_sg_1",
        reviewer_actor_id: "governance_sg_1",
        control_outcome: "PASSED",
        control_reason: "Portfolio manager acknowledgement is required.",
      },
    });
  });

  it("does not emit retired Workbench command vocabulary", () => {
    const serialized = JSON.stringify([
      build({ ...baseForm, commandType: "approval_decision" }),
      build({ ...baseForm, commandType: "assignment_action" }),
      build({ ...baseForm, commandType: "assignment_task" }),
      build({ ...baseForm, commandType: "task_transition" }),
      build({ ...baseForm, commandType: "maker_checker_control" }),
    ]);

    expect(serialized).not.toMatch(/"actor_id":/);
    expect(serialized).not.toMatch(/"reason_codes":/);
    expect(serialized).not.toContain("ASSIGN_FOR_REVIEW");
    expect(serialized).not.toContain("MARK_SUPPORTABLE");
    expect(serialized).not.toContain("MAKER_CHECKER_REVIEW");
  });
});
