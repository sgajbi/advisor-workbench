import { describe, expect, it } from "vitest";

import { buildPerformanceAdvisorBriefViewModel } from "../../src/apps/performance/advisor-brief-view-model";
import {
  buildPerformanceCapabilities,
  buildCombinedPartialPerformanceScenario,
  buildSupportedPerformanceScenario,
  buildUnavailableContributionPerformanceScenario,
} from "../fixtures/performance-workspace-fixtures";

describe("buildPerformanceAdvisorBriefViewModel", () => {
  it("builds a ready fixture-shaped brief with source metrics, audit, and drilldown evidence", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("ready");
    expect(brief.title).toBe("Advisor Brief • PF_1001");
    expect(brief.summary).toContain("YTD active return is 0.52%");
    expect(brief.summary).not.toContain("main drag came from AAPL");
    expect(brief.talkingPoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Portfolio delivered 5.42% versus benchmark 4.91%.",
          evidenceRefs: expect.arrayContaining([
            expect.objectContaining({
              metricLabel: "Active Return",
              sourceSurface: "performance.return_path",
              targetMode: "summary",
              route: expect.stringContaining("/performance?portfolioId=PF_1001"),
            }),
          ]),
        }),
      ])
    );
    expect(brief.sourceMetrics.map((metric) => metric.label)).toEqual([
      "Portfolio Return",
      "Benchmark Return",
      "Active Return",
      "Net Flow",
    ]);
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Portfolio", value: "Ready", tone: "success" },
        { label: "Advisor Brief", value: "Preview Ready", tone: "success" },
      ])
    );
    expect(brief.audit).toEqual(
      expect.objectContaining({
        taskId: "explain.v1",
        outputLabel: "EXPLANATION_ONLY",
        promptVersion: "foundation.explain.v1",
        providerMode: "fixture-preview",
        stubbed: true,
        sourceRefs: expect.arrayContaining([
          "lotus-gateway:workbench:PF_1001:performance-summary:YTD",
          "lotus-workbench:advisor-brief-fixture:PF_1001:YTD",
        ]),
      })
    );
  });

  it("marks the brief partial and surfaces source capability risks when analytics slices are incomplete", () => {
    const scenario = buildCombinedPartialPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("partial");
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Contribution", value: "Partial", tone: "warn" },
        { label: "Attribution", value: "Unavailable", tone: "danger" },
        { label: "Advisor Brief", value: "Preview Partial", tone: "warn" },
      ])
    );
    expect(brief.risksAndExceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Benchmark comparison is incomplete.",
          detail: "A benchmark is assigned, but benchmark-relative returns are incomplete.",
        }),
        expect.objectContaining({
          headline: "Contribution detail is partial.",
          detail: "Contribution exists, but only aggregate rows are available.",
        }),
        expect.objectContaining({
          headline: "Attribution detail is unavailable.",
          detail: "Attribution detail is not available for the current selection.",
        }),
      ])
    );
    expect(
      brief.risksAndExceptions.some(
        (risk) => risk.headline === "Analysis details are still loading."
      )
    ).toBe(false);
  });

  it("falls back to a portfolio-only brief when contribution detail is unavailable", () => {
    const scenario = buildUnavailableContributionPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("partial");
    expect(brief.summary).toContain("Contribution detail is still partial for this portfolio.");
    expect(brief.talkingPoints[0]?.headline).toBe(
      "Portfolio delivered 5.42% versus benchmark 4.91%."
    );
    expect(
      brief.talkingPoints.some((point) => point.headline.includes("Top contributor"))
    ).toBe(false);
    expect(brief.risksAndExceptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          headline: "Contribution detail is unavailable.",
          evidenceRefs: expect.arrayContaining([
            expect.objectContaining({
              metricLabel: "Contribution",
              metricValue: "Unavailable",
              targetMode: "analysis",
            }),
          ]),
        }),
      ])
    );
  });

  it("marks the brief as loading while deferred details are still pending", () => {
    const scenario = buildSupportedPerformanceScenario();

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace: scenario.workspace,
      capabilities: scenario.capabilities,
      period: scenario.workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: scenario.workspace.benchmark_code ?? undefined,
      isDetailsPending: true,
    });

    expect(brief.status).toBe("loading");
    expect(brief.summary).toContain("the detailed advisor narrative is being prepared");
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Advisor Brief", value: "Generating", tone: "warn" },
      ])
    );
  });

  it("marks the brief as empty when no source facts support a talking point", () => {
    const scenario = buildSupportedPerformanceScenario();
    const workspace = {
      ...scenario.workspace,
      benchmark_code: null,
      contribution: null,
      attribution: null,
      net_performance: {
        ...scenario.workspace.net_performance,
        portfolio_return_pct: null,
        benchmark_return_pct: null,
        active_return_pct: null,
      },
      gross_performance: {
        ...scenario.workspace.gross_performance,
        portfolio_return_pct: null,
        benchmark_return_pct: null,
        active_return_pct: null,
      },
    };

    const brief = buildPerformanceAdvisorBriefViewModel({
      workspace,
      capabilities: buildPerformanceCapabilities({
        benchmarkComparison: {
          state: "unavailable",
          reason: "No benchmark is assigned to this mandate.",
        },
        contributionDetail: {
          state: "unavailable",
          reason: "Contribution detail is not available for the current selection.",
        },
        attributionDetail: {
          state: "unavailable",
          reason: "Attribution detail is not available for the current selection.",
        },
      }),
      period: workspace.period,
      detailBasis: "NET",
      contributionDimension: "asset_class",
      attributionDimension: "asset_class",
      chartFrequency: "monthly",
      benchmark: undefined,
      isDetailsPending: false,
    });

    expect(brief.status).toBe("empty");
    expect(brief.talkingPoints).toEqual([]);
    expect(brief.summary).toContain("No material talking points are available");
    expect(brief.supportability).toEqual(
      expect.arrayContaining([
        { label: "Advisor Brief", value: "No Material Brief", tone: "danger" },
      ])
    );
  });
});
