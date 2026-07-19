import { afterEach, describe, expect, it } from "vitest";

import {
  resolveBffProxyBaseUrl,
  resolveGatewayBaseUrl,
  resolveWorkbenchApiBase,
} from "@/features/platform-runtime/service-addressing";

describe("service addressing", () => {
  const originalBffBaseUrl = process.env.BFF_BASE_URL;
  const originalEnvironment = process.env.LOTUS_ENVIRONMENT;
  const originalFixtureGateway = process.env.WORKBENCH_E2E_FIXTURE_GATEWAY;
  const originalFixtureScenario = process.env.PERFORMANCE_E2E_FIXTURE;
  const originalFixturePort = process.env.PERFORMANCE_E2E_FIXTURE_PORT;

  afterEach(() => {
    process.env.BFF_BASE_URL = originalBffBaseUrl;
    process.env.LOTUS_ENVIRONMENT = originalEnvironment;
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY = originalFixtureGateway;
    process.env.PERFORMANCE_E2E_FIXTURE = originalFixtureScenario;
    process.env.PERFORMANCE_E2E_FIXTURE_PORT = originalFixturePort;
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

  it("rejects local loopback BFF overrides", () => {
    process.env.BFF_BASE_URL = "http://127.0.0.1:8000/";

    expect(() => resolveGatewayBaseUrl()).toThrow(
      "BFF_BASE_URL must use a canonical Lotus hostname, not local loopback"
    );
  });

  it("allows only the exact process-owned Performance fixture loopback", () => {
    process.env.BFF_BASE_URL = "http://127.0.0.1:18100/";
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY = "performance";
    process.env.PERFORMANCE_E2E_FIXTURE = "populated";
    process.env.PERFORMANCE_E2E_FIXTURE_PORT = "18100";

    expect(resolveGatewayBaseUrl()).toBe("http://127.0.0.1:18100");
  });

  it("rejects a loopback fixture URL whose port is not owned by the scenario", () => {
    process.env.BFF_BASE_URL = "http://127.0.0.1:18101/";
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY = "performance";
    process.env.PERFORMANCE_E2E_FIXTURE = "unavailable";
    process.env.PERFORMANCE_E2E_FIXTURE_PORT = "18100";

    expect(() => resolveGatewayBaseUrl()).toThrow(
      "BFF_BASE_URL must use a canonical Lotus hostname, not local loopback"
    );
  });

  it("uses the proxy path for client-side requests", () => {
    expect(resolveBffProxyBaseUrl()).toBe("/api/bff");
    expect(resolveWorkbenchApiBase("client")).toBe("/api/bff/api/v1");
  });
});
