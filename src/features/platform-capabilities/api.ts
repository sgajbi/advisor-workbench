import {
  DEFAULT_NAVIGATION_FLAGS,
  PlatformCapabilitiesEnvelope,
  PlatformNormalizedCapabilities,
} from "./types";

const BFF_PROXY_BASE = "/api/bff/api/v1";

export async function getPlatformCapabilities(
  consumerSystem = "UI",
  tenantId = "default"
): Promise<PlatformCapabilitiesEnvelope["data"]> {
  const params = new URLSearchParams({
    consumerSystem,
    tenantId,
  });
  const response = await fetch(`${BFF_PROXY_BASE}/platform/capabilities?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Platform capabilities fetch failed (${response.status}): ${detail}`);
  }
  const payload = (await response.json()) as PlatformCapabilitiesEnvelope;
  return payload.data;
}

export function fallbackNormalizedCapabilities(): PlatformNormalizedCapabilities {
  return {
    navigation: { ...DEFAULT_NAVIGATION_FLAGS },
    workflowFlags: {},
    inputModesBySource: {},
    inputModesUnion: [],
    moduleHealth: {
      pas: "unknown",
      pa: "unknown",
      dpm: "unknown",
    },
    policyVersionsBySource: {
      pas: "unknown",
      pa: "unknown",
      dpm: "unknown",
    },
  };
}
