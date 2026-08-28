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
      /\.decisionWorkspace :global\(\[data-workbench-record-selector\]\)\s*\{[\s\S]*?max-height: 25rem;[\s\S]*?overflow-y: auto;/,
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
    expect(workspaceCss).not.toContain("manage-context-rail");
    expect(workspaceCss).not.toContain("manage-rail-actions");
    expect(workspaceCss).not.toContain("manage-evidence-rail");
  });

  it("keeps review-evidence rail styles locally owned without global escapes", () => {
    const evidenceRailCss = readFileSync(
      path.join(
        process.cwd(),
        "src/features/workbench/components/manage-evidence-rail.module.css",
      ),
      "utf8",
    );

    expect(evidenceRailCss).toMatch(/\.rail\s*\{[\s\S]*?display: grid;/);
    expect(evidenceRailCss).toMatch(/\.headline\s*\{[\s\S]*?font-weight: 700;/);
    expect(evidenceRailCss).toMatch(/\.definitionList\s*\{[\s\S]*?margin-top: 10px;/);
    expect(evidenceRailCss).not.toContain(":global(");
  });
});
