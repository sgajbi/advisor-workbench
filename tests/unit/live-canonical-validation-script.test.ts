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
    expect(script).toContain("risk.historical_attribution");
    expect(script).toContain("supported_blank");
  });

  it("records demo screenshot evidence with stable names, routes, and absolute paths", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain("canonicalAsOfDate");
    expect(script).toContain("portfolio-summary-live.png");
    expect(script).toContain("performance-risk-live.png");
    expect(script).toContain("performance-evidence-live.png");
    expect(script).toContain("route: `/performance?portfolioId=${portfolioId}&mode=risk`");
    expect(script).toContain("panel: \"performance.risk\"");
    expect(script).toContain("state: \"truthfully_degraded\"");
    expect(script).toContain("path: target");
    expect(script).toContain("SHOT-INDEX.md");
    expect(script).toContain("writeShotIndex");
    expect(runbook).toContain("ScreenshotDirectory");
    expect(runbook).toContain("structured screenshot evidence");
    expect(runbook).toContain("SHOT-INDEX.md");
  });
});
