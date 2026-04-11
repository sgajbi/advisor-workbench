import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("canonical live validation script", () => {
  it("propagates browser validation failures to the caller", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "Validate-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );

    expect(script).toContain("$validatorArguments = @(");
    expect(script).toContain('"$repoRoot\\\\scripts\\\\live\\\\validate-canonical-workbench-live.mjs"');
    expect(script).toContain("& node @validatorArguments");
    expect(script).toContain("Push-Location $repoRoot");
    expect(script).toContain("Pop-Location");
    expect(script).toContain("if ($LASTEXITCODE -ne 0)");
    expect(script).toContain("Canonical Workbench browser validation failed");
    expect(script).toContain("[string]$ScreenshotDirectory");
    expect(script).toContain('"--output-dir"');
  });

  it("documents stable live-validation artifact ownership", () => {
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(runbook).toContain("runs the browser validator from the `lotus-workbench` repository root");
    expect(runbook).toContain("Browser validation failures must fail the PowerShell command");
    expect(runbook).toContain("stale summaries");
  });

  it("starts the governed seed with the canonical RFC-0075 as-of date", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "Start-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );

    expect(script).toContain("--portfolio-id $PortfolioId");
    expect(script).toContain("--end-date 2026-04-10");
    expect(script).toContain("--benchmark-start-date 2025-01-06");
    expect(script).toContain("[string]$ScreenshotDirectory");
    expect(script).toContain("ScreenshotDirectory = $ScreenshotDirectory");
  });

  it("asserts canonical performance and risk calculation sanity", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );

    expect(script).toContain("calculationChecks");
    expect(script).toContain("assertPerformanceCalculationSanity");
    expect(script).toContain("assertRiskCalculationSanity");
    expect(script).toContain("/performance/details?");
    expect(script).toContain("/risk/concentration?");
    expect(script).toContain("/risk/drawdown?");
    expect(script).toContain("/risk/rolling?");
    expect(script).toContain("/risk/attribution?");
    expect(script).toContain("Contribution total does not reconcile with net portfolio return");
    expect(script).toContain("Historical risk attribution residual is too high");
  });

  it("surfaces governed canonical contract metadata in live validation evidence", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain("DEFAULT_CANONICAL_CONTRACT");
    expect(script).toContain("loadCanonicalContractMetadata");
    expect(script).toContain("canonical-front-office-demo-data-contract.json");
    expect(script).toContain("LOTUS_PLATFORM_REPO");
    expect(script).toContain("canonicalContract");
    expect(script).toContain('sourcePath: "deterministic-fallback"');
    expect(runbook).toContain("contract identity and version");
    expect(runbook).toContain("RFC-0076");
  });

  it("loads the governed RFC-0077 panel registry for panel ownership and screenshot policy", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain("DEFAULT_PANEL_REGISTRY");
    expect(script).toContain("loadWorkbenchPanelRegistryMetadata");
    expect(script).toContain("workbench-panel-registry.json");
    expect(script).toContain("panelRegistryById");
    expect(script).toContain("Panel classification");
    expect(script).toContain("allowedStates");
    expect(script).not.toContain("assertRegionHasButtons");
    expect(runbook).toContain("RFC-0077");
    expect(runbook).toContain("panel registry");
  });

  it("records explicit panel support classifications for demo evidence", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );

    expect(script).toContain("panelClassifications");
    expect(script).toContain("recordPanelClassification");
    expect(script).toContain("assertNoUnsupportedBlankPanels");
    expect(script).toContain("portfolio.summary");
    expect(script).toContain("performance.analysis.attribution");
    expect(script).toContain("performance.evidence");
    expect(script).toContain("performance.risk.historical_attribution");
    expect(script).toContain("performance.risk.snapshot");
    expect(script).toContain("supported_blank");
  });

  it("records demo screenshot evidence with registry-governed names, routes, and absolute paths", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain("canonicalAsOfDate");
    expect(script).toContain("screenshotRegisteredPanel");
    expect(script).toContain("resolveRegistryRoute");
    expect(script).toContain("panelId: \"performance.risk.snapshot\"");
    expect(script).toContain("screenshotName: \"performance-risk-live.png\"");
    expect(script).toContain("panel: panelId");
    expect(script).toContain("state: \"truthfully_degraded\"");
    expect(script).toContain("path: target");
    expect(script).toContain("SHOT-INDEX.md");
    expect(script).toContain("writeShotIndex");
    expect(runbook).toContain("ScreenshotDirectory");
    expect(runbook).toContain("structured screenshot evidence");
    expect(runbook).toContain("SHOT-INDEX.md");
  });
});
