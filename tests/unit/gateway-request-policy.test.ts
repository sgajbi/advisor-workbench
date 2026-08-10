import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createGatewayRequestSignal,
  isGatewayRequestTimeout,
  resolveGatewayRequestTimeoutMs,
} from "@/features/platform-runtime/gateway-request-policy";

describe("Gateway request policy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("uses the governed default and accepts a bounded operator override", () => {
    expect(resolveGatewayRequestTimeoutMs(undefined)).toBe(15_000);
    expect(resolveGatewayRequestTimeoutMs("30000")).toBe(30_000);
  });

  it.each(["0", "999", "120001", "1.5", "not-a-number"])(
    "rejects invalid timeout value %s",
    (configured) => {
      expect(() => resolveGatewayRequestTimeoutMs(configured)).toThrow(
        "WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS",
      );
    },
  );

  it("creates a bounded AbortSignal from the configured policy", () => {
    vi.stubEnv("WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS", "2500");
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

    const signal = createGatewayRequestSignal();

    expect(timeoutSpy).toHaveBeenCalledWith(2500);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("classifies only abort and timeout failures as bounded timeouts", () => {
    expect(isGatewayRequestTimeout(new DOMException("timed out", "TimeoutError"))).toBe(true);
    expect(isGatewayRequestTimeout(new DOMException("aborted", "AbortError"))).toBe(true);
    expect(isGatewayRequestTimeout(new TypeError("connection refused"))).toBe(false);
    expect(isGatewayRequestTimeout("timeout")).toBe(false);
  });
});
