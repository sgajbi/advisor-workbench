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
    expect(packageJson.scripts["test:e2e:portfolio:income-activity"]).toContain(
      "run-portfolio-smoke-scenario.mjs income-activity",
    );
    expect(packageJson.scripts["test:e2e:portfolio:unavailable"]).toContain(
      "run-portfolio-smoke-scenario.mjs shell-unavailable",
    );
    expect(packageJson.scripts["test:e2e:portfolio:review-matrix"]).toContain(
      "run-portfolio-smoke-scenario.mjs review-matrix",
    );
    expect(
      packageJson.scripts["test:e2e:portfolio:review-context-typography"],
    ).toContain("run-portfolio-smoke-scenario.mjs review-context-states");
    expect(packageJson.scripts["test:e2e:portfolio:positions-status"]).toContain(
      "run-portfolio-smoke-scenario.mjs positions-status",
    );
    expect(packageJson.scripts["test:e2e:portfolio:transactions-status"]).toContain(
      "run-portfolio-smoke-scenario.mjs transactions-status",
    );
    expect(packageJson.scripts["test:e2e:portfolio:transaction-navigation"]).toContain(
      "run-portfolio-smoke-scenario.mjs transaction-navigation",
    );
    expect(packageJson.scripts["test:e2e:portfolio:allocation-recovery"]).toContain(
      "run-portfolio-smoke-scenario.mjs allocation-recovery",
    );
  });

  it("delegates Portfolio selection to the shared governed runner", () => {
    expect(source).toContain('familyName: "portfolio"');
    expect(source).toContain("scenarioName: process.argv[2]");
    expect(source).toContain("arguments_: process.argv.slice(3)");
    expect(source).not.toContain("--grep");
  });
});
