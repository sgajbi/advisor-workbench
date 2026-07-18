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

  it("uses canonical Gateway addressing and a directly owned Playwright child", () => {
    expect(source).toContain('new Set(["populated", "unavailable"])');
    expect(source).toContain("BFF_BASE_URL: `http://gateway.dev.lotus:${fixturePort}`");
    expect(source).toContain("spawn(");
    expect(source).toContain('shell: false');
    expect(source).toContain('child.kill(signal)');
  });
});
