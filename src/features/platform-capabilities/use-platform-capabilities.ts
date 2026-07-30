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
const PLATFORM_CAPABILITIES_SESSION_STORAGE_KEY = "lotus.platformCapabilities.snapshot.v1";

let cachedSnapshot: PlatformCapabilitiesSnapshot | null = null;
let cachedAtMs = 0;
let inflightSnapshotRequest: Promise<PlatformCapabilitiesSnapshot> | null = null;

type PersistedPlatformCapabilitiesSnapshot = {
  cachedAtMs: number;
  snapshot: PlatformCapabilitiesSnapshot;
};

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readPersistedSnapshot(): PersistedPlatformCapabilitiesSnapshot | null {
  const storage = getSessionStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(PLATFORM_CAPABILITIES_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as PersistedPlatformCapabilitiesSnapshot;
    if (
      typeof parsed !== "object" ||
      parsed == null ||
      typeof parsed.cachedAtMs !== "number" ||
      typeof parsed.snapshot !== "object" ||
      parsed.snapshot == null
    ) {
      storage.removeItem(PLATFORM_CAPABILITIES_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    storage.removeItem(PLATFORM_CAPABILITIES_SESSION_STORAGE_KEY);
    return null;
  }
}

function persistSnapshot(snapshot: PlatformCapabilitiesSnapshot, timestampMs: number): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      PLATFORM_CAPABILITIES_SESSION_STORAGE_KEY,
      JSON.stringify({
        cachedAtMs: timestampMs,
        snapshot,
      } satisfies PersistedPlatformCapabilitiesSnapshot)
    );
  } catch {
    // Ignore storage write failures and continue with in-memory cache only.
  }
}

function clearPersistedSnapshot(): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(PLATFORM_CAPABILITIES_SESSION_STORAGE_KEY);
}

function getCachedSnapshot(): PlatformCapabilitiesSnapshot | null {
  if (!cachedSnapshot) {
    const persisted = readPersistedSnapshot();
    if (!persisted) {
      return null;
    }
    if (Date.now() - persisted.cachedAtMs > PLATFORM_CAPABILITIES_CACHE_TTL_MS) {
      clearPersistedSnapshot();
      return null;
    }
    cachedSnapshot = persisted.snapshot;
    cachedAtMs = persisted.cachedAtMs;
  }
  if (Date.now() - cachedAtMs > PLATFORM_CAPABILITIES_CACHE_TTL_MS) {
    cachedSnapshot = null;
    cachedAtMs = 0;
    clearPersistedSnapshot();
    return null;
  }
  return cachedSnapshot;
}

function cacheSnapshot(snapshot: PlatformCapabilitiesSnapshot): PlatformCapabilitiesSnapshot {
  cachedSnapshot = snapshot;
  cachedAtMs = Date.now();
  persistSnapshot(snapshot, cachedAtMs);
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
  return {
    loading: true,
    normalized: fallbackNormalizedCapabilities(),
    partialFailure: false,
    errors: [],
    shellBootstrapSource: "loading",
  };
}

export function resetPlatformCapabilitiesHookCache(options?: { clearPersistedSnapshot?: boolean }) {
  cachedSnapshot = null;
  cachedAtMs = 0;
  inflightSnapshotRequest = null;
  if (options?.clearPersistedSnapshot ?? true) {
    clearPersistedSnapshot();
  }
}

export function usePlatformCapabilities(): UsePlatformCapabilitiesResult {
  const [state, setState] = useState<UsePlatformCapabilitiesResult>(
    getInitialResult,
  );

  useEffect(() => {
    let active = true;

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
