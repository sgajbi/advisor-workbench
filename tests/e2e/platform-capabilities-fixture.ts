import { fallbackNormalizedCapabilities } from "../../src/features/platform-capabilities/api";

export function buildPlatformCapabilitiesFixture() {
  return {
    data: {
      consumerSystem: "UI",
      tenantId: "default",
      contractVersion: "intake-e2e.v1",
      sources: {},
      partialFailure: false,
      errors: [],
      normalized: fallbackNormalizedCapabilities(),
    },
  };
}
