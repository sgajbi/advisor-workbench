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
import {
  assertPerformanceCalculationSanity,
  assertRiskCalculationSanity,
} from "./validation/calculation-sanity.mjs";

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
  assertPerformanceCalculationSanity({
    summary,
    performanceSummary,
    performanceDetails,
    recordPanelClassification,
  });
  assertRiskCalculationSanity({
    summary,
    riskSummary,
    concentration: riskConcentration,
    drawdown: riskDrawdown,
    rolling: riskRolling,
    attribution: riskAttribution,
    recordPanelClassification,
  });

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
