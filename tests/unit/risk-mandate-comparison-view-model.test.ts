import { describe, expect, it } from "vitest";

import { buildRiskMandateComparisonViewModel } from "../../src/apps/performance/risk-mandate-comparison-view-model";
import { buildMandateComparisonFixture } from "../fixtures/risk-mandate-comparison-fixtures";

describe("risk mandate comparison view model", () => {
  it("keeps an absent additive contract explicitly not supplied", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: undefined,
      concentrationRisk: null,
    });

    expect(model).toMatchObject({
      availability: "not_supplied",
      availabilityLabel: "Not supplied",
      sources: [],
    });
    expect(model.summary).toContain("no breach or all-clear is shown");
  });

  it("renders and prioritises every source constraint state without calculating missing headroom", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({
        constraints: [
          {
            key: "cash_band",
            label: "Cash allocation",
            limit: {
              minimum: 0.02,
              maximum: 0.1,
              unit: "ratio",
              source_service: "lotus-manage",
            },
            measure: {
              value: 0.0859,
              unit: "ratio",
              basis: "total_market_value_base",
              as_of_date: "2026-02-24",
              source_service: "lotus-core",
              source_metric: "cash_weight",
            },
            headroom: null,
            state: "within",
            reason: "Cash allocation is within the approved mandate band.",
            source_state: "READY",
            source_reason_code: "CASH_LIQUIDITY_READY",
          },
          {
            key: "issuer_max_weight",
            label: "Largest issuer exposure",
            limit: {
              maximum: 0.2,
              unit: "ratio",
              source_service: "lotus-manage",
            },
            measure: {
              value: 0.2107,
              unit: "ratio",
              basis: "total_market_value_base",
              as_of_date: "2026-02-24",
              source_service: "lotus-risk",
              source_metric: "top_issuer_weight_current",
            },
            headroom: -0.0107,
            state: "breach",
            reason:
              "Largest issuer exposure exceeds the approved mandate limit.",
          },
          {
            key: "tracking_error",
            label: "Tracking error",
            limit: null,
            measure: {
              value: 0.04,
              unit: "ratio",
              basis: null,
              as_of_date: "2026-02-24",
              source_service: "lotus-risk",
              source_metric: "TRACKING_ERROR",
            },
            headroom: null,
            state: "not_defined",
            reason: "The mandate does not define a tracking error limit.",
          },
          {
            key: "single_position",
            label: "Largest position exposure",
            limit: {
              maximum: 0.2,
              unit: "ratio",
              source_service: "lotus-manage",
            },
            measure: null,
            headroom: null,
            state: "measure_unavailable",
            reason:
              "The source measure is not available for the selected date.",
          },
        ],
      }),
      concentrationRisk: null,
    });

    const rows = model.sources[0].constraints;
    expect(rows.map((row) => row.state)).toEqual([
      "breach",
      "measure_unavailable",
      "not_defined",
      "within",
    ]);
    expect(rows[0]).toMatchObject({
      stateLabel: "Outside mandate",
      measure: "21.07%",
      limit: "Maximum 20.00%",
      headroom: "−1.07 pp",
      basis: "Total market value in base currency",
      asOf: "24 Feb 2026",
    });
    expect(rows[1]).toMatchObject({
      stateLabel: "Measure unavailable",
      measure: "Not reported",
      headroom: "Not reported",
    });
    expect(rows[2]).toMatchObject({
      stateLabel: "Limit not defined",
      limit: "Not defined",
    });
    expect(rows[3]).toMatchObject({
      stateLabel: "Within mandate",
      measure: "8.59%",
      limit: "2.00%–10.00%",
      headroom: "Not reported",
    });
    expect(model).toMatchObject({
      availability: "partially_supplied",
      availabilityLabel: "Partly supplied",
    });
    expect(model.sources[1]).toMatchObject({
      key: "concentration",
      availability: "not_supplied",
      supportability: "not_supplied",
      supportabilityLabel: "Not supplied",
      constraints: [],
    });
    expect(model.contextNotice).toBeNull();
  });

  it.each([
    ["due", "Review due", "warn"],
    ["overdue", "Review overdue", "danger"],
    ["scheduled", "Review scheduled", "default"],
    ["not_defined", "Review cadence not defined", "warn"],
  ] as const)(
    "maps the source review policy state %s",
    (state, label, tone) => {
      const model = buildRiskMandateComparisonViewModel({
        portfolioRisk: buildMandateComparisonFixture({
          review_policy: {
            review_frequency: "QUARTERLY",
            last_review_date: "2025-12-31",
            next_review_due_date: "2026-03-31",
            state,
          },
        }),
        concentrationRisk: null,
      });

      expect(model.sources[0].reviewPolicy).toMatchObject({
        frequency: "Quarterly",
        state,
        stateLabel: label,
        tone,
        lastReviewDate: "31 Dec 2025",
        nextReviewDueDate: "31 Mar 2026",
      });
    },
  );

  it("preserves unavailable and mismatched source posture with lineage", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({
        date_alignment_state: "mismatch",
        supportability: {
          state: "unavailable",
          reason:
            "Mandate health is dated after the selected risk review date.",
          source_service: "lotus-manage",
        },
      }),
      concentrationRisk: null,
    });

    expect(model.sources[0]).toMatchObject({
      supportabilityLabel: "Evidence unavailable",
      supportabilityTone: "danger",
      supportabilityReason:
        "Mandate health is dated after the selected risk review date.",
      dateAlignmentLabel: "Dates differ",
      dateAlignmentTone: "warn",
      lineage: [
        expect.objectContaining({
          product: "DiscretionaryMandateBinding v1",
          sourceSystem: "lotus-core",
          dataQuality: "Complete",
          latestEvidence: "24 Feb 2026, 01:00 UTC",
        }),
      ],
    });
  });

  it("flags differing Gateway contexts instead of silently merging them", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture(),
      concentrationRisk: buildMandateComparisonFixture({
        mandate_version: "4",
        comparison_as_of_date: "2026-03-01",
      }),
    });

    expect(model.contextNotice).toContain("different mandate contexts");
    expect(model.sources).toHaveLength(2);
    expect(model.sources[0].mandateVersion).toBe("3");
    expect(model.sources[1].mandateVersion).toBe("4");
  });

  it.each([
    ["mandate_id", "MANDATE_ALTERNATE"],
    ["mandate_version", "4"],
    ["risk_profile", "GROWTH"],
    ["comparison_as_of_date", "2026-03-01"],
    ["mandate_as_of_date", "2026-03-01"],
    ["mandate_health_as_of_date", "2026-03-01"],
  ] as const)(
    "treats a raw %s mismatch as a different mandate context",
    (field, value) => {
      const model = buildRiskMandateComparisonViewModel({
        portfolioRisk: buildMandateComparisonFixture(),
        concentrationRisk: buildMandateComparisonFixture({ [field]: value }),
      });

      expect(model.contextPosture).toBe("conflict");
      expect(model.contextNotice).toContain("different mandate contexts");
    },
  );

  it("does not let display formatting hide a raw date mismatch", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({
        comparison_as_of_date: "invalid-date-a",
      }),
      concentrationRisk: buildMandateComparisonFixture({
        comparison_as_of_date: "invalid-date-b",
      }),
    });

    expect(model.sources[0].comparisonAsOf).toBe(model.sources[1].comparisonAsOf);
    expect(model.contextPosture).toBe("conflict");
  });

  it("distinguishes one-sided missing context from bilateral missing evidence", () => {
    const oneSided = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({ risk_profile: null }),
      concentrationRisk: buildMandateComparisonFixture(),
    });
    const bilateral = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({ risk_profile: null }),
      concentrationRisk: buildMandateComparisonFixture({ risk_profile: null }),
    });

    expect(oneSided.contextPosture).toBe("conflict");
    expect(bilateral.contextPosture).toBe("insufficient_evidence");
    expect(bilateral.contextNotice).toContain("insufficient");
  });

  it("keeps complete identical raw context aligned", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture(),
      concentrationRisk: buildMandateComparisonFixture(),
    });

    expect(model.contextPosture).toBe("aligned");
    expect(model.contextNotice).toBeNull();
  });

  it("fails closed for unknown constraint and review-policy states", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({
        constraints: [
          {
            key: "future_constraint",
            label: "Future constraint",
            limit: null,
            measure: null,
            headroom: null,
            state: "future_state",
            reason: "The source returned a newly introduced state.",
          },
        ],
        review_policy: {
          review_frequency: "QUARTERLY",
          last_review_date: null,
          next_review_due_date: null,
          state: "future_state",
        },
      } as unknown as Partial<ReturnType<typeof buildMandateComparisonFixture>>),
      concentrationRisk: null,
    });

    expect(model.sources[0].constraints[0]).toMatchObject({
      state: "unavailable",
      stateLabel: "Evidence unavailable",
      tone: "warn",
    });
    expect(model.sources[0].reviewPolicy).toMatchObject({
      state: "unavailable",
      stateLabel: "Review state unavailable",
      tone: "warn",
    });
  });

  it("renders an absent source cadence without inventing a review frequency", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: buildMandateComparisonFixture({
        review_policy: {
          review_frequency: null,
          last_review_date: "2025-12-31",
          next_review_due_date: "2026-03-31",
          state: "scheduled",
        },
      } as Partial<ReturnType<typeof buildMandateComparisonFixture>>),
      concentrationRisk: null,
    });

    expect(model.sources[0].reviewPolicy).toMatchObject({
      frequency: "Not reported",
      state: "scheduled",
      stateLabel: "Review scheduled",
    });
  });

  it("preserves a missing portfolio comparison beside supplied concentration evidence", () => {
    const model = buildRiskMandateComparisonViewModel({
      portfolioRisk: undefined,
      concentrationRisk: buildMandateComparisonFixture(),
    });

    expect(model.availability).toBe("partially_supplied");
    expect(
      model.sources.map((source) => [source.key, source.availability]),
    ).toEqual([
      ["summary", "not_supplied"],
      ["concentration", "supplied"],
    ]);
  });
});
