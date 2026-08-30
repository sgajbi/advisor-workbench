import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const retiredComponentDirectory = path.join(
  repositoryRoot,
  "src/features/workbench/components"
);

const retiredComponentFiles = [
  "advisor-summary-card.tsx",
  "analytics-controls.tsx",
  "decision-readiness-panel.tsx",
  "delta-analytics-panel.tsx",
  "overview-cards.tsx",
  "partial-failure-banner.tsx",
  "performance-snapshot.tsx",
  "positions-grid.tsx",
  "rebalance-status.tsx",
  "reporting-snapshot-panel.tsx",
  "sandbox-controls.tsx",
] as const;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(absolutePath);
    }
    return /\.(?:ts|tsx)$/u.test(entry.name) ? [absolutePath] : [];
  });
}

describe("retired pre-BFF Workbench presentation", () => {
  it("keeps the unreachable component owners deleted", () => {
    for (const fileName of retiredComponentFiles) {
      expect(existsSync(path.join(retiredComponentDirectory, fileName)), fileName).toBe(false);
    }
  });

  it("does not restore fabricated position identifiers in production source", () => {
    const fabricatedPositionIdentifier = /INST_\d{3}/u;
    const offenders = sourceFiles(path.join(repositoryRoot, "src")).filter((filePath) =>
      fabricatedPositionIdentifier.test(readFileSync(filePath, "utf8"))
    );

    expect(offenders).toEqual([]);
  });

  it("keeps the unconsumed sandbox mutation client surface retired", () => {
    const apiSource = readFileSync(
      path.join(repositoryRoot, "src/features/workbench/workbench-core-api.ts"),
      "utf8"
    );
    const typeSource = readFileSync(
      path.join(repositoryRoot, "src/features/workbench/types.ts"),
      "utf8"
    );
    const retiredApiNames = [
      ["create", "SandboxSession"].join(""),
      ["apply", "SandboxChanges"].join(""),
    ];
    const retiredTypeNames = [
      ["Workbench", "SandboxState"].join(""),
      ["Workbench", "PolicyFeedback"].join(""),
    ];

    for (const name of retiredApiNames) {
      expect(apiSource, name).not.toContain(name);
    }
    for (const name of retiredTypeNames) {
      expect(typeSource, name).not.toContain(name);
    }
  });
});
