import { readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const SOURCE_ROOT = resolve(process.cwd(), "src");
const DATE_PRESENTATION_AUTHORITY = resolve(
  SOURCE_ROOT,
  "design-system/utils/financial-formatters.ts",
);

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return collectTypeScriptFiles(entryPath);
    }
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("date presentation authority", () => {
  it("keeps locale and timezone rendering in the governed design-system formatter", () => {
    const competingFormatters = collectTypeScriptFiles(SOURCE_ROOT)
      .filter((filePath) => filePath !== DATE_PRESENTATION_AUTHORITY)
      .flatMap((filePath) => {
        const source = readFileSync(filePath, "utf8");
        return source.includes("new Intl.DateTimeFormat") || source.includes(".toLocaleDateString(")
          ? [relative(process.cwd(), filePath).replaceAll("\\", "/")]
          : [];
      });

    expect(competingFormatters).toEqual([]);
  });
});
