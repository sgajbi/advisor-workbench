import { queryOptions } from "@tanstack/react-query";

import { workbenchStrictQueryDefaults } from "@/features/platform-runtime/query-policy";
import { resolveDefaultDpmContext } from "@/features/workbench/caller-context";
import {
  getDpmWave,
  getDpmWaveItems,
  getDpmWaveProofPackPosture,
  listDpmWaves,
} from "@/features/workbench/dpm-wave-api";
import {
  dpmWaveQueryKeys,
  type DpmWaveListContext,
} from "@/features/workbench/dpm-wave-query-keys";
import type { DpmWaveGatewayResponse } from "@/features/workbench/types";

export function buildDpmWaveListContext(): DpmWaveListContext {
  return {
    asOfDate: resolveDefaultDpmContext().commandCenterAsOfDate,
    triggerType: "EXPLICIT_PORTFOLIO_LIST",
    limit: 10,
    offset: 0,
  };
}

export function dpmWaveListQueryOptions(
  context: DpmWaveListContext,
  initialData?: DpmWaveGatewayResponse,
) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: dpmWaveQueryKeys.list(context),
    queryFn: async () =>
      await listDpmWaves(
        {
          asOfDate: context.asOfDate,
          triggerType: context.triggerType,
          limit: context.limit,
          offset: context.offset,
        },
        "client",
      ),
    initialData,
  });
}

export function dpmWaveDetailQueryOptions(waveId: string) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: dpmWaveQueryKeys.detail(waveId),
    queryFn: async () => await getDpmWave(waveId),
  });
}

export function dpmWaveItemsQueryOptions(waveId: string) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: dpmWaveQueryKeys.items(waveId),
    queryFn: async () => await getDpmWaveItems(waveId),
    retry: 1,
  });
}

export function dpmWaveProofPackQueryOptions(waveId: string) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: dpmWaveQueryKeys.proofPack(waveId),
    queryFn: async () => await getDpmWaveProofPackPosture(waveId),
    enabled: false,
  });
}
