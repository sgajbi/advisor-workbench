import { describe, expect, it } from "vitest";

import { assessWorkbenchReadiness } from "@/features/platform-runtime/workbench-health";

describe("Workbench runtime health", () => {
  it("keeps local development ready without making a production certification claim", () => {
    expect(assessWorkbenchReadiness({ LOTUS_ENVIRONMENT: "dev" })).toEqual({
      status: "ready",
      service: "lotus-workbench",
      environment: "dev",
      deployment_id: "local-development",
      build_deployment_id: "local-development",
      gateway_origin: "http://gateway.dev.lotus",
      gateway_timeout_ms: 15_000,
      certification_posture: "local_non_certifying",
      failures: [],
    });
  });

  it("requires a valid deployment identity outside development", () => {
    const missing = assessWorkbenchReadiness({ LOTUS_ENVIRONMENT: "prod" });
    const malformed = assessWorkbenchReadiness({
      LOTUS_ENVIRONMENT: "uat",
      WORKBENCH_DEPLOYMENT_ID: "invalid deployment id",
    });

    expect(missing).toMatchObject({
      status: "not_ready",
      certification_posture: "not_ready",
      failures: [
        "deployment_identity_required",
        "build_deployment_identity_required",
      ],
    });
    expect(malformed.failures).toContain("deployment_identity_invalid");
  });

  it("accepts a bounded production configuration without probing a dependency", () => {
    expect(
      assessWorkbenchReadiness({
        LOTUS_ENVIRONMENT: "prod",
        WORKBENCH_DEPLOYMENT_ID: "main-6f3b8575",
        WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS: "20000",
      }, "main-6f3b8575"),
    ).toMatchObject({
      status: "ready",
      environment: "prod",
      deployment_id: "main-6f3b8575",
      build_deployment_id: "main-6f3b8575",
      gateway_origin: "https://gateway.lotus",
      gateway_timeout_ms: 20_000,
      certification_posture: "configuration_valid_non_certifying",
      failures: [],
    });
  });

  it("rejects runtime identity that differs from the immutable build", () => {
    expect(
      assessWorkbenchReadiness(
        {
          LOTUS_ENVIRONMENT: "prod",
          WORKBENCH_DEPLOYMENT_ID: "main-runtime-2",
        },
        "main-build-1",
      ),
    ).toMatchObject({
      status: "not_ready",
      deployment_id: "main-runtime-2",
      build_deployment_id: "main-build-1",
      failures: ["deployment_identity_mismatch"],
    });
  });

  it("fails readiness for invalid Gateway addressing or timeout policy", () => {
    const readiness = assessWorkbenchReadiness(
      {
        LOTUS_ENVIRONMENT: "uat",
        BFF_BASE_URL: "http://localhost:8000",
        WORKBENCH_DEPLOYMENT_ID: "uat-20260810.1",
        WORKBENCH_GATEWAY_REQUEST_TIMEOUT_MS: "unbounded",
      },
      "uat-20260810.1",
    );

    expect(readiness.status).toBe("not_ready");
    expect(readiness.failures).toEqual([
      "gateway_configuration_invalid",
      "gateway_timeout_configuration_invalid",
    ]);
  });
});
