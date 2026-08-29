import {
  assertExactSourceRenderProof,
  assertSourceBusinessLabelProof,
  type SourceRenderProofRow,
} from "../../scripts/live/validation/source-render-proof.mjs";

const expectedRows: SourceRenderProofRow[] = [
  { source: "summary", identity: "cash_band", state: "within" },
  { source: "concentration", identity: "issuer_max_weight", state: "breach" },
];

describe("exact Gateway-to-render proof", () => {
  it("accepts the exact source identities and states regardless of DOM order", () => {
    expect(
      assertExactSourceRenderProof({
        screen: "Risk review",
        expectedRows,
        renderedRows: [...expectedRows].reverse(),
      }),
    ).toEqual(expectedRows);
  });

  it.each([
    {
      caseName: "missing rendered evidence",
      renderedRows: [expectedRows[0]],
      error:
        "Risk review: source concentration identity issuer_max_weight expected state breach, but no rendered evidence was found.",
    },
    {
      caseName: "unexpected rendered evidence",
      renderedRows: [
        ...expectedRows,
        { source: "summary", identity: "tracking_error", state: "not_defined" },
      ],
      error:
        "Risk review: rendered source summary identity tracking_error with state not_defined, but Gateway supplied no matching row.",
    },
    {
      caseName: "state mismatch",
      renderedRows: [
        expectedRows[0],
        {
          source: "concentration",
          identity: "issuer_max_weight",
          state: "within",
        },
      ],
      error:
        "Risk review: source concentration identity issuer_max_weight expected state breach, but rendered state within.",
    },
  ])(
    "fails closed for $caseName with business-locatable diagnostics",
    ({ renderedRows, error }) => {
      expect(() =>
        assertExactSourceRenderProof({
          screen: "Risk review",
          expectedRows,
          renderedRows,
        }),
      ).toThrow(error);
    },
  );

  it.each([
    ["source", [...expectedRows, expectedRows[0]]],
    ["rendered", [...expectedRows, expectedRows[0]]],
  ])("rejects duplicate %s identities", (side, duplicateRows) => {
    expect(() =>
      assertExactSourceRenderProof({
        screen: "Risk review",
        expectedRows: side === "source" ? duplicateRows : expectedRows,
        renderedRows: side === "rendered" ? duplicateRows : expectedRows,
      }),
    ).toThrow(
      `Risk review: ${side} proof duplicated source summary identity cash_band in state within.`,
    );
  });

  it("rejects malformed proof rows before comparison", () => {
    expect(() =>
      assertExactSourceRenderProof({
        screen: "Advisor Book",
        expectedRows: [
          { source: "advisor-book", identity: "", state: "ACTIVE" },
        ],
        renderedRows: [],
      }),
    ).toThrow("Advisor Book: source row 1 returned no identity.");
  });

  it.each(["source", "identity", "state"] as const)(
    "rejects normalized %s evidence because exact proof must preserve source values",
    (field) => {
      expect(() =>
        assertExactSourceRenderProof({
          screen: "Advisor Book",
          expectedRows: [
            {
              source: field === "source" ? " advisor-book" : "advisor-book",
              identity: field === "identity" ? "PB_001 " : "PB_001",
              state: field === "state" ? " ACTIVE " : "ACTIVE",
            },
          ],
          renderedRows: [],
        }),
      ).toThrow(`returned ${field} with surrounding whitespace`);
    },
  );
});

describe("source business-label proof", () => {
  it("accepts presentation-only case and source separator differences", () => {
    expect(
      assertSourceBusinessLabelProof({
        screen: "Client Context",
        fact: "Mandate",
        sourceValue: "DISCRETIONARY_ADVISORY",
        renderedValue: "Discretionary Advisory",
      }),
    ).toBe("DISCRETIONARY_ADVISORY");
  });

  it("rejects a stale rendered fact even when both values are non-empty", () => {
    expect(() =>
      assertSourceBusinessLabelProof({
        screen: "Client Context",
        fact: "Mandate",
        sourceValue: "DISCRETIONARY",
        renderedValue: "Advisory",
      }),
    ).toThrow(
      "Client Context: Mandate rendered Advisory, but Gateway supplied DISCRETIONARY.",
    );
  });

  it.each([
    ["sourceValue", "", "Client Context: Mandate returned no source value."],
    ["renderedValue", "", "Client Context: Mandate returned no rendered value."],
  ] as const)("rejects missing %s", (field, value, message) => {
    expect(() =>
      assertSourceBusinessLabelProof({
        screen: "Client Context",
        fact: "Mandate",
        sourceValue: field === "sourceValue" ? value : "DISCRETIONARY",
        renderedValue: field === "renderedValue" ? value : "Discretionary",
      }),
    ).toThrow(message);
  });
});
