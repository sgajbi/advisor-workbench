import path from "node:path";
import { expect } from "@playwright/test";

export function hasAcceptedAdvisorBriefReviewPosture(text) {
  return (
    text.includes("AI Review") &&
    text.includes("ACCEPTED") &&
    (text.includes("Supportability ACTION REQUIRED") || text.includes("Supportability READY"))
  );
}

export function createBrowserValidationHelpers({
  outputDir,
  summary,
  portfolioId,
  benchmarkCode,
  canonicalAsOfDate,
  timeoutMs,
  panelRegistryById,
}) {
  async function assertListHasItems(locator, description) {
    await expect(locator).toBeVisible({ timeout: timeoutMs });
    const count = await locator.locator('[role="listitem"]').count();
    if (count < 1) {
      throw new Error(`${description} is visible but empty.`);
    }
    summary.uiChecks.push({ description, kind: "list", itemCount: count });
  }

  async function assertTableHasRows(locator, minimumRows, description, options = {}) {
    if (options.requireVisible !== false) {
      await expect(locator).toBeVisible({ timeout: timeoutMs });
    } else {
      await expect(locator).toHaveCount(1, { timeout: timeoutMs });
    }
    const count = await locator.locator("tbody tr").count();
    if (count < minimumRows) {
      throw new Error(`${description} expected at least ${minimumRows} body rows but found ${count}.`);
    }
    summary.uiChecks.push({ description, kind: "table", rowCount: count });
  }

  async function screenshot(page, name, metadata) {
    const target = path.join(outputDir, name);
    await page.mouse?.move(1, 1);
    await page.keyboard?.press("Escape");
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
      .replaceAll("{portfolio_id}", portfolioId)
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

  return {
    assertListHasItems,
    assertTableHasRows,
    screenshotRegisteredPanel,
    resolveRegistryRoute,
  };
}

async function assertRailModeActive(page, labelPattern, timeoutMs) {
  const railButton = page.getByRole("button", { name: labelPattern }).first();
  await expect(railButton).toBeVisible({ timeout: timeoutMs });
  await expect(railButton).toHaveAttribute("aria-pressed", "true", { timeout: timeoutMs });
  await expect(railButton).toHaveAttribute("aria-current", "page", { timeout: timeoutMs });
}

function tableByExactLabel(page, label) {
  return page.locator(`table[aria-label="${label}"]`);
}

function workbenchPanelByClass(page, className) {
  return page.locator(`article.${className}`).first();
}

export async function validatePortfolioPanels(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertListHasItems,
    screenshotRegisteredPanel,
  }
) {
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
}

export async function validatePerformanceSummaryPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(`${workbenchBaseUrl}/performance?portfolioId=${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Performance", exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await assertRailModeActive(page, /^Performance Overview/, timeoutMs);
  await expect(page.getByRole("heading", { name: "Net Return Path" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Performance Drivers" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Observation Trail")).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByText(/\d+\s+periods?/i)).toBeVisible({ timeout: timeoutMs });
  await assertTableHasRows(
    tableByExactLabel(page, "Return path observation table"),
    4,
    "Return path observation table",
    { requireVisible: false }
  );
  await screenshotRegisteredPanel(page, "performance.summary");
}

export async function validatePerformanceAnalysisPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
    { waitUntil: "networkidle", timeout: timeoutMs }
  );
  await assertRailModeActive(page, /^Performance Analysis/, timeoutMs);
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
    tableByExactLabel(page, "Asset Class attribution table"),
    1,
    "Attribution detail table"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Asset Class contribution table"),
    1,
    "Contribution detail table"
  );
  await screenshotRegisteredPanel(page, "performance.analysis.contribution");
}

export async function validateAdvisorBriefPanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    timeoutMs,
    screenshotRegisteredPanel,
    performAcceptReviewActionProof = false,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=advisor&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
    { waitUntil: "networkidle", timeout: timeoutMs }
  );
  await assertRailModeActive(page, /^Advisor Brief/, timeoutMs);
  await expect(page.getByRole("heading", { name: "Performance Advisor Brief" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Client Talking Points" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Source Metrics" })).toBeVisible({
    timeout: timeoutMs,
  });
  const sourceMetricButtons = await page
    .getByRole("region", { name: "Source Metrics" })
    .getByRole("button")
    .count();
  if (sourceMetricButtons < 3) {
    throw new Error(
      `Advisor brief source metrics expected at least 3 metric buttons but found ${sourceMetricButtons}.`
    );
  }
  summary.uiChecks.push({
    description: "Advisor brief source metrics",
    kind: "buttons",
    buttonCount: sourceMetricButtons,
  });
  await screenshotRegisteredPanel(page, "performance.advisor_brief");

  if (performAcceptReviewActionProof) {
    const reviewRegion = page.getByLabel("Advisor brief review actions");
    const supportabilityRegion = page.getByLabel("Advisor brief supportability");
    await expect(reviewRegion).toBeVisible({ timeout: timeoutMs });
    await reviewRegion.getByLabel("Reviewed by").fill("live.validator.ui");
    await reviewRegion
      .getByLabel("Review reason")
      .fill("Live canonical validator proving the Workbench ACCEPT review path.");
    await reviewRegion.getByRole("button", { name: "Accept Brief" }).click();
    await expect(supportabilityRegion).toBeVisible({ timeout: timeoutMs });
    await expect
      .poll(async () => hasAcceptedAdvisorBriefReviewPosture(await supportabilityRegion.innerText()), {
        timeout: timeoutMs,
      })
      .toBe(true);
    summary.uiChecks.push({
      description: "Advisor brief ACCEPT review action",
      kind: "workflow-pack-review-action",
      actionType: "ACCEPT",
      state: "accepted",
    });
  }
}

export async function validateRiskPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
    { waitUntil: "networkidle", timeout: timeoutMs }
  );
  await assertRailModeActive(page, /^Risk Review/, timeoutMs);
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
    tableByExactLabel(page, "Historical risk attribution table"),
    5,
    "Historical risk attribution table"
  );
  await screenshotRegisteredPanel(page, "performance.risk.snapshot");
}

export async function validateEvidencePanel(
  page,
  {
    summary,
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    timeoutMs,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}`,
    { waitUntil: "networkidle", timeout: timeoutMs }
  );
  await assertRailModeActive(page, /^Evidence/, timeoutMs);
  await expect(page.getByRole("heading", { name: "Evidence and Calculation Context" })).toBeVisible({
    timeout: timeoutMs,
  });
  const evidenceStatusStrip = page.getByLabel("Evidence support status");
  if (await evidenceStatusStrip.count()) {
    await expect(evidenceStatusStrip).toBeVisible({ timeout: timeoutMs });
    summary.uiChecks.push({
      description: "Evidence support status",
      kind: "status-strip",
      state: "supported",
    });
  } else {
    await expect(page.getByText(/Evidence (partially available|unavailable)/)).toBeVisible({
      timeout: timeoutMs,
    });
    summary.uiChecks.push({
      description: "Evidence support status",
      kind: "status-strip",
      state: "degraded",
    });
  }
  await screenshotRegisteredPanel(page, "performance.evidence", {
    state: "truthfully_degraded",
  });
}

export async function validateOutcomeReviewPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const outcomeReviewPanel = workbenchPanelByClass(page, "outcome-review-panel");
  await expect(
    outcomeReviewPanel.getByRole("heading", { name: "Post-Trade Outcome Review" })
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByLabel("Status lotus-manage")).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Post-trade outcome reviews"),
    1,
    "Post-trade outcome reviews"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Outcome review dimensions"),
    1,
    "Outcome review dimensions"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Outcome review source lineage"),
    1,
    "Outcome review source lineage"
  );
  await expect(outcomeReviewPanel.getByText("Report Input", { exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByText("AI Evidence", { exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.outcome_review");
}

export async function validateDpmCommandCenterPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, assertTableHasRows, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "DPM Command Center" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("button", { name: "Run monitoring" })).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "DPM command-center health distribution"),
    1,
    "DPM command-center health distribution"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "DPM attention queue"),
    0,
    "DPM attention queue"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "DPM active exceptions"),
    0,
    "DPM active exceptions"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "DPM mandate health dimensions"),
    0,
    "DPM mandate health dimensions"
  );
  await screenshotRegisteredPanel(page, "dpm.command_center");
}

export async function validateDpmWaveCommandCenterPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const wavePanel = workbenchPanelByClass(page, "dpm-wave-command-center-panel");
  await expect(
    wavePanel.getByRole("heading", { name: "Rebalance Wave Command Center" })
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByRole("button", { name: "Preview wave" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByRole("button", { name: "Create wave" })).toBeVisible({
    timeout: timeoutMs,
  });
  for (const actionName of [
    "Source-check",
    "Simulate",
    "Approve",
    "Stage",
    "Handoff",
    "Proof posture",
    "Supportability",
  ]) {
    await expect(wavePanel.getByRole("button", { name: actionName })).toBeVisible({
      timeout: timeoutMs,
    });
  }
  await wavePanel.getByRole("button", { name: "Preview wave" }).click({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Preview wave completed through Gateway.")).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.wave_command_center");
}

export async function validatePortfolioMemoryPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, assertTableHasRows, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const memoryPanel = workbenchPanelByClass(page, "portfolio-memory-panel");
  await expect(memoryPanel.getByRole("heading", { name: "Portfolio Memory" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByLabel("Status lotus-manage")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText(/sha256:/)).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "DPM portfolio-memory event type counts"),
    1,
    "DPM portfolio-memory event type counts"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "DPM portfolio-memory event timeline"),
    1,
    "DPM portfolio-memory event timeline"
  );
  await screenshotRegisteredPanel(page, "dpm.portfolio_memory");
}

export async function validateProofPackPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, assertTableHasRows, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const proofPackPanel = workbenchPanelByClass(page, "proof-pack-panel");
  await expect(proofPackPanel.getByRole("heading", { name: "Proof-Pack Evidence" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/Markdown (Available|Unavailable)/)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/Report Input (Available|Unavailable)/)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/AI Evidence (Available|Unavailable)/)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByRole("button", { name: "AI PM Memo" })).toBeVisible({
    timeout: timeoutMs,
  });
  await proofPackPanel.getByRole("button", { name: "Generate proof pack" }).click({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText("Proof-pack generation completed through Gateway.")).toBeVisible({
    timeout: timeoutMs,
  });
  await proofPackPanel.getByRole("button", { name: "AI PM Memo" }).click({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/^PM memo /)).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Proof-pack sections"),
    1,
    "Proof-pack sections"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Proof-pack source hashes"),
    1,
    "Proof-pack source hashes"
  );
  await screenshotRegisteredPanel(page, "dpm.proof_pack");
}
