import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fallbackNormalizedCapabilities } from "../../src/features/platform-capabilities/api";
import { usePlatformCapabilities } from "../../src/features/platform-capabilities/use-platform-capabilities";

const getPlatformCapabilitiesMock = vi.fn();

vi.mock("../../src/features/platform-capabilities/api", async () => {
  const actual = await vi.importActual("../../src/features/platform-capabilities/api");
  return {
    ...(actual as object),
    getPlatformCapabilities: (...args: unknown[]) => getPlatformCapabilitiesMock(...args),
  };
});

describe("usePlatformCapabilities", () => {
  afterEach(() => {
    getPlatformCapabilitiesMock.mockReset();
  });

  it("loads normalized capabilities from the BFF and clears the loading state", async () => {
    const normalized = {
      ...fallbackNormalizedCapabilities(),
      navigation: {
        ...fallbackNormalizedCapabilities().navigation,
        portfolio_intake: false,
      },
      moduleHealth: {
        lotus_core: "healthy",
        lotus_performance: "degraded",
        lotus_manage: "healthy",
      },
    };

    getPlatformCapabilitiesMock.mockResolvedValue({
      normalized,
      partialFailure: true,
      errors: [{ service: "lotus_performance", status_code: 504, detail: "timeout" }],
    });

    const { result } = renderHook(() => usePlatformCapabilities());

    expect(result.current.loading).toBe(true);
    expect(result.current.normalized.navigation.portfolio_intake).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getPlatformCapabilitiesMock).toHaveBeenCalledWith("UI", "default");
    expect(result.current.normalized.navigation.portfolio_intake).toBe(false);
    expect(result.current.partialFailure).toBe(true);
    expect(result.current.errors).toEqual([
      { service: "lotus_performance", status_code: 504, detail: "timeout" },
    ]);
  });

  it("falls back to local capabilities when bootstrap fails", async () => {
    getPlatformCapabilitiesMock.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => usePlatformCapabilities());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.normalized).toEqual(fallbackNormalizedCapabilities());
    expect(result.current.partialFailure).toBe(true);
    expect(result.current.errors).toEqual([
      {
        service: "bff",
        status_code: 0,
        detail: "capability_bootstrap_fallback",
      },
    ]);
  });
});
