import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const TYPOGRAPHY_TOKEN_DECLARATION =
  /^\s*(--(?:type-[a-z0-9-]+|text-(?:2xs|xs|sm|md|lg|xl|2xl|3xl)|leading-(?:tight|snug|body)|tracking-(?:label|micro|table|badge|tight))):/gim;

function collectCssFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectCssFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".css") ? [entryPath] : [];
  });
}

describe("typography token authority", () => {
  it("keeps semantic typography custom-property declarations in the canonical token layer", () => {
    const stylesRoot = path.resolve(__dirname, "../../src/styles");
    const canonicalTokenPath = path.resolve(stylesRoot, "global/tokens.css");
    const duplicateDeclarations = collectCssFiles(stylesRoot)
      .filter((filePath) => filePath !== canonicalTokenPath)
      .flatMap((filePath) => {
        const css = fs.readFileSync(filePath, "utf8");
        return Array.from(css.matchAll(TYPOGRAPHY_TOKEN_DECLARATION), (match) => ({
          file: path.relative(stylesRoot, filePath).replaceAll("\\", "/"),
          token: match[1],
        }));
      });

    expect(duplicateDeclarations).toEqual([]);
  });

  it("keeps shared text primitives outside legacy page-level overrides", () => {
    const legacyCss = fs.readFileSync(
      path.resolve(__dirname, "../../src/styles/global/legacy-global.css"),
      "utf8"
    );

    expect(legacyCss).not.toMatch(/\.app-page-shell\s+\.ui-text-/);
  });
});
