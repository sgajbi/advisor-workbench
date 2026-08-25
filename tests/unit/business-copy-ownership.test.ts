import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = join(repositoryRoot, "src");

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectSourceFiles(absolutePath);
    }
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe("business copy ownership", () => {
  it("keeps shared state and reason copy out of feature view-model imports", () => {
    const forbiddenImport =
      /import\s+\{[^}]*(?:businessStateLabel|formatBusinessReason)[^}]*\}\s+from\s+["'][^"']*manage-workspace-view-model["']/;
    const violations = collectSourceFiles(sourceRoot)
      .filter((filePath) => forbiddenImport.test(readFileSync(filePath, "utf8")))
      .map((filePath) => relative(repositoryRoot, filePath).replaceAll("\\", "/"));

    expect(violations).toEqual([]);
  });

  it("does not re-export shared copy from the Manage view model", () => {
    const manageViewModel = readFileSync(
      join(
        sourceRoot,
        "features",
        "workbench",
        "manage-workspace-view-model.ts",
      ),
      "utf8",
    );

    expect(manageViewModel).not.toMatch(
      /export\s+\{[^}]*(?:businessStateLabel|formatBusinessReason)/,
    );
  });
});
