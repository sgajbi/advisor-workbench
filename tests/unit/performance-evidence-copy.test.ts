import { describe, expect, it } from "vitest";

import { PERFORMANCE_EVIDENCE_COPY } from "../../src/copy/performance-evidence-copy";

function collectCopy(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "function") return [];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(collectCopy);
}

describe("performance evidence business copy", () => {
  it("keeps platform vocabulary out of the screen copy authority", () => {
    const copy = collectCopy(PERFORMANCE_EVIDENCE_COPY).join(" ");

    expect(copy).not.toMatch(/\b(?:Gateway|BFF|HTTP status|supportability|governed|posture)\b/i);
  });

  it("describes availability gaps and their recovery in business language", () => {
    expect(PERFORMANCE_EVIDENCE_COPY.exceptions.calculationAvailabilityMissing).toEqual({
      title: "Calculation availability not confirmed",
      detail:
        "The package does not identify whether the required calculation is available for review.",
      action:
        "Obtain current calculation availability evidence before relying on the package.",
    });
    expect(PERFORMANCE_EVIDENCE_COPY.exceptions.calculationAvailabilityIdentityMissing.action)
      .toContain("complete calculation availability evidence");
    expect(PERFORMANCE_EVIDENCE_COPY.exceptions.calculationAvailabilityUnknownTitle).toBe(
      "Calculation availability not confirmed",
    );
  });

  it("reports methodology evidence with correct singular and plural grammar", () => {
    expect(PERFORMANCE_EVIDENCE_COPY.methodology.recorded(1)).toBe(
      "1 methodology reference is recorded in support details.",
    );
    expect(PERFORMANCE_EVIDENCE_COPY.methodology.recorded(2)).toBe(
      "2 methodology references are recorded in support details.",
    );
  });
});
