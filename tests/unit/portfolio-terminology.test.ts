import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatShareOfPortfolioValue,
  PORTFOLIO_VALUE_LABEL,
} from "../../src/apps/portfolio/portfolio-terminology";

const PORTFOLIO_SOURCE_ROOT = join(process.cwd(), "src", "apps", "portfolio");
const ALLOWED_BOUNDARY_REFERENCES = {
  "api.ts": [
    { snippet: "assets_under_management_base: number;", count: 2 },
    { snippet: ".assets_under_management_base", count: 2 },
  ],
  "workspace-config.ts": [
    { snippet: 'case "PORTFOLIO_AUM_UNAVAILABLE":', count: 1 },
  ],
} as const;

function portfolioSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      return portfolioSourceFiles(absolutePath);
    }
    return /\.(?:ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe("portfolio terminology", () => {
  it("uses one selected-portfolio value term and allocation-share phrase", () => {
    expect(PORTFOLIO_VALUE_LABEL).toBe("Portfolio value");
    expect(formatShareOfPortfolioValue("92.00%")).toBe(
      "92.00% of portfolio value",
    );
  });

  it("reserves AUM language for source contract identifiers, not portfolio UI copy", () => {
    for (const filePath of portfolioSourceFiles(PORTFOLIO_SOURCE_ROOT)) {
      const relativePath = relative(PORTFOLIO_SOURCE_ROOT, filePath).replaceAll(
        "\\",
        "/",
      );
      const boundaryReferences =
        ALLOWED_BOUNDARY_REFERENCES[
          relativePath as keyof typeof ALLOWED_BOUNDARY_REFERENCES
        ] ?? [];
      const sourceWithoutContractIdentifiers = boundaryReferences.reduce(
        (source, { snippet, count }) => {
          expect(source.split(snippet).length - 1, `${relativePath}: ${snippet}`).toBe(
            count,
          );
          return source.replaceAll(snippet, "");
        },
        readFileSync(filePath, "utf8"),
      );

      expect(sourceWithoutContractIdentifiers, filePath).not.toMatch(
        /\bAUM\b|assets under management/i,
      );
    }
  });
});
