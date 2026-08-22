import {
  buildCampaignCommandCorrelationId,
  type DpmCampaignApprovalDecisionType,
  type DpmCampaignAssignmentActionType,
  type DpmCampaignAssignmentTaskType,
  type DpmCampaignEscalationTier,
  type DpmCampaignMakerCheckerAction,
  type DpmCampaignMakerCheckerOutcome,
  type DpmCampaignSlaPosture,
  type DpmCampaignTaskTransitionType,
  type DpmCampaignWorkflowCommandInput,
  type DpmCampaignWorkflowCommandType,
} from "@/features/workbench/dpm-campaign-command-contracts";

export type DpmCampaignWorkflowCommandForm = {
  commandType: DpmCampaignWorkflowCommandType;
  reference: string;
  rationale: string;
  actorId: string;
  assignedActorIds: string;
  approvalDecision: DpmCampaignApprovalDecisionType;
  assignmentAction: DpmCampaignAssignmentActionType;
  assignmentTaskType: DpmCampaignAssignmentTaskType;
  taskTransition: DpmCampaignTaskTransitionType;
  escalationTier: DpmCampaignEscalationTier;
  slaPosture: DpmCampaignSlaPosture;
  controlAction: DpmCampaignMakerCheckerAction;
  controlOutcome: DpmCampaignMakerCheckerOutcome;
  submitterActorId: string;
  reviewerActorId: string;
};

export function buildDpmCampaignWorkflowCommand(params: {
  campaignId: string;
  campaignVersion: string;
  form: DpmCampaignWorkflowCommandForm;
  nonce?: number;
}): DpmCampaignWorkflowCommandInput {
  const form = params.form;
  const actorId = form.actorId.trim();
  const reference = form.reference.trim();
  const rationale = form.rationale.trim();
  const assignedActorIds = form.assignedActorIds
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const correlationId = buildCampaignCommandCorrelationId({
    command: form.commandType,
    campaignId: params.campaignId,
    campaignVersion: params.campaignVersion,
    nonce: params.nonce,
  });

  switch (form.commandType) {
    case "approval_decision":
      return {
        commandType: form.commandType,
        body: {
          decision_type: form.approvalDecision,
          decision_ref: reference,
          decided_by: actorId,
          decision_reason: rationale,
          correlation_id: correlationId,
        },
      };
    case "assignment_action":
      return {
        commandType: form.commandType,
        body: {
          action_type: form.assignmentAction,
          action_ref: reference,
          recorded_by: actorId,
          action_reason: rationale,
          assigned_actor_ids: assignedActorIds,
          escalation_tier: form.escalationTier,
          sla_posture: form.slaPosture,
          correlation_id: correlationId,
        },
      };
    case "assignment_task":
      return {
        commandType: form.commandType,
        body: {
          task_ref: reference,
          task_type: form.assignmentTaskType,
          opened_by: actorId,
          task_reason: rationale,
          assigned_actor_ids: assignedActorIds,
          escalation_tier: form.escalationTier,
          sla_posture: form.slaPosture,
          correlation_id: correlationId,
        },
      };
    case "task_transition":
      return {
        commandType: form.commandType,
        taskRef: reference,
        body: {
          transition_type: form.taskTransition,
          transition_ref: `${reference}:${form.taskTransition.toLowerCase()}`,
          transitioned_by: actorId,
          transition_reason: rationale,
          correlation_id: correlationId,
        },
      };
    case "maker_checker_control":
      return {
        commandType: form.commandType,
        body: {
          control_action: form.controlAction,
          control_ref: reference,
          recorded_by: actorId,
          submitter_actor_id: optionalString(form.submitterActorId),
          reviewer_actor_id: optionalString(form.reviewerActorId),
          control_outcome: form.controlOutcome,
          control_reason: rationale,
          correlation_id: correlationId,
        },
      };
  }
}

function optionalString(value: string): string | undefined {
  return value.trim() || undefined;
}
