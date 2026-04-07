import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "..", "..");
const sourceRoot = path.join(repoRoot, "src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"]);

function collectSourceFiles(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

describe("RFC-0022 risk workspace architecture guard", () => {
  it("keeps Workbench risk integration behind Gateway-owned BFF contracts", () => {
    const forbiddenPatterns = [
      {
        pattern: "/analytics/risk/",
        reason: "Workbench must not call lotus-risk analytics routes directly.",
      },
      {
        pattern: "/analytics/workbench/risk-proxy",
        reason: "The old lotus-risk workbench risk-proxy endpoint is removed.",
      },
      {
        pattern: "risk.dev.lotus",
        reason: "Browser/runtime UI code must use the Gateway BFF, not service hostnames.",
      },
    ];

    const violations = collectSourceFiles(sourceRoot).flatMap((filePath) => {
      const contents = fs.readFileSync(filePath, "utf8");
      return forbiddenPatterns
        .filter(({ pattern }) => contents.includes(pattern))
        .map(({ pattern, reason }) => ({
          file: path.relative(repoRoot, filePath).replaceAll(path.sep, "/"),
          pattern,
          reason,
        }));
    });

    expect(violations).toEqual([]);
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
