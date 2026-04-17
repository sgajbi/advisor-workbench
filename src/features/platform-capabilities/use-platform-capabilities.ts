"use client";

import { useEffect, useState } from "react";

import { fallbackNormalizedCapabilities, getPlatformCapabilities } from "./api";
import { PlatformCapabilitiesError, PlatformNormalizedCapabilities } from "./types";

type UsePlatformCapabilitiesResult = {
  loading: boolean;
  normalized: PlatformNormalizedCapabilities;
  partialFailure: boolean;
  errors: PlatformCapabilitiesError[];
  shellBootstrapSource: "loading" | "contract" | "fallback";
};

type PlatformCapabilitiesSnapshot = Omit<UsePlatformCapabilitiesResult, "loading">;

const PLATFORM_CAPABILITIES_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedSnapshot: PlatformCapabilitiesSnapshot | null = null;
let cachedAtMs = 0;
let inflightSnapshotRequest: Promise<PlatformCapabilitiesSnapshot> | null = null;

function getCachedSnapshot(): PlatformCapabilitiesSnapshot | null {
  if (!cachedSnapshot) {
    return null;
  }
  if (Date.now() - cachedAtMs > PLATFORM_CAPABILITIES_CACHE_TTL_MS) {
    cachedSnapshot = null;
    cachedAtMs = 0;
    return null;
  }
  return cachedSnapshot;
}

function cacheSnapshot(snapshot: PlatformCapabilitiesSnapshot): PlatformCapabilitiesSnapshot {
  cachedSnapshot = snapshot;
  cachedAtMs = Date.now();
  return snapshot;
}

async function loadPlatformCapabilitiesSnapshot(): Promise<PlatformCapabilitiesSnapshot> {
  const cached = getCachedSnapshot();
  if (cached) {
    return cached;
  }

  if (inflightSnapshotRequest) {
    return await inflightSnapshotRequest;
  }

  inflightSnapshotRequest = (async () => {
    try {
      const data = await getPlatformCapabilities("UI", "default");
      const nextNormalized = data.normalized ?? fallbackNormalizedCapabilities();
      return cacheSnapshot({
        normalized: nextNormalized,
        partialFailure: Boolean(data.partialFailure),
        errors: data.errors ?? [],
        shellBootstrapSource: data.normalized?.shellBootstrap?.workspaces?.length
          ? "contract"
          : "fallback",
      });
    } catch {
      return cacheSnapshot({
        normalized: fallbackNormalizedCapabilities(),
        partialFailure: true,
        errors: [
          {
            service: "bff",
            status_code: 0,
            detail: "capability_bootstrap_fallback",
          },
        ],
        shellBootstrapSource: "fallback",
      });
    } finally {
      inflightSnapshotRequest = null;
    }
  })();

  return await inflightSnapshotRequest;
}

function getInitialResult(): UsePlatformCapabilitiesResult {
  const cached = getCachedSnapshot();
  if (cached) {
    return {
      loading: false,
      ...cached,
    };
  }

  return {
    loading: true,
    normalized: fallbackNormalizedCapabilities(),
    partialFailure: false,
    errors: [],
    shellBootstrapSource: "loading",
  };
}

export function resetPlatformCapabilitiesHookCache() {
  cachedSnapshot = null;
  cachedAtMs = 0;
  inflightSnapshotRequest = null;
}

export function usePlatformCapabilities(): UsePlatformCapabilitiesResult {
  const [state, setState] = useState<UsePlatformCapabilitiesResult>(() => getInitialResult());

  useEffect(() => {
    let active = true;

    const cached = getCachedSnapshot();
    if (cached) {
      setState({
        loading: false,
        ...cached,
      });
      return () => {
        active = false;
      };
    }

    void loadPlatformCapabilitiesSnapshot().then((snapshot) => {
      if (!active) {
        return;
      }
      setState({
        loading: false,
        ...snapshot,
      });
    });

    return () => {
      active = false;
    };
  }, []);

  return state;
}
