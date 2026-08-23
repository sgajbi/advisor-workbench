import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const TYPOGRAPHY_TOKEN_DECLARATION =
  /^\s*(--(?:type-[a-z0-9-]+|text-(?:2xs|xs|sm|md|lg|xl|2xl|3xl)|leading-(?:tight|snug|body)|tracking-(?:label|micro|table|badge|tight))):/gim;

const MIGRATED_PRODUCTIVE_SURFACES = [
  "src/apps/portfolio/modules/portfolio-health/portfolio-health-strip.module.css",
  "src/design-system/components/workbench-record-selector.module.css",
  "src/features/proposals/components/proposal-builder-workflow-rail.module.css",
  "src/features/proposals/components/proposal-simulate-form.module.css",
] as const;

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

  it("keeps the migrated record selector on semantic typography roles", () => {
    const selectorCss = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/design-system/components/workbench-record-selector.module.css"
      ),
      "utf8"
    );

    expect(selectorCss).not.toMatch(/font-size:\s*(?:11px|0\.6875rem)/);
    expect(selectorCss).not.toMatch(/font-weight:\s*(?:650|700|800)/);
    expect(selectorCss).not.toContain("text-transform: uppercase");
  });

  it.each(MIGRATED_PRODUCTIVE_SURFACES)(
    "rejects raw type sizes and inflated emphasis in %s",
    (relativePath) => {
      const css = fs.readFileSync(
        path.resolve(__dirname, `../../${relativePath}`),
        "utf8"
      );

      expect(css).not.toMatch(/font-size:\s*\d+(?:\.\d+)?(?:px|rem)/);
      expect(css).not.toMatch(/font-weight:\s*(?:650|675|700|720|735|750|760|800)/);
      expect(css).not.toContain("text-transform: uppercase");
    }
  );

  it("keeps Proposal Builder financial summary values indivisible", () => {
    const proposalCss = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/features/proposals/components/proposal-simulate-form.module.css"
      ),
      "utf8"
    );

    expect(proposalCss).toMatch(
      /\.summaryStrip strong,[\s\S]*?\.impactSummaryGrid strong\s*\{[\s\S]*?white-space:\s*nowrap;/
    );
  });

  it("keeps the Portfolio health strip dense without six-column currency collisions", () => {
    const healthStripCss = fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/apps/portfolio/modules/portfolio-health/portfolio-health-strip.module.css"
      ),
      "utf8"
    );

    expect(healthStripCss).toContain(
      "grid-template-columns: repeat(3, minmax(0, 1fr));"
    );
    expect(healthStripCss).not.toContain(
      "grid-template-columns: repeat(6, minmax(0, 1fr));"
    );
  });
});
