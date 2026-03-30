import { test, expect } from '@playwright/test';
import {
  expectActiveTab,
  measureAgGridViewport,
  measureElement,
  measureGrid,
  measureTableFrame,
  setLocalStorageBeforeNavigation,
} from './workbench-smoke-helpers';

test.describe('UI smoke checks', () => {
  async function openSummaryPortfolio(page: import('@playwright/test').Page) {
    await setLocalStorageBeforeNavigation(page, {
      'lotus:portfolio:view-mode': 'summary',
    });
    await page.goto('/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001', {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByRole('heading', { name: /^Portfolio$/i })).toBeVisible();
    const summaryViewButton = page.getByRole('button', { name: /^Summary$/i });
    await expect(summaryViewButton).toBeVisible();
    await expect(summaryViewButton).toHaveAttribute('aria-pressed', 'true');
  }

  async function openPerformanceWorkbench(page: import('@playwright/test').Page) {
    await page.goto('/performance?portfolioId=PB_SG_GLOBAL_BAL_001', {
      waitUntil: 'domcontentloaded',
    });

    await expect(
      page.getByRole('heading', { name: /^Performance Workbench$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('tablist', { name: /^Performance workspace mode$/i })
    ).toBeVisible({ timeout: 15000 });
  }

  async function openDetailedPortfolio(page: import('@playwright/test').Page) {
    await setLocalStorageBeforeNavigation(page, {
      'lotus:portfolio:view-mode': 'detailed',
      'lotus:portfolio:section:income': 'true',
      'lotus:portfolio:section:activity': 'true',
      'lotus:portfolio:section:holdings': 'true',
      'lotus:portfolio:section:transactions': 'true',
      'lotus:portfolio:section:projected-cashflow': 'true',
    });
    await page.goto('/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /^Portfolio$/i })).toBeVisible();

    const detailedViewButton = page.getByRole('button', { name: /^Detailed$/i });
    await expect(detailedViewButton).toBeVisible();
    await detailedViewButton.click();
    await expect(detailedViewButton).toHaveAttribute('aria-pressed', 'true');

    await expect(page.locator('.portfolio-paired-analytics-grid-detailed')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('.portfolio-data-grid').first()).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByLabel(/Projected cashflow chart in /i)
    ).toBeVisible({ timeout: 15000 });
  }

  test('portfolio foundation page renders core sections', async ({ page }) => {
    await page.goto('/portfolios', { waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: /^Portfolio$|^Portfolio unavailable$/i })
    ).toBeVisible();
    await expect(page.getByText(/Client Portfolios|Portfolio unavailable/i)).toBeVisible();
  });

  test('portfolio intake tabs are reachable and render expected workspaces', async ({ page }) => {
    await page.goto('/intake', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })).toBeVisible();
    const operationTabs = page.locator('.MuiToggleButtonGroup-root').last();

    await operationTabs.getByRole('button', { name: /^Create Portfolio$/i }).click();
    await expect(page.getByRole('heading', { name: /Create Portfolio Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Positions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Positions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Transactions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Transactions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Instruments$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Instruments Workspace/i })).toBeVisible();

    await operationTabs.getByRole('button', { name: /^Add Market Data$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Market Data Workspace/i })).toBeVisible();
  });

  test('proposals simulate page renders core controls', async ({ page }) => {
    await page.goto('/proposals/simulate', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Advisory Proposals/i })).toBeVisible();
    await expect(page.getByLabel(/Portfolio ID/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Simulate Proposal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible();
  });

  test('workbench page renders shell and message', async ({ page }) => {
    await page.goto('/workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText(/Decision Console|Advisor Workbench/i)).toBeVisible();
  });

  test('mobile layout has no horizontal overflow on key pages', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ['/portfolios', '/intake', '/proposals/simulate', '/workbench']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow detected on ${path}`).toBeFalsy();
    }
  });

  test('detailed portfolio analytics keep grids usable and analytical surfaces proportionate', async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openDetailedPortfolio(page);

    const detailedAnalyticsGrid = page.locator('.portfolio-paired-analytics-grid-detailed');
    await expect(detailedAnalyticsGrid).toBeVisible();

    const analyticsGridMetrics = await measureGrid(detailedAnalyticsGrid);

    expect(analyticsGridMetrics.columns).not.toContain(' ');
    expect(analyticsGridMetrics.childWidths.every((width) => width >= analyticsGridMetrics.width - 2)).toBeTruthy();

    const holdingsGrid = page.locator('.portfolio-data-grid').first();
    await expect(holdingsGrid).toBeVisible();
    const holdingsGridMetrics = await measureAgGridViewport(holdingsGrid);
    expect(holdingsGridMetrics.centerClientWidth).toBeGreaterThan(700);

    const incomeTable = page.getByLabel('Income summary').locator('xpath=ancestor::*[contains(@class,"analytics-table-frame")][1]');
    const activityTable = page.getByLabel('Activity summary').locator('xpath=ancestor::*[contains(@class,"analytics-table-frame")][1]');
    const cashflowTable = page.getByLabel('Cashflow outlook').locator('xpath=ancestor::*[contains(@class,"analytics-table-frame")][1]');
    await expect(incomeTable).toBeVisible();
    await expect(activityTable).toBeVisible();
    await expect(cashflowTable).toBeVisible();

    for (const table of [incomeTable, activityTable, cashflowTable]) {
      const metrics = await measureTableFrame(table);
      expect(metrics.scrollWidth - metrics.clientWidth).toBeLessThanOrEqual(8);
    }

    const cashflowChart = page.getByLabel(/Projected cashflow chart in /i);
    await expect(cashflowChart).toBeVisible();
    const cashflowChartMetrics = await measureElement(cashflowChart);
    expect(cashflowChartMetrics.height).toBeLessThanOrEqual(260);
    expect(cashflowChartMetrics.width).toBeGreaterThan(700);

    await expect(page.getByText('Window inflow')).toBeVisible();
    await expect(page.getByText('Window outflow')).toBeVisible();
    await expect(page.getByText('Window fees')).toBeVisible();
    await expect(page.getByText('Window taxes')).toBeVisible();
  });

  test('portfolio summary stays summary-first and does not mount detailed drilldowns', async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openSummaryPortfolio(page);

    await expect(page.getByRole('heading', { name: /Portfolio Allocation/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Top Holdings/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Performance Snapshot/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Income$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Activity$/i })).toBeVisible();

    await expect(page.locator('.portfolio-paired-analytics-grid')).toBeVisible();
    await expect(page.locator('.portfolio-paired-analytics-grid-detailed')).toHaveCount(0);
    await expect(page.locator('.portfolio-data-grid')).toHaveCount(0);
    await expect(page.getByLabel('Income summary')).toHaveCount(0);
    await expect(page.getByLabel('Activity summary')).toHaveCount(0);
    await expect(page.getByLabel(/Projected cashflow chart in /i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Holdings$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Transactions$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Projected Cashflow/i })).toHaveCount(0);

    const pairedAnalyticsMetrics = await measureGrid(page.locator('.portfolio-paired-analytics-grid'));
    expect(pairedAnalyticsMetrics.columns).toContain(' ');
    expect(pairedAnalyticsMetrics.childCount).toBe(2);
    expect(pairedAnalyticsMetrics.width).toBeGreaterThan(900);
  });

  test('performance workbench keeps summary first, then mounts deferred analytics by mode', async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);

    const executiveStrip = page.getByLabel('Executive return strip');
    await expect(executiveStrip.getByText('Portfolio Return')).toBeVisible();
    await expect(executiveStrip.getByText('Benchmark Return')).toBeVisible();
    await expect(executiveStrip.getByText('Active Return')).toBeVisible();
    await expect(executiveStrip.getByText('Money-Weighted Return')).toBeVisible();
    await expect(executiveStrip.getByText('Basis', { exact: true })).toBeVisible();
    await expect(executiveStrip.getByText('Period', { exact: true })).toBeVisible();

    await expect(page.locator('.performance-summary-stage')).toBeVisible();
    await expect(page.locator('.performance-analysis-stage')).toHaveCount(0);
    await expect(page.locator('.performance-evidence-module')).toHaveCount(0);

    const analysisTab = page.getByRole('tab', { name: /^Analysis$/i });
    const evidenceTab = page.getByRole('tab', { name: /^Evidence$/i });
    await expectActiveTab(page, /^Summary$/i);

    await expect(page.getByText('Return path and benchmark context')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Return series unavailable')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('How did this compare across horizons?')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('What drove the result?')).toBeVisible({
      timeout: 15000,
    });

    const returnPathPanel = page.locator('.performance-chart-stage');
    const chartMetrics = await measureElement(returnPathPanel);
    expect(chartMetrics.height).toBeLessThanOrEqual(520);
    expect(chartMetrics.width).toBeGreaterThan(900);

    await analysisTab.click();
    await expectActiveTab(page, /^Analysis$/i);
    await expect(page.locator('.performance-analysis-stage')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Attribution Detail$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Contribution Detail$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.performance-analysis-module')).toHaveCount(3);

    await evidenceTab.click();
    await expectActiveTab(page, /^Evidence$/i);
    await expect(page.getByText('Evidence and Calculation Context')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('.performance-evidence-module')).toBeVisible();
  });

  test('performance analysis degraded state stays compact and intentional', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);

    const analysisTab = page.getByRole('tab', { name: /^Analysis$/i });
    await analysisTab.click();
    await expectActiveTab(page, /^Analysis$/i);

    const analysisStage = page.locator('.performance-analysis-stage');
    await expect(analysisStage).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole('heading', { name: /^Attribution Over Time$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Attribution Detail$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Contribution Detail$/i })
    ).toBeVisible({ timeout: 15000 });

    const statePanels = page.locator('.performance-analysis-state-panel');
    await expect(statePanels).toHaveCount(3);

    const statePanelMetrics = await statePanels.evaluateAll((elements) =>
      elements.map((element) => ({
        height: element.getBoundingClientRect().height,
        width: element.getBoundingClientRect().width,
      }))
    );
    expect(statePanelMetrics.every((panel) => panel.height <= 240)).toBeTruthy();
    expect(statePanelMetrics.every((panel) => panel.width >= 400)).toBeTruthy();

    await expect(page.getByText('Loading attribution trend')).toBeVisible();
    await expect(page.getByText('Attribution detail unavailable')).toBeVisible();
    await expect(page.getByText('Contribution detail unavailable')).toBeVisible();
    await expect(page.locator('.performance-analysis-table')).toHaveCount(0);

    const trendShell = page.locator('.performance-analysis-trend-shell');
    await expect(trendShell).toBeVisible();
    const trendMetrics = await measureElement(trendShell);
    expect(trendMetrics.height).toBeLessThanOrEqual(640);
    expect(trendMetrics.width).toBeGreaterThan(800);
  });

  test('performance evidence mode uses the shared unavailable state shell intentionally', async ({ page }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);

    const evidenceTab = page.getByRole('tab', { name: /^Evidence$/i });
    await evidenceTab.click();
    await expectActiveTab(page, /^Evidence$/i);

    const evidenceModule = page.locator('.performance-evidence-module');
    await expect(evidenceModule).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Evidence and Calculation Context$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.performance-analysis-state-panel')).toHaveCount(1);
    await expect(page.getByText('Evidence unavailable')).toBeVisible();
    await expect(
      page.getByText(
        'Execution status, lineage artifacts, and calculation evidence are not exposed by the current backend contract.'
      )
    ).toBeVisible();

    const evidenceMetrics = await measureElement(evidenceModule);
    expect(evidenceMetrics.height).toBeLessThanOrEqual(420);
    expect(evidenceMetrics.width).toBeGreaterThan(900);
  });
});
