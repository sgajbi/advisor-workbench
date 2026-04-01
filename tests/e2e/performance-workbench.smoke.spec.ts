import { test, expect } from '@playwright/test';
import {
  expectActiveTab,
  measureElement,
  measureTableFrame,
  parseServerTimingDuration,
  parseServerTimingMetrics,
} from './workbench-smoke-helpers';

test.describe.configure({ mode: 'serial' });

async function openPerformanceWorkbench(page: import('@playwright/test').Page) {
  await page.goto('/performance', {
    waitUntil: 'domcontentloaded',
  });

  const workbenchHeading = page.getByRole('heading', { name: /^Performance$/i });
  const unavailableHeading = page.getByRole('heading', {
    name: /^Performance data unavailable$/i,
  });

  if (
    (await workbenchHeading.count()) === 0 &&
    (await unavailableHeading.count()) > 0
  ) {
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  await expect(
    workbenchHeading
  ).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole('tablist', { name: /^Performance workspace mode$/i })
  ).toBeVisible({ timeout: 30000 });
}

async function resolveSmokePortfolioId(request: import('@playwright/test').APIRequestContext) {
  const response = await request.get('http://127.0.0.1:3000/api/bff/api/v1/lookups/portfolios?limit=8', {
    timeout: 30000,
  });
  expect(response.status()).toBe(200);
  const payload = (await response.json()) as {
    items?: Array<{ id: string }>;
  };
  const portfolioIds = payload.items?.map((item) => item.id) ?? [];
  return (
    portfolioIds.find((candidate) => candidate === 'PB_SG_GLOBAL_BAL_001') ??
    portfolioIds.find((candidate) => candidate === 'DEMO_ADV_USD_001') ??
    portfolioIds[0]
  );
}

test.describe('Performance workbench smoke', () => {
  test('split performance endpoints expose server timing to the live browser', async ({ page, request }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);
    const portfolioId = await resolveSmokePortfolioId(request);
    expect(portfolioId).toBeTruthy();

    const fetchWithTiming = async (path: string) => {
      const response = await request.get(`http://127.0.0.1:3000${path}`, {
        headers: { 'cache-control': 'no-store' },
        timeout: 30000,
      });
      return {
        status: response.status(),
        serverTiming: response.headers()['server-timing'] ?? null,
      };
    };

    const [summary, details, horizon, attribution] = await Promise.all([
      fetchWithTiming(
        `/api/bff/api/v1/workbench/${portfolioId}/performance/summary?period=EXPLICIT&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&report_start_date=2026-01-01&report_end_date=2026-03-30`
      ),
      fetchWithTiming(
        `/api/bff/api/v1/workbench/${portfolioId}/performance/details?period=EXPLICIT&chart_frequency=monthly&contribution_dimension=asset_class&attribution_dimension=asset_class&detail_basis=NET&report_start_date=2026-01-01&report_end_date=2026-03-30`
      ),
      fetchWithTiming(
        `/api/bff/api/v1/workbench/${portfolioId}/performance/horizon-comparison?detail_basis=NET&chart_frequency=monthly`
      ),
      fetchWithTiming(
        `/api/bff/api/v1/workbench/${portfolioId}/performance/attribution-trend?period=EXPLICIT&chart_frequency=monthly&attribution_dimension=asset_class&detail_basis=NET&report_start_date=2026-01-01&report_end_date=2026-03-30`
      ),
    ]);
    const endpointResults = { summary, details, horizon, attribution };

    expect(endpointResults.summary.status).toBe(200);
    expect(endpointResults.details.status).toBe(200);
    expect(endpointResults.horizon.status).toBe(200);
    expect(endpointResults.attribution.status).toBe(200);

    const summaryMetrics = parseServerTimingMetrics(endpointResults.summary.serverTiming);
    const detailsMetrics = parseServerTimingMetrics(endpointResults.details.serverTiming);
    const horizonMetrics = parseServerTimingMetrics(endpointResults.horizon.serverTiming);
    const attributionMetrics = parseServerTimingMetrics(
      endpointResults.attribution.serverTiming
    );

    expect(parseServerTimingDuration(endpointResults.summary.serverTiming)).toBeGreaterThanOrEqual(
      0
    );
    expect(parseServerTimingDuration(endpointResults.details.serverTiming)).toBeGreaterThanOrEqual(
      0
    );
    expect(parseServerTimingDuration(endpointResults.horizon.serverTiming)).toBeGreaterThanOrEqual(
      0
    );
    expect(
      parseServerTimingDuration(endpointResults.attribution.serverTiming)
    ).toBeGreaterThanOrEqual(0);

    expect(summaryMetrics.get('perf-reference')).toBeGreaterThanOrEqual(0);
    expect(summaryMetrics.get('perf-benchmark')).toBeGreaterThanOrEqual(0);
    expect(summaryMetrics.get('perf-summary')).toBeGreaterThanOrEqual(0);

    expect(detailsMetrics.get('perf-reference')).toBeGreaterThanOrEqual(0);
    expect(detailsMetrics.get('perf-benchmark')).toBeGreaterThanOrEqual(0);
    expect(detailsMetrics.get('perf-summary')).toBeGreaterThanOrEqual(0);

    expect(horizonMetrics.get('perf-reference')).toBeGreaterThanOrEqual(0);
    expect(horizonMetrics.get('perf-benchmark')).toBeGreaterThanOrEqual(0);
    expect(horizonMetrics.get('perf-horizon')).toBeGreaterThanOrEqual(0);

    expect(attributionMetrics.get('perf-reference')).toBeGreaterThanOrEqual(0);
    expect(attributionMetrics.get('perf-benchmark')).toBeGreaterThanOrEqual(0);
    expect(attributionMetrics.get('perf-attribution')).toBeGreaterThanOrEqual(0);
  });

  test('summary keeps first paint and then mounts deferred analytics by mode', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);

    const executiveStrip = page.getByLabel('Executive return strip');
    await expect(executiveStrip.getByText('Portfolio Return')).toBeVisible();
    await expect(executiveStrip.getByText('Benchmark Return')).toBeVisible();
    await expect(executiveStrip.getByText('Active Return')).toBeVisible();
    await expect(executiveStrip.getByText('Net Flow')).toBeVisible();
    await expect(executiveStrip.getByText('Ending Market Value')).toBeVisible();
    await expect(executiveStrip.getByText('Period / Basis', { exact: true })).toBeVisible();

    await expect(page.locator('.performance-summary-stage')).toBeVisible();
    await expect(page.locator('.performance-analysis-stage')).toHaveCount(0);
    await expect(page.locator('.performance-evidence-module')).toHaveCount(0);

    const analysisTab = page.getByRole('tab', { name: /^Analysis$/i });
    const evidenceTab = page.getByRole('tab', { name: /^Evidence$/i });
    await expectActiveTab(page, /^Summary$/i);

    await expect(page.getByRole('group', { name: /^Return vs Benchmark$/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('img', { name: /Net Return Path chart/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Horizon Comparison')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText('Performance Drivers')).toBeVisible({
      timeout: 15000,
    });

    const returnPathPanel = page.locator('.performance-chart-stage');
    const chartMetrics = await measureElement(returnPathPanel);
    expect(chartMetrics.height).toBeLessThanOrEqual(1300);
    expect(chartMetrics.width).toBeGreaterThan(900);

    await analysisTab.click();
    await expectActiveTab(page, /^Analysis$/i);
    await expect(page.locator('.performance-analysis-stage')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Attribution Detail$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Performance Drivers$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.performance-analysis-module')).toHaveCount(3);
    await expect(page.getByLabel('Top / Bottom Contributors panel')).toBeVisible();
    await expect(page.getByLabel('Contribution Detail panel')).toBeVisible();
    await expect(page.getByLabel('Top Effects panel')).toBeVisible();
    await expect(page.getByLabel('Attribution Detail panel')).toBeVisible();

    await expect(evidenceTab).toBeDisabled();
  });

  test('analysis mode renders live attribution analytics', async ({ page }) => {
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
      page.getByRole('heading', { name: /^Performance Drivers$/i })
    ).toBeVisible({ timeout: 15000 });

    const trendShell = page.locator('.performance-analysis-trend-shell');
    await expect(trendShell).toBeVisible();
    await expect(page.getByLabel('Attribution trend summary strip')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('img', { name: /^Attribution over time chart$/i })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByLabel('Attribution trend table')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Latest Total Effect')).toBeVisible();
    await expect(page.getByLabel('Attribution trend summary strip').getByText('Cumulative Total')).toBeVisible();

    await expect(page.getByLabel('Top Effects panel')).toBeVisible();
    await expect(page.getByLabel('Attribution Detail panel')).toBeVisible();
    await expect(page.getByRole('tab', { name: /^Relative Segment Context$/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByRole('tab', { name: /^Effect breakdown/i })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    await expect(page.getByText('Total Effect Ranking')).toBeVisible();
    await expect(page.getByText('Relative Segment Matrix')).toBeVisible();
    await expect(page.getByLabel('Asset Class attribution table')).toHaveCount(0);

    await page.getByRole('tab', { name: /^Effect breakdown/i }).click();
    await expect(page.getByRole('tab', { name: /^Effect breakdown/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    await expect(page.getByLabel('Asset Class attribution totals')).toBeVisible();
    await expect(page.getByText('Attribution Summary')).toBeVisible();
    await expect(page.getByText('Relative Segment Matrix')).toHaveCount(0);

    await expect(page.getByLabel('Attribution trend table')).toBeVisible();
    await expect(page.getByLabel('Asset Class attribution totals')).toBeVisible();
    await expect(page.getByLabel('Position contribution table')).toBeVisible();

    const trendMetrics = await measureElement(trendShell);
    expect(trendMetrics.height).toBeLessThanOrEqual(900);
    expect(trendMetrics.width).toBeGreaterThan(800);
  });

  test('analysis contribution module renders live position detail cleanly', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);

    const analysisTab = page.getByRole('tab', { name: /^Analysis$/i });
    await expect(analysisTab).toBeVisible();
    await analysisTab.click();
    await expectActiveTab(page, /^Analysis$/i);

    const contributionModule = page.locator('#performance-drivers');
    await expect(contributionModule).toBeVisible({ timeout: 15000 });
    await expect(
      contributionModule.getByRole('heading', { name: /^Performance Drivers$/i })
    ).toBeVisible();
    await expect(contributionModule.getByLabel('Top / Bottom Contributors panel')).toBeVisible();
    await expect(contributionModule.getByLabel('Contribution Detail panel')).toBeVisible();
    await expect(contributionModule.getByText('Top / Bottom Contributors')).toBeVisible();
    await expect(contributionModule.getByText('Ranked contributors')).toBeVisible();
    await expect(contributionModule.getByLabel('Position contribution table')).toBeVisible();
    await expect(contributionModule.getByLabel('Asset Class contribution table')).toHaveCount(0);
    await expect(
      contributionModule.getByRole('cell', { name: 'AAPL US', exact: true })
    ).toBeVisible();
    await expect(
      contributionModule.getByRole('cell', { name: 'BLK ALLOC', exact: true })
    ).toBeVisible();
    await expect(
      contributionModule
        .getByRole('tab', { name: /^Positions/i })
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      contributionModule
        .getByRole('tab', { name: /^Segment breakdown/i })
    ).toHaveAttribute('aria-selected', 'false');

    const positionHeaders = await contributionModule
      .locator('table[aria-label="Position contribution table"] thead th')
      .allTextContents();
    expect(positionHeaders.slice(0, 4)).toEqual([
      'Position',
      'Contribution',
      'Avg. Weight',
      'Return',
    ]);

    const positionFrame = await measureTableFrame(
      contributionModule.getByLabel('Position contribution table').locator('..')
    );
    expect(positionFrame.scrollWidth - positionFrame.clientWidth).toBeLessThanOrEqual(12);

    await contributionModule.getByRole('tab', { name: /^Segment breakdown/i }).click();
    await expect(
      contributionModule.getByRole('tab', { name: /^Segment breakdown/i })
    ).toHaveAttribute('aria-selected', 'true');
    await expect(contributionModule.getByLabel('Position contribution table')).toHaveCount(0);
    await expect(contributionModule.getByLabel('Asset Class contribution table')).toBeVisible();
    await expect(contributionModule.getByText('Equity')).toBeVisible();
    await expect(contributionModule.getByText('Fund')).toBeVisible();

    const aggregateFrame = await measureTableFrame(
      contributionModule.getByLabel('Asset Class contribution table').locator('..')
    );
    expect(aggregateFrame.scrollWidth - aggregateFrame.clientWidth).toBeLessThanOrEqual(12);

    const moduleMetrics = await measureElement(contributionModule);
    expect(moduleMetrics.width).toBeGreaterThan(1000);
    expect(moduleMetrics.height).toBeLessThan(1200);
  });

  test('evidence mode remains intentionally unavailable when the backend contract does not expose it', async ({ page }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    await openPerformanceWorkbench(page);

    const evidenceTab = page.getByRole('tab', { name: /^Evidence$/i });
    await expect(evidenceTab).toBeDisabled();
    await expect(evidenceTab).toHaveAttribute(
      'title',
      'Evidence and lineage surfaces are not exposed by the current gateway contract.'
    );
    await expect(page.locator('.performance-evidence-module')).toHaveCount(0);
  });
});
