import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Manage Overview responsive composition", () => {
  it("lets overview grids reflow from their available content width", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src/features/workbench/manage-workspace.module.css",
      ),
      "utf8",
    );

    expect(css).toMatch(
      /\.manageScope :global\(\.manage-decision-readiness-grid\)\s*\{[\s\S]*?grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 14rem\), 1fr\)\);/,
    );
    expect(css).toMatch(
      /\.manageScope :global\(\.manage-portfolio-value-band\)\s*\{[\s\S]*?grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 16rem\), 1fr\)\);/,
    );
    expect(css).toMatch(
      /\.manageScope :global\(\.manage-overview-focus-grid\)\s*\{[\s\S]*?grid-template-columns: repeat\(auto-fit, minmax\(min\(100%, 18rem\), 1fr\)\);/,
    );
    expect(css).not.toContain("minmax(360px, 5fr)");
    expect(css).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.manageScope :global\(\.manage-decision-readiness-grid\),[\s\S]*?\.manageScope :global\(\.manage-portfolio-value-band dl\),[\s\S]*?grid-template-columns: 1fr;/,
    );
  });

  it("keeps task status below its business title at every card width", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src/design-system/components/workbench-task-directory.module.css",
      ),
      "utf8",
    );

    expect(css).toMatch(
      /\.heading\s*\{[\s\S]*?display: grid;[\s\S]*?gap: 0\.2rem;/,
    );
    expect(css).toMatch(
      /\.status\s*\{[\s\S]*?text-align: left;/,
    );
  });
});
