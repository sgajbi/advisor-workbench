import { describe, expect, it } from "vitest";

import { createAiAssistanceDisclosure } from "@/design-system";

const liveReviewedInput = {
  scopeLabel: "Advisor brief",
  preparation: "ai-assisted" as const,
  availability: "live" as const,
  evidence: { state: "supported" as const, sourceCount: 2 },
  humanReview: { state: "reviewed" as const, sourceRecorded: true },
  clientUse: "approved" as const,
  freshness: { state: "current" as const, asOf: "2026-08-04T08:00:00Z" },
};

describe("createAiAssistanceDisclosure", () => {
  it("preserves source-backed live, reviewed, client-approved posture", () => {
    expect(createAiAssistanceDisclosure(liveReviewedInput)).toMatchObject({
      evidence: { state: "supported", sourceCount: 2 },
      humanReview: { state: "reviewed", sourceRecorded: true },
      clientUse: "approved",
      freshness: { state: "current" },
      limitations: [],
    });
  });

  it.each([
    {
      name: "evidence support without references",
      input: { ...liveReviewedInput, evidence: { state: "supported" as const, sourceCount: 0 } },
      expected: { evidence: { state: "limited" }, clientUse: "blocked" },
    },
    {
      name: "review without a source record",
      input: {
        ...liveReviewedInput,
        humanReview: { state: "reviewed" as const, sourceRecorded: false },
      },
      expected: { humanReview: { state: "unavailable" }, clientUse: "blocked" },
    },
    {
      name: "current freshness without a source date",
      input: { ...liveReviewedInput, freshness: { state: "current" as const } },
      expected: { freshness: { state: "not-reported" } },
    },
    {
      name: "simulation claiming client approval",
      input: { ...liveReviewedInput, availability: "simulation" as const },
      expected: { clientUse: "blocked" },
    },
    {
      name: "requested output claiming review and approval",
      input: { ...liveReviewedInput, preparation: "requested" as const },
      expected: {
        humanReview: { state: "unavailable", sourceRecorded: false },
        clientUse: "blocked",
      },
    },
  ])("fails closed for $name", ({ input, expected }) => {
    expect(createAiAssistanceDisclosure(input)).toMatchObject(expected);
  });

  it("preserves source-reported review posture when generation provenance is unavailable", () => {
    expect(
      createAiAssistanceDisclosure({
        ...liveReviewedInput,
        preparation: "unavailable",
        availability: "partial",
        humanReview: { state: "review-required", sourceRecorded: false },
        clientUse: "blocked",
      }),
    ).toMatchObject({
      preparation: "unavailable",
      availability: "partial",
      humanReview: { state: "review-required" },
      clientUse: "blocked",
    });
  });
});
