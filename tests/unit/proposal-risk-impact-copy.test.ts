import { describe, expect, it } from "vitest";

import {
  missingAllocationViewsBody,
  proposalEvidenceAvailabilityLabel,
  PROPOSAL_RISK_IMPACT_COPY,
} from "../../src/copy/proposal-risk-impact-copy";

describe("proposal risk and impact copy", () => {
  it("maps every supported evidence state to stable business language", () => {
    expect(proposalEvidenceAvailabilityLabel("ready")).toBe(
      "Evidence available",
    );
    expect(proposalEvidenceAvailabilityLabel("partial")).toBe(
      "Evidence incomplete",
    );
    expect(proposalEvidenceAvailabilityLabel("unavailable")).toBe(
      "Evidence unavailable",
    );
    expect(proposalEvidenceAvailabilityLabel("not_supported")).toBe(
      "Not supported",
    );
  });

  it("keeps degraded-state copy decision-safe and recovery-led", () => {
    expect(PROPOSAL_RISK_IMPACT_COPY.unavailable.body).toContain(
      "The selected proposal remains visible",
    );
    expect(PROPOSAL_RISK_IMPACT_COPY.unavailable.body).toContain(
      "Retry before continuing",
    );
    expect(PROPOSAL_RISK_IMPACT_COPY.unavailable.body).not.toMatch(
      /Gateway|endpoint|posture|source-owned|inferred/i,
    );
  });

  it("names missing allocation views without inventing a comparison", () => {
    expect(missingAllocationViewsBody(["Currency", "Sector"])).toBe(
      "The comparison does not include Currency, Sector. Available allocation views remain visible. Review the full proposal record before relying on the missing view.",
    );
  });
});
