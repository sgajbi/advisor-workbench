import { afterEach, describe, expect, it } from "vitest";

import {
  resolveBffProxyBaseUrl,
  resolveGatewayBaseUrl,
  resolveWorkbenchApiBase,
} from "@/features/platform-runtime/service-addressing";

describe("service addressing", () => {
  const originalBffBaseUrl = process.env.BFF_BASE_URL;
  const originalEnvironment = process.env.LOTUS_ENVIRONMENT;

  afterEach(() => {
    process.env.BFF_BASE_URL = originalBffBaseUrl;
    process.env.LOTUS_ENVIRONMENT = originalEnvironment;
  });

  it("uses the explicit BFF base URL when configured", () => {
    process.env.BFF_BASE_URL = "https://gateway.custom.example/";
    process.env.LOTUS_ENVIRONMENT = "uat";

    expect(resolveGatewayBaseUrl()).toBe("https://gateway.custom.example");
    expect(resolveWorkbenchApiBase("server")).toBe("https://gateway.custom.example/api/v1");
  });

  it("defaults server-side gateway resolution to the canonical dev hostname", () => {
    delete process.env.BFF_BASE_URL;
    delete process.env.LOTUS_ENVIRONMENT;

    expect(resolveGatewayBaseUrl()).toBe("http://gateway.dev.lotus");
    expect(resolveWorkbenchApiBase("server")).toBe("http://gateway.dev.lotus/api/v1");
  });

  it("switches to environment-scoped hostnames for non-dev environments", () => {
    delete process.env.BFF_BASE_URL;
    process.env.LOTUS_ENVIRONMENT = "uat";

    expect(resolveGatewayBaseUrl()).toBe("https://gateway.uat.lotus");
  });

  it("uses the proxy path for client-side requests", () => {
    expect(resolveBffProxyBaseUrl()).toBe("/api/bff");
    expect(resolveWorkbenchApiBase("client")).toBe("/api/bff/api/v1");
  });
});
