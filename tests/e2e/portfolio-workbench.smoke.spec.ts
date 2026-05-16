import { test, expect } from '@playwright/test';
import {
  measureAgGridViewport,
  measureElement,
  measureGrid,
  measureTableFrame,
  setLocalStorageBeforeNavigation,
} from './workbench-smoke-helpers';

async function resolveSmokePortfolioId(request: import('@playwright/test').APIRequestContext) {
  const response = await request.get('http://127.0.0.1:3000/api/bff/api/v1/foundation/portfolios', {
    timeout: 30000,
  });
  if (!response.ok()) {
    return null;
  }
  const payload = (await response.json()) as {
    items?: Array<{ portfolio_id: string }>;
  };
  const portfolioIds = payload.items?.map((item) => item.portfolio_id) ?? [];
  return (
    portfolioIds.find((candidate) => candidate === 'PB_SG_GLOBAL_BAL_001') ??
    portfolioIds.find((candidate) => candidate === 'DEMO_ADV_USD_001') ??
    portfolioIds[0]
  );
}

async function openSummaryPortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  await setLocalStorageBeforeNavigation(page, {
    'lotus:portfolio:view-mode': 'summary',
  });
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/portfolio', {
      waitUntil: 'domcontentloaded',
    });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/portfolio?portfolioId=${portfolioId}`, {
    waitUntil: 'domcontentloaded',
  });

  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Portfolio Summary$/i })).toBeVisible({ timeout: 15000 });

  return { portfolioId, available: true };
}

async function openDetailedPortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  await setLocalStorageBeforeNavigation(page, {
    'lotus:portfolio:view-mode': 'detailed',
    'lotus:portfolio:section:income': 'true',
    'lotus:portfolio:section:activity': 'true',
    'lotus:portfolio:section:holdings': 'true',
    'lotus:portfolio:section:transactions': 'true',
    'lotus:portfolio:section:projected-cashflow': 'true',
  });
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/portfolio', { waitUntil: 'domcontentloaded' });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/portfolio?portfolioId=${portfolioId}`, { waitUntil: 'domcontentloaded' });
  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Portfolio Summary$/i })).toBeVisible({ timeout: 15000 });

  await expect(page.getByRole('heading', { name: /^Income & Activity$/i })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.portfolio-data-grid').first()).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByLabel(/Projected cashflow chart in /i)
  ).toBeVisible({ timeout: 15000 });

  return { portfolioId, available: true };
}

async function openIncomePortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/income', { waitUntil: 'domcontentloaded' });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/income?portfolioId=${portfolioId}`, { waitUntil: 'domcontentloaded' });
  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio records unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Income & Activity$/i })).toBeVisible({
    timeout: 15000,
  });
  return { portfolioId, available: true };
}

test.describe('Portfolio workbench smoke', () => {
  test('summary stays summary-first and does not mount detailed drilldowns', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openSummaryPortfolio(page, request);
    test.skip(!session.available, 'Portfolio foundation upstream unavailable in standalone smoke environment.');

    await expect(page.getByRole('heading', { name: /Asset Allocation/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Top Holdings/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Cashflow Forecast/i })).toBeVisible();
    await expect(page.getByText('Portfolio Health')).toBeVisible();
    await expect(page.getByRole('link', { name: /Income/i })).toBeVisible();

    await expect(page.locator('.portfolio-paired-analytics-grid')).toHaveCount(0);
    await expect(page.locator('.portfolio-paired-analytics-grid-detailed')).toHaveCount(0);
    await expect(page.locator('.portfolio-data-grid')).toHaveCount(0);
    await expect(page.getByLabel('Income summary')).toHaveCount(0);
    await expect(page.getByLabel('Activity summary')).toHaveCount(0);
    await expect(page.getByLabel(/Projected cashflow chart in /i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Holdings$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Transactions$/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Projected Cashflow/i })).toHaveCount(0);

    const summaryModuleMetrics = await measureGrid(page.locator('.portfolio-summary-cluster').first());
    expect(summaryModuleMetrics.width).toBeGreaterThan(900);
  });

  test('detailed analytics keep grids usable and analytical surfaces proportionate', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openDetailedPortfolio(page, request);
    test.skip(!session.available, 'Portfolio foundation upstream unavailable in standalone smoke environment.');

    await expect(page.locator('.portfolio-paired-analytics-grid-detailed')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Open Income & Activity/i })).toBeVisible();

    const holdingsGrid = page.locator('.portfolio-data-grid').first();
    await expect(holdingsGrid).toBeVisible();
    const holdingsGridMetrics = await measureAgGridViewport(holdingsGrid);
    expect(holdingsGridMetrics.centerClientWidth).toBeGreaterThan(700);

    const cashflowTable = page.getByLabel('Cashflow outlook').locator('xpath=ancestor::*[contains(@class,"analytics-table-frame")][1]');
    await expect(cashflowTable).toBeVisible();

    for (const table of [cashflowTable]) {
      const metrics = await measureTableFrame(table);
      expect(metrics.scrollWidth - metrics.clientWidth).toBeLessThanOrEqual(8);
    }

    const cashflowChart = page.getByLabel(/Projected cashflow chart in /i);
    await expect(cashflowChart).toBeVisible();
    const cashflowChartMetrics = await measureElement(cashflowChart);
    expect(cashflowChartMetrics.height).toBeLessThanOrEqual(260);
    expect(cashflowChartMetrics.width).toBeGreaterThan(700);

  });

  test('income route renders the dedicated income and activity workspace', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openIncomePortfolio(page, request);
    test.skip(!session.available, 'Portfolio income upstream unavailable in standalone smoke environment.');

    await expect(page.getByRole('heading', { name: /^Income Summary$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Activity & Cash Movements$/i })).toBeVisible();
    await expect(page.locator('.portfolio-income-activity-workspace')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Income summary' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Activity and cash movements' })).toBeVisible();
    await expect(page.getByText('Cash Weight')).toBeVisible();

    const incomeGridMetrics = await measureGrid(page.locator('.portfolio-income-grid'));
    expect(incomeGridMetrics.childCount).toBe(2);
    expect(incomeGridMetrics.width).toBeGreaterThan(900);
  });
});
