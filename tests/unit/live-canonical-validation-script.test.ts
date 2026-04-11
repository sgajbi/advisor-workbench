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
    const calculationModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "calculation-sanity.mjs"),
      "utf8"
    );

    expect(script).toContain("assertPerformanceCalculationSanity");
    expect(script).toContain("assertRiskCalculationSanity");
    expect(script).toContain("/performance/details?");
    expect(script).toContain("/risk/concentration?");
    expect(script).toContain("/risk/drawdown?");
    expect(script).toContain("/risk/rolling?");
    expect(script).toContain("/risk/attribution?");
    expect(calculationModule).toContain("calculationChecks");
    expect(calculationModule).toContain("Contribution total does not reconcile with net portfolio return");
    expect(calculationModule).toContain("Historical risk attribution residual is too high");
  });

  it("surfaces governed canonical contract metadata in live validation evidence", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const contractModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "contract-metadata.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain('from "./validation/contract-metadata.mjs"');
    expect(script).toContain("loadCanonicalContractMetadata");
    expect(script).toContain("canonicalContract");
    expect(contractModule).toContain("DEFAULT_CANONICAL_CONTRACT");
    expect(contractModule).toContain("canonical-front-office-demo-data-contract.json");
    expect(contractModule).toContain("LOTUS_PLATFORM_REPO");
    expect(contractModule).toContain('sourcePath: "deterministic-fallback"');
    expect(runbook).toContain("contract identity and version");
    expect(runbook).toContain("RFC-0076");
  });

  it("loads the governed RFC-0077 panel registry for panel ownership and screenshot policy", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const contractModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "contract-metadata.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain('from "./validation/contract-metadata.mjs"');
    expect(script).toContain("loadWorkbenchPanelRegistryMetadata");
    expect(script).toContain("panelRegistryById");
    expect(contractModule).toContain("DEFAULT_PANEL_REGISTRY");
    expect(contractModule).toContain("workbench-panel-registry.json");
    expect(contractModule).toContain("requiredSupportState");
    expect(contractModule).toContain("owningService");
    expect(script).toContain("Panel classification");
    expect(contractModule).toContain("allowedStates");
    expect(script).not.toContain("assertRegionHasButtons");
    expect(runbook).toContain("RFC-0077");
    expect(runbook).toContain("panel registry");
  });

  it("fails when governed panel ownership or supportability drifts from the registry", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const calculationModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "calculation-sanity.mjs"),
      "utf8"
    );

    expect(script).toContain("supportabilityChecks");
    expect(script).toContain("assertPanelSupportabilityAlignment");
    expect(script).toContain("reported owner");
    expect(script).toContain("registry owner");
    expect(script).toContain("requiredSupportState");
    expect(script).toContain("ownerFollowUpRfc");
    expect(script).toContain("lotus-performance");
    expect(calculationModule).toContain("performance.evidence");
  });

  it("records explicit panel support classifications for demo evidence", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const calculationModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "calculation-sanity.mjs"),
      "utf8"
    );

    expect(script).toContain("panelClassifications");
    expect(script).toContain("recordPanelClassification");
    expect(script).toContain("assertNoUnsupportedBlankPanels");
    expect(script).toContain("portfolio.summary");
    expect(calculationModule).toContain("performance.analysis.attribution");
    expect(calculationModule).toContain("performance.evidence");
    expect(calculationModule).toContain("performance.risk.historical_attribution");
    expect(calculationModule).toContain("performance.risk.snapshot");
    expect(script).toContain("supported_blank");
  });

  it("records demo screenshot evidence with registry-governed names, routes, and absolute paths", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const contractModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "contract-metadata.mjs"),
      "utf8"
    );
    const evidenceWriter = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "evidence-summary-writer.mjs"),
      "utf8"
    );
    const browserWorkflowModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "browser-workflows.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain("canonicalAsOfDate");
    expect(script).toContain("createBrowserValidationHelpers");
    expect(browserWorkflowModule).toContain("screenshotRegisteredPanel");
    expect(browserWorkflowModule).toContain("resolveRegistryRoute");
    expect(contractModule).toContain('panelId: "performance.risk.snapshot"');
    expect(contractModule).toContain('screenshotName: "performance-risk-live.png"');
    expect(browserWorkflowModule).toContain("panel: panelId");
    expect(browserWorkflowModule).toContain('state: "truthfully_degraded"');
    expect(browserWorkflowModule).toContain("path: target");
    expect(evidenceWriter).toContain("SHOT-INDEX.md");
    expect(script).toContain("writeShotIndex");
    expect(runbook).toContain("ScreenshotDirectory");
    expect(runbook).toContain("structured screenshot evidence");
    expect(runbook).toContain("SHOT-INDEX.md");
  });
});
