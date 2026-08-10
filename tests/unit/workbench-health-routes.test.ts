import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getLiveness } from "@/app/api/health/live/route";
import { GET as getReadiness } from "@/app/api/health/ready/route";

describe("Workbench health routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("exposes a non-cacheable process liveness response", async () => {
    const response = getLiveness();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "live",
      service: "lotus-workbench",
    });
  });

  it("exposes non-cacheable readiness without contacting Gateway", async () => {
    vi.stubEnv("LOTUS_ENVIRONMENT", "dev");
    vi.stubEnv("BFF_BASE_URL", "");
    vi.stubEnv("WORKBENCH_DEPLOYMENT_ID", "");
    vi.stubEnv("WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS", "");
    const response = getReadiness();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({
      status: "ready",
      service: "lotus-workbench",
      environment: "dev",
      certification_posture: "local_non_certifying",
    });
  });
});
