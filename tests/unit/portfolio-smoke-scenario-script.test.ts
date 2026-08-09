import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("Portfolio smoke scenario runner", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/run-portfolio-smoke-scenario.mjs"),
    "utf8",
  );
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  it("publishes the repo-native cashflow proof command", () => {
    expect(packageJson.scripts["test:e2e:portfolio:cashflow"]).toContain(
      "run-portfolio-smoke-scenario.mjs cashflow",
    );
  });

  it("binds the BFF to the exact owned Portfolio fixture without a shell", () => {
    expect(source).toContain("scenario !== 'cashflow'");
    expect(source).toContain("BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`");
    expect(source).toContain("WORKBENCH_E2E_FIXTURE_GATEWAY: 'portfolio'");
    expect(source).toContain("PORTFOLIO_E2E_FIXTURE: scenario");
    expect(source).toContain("PORTFOLIO_E2E_FIXTURE_PORT: String(fixturePort)");
    expect(source).toContain("PLAYWRIGHT_PORT: String(workbenchPort)");
    expect(source).toContain("process.env.PORTFOLIO_E2E_WORKBENCH_PORT ?? process.env.PLAYWRIGHT_PORT ?? '31020'");
    expect(source).toContain("fixturePort === workbenchPort");
    expect(source).toContain("PORTFOLIO_E2E_EVIDENCE_DIR: evidenceDirectory");
    expect(source).toContain("mkdirSync(evidenceDirectory, { recursive: true })");
    expect(source).toContain("spawn(");
    expect(source).toContain("shell: false");
    expect(source).toContain("child.kill(signal)");
  });

  it("runs only the governed cashflow browser scenario", () => {
    expect(source).toContain("'tests/e2e/portfolio-workbench.smoke.spec.ts'");
    expect(source).toContain(
      "'cashflow route keeps projection identity and movement semantics explicit'",
    );
    expect(source).toContain("parseUnprivilegedPort(");
    expect(source).toContain("'PORTFOLIO_E2E_FIXTURE_PORT'");
    expect(source).toContain("'PORTFOLIO_E2E_WORKBENCH_PORT'");
    expect(source).toContain("`${name} must be an unprivileged TCP port.`");
  });
});
