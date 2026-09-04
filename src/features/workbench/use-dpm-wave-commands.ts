"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { buildDpmAiWorkflowOutcome } from "@/features/workbench/dpm-ai-workflow-disclosure";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
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
import { dpmWaveDetailQueryOptions } from "@/features/workbench/dpm-wave-query-options";
import {
  DPM_WAVE_COMMAND_SCOPE,
  dpmWaveMutationKeys,
} from "@/features/workbench/dpm-wave-query-keys";
import type {
  DpmOperationsHandoffSummaryResponse,
  DpmWaveAiPmMemoResponse,
  DpmWaveGatewayResponse,
} from "@/features/workbench/types";

type DpmWaveCommandVariables = {
  label: string;
  waveId: string | null;
  refresh: "none" | "list" | "wave-and-list";
  execute: () => Promise<DpmWaveGatewayResponse>;
};

type DpmWaveCommandResult = {
  response: DpmWaveGatewayResponse;
  waveId: string | null;
};

type WaveAiResult<T> = {
  waveId: string;
  response: T;
};

export function useDpmWaveCommands({
  portfolioId,
  selectedWaveId,
  listQueryKey,
}: {
  portfolioId: string;
  selectedWaveId: string | null;
  listQueryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();

  async function refreshWaveSources(
    variables: DpmWaveCommandVariables,
    response: DpmWaveGatewayResponse,
  ): Promise<DpmWaveGatewayResponse> {
    if (variables.refresh === "none") {
      return response;
    }
    if (variables.waveId) {
      queryClient.setQueryData(dpmWaveDetailQueryOptions(variables.waveId).queryKey, response);
    }
    try {
      const detail = variables.waveId
        ? await queryClient.fetchQuery({
            ...dpmWaveDetailQueryOptions(variables.waveId),
            staleTime: 0,
          })
        : response;
      await queryClient.invalidateQueries(
        { queryKey: listQueryKey, exact: true },
        { throwOnError: true },
      );
      if (!variables.waveId) {
        retainCreatedWaveUntilListed(queryClient, listQueryKey, response);
      }
      return detail;
    } catch (error) {
      const detail = error instanceof Error ? error.message : "source refresh failed";
      throw new Error(
        `${variables.label} was accepted, but refreshed rebalance evidence could not be loaded (${detail}). Reload before taking the next action.`,
      );
    }
  }

  const commandMutation = useMutation({
    mutationKey: dpmWaveMutationKeys.command(),
    scope: { id: DPM_WAVE_COMMAND_SCOPE },
    mutationFn: async (variables: DpmWaveCommandVariables): Promise<DpmWaveCommandResult> => {
      const response = await variables.execute();
      return {
        response: await refreshWaveSources(variables, response),
        waveId: variables.waveId,
      };
    },
  });
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

  function commandInFlight(): boolean {
    return queryClient.isMutating({ mutationKey: dpmWaveMutationKeys.all }) > 0;
  }

  function runCommand(variables: DpmWaveCommandVariables): void {
    if (!commandInFlight()) {
      commandMutation.mutate(variables);
    }
  }

  function runSelectedWaveCommand(
    label: string,
    execute: (waveId: string) => Promise<DpmWaveGatewayResponse>,
  ): void {
    if (selectedWaveId) {
      runCommand({
        label,
        waveId: selectedWaveId,
        refresh: "wave-and-list",
        execute: async () => await execute(selectedWaveId),
      });
    }
  }

  const selectedCommandResult =
    commandMutation.data &&
    (!commandMutation.data.waveId || commandMutation.data.waveId === selectedWaveId)
      ? commandMutation.data.response
      : null;
  const commandError =
    !commandMutation.variables?.waveId || commandMutation.variables.waveId === selectedWaveId
      ? readError(commandMutation.error)
      : null;
  const selectedPmMemo =
    pmMemoMutation.data?.waveId === selectedWaveId ? pmMemoMutation.data.response : null;
  const selectedOperationsBrief =
    operationsBriefMutation.data?.waveId === selectedWaveId
      ? operationsBriefMutation.data.response
      : null;
  const latestAiMutation =
    pmMemoMutation.submittedAt >= operationsBriefMutation.submittedAt
      ? { family: "wave-memo" as const, mutation: pmMemoMutation }
      : { family: "operations-handoff" as const, mutation: operationsBriefMutation };
  const selectedAiError =
    latestAiMutation.mutation.variables === selectedWaveId
      ? readError(latestAiMutation.mutation.error)
      : null;
  const pendingAction = commandMutation.isPending
    ? commandMutation.variables.label
    : pmMemoMutation.isPending && pmMemoMutation.variables === selectedWaveId
      ? "Prepare PM memo"
      : operationsBriefMutation.isPending && operationsBriefMutation.variables === selectedWaveId
        ? "Prepare operations brief"
        : null;

  return {
    actionResponse: selectedCommandResult,
    waveAiMemo: selectedPmMemo,
    operationsHandoffSummary: selectedOperationsBrief,
    actionError: commandError ?? selectedAiError,
    actionMessage:
      commandMutation.isSuccess && selectedCommandResult
        ? `${commandMutation.variables.label} completed.`
        : null,
    pendingAction,
    aiWorkflowOutcome:
      latestAiMutation.family === "wave-memo" && selectedPmMemo
        ? buildDpmAiWorkflowOutcome("wave-memo", selectedPmMemo, selectedWaveId ?? "")
        : latestAiMutation.family === "operations-handoff" && selectedOperationsBrief
          ? buildDpmAiWorkflowOutcome(
              "operations-handoff",
              selectedOperationsBrief,
              selectedWaveId ?? "",
            )
          : null,
    previewRebalance: () =>
      runCommand({
        label: "Preview",
        waveId: null,
        refresh: "none",
        execute: async () => await previewDpmWave({ portfolioId }),
      }),
    createRebalance: () =>
      runCommand({
        label: "Create rebalance",
        waveId: null,
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
        (pmMemoMutation.isPending && pmMemoMutation.variables === selectedWaveId) ||
        (operationsBriefMutation.isPending &&
          operationsBriefMutation.variables === selectedWaveId);
      if (selectedWaveId && !commandMutation.isPending && !aiPendingForSelectedWave) {
        pmMemoMutation.mutate(selectedWaveId);
      }
    },
    requestOperationsBrief: () => {
      const aiPendingForSelectedWave =
        (pmMemoMutation.isPending && pmMemoMutation.variables === selectedWaveId) ||
        (operationsBriefMutation.isPending &&
          operationsBriefMutation.variables === selectedWaveId);
      if (selectedWaveId && !commandMutation.isPending && !aiPendingForSelectedWave) {
        operationsBriefMutation.mutate(selectedWaveId);
      }
    },
  };
}

function readError(error: Error | null): string | null {
  return error?.message ?? null;
}

function retainCreatedWaveUntilListed(
  queryClient: ReturnType<typeof useQueryClient>,
  listQueryKey: readonly unknown[],
  response: DpmWaveGatewayResponse,
): void {
  const createdWaveId = buildDpmWaveCommandCenterModel({ waveList: response }).selectedWaveId;
  const refreshedList = queryClient.getQueryData<DpmWaveGatewayResponse>(listQueryKey);
  const refreshedModel = buildDpmWaveCommandCenterModel({
    waveList: refreshedList ?? null,
  });
  if (
    createdWaveId &&
    !refreshedModel.summaryRows.some((row) => row.waveId === createdWaveId)
  ) {
    queryClient.setQueryData(listQueryKey, response);
  }
}
