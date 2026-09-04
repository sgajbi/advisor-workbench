"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  buildDpmWaveListContext,
  dpmWaveDetailQueryOptions,
  dpmWaveItemsQueryOptions,
  dpmWaveListQueryOptions,
  dpmWaveProofPackQueryOptions,
} from "@/features/workbench/dpm-wave-query-options";
import { buildDpmWaveCommandCenterModel } from "@/features/workbench/dpm-wave-command-center-view-model";
import type { DpmWaveGatewayResponse } from "@/features/workbench/types";

type UseDpmWaveSourcesInput = {
  waveList: DpmWaveGatewayResponse | null;
};

/** Owns DPM wave reads under source identities; campaign reads remain a separate tranche. */
export function useDpmWaveSources({ waveList }: UseDpmWaveSourcesInput) {
  const queryClient = useQueryClient();
  const listContext = useMemo(() => buildDpmWaveListContext(), []);
  const listOptions = useMemo(
    () => dpmWaveListQueryOptions(listContext, waveList ?? undefined),
    [listContext, waveList],
  );
  const listQuery = useQuery({
    ...listOptions,
    enabled: waveList !== null,
  });

  useEffect(() => {
    if (waveList) {
      queryClient.setQueryData(listOptions.queryKey, waveList);
    }
  }, [listOptions.queryKey, queryClient, waveList]);

  const waveListSource = preferCurrentServerSource(waveList, listQuery.data);
  const selectedWaveId = buildDpmWaveCommandCenterModel({
    waveList: waveListSource,
  }).selectedWaveId;
  const itemsQuery = useQuery({
    ...dpmWaveItemsQueryOptions(selectedWaveId ?? ""),
    enabled: Boolean(selectedWaveId),
  });
  const detailQuery = useQuery({
    ...dpmWaveDetailQueryOptions(selectedWaveId ?? ""),
    enabled: false,
  });
  const proofPackQuery = useQuery({
    ...dpmWaveProofPackQueryOptions(selectedWaveId ?? ""),
    enabled: false,
  });

  return {
    listQueryKey: listOptions.queryKey,
    waveListSource,
    selectedWaveId,
    waveDetail: detailQuery.data ?? null,
    waveItems: itemsQuery.data ?? null,
    proofPack: proofPackQuery.data ?? null,
    itemsFetching: itemsQuery.isFetching,
    proofPackFetching: proofPackQuery.isFetching,
    sourceError: readQueryError(itemsQuery.error) ?? readQueryError(proofPackQuery.error),
    refreshItems: itemsQuery.refetch,
    openProofPack: proofPackQuery.refetch,
  };
}

function preferCurrentServerSource(
  serverSource: DpmWaveGatewayResponse | null,
  querySource: DpmWaveGatewayResponse | undefined,
): DpmWaveGatewayResponse | null {
  if (serverSource && serverSource.correlation_id !== querySource?.correlation_id) {
    return serverSource;
  }
  return querySource ?? serverSource;
}

function readQueryError(error: Error | null): string | null {
  return error?.message ?? null;
}
