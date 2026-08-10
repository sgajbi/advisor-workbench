import { describe, expect, it } from "vitest";

import {
  PROPOSAL_STAGES,
  proposalStageLabel,
} from "../../src/features/proposals/proposal-workflow-copy";

describe("proposalStageLabel", () => {
  it.each([
    ["DRAFT", "Draft"],
    ["RISK_REVIEW", "Risk review"],
    ["COMPLIANCE_REVIEW", "Compliance review"],
    ["AWAITING_CLIENT_CONSENT", "Awaiting client consent"],
    ["EXECUTION_READY", "Execution ready"],
  ])("maps supported source stage %s to business copy", (stage, label) => {
    expect(PROPOSAL_STAGES).toContain(stage);
    expect(proposalStageLabel(stage)).toBe(label);
  });

  it.each([
    "EXECUTION_READY_PENDING",
    "malformed-stage",
    "",
  ])("fails neutral for unsupported source stage %j", (stage) => {
    expect(proposalStageLabel(stage)).toBe("Not reported");
  });
});
