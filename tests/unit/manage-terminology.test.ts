import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  MANAGE_HEALTH_DIMENSION_LABELS,
  MANAGE_REBALANCE_LABELS,
  MANAGE_WORKFLOW_LABELS,
} from "../../src/features/workbench/manage-terminology";

describe("manage terminology", () => {
  it("keeps user work, source records, data presence, and date scope distinct", () => {
    expect(MANAGE_WORKFLOW_LABELS).toEqual({
      portfolioManagementDecisions: "Portfolio management decisions",
      mandateReview: "Mandate review",
      mandateHealth: "Mandate health",
      attentionItems: "Attention items",
      openAttentionItems: "Open attention items",
      sourceExceptions: "Source exceptions",
      needsAttention: "Needs attention",
      dataAvailability: "Data availability",
      mandateHealthDimensions: "Mandate health dimensions",
      asOfDate: "As-of date",
    });
    expect(MANAGE_HEALTH_DIMENSION_LABELS).toEqual({
      dataAvailability: "Data availability",
      allocationDrift: "Allocation drift",
      riskDrift: "Risk drift",
      cashLiquidity: "Cash liquidity",
      taxAndTurnover: "Tax and turnover",
      eligibilityRestrictions: "Eligibility restrictions",
      performanceReview: "Performance review",
      reviewReadiness: "Review readiness",
      reviewCadence: "Review cadence",
      modelFreshness: "Model freshness",
      mandateConstraints: "Mandate constraints",
    });
  });

  it("names the campaign-to-wave hierarchy and support evidence consistently", () => {
    expect(MANAGE_REBALANCE_LABELS).toEqual({
      campaignLaunchDecision: "Campaign launch decision",
      campaignLaunchHistory: "Campaign launch history",
      campaignLifecycleEvidence: "Campaign lifecycle evidence",
      previewReadiness: "Preview readiness",
      launchReadiness: "Launch readiness",
      asOfDate: "As-of date",
      previewAsOfDate: "Preview as-of date",
      reviewedBy: "Reviewed by",
      previewReviewedBy: "Preview reviewed by",
      rebalanceWave: "Rebalance wave",
      rebalanceWaveReference: "Rebalance wave reference",
      supportReference: "Support reference",
      replayKey: "Replay key",
    });
  });

  it("does not retain the superseded heuristic exception queue or its global styles", () => {
    expect(
      existsSync(
        join(
          process.cwd(),
          "src",
          "features",
          "workbench",
          "components",
          "exception-queue.tsx",
        ),
      ),
    ).toBe(false);
    expect(
      readFileSync(
        join(process.cwd(), "src", "styles", "global", "legacy-global.css"),
        "utf8",
      ),
    ).not.toMatch(/\.exception-(?:list|item)\b/);
    expect(
      readFileSync(
        join(
          process.cwd(),
          "docs",
          "rfcs",
          "RFC-0013-workbench-exception-queue-and-advisor-summary.md",
        ),
        "utf8",
      ),
    ).toContain("SUPERSEDED BY SOURCE-BACKED MANDATE ATTENTION WORKLIST (#799)");
  });

  it("does not retain the superseded command-centre presentation path", () => {
    const removedPaths = [
      join(
        process.cwd(),
        "src",
        "features",
        "workbench",
        "components",
        "dpm-command-center-panel.tsx",
      ),
      join(
        process.cwd(),
        "src",
        "features",
        "workbench",
        "dpm-command-center-panel-helpers.ts",
      ),
    ];

    for (const removedPath of removedPaths) {
      expect(existsSync(removedPath)).toBe(false);
    }

    const stylesheetPaths = [
      join(
        process.cwd(),
        "src",
        "styles",
        "global",
        "legacy-feature-overrides.css",
      ),
      join(
        process.cwd(),
        "src",
        "styles",
        "global",
        "legacy-global.css",
      ),
      join(
        process.cwd(),
        "src",
        "features",
        "workbench",
        "manage-workspace.module.css",
      ),
    ];

    for (const stylesheetPath of stylesheetPaths) {
      expect(readFileSync(stylesheetPath, "utf8")).not.toMatch(
        /\.dpm-command-center-(?:panel|badge-row|action-row|reason-row|status-strip|summary-grid|metric-grid|subsection)\b/,
      );
    }

    expect(
      readFileSync(
        join(
          process.cwd(),
          "src",
          "features",
          "workbench",
          "dpm-command-center-api.ts",
        ),
        "utf8",
      ),
    ).not.toContain("runDpmCommandCenterMonitoring");
    expect(
      readFileSync(
        join(
          process.cwd(),
          "src",
          "features",
          "workbench",
          "components",
          "dpm-copilot-workspace.tsx",
        ),
        "utf8",
      ),
    ).toContain("requestDpmExceptionSummary");
  });

  it("keeps rebalance summary labels on the productive type contract", () => {
    const styles = readFileSync(
      join(
        process.cwd(),
        "src",
        "features",
        "workbench",
        "manage-workspace.module.css",
      ),
      "utf8",
    );
    const summaryLabelRule = styles.match(
      /\.manageScope :global\(\.rebalance-summary-cell span\),[\s\S]*?\n}/,
    )?.[0];

    expect(summaryLabelRule).toBeDefined();
    expect(summaryLabelRule).toContain("font-size: var(--type-label-size)");
    expect(summaryLabelRule).toContain("font-weight: var(--type-label-weight)");
    expect(summaryLabelRule).toContain("text-transform: none");
    expect(summaryLabelRule).not.toMatch(/font-size:\s*10px|font-weight:\s*700/);
  });
});
