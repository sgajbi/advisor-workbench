"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  dpmCampaignLaunchHistoryQueryOptions,
  dpmCampaignLaunchPackageQueryOptions,
  dpmCampaignDefinitionsQueryOptions,
  dpmCampaignLifecycleQueryOptions,
  dpmCampaignPreviewReadinessQueryOptions,
  dpmCampaignWorkflowQueryOptions,
  type DpmCampaignWorkflowEvidence,
} from "@/features/workbench/dpm-campaign-query-options";
import { dpmCampaignQueryKeys } from "@/features/workbench/dpm-campaign-query-keys";
import { CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE } from "@/features/workbench/dpm-campaign-launch-history-constants";
import type {
  DpmCampaignDefinitionGatewayResponse,
  DpmCampaignWorkflowGatewayResponse,
} from "@/features/workbench/types";
import type { DpmCampaignDefinitionRow } from "@/features/workbench/dpm-wave-command-center-view-model";

type CampaignSelection = Readonly<{
  key: string;
  campaignId: string;
  campaignVersion: string;
  requestedAsOfDate?: string;
}>;

type InitialWorkflowEvidence = Readonly<{
  approvalDecisions: DpmCampaignWorkflowGatewayResponse | null;
  assignmentActions: DpmCampaignWorkflowGatewayResponse | null;
  assignmentTasks: DpmCampaignWorkflowGatewayResponse | null;
  makerCheckerControls: DpmCampaignWorkflowGatewayResponse | null;
}>;

type UseDpmCampaignSourcesInput = Readonly<{
  selectedCampaign: DpmCampaignDefinitionRow | null;
  initialDefinitions: DpmCampaignDefinitionGatewayResponse | null;
  initialCampaignKey: string | null;
  initialWorkflowEvidence: InitialWorkflowEvidence;
}>;

type OffsetSelection = Readonly<{ campaignKey: string; offset: number }>;
type ConfirmationLock = Readonly<{
  kind: "lifecycle" | "workflow";
  message: string;
}>;

const NO_CAMPAIGN = {
  campaignId: "__no_campaign__",
  campaignVersion: "__no_version__",
} as const;

export function useDpmCampaignSources({
  selectedCampaign,
  initialDefinitions,
  initialCampaignKey,
  initialWorkflowEvidence,
}: UseDpmCampaignSourcesInput) {
  const queryClient = useQueryClient();
  const selection = toSelection(selectedCampaign);
  const queryIdentity = selection ?? NO_CAMPAIGN;
  const [historySelection, setHistorySelection] = useState<OffsetSelection>({
    campaignKey: initialCampaignKey ?? "",
    offset: 0,
  });
  const historyOffset =
    selection && historySelection.campaignKey === selection.key
      ? historySelection.offset
      : 0;
  const initialWorkflow =
    selection?.key === initialCampaignKey
      ? completeInitialWorkflowEvidence(initialWorkflowEvidence)
      : undefined;
  const definitionsQuery = useQuery({
    ...dpmCampaignDefinitionsQueryOptions(),
    enabled: false,
    initialData: initialDefinitions ?? undefined,
  });

  const lifecycleQuery = useQuery({
    ...dpmCampaignLifecycleQueryOptions(queryIdentity),
    enabled: false,
  });
  const historyQuery = useQuery({
    ...dpmCampaignLaunchHistoryQueryOptions(
      queryIdentity,
      historyOffset,
      CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
    ),
    enabled: false,
  });
  const previewQuery = useQuery({
    ...dpmCampaignPreviewReadinessQueryOptions(
      queryIdentity,
      selection?.requestedAsOfDate,
    ),
    enabled: false,
  });
  const packageQuery = useQuery({
    ...dpmCampaignLaunchPackageQueryOptions(
      queryIdentity,
      selection?.requestedAsOfDate,
    ),
    enabled: false,
  });
  const workflowQuery = useQuery({
    ...dpmCampaignWorkflowQueryOptions(queryIdentity),
    enabled: false,
    initialData: initialWorkflow,
  });
  const confirmationKey = dpmCampaignQueryKeys.confirmationLock(queryIdentity);
  const confirmationQuery = useQuery<ConfirmationLock>({
    queryKey: confirmationKey,
    queryFn: async () => {
      throw new Error(
        "Campaign confirmation state is written by persisted commands.",
      );
    },
    enabled: false,
  });

  async function loadLifecycle(row: DpmCampaignDefinitionRow) {
    queryClient.removeQueries({
      queryKey: dpmCampaignQueryKeys.confirmationLock(toRequiredSelection(row)),
      exact: true,
    });
    return await queryClient.fetchQuery(
      dpmCampaignLifecycleQueryOptions(toRequiredSelection(row)),
    );
  }

  async function loadLaunchHistory(row: DpmCampaignDefinitionRow, offset = 0) {
    setHistorySelection({ campaignKey: row.key, offset });
    return await queryClient.fetchQuery(
      dpmCampaignLaunchHistoryQueryOptions(
        toRequiredSelection(row),
        offset,
        CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE,
      ),
    );
  }

  async function loadLaunchReadiness(row: DpmCampaignDefinitionRow) {
    const target = toRequiredSelection(row);
    const preview = await queryClient.fetchQuery(
      dpmCampaignPreviewReadinessQueryOptions(target, target.requestedAsOfDate),
    );
    const state =
      typeof preview.data.supportability_state === "string"
        ? preview.data.supportability_state.toUpperCase()
        : "";
    if (state !== "READY") {
      return { preview, launchPackage: null };
    }
    const launchPackage = await queryClient.fetchQuery(
      dpmCampaignLaunchPackageQueryOptions(target, target.requestedAsOfDate),
    );
    return { preview, launchPackage };
  }

  async function loadWorkflow(row: DpmCampaignDefinitionRow) {
    queryClient.removeQueries({
      queryKey: dpmCampaignQueryKeys.confirmationLock(toRequiredSelection(row)),
      exact: true,
    });
    return await queryClient.fetchQuery(
      dpmCampaignWorkflowQueryOptions(toRequiredSelection(row)),
    );
  }

  async function refreshLifecycle(row: DpmCampaignDefinitionRow) {
    const options = dpmCampaignLifecycleQueryOptions(toRequiredSelection(row));
    await queryClient.invalidateQueries({
      queryKey: options.queryKey,
      exact: true,
      refetchType: "none",
    });
    try {
      const [response] = await Promise.all([
        queryClient.fetchQuery(options),
        queryClient.fetchQuery({
          ...dpmCampaignDefinitionsQueryOptions(),
          staleTime: 0,
        }),
      ]);
      queryClient.removeQueries({ queryKey: confirmationKey, exact: true });
      return response;
    } catch (error) {
      queryClient.setQueryData<ConfirmationLock>(
        dpmCampaignQueryKeys.confirmationLock(toRequiredSelection(row)),
        {
          kind: "lifecycle",
          message:
            "Lifecycle action was recorded, but the updated campaign record could not be loaded. Reload the campaign before taking another action.",
        },
      );
      throw error;
    }
  }

  async function refreshWorkflow(row: DpmCampaignDefinitionRow) {
    const options = dpmCampaignWorkflowQueryOptions(toRequiredSelection(row));
    await queryClient.invalidateQueries({
      queryKey: options.queryKey,
      exact: true,
      refetchType: "none",
    });
    try {
      const response = await queryClient.fetchQuery(options);
      queryClient.removeQueries({ queryKey: confirmationKey, exact: true });
      return response;
    } catch (error) {
      queryClient.setQueryData<ConfirmationLock>(
        dpmCampaignQueryKeys.confirmationLock(toRequiredSelection(row)),
        {
          kind: "workflow",
          message:
            "Governance action was recorded, but refreshed source evidence could not be loaded. Reload source evidence before recording another governance action.",
        },
      );
      throw error;
    }
  }

  return {
    definitions: definitionsQuery.data ?? null,
    lifecycle: lifecycleQuery.data ?? null,
    lifecycleError:
      (confirmationQuery.data?.kind === "lifecycle"
        ? confirmationQuery.data.message
        : null) ?? errorMessage(lifecycleQuery.error),
    lifecyclePending: lifecycleQuery.isFetching,
    launchHistory: historyQuery.data ?? null,
    launchHistoryError: errorMessage(historyQuery.error),
    launchHistoryPending: historyQuery.isFetching,
    previewReadiness: previewQuery.data ?? null,
    previewReadinessError: errorMessage(previewQuery.error),
    previewReadinessPending: previewQuery.isFetching,
    launchPackage: packageQuery.data ?? null,
    launchPackageError: errorMessage(packageQuery.error),
    launchPackagePending: packageQuery.isFetching,
    workflow: workflowQuery.data ?? null,
    workflowError:
      (confirmationQuery.data?.kind === "workflow"
        ? confirmationQuery.data.message
        : null) ?? errorMessage(workflowQuery.error),
    workflowPending: workflowQuery.isFetching,
    workflowResolved:
      workflowQuery.isFetched || workflowQuery.data !== undefined,
    loadLifecycle,
    loadLaunchHistory,
    loadLaunchReadiness,
    loadWorkflow,
    refreshLifecycle,
    refreshWorkflow,
  };
}

function toSelection(
  row: DpmCampaignDefinitionRow | null,
): CampaignSelection | null {
  return row ? toRequiredSelection(row) : null;
}

function toRequiredSelection(row: DpmCampaignDefinitionRow): CampaignSelection {
  return {
    key: row.key,
    campaignId: row.campaignId,
    campaignVersion: row.campaignVersion,
    requestedAsOfDate: row.asOfDate === "N/A" ? undefined : row.asOfDate,
  };
}

function completeInitialWorkflowEvidence(
  evidence: InitialWorkflowEvidence,
): DpmCampaignWorkflowEvidence | undefined {
  return evidence.approvalDecisions &&
    evidence.assignmentActions &&
    evidence.assignmentTasks &&
    evidence.makerCheckerControls
    ? {
        approvalDecisions: evidence.approvalDecisions,
        assignmentActions: evidence.assignmentActions,
        assignmentTasks: evidence.assignmentTasks,
        makerCheckerControls: evidence.makerCheckerControls,
      }
    : undefined;
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : error ? String(error) : null;
}
