import { describe, expect, it } from "vitest";

import { buildManageOverviewModel } from "../../src/features/workbench/manage-overview-model";
import { buildManageWorkspaceData } from "./manage-workspace-fixtures";

describe("manage overview model", () => {
  it("builds advisor decision posture from Gateway-backed manage data", () => {
    const model = buildManageOverviewModel(buildManageWorkspaceData());

    expect(model.portfolioSummary).toMatchObject({
      portfolioId: "PF_1001",
      currency: "USD",
      marketValue: "1,250,000.00",
      cashWeight: "8.42%",
      positionCount: 12,
      riskProfile: "Balanced",
    });
    expect(model.postureCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "mandate",
          label: "Mandate Health",
          value: "Needs attention",
          tone: "warn",
          progress: 82,
        }),
        expect.objectContaining({
          key: "attention",
          label: "Active Attention Items",
          value: "2",
          tone: "warn",
          progress: null,
        }),
      ])
    );
    expect(model.postureCards.map((card) => card.key)).not.toContain("approval");
    expect(model.activeRebalance).toMatchObject({
      state: "READY",
      supportabilityState: "SUPPORTED",
      issueCount: "0",
    });
    expect(model.activeRebalance).not.toHaveProperty("steps");
    expect(model.activeRebalance).not.toHaveProperty("approvalReadiness");
    expect(model.moduleItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "quality",
          title: "PM Operating Quality",
          metric: "1 evidence rows",
          href: "/workbench/PF_1001?mode=quality",
        }),
        expect.objectContaining({
          key: "proof",
          title: "Evidence Pack",
          metric: "Evidence available",
          href: "/workbench/PF_1001?mode=proof",
        }),
      ])
    );
    expect(model.latestActivities.map((activity) => activity.key)).toEqual([
      "monitoring",
      "wave",
      "review",
    ]);
    expect(model.blockedSurfaces).toEqual([]);
    expect(model.overviewPostureLabel).toBe("Evidence Available");
  });

  it("keeps partial posture source-owned and exposes blocked surfaces without local capability claims", () => {
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        mandateHealth: null,
        mandateHealthError: "Gateway timeout",
        pmOperatingQualityPoliciesError: "Gateway timeout",
        pmOperatingQualityScoreRunsError: "Gateway timeout",
        outcomeReviewError: "Gateway timeout",
      })
    );

    expect(model.blockedSurfaces).toEqual([
      "Mandate health",
      "PM operating quality",
      "Outcome reviews",
    ]);
    expect(model.overviewPostureLabel).toBe("Needs attention");
    expect(model.overviewPostureTone).toBe("warn");
    expect(model.moduleItems.map((item) => item.title)).not.toContain("Client Communication");
    expect(model.moduleItems.map((item) => item.title)).not.toContain("Trade Approval");
  });

  it("keeps unavailable exception evidence distinct from a confirmed zero-attention queue", () => {
    const model = buildManageOverviewModel(
      buildManageWorkspaceData({
        commandCenterExceptions: null,
        commandCenterExceptionsError: "Gateway timeout",
      })
    );

    expect(model.hasCompleteExceptionEvidence).toBe(false);
    expect(model.postureCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention",
          value: "Not available",
          tone: "warn",
        }),
      ])
    );
    expect(model.moduleItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "mandate",
          metric: "Attention evidence unavailable",
        }),
      ])
    );
    expect(model.latestActivities[0]?.event).toBe(
      "Daily mandate review completed; attention-item evidence is unavailable."
    );
    expect(model.blockedSurfaces).toContain("Mandate attention items");
  });

  it("does not treat a degraded exception response as complete evidence", () => {
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
      })
    );

    expect(model.hasCompleteExceptionEvidence).toBe(false);
    expect(model.postureCards.find((card) => card.key === "attention")?.value).toBe(
      "Not available"
    );
  });

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

    expect(model.exceptionRows.map((row) => row.key)).toEqual(["exc_001", "exc_002"]);
    expect(model.postureCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "attention", value: "2" }),
      ])
    );
    expect(model.latestActivities[0]?.event).toContain("2 attention items");
  });

  it("uses the operating activity fallback when source-backed activity is absent", () => {
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
          data: { items: [] },
        },
        waves: {
          ...base.waves!,
          data: { items: [] },
        },
        outcomeReviews: {
          ...base.outcomeReviews!,
          data: { items: [] },
        },
      })
    );

    expect(model.latestActivities).toEqual([
      {
        key: "empty",
        time: "N/A",
        event: "No recent operating activity.",
      },
    ]);
    expect(model.postureCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "attention",
          value: "0",
          tone: "success",
        }),
      ])
    );
  });
});
