import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Report Centre smoke scenario runner", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/run-report-centre-smoke-scenario.mjs"),
    "utf8",
  );

  it("owns an exact bounded loopback fixture and reporting authority", () => {
    expect(source).toContain('WORKBENCH_E2E_FIXTURE_GATEWAY: "report-centre"');
    expect(source).toContain('REPORT_CENTRE_E2E_FIXTURE: "state-matrix"');
    expect(source).toContain('WORKBENCH_REPORTING_AUTH_MODE: "development_configured"');
    expect(source).toContain("WORKBENCH_REPORTING_CALLER_PORTFOLIO_IDS");
  });

  it("runs only the governed Report Centre browser spec", () => {
    expect(source).toContain('"tests/e2e/report-centre-state.smoke.spec.ts"');
    expect(source).toContain("REPORT_CENTRE_E2E_FIXTURE_PORT must be an unprivileged TCP port");
  });
});
