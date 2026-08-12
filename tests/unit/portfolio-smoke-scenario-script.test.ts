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

  it("publishes repo-native portfolio proof commands", () => {
    expect(packageJson.scripts["test:e2e:portfolio:cashflow"]).toContain(
      "run-portfolio-smoke-scenario.mjs cashflow",
    );
    expect(packageJson.scripts["test:e2e:portfolio:unavailable"]).toContain(
      "run-portfolio-smoke-scenario.mjs shell-unavailable",
    );
    expect(packageJson.scripts["test:e2e:portfolio:review-matrix"]).toContain(
      "run-portfolio-smoke-scenario.mjs review-matrix",
    );
    expect(packageJson.scripts["test:e2e:portfolio:positions-status"]).toContain(
      "run-portfolio-smoke-scenario.mjs positions-status",
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

  it("runs only the four governed Portfolio browser scenarios", () => {
    expect(source).toContain("'tests/e2e/portfolio-workbench.smoke.spec.ts'");
    expect(source).toContain(
      "'cashflow route keeps projection identity and movement semantics explicit'",
    );
    expect(source).toContain(
      "'selected shell failure reaches one truthful terminal recovery state'",
    );
    expect(source).toContain(
      "'portfolio review stays decision-focused and keeps detail work on dedicated screens'",
    );
    expect(source).toContain(
      "'positions keep source status truthful across screen, export, and evidence'",
    );
    expect(source).toContain("scenario !== 'review-matrix'");
    expect(source).toContain("scenario !== 'shell-unavailable'");
    expect(source).toContain("scenario !== 'positions-status'");
    expect(source).toContain("parseUnprivilegedPort(");
    expect(source).toContain("'PORTFOLIO_E2E_FIXTURE_PORT'");
    expect(source).toContain("'PORTFOLIO_E2E_WORKBENCH_PORT'");
    expect(source).toContain("`${name} must be an unprivileged TCP port.`");
  });
});
