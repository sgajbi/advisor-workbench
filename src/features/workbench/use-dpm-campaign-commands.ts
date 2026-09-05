"use client";

import {
  skipToken,
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  DpmCampaignLifecycleCommandInput,
  DpmCampaignWorkflowCommandInput,
} from "@/features/workbench/dpm-campaign-command-contracts";
import {
  executeDpmCampaignLaunch,
  executeDpmCampaignLifecycleCommand,
  executeDpmCampaignWorkflowCommand,
} from "@/features/workbench/dpm-campaign-command-executor";
import {
  buildCampaignLifecycleCommandEvidence,
  buildCampaignWorkflowConfirmationReceipt,
  buildCampaignWorkflowCommandEvidence,
  isCampaignLifecycleCommandBlocked,
  validateCampaignLifecycleCommand,
  type DpmCampaignLifecycleConfirmationReceipt,
  type DpmCampaignWorkflowConfirmationReceipt,
  type DpmCampaignLifecycleCommandEvidence,
  type DpmCampaignWorkflowCommandEvidence,
} from "@/features/workbench/dpm-campaign-command-evidence";
import {
  DPM_CAMPAIGN_COMMAND_SCOPE,
  dpmCampaignMutationKeys,
  dpmCampaignQueryKeys,
} from "@/features/workbench/dpm-campaign-query-keys";
import type { DpmCampaignDefinitionRow } from "@/features/workbench/dpm-wave-command-center-view-model";
import type { DpmWaveGatewayResponse } from "@/features/workbench/types";

export type {
  DpmCampaignLifecycleCommandEvidence,
  DpmCampaignWorkflowCommandEvidence,
} from "@/features/workbench/dpm-campaign-command-evidence";

type CampaignSources = Readonly<{
  refreshLifecycle: (
    row: DpmCampaignDefinitionRow,
    requiredReceipt?: DpmCampaignLifecycleConfirmationReceipt,
  ) => Promise<unknown>;
  refreshWorkflow: (
    row: DpmCampaignDefinitionRow,
    requiredReceipt?: DpmCampaignWorkflowConfirmationReceipt,
  ) => Promise<unknown>;
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
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<DpmWaveGatewayResponse>(launchResultKey),
  });
  const lifecycleMutation = useMutation({
    mutationKey: dpmCampaignMutationKeys.lifecycle(),
    scope: { id: DPM_CAMPAIGN_COMMAND_SCOPE },
    gcTime: Infinity,
    mutationFn: async ({ campaign, command }: LifecycleVariables) => {
      validateCampaignLifecycleCommand(command);
      const response = await executeDpmCampaignLifecycleCommand(
        campaign,
        command,
      );
      if (isCampaignLifecycleCommandBlocked(response)) {
        throw new Error(
          "Manage did not accept the campaign lifecycle command.",
        );
      }
      revokeLaunchAuthorization(queryClient, campaign);
      const result: CampaignResult<DpmCampaignLifecycleCommandEvidence> = {
        campaignKey: campaign.key,
        value: buildCampaignLifecycleCommandEvidence(
          command.commandType,
          response,
        ),
      };
      try {
        await sources.refreshLifecycle(campaign, {
          campaignId: campaign.campaignId,
          campaignVersion: campaign.campaignVersion,
          status: result.value.status,
          replacementCampaignVersion: result.value.replacementCampaignVersion,
        });
      } catch {
        // The accepted command evidence remains visible while source state owns confirmation failure.
      }
      return result;
    },
  });
  const workflowMutation = useMutation({
    mutationKey: dpmCampaignMutationKeys.workflow(),
    scope: { id: DPM_CAMPAIGN_COMMAND_SCOPE },
    gcTime: Infinity,
    mutationFn: async ({ campaign, command }: WorkflowVariables) => {
      if (command.commandType === "task_transition" && !command.taskRef) {
        throw new Error(
          "Task progress requires an existing Manage task reference.",
        );
      }
      const response = await executeDpmCampaignWorkflowCommand(
        campaign,
        command,
      );
      const result: CampaignResult<DpmCampaignWorkflowCommandEvidence> = {
        campaignKey: campaign.key,
        value: buildCampaignWorkflowCommandEvidence(
          command.commandType,
          response,
        ),
      };
      try {
        await sources.refreshWorkflow(
          campaign,
          buildCampaignWorkflowConfirmationReceipt(command),
        );
      } catch {
        // The accepted command evidence remains visible while source state owns confirmation failure.
      }
      return result;
    },
  });
  const launchMutation = useMutation({
    mutationKey: dpmCampaignMutationKeys.launch(),
    scope: { id: DPM_CAMPAIGN_COMMAND_SCOPE },
    gcTime: Infinity,
    mutationFn: async (campaign: DpmCampaignDefinitionRow) => {
      const value = await executeDpmCampaignLaunch(campaign);
      revokeLaunchAuthorization(queryClient, campaign);
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

function revokeLaunchAuthorization(
  queryClient: ReturnType<typeof useQueryClient>,
  campaign: DpmCampaignDefinitionRow,
) {
  const requestedAsOfDate =
    campaign.asOfDate === "N/A" ? undefined : campaign.asOfDate;
  queryClient.setQueryData(
    dpmCampaignQueryKeys.previewReadiness(campaign, requestedAsOfDate),
    null,
  );
  queryClient.setQueryData(
    dpmCampaignQueryKeys.launchPackage(campaign, requestedAsOfDate),
    null,
  );
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
