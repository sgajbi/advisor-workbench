import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Performance smoke scenario launcher", () => {
  const source = readFileSync(
    resolve(process.cwd(), "scripts/testing/run-performance-smoke-scenario.mjs"),
    "utf8",
  );
  const packageJson = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };

  it("publishes repo-native populated and unavailable proof commands", () => {
    expect(packageJson.scripts["test:e2e:performance:populated"]).toContain(
      "run-performance-smoke-scenario.mjs populated",
    );
    expect(packageJson.scripts["test:e2e:performance:unavailable"]).toContain(
      "run-performance-smoke-scenario.mjs unavailable",
    );
  });

  it("delegates Performance selection to the shared governed runner", () => {
    expect(source).toContain('familyName: "performance"');
    expect(source).toContain("scenarioName: process.argv[2]");
    expect(source).toContain("arguments_: process.argv.slice(3)");
    expect(source).not.toContain("--grep");
  });

  it("admits the deterministic source-integrity scenarios", () => {
    expect(packageJson.scripts["test:e2e:performance:horizon-integrity"]).toContain(
      "run-performance-smoke-scenario.mjs horizon-integrity",
    );
    expect(packageJson.scripts["test:e2e:performance:analysis-controls"]).toContain(
      "run-performance-smoke-scenario.mjs analysis-controls",
    );
    expect(packageJson.scripts["test:e2e:performance:evidence-period-assurance"]).toContain(
      'run-performance-smoke-scenario.mjs unknown-period --grep "fails closed on an unfamiliar source-confirmed period"',
    );
  });

  it("publishes deterministic attribution-history integrity proof", () => {
    expect(packageJson.scripts["test:e2e:performance:trend-integrity"]).toContain(
      'trend-integrity --grep "attribution history failure"',
    );
  });
});
