"use client";

import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  createDpmCampaignApprovalDecision,
  createDpmCampaignAssignmentAction,
  createDpmCampaignAssignmentTask,
  createDpmCampaignAssignmentTaskTransition,
  createDpmCampaignMakerCheckerControl,
  launchDpmCampaignDefinition,
  retireDpmCampaignDefinition,
  supersedeDpmCampaignDefinition,
} from "@/features/workbench/dpm-wave-api";
import {
  campaignCommandActorId,
  type DpmCampaignLifecycleCommandInput,
  type DpmCampaignLifecycleCommandType,
  type DpmCampaignWorkflowCommandInput,
  type DpmCampaignWorkflowCommandType,
} from "@/features/workbench/dpm-campaign-command-contracts";
import {
  DPM_CAMPAIGN_COMMAND_SCOPE,
  dpmCampaignMutationKeys,
  dpmCampaignQueryKeys,
} from "@/features/workbench/dpm-campaign-query-keys";
import type { DpmCampaignDefinitionRow } from "@/features/workbench/dpm-wave-command-center-view-model";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
  DpmWaveGatewayResponse,
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

type CampaignSources = Readonly<{
  refreshLifecycle: (row: DpmCampaignDefinitionRow) => Promise<unknown>;
  refreshWorkflow: (row: DpmCampaignDefinitionRow) => Promise<unknown>;
}>;

type CampaignResult<T> = Readonly<{ campaignKey: string; value: T }>;
type LifecycleVariables = Readonly<{
  campaign: DpmCampaignDefinitionRow;
  command: DpmCampaignLifecycleCommandInput;
}>;
type WorkflowVariables = Readonly<{
  campaign: DpmCampaignDefinitionRow;
  command: DpmCampaignWorkflowCommandInput;
}>;

export function useDpmCampaignCommands({
  selectedCampaign,
  canLaunch,
  sources,
}: {
  selectedCampaign: DpmCampaignDefinitionRow | null;
  canLaunch: boolean;
  sources: CampaignSources;
}) {
  const queryClient = useQueryClient();
  const launchResultKey = dpmCampaignQueryKeys.launchResult(
    selectedCampaign ?? {
      campaignId: "__no_campaign__",
      campaignVersion: "__no_version__",
    },
  );
  const launchResultQuery = useQuery<DpmWaveGatewayResponse>({
    queryKey: launchResultKey,
    queryFn: async () => {
      throw new Error(
        "Campaign launch results are written by the launch command.",
      );
    },
    enabled: false,
  });
  const lifecycleMutation = useMutation({
    mutationKey: dpmCampaignMutationKeys.lifecycle(),
    scope: { id: DPM_CAMPAIGN_COMMAND_SCOPE },
    mutationFn: async ({ campaign, command }: LifecycleVariables) => {
      validateLifecycleCommand(command);
      const actorId = campaignCommandActorId(command).trim();
      const response =
        command.commandType === "retire"
          ? await retireDpmCampaignDefinition({
              campaignId: campaign.campaignId,
              campaignVersion: campaign.campaignVersion,
              body: command.body,
              actorId,
            })
          : await supersedeDpmCampaignDefinition({
              campaignId: campaign.campaignId,
              campaignVersion: campaign.campaignVersion,
              body: command.body,
              actorId,
            });
      if (isLifecycleCommandBlocked(response)) {
        throw new Error(
          "Manage did not accept the campaign lifecycle command.",
        );
      }
      const result: CampaignResult<DpmCampaignLifecycleCommandEvidence> = {
        campaignKey: campaign.key,
        value: buildCampaignLifecycleCommandEvidence(
          command.commandType,
          response,
        ),
      };
      try {
        await sources.refreshLifecycle(campaign);
      } catch {
        // The accepted command evidence remains visible while source state owns confirmation failure.
      }
      return result;
    },
  });
  const workflowMutation = useMutation({
    mutationKey: dpmCampaignMutationKeys.workflow(),
    scope: { id: DPM_CAMPAIGN_COMMAND_SCOPE },
    mutationFn: async ({ campaign, command }: WorkflowVariables) => {
      if (command.commandType === "task_transition" && !command.taskRef) {
        throw new Error(
          "Task progress requires an existing Manage task reference.",
        );
      }
      const context = {
        campaignId: campaign.campaignId,
        campaignVersion: campaign.campaignVersion,
        actorId: campaignCommandActorId(command),
      };
      const response = await runWorkflowCommand(context, command);
      const result: CampaignResult<DpmCampaignWorkflowCommandEvidence> = {
        campaignKey: campaign.key,
        value: buildCampaignWorkflowCommandEvidence(
          command.commandType,
          response,
        ),
      };
      try {
        await sources.refreshWorkflow(campaign);
      } catch {
        // The accepted command evidence remains visible while source state owns confirmation failure.
      }
      return result;
    },
  });
  const launchMutation = useMutation({
    mutationKey: dpmCampaignMutationKeys.launch(),
    scope: { id: DPM_CAMPAIGN_COMMAND_SCOPE },
    mutationFn: async (campaign: DpmCampaignDefinitionRow) => {
      const value = await launchDpmCampaignDefinition({
        campaignId: campaign.campaignId,
        campaignVersion: campaign.campaignVersion,
        requestedAsOfDate:
          campaign.asOfDate === "N/A" ? undefined : campaign.asOfDate,
      });
      queryClient.setQueryData(
        dpmCampaignQueryKeys.launchResult(campaign),
        value,
      );
      return { campaignKey: campaign.key, value };
    },
  });

  const lifecycleRecord = latestCampaignRecord(
    useMutationState({
      filters: {
        exact: true,
        mutationKey: dpmCampaignMutationKeys.lifecycle(),
      },
      select: mutationRecord<
        LifecycleVariables,
        DpmCampaignLifecycleCommandEvidence
      >,
    }),
    selectedCampaign?.key,
  );
  const workflowRecord = latestCampaignRecord(
    useMutationState({
      filters: { exact: true, mutationKey: dpmCampaignMutationKeys.workflow() },
      select: mutationRecord<
        WorkflowVariables,
        DpmCampaignWorkflowCommandEvidence
      >,
    }),
    selectedCampaign?.key,
  );
  const launchRecord = latestCampaignRecord(
    useMutationState({
      filters: { exact: true, mutationKey: dpmCampaignMutationKeys.launch() },
      select: (mutation) => ({
        campaignKey: (
          mutation.state.variables as DpmCampaignDefinitionRow | undefined
        )?.key,
        data: mutation.state.data as
          CampaignResult<DpmWaveGatewayResponse> | undefined,
        error: mutation.state.error,
        status: mutation.state.status,
      }),
    }),
    selectedCampaign?.key,
  );

  function commandInFlight() {
    return (
      queryClient.isMutating({ mutationKey: dpmCampaignMutationKeys.all }) > 0
    );
  }

  async function recordLifecycle(command: DpmCampaignLifecycleCommandInput) {
    if (!selectedCampaign || commandInFlight()) return;
    await lifecycleMutation
      .mutateAsync({ campaign: selectedCampaign, command })
      .catch(() => undefined);
  }

  async function recordWorkflow(command: DpmCampaignWorkflowCommandInput) {
    if (!selectedCampaign || commandInFlight()) return;
    await workflowMutation
      .mutateAsync({ campaign: selectedCampaign, command })
      .catch(() => undefined);
  }

  async function launch(campaign: DpmCampaignDefinitionRow) {
    if (!canLaunch || commandInFlight()) return;
    await launchMutation.mutateAsync(campaign).catch(() => undefined);
  }

  return {
    pendingLifecycle: lifecycleRecord?.status === "pending",
    pendingWorkflow: workflowRecord?.status === "pending",
    pendingLaunchKey:
      launchRecord?.status === "pending"
        ? (selectedCampaign?.key ?? null)
        : null,
    lifecycleError: mutationError(lifecycleRecord),
    workflowError: mutationError(workflowRecord),
    launchError: mutationError(launchRecord),
    lifecycleEvidence: lifecycleRecord?.data?.value ?? null,
    workflowEvidence: workflowRecord?.data?.value ?? null,
    launchResponse: launchResultQuery.data ?? launchRecord?.data?.value ?? null,
    recordLifecycle,
    recordWorkflow,
    launch,
  };
}

type MutationRecord<T> = Readonly<{
  campaignKey?: string;
  data?: CampaignResult<T>;
  error: unknown;
  status: string;
}>;

function mutationRecord<
  TVariables extends { campaign: DpmCampaignDefinitionRow },
  TResult,
>(mutation: {
  state: {
    variables?: unknown;
    data?: unknown;
    error: unknown;
    status: string;
  };
}): MutationRecord<TResult> {
  return {
    campaignKey: (mutation.state.variables as TVariables | undefined)?.campaign
      .key,
    data: mutation.state.data as CampaignResult<TResult> | undefined,
    error: mutation.state.error,
    status: mutation.state.status,
  };
}

function latestCampaignRecord<T>(
  records: MutationRecord<T>[],
  campaignKey?: string,
) {
  return records
    .slice()
    .reverse()
    .find((record) => record.campaignKey === campaignKey);
}

function mutationError(record?: MutationRecord<unknown>): string | null {
  return record?.status === "error"
    ? record.error instanceof Error
      ? record.error.message
      : "Campaign action failed."
    : null;
}

function validateLifecycleCommand(command: DpmCampaignLifecycleCommandInput) {
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

async function runWorkflowCommand(
  context: { campaignId: string; campaignVersion: string; actorId: string },
  command: DpmCampaignWorkflowCommandInput,
) {
  return command.commandType === "approval_decision"
    ? await createDpmCampaignApprovalDecision({
        ...context,
        body: command.body,
      })
    : command.commandType === "assignment_action"
      ? await createDpmCampaignAssignmentAction({
          ...context,
          body: command.body,
        })
      : command.commandType === "assignment_task"
        ? await createDpmCampaignAssignmentTask({
            ...context,
            body: command.body,
          })
        : command.commandType === "task_transition"
          ? await createDpmCampaignAssignmentTaskTransition({
              ...context,
              taskRef: command.taskRef,
              body: command.body,
            })
          : await createDpmCampaignMakerCheckerControl({
              ...context,
              body: command.body,
            });
}

function buildCampaignLifecycleCommandEvidence(
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

function isLifecycleCommandBlocked(
  response: DpmCampaignDefinitionGatewayResponse,
) {
  return ["BLOCKED", "UNSUPPORTED", "NOT_SUPPORTED"].includes(
    readString(response.data.supportability_state).toUpperCase(),
  );
}

function buildCampaignWorkflowCommandEvidence(
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
