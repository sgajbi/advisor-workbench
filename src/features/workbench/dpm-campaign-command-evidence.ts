import {
  campaignCommandActorId,
  type DpmCampaignLifecycleCommandInput,
  type DpmCampaignLifecycleCommandType,
  type DpmCampaignWorkflowCommandType,
} from "@/features/workbench/dpm-campaign-command-contracts";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
} from "@/features/workbench/types";

export type DpmCampaignWorkflowCommandEvidence = {
  commandLabel: string;
  evidenceRef: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
  contentHash: string;
  reasonCodes: string;
  operatingBoundaries: string;
};

export type DpmCampaignLifecycleCommandEvidence = {
  commandLabel: string;
  status: string;
  actor: string;
  reason: string;
  replacementCampaignVersion: string;
  correlationId: string;
  sourceService: string;
  upstreamStatus: string;
  contentHash: string;
  reasonCodes: string;
  operatingBoundaries: string;
};

export type DpmCampaignLifecycleConfirmationReceipt = Readonly<{
  campaignId: string;
  campaignVersion: string;
  status: string;
  replacementCampaignVersion: string;
}>;

export function validateCampaignLifecycleCommand(
  command: DpmCampaignLifecycleCommandInput,
) {
  const reason =
    command.commandType === "retire"
      ? command.body.retirement_reason.trim()
      : command.body.supersession_reason.trim();
  if (
    !campaignCommandActorId(command).trim() ||
    !reason ||
    !command.body.correlation_id.trim()
  ) {
    throw new Error(
      "Campaign lifecycle command requires actor, rationale, and correlation evidence.",
    );
  }
  if (
    command.commandType === "supersede" &&
    !command.body.superseded_by_campaign_version.trim()
  ) {
    throw new Error(
      "Supersede requires an existing replacement campaign version.",
    );
  }
}

export function isCampaignLifecycleCommandBlocked(
  response: DpmCampaignDefinitionGatewayResponse,
) {
  return ["BLOCKED", "UNSUPPORTED", "NOT_SUPPORTED"].includes(
    readString(response.data.supportability_state).toUpperCase(),
  );
}

export function buildCampaignLifecycleCommandEvidence(
  commandType: DpmCampaignLifecycleCommandType,
  response: DpmCampaignDefinitionGatewayResponse,
): DpmCampaignLifecycleCommandEvidence {
  const data = response.data;
  return {
    commandLabel:
      commandType === "retire" ? "Retire campaign" : "Supersede campaign",
    status:
      readString(data.status) || readString(data.supportability_state) || "N/A",
    actor:
      readString(data.retired_by) ||
      readString(data.superseded_by) ||
      readString(data.actor_id) ||
      readString(data.actor) ||
      "N/A",
    reason:
      readString(data.retirement_reason) ||
      readString(data.supersession_reason) ||
      formatList(data.reason_codes),
    replacementCampaignVersion:
      readString(data.superseded_by_campaign_version) ||
      readString(data.replacement_campaign_version) ||
      "N/A",
    correlationId: readString(data.correlation_id) || response.correlation_id,
    sourceService: response.source_service,
    upstreamStatus: String(response.upstream_status),
    contentHash: readString(data.content_hash) || "N/A",
    reasonCodes: formatList(data.reason_codes),
    operatingBoundaries: formatList(data.operating_boundaries),
  };
}

export function buildCampaignWorkflowCommandEvidence(
  commandType: DpmCampaignWorkflowCommandType,
  response: DpmCampaignWorkflowGatewayResponse,
): DpmCampaignWorkflowCommandEvidence {
  const data = response.data;
  return {
    commandLabel: campaignWorkflowCommandLabel(commandType),
    evidenceRef:
      readString(data.evidence_ref) ||
      readString(data.decision_ref) ||
      readString(data.action_ref) ||
      readString(data.task_ref) ||
      readString(data.control_ref) ||
      "N/A",
    correlationId: response.correlation_id,
    sourceService: response.source_service,
    upstreamStatus: String(response.upstream_status),
    contentHash:
      readString(data.content_hash) ||
      response.supportability?.content_hash ||
      "N/A",
    reasonCodes: formatList(data.reason_codes),
    operatingBoundaries: formatList(data.operating_boundaries),
  };
}

export function containsCampaignLifecycleEvidence(
  response: DpmCampaignDefinitionGatewayResponse,
  receipt: DpmCampaignLifecycleConfirmationReceipt,
): boolean {
  const items = Array.isArray(response.data.items) ? response.data.items : [];
  return items.some((item) => {
    if (item === null || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    return (
      readString(record.campaign_id) === receipt.campaignId &&
      readString(record.campaign_version) === receipt.campaignVersion &&
      readString(record.status) === receipt.status &&
      (receipt.replacementCampaignVersion === "N/A" ||
        readString(record.superseded_by_campaign_version) ===
          receipt.replacementCampaignVersion)
    );
  });
}

export function containsCampaignWorkflowEvidence(
  evidence: {
    approvalDecisions: DpmCampaignWorkflowGatewayResponse;
    assignmentActions: DpmCampaignWorkflowGatewayResponse;
    assignmentTasks: DpmCampaignWorkflowGatewayResponse;
    makerCheckerControls: DpmCampaignWorkflowGatewayResponse;
  },
  evidenceRef: string,
): boolean {
  return Object.values(evidence).some((response) => {
    const items = Array.isArray(response.data.items) ? response.data.items : [];
    return items.some(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        [
          "evidence_ref",
          "decision_ref",
          "action_ref",
          "task_ref",
          "control_ref",
        ].some((field) =>
          Object.prototype.hasOwnProperty.call(item, field) &&
          readString((item as Record<string, unknown>)[field]) === evidenceRef,
        ),
    );
  });
}

function campaignWorkflowCommandLabel(
  commandType: DpmCampaignWorkflowCommandType,
) {
  return {
    approval_decision: "Approval decision",
    assignment_action: "Assignment action",
    assignment_task: "Assignment task",
    task_transition: "Task transition",
    maker_checker_control: "Maker-checker control",
  }[commandType];
}

function readString(value: unknown) {
  return typeof value === "string"
    ? value
    : typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
}

function formatList(value: unknown) {
  if (typeof value === "string" && value.length > 0) return value;
  if (!Array.isArray(value)) return "N/A";
  const values = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );
  return values.length > 0 ? values.join(", ") : "N/A";
}
