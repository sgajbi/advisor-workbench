import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

type RiskArchitecturePattern = {
  pattern: string;
  reason: string;
};

type RiskArchitectureModule = {
  RISK_ARCHITECTURE_FORBIDDEN_PATTERNS: ReadonlyArray<RiskArchitecturePattern>;
  findRiskArchitectureViolations: (options: {
    repoRoot: string;
    sourceRoot: string;
  }) => Array<RiskArchitecturePattern & { file: string }>;
};

const riskArchitectureModulePromise =
  // @ts-expect-error The repository quality gate is a Node .mjs script without a TypeScript declaration.
  import("../../scripts/quality/check-risk-architecture.mjs") as Promise<RiskArchitectureModule>;

const repoRoot = path.resolve(__dirname, "..", "..");
describe("RFC-0022 risk workspace architecture guard", () => {
  it("finds every forbidden risk boundary in a bounded source fixture", async () => {
    const {
      findRiskArchitectureViolations,
      RISK_ARCHITECTURE_FORBIDDEN_PATTERNS,
    } = await riskArchitectureModulePromise;
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "lotus-risk-architecture-"));
    const fixtureSourceRoot = path.join(fixtureRoot, "src");
    const nestedSourceRoot = path.join(fixtureSourceRoot, "nested");

    try {
      fs.mkdirSync(nestedSourceRoot, { recursive: true });
      RISK_ARCHITECTURE_FORBIDDEN_PATTERNS.forEach(({ pattern }, index) => {
        fs.writeFileSync(
          path.join(nestedSourceRoot, `violation-${index}.ts`),
          `export const forbidden = ${JSON.stringify(pattern)};\n`,
          "utf8",
        );
      });
      fs.writeFileSync(
        path.join(fixtureSourceRoot, "ignored.md"),
        RISK_ARCHITECTURE_FORBIDDEN_PATTERNS.map(({ pattern }) => pattern).join("\n"),
        "utf8",
      );

      expect(
        findRiskArchitectureViolations({
          repoRoot: fixtureRoot,
          sourceRoot: fixtureSourceRoot,
        }),
      ).toEqual(
        RISK_ARCHITECTURE_FORBIDDEN_PATTERNS.map(({ pattern, reason }, index) => ({
          file: `src/nested/violation-${index}.ts`,
          pattern,
          reason,
        })),
      );
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("runs the repository-wide boundary scan in the sequential lint gate", () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["lint:risk-architecture"]).toBe(
      "node scripts/quality/check-risk-architecture.mjs",
    );
    expect(packageJson.scripts.lint).toContain("npm run lint:risk-architecture");
  });

  it("keeps the legacy workbench analytics contract free of removed risk proxy fields", () => {
    const typesPath = path.join(repoRoot, "src/features/workbench/types.ts");
    const typesContents = fs.readFileSync(typesPath, "utf8");
    const workbenchAnalyticsStart = typesContents.indexOf("export type WorkbenchAnalytics = {");
    const nextTypeStart = typesContents.indexOf("export type PerformanceComparativeSummary = {");
    const analyticsBlock = typesContents.slice(workbenchAnalyticsStart, nextTypeStart);

    const pagePath = path.join(repoRoot, "src/app/workbench/[portfolioId]/page.tsx");
    const pageContents = fs.readFileSync(pagePath, "utf8");

    const violations = [
      analyticsBlock.includes("risk_proxy")
        ? {
            file: "src/features/workbench/types.ts",
            pattern: "risk_proxy",
            reason: "Legacy workbench analytics should not depend on the removed risk proxy field.",
          }
        : null,
      pageContents.includes("risk_proxy")
        ? {
            file: "src/app/workbench/[portfolioId]/page.tsx",
            pattern: "risk_proxy",
            reason: "The legacy workbench page should not read removed risk proxy fields.",
          }
        : null,
    ].filter((value): value is { file: string; pattern: string; reason: string } => value !== null);

    expect(violations).toEqual([]);
  });
});
