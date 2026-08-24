import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(__dirname, "../..");
const HYDRATION_SENSITIVE_RELATIONSHIP_OWNERS = [
  "src/apps/portfolio/components/portfolio-screen-rail.tsx",
  "src/apps/portfolio/components/portfolio-screen-rail-navigation.tsx",
  "src/design-system/components/workbench-worklist.tsx",
] as const;

function readRepositoryFile(relativePath: string) {
  return readFileSync(join(REPOSITORY_ROOT, ...relativePath.split("/")), "utf8");
}

function collectTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTsxFiles(entryPath);
    }
    return entry.isFile() && entry.name.endsWith(".tsx") ? [entryPath] : [];
  });
}

function collectComponentTags(componentName: string) {
  const tagPattern = new RegExp(`<${componentName}\\b[\\s\\S]*?\\/>`, "g");
  return collectTsxFiles(join(REPOSITORY_ROOT, "src")).flatMap((filePath) =>
    Array.from(readFileSync(filePath, "utf8").matchAll(tagPattern), (match) => ({
      filePath,
      tag: match[0],
    })),
  );
}

describe("hydration relationship authority", () => {
  it.each(HYDRATION_SENSITIVE_RELATIONSHIP_OWNERS)(
    "keeps %s independent of render-path-generated ids",
    (relativePath) => {
      const source = readRepositoryFile(relativePath);

      expect(source).not.toMatch(/\buseId\b/);
      expect(source).not.toContain("suppressHydrationWarning");
    },
  );

  it.each(["PortfolioScreenRail", "WorkbenchWorklist"])(
    "requires explicit relationship ownership at every %s call site",
    (componentName) => {
      const callSites = collectComponentTags(componentName);

      expect(callSites.length).toBeGreaterThan(0);
      expect(
        callSites
          .filter(({ tag }) => !tag.includes("relationshipIdBase="))
          .map(({ filePath }) => filePath.replace(REPOSITORY_ROOT, "")),
      ).toEqual([]);
    },
  );
});
