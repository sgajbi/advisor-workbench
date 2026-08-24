import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { MANAGE_WORKFLOW_LABELS } from "../../src/features/workbench/manage-terminology";

describe("manage terminology", () => {
  it("keeps user work, source records, data presence, and date scope distinct", () => {
    expect(MANAGE_WORKFLOW_LABELS).toEqual({
      portfolioManagementDecisions: "Portfolio management decisions",
      mandateReview: "Mandate review",
      mandateHealth: "Mandate health",
      attentionItems: "Attention items",
      openAttentionItems: "Open attention items",
      sourceExceptions: "Source exceptions",
      dataAvailability: "Data availability",
      mandateHealthDimensions: "Mandate health dimensions",
      asOfDate: "As-of date",
    });
  });

  it("does not retain the superseded heuristic exception queue or its global styles", () => {
    expect(
      existsSync(
        join(
          process.cwd(),
          "src",
          "features",
          "workbench",
          "components",
          "exception-queue.tsx",
        ),
      ),
    ).toBe(false);
    expect(
      readFileSync(
        join(process.cwd(), "src", "styles", "global", "legacy-global.css"),
        "utf8",
      ),
    ).not.toMatch(/\.exception-(?:list|item)\b/);
    expect(
      readFileSync(
        join(
          process.cwd(),
          "docs",
          "rfcs",
          "RFC-0013-workbench-exception-queue-and-advisor-summary.md",
        ),
        "utf8",
      ),
    ).toContain("SUPERSEDED BY SOURCE-BACKED MANDATE ATTENTION WORKLIST (#799)");
  });
});
