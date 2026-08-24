import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  formatShareOfPortfolioValue,
  PORTFOLIO_VALUE_LABEL,
} from "../../src/apps/portfolio/portfolio-terminology";

const PORTFOLIO_SOURCE_ROOT = join(process.cwd(), "src", "apps", "portfolio");
const ALLOWED_SOURCE_CONTRACT_TERMS = [
  "PORTFOLIO_AUM_UNAVAILABLE",
  "assets_under_management_base",
] as const;

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
      const sourceWithoutContractIdentifiers = ALLOWED_SOURCE_CONTRACT_TERMS.reduce(
        (source, identifier) => source.replaceAll(identifier, ""),
        readFileSync(filePath, "utf8"),
      );

      expect(sourceWithoutContractIdentifiers, filePath).not.toMatch(
        /\bAUM\b|assets under management/i,
      );
    }
  });
});
