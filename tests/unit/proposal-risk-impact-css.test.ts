import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("proposal risk and impact responsive composition", () => {
  it("reflows from owned container widths without viewport-coupled breakpoints", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src/features/proposals/components/proposal-risk-impact-workspace.module.css",
      ),
      "utf8",
    );

    expect(css).not.toContain("@media");
    expect(css).toContain("@container risk-workspace");
    expect(css).toContain("@container risk-evidence");
  });

  it("reflows reusable record facts from each item container", () => {
    const css = readFileSync(
      path.join(
        process.cwd(),
        "src/design-system/components/workbench-record-selector.module.css",
      ),
      "utf8",
    );

    expect(css).toContain("@container (max-width: 18rem)");
    expect(css).not.toContain("@media (max-width:");
    expect(css).toMatch(
      /@container \(max-width: 18rem\)[\s\S]*?\.facts\s*\{[\s\S]*?grid-template-columns: 1fr;/,
    );
  });
});
