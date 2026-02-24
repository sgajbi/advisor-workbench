import { afterEach, describe, expect, it, vi } from "vitest";

import { fallbackNormalizedCapabilities, getPlatformCapabilities } from "../../src/features/platform-capabilities/api";

describe("platform capabilities api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls bff capabilities endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            data: {
              consumerSystem: "UI",
              tenantId: "default",
              contractVersion: "v1",
              sources: {},
              partialFailure: false,
              errors: [],
              normalized: {
                navigation: { command_center: true },
                workflowFlags: {},
                inputModesBySource: {},
                inputModesUnion: [],
                moduleHealth: {},
                policyVersionsBySource: {},
                pasPolicyDiagnostics: {
                  available: true,
                  allowedSections: ["OVERVIEW"],
                  warnings: [],
                  policyProvenance: {
                    policyVersion: "pas-default-v1",
                    policySource: "default",
                    matchedRuleId: "default",
                    strictMode: false,
                  },
                },
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await getPlatformCapabilities("UI", "default");
    const fetchMock = global.fetch as unknown as ReturnType<typeof vi.fn>;
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/bff/api/v1/platform/capabilities?consumerSystem=UI&tenantId=default",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("throws a useful error when bff returns non-200", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("service unavailable", { status: 503 }))
    );

    await expect(getPlatformCapabilities("UI", "default")).rejects.toThrow(
      "Platform capabilities fetch failed (503): service unavailable"
    );
  });

  it("returns isolated fallback defaults for client-side gating", () => {
    const a = fallbackNormalizedCapabilities();
    const b = fallbackNormalizedCapabilities();

    a.navigation.command_center = false;

    expect(b.navigation.command_center).toBe(true);
    expect(a.moduleHealth).toEqual({ pas: "unknown", pa: "unknown", dpm: "unknown" });
    expect(a.policyVersionsBySource).toEqual({
      pas: "unknown",
      pa: "unknown",
      dpm: "unknown",
    });
    expect(a.pasPolicyDiagnostics.available).toBe(false);
  });
});
