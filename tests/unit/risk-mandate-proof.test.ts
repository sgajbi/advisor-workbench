import { buildRiskMandateSourceRenderRows } from "../../scripts/live/validation/risk-mandate-proof.mjs";

describe("Risk mandate source render adapter", () => {
  it("preserves exact constraint identities and states from both Gateway reads", () => {
    expect(
      buildRiskMandateSourceRenderRows({
        summary: {
          constraints: [
            { key: "cash_band", state: "within" },
            { key: "tracking_error", state: "not_defined" },
          ],
        },
        concentration: {
          constraints: [{ key: "issuer_max_weight", state: "breach" }],
        },
      }),
    ).toEqual([
      { source: "summary", identity: "cash_band", state: "within" },
      { source: "summary", identity: "tracking_error", state: "not_defined" },
      { source: "concentration", identity: "issuer_max_weight", state: "breach" },
    ]);
  });

  it.each([
    [
      "missing source evidence",
      { summary: { constraints: [] }, concentration: null },
      /concentration returned no mandate constraint evidence/,
    ],
    [
      "malformed source rows",
      {
        summary: { constraints: [{ key: "cash_band", state: "within" }] },
        concentration: { constraints: [{ key: "", state: "breach" }] },
      },
      /malformed mandate constraint evidence/,
    ],
    [
      "duplicate source ownership",
      {
        summary: { constraints: [{ key: "issuer_max_weight", state: "measure_unavailable" }] },
        concentration: { constraints: [{ key: "issuer_max_weight", state: "breach" }] },
      },
      /published by both summary and concentration/,
    ],
  ])("fails closed for %s", (_case, comparisons, expectedError) => {
    expect(() => buildRiskMandateSourceRenderRows(comparisons)).toThrow(expectedError);
  });
});
