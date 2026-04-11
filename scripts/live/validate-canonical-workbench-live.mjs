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
  calculationChecks: [],
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

function assertFiniteNumber(value, description) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${description} expected a finite number but received ${String(value)}.`);
  }
  return value;
}

function assertNumberInRange(value, minimum, maximum, description) {
  const numericValue = assertFiniteNumber(value, description);
  if (numericValue < minimum || numericValue > maximum) {
    throw new Error(
      `${description} expected ${minimum} <= value <= ${maximum} but received ${numericValue}.`
    );
  }
  return numericValue;
}

function assertArrayHasLength(value, minimumLength, description) {
  if (!Array.isArray(value) || value.length < minimumLength) {
    throw new Error(
      `${description} expected at least ${minimumLength} rows but found ${
        Array.isArray(value) ? value.length : "non-array"
      }.`
    );
  }
  return value;
}

function recordCalculationCheck(description, evidence) {
  summary.calculationChecks.push({ description, ...evidence });
}

function assertPerformanceCalculationSanity(performanceSummary, performanceDetails) {
  const netPerformance = performanceSummary?.net_performance ?? {};
  const overview = performanceSummary?.overview ?? {};
  const contributionLevel = performanceDetails?.contribution?.levels?.[0];
  const attributionCapability = performanceDetails?.capabilities?.attribution_detail ?? {};
  const attributionLevel = performanceDetails?.attribution?.levels?.[0];

  const portfolioReturn = assertNumberInRange(
    netPerformance.portfolio_return_pct,
    -100,
    200,
    "Net portfolio return"
  );
  const benchmarkReturn = assertNumberInRange(
    netPerformance.benchmark_return_pct,
    -100,
    100,
    "Benchmark return"
  );
  const activeReturn = assertNumberInRange(
    netPerformance.active_return_pct,
    -200,
    200,
    "Active return"
  );
  const activeDifference = Math.abs(activeReturn - (portfolioReturn - benchmarkReturn));
  if (activeDifference > 0.01) {
    throw new Error(
      `Active return is not reconciled: active=${activeReturn}, portfolio=${portfolioReturn}, benchmark=${benchmarkReturn}.`
    );
  }

  assertNumberInRange(overview.market_value_base, 1, 100_000_000, "Portfolio market value");
  assertNumberInRange(overview.cash_weight_pct, -5, 100, "Cash weight");
  assertNumberInRange(overview.position_count, 10, 100, "Position count");
  assertArrayHasLength(performanceDetails?.net_chart, 4, "Performance return path observations");
  const contributionRows = assertArrayHasLength(
    contributionLevel?.rows,
    4,
    "Performance contribution rows"
  );
  const contributionTotal = assertFiniteNumber(
    contributionLevel.total_contribution_pct,
    "Contribution total"
  );
  if (Math.abs(contributionTotal - portfolioReturn) > 0.02) {
    throw new Error(
      `Contribution total does not reconcile with net portfolio return: contribution=${contributionTotal}, return=${portfolioReturn}.`
    );
  }

  const attributionRows = Array.isArray(attributionLevel?.rows) ? attributionLevel.rows.length : 0;
  const attributionFallback =
    attributionCapability.state === "partial" && attributionCapability.fallback_available === true;
  if (attributionCapability.state === "supported" && attributionRows < 1) {
    throw new Error("Attribution detail is supported but returned no rows.");
  }
  if (!attributionFallback && attributionCapability.state !== "supported") {
    throw new Error(
      `Attribution detail is ${String(attributionCapability.state)} without a governed fallback.`
    );
  }

  recordCalculationCheck("Performance calculation sanity", {
    portfolioReturnPct: portfolioReturn,
    benchmarkReturnPct: benchmarkReturn,
    activeReturnPct: activeReturn,
    contributionRows: contributionRows.length,
    attributionState: attributionCapability.state,
    attributionRows,
  });
}

function assertRiskCalculationSanity(riskSummary, concentration, drawdown, rolling, attribution) {
  const riskPeriod = assertArrayHasLength(riskSummary?.payload?.periods, 1, "Risk periods")[0];
  const metrics = assertArrayHasLength(riskPeriod.metrics, 6, "Risk summary metrics");
  const readyMetrics = metrics.filter((metric) => metric?.state === "ready");
  if (readyMetrics.length < 6) {
    throw new Error(`Risk summary expected at least 6 ready metrics but found ${readyMetrics.length}.`);
  }
  assertNumberInRange(riskPeriod.portfolio_observation_count, 60, 400, "Risk observations");
  assertNumberInRange(
    riskPeriod.aligned_benchmark_observation_count,
    60,
    400,
    "Aligned benchmark observations"
  );
  if (riskPeriod.benchmark_context?.aligned !== true) {
    throw new Error("Risk benchmark context is not aligned.");
  }

  const concentrationPayload = concentration?.payload ?? {};
  assertNumberInRange(
    concentrationPayload.portfolio_concentration?.hhi_current,
    1,
    10_000,
    "Portfolio concentration HHI"
  );
  assertNumberInRange(
    concentrationPayload.issuer_concentration?.coverage_ratio_current,
    0.95,
    1,
    "Issuer concentration coverage ratio"
  );
  assertNumberInRange(
    concentrationPayload.single_position_concentration?.top_n_cumulative_weight_current,
    0.5,
    1.01,
    "Top positions cumulative weight"
  );

  const drawdownPeriod = assertArrayHasLength(drawdown?.payload?.periods, 1, "Drawdown periods")[0];
  assertNumberInRange(
    drawdownPeriod.portfolio_observation_count,
    60,
    400,
    "Drawdown observation count"
  );
  assertNumberInRange(
    drawdownPeriod.relative_to_benchmark?.time_under_water_days,
    1,
    366,
    "Relative drawdown time under water"
  );
  assertArrayHasLength(drawdownPeriod.underwater_series, 60, "Drawdown underwater series");

  const rollingPeriod = assertArrayHasLength(rolling?.payload?.periods, 1, "Rolling risk periods")[0];
  assertNumberInRange(rollingPeriod.window_count_emitted, 4, 4, "Rolling risk window count");
  const rollingWindows = assertArrayHasLength(
    rollingPeriod.window_results,
    4,
    "Rolling risk window results"
  );
  let rollingWindowsWithLatestVolatility = 0;
  for (const windowResult of rollingPeriod.window_results) {
    const volatility = windowResult?.metric_summaries?.ROLLING_VOLATILITY;
    if (!volatility || typeof volatility !== "object") {
      throw new Error(
        `Rolling risk window ${String(windowResult?.window_length)} has no volatility summary.`
      );
    }
    if (typeof volatility.latest === "number") {
      rollingWindowsWithLatestVolatility += 1;
    }
  }
  if (rollingWindowsWithLatestVolatility < 2) {
    throw new Error(
      `Rolling risk expected at least 2 computable windows but found ${rollingWindowsWithLatestVolatility}.`
    );
  }

  const attributionPeriod = assertArrayHasLength(
    attribution?.payload?.periods,
    1,
    "Historical risk attribution periods"
  )[0];
  const attributionSet = assertArrayHasLength(
    attributionPeriod.attribution_sets,
    1,
    "Historical risk attribution sets"
  )[0];
  const contributors = assertArrayHasLength(
    attributionSet.contributors,
    5,
    "Historical risk attribution contributors"
  );
  const residual = assertFiniteNumber(attributionSet.residual, "Historical risk residual");
  if (Math.abs(residual) > 0.000001) {
    throw new Error(`Historical risk attribution residual is too high: ${residual}.`);
  }

  recordCalculationCheck("Risk calculation sanity", {
    readyMetricCount: readyMetrics.length,
    observationCount: riskPeriod.portfolio_observation_count,
    concentrationHhi: concentrationPayload.portfolio_concentration?.hhi_current,
    rollingWindowCount: rollingPeriod.window_count_emitted,
    rollingWindowResultCount: rollingWindows.length,
    rollingWindowsWithLatestVolatility,
    attributionContributorCount: contributors.length,
  });
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

  const performanceDetails = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/details?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance details"
  );
  if (!performanceDetails?.portfolio_id) {
    throw new Error("Performance details returned no portfolio payload.");
  }

  const riskSummary = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/summary?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}`,
    "Risk summary"
  );
  if (!riskSummary?.portfolio_id) {
    throw new Error("Risk summary returned no portfolio payload.");
  }

  const riskConcentration = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/concentration?period=YTD&benchmark_code=${benchmarkCode}`,
    "Risk concentration"
  );
  const riskDrawdown = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_underwater_series=true`,
    "Risk drawdown"
  );
  const riskRolling = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_time_series=true`,
    "Risk rolling"
  );
  const riskAttribution = await fetchJson(
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/attribution?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&attribution_type=total_risk&grouping_dimension=sector`,
    "Risk attribution"
  );
  for (const [description, payload] of [
    ["Risk concentration", riskConcentration],
    ["Risk drawdown", riskDrawdown],
    ["Risk rolling", riskRolling],
    ["Risk attribution", riskAttribution],
  ]) {
    if (payload?.state !== "ready") {
      throw new Error(`${description} returned non-ready state: ${String(payload?.state)}.`);
    }
  }
  assertPerformanceCalculationSanity(performanceSummary, performanceDetails);
  assertRiskCalculationSanity(
    riskSummary,
    riskConcentration,
    riskDrawdown,
    riskRolling,
    riskAttribution
  );

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
