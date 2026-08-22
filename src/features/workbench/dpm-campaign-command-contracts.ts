export type DpmCampaignSourceReference = {
  source_system: string;
  source_type: string;
  source_id: string;
  source_version?: string | null;
  supportability_state?: string | null;
  content_hash?: string | null;
  source_batch_fingerprint?: string | null;
  selection_basis?: Record<string, unknown> | null;
};

export type DpmCampaignRetirementBody = {
  retired_by: string;
  retirement_reason: string;
  correlation_id: string;
};

export type DpmCampaignSupersessionBody = {
  superseded_by_campaign_version: string;
  superseded_by: string;
  supersession_reason: string;
  correlation_id: string;
};

export type DpmCampaignApprovalDecisionType =
  | "APPROVED"
  | "REJECTED"
  | "REQUIRES_REMEDIATION";

export type DpmCampaignApprovalDecisionBody = {
  decision_type: DpmCampaignApprovalDecisionType;
  decision_ref: string;
  decided_by: string;
  decision_reason: string;
  correlation_id: string;
  source_refs?: DpmCampaignSourceReference[];
};

export type DpmCampaignAssignmentActionType =
  | "ASSIGNED"
  | "REASSIGNED"
  | "ESCALATED"
  | "DEESCALATED"
  | "RESOLVED";

export type DpmCampaignEscalationTier = "NONE" | "PM" | "OPS" | "GOVERNANCE";

export type DpmCampaignSlaPosture = "ON_TRACK" | "ATTENTION" | "BREACHED_OR_BLOCKED";

export type DpmCampaignAssignmentActionBody = {
  action_type: DpmCampaignAssignmentActionType;
  action_ref: string;
  recorded_by: string;
  action_reason: string;
  assigned_actor_ids?: string[];
  escalation_tier: DpmCampaignEscalationTier;
  sla_posture: DpmCampaignSlaPosture;
  correlation_id: string;
  source_refs?: DpmCampaignSourceReference[];
};

export type DpmCampaignAssignmentTaskType =
  | "ASSIGNMENT"
  | "APPROVAL_REMEDIATION"
  | "ENTITLEMENT_REVIEW"
  | "EXPIRY_REVIEW"
  | "ESCALATION";

export type DpmCampaignAssignmentTaskBody = {
  task_ref: string;
  task_type: DpmCampaignAssignmentTaskType;
  opened_by: string;
  task_reason: string;
  assigned_actor_ids: string[];
  escalation_tier: DpmCampaignEscalationTier;
  sla_posture: DpmCampaignSlaPosture;
  due_at?: string | null;
  correlation_id: string;
  source_refs?: DpmCampaignSourceReference[];
};

export type DpmCampaignTaskTransitionType =
  | "OPENED"
  | "ACKNOWLEDGED"
  | "STARTED"
  | "BLOCKED"
  | "UNBLOCKED"
  | "RESOLVED"
  | "CANCELLED"
  | "REASSIGNED"
  | "ESCALATED"
  | "DUE_DATE_CHANGED";

export type DpmCampaignTaskTransitionBody = {
  transition_type: DpmCampaignTaskTransitionType;
  transition_ref: string;
  transitioned_by: string;
  transition_reason: string;
  assigned_actor_ids?: string[] | null;
  escalation_tier?: DpmCampaignEscalationTier | null;
  sla_posture?: DpmCampaignSlaPosture | null;
  due_at?: string | null;
  correlation_id: string;
  source_refs?: DpmCampaignSourceReference[];
};

export type DpmCampaignMakerCheckerAction =
  | "SUBMITTED_FOR_REVIEW"
  | "REVIEWER_ASSIGNED"
  | "REVIEW_COMPLETED"
  | "CONTROL_EXCEPTION_RAISED"
  | "CONTROL_EXCEPTION_RESOLVED";

export type DpmCampaignMakerCheckerOutcome =
  | "PENDING"
  | "PASSED"
  | "FAILED"
  | "EXCEPTION_OPEN"
  | "EXCEPTION_RESOLVED";

export type DpmCampaignMakerCheckerBody = {
  control_action: DpmCampaignMakerCheckerAction;
  control_ref: string;
  recorded_by: string;
  submitter_actor_id?: string | null;
  reviewer_actor_id?: string | null;
  required_reviewer_role?: string | null;
  control_outcome: DpmCampaignMakerCheckerOutcome;
  control_reason: string;
  correlation_id: string;
  source_refs?: DpmCampaignSourceReference[];
};

export type DpmCampaignLifecycleCommandInput =
  | { commandType: "retire"; body: DpmCampaignRetirementBody }
  | { commandType: "supersede"; body: DpmCampaignSupersessionBody };

export type DpmCampaignLifecycleCommandType = DpmCampaignLifecycleCommandInput["commandType"];

export type DpmCampaignWorkflowCommandInput =
  | { commandType: "approval_decision"; body: DpmCampaignApprovalDecisionBody }
  | { commandType: "assignment_action"; body: DpmCampaignAssignmentActionBody }
  | { commandType: "assignment_task"; body: DpmCampaignAssignmentTaskBody }
  | {
      commandType: "task_transition";
      taskRef: string;
      body: DpmCampaignTaskTransitionBody;
    }
  | { commandType: "maker_checker_control"; body: DpmCampaignMakerCheckerBody };

export type DpmCampaignWorkflowCommandType = DpmCampaignWorkflowCommandInput["commandType"];

export function campaignCommandActorId(
  command: DpmCampaignLifecycleCommandInput | DpmCampaignWorkflowCommandInput,
): string {
  switch (command.commandType) {
    case "retire":
      return command.body.retired_by;
    case "supersede":
      return command.body.superseded_by;
    case "approval_decision":
      return command.body.decided_by;
    case "assignment_action":
    case "maker_checker_control":
      return command.body.recorded_by;
    case "assignment_task":
      return command.body.opened_by;
    case "task_transition":
      return command.body.transitioned_by;
  }
}

export function buildCampaignCommandCorrelationId(params: {
  command: string;
  campaignId: string;
  campaignVersion: string;
  nonce?: number;
}): string {
  const safePart = (value: string) => value.trim().replaceAll(/[^a-zA-Z0-9._-]+/g, "-");
  return [
    "workbench-campaign",
    safePart(params.command),
    safePart(params.campaignId),
    safePart(params.campaignVersion),
    String(params.nonce ?? Date.now()),
  ].join("-");
}
