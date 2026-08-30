import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BANKED_FUNCTION_FLOOR = 93.29;

function readThreshold(source: string, name: string): number {
  const match = source.match(new RegExp(`\\b${name}:\\s*(?<value>\\d+(?:\\.\\d+)?)`, "u"));
  if (!match?.groups?.value) {
    throw new Error(`Coverage threshold ${name} is not declared.`);
  }
  return Number(match.groups.value);
}

describe("advisor-surface coverage ratchet", () => {
  it("keeps every global threshold at or above its banked exact-main floor", () => {
    const config = readFileSync(resolve("vitest.config.ts"), "utf8");

    expect(readThreshold(config, "functions")).toBeGreaterThanOrEqual(
      BANKED_FUNCTION_FLOOR,
    );
    expect(readThreshold(config, "lines")).toBeGreaterThanOrEqual(86);
    expect(readThreshold(config, "statements")).toBeGreaterThanOrEqual(86);
    expect(readThreshold(config, "branches")).toBeGreaterThanOrEqual(74);
  });

  it("keeps application source in the global V8 measurement without new test exclusions", () => {
    const config = readFileSync(resolve("vitest.config.ts"), "utf8");

    expect(config).toContain('provider: "v8"');
    for (const sourceRoot of ["src/apps", "src/design-system", "src/features", "src/shell", "src/app"]) {
      expect(config).toContain(`"${sourceRoot}/**/*.ts"`);
      expect(config).toContain(`"${sourceRoot}/**/*.tsx"`);
    }
    expect(config).not.toMatch(/coverage[\s\S]*exclude:[\s\S]*src\//u);
  });
});
