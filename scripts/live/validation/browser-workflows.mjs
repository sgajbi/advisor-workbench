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
  await expect(page.getByRole("heading", { name: "Portfolio Summary", exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: portfolioId, exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Asset Allocation" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Top Holdings" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByLabel("Portfolio summary previews")).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByRole("heading", { name: "Recent Transactions" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Forward Cashflow" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByLabel("Projected cashflow points")).toBeVisible({ timeout: timeoutMs });
  await screenshotRegisteredPanel(page, "portfolio.summary");
}

export async function validatePerformanceSummaryPanel(
  page,
  {
    workbenchBaseUrl,
    portfolioId,
    benchmarkCode,
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(`${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`, {
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
  await expect(page.getByText(/Observation trail/i)).toBeVisible({ timeout: timeoutMs });
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
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=analysis&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
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
    canonicalAsOfDate,
    timeoutMs,
    screenshotRegisteredPanel,
    performAcceptReviewActionProof = false,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=advisor&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
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
    if ((await reviewRegion.count()) === 0) {
      await expect(supportabilityRegion).toBeVisible({ timeout: timeoutMs });
      summary.uiChecks.push({
        description: "Advisor brief ACCEPT review action",
        kind: "workflow-pack-review-action",
        actionType: "ACCEPT",
        state: "not-currently-allowed",
      });
      return;
    }
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
    canonicalAsOfDate,
    timeoutMs,
    assertTableHasRows,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=risk&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
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
    canonicalAsOfDate,
    timeoutMs,
    screenshotRegisteredPanel,
  }
) {
  await page.goto(
    `${workbenchBaseUrl}/performance?portfolioId=${portfolioId}&mode=evidence&period=YTD&detailBasis=NET&benchmark=${benchmarkCode}&reportEndDate=${canonicalAsOfDate}`,
    { waitUntil: "networkidle", timeout: timeoutMs }
  );
  await assertRailModeActive(page, /^Evidence/, timeoutMs);
  await expect(page.getByRole("heading", { name: "Evidence and Calculation Context" })).toBeVisible({
    timeout: timeoutMs,
  });
  const evidenceStatusStrip = page.getByLabel("Evidence support status");
  let screenshotState = "truthfully_degraded";
  if (await evidenceStatusStrip.count()) {
    await expect(evidenceStatusStrip).toBeVisible({ timeout: timeoutMs });
    summary.uiChecks.push({
      description: "Evidence support status",
      kind: "status-strip",
      state: "supported",
    });
    screenshotState = "demo_ready";
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
    state: screenshotState,
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
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=reviews`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const outcomeReviewPanel = workbenchPanelByClass(page, "outcome-review-panel");
  await expect(
    outcomeReviewPanel.getByRole("heading", { name: "Outcome Reviews" })
  ).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByText("Evidence available")).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Outcome reviews"),
    1,
    "Outcome reviews"
  );
  await assertTableHasRows(
    tableByExactLabel(page, "Outcome review dimensions"),
    1,
    "Outcome review dimensions"
  );
  await expect(outcomeReviewPanel.getByText("Selected Review Detail")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByText("Evidence Availability")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByRole("button", { name: "Request report" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(outcomeReviewPanel.getByRole("button", { name: "Request advisor memo" })).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.outcome_review");
}

export async function validateDpmCommandCenterPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, assertTableHasRows, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=mandate`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  await expect(page.getByRole("heading", { name: "Mandate Health" }).first()).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(page.getByText("Mandate Readiness").first()).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByText("Data Readiness").first()).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByText("Attention Required").first()).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByText("Recommended Actions").first()).toBeVisible({ timeout: timeoutMs });
  await expect(page.getByText("Health Dimensions Breakdown").first()).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.command_center");
}

export async function validateDpmWaveCommandCenterPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=waves`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const wavePanel = workbenchPanelByClass(page, "dpm-wave-command-center-panel");
  await expect(wavePanel.getByRole("heading", { name: "Rebalance", exact: true })).toBeVisible({
    timeout: timeoutMs,
  });
  const readinessStrip = wavePanel.getByLabel("Rebalance readiness");
  await expect(readinessStrip.getByText("Rebalance Status")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(readinessStrip.getByText("Approval Readiness")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Active Rebalance")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Recommended Actions")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByRole("heading", { name: "Proposed Changes" })).toBeVisible({
    timeout: timeoutMs,
  });
  for (const actionName of [
    "Preview",
    "Create Rebalance",
    "Review Data",
    "Simulate",
    "Request Approval",
    "Stage",
    "Prepare Handoff",
    "Open Evidence Pack",
    "Load Changes",
  ]) {
    await expect(wavePanel.getByRole("button", { name: actionName })).toBeVisible({
      timeout: timeoutMs,
    });
  }
  await wavePanel.getByRole("button", { name: "Preview" }).click({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Preview completed.")).toBeVisible({
    timeout: timeoutMs,
  });
  await wavePanel.getByRole("button", { name: "Create Rebalance" }).click({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Create rebalance completed.")).toBeVisible({
    timeout: timeoutMs,
  });
  await wavePanel.getByRole("button", { name: "Load Changes" }).click({
    timeout: timeoutMs,
  });
  await expect(wavePanel.getByText("Load proposed changes completed.")).toBeVisible({
    timeout: timeoutMs,
  });
  await screenshotRegisteredPanel(page, "dpm.wave_command_center");
}

export async function validatePortfolioMemoryPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, assertTableHasRows, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=memory`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const memoryPanel = workbenchPanelByClass(page, "portfolio-memory-panel");
  await expect(memoryPanel.getByRole("heading", { name: "Portfolio Memory" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Audit trail available")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Historical Event Log")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Recommended Actions")).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(memoryPanel.getByText("Support Snapshot")).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Portfolio memory event timeline"),
    1,
    "Portfolio memory event timeline"
  );
  await screenshotRegisteredPanel(page, "dpm.portfolio_memory");
}

export async function validateProofPackPanel(
  page,
  { workbenchBaseUrl, portfolioId, timeoutMs, assertTableHasRows, screenshotRegisteredPanel }
) {
  await page.goto(`${workbenchBaseUrl}/workbench/${portfolioId}?mode=proof`, {
    waitUntil: "networkidle",
    timeout: timeoutMs,
  });
  const proofPackPanel = workbenchPanelByClass(page, "proof-pack-panel");
  await expect(proofPackPanel.getByRole("heading", { name: "Evidence Pack" })).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/Summary (Available|Unavailable)/)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/Report (Available|Unavailable)/)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/Memo (Available|Unavailable)/)).toBeVisible({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByRole("button", { name: "Open advisor memo" }).first()).toBeVisible({
    timeout: timeoutMs,
  });
  await proofPackPanel.getByRole("button", { name: "Prepare evidence" }).click({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText("Evidence pack prepared.")).toBeVisible({
    timeout: timeoutMs,
  });
  await proofPackPanel.getByRole("button", { name: "Open advisor memo" }).first().click({
    timeout: timeoutMs,
  });
  await expect(proofPackPanel.getByText(/^Advisor memo /)).toBeVisible({
    timeout: timeoutMs,
  });
  await assertTableHasRows(
    tableByExactLabel(page, "Evidence areas"),
    1,
    "Evidence areas"
  );
  await screenshotRegisteredPanel(page, "dpm.proof_pack");
}
