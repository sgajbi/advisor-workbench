import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatShareOfPortfolioValue,
  PORTFOLIO_VALUE_LABEL,
} from "../../src/apps/portfolio/portfolio-terminology";

const PORTFOLIO_SOURCE_ROOT = join(process.cwd(), "src", "apps", "portfolio");
const FORBIDDEN_PORTFOLIO_AUM_COPY =
  /\bAUM\b|assets under management|PORTFOLIO_AUM_UNAVAILABLE|assets_under_management_base/i;
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

function stripAllowedBoundaryReferences(
  relativePath: string,
  source: string,
): string {
  const boundaryReferences =
    ALLOWED_BOUNDARY_REFERENCES[
      relativePath as keyof typeof ALLOWED_BOUNDARY_REFERENCES
    ] ?? [];

  return boundaryReferences.reduce((remainingSource, { snippet, count }) => {
    expect(
      remainingSource.split(snippet).length - 1,
      `${relativePath}: ${snippet}`,
    ).toBe(count);
    return remainingSource.replaceAll(snippet, "");
  }, source);
}

describe("portfolio terminology", () => {
  it("uses one selected-portfolio value term and allocation-share phrase", () => {
    expect(PORTFOLIO_VALUE_LABEL).toBe("Portfolio value");
    expect(formatShareOfPortfolioValue("92.00%")).toBe(
      "92.00% of portfolio value",
    );
  });

  it.each([
    "Total AUM",
    "Assets under management",
    "PORTFOLIO_AUM_UNAVAILABLE",
    "assets_under_management_base",
  ])("detects forbidden portfolio copy or leaked contract identifier: %s", (copy) => {
    expect(copy).toMatch(FORBIDDEN_PORTFOLIO_AUM_COPY);
  });

  it("permits legacy identifiers only in their exact source-boundary syntax", () => {
    expect(
      stripAllowedBoundaryReferences(
        "api.ts",
        [
          "assets_under_management_base: number;",
          "assets_under_management_base: number;",
          "summary.assets_under_management_base",
          "payload.summary.assets_under_management_base",
        ].join("\n"),
      ),
    ).not.toMatch(FORBIDDEN_PORTFOLIO_AUM_COPY);
    expect(
      stripAllowedBoundaryReferences(
        "workspace-config.ts",
        'case "PORTFOLIO_AUM_UNAVAILABLE":',
      ),
    ).not.toMatch(FORBIDDEN_PORTFOLIO_AUM_COPY);
  });

  it("reserves AUM language for source contract identifiers, not portfolio UI copy", () => {
    for (const filePath of portfolioSourceFiles(PORTFOLIO_SOURCE_ROOT)) {
      const relativePath = relative(PORTFOLIO_SOURCE_ROOT, filePath).replaceAll(
        "\\",
        "/",
      );
      const sourceWithoutContractIdentifiers = stripAllowedBoundaryReferences(
        relativePath,
        readFileSync(filePath, "utf8"),
      );

      expect(sourceWithoutContractIdentifiers, filePath).not.toMatch(
        FORBIDDEN_PORTFOLIO_AUM_COPY,
      );
    }
  });
});
