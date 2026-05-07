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
    expect(script).toContain("[int]$Attempts = 8");
    expect(script).toContain("retrying ($attempt/$Attempts)");
    expect(script).toContain("after $Attempts attempts");
    expect(script).toContain("http://manage.dev.lotus/api/v1/rebalance/supportability/summary");
    expect(script).toContain("lotus-manage supportability summary");
    expect(script).not.toContain("http://manage.dev.lotus/integration/capabilities");
  });

  it("documents stable live-validation artifact ownership", () => {
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(runbook).toContain("runs the browser validator from the `lotus-workbench` repository root");
    expect(runbook).toContain("Browser validation failures must fail the PowerShell command");
    expect(runbook).toContain("stale summaries");
    expect(runbook).toContain("-CleanCoreState");
    expect(runbook).toContain("1000`-portfolio load scenario");
    expect(runbook).toContain("Docker is the default for every canonical front-office app");
    expect(runbook).toContain("-LocalApps workbench,gateway,manage");
    expect(runbook).toContain("live:stack:up:workbench-local");
    expect(runbook).toContain("live:stack:up:core-manage");
    expect(runbook).toContain("core seed in ingest-only mode");
    expect(runbook).toContain("Use it only for API-level RFC proof");
    expect(runbook).toContain("GET /api/v1/rebalance/supportability/summary");
  });

  it("uses strategic lotus-manage supportability during live proof without stale capability probes", () => {
    const validationScript = readFileSync(
      join(process.cwd(), "scripts", "live", "Validate-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );
    const browserValidator = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );

    for (const script of [validationScript, browserValidator]) {
      expect(script).toContain("http://manage.dev.lotus/api/v1/rebalance/supportability/summary");
      expect(script).toContain("lotus-manage supportability summary");
      expect(script).not.toContain("http://manage.dev.lotus/integration/capabilities");
      expect(script).not.toContain("lotus-manage integration capabilities");
    }

    expect(browserValidator).toContain("readSupportabilityState");
    expect(browserValidator).toContain("DPM rebalance-wave preview did not return ready manage supportability");
    expect(browserValidator).toContain("gatewayModuleHealth.lotus_manage");
    expect(browserValidator).toContain("/api/v1/dpm/command-center?");
    expect(browserValidator).toContain("DPM command-center summary");
    expect(browserValidator).toContain("/api/v1/dpm/command-center/exceptions?");
    expect(browserValidator).toContain("/api/v1/dpm/command-center/mandates/by-portfolio/");
    expect(browserValidator).toContain("fetchOptionalJson");
    expect(browserValidator).toContain('status: "seed_gap"');
    expect(browserValidator).toContain(
      "/api/v1/dpm/command-center/mandates/${encodeURIComponent(mandateId)}/health"
    );
    expect(browserValidator).not.toContain("gatewayManageFeatures");
  });

  it("starts the governed seed with the canonical RFC-0075 as-of date", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "Start-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );

    expect(script).toContain("[int]$SeedWaitSeconds = 900");
    expect(script).toContain('[string]$LotusAiEnvFile = ".env.example"');
    expect(script).toContain("[string[]]$LocalApps = @()");
    expect(script).toContain("function Test-LocalApp");
    expect(script).toContain("function Invoke-ComposeUp");
    expect(script).toContain("function Start-LocalUvicornService");
    expect(script).toContain("function Start-CanonicalManage");
    expect(script).toContain("function Start-DirectIngress");
    expect(script).toContain("function Invoke-CanonicalCoreSeed");
    expect(script).toContain("Using lotus-ai env file for canonical proof");
    expect(script).toContain("[switch]$CleanCoreState");
    expect(script).toContain("[switch]$CoreManageOnly");
    expect(script).toContain("Core/manage proof mode enabled");
    expect(script).toContain("param([switch]$IngestOnly)");
    expect(script).toContain("--ingest-only");
    expect(script).toContain("$global:LASTEXITCODE = 0");
    expect(script).toContain("Command failed with exit code $LASTEXITCODE");
    expect(script).toContain("Resetting lotus-core Docker state before canonical reseed");
    expect(script).toContain("docker compose down -v --remove-orphans");
    expect(script).toContain("function Stop-HostProcessOnPort");
    expect(script).toContain("Stopping stale $Description process on :$Port");
    expect(script).toContain("Leaving Docker-owned $Description listener on :$Port");
    expect(script).toContain("$previousBffBaseUrl = $env:BFF_BASE_URL");
    expect(script).toContain('$env:BFF_BASE_URL = "http://gateway.dev.lotus"');
    expect(script).toContain("$previousNextTelemetryDisabled = $env:NEXT_TELEMETRY_DISABLED");
    expect(script).toContain('Test-LocalApp "workbench"');
    expect(script).toContain("function Invoke-WithProcessEnvironment");
    expect(script).toContain("$localManageEnvironment = @{");
    expect(script).toContain('LOTUS_MANAGE_HOST_PORT = "8001"');
    expect(script).toContain('DPM_CAP_INPUT_MODE_PORTFOLIO_ID_ENABLED = "true"');
    expect(script).toContain('DPM_STATEFUL_CORE_SOURCING_ENABLED = "true"');
    expect(script).toContain('DPM_CORE_BASE_URL = "http://core-control.dev.lotus"');
    expect(script).toContain('$dockerManageEnvironment["DPM_CORE_BASE_URL"] = "http://host.docker.internal:8202"');
    expect(script).toContain("Invoke-WithProcessEnvironment -Environment $localManageEnvironment");
    expect(script).toContain("Invoke-ComposeUp $manageRepo $dockerManageEnvironment");
    expect(script).toContain('Invoke-ComposeUp $workbenchRepo @{ BFF_BASE_URL = "http://host.docker.internal:8100" }');
    expect(script).not.toContain("Workbench already responding on :3000");
    expect(script).toContain("--portfolio-id $PortfolioId");
    expect(script).toContain("--end-date 2026-04-10");
    expect(script).toContain("--benchmark-start-date 2025-01-06");
    expect(script).toContain("--wait-seconds $SeedWaitSeconds");
    expect(script).toContain("[string]$ScreenshotDirectory");
    expect(script).toContain("ScreenshotDirectory = $ScreenshotDirectory");
  });

  it("covers the complete front-office Docker app set in canonical automation", () => {
    const startScript = readFileSync(
      join(process.cwd(), "scripts", "live", "Start-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );
    const stopScript = readFileSync(
      join(process.cwd(), "scripts", "live", "Stop-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );
    const validationScript = readFileSync(
      join(process.cwd(), "scripts", "live", "Validate-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );
    const browserValidator = readFileSync(
      join(process.cwd(), "scripts", "live", "validate-canonical-workbench-live.mjs"),
      "utf8"
    );
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");

    for (const service of ["lotus-archive", "lotus-render", "lotus-gateway", "lotus-workbench"]) {
      expect(startScript).toContain(service);
      expect(stopScript).toContain(service);
    }
    expect(stopScript).toContain("Stop-ListenersOnPorts @(3000, 8001, 8100, 8111, 8150, 8310)");
    expect(stopScript).toContain("Leaving Docker-owned listener");
    expect(validationScript).toContain('Test-CanonicalHost "archive.dev.lotus"');
    expect(validationScript).toContain('Test-CanonicalHost "render.dev.lotus"');
    expect(validationScript).toContain('Test-Endpoint "http://archive.dev.lotus/health/ready"');
    expect(validationScript).toContain('Test-Endpoint "http://render.dev.lotus/health/ready"');
    expect(browserValidator).toContain('checkDns(summary, "archive.dev.lotus")');
    expect(browserValidator).toContain('checkDns(summary, "render.dev.lotus")');
    expect(packageJson).toContain('"live:stack:up:workbench-local"');
    expect(packageJson).toContain('"live:stack:up:core-manage"');
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
    expect(script).toContain('from "./validation/workflow-pack-proof.mjs"');
    expect(script).toContain("validateAdvisorBriefWorkflowPackReviewChain");
    expect(script).toContain("workflowPackChecks.push");
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
    const panelGovernanceModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "panel-governance.mjs"),
      "utf8"
    );
    const runbook = readFileSync(
      join(process.cwd(), "docs", "operations", "canonical-front-office-local-runtime.md"),
      "utf8"
    );

    expect(script).toContain('from "./validation/contract-metadata.mjs"');
    expect(script).toContain("loadWorkbenchPanelRegistryMetadata");
    expect(panelGovernanceModule).toContain("panelRegistryById");
    expect(contractModule).toContain("DEFAULT_PANEL_REGISTRY");
    expect(contractModule).toContain("workbench-panel-registry.json");
    expect(contractModule).toContain("requiredSupportState");
    expect(contractModule).toContain("owningService");
    expect(panelGovernanceModule).toContain("Panel classification");
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
    const panelGovernanceModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "panel-governance.mjs"),
      "utf8"
    );

    expect(panelGovernanceModule).toContain("supportabilityChecks");
    expect(script).toContain("createPanelGovernance");
    expect(panelGovernanceModule).toContain("assertPanelSupportabilityAlignment");
    expect(panelGovernanceModule).toContain("reported owner");
    expect(panelGovernanceModule).toContain("registry owner");
    expect(panelGovernanceModule).toContain("requiredSupportState");
    expect(panelGovernanceModule).toContain("ownerFollowUpRfc");
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
    const panelGovernanceModule = readFileSync(
      join(process.cwd(), "scripts", "live", "validation", "panel-governance.mjs"),
      "utf8"
    );

    expect(panelGovernanceModule).toContain("panelClassifications");
    expect(script).toContain("createPanelGovernance");
    expect(panelGovernanceModule).toContain("recordPanelClassification");
    expect(panelGovernanceModule).toContain("assertNoUnsupportedBlankPanels");
    expect(script).toContain("portfolio.summary");
    expect(calculationModule).toContain("performance.analysis.attribution");
    expect(calculationModule).toContain("performance.evidence");
    expect(calculationModule).toContain("performance.risk.historical_attribution");
    expect(calculationModule).toContain("performance.risk.snapshot");
    expect(panelGovernanceModule).toContain("supported_blank");
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
    expect(browserWorkflowModule).toContain("validateDpmCommandCenterPanel");
    expect(browserWorkflowModule).toContain("DPM Command Center");
    expect(browserWorkflowModule).toContain("DPM attention queue");
    expect(browserWorkflowModule).toContain("DPM mandate health dimensions");
    expect(script).toContain("Generate DPM proof-pack evidence");
    expect(script).toContain("workbench-proof-pack");
    expect(script).toContain("workbench-proof-pack-operator");
    expect(script).toContain("Workbench PM generated proof pack from Gateway-backed rebalance run.");
    expect(script).toContain("extractWorkbenchRebalanceRunId");
    expect(script).toContain("isReviewableProofPackState");
    expect(script).toContain("recordMapCount");
    expect(script).toContain("sourceEvidenceCount");
    expect(script).toContain("extractWorkflowPackRunId");
    expect(script).toContain("PENDING_REVIEW");
    expect(script).toContain("DPM proof-pack evidence returned no reviewable proof-pack sections.");
    expect(script).toContain("DPM proof-pack AI PM memo");
    expect(script).toContain("/ai-pm-memo");
    expect(script).toContain("DPM proof-pack AI PM memo did not return lotus-ai source authority.");
    expect(script).toContain("DPM proof-pack AI PM memo returned no workflow-pack run reference.");
    expect(script).toContain("Gateway workbench overview returned no manage rebalance-run reference");
    expect(script).toContain("source_type: \"REBALANCE_RUN\"");
    expect(browserWorkflowModule).toContain("screenshotRegisteredPanel");
    expect(browserWorkflowModule).toContain("Proof-pack generation completed through Gateway.");
    expect(browserWorkflowModule).toContain("AI PM Memo");
    expect(browserWorkflowModule).toContain("/^PM memo /");
    expect(browserWorkflowModule).toContain("resolveRegistryRoute");
    expect(browserWorkflowModule).toContain("assertRailModeActive");
    expect(browserWorkflowModule).toContain("tableByExactLabel");
    expect(browserWorkflowModule).toContain("workbenchPanelByClass");
    expect(browserWorkflowModule).toContain('workbenchPanelByClass(page, "outcome-review-panel")');
    expect(browserWorkflowModule).toContain('workbenchPanelByClass(page, "proof-pack-panel")');
    expect(browserWorkflowModule).toContain("requireVisible");
    expect(browserWorkflowModule).toContain("Observation Trail");
    expect(browserWorkflowModule).toContain('outcomeReviewPanel.getByText("Report Input", { exact: true })');
    expect(browserWorkflowModule).toContain("performAcceptReviewActionProof");
    expect(browserWorkflowModule).toContain("Accept Brief");
    expect(browserWorkflowModule).toContain("hasAcceptedAdvisorBriefReviewPosture");
    expect(browserWorkflowModule).toContain("Supportability ACTION REQUIRED");
    expect(browserWorkflowModule).toContain("Supportability READY");
    expect(browserWorkflowModule).toContain("/^Performance Overview/");
    expect(browserWorkflowModule).toContain("/^Performance Analysis/");
    expect(browserWorkflowModule).toContain('"Asset Class attribution table"');
    expect(browserWorkflowModule).not.toContain('getByRole("group", { name: "Post-Trade Outcome Review"');
    expect(browserWorkflowModule).not.toContain('getByRole("group", { name: "Proof-Pack Evidence"');
    expect(browserWorkflowModule).not.toContain('getByRole("tab", { name: "Summary"');
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
    expect(runbook).toContain("workflowPackChecks");
    expect(runbook).toContain("ACCEPT`, `REVISE`, and");
  });
});
