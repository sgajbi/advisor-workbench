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
});
