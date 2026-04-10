import dns from "node:dns/promises";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { chromium, expect } from "@playwright/test";

function parseArgs(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(key, "true");
      continue;
    }
    args.set(key, next);
    index += 1;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const portfolioId = args.get("portfolio-id") ?? "PB_SG_GLOBAL_BAL_001";
const benchmarkCode = args.get("benchmark-code") ?? "BMK_PB_GLOBAL_BALANCED_60_40";
const workbenchBaseUrl = (args.get("workbench-base-url") ?? "http://workbench.dev.lotus").replace(/\/+$/, "");
const gatewayBaseUrl = (args.get("gateway-base-url") ?? "http://gateway.dev.lotus").replace(/\/+$/, "");
const outputDir = path.resolve(
  process.cwd(),
  args.get("output-dir") ?? "output/playwright/live-canonical"
);
const summaryPath = path.join(outputDir, "live-validation-summary.json");
const timeoutMs = Number(args.get("timeout-ms") ?? "60000");

const summary = {
  generatedAt: new Date().toISOString(),
  portfolioId,
  benchmarkCode,
  workbenchBaseUrl,
  gatewayBaseUrl,
  dns: [],
  apiChecks: [],
  uiChecks: [],
  screenshots: [],
};

async function ensureDirectory(target) {
  await fs.mkdir(target, { recursive: true });
}

async function checkDns(hostname, required = true) {
  try {
    const resolution = await dns.lookup(hostname);
    const result = { hostname, ok: true, address: resolution.address, required };
    summary.dns.push(result);
    return result;
  } catch (error) {
    const result = {
      hostname,
      ok: false,
      required,
      warning: `Optional canonical host '${hostname}' is not resolvable: ${error.message}`,
    };
    summary.dns.push(result);
    if (required) {
      throw new Error(
        `Canonical host '${hostname}' is not resolvable. Update your hosts/DNS mapping before running the live validation again.`
      );
    }
    return result;
  }
}

async function fetchJson(url, description) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${description} failed (${response.status}) at ${url}`);
    }
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(`${description} returned HTTP ${response.status} with an empty body at ${url}`);
    }
    let payload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      throw new Error(
        `${description} returned non-JSON content at ${url}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    summary.apiChecks.push({ description, url, status: response.status, kind: "json" });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, description) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`${description} failed (${response.status}) at ${url}`);
    }
    const payload = await response.text();
    summary.apiChecks.push({ description, url, status: response.status, kind: "text" });
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function assertListHasItems(locator, description) {
  await expect(locator).toBeVisible({ timeout: timeoutMs });
  const count = await locator.locator('[role="listitem"]').count();
  if (count < 1) {
    throw new Error(`${description} is visible but empty.`);
  }
  summary.uiChecks.push({ description, kind: "list", itemCount: count });
}

async function assertTableHasRows(locator, minimumRows, description) {
  await expect(locator).toBeVisible({ timeout: timeoutMs });
  const count = await locator.locator("tbody tr").count();
  if (count < minimumRows) {
    throw new Error(`${description} expected at least ${minimumRows} body rows but found ${count}.`);
  }
  summary.uiChecks.push({ description, kind: "table", rowCount: count });
}

async function assertRegionHasButtons(locator, minimumButtons, description) {
  await expect(locator).toBeVisible({ timeout: timeoutMs });
  const count = await locator.getByRole("button").count();
  if (count < minimumButtons) {
    throw new Error(`${description} expected at least ${minimumButtons} buttons but found ${count}.`);
  }
  summary.uiChecks.push({ description, kind: "buttons", buttonCount: count });
}

async function screenshot(page, name) {
  const target = path.join(outputDir, name);
  await page.screenshot({ path: target, fullPage: true });
  summary.screenshots.push(name);
}

async function writeSummary() {
  await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

async function run() {
  await ensureDirectory(outputDir);

  const dnsChecks = await Promise.all([
    checkDns("workbench.dev.lotus"),
    checkDns("gateway.dev.lotus"),
    checkDns("core-query.dev.lotus"),
    checkDns("core-control.dev.lotus"),
    checkDns("core-ingestion.dev.lotus"),
    checkDns("performance.dev.lotus"),
    checkDns("risk.dev.lotus"),
    checkDns("advise.dev.lotus"),
    checkDns("manage.dev.lotus"),
    checkDns("report.dev.lotus"),
    checkDns("ai.dev.lotus", false),
  ]);

  dnsChecks
    .filter((item) => !item.ok)
    .forEach((item) => console.warn(item.warning));

  const foundationWorkspace = await fetchJson(
    `${gatewayBaseUrl}/api/v1/foundation/portfolios/${portfolioId}/workspace`,
    "Foundation workspace"
  );
  if (foundationWorkspace?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error(`Foundation workspace did not resolve ${portfolioId}.`);
  }

  const performanceSummary = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/summary?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance summary"
  );
  if (!performanceSummary?.portfolio_id) {
    throw new Error("Performance summary returned no portfolio payload.");
  }

  const riskSummary = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/summary?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}`,
    "Risk summary"
  );
  if (!riskSummary?.portfolio_id) {
    throw new Error("Risk summary returned no portfolio payload.");
  }

  const advisorBrief = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Advisor brief"
  );
  if (!advisorBrief?.summary) {
    throw new Error("Advisor brief returned no summary.");
  }

  const manageCapabilities = await fetchJson(
    "http://manage.dev.lotus/integration/capabilities?consumer_system=lotus-gateway&tenant_id=default",
    "lotus-manage integration capabilities"
  );
  if (!Array.isArray(manageCapabilities?.features) || manageCapabilities.features.length < 1) {
    throw new Error("lotus-manage integration capabilities returned no feature flags.");
  }

  const reportCapabilities = await fetchJson(
    "http://report.dev.lotus/integration/capabilities?consumerSystem=lotus-gateway&tenantId=default",
    "lotus-report integration capabilities"
  );
  if (!Array.isArray(reportCapabilities?.features) || reportCapabilities.features.length < 1) {
    throw new Error("lotus-report integration capabilities returned no feature flags.");
  }

  const gatewayCapabilities = await fetchJson(
    `${gatewayBaseUrl}/api/v1/platform/capabilities`,
    "Gateway platform capabilities"
  );
  const gatewayManageFeatures = gatewayCapabilities?.data?.sources?.lotus_manage?.features;
  if (!Array.isArray(gatewayManageFeatures) || gatewayManageFeatures.length < 1) {
    throw new Error("Gateway platform capabilities returned no lotus-manage feature flags.");
  }

  const gatewayOverview = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/overview`,
    "Gateway workbench overview"
  );
  if (gatewayOverview?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error("Gateway workbench overview returned no portfolio payload.");
  }

  const portfolioShell = await fetchText(
    `${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`,
    "Workbench portfolio route"
  );
  if (!portfolioShell.includes("Portfolio")) {
    throw new Error("Workbench portfolio route did not render the Portfolio shell.");
  }

  const performanceShell = await fetchText(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`,
    "Workbench performance route"
  );
  if (!performanceShell.includes("Performance")) {
    throw new Error("Workbench performance route did not render the Performance shell.");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });

  try {
    await page.goto(`${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Portfolio", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: portfolioId, exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Portfolio Allocation" })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertListHasItems(page.getByRole("list", { name: "Top holdings chart" }), "Top holdings chart");
    await expect(page.getByRole("img", { name: "Allocation donut chart" })).toBeVisible({
      timeout: timeoutMs,
    });
    await screenshot(page, "portfolio-summary-live.png");

    await page.getByRole("tab", { name: "Detailed" }).click();
    await expect(page.getByRole("tab", { name: "Detailed", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Transactions" })).toBeVisible({ timeout: timeoutMs });
    await expect(page.getByRole("heading", { name: "Projected Cashflow" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByLabel("Portfolio transactions grid")).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByLabel("Projected cashflow summary")).toBeVisible({
      timeout: timeoutMs,
    });
    await screenshot(page, "portfolio-detailed-live.png");

    await page.goto(`${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`, {
      waitUntil: "networkidle",
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("tab", { name: "Summary", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Net Return Path" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance Drivers" })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertTableHasRows(
      page.getByRole("table", { name: "Return path observation table" }),
      4,
      "Return path observation table"
    );
    await screenshot(page, "performance-summary-live.png");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Analysis", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Attribution Over Time" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Attribution Detail" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance Drivers" })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertTableHasRows(
      page.getByRole("table", { name: /attribution/i }).first(),
      1,
      "Attribution detail table"
    );
    await assertTableHasRows(
      page.getByRole("table", { name: /contribution/i }).first(),
      1,
      "Contribution detail table"
    );
    await screenshot(page, "performance-analysis-live.png");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=advisor&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Advisor Brief", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Performance Advisor Brief" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Client Talking Points" })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Source Metrics" })).toBeVisible({
      timeout: timeoutMs,
    });
    const sourceMetricButtons = await page.getByRole("region", { name: "Source Metrics" }).getByRole("button").count();
    if (sourceMetricButtons < 3) {
      throw new Error(`Advisor brief source metrics expected at least 3 metric buttons but found ${sourceMetricButtons}.`);
    }
    summary.uiChecks.push({
      description: "Advisor brief source metrics",
      kind: "buttons",
      buttonCount: sourceMetricButtons,
    });
    await screenshot(page, "performance-advisor-brief-live.png");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Risk", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Risk Snapshot", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Drawdown", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Concentration", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Rolling Risk", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Historical Risk Attribution", exact: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await assertTableHasRows(
      page.getByRole("table", { name: "Historical risk attribution table" }),
      5,
      "Historical risk attribution table"
    );
    await screenshot(page, "performance-risk-live.png");

    await page.goto(
      `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
      { waitUntil: "networkidle", timeout: timeoutMs }
    );
    await expect(page.getByRole("tab", { name: "Evidence", exact: true, selected: true })).toBeVisible({
      timeout: timeoutMs,
    });
    await expect(page.getByRole("heading", { name: "Evidence and Calculation Context" })).toBeVisible({
      timeout: timeoutMs,
    });
    const evidenceStatusStrip = page.getByLabel("Evidence support status");
    if (await evidenceStatusStrip.count()) {
      await expect(evidenceStatusStrip).toBeVisible({ timeout: timeoutMs });
      summary.uiChecks.push({ description: "Evidence support status", kind: "status-strip", state: "supported" });
    } else {
      await expect(page.getByText(/Evidence (partially available|unavailable)/)).toBeVisible({
        timeout: timeoutMs,
      });
      summary.uiChecks.push({ description: "Evidence support status", kind: "status-strip", state: "degraded" });
    }
    await screenshot(page, "performance-evidence-live.png");
  } finally {
    await browser.close();
  }

  await writeSummary();
  console.log(`Live canonical Workbench validation passed for ${portfolioId}. Screenshots: ${outputDir}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
