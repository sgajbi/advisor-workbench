import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("canonical live validation script", () => {
  it("propagates browser validation failures to the caller", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "Validate-LotusFrontOfficeCanonical.ps1"),
      "utf8"
    );

    expect(script).toContain('node "$repoRoot\\\\scripts\\\\live\\\\validate-canonical-workbench-live.mjs"');
    expect(script).toContain("Push-Location $repoRoot");
    expect(script).toContain("Pop-Location");
    expect(script).toContain("if ($LASTEXITCODE -ne 0)");
    expect(script).toContain("Canonical Workbench browser validation failed");
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
});
