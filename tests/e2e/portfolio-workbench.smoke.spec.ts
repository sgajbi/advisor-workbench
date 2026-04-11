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

  await expect(page.getByRole('heading', { name: /^Portfolio$/i })).toBeVisible({ timeout: 15000 });
  const summaryViewTab = page.getByRole('tab', { name: /^Summary$/i });
  await expect(summaryViewTab).toBeVisible();
  await expect(summaryViewTab).toHaveAttribute('aria-selected', 'true');

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

  await expect(page.getByRole('heading', { name: /^Portfolio$/i })).toBeVisible({ timeout: 15000 });

  const detailedViewTab = page.getByRole('tab', { name: /^Detailed$/i });
  await expect(detailedViewTab).toBeVisible();
  await detailedViewTab.click();
  await expect(detailedViewTab).toHaveAttribute('aria-selected', 'true');

  await expect(page.locator('.portfolio-paired-analytics-grid-detailed')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('.portfolio-data-grid').first()).toBeVisible({ timeout: 15000 });
  await expect(
    page.getByLabel(/Projected cashflow chart in /i)
  ).toBeVisible({ timeout: 15000 });

  return { portfolioId, available: true };
}

test.describe('Portfolio workbench smoke', () => {
  test('summary stays summary-first and does not mount detailed drilldowns', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openSummaryPortfolio(page, request);
    test.skip(!session.available, 'Portfolio foundation upstream unavailable in standalone smoke environment.');

    await expect(page.getByRole('heading', { name: /Portfolio Allocation/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Top Positions/i })).toBeVisible();
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

  test('detailed analytics keep grids usable and analytical surfaces proportionate', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openDetailedPortfolio(page, request);
    test.skip(!session.available, 'Portfolio foundation upstream unavailable in standalone smoke environment.');

    const detailedAnalyticsGrid = page.locator('.portfolio-paired-analytics-grid-detailed');
    await expect(detailedAnalyticsGrid).toBeVisible();

    const analyticsGridMetrics = await measureGrid(detailedAnalyticsGrid);
    expect(analyticsGridMetrics.childCount).toBe(2);
    expect(analyticsGridMetrics.width).toBeGreaterThan(900);
    expect(analyticsGridMetrics.childWidths.every((width) => width >= 900)).toBeTruthy();

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
});
