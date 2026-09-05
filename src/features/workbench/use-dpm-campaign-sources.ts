"use client";

import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  dpmCampaignLaunchHistoryQueryOptions,
  dpmCampaignLaunchPackageQueryOptions,
  dpmCampaignDefinitionsQueryOptions,
  fetchDpmCampaignDefinitions,
  fetchDpmCampaignLifecycle,
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
  initialCampaignKey: string | null;
  initialWorkflowEvidence: InitialWorkflowEvidence;
}>;

type OffsetSelection = Readonly<{ campaignKey: string; offset: number }>;
type ConfirmationLock = Readonly<{
  message: string;
}>;
type WorkflowRecovery = InitialWorkflowEvidence &
  Readonly<{ campaignKey: string }>;

const NO_CAMPAIGN = {
  campaignId: "__no_campaign__",
  campaignVersion: "__no_version__",
} as const;

export function useDpmCampaignDefinitionsSource(
  initialDefinitions: DpmCampaignDefinitionGatewayResponse | null,
) {
  const queryClient = useQueryClient();
  const options = useMemo(() => dpmCampaignDefinitionsQueryOptions(), []);
  const definitionsQuery = useQuery({
    ...options,
    enabled: false,
    initialData: initialDefinitions ?? undefined,
  });
  useEffect(() => {
    if (initialDefinitions) {
      queryClient.setQueryData(options.queryKey, initialDefinitions);
    }
  }, [initialDefinitions, options.queryKey, queryClient]);
  return initialDefinitions === null ? null : definitionsQuery.data ?? null;
}

export function useDpmCampaignSources({
  selectedCampaign,
  initialCampaignKey,
  initialWorkflowEvidence,
}: UseDpmCampaignSourcesInput) {
  const queryClient = useQueryClient();
  const selectedCampaignKey = selectedCampaign?.key;
  const selectedCampaignId = selectedCampaign?.campaignId;
  const selectedCampaignVersion = selectedCampaign?.campaignVersion;
  const selectedCampaignAsOfDate = selectedCampaign?.asOfDate;
  const selection = useMemo(
    () =>
      selectedCampaignKey && selectedCampaignId && selectedCampaignVersion
        ? {
            key: selectedCampaignKey,
            campaignId: selectedCampaignId,
            campaignVersion: selectedCampaignVersion,
            requestedAsOfDate:
              selectedCampaignAsOfDate === "N/A"
                ? undefined
                : selectedCampaignAsOfDate,
          }
        : null,
    [
      selectedCampaignAsOfDate,
      selectedCampaignId,
      selectedCampaignKey,
      selectedCampaignVersion,
    ],
  );
  const queryIdentity = selection ?? NO_CAMPAIGN;
  const [historySelection, setHistorySelection] = useState<OffsetSelection>({
    campaignKey: initialCampaignKey ?? "",
    offset: 0,
  });
  const [workflowRecovery, setWorkflowRecovery] =
    useState<WorkflowRecovery | null>(null);
  const historyOffset =
    selection && historySelection.campaignKey === selection.key
      ? historySelection.offset
      : 0;
  const {
    approvalDecisions,
    assignmentActions,
    assignmentTasks,
    makerCheckerControls,
  } = initialWorkflowEvidence;
  const initialWorkflow = useMemo(
    () =>
      selection?.key === initialCampaignKey
        ? completeInitialWorkflowEvidence({
            approvalDecisions,
            assignmentActions,
            assignmentTasks,
            makerCheckerControls,
          })
        : undefined,
    [
      approvalDecisions,
      assignmentActions,
      assignmentTasks,
      initialCampaignKey,
      makerCheckerControls,
      selection?.key,
    ],
  );
  const initialWorkflowIsAuthoritative =
    selection?.key === initialCampaignKey;
  const workflowRecoveredForCurrentInput =
    workflowRecovery !== null &&
    workflowRecovery.campaignKey === selection?.key &&
    workflowRecovery.approvalDecisions === approvalDecisions &&
    workflowRecovery.assignmentActions === assignmentActions &&
    workflowRecovery.assignmentTasks === assignmentTasks &&
    workflowRecovery.makerCheckerControls === makerCheckerControls;
  const workflowRequiresRecovery =
    initialWorkflowIsAuthoritative &&
    !initialWorkflow &&
    !workflowRecoveredForCurrentInput;
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
  useEffect(() => {
    if (!selection || !initialWorkflowIsAuthoritative) {
      return;
    }
    const workflowKey = dpmCampaignQueryKeys.workflow(selection);
    if (initialWorkflow) {
      queryClient.setQueryData(workflowKey, initialWorkflow);
    } else if (!workflowRecoveredForCurrentInput) {
      queryClient.removeQueries({ queryKey: workflowKey, exact: true });
    }
  }, [
    initialWorkflow,
    initialWorkflowIsAuthoritative,
    queryClient,
    selection,
    workflowRecoveredForCurrentInput,
  ]);
  const lifecycleConfirmationKey = dpmCampaignQueryKeys.confirmationLock(
    queryIdentity,
    "lifecycle",
  );
  const lifecycleConfirmationQuery = useQuery<ConfirmationLock>({
    queryKey: lifecycleConfirmationKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<ConfirmationLock>(lifecycleConfirmationKey),
  });
  const workflowConfirmationKey = dpmCampaignQueryKeys.confirmationLock(
    queryIdentity,
    "workflow",
  );
  const workflowConfirmationQuery = useQuery<ConfirmationLock>({
    queryKey: workflowConfirmationKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<ConfirmationLock>(workflowConfirmationKey),
  });

  async function loadLifecycle(row: DpmCampaignDefinitionRow) {
    const target = toRequiredSelection(row);
    const retainedLock = queryClient.getQueryData<ConfirmationLock>(
      dpmCampaignQueryKeys.confirmationLock(target, "lifecycle"),
    );
    if (retainedLock) {
      return await refreshLifecycle(row);
    }
    return await queryClient.fetchQuery(
      dpmCampaignLifecycleQueryOptions(target),
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
    const previewOptions = dpmCampaignPreviewReadinessQueryOptions(
      target,
      target.requestedAsOfDate,
    );
    const packageOptions = dpmCampaignLaunchPackageQueryOptions(
      target,
      target.requestedAsOfDate,
    );
    await Promise.all([
      queryClient.cancelQueries({
        queryKey: previewOptions.queryKey,
        exact: true,
      }),
      queryClient.cancelQueries({
        queryKey: packageOptions.queryKey,
        exact: true,
      }),
    ]);
    queryClient.removeQueries({
      queryKey: packageOptions.queryKey,
      exact: true,
    });
    const preview = await queryClient.fetchQuery(
      { ...previewOptions, staleTime: 0 },
    );
    const state =
      typeof preview.data.supportability_state === "string"
        ? preview.data.supportability_state.toUpperCase()
        : "";
    if (state !== "READY") {
      return { preview, launchPackage: null };
    }
    const launchPackage = await queryClient.fetchQuery({
      ...packageOptions,
      staleTime: 0,
    });
    return { preview, launchPackage };
  }

  async function loadWorkflow(row: DpmCampaignDefinitionRow) {
    const target = toRequiredSelection(row);
    const retainedLock = queryClient.getQueryData<ConfirmationLock>(
      dpmCampaignQueryKeys.confirmationLock(target, "workflow"),
    );
    if (retainedLock) {
      return await refreshWorkflow(row);
    }
    const options = dpmCampaignWorkflowQueryOptions(target);
    const response = await queryClient.fetchQuery({
      ...options,
      staleTime:
        row.key === initialCampaignKey && !initialWorkflow ? 0 : options.staleTime,
    });
    markWorkflowRecovered(row);
    return response;
  }

  async function refreshLifecycle(row: DpmCampaignDefinitionRow) {
    const target = toRequiredSelection(row);
    const options = dpmCampaignLifecycleQueryOptions(target);
    const definitionsOptions = dpmCampaignDefinitionsQueryOptions();
    await Promise.all([
      queryClient.cancelQueries({ queryKey: options.queryKey, exact: true }),
      queryClient.cancelQueries({
        queryKey: definitionsOptions.queryKey,
        exact: true,
      }),
    ]);
    try {
      const [response, definitions] = await Promise.all([
        fetchDpmCampaignLifecycle(target),
        fetchDpmCampaignDefinitions(),
      ]);
      queryClient.setQueryData(options.queryKey, response);
      queryClient.setQueryData(definitionsOptions.queryKey, definitions);
      queryClient.removeQueries({
        queryKey: dpmCampaignQueryKeys.confirmationLock(target, "lifecycle"),
        exact: true,
      });
      return response;
    } catch (error) {
      queryClient.setQueryData<ConfirmationLock>(
        dpmCampaignQueryKeys.confirmationLock(target, "lifecycle"),
        {
          message:
            "Lifecycle action was recorded, but the updated campaign record could not be loaded. Reload the campaign before taking another action.",
        },
      );
      throw error;
    }
  }

  async function refreshWorkflow(row: DpmCampaignDefinitionRow) {
    const target = toRequiredSelection(row);
    const options = dpmCampaignWorkflowQueryOptions(target);
    await queryClient.cancelQueries({
      queryKey: options.queryKey,
      exact: true,
    });
    try {
      const response = await queryClient.fetchQuery({
        ...options,
        staleTime: 0,
      });
      markWorkflowRecovered(row);
      queryClient.removeQueries({
        queryKey: dpmCampaignQueryKeys.confirmationLock(target, "workflow"),
        exact: true,
      });
      return response;
    } catch (error) {
      queryClient.setQueryData<ConfirmationLock>(
        dpmCampaignQueryKeys.confirmationLock(target, "workflow"),
        {
          message:
            "Governance action was recorded, but refreshed source evidence could not be loaded. Reload source evidence before recording another governance action.",
        },
      );
      throw error;
    }
  }

  return {
    lifecycle: lifecycleQuery.data ?? null,
    lifecycleError:
      lifecycleConfirmationQuery.data?.message ??
      errorMessage(lifecycleQuery.error),
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
    workflow: workflowRequiresRecovery ? null : (workflowQuery.data ?? null),
    workflowError:
      workflowConfirmationQuery.data?.message ??
      errorMessage(workflowQuery.error),
    workflowPending: workflowQuery.isFetching,
    workflowResolved:
      !workflowRequiresRecovery &&
      (workflowQuery.isFetched || workflowQuery.data !== undefined),
    loadLifecycle,
    loadLaunchHistory,
    loadLaunchReadiness,
    loadWorkflow,
    refreshLifecycle,
    refreshWorkflow,
  };

  function markWorkflowRecovered(row: DpmCampaignDefinitionRow) {
    if (row.key !== initialCampaignKey || initialWorkflow) {
      return;
    }
    setWorkflowRecovery({
      campaignKey: row.key,
      approvalDecisions,
      assignmentActions,
      assignmentTasks,
      makerCheckerControls,
    });
  }
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
