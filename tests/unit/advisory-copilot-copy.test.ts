import { describe, expect, it } from "vitest";

import {
  advisoryCopilotAvailabilityLabel,
  advisoryCopilotClientUseLabel,
  advisoryCopilotReviewLabel,
  ADVISORY_COPILOT_COPY,
} from "../../src/copy/advisory-copilot-copy";

describe("Advisory Copilot copy", () => {
  it("states the AI-assisted and human-review boundaries together", () => {
    expect(ADVISORY_COPILOT_COPY.subtitle).toContain("AI-assisted");
    expect(ADVISORY_COPILOT_COPY.subtitle).toContain("mandatory human review");
    expect(ADVISORY_COPILOT_COPY.clientBoundary).toBe(
      "Not approved for client use",
    );
  });

  it("keeps action failure truthful about retained business state", () => {
    expect(ADVISORY_COPILOT_COPY.actionFailure).toContain(
      "The proposal remains unchanged",
    );
    expect(ADVISORY_COPILOT_COPY.actionFailure).toContain("try again");
  });

  it("keeps productive copy free of service and engineering vocabulary", () => {
    expect(JSON.stringify(ADVISORY_COPILOT_COPY)).not.toMatch(
      /Gateway|BFF|supportability|posture|source-backed|source-owned/i,
    );
  });

  it("maps known AI workflow states and fails unknown values closed", () => {
    expect(
      advisoryCopilotAvailabilityLabel(
        "ADVISE_COPILOT_GATEWAY_WORKBENCH_CANONICAL_PROOF_SUPPORTED",
      ),
    ).toBe("Available");
    expect(advisoryCopilotAvailabilityLabel("FUTURE_STATUS")).toBe(
      "Review required",
    );
    expect(advisoryCopilotClientUseLabel("BLOCKED")).toBe(
      "Not approved for client use",
    );
    expect(advisoryCopilotClientUseLabel("FUTURE_STATUS")).toBe(
      "Review required",
    );
    expect(advisoryCopilotReviewLabel("GUARDRAIL_REJECTED")).toBe(
      "Review controls not met",
    );
    expect(advisoryCopilotReviewLabel("FUTURE_STATUS")).toBe("Not prepared");
  });
});
