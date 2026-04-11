import path from "node:path";
import process from "node:process";
import { chromium, expect } from "@playwright/test";
import { resolveValidationConfig } from "./validation/args.mjs";
import {
  loadCanonicalContractMetadata,
  loadWorkbenchPanelRegistryMetadata,
} from "./validation/contract-metadata.mjs";
import {
  buildSummaryPaths,
  createValidationSummary,
  ensureDirectory,
  writeShotIndex,
  writeValidationSummary,
} from "./validation/evidence-summary-writer.mjs";
import { checkDns, fetchJson, fetchText } from "./validation/probes.mjs";

const {
  portfolioId,
  benchmarkCode,
  workbenchBaseUrl,
  gatewayBaseUrl,
  outputDir,
  timeoutMs,
  canonicalAsOfDate,
} = resolveValidationConfig(process.argv.slice(2));
const { summaryPath, shotIndexPath } = buildSummaryPaths(outputDir);
const canonicalContract = await loadCanonicalContractMetadata();
const panelRegistry = await loadWorkbenchPanelRegistryMetadata();
const panelRegistryById = new Map(panelRegistry.panels.map((panel) => [panel.panelId, panel]));

const summary = createValidationSummary({
  generatedAt: new Date().toISOString(),
  portfolioId,
  benchmarkCode,
  canonicalContract,
  workbenchBaseUrl,
  gatewayBaseUrl,
  panelRegistry,
});

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

function recordSupportabilityCheck(panel, evidence) {
  summary.supportabilityChecks.push({ panel, ...evidence });
}

function recordPanelClassification(panel, state, owner, evidence) {
  const panelSpec = panelRegistryById.get(panel);
  if (!panelSpec) {
    throw new Error(`Panel classification '${panel}' is not present in the governed panel registry.`);
  }
  if (!panelSpec.allowedStates.includes(state)) {
    throw new Error(
      `Panel classification '${panel}' used unsupported state '${state}'. Allowed states: ${panelSpec.allowedStates.join(", ")}.`
    );
  }
  summary.panelClassifications.push({ panel, state, owner, ...evidence });
}

function assertNoUnsupportedBlankPanels() {
  const unsupportedBlankPanels = summary.panelClassifications.filter(
    (panel) => panel.state === "supported_blank"
  );
  if (unsupportedBlankPanels.length > 0) {
    throw new Error(
      `Unsupported blank panels found: ${unsupportedBlankPanels
        .map((panel) => panel.panel)
        .join(", ")}.`
    );
  }
}

function assertPanelSupportabilityAlignment() {
  const classifiedPanels = new Set(summary.panelClassifications.map((panel) => panel.panel));

  for (const panelSpec of panelRegistry.panels) {
    if (!classifiedPanels.has(panelSpec.panelId)) {
      throw new Error(`Governed panel '${panelSpec.panelId}' was not classified during validation.`);
    }
  }

  for (const panel of summary.panelClassifications) {
    const panelSpec = panelRegistryById.get(panel.panel);
    if (panel.owner !== panelSpec.owningService) {
      throw new Error(
        `Panel '${panel.panel}' reported owner '${panel.owner}' but registry owner is '${panelSpec.owningService}'.`
      );
    }
    if (panel.state !== panelSpec.requiredSupportState) {
      throw new Error(
        `Panel '${panel.panel}' reported state '${panel.state}' but registry requires '${panelSpec.requiredSupportState}'.`
      );
    }
    if (
      (panel.state === "partial" || panel.state === "unavailable") &&
      !panel.reason &&
      panelSpec.knownLimitations.length < 1 &&
      !panelSpec.ownerFollowUpRfc
    ) {
      throw new Error(
        `Panel '${panel.panel}' is ${panel.state} without a governed reason, limitation, or follow-up RFC.`
      );
    }
    recordSupportabilityCheck(panel.panel, {
      owner: panel.owner,
      state: panel.state,
      requiredSupportState: panelSpec.requiredSupportState,
      gatewayEndpoint: panelSpec.gatewayEndpoint,
      ownerFollowUpRfc: panelSpec.ownerFollowUpRfc,
    });
  }
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

  recordPanelClassification("performance.summary", "ready", "lotus-performance", {
    returnPathRows: performanceDetails.net_chart.length,
  });
  recordPanelClassification("performance.analysis.contribution", "ready", "lotus-performance", {
    contributionRows: contributionRows.length,
  });
  recordPanelClassification(
    "performance.analysis.attribution",
    attributionFallback ? "partial" : "ready",
    "lotus-performance",
    {
      attributionState: attributionCapability.state,
      attributionRows,
      fallbackAvailable: attributionCapability.fallback_available === true,
    }
  );
  const evidenceState = performanceSummary?.capabilities?.evidence?.state ?? "unavailable";
  recordPanelClassification("performance.evidence", evidenceState, "lotus-gateway", {
    reason: performanceSummary?.capabilities?.evidence?.reason ?? null,
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

  recordPanelClassification("performance.risk.snapshot", "ready", "lotus-risk", {
    readyMetricCount: readyMetrics.length,
  });
  recordPanelClassification("performance.risk.concentration", "ready", "lotus-risk", {
    issuerCoverageRatio: concentrationPayload.issuer_concentration?.coverage_ratio_current,
  });
  recordPanelClassification("performance.risk.drawdown", "ready", "lotus-risk", {
    underwaterSeriesRows: drawdownPeriod.underwater_series.length,
  });
  recordPanelClassification("performance.risk.rolling", "ready", "lotus-risk", {
    windowCount: rollingPeriod.window_count_emitted,
    computableWindows: rollingWindowsWithLatestVolatility,
  });
  recordPanelClassification("performance.risk.historical_attribution", "ready", "lotus-risk", {
    contributorRows: contributors.length,
  });
}

async function screenshot(page, name, metadata) {
  const target = path.join(outputDir, name);
  await page.screenshot({ path: target, fullPage: true });
  summary.screenshots.push({
    name,
    path: target,
    route: metadata.route,
    panel: metadata.panel,
    portfolioId,
    benchmarkCode,
    asOfDate: canonicalAsOfDate,
    state: metadata.state ?? "demo_ready",
  });
}

function resolveRegistryRoute(routeTemplate) {
  return routeTemplate
    .replaceAll("{portfolioId}", portfolioId)
    .replaceAll("{benchmarkCode}", benchmarkCode);
}

async function screenshotRegisteredPanel(page, panelId, metadata = {}) {
  const panelSpec = panelRegistryById.get(panelId);
  if (!panelSpec) {
    throw new Error(`Screenshot requested for unregistered panel '${panelId}'.`);
  }
  if (!panelSpec.screenshotName) {
    throw new Error(`Panel '${panelId}' has no governed screenshot name.`);
  }
  await screenshot(page, panelSpec.screenshotName, {
    route: metadata.route ?? resolveRegistryRoute(panelSpec.route),
    panel: panelId,
    state: metadata.state,
  });
}

async function run() {
  await ensureDirectory(outputDir);

  const dnsChecks = await Promise.all([
    checkDns(summary, "workbench.dev.lotus"),
    checkDns(summary, "gateway.dev.lotus"),
    checkDns(summary, "core-query.dev.lotus"),
    checkDns(summary, "core-control.dev.lotus"),
    checkDns(summary, "core-ingestion.dev.lotus"),
    checkDns(summary, "performance.dev.lotus"),
    checkDns(summary, "risk.dev.lotus"),
    checkDns(summary, "advise.dev.lotus"),
    checkDns(summary, "manage.dev.lotus"),
    checkDns(summary, "report.dev.lotus"),
    checkDns(summary, "ai.dev.lotus", { required: false }),
  ]);

  dnsChecks
    .filter((item) => !item.ok)
    .forEach((item) => console.warn(item.warning));

  const foundationWorkspace = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/foundation/portfolios/${portfolioId}/workspace`,
    "Foundation workspace",
    timeoutMs
  );
  if (foundationWorkspace?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error(`Foundation workspace did not resolve ${portfolioId}.`);
  }

  const performanceSummary = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/summary?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance summary",
    timeoutMs
  );
  if (!performanceSummary?.portfolio_id) {
    throw new Error("Performance summary returned no portfolio payload.");
  }

  const performanceDetails = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/details?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Performance details",
    timeoutMs
  );
  if (!performanceDetails?.portfolio_id) {
    throw new Error("Performance details returned no portfolio payload.");
  }

  const riskSummary = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/summary?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}`,
    "Risk summary",
    timeoutMs
  );
  if (!riskSummary?.portfolio_id) {
    throw new Error("Risk summary returned no portfolio payload.");
  }

  const riskConcentration = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/concentration?period=YTD&benchmark_code=${benchmarkCode}`,
    "Risk concentration",
    timeoutMs
  );
  const riskDrawdown = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/drawdown?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_underwater_series=true`,
    "Risk drawdown",
    timeoutMs
  );
  const riskRolling = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/rolling?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&include_time_series=true`,
    "Risk rolling",
    timeoutMs
  );
  const riskAttribution = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/risk/attribution?period=YTD&detail_basis=NET&benchmark_code=${benchmarkCode}&attribution_type=total_risk&grouping_dimension=sector`,
    "Risk attribution",
    timeoutMs
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
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/performance/advisor-brief?period=YTD&chart_frequency=monthly&detail_basis=NET&contribution_dimension=asset_class&attribution_dimension=asset_class&benchmark_code=${benchmarkCode}`,
    "Advisor brief",
    timeoutMs
  );
  if (!advisorBrief?.summary) {
    throw new Error("Advisor brief returned no summary.");
  }

  const manageCapabilities = await fetchJson(
    summary,
    "http://manage.dev.lotus/integration/capabilities?consumer_system=lotus-gateway&tenant_id=default",
    "lotus-manage integration capabilities",
    timeoutMs
  );
  if (!Array.isArray(manageCapabilities?.features) || manageCapabilities.features.length < 1) {
    throw new Error("lotus-manage integration capabilities returned no feature flags.");
  }

  const reportCapabilities = await fetchJson(
    summary,
    "http://report.dev.lotus/integration/capabilities?consumerSystem=lotus-gateway&tenantId=default",
    "lotus-report integration capabilities",
    timeoutMs
  );
  if (!Array.isArray(reportCapabilities?.features) || reportCapabilities.features.length < 1) {
    throw new Error("lotus-report integration capabilities returned no feature flags.");
  }

  const gatewayCapabilities = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/platform/capabilities`,
    "Gateway platform capabilities",
    timeoutMs
  );
  const gatewayManageFeatures = gatewayCapabilities?.data?.sources?.lotus_manage?.features;
  if (!Array.isArray(gatewayManageFeatures) || gatewayManageFeatures.length < 1) {
    throw new Error("Gateway platform capabilities returned no lotus-manage feature flags.");
  }

  const gatewayOverview = await fetchJson(
    summary,
    `${gatewayBaseUrl}/api/v1/workbench/${portfolioId}/overview`,
    "Gateway workbench overview",
    timeoutMs
  );
  if (gatewayOverview?.portfolio?.portfolio_id !== portfolioId) {
    throw new Error("Gateway workbench overview returned no portfolio payload.");
  }
  recordPanelClassification("portfolio.summary", "ready", "lotus-gateway", {
    portfolioId,
  });
  recordPanelClassification("portfolio.detailed", "ready", "lotus-gateway", {
    portfolioId,
  });
  recordPanelClassification("performance.advisor_brief", "ready", "lotus-performance", {
    sourceMetricMinimum: 3,
  });
  assertNoUnsupportedBlankPanels();
  assertPanelSupportabilityAlignment();

  const portfolioShell = await fetchText(
    summary,
    `${workbenchBaseUrl}/portfolio?portfolioId=${portfolioId}`,
    "Workbench portfolio route",
    timeoutMs
  );
  if (!portfolioShell.includes("Portfolio")) {
    throw new Error("Workbench portfolio route did not render the Portfolio shell.");
  }

  const performanceShell = await fetchText(
    summary,
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`,
    "Workbench performance route",
    timeoutMs
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
    await screenshotRegisteredPanel(page, "portfolio.summary");

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
    await screenshotRegisteredPanel(page, "portfolio.detailed");

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
    await screenshotRegisteredPanel(page, "performance.summary");

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
    await screenshotRegisteredPanel(page, "performance.analysis.contribution");

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
    await screenshotRegisteredPanel(page, "performance.advisor_brief");

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
    await screenshotRegisteredPanel(page, "performance.risk.snapshot");

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
    await screenshotRegisteredPanel(page, "performance.evidence", {
      state: "truthfully_degraded",
    });
  } finally {
    await browser.close();
  }

  await writeValidationSummary(summaryPath, summary);
  await writeShotIndex(shotIndexPath, summary, summaryPath);
  console.log(`Live canonical Workbench validation passed for ${portfolioId}. Screenshots: ${outputDir}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
