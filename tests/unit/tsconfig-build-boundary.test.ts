import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

type TypeScriptConfig = {
  compilerOptions?: {
    incremental?: boolean;
    tsBuildInfoFile?: string;
  };
  include?: string[];
  exclude?: string[];
};

describe("TypeScript build boundary", () => {
  it("keeps generated local evidence outside production typecheck scope", () => {
    const config = readTypeScriptConfig();

    expect(config.include).toEqual(
      expect.arrayContaining(["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]),
    );
    expect(config.exclude).toEqual(
      expect.arrayContaining(["node_modules", "coverage", "output", "playwright-report", "test-results"]),
    );
    expect(config.compilerOptions).toMatchObject({
      incremental: true,
      tsBuildInfoFile: ".next/cache/tsconfig.tsbuildinfo",
    });
  });
});

function readTypeScriptConfig(): TypeScriptConfig {
  const configPath = path.join(process.cwd(), "tsconfig.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as TypeScriptConfig;
}
