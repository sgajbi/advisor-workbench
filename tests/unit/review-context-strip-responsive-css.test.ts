import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Review Context responsive composition", () => {
  const css = readFileSync(
    path.join(
      process.cwd(),
      "src/design-system/components/review-context-strip.module.css",
    ),
    "utf8",
  );

  it("keeps support details beside the portfolio when a context notice adds a row", () => {
    expect(css).toMatch(
      /\.supportDetails\s*\{[\s\S]*?grid-column: 4;[\s\S]*?grid-row: 1;/,
    );
    expect(css).toMatch(
      /\.notice\s*\{[\s\S]*?grid-column: 1 \/ -1;/,
    );
  });
});
