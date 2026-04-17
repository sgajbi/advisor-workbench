import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fallbackNormalizedCapabilities } from "../../src/features/platform-capabilities/api";
import {
  resetPlatformCapabilitiesHookCache,
  usePlatformCapabilities,
} from "../../src/features/platform-capabilities/use-platform-capabilities";

const getPlatformCapabilitiesMock = vi.fn();

vi.mock("../../src/features/platform-capabilities/api", async () => {
  const actual = await vi.importActual("../../src/features/platform-capabilities/api");
  return {
    ...(actual as object),
    getPlatformCapabilities: (...args: unknown[]) => getPlatformCapabilitiesMock(...args),
  };
});

describe("usePlatformCapabilities", () => {
  beforeEach(() => {
    getPlatformCapabilitiesMock.mockReset();
    resetPlatformCapabilitiesHookCache();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    getPlatformCapabilitiesMock.mockReset();
    resetPlatformCapabilitiesHookCache();
    window.sessionStorage.clear();
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
    expect(result.current.shellBootstrapSource).toBe("loading");

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(getPlatformCapabilitiesMock).toHaveBeenCalledWith("UI", "default");
    expect(result.current.normalized.navigation.portfolio_intake).toBe(false);
    expect(result.current.partialFailure).toBe(true);
    expect(result.current.shellBootstrapSource).toBe("contract");
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
    expect(result.current.shellBootstrapSource).toBe("fallback");
    expect(result.current.errors).toEqual([
      {
        service: "bff",
        status_code: 0,
        detail: "capability_bootstrap_fallback",
      },
    ]);
  });

  it("deduplicates concurrent hook mounts behind one capabilities request", async () => {
    const pendingRequest: { resolve: ((value: unknown) => void) | null } = { resolve: null };
    getPlatformCapabilitiesMock.mockReturnValue(
      new Promise((resolve) => {
        pendingRequest.resolve = resolve;
      })
    );

    const first = renderHook(() => usePlatformCapabilities());
    const second = renderHook(() => usePlatformCapabilities());

    await waitFor(() => {
      expect(getPlatformCapabilitiesMock).toHaveBeenCalledTimes(1);
    });
    expect(first.result.current.loading).toBe(true);
    expect(second.result.current.loading).toBe(true);

    if (!pendingRequest.resolve) {
      throw new Error("expected pending capabilities request");
    }

    pendingRequest.resolve({
      normalized: fallbackNormalizedCapabilities(),
      partialFailure: false,
      errors: [],
    });

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
      expect(second.result.current.loading).toBe(false);
    });
  });

  it("reuses the cached snapshot for later hook mounts without refetching", async () => {
    getPlatformCapabilitiesMock.mockResolvedValue({
      normalized: fallbackNormalizedCapabilities(),
      partialFailure: false,
      errors: [],
    });

    const first = renderHook(() => usePlatformCapabilities());

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
    });

    await waitFor(() => {
      expect(getPlatformCapabilitiesMock).toHaveBeenCalledTimes(1);
    });

    const second = renderHook(() => usePlatformCapabilities());

    expect(second.result.current.loading).toBe(false);
    expect(getPlatformCapabilitiesMock).toHaveBeenCalledTimes(1);
  });

  it("reuses the session-scoped snapshot after the in-memory cache resets", async () => {
    getPlatformCapabilitiesMock.mockResolvedValue({
      normalized: fallbackNormalizedCapabilities(),
      partialFailure: false,
      errors: [],
    });

    const first = renderHook(() => usePlatformCapabilities());

    await waitFor(() => {
      expect(first.result.current.loading).toBe(false);
    });

    await waitFor(() => {
      expect(getPlatformCapabilitiesMock).toHaveBeenCalledTimes(1);
    });

    resetPlatformCapabilitiesHookCache({ clearPersistedSnapshot: false });

    const second = renderHook(() => usePlatformCapabilities());

    expect(second.result.current.loading).toBe(false);
    expect(getPlatformCapabilitiesMock).toHaveBeenCalledTimes(1);
  });
});
