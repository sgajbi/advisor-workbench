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

  it("binds the BFF to the owned loopback fixture and directly owns Playwright", () => {
    expect(source).toContain('"trend-integrity"');
    expect(source).toContain("BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`");
    expect(source).not.toContain("BFF_BASE_URL: `http://gateway.dev.lotus:${fixturePort}`");
    expect(source).toContain('WORKBENCH_E2E_FIXTURE_GATEWAY: "performance"');
    expect(source).toContain("PLAYWRIGHT_PORT: String(workbenchPort)");
    expect(source).toContain(
      'process.env.PERFORMANCE_E2E_WORKBENCH_PORT ?? process.env.PLAYWRIGHT_PORT ?? "31030"',
    );
    expect(source).toContain("spawn(");
    expect(source).toContain('shell: false');
    expect(source).toContain('child.kill(signal)');
  });

  it("admits the deterministic source-integrity scenarios", () => {
    expect(source).toContain('"refresh-integrity"');
    expect(source).toContain('"horizon-integrity"');
    expect(source).toContain('"analysis-controls"');
    expect(source).toContain('"unknown-period"');
    expect(source).toContain(
      'Performance smoke scenario must be populated, unavailable, refresh-integrity, trend-integrity, horizon-integrity, analysis-controls, or unknown-period.',
    );
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
