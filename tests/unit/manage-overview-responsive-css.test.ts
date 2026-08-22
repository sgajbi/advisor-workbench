import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Manage Overview responsive composition", () => {
  it("reduces the posture and portfolio grids before they can widen the page", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src/features/workbench/manage-workspace.module.css",
      ),
      "utf8",
    );

    expect(css).toMatch(
      /@media \(max-width: 1200px\)[\s\S]*?\.manageScope :global\(\.manage-decision-readiness-grid\)\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(css).toMatch(
      /@media \(max-width: 720px\)[\s\S]*?\.manageScope :global\(\.manage-decision-readiness-grid\),[\s\S]*?\.manageScope :global\(\.manage-portfolio-value-band dl\),[\s\S]*?grid-template-columns: 1fr;/,
    );
  });

  it("stacks task status below its business title on a narrow card", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src/design-system/components/workbench-task-directory.module.css",
      ),
      "utf8",
    );

    expect(css).toMatch(
      /@media \(max-width: 480px\)[\s\S]*?\.heading\s*\{[\s\S]*?flex-direction: column;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 480px\)[\s\S]*?\.status\s*\{[\s\S]*?text-align: left;/,
    );
  });
});
