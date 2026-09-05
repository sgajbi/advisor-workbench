"use client";

import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import {
  dpmCampaignLaunchHistoryQueryOptions,
  dpmCampaignLaunchPackageQueryOptions,
  dpmCampaignDefinitionsQueryOptions,
  dpmCampaignLifecycleConfirmationQueryOptions,
  dpmCampaignLifecycleQueryOptions,
  dpmCampaignPreviewReadinessQueryOptions,
  dpmCampaignWorkflowConfirmationQueryOptions,
  dpmCampaignWorkflowQueryOptions,
  type DpmCampaignWorkflowEvidence,
} from "@/features/workbench/dpm-campaign-query-options";
import { dpmCampaignQueryKeys } from "@/features/workbench/dpm-campaign-query-keys";
import {
  acceptsActiveCampaignDefinitions,
  campaignWorkflowEvidenceTotalCount,
  confirmsCampaignLifecycleEvidence,
  containsCampaignWorkflowEvidence,
  reconcileConfirmedCampaignDefinition,
  type DpmCampaignLifecycleConfirmationReceipt,
  type DpmCampaignWorkflowConfirmationReceipt,
} from "@/features/workbench/dpm-campaign-command-evidence";
import { CAMPAIGN_LAUNCH_HISTORY_PAGE_SIZE } from "@/features/workbench/dpm-campaign-launch-history-constants";
import type { DpmCampaignWorkflowGatewayResponse } from "@/features/workbench/types";
import type { DpmCampaignDefinitionRow } from "@/features/workbench/dpm-wave-command-center-view-model";

type CampaignSelection = Readonly<{
  key: string;
  campaignId: string;
  campaignVersion: string;
  requestedAsOfDate?: string;
}>;

type InitialWorkflowEvidence = Readonly<{
  readId: string;
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
type WorkflowRecovery = Readonly<{
  campaignKey: string;
  readId: string;
}>;
type ServerRead = Readonly<{ readId: string }>;

const NO_CAMPAIGN = {
  campaignId: "__no_campaign__",
  campaignVersion: "__no_version__",
} as const;

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
    readId: initialWorkflowReadId,
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
  const lifecycleQuery = useQuery({
    ...dpmCampaignLifecycleQueryOptions(queryIdentity),
    enabled: false,
  });
  const lifecycleConfirmationReadQuery = useQuery({
    ...dpmCampaignLifecycleConfirmationQueryOptions(queryIdentity),
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
  const workflowConfirmationReadQuery = useQuery({
    ...dpmCampaignWorkflowConfirmationQueryOptions(queryIdentity),
    enabled: false,
  });
  const workflowConfirmationReceiptKey = useMemo(
    () => dpmCampaignQueryKeys.workflowConfirmationReceipt(queryIdentity),
    [queryIdentity],
  );
  const workflowConfirmationReceiptQuery =
    useQuery<DpmCampaignWorkflowConfirmationReceipt>({
    queryKey: workflowConfirmationReceiptKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<DpmCampaignWorkflowConfirmationReceipt>(
        workflowConfirmationReceiptKey,
      ),
  });
  const initialWorkflowContainsConfirmedReceipt =
    !workflowConfirmationReceiptQuery.data ||
    (initialWorkflow !== undefined &&
      workflowEvidenceSatisfiesReceipt(
        initialWorkflow,
        workflowConfirmationReceiptQuery.data,
      ));
  const workflowRecoveredForCurrentInput =
    workflowRecovery !== null &&
    workflowRecovery.campaignKey === selection?.key &&
    workflowRecovery.readId === initialWorkflowReadId;
  const workflowQuery = useQuery({
    ...dpmCampaignWorkflowQueryOptions(queryIdentity),
    enabled: false,
    initialData: initialWorkflowContainsConfirmedReceipt
      ? initialWorkflow
      : undefined,
  });
  const retainedWorkflowContainsConfirmedReceipt =
    !workflowConfirmationReceiptQuery.data ||
    (workflowQuery.data !== undefined &&
      workflowEvidenceSatisfiesReceipt(
        workflowQuery.data,
        workflowConfirmationReceiptQuery.data,
      ));
  const workflowRequiresRecovery =
    initialWorkflowIsAuthoritative &&
    (!initialWorkflow ||
      (!initialWorkflowContainsConfirmedReceipt &&
        (!workflowQuery.data || !retainedWorkflowContainsConfirmedReceipt))) &&
    !workflowRecoveredForCurrentInput;
  const workflowServerReadKey = useMemo(
    () => dpmCampaignQueryKeys.workflowServerRead(queryIdentity),
    [queryIdentity],
  );
  const workflowServerReadQuery = useQuery<ServerRead>({
    queryKey: workflowServerReadKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<ServerRead>(workflowServerReadKey),
  });
  const workflowServerReadAlreadyAdmitted =
    workflowServerReadQuery.data?.readId === initialWorkflowReadId;
  const workflowServerReadAdmissionPending =
    initialWorkflowIsAuthoritative && !workflowServerReadAlreadyAdmitted;
  useEffect(() => {
    if (
      !selection ||
      !initialWorkflowIsAuthoritative ||
      workflowServerReadAlreadyAdmitted
    ) {
      return;
    }
    const workflowKey = dpmCampaignQueryKeys.workflow(selection);
    const workflowConfirmationReadKey =
      dpmCampaignQueryKeys.workflowConfirmationRead(selection);
    let active = true;
    void Promise.all([
      queryClient.cancelQueries({ queryKey: workflowKey, exact: true }),
      queryClient.cancelQueries({
        queryKey: workflowConfirmationReadKey,
        exact: true,
      }),
    ])
      .then(() => {
        if (
          !active ||
          queryClient.getQueryData<ServerRead>(workflowServerReadKey)
            ?.readId === initialWorkflowReadId
        ) {
          return;
        }
        if (initialWorkflow && initialWorkflowContainsConfirmedReceipt) {
          queryClient.setQueryData(workflowKey, initialWorkflow);
        } else if (
          !initialWorkflow &&
          !workflowRecoveredForCurrentInput
        ) {
          queryClient.removeQueries({ queryKey: workflowKey, exact: true });
        }
        queryClient.setQueryData<ServerRead>(workflowServerReadKey, {
          readId: initialWorkflowReadId,
        });
      });
    return () => {
      active = false;
    };
  }, [
    initialWorkflow,
    initialWorkflowIsAuthoritative,
    initialWorkflowContainsConfirmedReceipt,
    queryClient,
    selection,
    workflowRecoveredForCurrentInput,
    workflowServerReadAlreadyAdmitted,
    workflowServerReadKey,
    initialWorkflowReadId,
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

  async function refreshLifecycle(
    row: DpmCampaignDefinitionRow,
    requiredReceipt?: DpmCampaignLifecycleConfirmationReceipt,
  ) {
    const target = toRequiredSelection(row);
    const options = dpmCampaignLifecycleQueryOptions(target);
    const definitionsOptions = dpmCampaignDefinitionsQueryOptions();
    const admittedServerRead = queryClient.getQueryData<ServerRead>(
      dpmCampaignQueryKeys.definitionsServerRead(),
    );
    const confirmationOptions =
      dpmCampaignLifecycleConfirmationQueryOptions(target);
    const confirmationReceipt = requiredReceipt
      ? requiredReceipt
      : queryClient.getQueryData<DpmCampaignLifecycleConfirmationReceipt>(
          dpmCampaignQueryKeys.lifecycleConfirmationReceipt(target),
        );
    if (confirmationReceipt) {
      queryClient.setQueryData<DpmCampaignLifecycleConfirmationReceipt>(
        dpmCampaignQueryKeys.lifecycleConfirmationReceipt(target),
        confirmationReceipt,
      );
    }
    await Promise.all([
      queryClient.cancelQueries({ queryKey: options.queryKey, exact: true }),
      queryClient.cancelQueries({
        queryKey: definitionsOptions.queryKey,
        exact: true,
      }),
    ]);
    try {
      const confirmation = await queryClient.fetchQuery(confirmationOptions);
      if (
        confirmationReceipt &&
        (!confirmsCampaignLifecycleEvidence(
          confirmation.definition,
          confirmationReceipt,
        ) ||
          !acceptsActiveCampaignDefinitions(
            confirmation.definitions,
            confirmationReceipt,
          ))
      ) {
        throw new Error("Confirmed campaign definition is not yet available.");
      }
      if (
        queryClient.getQueryData<ServerRead>(
          dpmCampaignQueryKeys.definitionsServerRead(),
        )?.readId !== admittedServerRead?.readId
      ) {
        throw new Error(
          "A newer campaign source read superseded this confirmation.",
        );
      }
      queryClient.setQueryData(options.queryKey, confirmation.lifecycle);
      queryClient.setQueryData(
        definitionsOptions.queryKey,
        confirmationReceipt
          ? reconcileConfirmedCampaignDefinition(
              confirmation.definitions,
              confirmation.definition,
              confirmationReceipt,
            )
          : confirmation.definitions,
      );
      queryClient.removeQueries({
        queryKey: dpmCampaignQueryKeys.confirmationLock(target, "lifecycle"),
        exact: true,
      });
      return confirmation.lifecycle;
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

  async function refreshWorkflow(
    row: DpmCampaignDefinitionRow,
    requiredReceipt?: DpmCampaignWorkflowConfirmationReceipt,
  ) {
    const target = toRequiredSelection(row);
    const options = dpmCampaignWorkflowQueryOptions(target);
    const confirmationOptions =
      dpmCampaignWorkflowConfirmationQueryOptions(target);
    const confirmationReceipt = requiredReceipt
      ? requiredReceipt
      : queryClient.getQueryData<DpmCampaignWorkflowConfirmationReceipt>(
          dpmCampaignQueryKeys.workflowConfirmationReceipt(target),
        );
    if (confirmationReceipt) {
      queryClient.setQueryData<DpmCampaignWorkflowConfirmationReceipt>(
        dpmCampaignQueryKeys.workflowConfirmationReceipt(target),
        confirmationReceipt,
      );
    }
    await queryClient.cancelQueries({
      queryKey: options.queryKey,
      exact: true,
    });
    try {
      const response = await queryClient.fetchQuery(confirmationOptions);
      if (
        confirmationReceipt &&
        !containsCampaignWorkflowEvidence(
          response,
          confirmationReceipt,
        )
      ) {
        throw new Error("Confirmed workflow evidence is not yet available.");
      }
      if (confirmationReceipt) {
        queryClient.setQueryData<DpmCampaignWorkflowConfirmationReceipt>(
          dpmCampaignQueryKeys.workflowConfirmationReceipt(target),
          {
            ...confirmationReceipt,
            confirmedTotalCount: campaignWorkflowEvidenceTotalCount(
              response,
              confirmationReceipt,
            ),
          },
        );
      }
      queryClient.setQueryData(options.queryKey, response);
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
    lifecycleConfirmationRequired: Boolean(lifecycleConfirmationQuery.data),
    lifecyclePending:
      lifecycleQuery.isFetching || lifecycleConfirmationReadQuery.isFetching,
    launchHistory: historyQuery.data ?? null,
    launchHistoryError: errorMessage(historyQuery.error),
    launchHistoryPending: historyQuery.isFetching,
    previewReadiness: previewQuery.data ?? null,
    previewReadinessError: errorMessage(previewQuery.error),
    previewReadinessPending: previewQuery.isFetching,
    launchPackage: packageQuery.data ?? null,
    launchPackageError: errorMessage(packageQuery.error),
    launchPackagePending: packageQuery.isFetching,
    workflow: workflowRequiresRecovery
      ? null
      : initialWorkflowIsAuthoritative &&
          initialWorkflow &&
          initialWorkflowContainsConfirmedReceipt &&
          !workflowServerReadAlreadyAdmitted
        ? initialWorkflow
        : (workflowQuery.data ?? null),
    workflowError:
      workflowConfirmationQuery.data?.message ??
      errorMessage(workflowQuery.error),
    workflowPending:
      workflowQuery.isFetching ||
      workflowConfirmationReadQuery.isFetching ||
      workflowServerReadAdmissionPending,
    workflowResolved:
      !workflowServerReadAdmissionPending &&
      !workflowRequiresRecovery &&
      (Boolean(initialWorkflow && initialWorkflowContainsConfirmedReceipt) ||
        workflowQuery.isFetched ||
        workflowQuery.data !== undefined),
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
      readId: initialWorkflowReadId,
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
  evidence: Omit<InitialWorkflowEvidence, "readId">,
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

function workflowEvidenceSatisfiesReceipt(
  evidence: DpmCampaignWorkflowEvidence,
  receipt: DpmCampaignWorkflowConfirmationReceipt,
): boolean {
  return (
    containsCampaignWorkflowEvidence(evidence, receipt) ||
    (receipt.confirmedTotalCount !== undefined &&
      campaignWorkflowEvidenceTotalCount(evidence, receipt) >
        receipt.confirmedTotalCount)
  );
}

function errorMessage(error: unknown): string | null {
  return error instanceof Error ? error.message : error ? String(error) : null;
}
