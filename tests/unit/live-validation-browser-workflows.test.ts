import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as browserWorkflowModule from "../../scripts/live/validation/browser-workflows.mjs";
import { DEFAULT_PANEL_REGISTRY } from "../../scripts/live/validation/contract-metadata.mjs";

const {
  createBrowserValidationHelpers,
  hasAcceptedAdvisorBriefReviewPosture,
  validateAdvisoryJourneyScreens,
} = browserWorkflowModule as unknown as {
  createBrowserValidationHelpers: typeof import("../../scripts/live/validation/browser-workflows.mjs").createBrowserValidationHelpers;
  hasAcceptedAdvisorBriefReviewPosture: (text: string) => boolean;
  validateAdvisoryJourneyScreens: (...args: unknown[]) => Promise<void>;
};

describe("live validation browser workflow helpers", () => {
  it("accepts both ready and degraded accepted advisor-brief review posture", () => {
    expect(
      hasAcceptedAdvisorBriefReviewPosture(
        "AI Review Supportability ACTION REQUIRED ACCEPTED partial evidence remains visible"
      )
    ).toBe(true);
    expect(
      hasAcceptedAdvisorBriefReviewPosture(
        "AI Review Supportability READY ACCEPTED run accepted for bounded downstream workflow use"
      )
    ).toBe(true);
    expect(
      hasAcceptedAdvisorBriefReviewPosture("AI Review AWAITING REVIEW Supportability ACTION REQUIRED")
    ).toBe(false);
  });

  it("validates the canonical contribution analysis default and segment views", () => {
    const source = browserWorkflowModule.validatePerformanceAnalysisPanel.toString();

    expect(source).toContain("contributionDimension=asset_class");
    expect(source).toContain("attributionDimension=asset_class");
    expect(source).toContain('page.locator("#performance-drivers").first()');
    expect(source).toContain("performanceDriversPanel.scrollIntoViewIfNeeded()");
    expect(source).toContain("const positionsTab = performanceDriversPanel.getByRole");
    expect(source).toContain("positionsTab.scrollIntoViewIfNeeded()");
    expect(source).toContain("Positions");
    expect(source).toContain('performanceDriversPanel.locator(\'table[aria-label="Position contribution table"]\')');
    expect(source).toContain("Segment Summary");
    expect(source).toContain("const segmentSummaryTab = performanceDriversPanel.getByRole");
    expect(source).toContain("segmentSummaryTab.scrollIntoViewIfNeeded()");
    expect(source).toContain('performanceDriversPanel.locator(\'table[aria-label="Asset Class contribution table"]\')');
  });

  it("keeps Advisor Cockpit browser proof aligned to business-facing readiness language", () => {
    const source = validateAdvisoryJourneyScreens.toString();

    expect(source).toContain('getByText("Preparation Readiness", { exact: true })');
    expect(source).not.toContain('getByText("Supportability", { exact: true })');
  });

  it("binds Advisor Book proof to portfolio context rather than its display label", () => {
    const source = browserWorkflowModule.validateAdvisorBookPanel.toString();

    expect(source).toContain(
      'a[href*="portfolioId=${encodeURIComponent(portfolioId)}"]',
    );
    expect(source).not.toContain("getByText(portfolioId");
    expect(source).toContain('{ name: "Operational details" }');
    expect(source).not.toContain('{ name: "Support details" }');
  });

  it("resolves governed routes and records screenshot evidence with absolute paths", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "lotus-browser-workflow-"));
    const screenshotCalls: Array<{ path: string; fullPage: boolean }> = [];
    const mouseMoves: Array<{ x: number; y: number }> = [];
    const keyPresses: string[] = [];
    const summary = {
      uiChecks: [],
      screenshots: [],
    };
    const panelRegistryById = new Map([
      [
        "performance.risk.snapshot",
        {
          screenshotName: "performance-risk-live.png",
          route: "/performance?portfolioId={portfolio_id}&mode=risk&benchmark={benchmarkCode}",
        },
      ],
    ]);

    try {
      const helpers = createBrowserValidationHelpers({
        outputDir: tempDir,
        summary,
        portfolioId: "PB_SG_GLOBAL_BAL_001",
        benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
        canonicalAsOfDate: "2026-04-10",
        timeoutMs: 60000,
        panelRegistryById,
      });

      expect(
        helpers.resolveRegistryRoute(
          "/performance?portfolioId={portfolio_id}&mode=risk&benchmark={benchmarkCode}"
        )
      ).toBe(
        "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk&benchmark=BMK_PB_GLOBAL_BALANCED_60_40"
      );
      expect(
        helpers.resolveRegistryRoute("/book?asOfDate={canonicalAsOfDate}"),
      ).toBe("/book?asOfDate=2026-04-10");
      for (const panelId of [
        "portfolio.summary",
        "reporting.report_centre",
        "performance.summary",
        "performance.risk.snapshot",
        "dpm.outcome_review",
      ]) {
        const panel = DEFAULT_PANEL_REGISTRY.panels.find(
          (candidate) => candidate.panelId === panelId,
        );
        expect(panel, `${panelId} must remain registered`).toBeDefined();
        expect(helpers.resolveRegistryRoute(panel!.route)).not.toMatch(/\{[^}]+\}/);
      }

      await helpers.screenshotRegisteredPanel(
        {
          mouse: {
            move: async (x: number, y: number) => {
              mouseMoves.push({ x, y });
            },
          },
          keyboard: {
            press: async (key: string) => {
              keyPresses.push(key);
            },
          },
          screenshot: async ({ path, fullPage }: { path: string; fullPage: boolean }) => {
            screenshotCalls.push({ path, fullPage });
          },
        },
        "performance.risk.snapshot"
      );

      expect(mouseMoves).toEqual([{ x: 1, y: 1 }]);
      expect(keyPresses).toEqual(["Escape"]);
      expect(screenshotCalls).toEqual([
        {
          path: join(tempDir, "performance-risk-live.png"),
          fullPage: true,
        },
      ]);
      expect(summary.screenshots).toEqual([
        expect.objectContaining({
          name: "performance-risk-live.png",
          panel: "performance.risk.snapshot",
          route: "/performance?portfolioId=PB_SG_GLOBAL_BAL_001&mode=risk&benchmark=BMK_PB_GLOBAL_BALANCED_60_40",
          portfolioId: "PB_SG_GLOBAL_BAL_001",
          benchmarkCode: "BMK_PB_GLOBAL_BALANCED_60_40",
          asOfDate: "2026-04-10",
          state: "demo_ready",
        }),
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
