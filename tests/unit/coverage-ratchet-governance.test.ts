import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BANKED_FUNCTION_FLOOR = 93.29;
const APPROVED_COVERAGE_EXCLUSIONS = [
  "tests/**",
  "**/*.d.ts",
  "**/*.config.*",
  ".next/**",
  "coverage/**",
  "node_modules/**",
] as const;

function readThreshold(source: string, name: string): number {
  const match = source.match(new RegExp(`\\b${name}:\\s*(?<value>\\d+(?:\\.\\d+)?)`, "u"));
  if (!match?.groups?.value) {
    throw new Error(`Coverage threshold ${name} is not declared.`);
  }
  return Number(match.groups.value);
}

function readStringArray(source: string, name: string): string[] {
  const match = source.match(
    new RegExp(`\\b${name}:\\s*\\[(?<entries>[^\\]]*)\\]`, "u"),
  );
  const entries = match?.groups?.entries;
  if (entries === undefined) {
    throw new Error(`Coverage ${name} is not declared as an inline array.`);
  }
  const literals = [...entries.matchAll(/"(?<value>(?:\\.|[^"\\])*)"/gu)];
  const unexplainedSyntax = entries
    .replace(/"(?:\\.|[^"\\])*"/gu, "")
    .replace(/[\s,]/gu, "");
  if (unexplainedSyntax.length > 0) {
    throw new Error(`Coverage ${name} contains non-literal entries.`);
  }
  return literals.map(({ groups }) => JSON.parse(`"${groups?.value ?? ""}"`) as string);
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
    expect(readStringArray(config, "exclude")).toEqual(APPROVED_COVERAGE_EXCLUSIONS);
    for (const sourceRoot of ["src/apps", "src/design-system", "src/features", "src/shell", "src/app"]) {
      expect(config).toContain(`"${sourceRoot}/**/*.ts"`);
      expect(config).toContain(`"${sourceRoot}/**/*.tsx"`);
    }
  });
});
