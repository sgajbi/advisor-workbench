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
import type { DpmWaveGatewayResponse } from "@/features/workbench/types";

type UseDpmWaveSourcesInput = {
  waveList: DpmWaveGatewayResponse | null;
};

/** Owns the DPM wave list seed; selected-wave reads are keyed independently below. */
export function useDpmWaveListSource({ waveList }: UseDpmWaveSourcesInput) {
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

  return {
    listQueryKey: listOptions.queryKey,
    queryWaveList: waveList === null ? null : listQuery.data ?? null,
    serverWaveList: waveList,
  };
}

/** Owns DPM reads under the selected source identity; campaigns remain a later tranche. */
export function useDpmSelectedWaveSources(
  selectedSourceWaveId: string | null,
  loadDetail = false,
) {
  const itemsQuery = useQuery({
    ...dpmWaveItemsQueryOptions(selectedSourceWaveId ?? ""),
    enabled: Boolean(selectedSourceWaveId),
  });
  const detailQuery = useQuery({
    ...dpmWaveDetailQueryOptions(selectedSourceWaveId ?? ""),
    enabled: Boolean(selectedSourceWaveId) && loadDetail,
  });
  const proofPackQuery = useQuery({
    ...dpmWaveProofPackQueryOptions(selectedSourceWaveId ?? ""),
    enabled: false,
  });

  return {
    waveDetail: detailQuery.data ?? null,
    waveItems: itemsQuery.data ?? null,
    proofPack: proofPackQuery.data ?? null,
    sourceError:
      readQueryError(detailQuery.error) ??
      readQueryError(itemsQuery.error) ??
      readQueryError(proofPackQuery.error),
    refreshItems: itemsQuery.refetch,
    openProofPack: proofPackQuery.refetch,
  };
}

function readQueryError(error: Error | null): string | null {
  return error?.message ?? null;
}
