import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("canonical observability evidence capture", () => {
  it("exposes a repeatable npm command for post-validation evidence capture", () => {
    const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");

    expect(packageJson).toContain('"live:evidence"');
    expect(packageJson).toContain("scripts/live/Capture-LotusFrontOfficeEvidence.ps1");
  });

  it("captures live stack evidence across DNS, APIs, metrics, logs, and screenshots", () => {
    const script = readFileSync(
      join(process.cwd(), "scripts", "live", "Capture-LotusFrontOfficeEvidence.ps1"),
      "utf8"
    );
    const screenshotScript = readFileSync(
      join(process.cwd(), "scripts", "live", "capture-observability-screenshots.mjs"),
      "utf8"
    );

    expect(script).toContain("output\\observability-live");
    expect(script).toContain("observability-evidence-manifest.json");
    expect(script).toContain("docker ps --format");
    expect(script).toContain("dns.json");
    expect(script).toContain("http://workbench.dev.lotus/api/metrics");
    expect(script).toContain("http://localhost:9190/api/v1/targets");
    expect(script).toContain("http://localhost:3300/api/health");
    expect(script).toContain("docker logs --tail");
    expect(script).toContain("lotus-archive-lotus-archive-1");
    expect(script).toContain("lotus-render-lotus-render-1");
    expect(script).toContain("capture-observability-screenshots.mjs");
    expect(screenshotScript).toContain("prometheus-targets");
    expect(screenshotScript).toContain("grafana-home");
    expect(screenshotScript).toContain("workbench-performance-evidence");
  });

  it("documents the wiki evidence workflow for offline demos and operations", () => {
    const wiki = readFileSync(join(process.cwd(), "wiki", "Observability-Evidence.md"), "utf8");
    const runbook = readFileSync(join(process.cwd(), "wiki", "Operations-Runbook.md"), "utf8");
    const validation = readFileSync(join(process.cwd(), "wiki", "Validation-and-CI.md"), "utf8");
    const sidebar = readFileSync(join(process.cwd(), "wiki", "_Sidebar.md"), "utf8");

    expect(wiki).toContain("npm run live:evidence");
    expect(wiki).toContain("output/observability-live/<timestamp>/");
    expect(wiki).toContain("metrics/workbench-api-metrics.prom");
    expect(wiki).toContain("bounded container log tails");
    expect(wiki).toContain("offline client-demo preparation");
    expect(runbook).toContain("Observability evidence capture");
    expect(validation).toContain("post-validation observability");
    expect(sidebar).toContain("Observability-Evidence");
  });
});
