"use client";

import { useEffect } from "react";
import { skipToken, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { buildDpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import {
  approveDpmWave,
  createDpmWave,
  handoffDpmWave,
  previewDpmWave,
  requestDpmOperationsHandoffSummary,
  requestDpmWaveAiPmMemo,
  simulateDpmWave,
  sourceCheckDpmWave,
  stageDpmWave,
} from "@/features/workbench/dpm-wave-api";
import {
  dpmWaveDetailQueryOptions,
  dpmWaveItemsQueryOptions,
  dpmWaveProofPackQueryOptions,
  getConfirmedDpmWaveResponseIdentity,
  getIdentityConfirmedDpmWaveDetail,
  getIdentityConfirmedDpmWaveItems,
} from "@/features/workbench/dpm-wave-query-options";
import {
  DPM_WAVE_COMMAND_SCOPE,
  dpmWaveMutationKeys,
  dpmWaveQueryKeys,
} from "@/features/workbench/dpm-wave-query-keys";
import type {
  DpmOperationsHandoffSummaryResponse,
  DpmWaveAiPmMemoResponse,
  DpmWaveGatewayResponse,
} from "@/features/workbench/types";

type DpmWaveCommandVariables = {
  label: string;
  waveId: string | null;
  sourceWaveId: string | null;
  refresh: "none" | "list" | "wave-and-list";
  execute: () => Promise<DpmWaveGatewayResponse>;
};

type DpmWaveCommandResult = {
  response: DpmWaveGatewayResponse | null;
  detailUpdateCountAtAdmission: number;
  waveId: string | null;
  sourceWaveId: string | null;
};

type WaveAiResult<T> = {
  waveId: string;
  response: T;
};

type WaveConfirmationLock = {
  commandLabel: string;
  contextWaveId: string | null;
  errorMessage: string;
  recoveryWaveId: string | null;
};

type ConfirmedCreatedWave = {
  listWaveIdAtConfirmation: string | null;
  waveId: string;
};

type WaveCommandContext = {
  detailUpdateCountAtAdmission: number;
  listWaveIdAtSelection: string | null;
  response: DpmWaveGatewayResponse | null;
  responseIsDirect: boolean;
  waveId: string;
};

export function useDpmWaveCommands({
  portfolioId,
  selectedWaveId,
  listQueryKey,
  allowRetainedSelection,
}: {
  portfolioId: string;
  selectedWaveId: string | null;
  listQueryKey: readonly unknown[];
  allowRetainedSelection: boolean;
}) {
  const queryClient = useQueryClient();
  const confirmedCreatedWaveKey = dpmWaveQueryKeys.confirmedCreatedWave(portfolioId);
  const commandContextKey = dpmWaveQueryKeys.commandContext(portfolioId);
  const confirmationLockKey = dpmWaveQueryKeys.confirmationLock(portfolioId);
  const confirmationLockQuery = useQuery<WaveConfirmationLock>({
    queryKey: confirmationLockKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<WaveConfirmationLock>(confirmationLockKey),
  });
  const confirmationLock =
    confirmationLockQuery.data ??
    queryClient.getQueryData<WaveConfirmationLock>(confirmationLockKey) ??
    null;
  const confirmedCreatedWaveQuery = useQuery<ConfirmedCreatedWave>({
    queryKey: confirmedCreatedWaveKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<ConfirmedCreatedWave>(confirmedCreatedWaveKey),
  });
  const confirmedCreatedWave =
    confirmedCreatedWaveQuery.data ??
    queryClient.getQueryData<ConfirmedCreatedWave>(confirmedCreatedWaveKey) ??
    null;
  const commandContextQuery = useQuery<WaveCommandContext>({
    queryKey: commandContextKey,
    queryFn: skipToken,
    gcTime: Infinity,
    initialData: () =>
      queryClient.getQueryData<WaveCommandContext>(commandContextKey),
  });
  const commandContext =
    commandContextQuery.data ??
    queryClient.getQueryData<WaveCommandContext>(commandContextKey) ??
    null;
  const activeConfirmedCreatedWave =
    allowRetainedSelection &&
    confirmedCreatedWave &&
    (selectedWaveId === confirmedCreatedWave.listWaveIdAtConfirmation ||
      selectedWaveId === confirmedCreatedWave.waveId)
      ? confirmedCreatedWave
      : null;
  const activeCommandContext =
    allowRetainedSelection &&
    commandContext &&
    (selectedWaveId === commandContext.listWaveIdAtSelection ||
      selectedWaveId === commandContext.waveId)
      ? commandContext
      : null;
  const contextWaveId =
    activeCommandContext?.waveId ?? activeConfirmedCreatedWave?.waveId ?? selectedWaveId;
  const activeConfirmationLock =
    confirmationLock?.contextWaveId === contextWaveId
      ? confirmationLock
      : null;

  useEffect(() => {
    if (
      confirmedCreatedWave &&
      selectedWaveId &&
      selectedWaveId !== confirmedCreatedWave.listWaveIdAtConfirmation
    ) {
      queryClient.removeQueries({
        queryKey: confirmedCreatedWaveKey,
        exact: true,
      });
    }
  }, [
    confirmedCreatedWave,
    confirmedCreatedWaveKey,
    queryClient,
    selectedWaveId,
  ]);
  async function refreshWaveSources(
    variables: DpmWaveCommandVariables,
    response: DpmWaveGatewayResponse,
  ): Promise<DpmWaveGatewayResponse> {
    if (variables.refresh === "none") {
      return response;
    }
    let recoveryWaveId = variables.waveId;
    try {
      const expectedWaveId =
        variables.waveId ??
        getConfirmedDpmWaveResponseIdentity(
          response,
          "Persisted create response",
        );
      recoveryWaveId = expectedWaveId;
      if (variables.refresh === "list") {
        queryClient.setQueryData<ConfirmedCreatedWave>(confirmedCreatedWaveKey, {
          listWaveIdAtConfirmation: selectedWaveId,
          waveId: expectedWaveId,
        });
        queryClient.removeQueries({ queryKey: commandContextKey, exact: true });
      }
      const detailOptions = dpmWaveDetailQueryOptions(expectedWaveId);
      await queryClient.cancelQueries({
        queryKey: detailOptions.queryKey,
        exact: true,
      });
      const detail = await getIdentityConfirmedDpmWaveDetail(expectedWaveId);
      queryClient.setQueryData(detailOptions.queryKey, detail);
      const itemsOptions = dpmWaveItemsQueryOptions(expectedWaveId);
      await queryClient.cancelQueries({
        queryKey: itemsOptions.queryKey,
        exact: true,
      });
      const items = await getIdentityConfirmedDpmWaveItems(expectedWaveId);
      queryClient.setQueryData(itemsOptions.queryKey, items);
      await queryClient.resetQueries({
        queryKey: dpmWaveProofPackQueryOptions(expectedWaveId).queryKey,
        exact: true,
      });
      await queryClient.invalidateQueries(
        { queryKey: listQueryKey, exact: true },
        { throwOnError: true },
      );
      return detail;
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "source refresh failed";
      const errorMessage =
        `${variables.label} was accepted, but refreshed rebalance evidence could not be loaded (${detail}). Reload before taking the next action.`;
      queryClient.setQueryData<WaveConfirmationLock>(confirmationLockKey, {
        commandLabel: variables.label,
        contextWaveId: recoveryWaveId ?? variables.sourceWaveId,
        errorMessage,
        recoveryWaveId,
      });
      throw new Error(errorMessage);
    }
  }

  const commandMutation = useMutation({
    mutationKey: dpmWaveMutationKeys.command(),
    scope: { id: DPM_WAVE_COMMAND_SCOPE },
    mutationFn: async (variables: DpmWaveCommandVariables): Promise<DpmWaveCommandResult> => {
      const response = await variables.execute();
      const confirmedResponse = await refreshWaveSources(variables, response);
      const waveId =
        variables.waveId ??
        getConfirmedDpmWaveResponseIdentity(
          confirmedResponse,
          variables.refresh === "list"
            ? "Confirmed created wave"
            : `${variables.label} response`,
        );
      const detailUpdateCountAtAdmission = waveId
        ? (queryClient.getQueryState(dpmWaveQueryKeys.wave(waveId))
            ?.dataUpdateCount ?? 0)
        : 0;
      const result = {
        response: confirmedResponse,
        detailUpdateCountAtAdmission,
        waveId,
        sourceWaveId: variables.sourceWaveId,
      };
      if (variables.refresh === "none" && waveId) {
        queryClient.setQueryData<WaveCommandContext>(commandContextKey, {
          detailUpdateCountAtAdmission,
          listWaveIdAtSelection: selectedWaveId,
          response: confirmedResponse,
          responseIsDirect: true,
          waveId,
        });
      } else if (variables.refresh === "list") {
        queryClient.removeQueries({ queryKey: commandContextKey, exact: true });
      } else if (activeCommandContext?.waveId === waveId) {
        queryClient.setQueryData<WaveCommandContext>(commandContextKey, {
          ...activeCommandContext,
          detailUpdateCountAtAdmission,
          response: null,
          responseIsDirect: false,
        });
      }
      return result;
    },
  });
  useEffect(() => {
    if (
      commandContext &&
      selectedWaveId &&
      selectedWaveId !== commandContext.listWaveIdAtSelection
    ) {
      queryClient.removeQueries({ queryKey: commandContextKey, exact: true });
      if (
        commandMutation.isSuccess &&
        commandMutation.variables.refresh === "none" &&
        commandMutation.data?.waveId === commandContext.waveId
      ) {
        commandMutation.reset();
      }
    }
  }, [
    commandContext,
    commandContextKey,
    commandMutation,
    queryClient,
    selectedWaveId,
  ]);
  const pmMemoMutation = useMutation({
    mutationKey: dpmWaveMutationKeys.pmMemo(),
    mutationFn: async (waveId: string): Promise<WaveAiResult<DpmWaveAiPmMemoResponse>> => ({
      waveId,
      response: await requestDpmWaveAiPmMemo(waveId),
    }),
  });
  const operationsBriefMutation = useMutation({
    mutationKey: dpmWaveMutationKeys.operationsBrief(),
    mutationFn: async (
      waveId: string,
    ): Promise<WaveAiResult<DpmOperationsHandoffSummaryResponse>> => ({
      waveId,
      response: await requestDpmOperationsHandoffSummary(waveId),
    }),
  });

  const commandResultMatchesContext = Boolean(
    commandMutation.data &&
      (commandMutation.data.sourceWaveId === contextWaveId ||
        commandMutation.data.waveId === contextWaveId),
  );
  const activeWaveId = commandResultMatchesContext
    ? commandMutation.data?.waveId ?? contextWaveId
    : contextWaveId;
  const retainedSelectionActive =
    activeConfirmedCreatedWave?.waveId === activeWaveId ||
    (activeCommandContext?.waveId === activeWaveId &&
      activeCommandContext.responseIsDirect === false);

  function commandInFlight(): boolean {
    return (
      activeConfirmationLock !== null ||
      queryClient.isMutating({ mutationKey: dpmWaveMutationKeys.all }) > 0
    );
  }

  function runCommand(variables: DpmWaveCommandVariables): void {
    if (!commandInFlight()) {
      queryClient.removeQueries({ queryKey: confirmationLockKey, exact: true });
      commandMutation.mutate(variables);
    }
  }

  async function confirmSourceRecovery(): Promise<void> {
    const recoveryWaveId = activeConfirmationLock?.recoveryWaveId;
    if (!recoveryWaveId) {
      return;
    }
    try {
      await queryClient.invalidateQueries(
        { queryKey: listQueryKey, exact: true },
        { throwOnError: true },
      );
    } catch {
      return;
    }
    await queryClient.resetQueries({
      queryKey: dpmWaveProofPackQueryOptions(recoveryWaveId).queryKey,
      exact: true,
    });
    queryClient.removeQueries({ queryKey: confirmationLockKey, exact: true });
    commandMutation.reset();
  }

  function runSelectedWaveCommand(
    label: string,
    execute: (waveId: string) => Promise<DpmWaveGatewayResponse>,
  ): void {
    if (activeWaveId) {
      runCommand({
        label,
        waveId: activeWaveId,
        sourceWaveId: activeWaveId,
        refresh: "wave-and-list",
        execute: async () => await execute(activeWaveId),
      });
    }
  }

  const selectedCommandResult =
    commandMutation.data && commandResultMatchesContext
      ? commandMutation.data.response
      : activeCommandContext?.response ?? null;
  const selectedCommandResultIsDirect =
    (commandMutation.isSuccess &&
      commandResultMatchesContext &&
      commandMutation.variables.refresh === "none") ||
    (!commandResultMatchesContext && activeCommandContext?.responseIsDirect === true);
  const commandError =
    !commandMutation.variables?.sourceWaveId ||
    commandMutation.variables.sourceWaveId === contextWaveId
      ? readError(commandMutation.error)
      : null;
  const selectedPmMemo =
    pmMemoMutation.data?.waveId === activeWaveId ? pmMemoMutation.data.response : null;
  const selectedOperationsBrief =
    operationsBriefMutation.data?.waveId === activeWaveId
      ? operationsBriefMutation.data.response
      : null;
  const latestAiMutation =
    pmMemoMutation.submittedAt >= operationsBriefMutation.submittedAt
      ? { family: "wave-memo" as const, mutation: pmMemoMutation }
      : { family: "operations-handoff" as const, mutation: operationsBriefMutation };
  const selectedAiError =
    latestAiMutation.mutation.variables === activeWaveId
      ? readError(latestAiMutation.mutation.error)
      : null;
  const pendingAction = commandMutation.isPending
    ? commandMutation.variables.label
    : activeConfirmationLock
      ? `${activeConfirmationLock.commandLabel} — awaiting source confirmation`
    : pmMemoMutation.isPending && pmMemoMutation.variables === activeWaveId
      ? "Prepare PM memo"
      : operationsBriefMutation.isPending && operationsBriefMutation.variables === activeWaveId
        ? "Prepare operations brief"
        : null;

  return {
    activeWaveId,
    retainedSelectionActive,
    confirmationRecoveryAvailable:
      activeConfirmationLock?.recoveryWaveId === contextWaveId,
    confirmSourceRecovery,
    actionResponse: selectedCommandResult,
    actionResponseDetailUpdateCountAtAdmission:
      commandMutation.data && commandResultMatchesContext
        ? commandMutation.data.detailUpdateCountAtAdmission
        : activeCommandContext?.detailUpdateCountAtAdmission ?? 0,
    actionResponseIsDirect: selectedCommandResultIsDirect,
    waveAiMemo: selectedPmMemo,
    operationsHandoffSummary: selectedOperationsBrief,
    actionError:
      activeConfirmationLock?.errorMessage ?? commandError ?? selectedAiError,
    actionMessage:
      commandMutation.isSuccess && selectedCommandResult
        ? `${commandMutation.variables.label} completed.`
        : null,
    pendingAction,
    aiWorkflowOutcome:
      latestAiMutation.family === "wave-memo" && selectedPmMemo
        ? buildDpmAiWorkflowOutcome("wave-memo", selectedPmMemo, activeWaveId ?? "")
        : latestAiMutation.family === "operations-handoff" && selectedOperationsBrief
          ? buildDpmAiWorkflowOutcome(
              "operations-handoff",
              selectedOperationsBrief,
              activeWaveId ?? "",
            )
          : null,
    previewRebalance: () =>
      runCommand({
        label: "Preview",
        waveId: null,
        sourceWaveId: activeWaveId,
        refresh: "none",
        execute: async () => await previewDpmWave({ portfolioId }),
      }),
    createRebalance: () =>
      runCommand({
        label: "Create rebalance",
        waveId: null,
        sourceWaveId: activeWaveId,
        refresh: "list",
        execute: async () => await createDpmWave({ portfolioId }),
      }),
    reviewDataReadiness: () =>
      runSelectedWaveCommand("Review data", sourceCheckDpmWave),
    runSimulation: () => runSelectedWaveCommand("Simulate", simulateDpmWave),
    requestApproval: () => runSelectedWaveCommand("Request approval", approveDpmWave),
    stageRebalance: () => runSelectedWaveCommand("Stage rebalance", stageDpmWave),
    prepareHandoff: () => runSelectedWaveCommand("Prepare handoff", handoffDpmWave),
    requestWaveMemo: () => {
      const aiPendingForSelectedWave =
        (pmMemoMutation.isPending && pmMemoMutation.variables === activeWaveId) ||
        (operationsBriefMutation.isPending &&
          operationsBriefMutation.variables === activeWaveId);
      if (
        activeWaveId &&
        !commandMutation.isPending &&
        !activeConfirmationLock &&
        !aiPendingForSelectedWave
      ) {
        pmMemoMutation.mutate(activeWaveId);
      }
    },
    requestOperationsBrief: () => {
      const aiPendingForSelectedWave =
        (pmMemoMutation.isPending && pmMemoMutation.variables === activeWaveId) ||
        (operationsBriefMutation.isPending &&
          operationsBriefMutation.variables === activeWaveId);
      if (
        activeWaveId &&
        !commandMutation.isPending &&
        !activeConfirmationLock &&
        !aiPendingForSelectedWave
      ) {
        operationsBriefMutation.mutate(activeWaveId);
      }
    },
  };
}

function readError(error: Error | null): string | null {
  return error?.message ?? null;
}
