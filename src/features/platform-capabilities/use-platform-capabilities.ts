"use client";

import { useEffect, useState } from "react";

import { fallbackNormalizedCapabilities, getPlatformCapabilities } from "./api";
import { PlatformCapabilitiesError, PlatformNormalizedCapabilities } from "./types";

type UsePlatformCapabilitiesResult = {
  loading: boolean;
  normalized: PlatformNormalizedCapabilities;
  partialFailure: boolean;
  errors: PlatformCapabilitiesError[];
};

export function usePlatformCapabilities(): UsePlatformCapabilitiesResult {
  const [loading, setLoading] = useState(true);
  const [normalized, setNormalized] = useState<PlatformNormalizedCapabilities>(
    fallbackNormalizedCapabilities()
  );
  const [partialFailure, setPartialFailure] = useState(false);
  const [errors, setErrors] = useState<PlatformCapabilitiesError[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await getPlatformCapabilities("UI", "default");
        if (!active) return;
        setNormalized(data.normalized ?? fallbackNormalizedCapabilities());
        setPartialFailure(Boolean(data.partialFailure));
        setErrors(data.errors ?? []);
      } catch {
        if (!active) return;
        setNormalized(fallbackNormalizedCapabilities());
        setPartialFailure(true);
        setErrors([
          {
            service: "bff",
            status_code: 0,
            detail: "capability_bootstrap_fallback",
          },
        ]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  return { loading, normalized, partialFailure, errors };
}
