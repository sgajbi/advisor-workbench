import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Manage Overview responsive composition", () => {
  const overviewCss = readFileSync(
    path.join(
      process.cwd(),
      "src/features/workbench/components/manage-overview.module.css",
    ),
    "utf8",
  );

  it("reflows compact summary and posture strips without shrinking business text", () => {
    expect(overviewCss).toMatch(
      /\.portfolioSummary\s*\{[\s\S]*?grid-template-columns: minmax\(14rem, 1\.5fr\) repeat\(3, minmax\(8rem, 1fr\)\);/,
    );
    expect(overviewCss).toMatch(
      /\.postureStrip\s*\{[\s\S]*?grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/,
    );
    expect(overviewCss).toMatch(
      /@media \(max-width: 1080px\)[\s\S]*?\.portfolioSummary,[\s\S]*?\.postureStrip\s*\{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
    expect(overviewCss).toMatch(
      /@media \(max-width: 519px\)[\s\S]*?\.portfolioSummary,[\s\S]*?\.postureStrip,[\s\S]*?\.evidenceGrid\s*\{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/,
    );
    expect(overviewCss).not.toContain("font-size: 11px");
  });

  it("keeps financial values intact and decision handoffs keyboard-sized", () => {
    expect(overviewCss).toMatch(
      /\.financialValue\s*\{[\s\S]*?white-space: nowrap;/,
    );
    expect(overviewCss).toMatch(
      /\.actionLink\s*\{[\s\S]*?min-height: 44px;/,
    );
    expect(overviewCss).toMatch(
      /\.decisionWorkspace :global\(\[data-workbench-record-selector\]\)\s*\{[\s\S]*?max-height: 31rem;[\s\S]*?overflow-y: auto;/,
    );
  });

  it("removes the retired duplicate overview card and activity styles", () => {
    const workspaceCss = readFileSync(
      path.join(
        process.cwd(),
        "src/features/workbench/manage-workspace.module.css",
      ),
      "utf8",
    );

    expect(workspaceCss).not.toContain("manage-decision-readiness-card");
    expect(workspaceCss).not.toContain("manage-portfolio-value-band");
    expect(workspaceCss).not.toContain("manage-overview-focus-grid");
    expect(workspaceCss).not.toContain("manage-overview-activity");
    expect(workspaceCss).not.toContain("manage-rebalance-evidence");
  });
});
