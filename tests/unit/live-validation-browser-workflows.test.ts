import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as browserWorkflowModule from "../../scripts/live/validation/browser-workflows.mjs";
import { DEFAULT_PANEL_REGISTRY } from "../../scripts/live/validation/contract-metadata.mjs";

const {
  buildReportCentreProofPosture,
  classifyAttributionDetailEvidence,
  classifyPerformanceEvidenceScreenshotState,
  classifyRegisteredPanelScreenshotState,
  createBrowserValidationHelpers,
  classifyAdvisorBriefAcceptProofPosture,
  hasAcceptedAdvisorBriefReviewPosture,
  hasRecordedAdvisorBriefAcceptProof,
  navigateForBusinessProof,
  resolveHighCashIdeaCandidateId,
  validateAdvisorBriefPanel,
  validateAdvisoryJourneyScreens,
} = browserWorkflowModule as unknown as {
  buildReportCentreProofPosture: (pdfOutputReady: boolean) => {
    panelState: "partial";
    outputFormat: "json" | "pdf";
    pdfOutputState: "ready" | "unavailable";
    reason: string;
  };
  classifyAttributionDetailEvidence: (counts: {
    detailTableCount: number;
    summaryTableCount: number;
    partialFallbackCount: number;
    readyEmptyStateCount: number;
  }) =>
    | "detail_rows"
    | "summary_fallback"
    | "governed_partial_fallback"
    | "ready_empty_state";
  classifyPerformanceEvidenceScreenshotState: (
    assuranceState: string | null,
  ) => "demo_ready" | "truthfully_degraded";
  classifyRegisteredPanelScreenshotState: (
    panelState: string | null,
    requiredSupportState: string | null,
  ) => "demo_ready" | "truthfully_degraded";
  createBrowserValidationHelpers: typeof import("../../scripts/live/validation/browser-workflows.mjs").createBrowserValidationHelpers;
  classifyAdvisorBriefAcceptProofPosture: (
    text: string,
    expectedReviewer: string,
  ) =>
    | "source-confirmed-existing-action"
    | "accepted-by-another-reviewer"
    | "review-action-unavailable"
    | "review-action-available";
  hasAcceptedAdvisorBriefReviewPosture: (text: string) => boolean;
  hasRecordedAdvisorBriefAcceptProof: (
    text: string,
    expectedReviewer: string,
  ) => boolean;
  navigateForBusinessProof: (
    page: {
      goto: (
        route: string,
        options: { timeout: number; waitUntil: string },
      ) => Promise<{ ok: () => boolean; status: () => number } | null>;
    },
    route: string,
    options: { timeout: number },
  ) => Promise<{ ok: () => boolean; status: () => number }>;
  resolveHighCashIdeaCandidateId: (
    candidateHref: string | null,
    workbenchBaseUrl: string,
  ) => string;
  validateAdvisorBriefPanel: (...args: unknown[]) => Promise<void>;
  validateAdvisoryJourneyScreens: (...args: unknown[]) => Promise<void>;
};

describe("live validation browser workflow helpers", () => {
  it("navigates on document readiness and preserves the caller timeout", async () => {
    const response = { ok: () => true, status: () => 200 };
    const goto = vi.fn().mockResolvedValue(response);

    await expect(
      navigateForBusinessProof(
        { goto },
        "http://workbench.dev.lotus/book?asOfDate=2026-04-10",
        { timeout: 60_000 },
      ),
    ).resolves.toBe(response);
    expect(goto).toHaveBeenCalledWith(
      "http://workbench.dev.lotus/book?asOfDate=2026-04-10",
      { timeout: 60_000, waitUntil: "domcontentloaded" },
    );
  });

  it.each([
    ["missing document response", null, /returned no document response/],
    [
      "source HTTP failure",
      { ok: () => false, status: () => 503 },
      /failed.*HTTP 503/,
    ],
  ])("fails closed for %s", async (_case, response, expectedError) => {
    const goto = vi.fn().mockResolvedValue(response);

    await expect(
      navigateForBusinessProof(
        { goto },
        "http://workbench.dev.lotus/book?asOfDate=2026-04-10",
        { timeout: 60_000 },
      ),
    ).rejects.toThrow(expectedError);
  });

  it("routes canonical navigation through the governed readiness helper", () => {
    const source = readFileSync(
      join(process.cwd(), "scripts/live/validation/browser-workflows.mjs"),
      "utf8",
    );

    expect(source.match(/page\.goto\(/g)).toHaveLength(1);
    expect(source).not.toContain("networkidle");
  });

  it("counts semantic list items whether their role is implicit or explicit", () => {
    const source = createBrowserValidationHelpers.toString();

    expect(source).toContain('locator.getByRole("listitem").count()');
    expect(source).not.toContain("locator.locator('[role=\"listitem\"]')");
  });

  it("waits for the source-backed Portfolio Review decision brief", () => {
    const source = browserWorkflowModule.validatePortfolioPanels.toString();

    expect(source).toContain('name: "Review context"');
    expect(source).toContain("reviewContext.getByText(portfolioId");
    expect(source).toContain('reviewContext.getByText("Mandate"');
    expect(source).toContain('reviewContext.getByText("Business date"');
    expect(source).not.toContain("Balanced Mandate");
    expect(source).toContain('".workbench-decision-brief-primary h3"');
    expect(source).toContain('"Portfolio readiness"');
    expect(source).toContain("/^Status (Ready|Partial|Unavailable)$/");
    expect(source).toContain('"Reporting coverage"');
  });

  it("uses the governed live timeout while attribution history settles", () => {
    const source = browserWorkflowModule.validatePerformanceAnalysisPanel.toString();

    expect(source).toMatch(
      /not\.toHaveAttribute\(\s*"data-state",\s*"loading",\s*\{ timeout: timeoutMs \}/,
    );
    expect(source).toContain('attributionTrendPosture === "error"');
    expect(source).toContain("Attribution history could not be refreshed");
    expect(source).toContain('name: "Refresh history"');
    expect(source).toContain("Attribution history exact-selection recovery");
  });

  it.each([
    ["ready", "demo_ready"],
    ["attention", "truthfully_degraded"],
    ["incomplete", "truthfully_degraded"],
    ["unavailable", "truthfully_degraded"],
    [null, "truthfully_degraded"],
  ] as const)("classifies %s evidence screenshot posture as %s", (state, expected) => {
    expect(classifyPerformanceEvidenceScreenshotState(state)).toBe(expected);
  });

  it.each([
    ["ready", "ready", "demo_ready"],
    ["partial", "partial", "demo_ready"],
    ["partial", "ready", "truthfully_degraded"],
    [null, "ready", "truthfully_degraded"],
  ] as const)(
    "classifies panel state %s against required state %s as %s",
    (panelState, requiredState, expected) => {
      expect(classifyRegisteredPanelScreenshotState(panelState, requiredState)).toBe(expected);
    }
  );

  it.each([
    [{ detailTableCount: 1, summaryTableCount: 0, partialFallbackCount: 0, readyEmptyStateCount: 0 }, "detail_rows"],
    [{ detailTableCount: 0, summaryTableCount: 1, partialFallbackCount: 0, readyEmptyStateCount: 0 }, "summary_fallback"],
    [{ detailTableCount: 0, summaryTableCount: 0, partialFallbackCount: 1, readyEmptyStateCount: 0 }, "governed_partial_fallback"],
    [{ detailTableCount: 0, summaryTableCount: 0, partialFallbackCount: 0, readyEmptyStateCount: 1 }, "ready_empty_state"],
  ] as const)("classifies attribution detail evidence as %s", (counts, expected) => {
    expect(classifyAttributionDetailEvidence(counts)).toBe(expected);
  });

  it("rejects attribution detail without rows or a governed fallback", () => {
    expect(() =>
      classifyAttributionDetailEvidence({
        detailTableCount: 0,
        summaryTableCount: 0,
        partialFallbackCount: 0,
        readyEmptyStateCount: 0,
      }),
    ).toThrow("neither source rows nor a governed fallback state");
  });

  it("accepts only business-labelled advisor-brief review posture with source audit evidence", () => {
    expect(
      hasAcceptedAdvisorBriefReviewPosture(
        "Human Review Accepted for internal use Supportability READY Review recorded by advisor_1 Review recorded 2026-04-21T03:22:00Z"
      )
    ).toBe(true);
    expect(
      hasAcceptedAdvisorBriefReviewPosture(
        "AI Review Supportability ACTION REQUIRED ACCEPTED partial evidence remains visible"
      )
    ).toBe(false);
    expect(
      hasAcceptedAdvisorBriefReviewPosture(
        "Human Review Accepted for internal use Supportability READY Review audit details not published"
      )
    ).toBe(false);
    expect(
      hasAcceptedAdvisorBriefReviewPosture(
        "Human Review Accepted for internal use Supportability READY Review recorded by advisor_1"
      )
    ).toBe(false);
    expect(
      hasAcceptedAdvisorBriefReviewPosture("AI Review AWAITING REVIEW Supportability ACTION REQUIRED")
    ).toBe(false);
  });

  it("reuses only the exact source-recorded browser acceptance on canonical reruns", () => {
    const recordedPosture =
      "Human Review Accepted for internal use Supportability READY Review recorded by live.validator.ui • Review recorded 2026-04-21T03:22:00Z";

    expect(
      hasRecordedAdvisorBriefAcceptProof(recordedPosture, "live.validator.ui"),
    ).toBe(true);
    expect(
      hasRecordedAdvisorBriefAcceptProof(recordedPosture, "another.reviewer"),
    ).toBe(false);
    expect(
      hasRecordedAdvisorBriefAcceptProof(
        "Human Review Accepted for internal use Supportability READY Review recorded by live.validator.ui2 • Review recorded 2026-04-21T03:22:00Z",
        "live.validator.ui",
      ),
    ).toBe(false);
    expect(
      hasRecordedAdvisorBriefAcceptProof(
        "Human Review Accepted for internal use Supportability READY Review audit details not published",
        "live.validator.ui",
      ),
    ).toBe(false);
  });

  it("classifies accepted runs owned by another reviewer for fallback reservation", () => {
    const exactPosture =
      "Human Review Accepted for internal use Supportability READY Review recorded by live.validator.ui • Review recorded 2026-04-21T03:22:00Z";
    const otherReviewerPosture =
      "Human Review Accepted for internal use Supportability READY Review recorded by live.validator.accept • Review recorded 2026-04-21T03:22:00Z";

    expect(
      classifyAdvisorBriefAcceptProofPosture(exactPosture, "live.validator.ui"),
    ).toBe("source-confirmed-existing-action");
    expect(
      classifyAdvisorBriefAcceptProofPosture(
        otherReviewerPosture,
        "live.validator.ui",
      ),
    ).toBe("accepted-by-another-reviewer");
    expect(
      classifyAdvisorBriefAcceptProofPosture(
        "Human Review Awaiting review Supportability ACTION REQUIRED",
        "live.validator.ui",
      ),
    ).toBe("review-action-available");
  });

  it.each([
    "Human Review Rejected Supportability FAILED Recorded by live.validator.reject • Recorded 2026-04-21T03:22:00Z",
    "Human Review Withdrawn Supportability FAILED Recorded by live.validator.withdraw • Recorded 2026-04-21T03:22:00Z",
    "Human Review Revision requested Supportability ACTION REQUIRED Recorded by live.validator.revise • Recorded 2026-04-21T03:22:00Z",
    "Human Review Superseded Supportability ACTION REQUIRED Recorded by live.validator.replace • Recorded 2026-04-21T03:22:00Z",
    "Human Review No review required Supportability READY",
    "Human Review Not reported Supportability ACTION REQUIRED",
  ])("reserves a fresh run when the current posture is not actionable: %s", (posture) => {
    expect(
      classifyAdvisorBriefAcceptProofPosture(posture, "live.validator.ui"),
    ).toBe("review-action-unavailable");
  });

  it("drives the current two-step Advisor Brief review workflow for canonical proof", () => {
    const source = validateAdvisorBriefPanel.toString();

    expect(source).toContain('getByLabel("Advisor brief human review")');
    expect(source).toContain("hasRecordedAdvisorBriefAcceptProof");
    expect(source).toContain("source-confirmed-existing-action");
    expect(source).toContain("accepted-by-another-reviewer");
    expect(source).toContain("review-action-unavailable");
    expect(source).toContain('detailBasis: "GROSS"');
    expect(source).toContain('chartFrequency: "quarterly"');
    expect(source).toContain("buildAdvisorBriefRoute(proofQuery)");
    expect(source).toContain('getByLabel("Review decision")');
    expect(source).toContain('reviewDecision.selectOption("ACCEPT")');
    expect(source).toContain('getByLabel("Reviewer reference")');
    expect(source).toContain('getByLabel("Review rationale")');
    expect(source).toContain('name: "Confirm acceptance"');
    expect(source).toContain("supportabilityRegion.textContent()");
    expect(source).toContain(
      "The brief was accepted for its permitted internal workflow use.",
    );
    expect(source).not.toContain("Advisor brief review actions");
    expect(source).not.toContain("not-currently-allowed");
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
    expect(source).toContain('{ name: "Attribution Detail", exact: true }');
    expect(source).toContain("governed_partial_fallback");
    expect(source).toContain("recordUiCheck");
    expect(source).toContain("const segmentSummaryTab = performanceDriversPanel.getByRole");
    expect(source).toContain("segmentSummaryTab.scrollIntoViewIfNeeded()");
    expect(source).toContain('performanceDriversPanel.locator(\'table[aria-label="Asset Class contribution table"]\')');
  });

  it("keeps Advisor Cockpit browser proof aligned to business-facing readiness language", () => {
    const source = validateAdvisoryJourneyScreens.toString();

    expect(source).toContain('getByText("Preparation Readiness", { exact: true })');
    expect(source).not.toContain('getByText("Supportability", { exact: true })');
  });

  it("binds Client Context proof to the exact Review Evidence heading", () => {
    const source = validateAdvisoryJourneyScreens.toString();

    expect(source).toContain(
      'getByRole("heading", { name: "Review Evidence", exact: true })',
    );
    expect(source).not.toContain('getByText("Review Evidence")');
  });

  it("derives the source-owned high-cash candidate identity from its queue link", () => {
    expect(
      resolveHighCashIdeaCandidateId(
        "/recommendations?mode=opportunities&candidateId=idea_high_cash_ef02ad8793485081",
        "http://workbench.dev.lotus",
      ),
    ).toBe("idea_high_cash_ef02ad8793485081");
  });

  it.each([
    null,
    "/recommendations?mode=opportunities",
    "/recommendations?candidateId=idea_high_cash_001",
    "/recommendations?candidateId=idea_concentration_ef02ad8793485081",
  ])("rejects a non-canonical Idea candidate queue link: %s", (candidateHref) => {
    expect(() =>
      resolveHighCashIdeaCandidateId(
        candidateHref,
        "http://workbench.dev.lotus",
      ),
    ).toThrow(/high-cash candidate/i);
  });

  it("binds Advisor Book proof to portfolio context rather than its display label", () => {
    const source = browserWorkflowModule.validateAdvisorBookPanel.toString();

    expect(source).toContain("navigateForBusinessProof");
    expect(source).toContain(
      'a[href*="portfolioId=${encodeURIComponent(portfolioId)}"]',
    );
    expect(source).not.toContain("getByText(portfolioId");
    expect(source).toContain('{ name: "Operational details" }');
    expect(source).not.toContain('{ name: "Support details" }');
  });

  it.each([
    {
      pdfOutputReady: false,
      expected: {
        panelState: "partial",
        outputFormat: "json",
        pdfOutputState: "unavailable",
        reason:
          "Structured report data is available while governed PDF creation remains unavailable; archive retention and client delivery remain separate controls.",
      },
    },
    {
      pdfOutputReady: true,
      expected: {
        panelState: "partial",
        outputFormat: "pdf",
        pdfOutputState: "ready",
        reason:
          "Structured report data and governed PDF creation are available for advisor review; archive retention and client delivery remain separate controls.",
      },
    },
  ])(
    "classifies source-backed PDF readiness when ready is $pdfOutputReady",
    ({ pdfOutputReady, expected }) => {
      expect(buildReportCentreProofPosture(pdfOutputReady)).toEqual(expected);
    },
  );

  it("observes the rendered PDF readiness control before exercising Report Centre", () => {
    const source = browserWorkflowModule.validateReportCentrePanel.toString();

    expect(source).toContain("structuredDataRadio).toBeVisible");
    expect(source).toContain("governedPdfRadio).toBeVisible");
    expect(source).toContain("governedPdfRadio.isDisabled()");
    expect(source).toContain("governedPdfRadio.check");
    expect(source).toContain("Governed document creation is available.");
    expect(source).toContain("PDF creation is temporarily unavailable");
    expect(source).toContain("return reportCentreProof");
    expect(source).toContain('name: "Report request readiness"');
    expect(source).toContain('"Reporting recorded the request."');
    expect(source).toContain("requestHistoryTable.isVisible()");
    expect(source).toContain('name: "Recent portfolio report request details"');
    expect(source).toContain("assertListHasItems");
    expect(source).toContain("assertTableHasRows");
    expect(source).not.toContain('"Report request recorded"');
    expect(source).not.toContain("screenshotRegisteredPanel");
  });

  it("resolves governed routes and records screenshot evidence with absolute paths", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "lotus-browser-workflow-"));
    const screenshotCalls: Array<{ path: string; fullPage: boolean }> = [];
    const mouseMoves: Array<{ x: number; y: number }> = [];
    const keyPresses: string[] = [];
    const summary = {
      uiChecks: [],
      screenshots: [],
      panelClassifications: [
        { panel: "performance.risk.snapshot", state: "partial" },
      ],
    };
    const panelRegistryById = new Map([
      [
        "performance.risk.snapshot",
        {
          screenshotName: "performance-risk-live.png",
          route: "/performance?portfolioId={portfolio_id}&mode=risk&benchmark={benchmarkCode}",
          requiredSupportState: "ready",
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
          state: "truthfully_degraded",
        }),
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
