import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { resolveReportCentreFixtureScenario } from "../e2e/report-centre-fixture-scenario";

describe("Report Centre smoke scenario runner", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/run-report-centre-smoke-scenario.mjs"),
    "utf8",
  );
  const registry = JSON.parse(
    readFileSync(
      resolve(process.cwd(), "scripts/testing/e2e-scenario-registry.json"),
      "utf8",
    ),
  ) as {
    families: {
      reports: {
        additional_environment: Record<string, string>;
        scenarios: Record<string, { spec: string }>;
      };
    };
  };

  it("owns an exact bounded loopback fixture and reporting authority", () => {
    expect(source).toContain('familyName: "reports"');
    expect(source).toContain('scenarioName: "state-matrix"');
    expect(registry.families.reports.additional_environment).toMatchObject({
      WORKBENCH_REPORTING_AUTH_MODE: "development_configured",
      WORKBENCH_REPORTING_CALLER_ROLE: "client_advisor",
    });
  });

  it("runs only the governed Report Centre browser spec", () => {
    expect(
      registry.families.reports.scenarios["state-matrix"].spec,
    ).toBe("tests/e2e/report-centre-state.smoke.spec.ts");
    expect(source).not.toContain("--grep");
  });
});

describe("Report Centre fixture scenario authority", () => {
  it("keeps the repository-wide Playwright lane independent of the owned fixture", () => {
    expect(resolveReportCentreFixtureScenario({ CI: "true" })).toEqual({ enabled: false });
  });

  it("enables only the exact process-owned state-matrix gateway", () => {
    expect(
      resolveReportCentreFixtureScenario({
        REPORT_CENTRE_E2E_FIXTURE: "state-matrix",
        REPORT_CENTRE_E2E_FIXTURE_PORT: "18101",
        WORKBENCH_E2E_FIXTURE_GATEWAY: "report-centre",
        BFF_BASE_URL: "http://127.0.0.1:18101",
      }),
    ).toEqual({ enabled: true, port: 18101 });
  });

  it.each([
    ["mismatched BFF port", { BFF_BASE_URL: "http://127.0.0.1:18102" }],
    ["wrong fixture owner", { WORKBENCH_E2E_FIXTURE_GATEWAY: "performance" }],
    ["privileged port", { REPORT_CENTRE_E2E_FIXTURE_PORT: "443", BFF_BASE_URL: "http://127.0.0.1:443" }],
  ])("rejects %s when the state-matrix scenario is requested", (_label, override) => {
    expect(() =>
      resolveReportCentreFixtureScenario({
        REPORT_CENTRE_E2E_FIXTURE: "state-matrix",
        REPORT_CENTRE_E2E_FIXTURE_PORT: "18101",
        WORKBENCH_E2E_FIXTURE_GATEWAY: "report-centre",
        BFF_BASE_URL: "http://127.0.0.1:18101",
        ...override,
      }),
    ).toThrow(/requires the owned gateway/);
  });
});
