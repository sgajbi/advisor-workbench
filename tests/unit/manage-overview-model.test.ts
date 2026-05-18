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
    expect(model.readinessCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "mandate",
          label: "Mandate Readiness",
          value: "Needs attention",
          tone: "warn",
        }),
        expect.objectContaining({
          key: "approval",
          label: "Approval Readiness",
          value: "Ready",
          tone: "success",
        }),
      ])
    );
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
        pmOperatingQualityPoliciesError: "Gateway timeout",
        pmOperatingQualityScoreRunsError: "Gateway timeout",
        outcomeReviewError: "Gateway timeout",
      })
    );

    expect(model.blockedSurfaces).toEqual(["PM operating quality", "Outcome reviews"]);
    expect(model.overviewPostureLabel).toBe("Needs attention");
    expect(model.overviewPostureTone).toBe("warn");
    expect(model.moduleItems.map((item) => item.title)).not.toContain("Client Communication");
    expect(model.moduleItems.map((item) => item.title)).not.toContain("Trade Approval");
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
    expect(model.readinessCards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "approval",
          value: "Ready",
          tone: "success",
        }),
      ])
    );
  });
});
