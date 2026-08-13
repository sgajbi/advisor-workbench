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
    expect(source).toContain(
      'new Set(["populated", "unavailable", "refresh-integrity"])',
    );
    expect(source).toContain("BFF_BASE_URL: `http://127.0.0.1:${fixturePort}`");
    expect(source).not.toContain("BFF_BASE_URL: `http://gateway.dev.lotus:${fixturePort}`");
    expect(source).toContain('WORKBENCH_E2E_FIXTURE_GATEWAY: "performance"');
    expect(source).toContain("spawn(");
    expect(source).toContain('shell: false');
    expect(source).toContain('child.kill(signal)');
  });

  it("admits the deterministic refresh-integrity scenario", () => {
    expect(source).toContain('"refresh-integrity"');
    expect(source).toContain(
      'Performance smoke scenario must be populated, unavailable, or refresh-integrity.',
    );
  });
});
