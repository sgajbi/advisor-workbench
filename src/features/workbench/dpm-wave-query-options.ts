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
    queryKey: dpmWaveQueryKeys.wave(waveId),
    queryFn: async () => await getIdentityConfirmedDpmWaveDetail(waveId),
  });
}

export async function getIdentityConfirmedDpmWaveDetail(
  waveId: string,
): Promise<DpmWaveGatewayResponse> {
  return requireDpmWaveIdentity(
    await getDpmWave(waveId),
    waveId,
    "wave detail",
  );
}

export function dpmWaveItemsQueryOptions(waveId: string) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: dpmWaveQueryKeys.items(waveId),
    queryFn: async () => await getIdentityConfirmedDpmWaveItems(waveId),
    retry: 1,
    retryDelay: 0,
  });
}

export async function getIdentityConfirmedDpmWaveItems(
  waveId: string,
): Promise<DpmWaveGatewayResponse> {
  return requireDpmWaveIdentity(
    await getDpmWaveItems(waveId),
    waveId,
    "proposed changes",
  );
}

export function dpmWaveProofPackQueryOptions(waveId: string) {
  return queryOptions({
    ...workbenchStrictQueryDefaults,
    queryKey: dpmWaveQueryKeys.proofPack(waveId),
    queryFn: async () => await getIdentityConfirmedDpmWaveProofPack(waveId),
    enabled: false,
  });
}

async function getIdentityConfirmedDpmWaveProofPack(
  waveId: string,
): Promise<DpmWaveGatewayResponse> {
  return requireDpmWaveIdentity(
    await getDpmWaveProofPackPosture(waveId),
    waveId,
    "proof pack",
  );
}

function requireDpmWaveIdentity(
  response: DpmWaveGatewayResponse,
  waveId: string,
  evidenceLabel: string,
): DpmWaveGatewayResponse {
  const responseWaveId = response.supportability?.wave_id;
  if (responseWaveId !== waveId) {
    throw new Error(
      `Refreshed ${evidenceLabel} identified ${responseWaveId ?? "no wave"} instead of ${waveId}.`,
    );
  }
  const foreignPayloadWaveId = collectPayloadWaveIds(response.data).find(
    (payloadWaveId) => payloadWaveId !== waveId,
  );
  if (foreignPayloadWaveId !== undefined) {
    throw new Error(
      `Refreshed ${evidenceLabel} payload identified ${foreignPayloadWaveId} instead of ${waveId}.`,
    );
  }
  return response;
}

function collectPayloadWaveIds(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(collectPayloadWaveIds);
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  return Object.entries(value).flatMap(([key, nestedValue]) => {
    if (key === "wave_id" && typeof nestedValue === "string") {
      return [nestedValue];
    }
    return collectPayloadWaveIds(nestedValue);
  });
}
