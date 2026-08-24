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
});
