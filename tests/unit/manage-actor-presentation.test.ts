import { describe, expect, it } from "vitest";

import {
  formatBusinessActorEvidence,
  formatBusinessOwner,
} from "../../src/features/workbench/manage-actor-presentation";

describe("Manage actor presentation", () => {
  it("keeps exact mapped actor references beside the readable business role", () => {
    expect(formatBusinessActorEvidence("pm_sg_1")).toBe(
      "Portfolio Manager · pm_sg_1",
    );
    expect(formatBusinessActorEvidence("pm_sg_2")).toBe(
      "Portfolio Manager · pm_sg_2",
    );
    expect(formatBusinessActorEvidence("advisor_sg_001")).toBe(
      "Adviser · advisor_sg_001",
    );
  });

  it("preserves an unknown source actor without inventing a business role", () => {
    expect(formatBusinessActorEvidence("investment_control_007")).toBe(
      "investment_control_007",
    );
  });

  it("keeps missing actor evidence explicit", () => {
    expect(formatBusinessActorEvidence(undefined)).toBe("Not assigned");
    expect(formatBusinessActorEvidence("N/A")).toBe("Not assigned");
    expect(formatBusinessOwner(" Not assigned ")).toBe("Not assigned");
  });
});
