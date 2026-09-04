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
  const {
    isError: detailIsError,
    isFetching: detailIsFetching,
    isStale: detailIsStale,
    refetch: refetchDetail,
  } = detailQuery;
  const {
    isError: itemsIsError,
    isFetching: itemsIsFetching,
    isStale: itemsIsStale,
    refetch: refetchItems,
  } = itemsQuery;
  useEffect(() => {
    if (!loadDetail) {
      return;
    }
    if (detailIsStale && !detailIsFetching && !detailIsError) {
      void refetchDetail();
    }
    if (itemsIsStale && !itemsIsFetching && !itemsIsError) {
      void refetchItems();
    }
  }, [
    detailIsError,
    detailIsFetching,
    detailIsStale,
    itemsIsError,
    itemsIsFetching,
    itemsIsStale,
    loadDetail,
    refetchDetail,
    refetchItems,
  ]);
  const proofPackQuery = useQuery({
    ...dpmWaveProofPackQueryOptions(selectedSourceWaveId ?? ""),
    enabled: false,
  });

  return {
    waveDetail: detailQuery.data ?? null,
    detailConfirmationBlocked:
      loadDetail &&
      (detailQuery.isStale || detailQuery.isFetching || detailQuery.isError),
    detailConfirmationFailed: loadDetail && detailQuery.isError,
    itemsConfirmationBlocked:
      loadDetail && (itemsQuery.isStale || itemsQuery.isFetching || itemsQuery.isError),
    itemsConfirmationFailed: loadDetail && itemsQuery.isError,
    waveItems: itemsQuery.data ?? null,
    proofPack: proofPackQuery.data ?? null,
    sourceError:
      readQueryError(detailQuery.error) ??
      readQueryError(itemsQuery.error) ??
      readQueryError(proofPackQuery.error),
    refreshItems: refetchItems,
    reconfirmDetail: refetchDetail,
    openProofPack: proofPackQuery.refetch,
  };
}

function readQueryError(error: Error | null): string | null {
  return error?.message ?? null;
}
