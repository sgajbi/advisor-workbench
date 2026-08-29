import { describe, expect, it } from "vitest";

import { buildManageOverviewModel } from "../../src/features/workbench/manage-overview-model";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

describe("manage overview model", () => {
  it("builds adviser decision posture from Gateway-backed manage data", () => {
    const model = buildManageOverviewModel(buildManageWorkspaceData());

    expect(model.portfolioSummary).toMatchObject({
      portfolioId: "PF_1001",
      currency: "USD",
      marketValue: "1,250,000.00",
      cashWeight: "8.42%",
      positionCount: 12,
      riskProfile: "Balanced",
    });
    expect(model.postureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "mandate",
          label: "Mandate health",
          value: "Needs attention",
          tone: "warn",
          support: "82% source health score",
        }),
        expect.objectContaining({
          key: "attention",
          label: "Open attention items",
          value: "2",
          tone: "warn",
          support: "Selected mandate",
        }),
        expect.objectContaining({
          key: "data",
          label: "Data availability",
          support: "Mandate source availability",
        }),
      ]),
    );
    expect(model.postureItems.map((item) => item.key)).not.toContain(
      "approval",
    );
    expect(model.activeRebalance).toMatchObject({
      state: "READY",
      supportabilityState: "SUPPORTED",
      issueCount: "0",
    });
    expect(model.activeRebalance).not.toHaveProperty("steps");
    expect(model.activeRebalance).not.toHaveProperty("approvalReadiness");
    expect(model.decisionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention:exc_001",
          title: "Benchmark mapping requires review",
          status: "High",
          actionHref: "/workbench/PF_1001?portfolioId=PF_1001&mode=mandate",
        }),
        expect.objectContaining({
          key: "rebalance:wave_001",
          title: "Review the active rebalance",
          status: "Supported",
          actionHref: "/workbench/PF_1001?portfolioId=PF_1001&mode=waves",
        }),
      ]),
    );
    expect(model.blockedSurfaces).toEqual([]);
    expect(model.overviewPostureLabel).toBe("Action required");
    expect(model.overviewPostureTone).toBe("warn");
    expect(model.decisionItems).toHaveLength(3);
  });

  it("keeps partial posture source-owned and exposes blocked surfaces without local capability claims", () => {
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        mandateHealth: null,
        mandateHealthError: "Gateway timeout",
        pmOperatingQualityPoliciesError: "Gateway timeout",
        pmOperatingQualityScoreRunsError: "Gateway timeout",
        outcomeReviewError: "Gateway timeout",
      }),
    );

    expect(model.blockedSurfaces).toEqual(["Mandate health"]);
    expect(model.overviewPostureLabel).toBe("Evidence incomplete");
    expect(model.overviewPostureTone).toBe("warn");
    expect(model.postureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "mandate",
          value: "Not available",
          tone: "warn",
        }),
      ]),
    );
    expect(model.decisionItems.map((item) => item.title)).not.toContain(
      "Client Communication",
    );
    expect(model.decisionItems.map((item) => item.title)).not.toContain(
      "Trade Approval",
    );
  });

  it("does not infer a balanced mandate when the source omits risk profile", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        mandate: {
          ...base.mandate!,
          data: {
            ...base.mandate!.data,
            risk_profile: null,
          },
        },
      }),
    );

    expect(model.portfolioSummary.riskProfile).toBe("Not reported");
    expect(model.blockedSurfaces).toContain("Mandate risk profile");
    expect(model.overviewPostureLabel).toBe("Evidence incomplete");
    expect(model.overviewPostureTone).toBe("warn");
  });

  it.each(["N/A", "UNKNOWN", "NOT_AVAILABLE", "not reported", "Unavailable"])(
    "treats the unavailable risk-profile sentinel %s as incomplete",
    (riskProfile) => {
      const base = buildManageWorkspaceData();
      const model = buildManageOverviewModel(
        buildManageWorkspaceData({
          mandate: {
            ...base.mandate!,
            data: {
              ...base.mandate!.data,
              risk_profile: riskProfile,
            },
          },
          commandCenterExceptions: {
            ...base.commandCenterExceptions!,
            data: { items: [], next_cursor: null },
          },
        }),
      );

      expect(model.portfolioSummary.riskProfile).toBe("Not reported");
      expect(model.blockedSurfaces).toContain("Mandate risk profile");
      expect(model.overviewPostureLabel).toBe("Evidence incomplete");
    },
  );

  it("uses a source-confirmed ready posture only when evidence is complete and no items are open", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        commandCenterExceptions: {
          ...base.commandCenterExceptions!,
          data: { items: [], next_cursor: null },
        },
      }),
    );

    expect(model.blockedSurfaces).toEqual([]);
    expect(model.overviewPostureLabel).toBe("Ready for review");
    expect(model.overviewPostureTone).toBe("success");
  });

  it.each([
    ["SUPPORTED", "Supported", "success"],
    ["READY", "Ready", "success"],
    ["PARTIAL", "Needs attention", "warn"],
    ["DEGRADED", "Needs attention", "warn"],
    ["STALE", "Stale", "warn"],
    ["BLOCKED", "Blocked", "danger"],
    ["UNSUPPORTED", "Not supported", "danger"],
    ["EMPTY", "Not available", "warn"],
    ["UNKNOWN", "Review required", "warn"],
  ] as const)(
    "keeps the source-owned mandate health state %s in the overview",
    (healthState, expectedValue, expectedTone) => {
      const base = buildManageWorkspaceData();
      if (!base.mandateHealth) {
        throw new Error("Mandate-health fixture is required");
      }

      const model = buildManageOverviewModel(
        buildManageWorkspaceData({
          mandateHealth: {
            ...base.mandateHealth,
            data: {
              ...base.mandateHealth.data,
              health_state: healthState,
            },
          },
        }),
      );

      expect(model.postureItems).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            key: "mandate",
            value: expectedValue,
            tone: expectedTone,
          }),
        ]),
      );
    },
  );

  it("keeps unavailable exception evidence distinct from a confirmed zero-attention queue", () => {
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        commandCenterExceptions: null,
        commandCenterExceptionsError: "Gateway timeout",
      }),
    );

    expect(model.hasCompleteExceptionEvidence).toBe(false);
    expect(model.postureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention",
          value: "Not available",
          tone: "warn",
        }),
      ]),
    );
    expect(model.decisionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention:evidence-unavailable",
          title: "Mandate attention evidence is unavailable",
          status: "Not available",
        }),
      ]),
    );
    expect(model.blockedSurfaces).toContain("Mandate attention items");
  });

  it("keeps identified rows reviewable without treating degraded evidence as complete", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        commandCenterExceptions: {
          ...base.commandCenterExceptions!,
          supportability: {
            ...base.commandCenterExceptions!.supportability,
            state: "DEGRADED",
          },
        },
      }),
    );

    expect(model.hasCompleteExceptionEvidence).toBe(false);
    expect(model.hasAvailableExceptionEvidence).toBe(true);
    expect(model.exceptionEvidencePosture).toBe("partial");
    expect(
      model.postureItems.find((item) => item.key === "attention")?.value,
    ).toBe("2 shown");
    expect(
      model.postureItems.find((item) => item.key === "attention")?.support,
    ).toBe("Bounded source view; total not confirmed");
    expect(model.decisionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention:more-available",
          subtitle: "Complete source coverage is not confirmed",
          facts: expect.arrayContaining([
            { label: "Coverage", value: "Bounded source view" },
          ]),
        }),
      ]),
    );
  });

  it("keeps attention counts unknown when the portfolio exception page is truncated", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        commandCenterExceptions: {
          ...base.commandCenterExceptions!,
          data: {
            ...base.commandCenterExceptions!.data,
            next_cursor: "exc_002",
          },
        },
      }),
    );

    expect(model.hasCompleteExceptionEvidence).toBe(false);
    expect(model.hasAvailableExceptionEvidence).toBe(true);
    expect(model.exceptionEvidencePosture).toBe("partial");
    expect(
      model.postureItems.find((item) => item.key === "attention")?.value,
    ).toBe("2 shown");
    expect(model.decisionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention:more-available",
          status: "Partial",
        }),
      ]),
    );
    expect(model.blockedSurfaces).not.toContain("Mandate attention items");
  });

  it("preserves an unknown source issue count when wave evidence is unavailable", () => {
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({ waves: null, wavesError: "Gateway timeout" }),
    );

    expect(model.activeRebalance.issueCount).toBe("N/A");
    expect(model.blockedSurfaces).toContain("Rebalance waves");
  });

  it("does not present an unscoped wave as selected-portfolio rebalance evidence", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        waves: {
          ...base.waves!,
          data: {
            items: [
              {
                wave_id: "wave_other",
                wave_state: "CREATED",
                trigger_id: "contains-PF_1001-but-is-not-a-contract-field",
                trigger_type: "EXPLICIT_PORTFOLIO_LIST",
                item_count: 8,
                issue_count: 0,
                supportability_state: "READY",
                supportability_reason: "WAVE_SUPPORTABILITY_READY",
              },
            ],
          },
        },
      }),
    );

    expect(model.activeRebalance).toMatchObject({
      triggerType: null,
      state: "N/A",
      issueCount: "N/A",
      supportabilityState: "N/A",
      supportabilityReason: "SELECTED_PORTFOLIO_WAVE_NOT_CONFIRMED",
    });
    expect(model.postureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "rebalance",
          value: "Not available",
        }),
      ]),
    );
    expect(model.decisionItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "rebalance:unconfirmed",
          title: "Confirm selected-portfolio rebalance evidence",
          status: "Not available",
        }),
      ]),
    );
  });

  it("uses response supportability only when its wave identity matches the selected row", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        waves: {
          ...base.waves!,
          supportability: {
            ...base.waves!.supportability,
            wave_id: "wave_001",
            wave_state: "READY",
            item_count: 6,
            issue_count: 2,
            state: "PARTIAL",
            reason_codes: ["SOURCE_REVIEW_REQUIRED"],
          },
          data: {
            items: [
              {
                wave_id: "wave_001",
                portfolio_ids: ["PF_1001"],
                trigger_type: "EXPLICIT_PORTFOLIO_LIST",
              },
            ],
          },
        },
      }),
    );

    expect(model.activeRebalance).toEqual({
      waveId: "wave_001",
      triggerType: "EXPLICIT_PORTFOLIO_LIST",
      state: "READY",
      supportabilityState: "PARTIAL",
      itemCount: "6",
      issueCount: "2",
      supportabilityReason: "SOURCE_REVIEW_REQUIRED",
    });
    expect(
      model.decisionItems.find((decision) => decision.kind === "rebalance")
        ?.facts,
    ).toContainEqual({ label: "Proposed changes", value: "6" });
  });

  it("keeps row evidence authoritative over matched response supportability", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        waves: {
          ...base.waves!,
          supportability: {
            ...base.waves!.supportability,
            wave_id: "wave_001",
            wave_state: "CREATED",
            item_count: 9,
            issue_count: 7,
            state: "DEGRADED",
            reason_codes: ["RESPONSE_REASON"],
          },
        },
      }),
    );

    expect(model.activeRebalance).toMatchObject({
      state: "READY",
      supportabilityState: "SUPPORTED",
      issueCount: "0",
      supportabilityReason: "WAVE_READY",
    });
    expect(
      model.decisionItems.find((decision) => decision.kind === "rebalance")
        ?.facts,
    ).toContainEqual({ label: "Proposed changes", value: "4" });
  });

  it.each([null, "wave_other"])(
    "does not borrow response supportability when the response wave identity is %s",
    (responseWaveId) => {
      const base = buildManageWorkspaceData();
      const supportability = {
        ...base.waves!.supportability,
        wave_id: responseWaveId,
        wave_state: "READY",
        item_count: 4,
        issue_count: 2,
        state: "PARTIAL",
        reason_codes: ["WRONG_WAVE_REASON"],
      };
      const model = buildManageOverviewModel(
        buildManageWorkspaceData({
          waves: {
            ...base.waves!,
            supportability,
            data: {
              items: [
                {
                  wave_id: "wave_001",
                  portfolio_ids: ["PF_1001"],
                  trigger_type: "EXPLICIT_PORTFOLIO_LIST",
                },
              ],
            },
          },
        }),
      );

      expect(model.activeRebalance).toEqual({
        waveId: "wave_001",
        triggerType: "EXPLICIT_PORTFOLIO_LIST",
        state: "N/A",
        supportabilityState: "N/A",
        itemCount: "N/A",
        issueCount: "N/A",
        supportabilityReason: "N/A",
      });
    },
  );

  it("keeps book-level exceptions outside the selected mandate posture", () => {
    const data = buildManageWorkspaceData();
    if (!data.commandCenter || !data.commandCenterExceptions) {
      throw new Error("Command-center fixtures are required");
    }
    const items = Array.isArray(data.commandCenterExceptions.data.items)
      ? data.commandCenterExceptions.data.items
      : [];
    data.commandCenter = {
      ...data.commandCenter,
      data: {
        ...data.commandCenter.data,
        summary: {
          active_exception_count: 3,
          data_completeness_state: "PARTIAL",
        },
      },
    };
    data.commandCenterExceptions = {
      ...data.commandCenterExceptions,
      data: {
        ...data.commandCenterExceptions.data,
        items: [
          ...items,
          {
            exception_id: "exception-other",
            mandate_id: "mandate-other",
            severity: "HIGH",
            state: "ACTIVE",
          },
        ],
      },
    };

    const model = buildManageOverviewModel(data);

    expect(
      model.decisionItems
        .filter((decision) => decision.kind === "attention")
        .map((decision) => decision.key),
    ).toEqual(["attention:exc_001", "attention:exc_002"]);
    expect(model.postureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "attention", value: "2" }),
      ]),
    );
  });

  it("keeps a confirmed zero-attention posture without inventing an attention decision", () => {
    const base = buildManageWorkspaceData();
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        commandCenter: {
          ...base.commandCenter!,
          data: {
            summary: {
              active_exception_count: 0,
              data_completeness_state: "SUPPORTED",
            },
          },
        },
        commandCenterExceptions: {
          ...base.commandCenterExceptions!,
          data: { items: [], next_cursor: null },
        },
        waves: {
          ...base.waves!,
          data: { items: [] },
        },
        outcomeReviews: {
          ...base.outcomeReviews!,
          data: { items: [] },
        },
      }),
    );

    expect(model.decisionItems.map((decision) => decision.kind)).toEqual([
      "rebalance",
    ]);
    expect(model.postureItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention",
          value: "0",
          tone: "success",
        }),
      ]),
    );
  });
});
