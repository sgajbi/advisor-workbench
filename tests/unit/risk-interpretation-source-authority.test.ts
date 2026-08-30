import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("Risk Review interpretation authority", () => {
  it("does not recreate mandate or risk severity from browser-owned numeric thresholds", () => {
    const viewModel = readSource(
      "src/apps/performance/risk-workspace-view-model.ts",
    );

    for (const retiredHelper of [
      "resolveSnapshotPosture",
      "resolveDrawdownSeverity",
      "resolveConcentrationBand",
      "resolveConcentrationIndexMarker",
      "resolveWeightIndicatorTone",
      "buildConcentrationPostureModel",
    ]) {
      expect(viewModel).not.toContain(retiredHelper);
    }

    expect(viewModel).not.toContain("RiskConcentrationPostureState");
    expect(viewModel).not.toContain("PerformanceRiskConcentrationScale");
  });

  it("renders source-owned mandate states and prevents retired browser policy returning", () => {
    const comparison = readSource(
      "src/apps/performance/components/risk/risk-mandate-comparison.tsx",
    );
    const projection = readSource(
      "src/apps/performance/risk-mandate-comparison-view-model.ts",
    );

    expect(comparison).toContain('data-testid="risk-mandate-comparison"');
    expect(comparison).toContain(
      '`risk-mandate-constraint-${sourceKey}-${constraint.key}`',
    );
    expect(comparison).toContain("data-mandate-constraint-source");
    expect(comparison).toContain("data-mandate-state");
    expect(projection).toContain("constraint.headroom");
    expect(projection).toContain("constraint.state");
    expect(projection).not.toMatch(/limit\.(maximum|minimum)\s*[-+]\s*measure\.value/);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "src/apps/performance/components/risk/risk-policy-boundary.tsx",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        resolve(
          process.cwd(),
          "src/apps/performance/components/risk/risk-concentration-scale.tsx",
        ),
      ),
    ).toBe(false);
  });

  it("keeps canonical browser proof on exact source states, stable evidence, and reflow", () => {
    const browserWorkflow = readSource(
      "scripts/live/validation/browser-workflows.mjs",
    );

    expect(browserWorkflow).toContain('name: "Risk executive overview"');
    expect(browserWorkflow).toContain('getByTestId("risk-mandate-comparison")');
    expect(browserWorkflow).toContain('"data-mandate-availability"');
    expect(browserWorkflow).toContain('"risk-mandate-comparison"');
    expect(browserWorkflow).toContain(
      "buildRiskMandateSourceRenderRows(mandateComparisons)",
    );
    expect(browserWorkflow).toContain("assertExactSourceRenderProof({");
    expect(browserWorkflow).toContain('screen: "Risk review"');
    expect(browserWorkflow).toContain(
      'element.getAttribute("data-mandate-state")',
    );
    expect(browserWorkflow).toContain(
      "for (const expected of expectedMandateStates)",
    );
    expect(browserWorkflow).toContain(
      '`risk-mandate-constraint-${expected.source}-${expected.identity}`',
    );
    expect(browserWorkflow).not.toContain(
      'mandateComparison.getByText("Cash allocation", { exact: true })',
    );
    const sourceAdapter = readSource(
      "scripts/live/validation/risk-mandate-proof.mjs",
    );
    expect(sourceAdapter).toContain(
      "published by both ${previousSource} and ${source}",
    );
    expect(browserWorkflow).toContain('"Realised volatility"');
    expect(browserWorkflow).toContain('"Source coverage"');
    expect(browserWorkflow).toContain("for (const width of [1440, 1024, 519])");
    expect(browserWorkflow).toContain("Risk review creates page-level horizontal scrolling");

    const browserRegression = readSource(
      "tests/e2e/performance-workbench.smoke.spec.ts",
    );
    expect(browserRegression).toContain(
      "risk-mandate-comparison-${viewport.name}.png",
    );
    expect(browserRegression).not.toContain("issue-875-mandate-comparison");

    const fixtureGateway = readSource(
      "tests/e2e/performance-fixture-gateway.ts",
    );
    expect(fixtureGateway).toContain("(?:performance|risk)");
    expect(fixtureGateway).toContain("buildFixtureRiskSummary");
    expect(fixtureGateway).toContain("buildSummaryMandateComparisonFixture");
  });
});
