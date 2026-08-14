import { test, expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import {
  buildPerformanceSmokePagePath,
  classifyPerformanceSummaryPosture,
  loadPerformanceSmokeSummary,
  type PerformanceSummaryPosture,
} from './performance-workbench-supportability';
import {
  startPerformanceFixtureGateway,
  type PerformanceFixtureGateway,
  type PerformanceFixtureGatewayScenario,
} from './performance-fixture-gateway';
import {
  measureElement,
  measureTableFrame,
  parseServerTimingDuration,
  parseServerTimingMetrics,
} from './workbench-smoke-helpers';
import { observeBrowserRuntimeFailures } from './browser-runtime-reliability';

test.describe.configure({ mode: 'default' });

let fixtureGateway: PerformanceFixtureGateway | null = null;

test.beforeAll(async () => {
  const scenario = process.env.PERFORMANCE_E2E_FIXTURE;
  if (
    scenario !== 'populated' &&
    scenario !== 'unavailable' &&
    scenario !== 'refresh-integrity' &&
    scenario !== 'trend-integrity' &&
    scenario !== 'horizon-integrity' &&
    scenario !== 'analysis-controls'
  ) {
    return;
  }
  const port = Number(process.env.PERFORMANCE_E2E_FIXTURE_PORT ?? '18100');
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== 'performance'
  ) {
    throw new Error(
      `Performance fixture proof requires the owned gateway at ${expectedGateway}.`,
    );
  }
  fixtureGateway = await startPerformanceFixtureGateway({
    port,
    scenario: scenario as PerformanceFixtureGatewayScenario,
  });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

async function resolveSmokePortfolioId(request: APIRequestContext) {
  const response = await request.get('/api/bff/api/v1/lookups/portfolios?limit=8', {
    timeout: 30000,
  });
  if (!response.ok()) {
    return null;
  }
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

async function openPerformanceWorkbench(
  page: Page,
  request: APIRequestContext
) {
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/performance', {
      waitUntil: 'domcontentloaded',
    });
    return { portfolioId: null, available: false };
  }

  await page.goto(buildPerformanceSmokePagePath(portfolioId), {
    waitUntil: 'domcontentloaded',
  });

  const workbenchHeading = page.getByRole('heading', { name: /^Performance$/i });
  const unavailableHeading = page.getByRole('heading', {
    name: /^Performance data unavailable$/i,
  });

  if ((await workbenchHeading.count()) === 0 && (await unavailableHeading.count()) > 0) {
    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(workbenchHeading).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByLabel('Performance surface navigation').getByRole('button', { name: /^Performance Overview$/i })
  ).toBeVisible({ timeout: 30000 });
  return { portfolioId, available: true };
}

function getExecutiveMetric(executiveStrip: Locator, label: string): Locator {
  return executiveStrip.getByText(label, { exact: true }).locator('..');
}

async function expectExecutiveMetric(
  executiveStrip: Locator,
  label: string,
  reported: boolean,
): Promise<void> {
  const metric = getExecutiveMetric(executiveStrip, label);
  await expect(metric).toBeVisible();
  if (reported) {
    await expect(metric).not.toContainText(/N\/A|Unavailable/);
    return;
  }
  await expect(metric).toContainText(/N\/A|Unavailable/);
}

async function loadSummaryPosture(
  request: APIRequestContext,
  portfolioId: string,
): Promise<PerformanceSummaryPosture> {
  return classifyPerformanceSummaryPosture(
    await loadPerformanceSmokeSummary(request, portfolioId),
  );
}

test.describe('Performance workbench smoke', () => {
  test('split performance endpoints expose server timing to the live browser', async ({ page, request }) => {
    test.skip(
      Boolean(process.env.PERFORMANCE_E2E_FIXTURE),
      'Fixture-backed UI proof does not certify live upstream Server-Timing propagation.',
    );
    test.setTimeout(90000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPerformanceWorkbench(page, request);
    test.skip(!session.available || !session.portfolioId, 'Performance upstream unavailable in standalone smoke environment.');
    const portfolioId = session.portfolioId;

    const fetchWithTiming = async (path: string) => {
      const response = await request.get(`http://127.0.0.1:3000${path}`, {
        headers: { 'cache-control': 'no-store' },
        timeout: 60000,
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

  test('summary renders the source supportability posture truthfully', async ({ page, request }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPerformanceWorkbench(page, request);
    if (!session.available || !session.portfolioId) {
      test.skip(true, 'Performance upstream unavailable in standalone smoke environment.');
      return;
    }
    const posture = await loadSummaryPosture(request, session.portfolioId);
    const executiveStrip = page.getByLabel('Executive return strip');

    if (posture.capabilities.summary === 'unavailable') {
      await expect(executiveStrip).toHaveCount(0);
    } else {
      await expectExecutiveMetric(
        executiveStrip,
        'Opening MV',
        posture.metrics.openingMarketValue,
      );
      await expectExecutiveMetric(executiveStrip, 'Net Flow', posture.metrics.netFlow);
      await expectExecutiveMetric(
        executiveStrip,
        'Flow-Adjusted MV',
        posture.metrics.flowAdjustedMarketValue,
      );
      await expect(executiveStrip.getByText('Ending MV', { exact: true })).toHaveCount(
        posture.metrics.endingMarketValue ? 1 : 0,
      );
      await expect(executiveStrip.getByText('Opening Cash', { exact: true })).toHaveCount(
        posture.metrics.openingCash ? 1 : 0,
      );
      await expect(executiveStrip.getByText('Closing Cash', { exact: true })).toHaveCount(
        posture.metrics.closingCash ? 1 : 0,
      );
    }

    const returnDecisionReadout = page.getByLabel('Return decision readout');
    if (
      posture.capabilities.summary === 'unavailable' ||
      posture.capabilities.returnPath !== 'supported'
    ) {
      await expect(returnDecisionReadout).toHaveCount(0);
      if (posture.capabilities.summary !== 'unavailable') {
        await expect(getExecutiveMetric(executiveStrip, 'Benchmark Evidence')).toContainText(
          'Unavailable',
        );
        await expect(getExecutiveMetric(executiveStrip, 'Money-Weighted Return')).toContainText(
          posture.metrics.moneyWeightedReturn ? /Money-Weighted Return/ : /Unavailable/,
        );
      }
    } else {
      await expect(returnDecisionReadout).toBeVisible({ timeout: 15_000 });
      const moneyWeightedReturn = returnDecisionReadout
        .getByText('Money-Weighted Return', { exact: true })
        .locator('..');
      await expect(moneyWeightedReturn).toContainText(
        posture.metrics.moneyWeightedReturn ? /Money-Weighted Return/ : /Unavailable/,
      );
    }

    if (posture.capabilities.returnPath === 'supported') {
      await expect(page.getByLabel('Net Return Path chart')).toBeVisible({ timeout: 30_000 });
      await expect(page.getByLabel('Net Return Path unavailable')).toHaveCount(0);
    } else {
      await expect(page.getByLabel('Net Return Path unavailable')).toBeVisible({
        timeout: 30_000,
      });
    }

    await expect(page.getByRole('heading', { name: /^Horizon Comparison$/i })).toBeVisible({
      timeout: 15_000,
    });
    if (posture.capabilities.horizon === 'supported') {
      await expect(page.getByLabel('Horizon comparison unavailable state')).toHaveCount(0);
    } else {
      await expect(page.getByLabel('Horizon comparison unavailable state')).toBeVisible();
    }

    await expect(page.getByRole('heading', { name: /^Performance Drivers$/i })).toBeVisible({
      timeout: 15_000,
    });
    if (posture.capabilities.contributors === 'supported') {
      await expect(page.getByLabel('Contributor ranking unavailable state')).toHaveCount(0);
    } else {
      await expect(page.getByLabel('Contributor ranking unavailable state')).toBeVisible();
    }

    await expect(page.locator('.performance-analysis-stage')).toHaveCount(0);
    await expect(page.locator('.performance-evidence-module')).toHaveCount(0);
    const workspaceRail = page.getByLabel('Performance surface navigation');
    await expect(
      workspaceRail.getByRole('button', { name: /^Performance Overview$/i }),
    ).toHaveAttribute('aria-current', 'page');
    await expect(page.getByLabel('Trust and completeness strip')).toHaveCount(0);
  });

  test('populated summary preserves its metric and layout contract', async ({ page, request }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPerformanceWorkbench(page, request);
    if (!session.available || !session.portfolioId) {
      test.skip(true, 'Performance upstream unavailable in standalone smoke environment.');
      return;
    }
    const posture = await loadSummaryPosture(request, session.portfolioId);
    test.skip(
      !posture.populated,
      'Populated layout proof requires supported source modules and complete source economics.',
    );

    const executiveStrip = page.getByLabel('Executive return strip');
    for (const label of [
      'Opening MV',
      'Net Flow',
      'Opening Cash',
      'Closing Cash',
      'Flow-Adjusted MV',
      'Ending MV',
    ]) {
      await expect(getExecutiveMetric(executiveStrip, label)).toBeVisible();
      await expect(getExecutiveMetric(executiveStrip, label)).not.toContainText(/N\/A|Unavailable/);
    }

    await expect(page.getByLabel('Net Return Path chart')).toBeVisible({ timeout: 30_000 });
    const returnDecisionReadout = page.getByLabel('Return decision readout');
    await expect(returnDecisionReadout).toBeVisible({ timeout: 15_000 });
    await expect(returnDecisionReadout).toContainText('Portfolio Return');
    await expect(returnDecisionReadout).toContainText('Benchmark Return');
    await expect(returnDecisionReadout).toContainText('Active Return');
    await expect(returnDecisionReadout).toContainText('Money-Weighted Return');

    const horizonModule = page
      .getByRole('heading', { name: /^Horizon Comparison$/i })
      .locator('xpath=ancestor::*[contains(@class, "performance-summary-driver-section")][1]');
    const driversModule = page
      .getByRole('heading', { name: /^Performance Drivers$/i })
      .locator('xpath=ancestor::*[contains(@class, "performance-summary-driver-section")][1]');
    const [horizonBox, driversBox] = await Promise.all([
      horizonModule.boundingBox(),
      driversModule.boundingBox(),
    ]);
    expect(horizonBox?.width ?? 0).toBeGreaterThan(500);
    expect(driversBox?.width ?? 0).toBeGreaterThan(420);
    expect(Math.abs((horizonBox?.y ?? 0) - (driversBox?.y ?? 9999))).toBeLessThanOrEqual(24);

    const firstHorizonRow = horizonModule.locator('.performance-horizon-matrix-row').first();
    await expect(firstHorizonRow).toBeVisible({ timeout: 15_000 });
    const firstHorizonPeriod = firstHorizonRow.locator('.performance-horizon-matrix-period');
    const firstHorizonSupport = firstHorizonRow.locator('.performance-horizon-matrix-support');
    const [rowBox, periodBox, supportBox] = await Promise.all([
      firstHorizonRow.boundingBox(),
      firstHorizonPeriod.boundingBox(),
      firstHorizonSupport.boundingBox(),
    ]);
    expect(periodBox?.width ?? 0).toBeGreaterThan(0);
    expect(supportBox?.width ?? 0).toBeGreaterThan(0);
    expect((supportBox?.x ?? 0) + (supportBox?.width ?? 0)).toBeLessThanOrEqual(
      (rowBox?.x ?? horizonBox?.x ?? 0) + (rowBox?.width ?? horizonBox?.width ?? 0) + 1,
    );

    const topContributorsHeading = page.getByText('Top Contributors', { exact: true });
    const topDetractorsHeading = page.getByText('Top Detractors', { exact: true });
    const topContributorsCard = topContributorsHeading.locator(
      'xpath=ancestor::*[contains(@class, "performance-contributors-ranked-card")][1]',
    );
    const topDetractorsCard = topDetractorsHeading.locator(
      'xpath=ancestor::*[contains(@class, "performance-contributors-ranked-card")][1]',
    );
    const [contributorsHeadingBox, detractorsHeadingBox, contributorsBox, detractorsBox] =
      await Promise.all([
        topContributorsHeading.boundingBox(),
        topDetractorsHeading.boundingBox(),
        topContributorsCard.boundingBox(),
        topDetractorsCard.boundingBox(),
      ]);
    expect(contributorsBox?.width ?? 0).toBeGreaterThan(180);
    expect(detractorsBox?.width ?? 0).toBeGreaterThan(180);
    expect((detractorsBox?.x ?? 0) - (contributorsBox?.x ?? 0)).toBeGreaterThan(160);
    expect(Math.abs((contributorsBox?.y ?? 0) - (detractorsBox?.y ?? 9999))).toBeLessThanOrEqual(24);
    expect(
      Math.abs((contributorsHeadingBox?.y ?? 0) - (detractorsHeadingBox?.y ?? 9999)),
    ).toBeLessThanOrEqual(4);
    const driversRightEdge = (driversBox?.x ?? 0) + (driversBox?.width ?? 0);
    for (const box of [
      contributorsHeadingBox,
      detractorsHeadingBox,
      contributorsBox,
      detractorsBox,
    ]) {
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(driversRightEdge + 1);
    }

    const chartMetrics = await measureElement(page.locator('.performance-chart-stage'));
    expect(chartMetrics.height).toBeLessThanOrEqual(1300);
    expect(chartMetrics.width).toBeGreaterThan(900);

    const horizonChoices = page.getByRole('radiogroup', { name: 'Horizon table view' });
    await expect(horizonChoices).toBeVisible();
    const selectedHorizon = horizonChoices.getByRole('radio', { checked: true });
    const originalHorizon = (await selectedHorizon.textContent())?.trim();
    await selectedHorizon.focus();
    await page.keyboard.press('ArrowRight');
    const nextHorizon = horizonChoices.getByRole('radio', { checked: true });
    await expect(nextHorizon).toBeFocused();
    expect((await nextHorizon.textContent())?.trim()).not.toBe(originalHorizon);
    expect(await nextHorizon.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');

    for (const width of [1440, 1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await horizonChoices.scrollIntoViewIfNeeded();
      await expect(horizonChoices).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
    }
  });

  test('refresh failure keeps source-confirmed performance context and recovers without stale labels', async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PERFORMANCE_E2E_FIXTURE !== 'refresh-integrity',
      'This deterministic journey requires the refresh-integrity fixture.',
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1100 });
    const runtime = observeBrowserRuntimeFailures(page);
    const session = await openPerformanceWorkbench(page, request);
    expect(session.available).toBe(true);

    const horizon = page.getByRole('radiogroup', { name: 'Horizon' });
    await expect(horizon.getByRole('radio', { name: 'YTD' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    const requestedHorizon = horizon.getByRole('radio', { name: '3Y' });
    await requestedHorizon.click();

    const summaryFailure = page.getByTestId('workbench-refresh-status');
    await expect(summaryFailure).toContainText('Performance selection could not be confirmed');
    await expect(summaryFailure).toContainText('Requested3Y');
    await expect(summaryFailure).toContainText('Source-confirmedYTD · NET returns');
    await expect(summaryFailure).toContainText('HTTP 503');
    await expect(requestedHorizon).toBeFocused();
    await expect(horizon.getByRole('radio', { name: 'YTD' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(new URL(page.url()).searchParams.get('period')).toBe('YTD');

    const summaryRetry = summaryFailure.getByRole('button', {
      name: 'Retry performance selection',
    });
    await summaryRetry.focus();
    await expect(summaryRetry).toBeFocused();
    await summaryRetry.click();
    const summaryConfirmation = page.getByTestId('workbench-refresh-status');
    await expect(summaryConfirmation).toHaveAttribute('data-state', 'confirmed');
    await expect(summaryConfirmation).toContainText('Performance selection confirmed');
    await expect(horizon.getByRole('radio', { name: '3Y' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect.poll(() => new URL(page.url()).searchParams.get('period')).toBe('3Y');

    const analysisTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Performance Analysis/i });
    const analysisNavigation = page.waitForResponse(
      (response) =>
        response.url().includes('/performance?') &&
        response.url().includes('mode=analysis') &&
        response.headers()['content-type']?.includes('text/x-component') === true,
      { timeout: 30_000 },
    );
    await Promise.all([analysisNavigation, analysisTab.click()]);
    await expect.poll(() => new URL(page.url()).searchParams.get('mode')).toBe('analysis');
    const performanceDrivers = page.locator('#performance-drivers');
    await performanceDrivers.scrollIntoViewIfNeeded();
    await expect(performanceDrivers).toBeVisible({ timeout: 30_000 });
    const contributionSegment = page.getByRole('combobox', {
      name: 'Contribution Segment',
    });
    await expect(contributionSegment).toBeVisible({ timeout: 30_000 });
    await contributionSegment.click();
    await page.getByRole('option', { name: 'Sector' }).click();

    const detailsFailure = page.getByTestId('workbench-refresh-status');
    await expect(detailsFailure).toContainText(
      'Contribution and attribution detail could not be confirmed',
    );
    await expect(detailsFailure).toContainText('RequestedSector contribution');
    await expect(detailsFailure).toContainText('HTTP 502');
    await expect(contributionSegment).toBeFocused();
    await expect(contributionSegment).toContainText('Asset Class');
    await detailsFailure.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'output/playwright/issue-679-performance-refresh-failure-desktop.png',
      fullPage: false,
    });

    for (const width of [1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(detailsFailure).toBeVisible();
      await detailsFailure.scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
      if (width === 519) {
        await page.screenshot({
          path: 'output/playwright/issue-679-performance-refresh-failure-narrow.png',
          fullPage: false,
        });
      }
    }

    const detailRetry = detailsFailure.getByRole('button', {
      name: 'Retry performance selection',
    });
    await detailRetry.focus();
    await expect(detailRetry).toBeFocused();
    await detailRetry.click();
    await expect(detailsFailure).toHaveAttribute('data-state', 'confirmed');
    await expect(detailsFailure).toContainText('Contribution and attribution detail confirmed');
    await expect(contributionSegment).toContainText('Sector');
    await expect.poll(
      () => new URL(page.url()).searchParams.get('contributionDimension'),
    ).toBe('sector');
    await detailsFailure.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: 'output/playwright/issue-679-performance-refresh-confirmed-narrow.png',
      fullPage: false,
    });
    await runtime.assertStylesAreHeadManaged();
    const expectedFailureSignals = runtime.snapshot();
    expect(
      expectedFailureSignals,
      'The failure journey must emit only the two deliberately exercised BFF errors.',
    ).toHaveLength(2);
    expect(expectedFailureSignals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: 'console',
          message: expect.stringContaining('503 (Service Unavailable)'),
          url: expect.stringContaining('/performance/summary?period=3Y'),
        }),
        expect.objectContaining({
          source: 'console',
          message: expect.stringContaining('502 (Bad Gateway)'),
          url: expect.stringContaining(
            '/performance/details?period=3Y&chart_frequency=monthly&contribution_dimension=sector',
          ),
        }),
      ]),
    );
  });

  test('analysis mode renders live attribution analytics', async ({ page, request }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPerformanceWorkbench(page, request);
    test.skip(!session.available, 'Performance upstream unavailable in standalone smoke environment.');

    const analysisTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Performance Analysis/i });
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute('aria-current', 'page');

    const analysisStage = page.locator('.performance-analysis-stage');
    await expect(analysisStage).toBeVisible({ timeout: 15000 });

    const trendEvidence = page.getByTestId('attribution-trend-evidence');
    await expect(trendEvidence).toBeVisible({ timeout: 15_000 });
    await expect(trendEvidence).not.toHaveAttribute('data-state', 'loading');
    const trendEvidenceState = await trendEvidence.getAttribute('data-state');
    expect(['single-observation', 'multi-observation']).toContain(trendEvidenceState);
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
    if (trendEvidenceState === 'single-observation') {
      await expect(page.getByRole('heading', { name: 'Attribution Observation' })).toBeVisible();
      await expect(trendEvidence).toHaveAttribute('data-observation-count', '1');
      await expect(page.getByLabel('Attribution observation table')).toBeVisible();
      await expect(page.getByRole('img', { name: 'Attribution over time chart' })).toHaveCount(0);
    } else {
      await expect(page.getByRole('heading', { name: 'Attribution Over Time' })).toBeVisible();
      await expect(page.getByRole('img', { name: 'Attribution over time chart' })).toBeVisible();
      await expect(page.getByLabel('Attribution trend table')).toBeVisible();
    }
    const attributionTrendStrip = page.getByLabel('Attribution trend summary strip');
    await expect(attributionTrendStrip.getByText('Total Effect', { exact: true })).toBeVisible();
    await expect(attributionTrendStrip.getByText('Cumulative Total', { exact: true })).toBeVisible();

    await expect(page.getByLabel('Top Effects panel')).toHaveCount(0);
    await expect(page.getByLabel('Attribution Detail panel')).toHaveCount(0);
    await expect(page.getByText('Top Active Effects')).toHaveCount(0);
    const attributionUnavailableState = page.getByText('Attribution detail unavailable');
    if (await attributionUnavailableState.isVisible().catch(() => false)) {
      await expect(attributionUnavailableState).toBeVisible();
      await expect(page.getByLabel(/Asset Class attribution table/i)).toHaveCount(0);
      await expect(page.getByLabel(/Asset Class attribution totals/i)).toHaveCount(0);
    } else {
      await expect(page.getByRole('heading', { name: /^Attribution Detail$/i })).toBeVisible();
      const missingAttributionLevels = page.getByText(
        'Attribution detail is marked available, but no segment attribution levels were returned for the current selection.'
      );
      await expect(
        page
          .getByLabel(/Asset Class attribution table/i)
          .or(page.getByLabel(/Asset Class attribution totals/i))
          .or(missingAttributionLevels)
      ).toBeVisible({ timeout: 30000 });
      const breakdownDetailCount = await page.getByLabel(/Asset Class attribution table/i).count();
      const breakdownSummaryCount = await page.getByLabel(/Asset Class attribution totals/i).count();
      if (breakdownDetailCount + breakdownSummaryCount === 0) {
        await expect(missingAttributionLevels).toBeVisible();
      } else if (breakdownSummaryCount > 0) {
        await expect(page.getByText('Attribution Summary')).toBeVisible();
      }
    }

    const trendMetrics = await measureElement(trendShell);
    expect(trendMetrics.height).toBeLessThanOrEqual(900);
    expect(trendMetrics.width).toBeGreaterThan(800);
  });

  test('Analysis source controls confirm horizon and benchmark without a mode change', async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PERFORMANCE_E2E_FIXTURE !== 'analysis-controls',
      'This deterministic journey requires the analysis-controls fixture.',
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1800, height: 1200 });
    const runtime = observeBrowserRuntimeFailures(page);
    const session = await openPerformanceWorkbench(page, request);
    expect(session.available).toBe(true);

    const analysisTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Performance Analysis/i });
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute('aria-current', 'page');

    const sourceSelection = page.getByRole('group', {
      name: 'Performance Analysis source selection',
    });
    await expect(sourceSelection).toBeVisible();
    await expect(page.getByRole('group', { name: 'Return-path presentation' })).toHaveCount(0);
    await expect(page.getByRole('radiogroup', { name: 'Return view' })).toHaveCount(0);

    const threeYearHorizon = sourceSelection.getByRole('radio', { name: '3Y' });
    await threeYearHorizon.focus();
    await expect(threeYearHorizon).toBeFocused();
    await threeYearHorizon.click();

    const refreshStatus = page.getByTestId('workbench-refresh-status');
    await expect(refreshStatus).toHaveAttribute('data-state', 'pending');
    await expect(refreshStatus).toContainText('Confirming the selected performance view');
    await expect(sourceSelection.getByRole('radio', { name: 'YTD' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(refreshStatus).toHaveAttribute('data-state', 'confirmed');
    await expect(threeYearHorizon).toHaveAttribute('aria-checked', 'true');
    await expect(threeYearHorizon).toBeFocused();
    await expect.poll(() => new URL(page.url()).searchParams.get('period')).toBe('3Y');
    await expect(analysisTab).toHaveAttribute('aria-current', 'page');

    const benchmark = sourceSelection.getByLabel('Benchmark');
    await benchmark.focus();
    await benchmark.selectOption('BMK_PRIVATE_BANK');
    await expect(refreshStatus).toHaveAttribute('data-state', 'pending');
    await expect(benchmark).toBeDisabled();
    await expect(refreshStatus).toHaveAttribute('data-state', 'confirmed');
    await expect(benchmark).toHaveValue('BMK_PRIVATE_BANK');
    await expect(benchmark).toBeFocused();
    await expect.poll(() => new URL(page.url()).searchParams.get('benchmark')).toBe(
      'BMK_PRIVATE_BANK',
    );
    await expect(page.getByText('Private Bank Composite', { exact: true })).toBeVisible();
    await expect(analysisTab).toHaveAttribute('aria-current', 'page');

    for (const width of [1800, 1280, 1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await sourceSelection.scrollIntoViewIfNeeded();
      await expect(sourceSelection).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
    }

    for (const [name, touchTarget] of [
      ['3Y horizon', threeYearHorizon],
      ['Benchmark', benchmark],
      ['Apply', sourceSelection.getByRole('button', { name: 'Apply' })],
    ] as const) {
      const bounds = await touchTarget.boundingBox();
      expect(bounds?.height, `${name} touch target height`).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({
      path: 'output/playwright/issue-681-performance-analysis-controls-narrow.png',
      fullPage: false,
    });
    await runtime.assertStylesAreHeadManaged();
    expect(runtime.snapshot()).toEqual([]);
  });

  test('attribution history failure remains explicit until source retry succeeds', async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PERFORMANCE_E2E_FIXTURE !== 'trend-integrity',
      'This deterministic journey requires the trend-integrity fixture.',
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1100 });
    const runtime = observeBrowserRuntimeFailures(page);
    const session = await openPerformanceWorkbench(page, request);
    expect(session.available).toBe(true);

    const analysisTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Performance Analysis/i });
    await analysisTab.click();

    const evidence = page.getByTestId('attribution-trend-evidence');
    await expect(evidence).toHaveAttribute('data-state', 'error', { timeout: 30_000 });
    await expect(evidence.getByRole('alert')).toContainText(
      'Attribution history could not be refreshed',
    );
    await expect(evidence).toContainText('Source response 503');
    await expect(evidence).not.toContainText('Attribution trend unavailable');

    const refresh = page.getByRole('button', { name: 'Refresh history' });
    await refresh.focus();
    await expect(refresh).toBeFocused();
    await refresh.click();
    await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
    await expect(evidence).toHaveAttribute('data-state', 'single-observation');
    await expect(evidence).toHaveAttribute('data-observation-count', '1');
    await expect(page.getByRole('button', { name: 'Refresh history' })).toBeFocused();
    await expect(page.getByRole('heading', { name: 'Attribution Observation' })).toBeVisible();
    await expect(page.getByLabel('Attribution observation table')).toBeVisible();
    await expect(page.getByText('One published observation')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Attribution over time chart' })).toHaveCount(0);

    for (const width of [1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await evidence.scrollIntoViewIfNeeded();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
    }

    await page.screenshot({
      path: 'output/playwright/issue-682-attribution-observation-narrow.png',
      fullPage: false,
    });
    await runtime.assertStylesAreHeadManaged();
    expect(runtime.snapshot()).toEqual([
      expect.objectContaining({
        source: 'console',
        message: expect.stringContaining('503 (Service Unavailable)'),
        url: expect.stringContaining('/performance/attribution-trend?'),
      }),
    ]);
  });

  test('horizon comparison failure remains explicit until exact source retry succeeds', async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PERFORMANCE_E2E_FIXTURE !== 'horizon-integrity',
      'This deterministic journey requires the horizon-integrity fixture.',
    );
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1100 });
    const runtime = observeBrowserRuntimeFailures(page);
    const session = await openPerformanceWorkbench(page, request);
    expect(session.available).toBe(true);

    const evidence = page.getByTestId('horizon-comparison-evidence');
    await expect(evidence).toHaveAttribute('data-state', 'error', { timeout: 30_000 });
    await expect(evidence.getByRole('alert')).toContainText(
      'Horizon comparison could not be refreshed',
    );
    await expect(evidence).toContainText('Source response 503');
    await expect(evidence).not.toContainText('No published horizon comparison');

    for (const width of [1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await evidence.scrollIntoViewIfNeeded();
      await expect(evidence).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
    }
    await page.screenshot({
      path: 'output/playwright/issue-683-horizon-comparison-failure-narrow.png',
      fullPage: false,
    });

    const refresh = page.getByRole('button', { name: 'Refresh comparison' });
    await refresh.focus();
    await expect(refresh).toBeFocused();
    await refresh.click();
    await expect(page.getByRole('button', { name: 'Refreshing…' })).toBeDisabled();
    await expect(evidence).toHaveAttribute('data-state', 'multi-observation');
    await expect(evidence).toHaveAttribute('data-observation-count', '4');
    await expect(page.getByRole('button', { name: 'Refresh comparison' })).toBeFocused();
    await expect(page.getByLabel('Multi-horizon returns')).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Horizon visual mode' })).toBeVisible();

    for (const width of [1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await evidence.scrollIntoViewIfNeeded();
      await expect(evidence).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
    }

    await page.screenshot({
      path: 'output/playwright/issue-683-horizon-comparison-recovered-narrow.png',
      fullPage: false,
    });
    await runtime.assertStylesAreHeadManaged();
    expect(runtime.snapshot()).toEqual([
      expect.objectContaining({
        source: 'console',
        message: expect.stringContaining('503 (Service Unavailable)'),
        url: expect.stringContaining('/performance/horizon-comparison?'),
      }),
    ]);
  });

  test('advisor brief discloses AI, evidence, review, and client-use posture accessibly', async ({
    page,
    request,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1280, height: 1000 });
    const session = await openPerformanceWorkbench(page, request);
    test.skip(!session.available, 'Performance upstream unavailable in standalone smoke environment.');

    const advisorTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Advisor Brief/i });
    await advisorTab.click();
    await expect(advisorTab).toHaveAttribute('aria-current', 'page');

    const disclosure = page.locator('details').filter({ hasText: 'How this was prepared' });
    const disclosureSummary = disclosure.locator('summary');
    await expect(disclosureSummary).toContainText('Live output • review required');
    await expect(disclosureSummary).toContainText('Performance advisor brief');

    await disclosureSummary.focus();
    await page.keyboard.press('Enter');
    await expect(disclosure).toHaveAttribute('open', '');
    await expect(disclosure).toContainText('Prepared with AI assistance');
    await expect(disclosure).toContainText('Availability');
    await expect(disclosure).toContainText('Current output is available');
    await expect(disclosure).toContainText('Source evidence attached');
    await expect(disclosure).toContainText('Human review required');
    await expect(disclosure).toContainText('Not approved for client use');
    await expect(disclosure).toContainText('Freshness not reported');
    await expect(page.getByLabel('Advisor Talking Points')).toContainText(
      'Portfolio outperformed its benchmark',
    );
    await expect(page.getByText('Client Talking Points')).toHaveCount(0);

    await page.screenshot({
      path: 'output/playwright/diagnostic-ai-assistance-disclosure-532-desktop.png',
      fullPage: true,
    });

    await page.setViewportSize({ width: 720, height: 1000 });
    await expect(disclosure).toHaveAttribute('open', '');

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(2);

    await page.screenshot({
      path: 'output/playwright/diagnostic-ai-assistance-disclosure-532-narrow.png',
      fullPage: true,
    });
  });

  test('Advisor Brief review transaction requires confirmation and renders source-recorded proof', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 1100 });
    const runtime = observeBrowserRuntimeFailures(page);
    const session = await openPerformanceWorkbench(page, request);
    expect(session.available).toBe(true);

    await page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Advisor Brief/i })
      .click();

    const review = page.getByLabel('Advisor brief human review');
    await expect(review).toBeVisible();
    await review.getByLabel('Review decision').selectOption('ACCEPT');
    await review.getByLabel(/Reviewer reference/).fill('advisor_e2e');
    await review
      .getByLabel('Review rationale')
      .fill('Source evidence and narrative are suitable for permitted internal use.');
    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.screenshot({
      path: 'output/playwright/issue-697-advisor-brief-review-desktop.png',
      fullPage: true,
    });

    const reviewRequests: string[] = [];
    page.on('request', (browserRequest) => {
      if (browserRequest.url().includes('/performance/advisor-brief/review-actions')) {
        reviewRequests.push(browserRequest.method());
      }
    });

    await review.getByRole('button', { name: 'Review decision' }).click();
    await expect(review.getByRole('button', { name: 'Confirm acceptance' })).toBeFocused();
    expect(reviewRequests).toEqual([]);
    await expect(review).toContainText('It does not approve client communication');

    await review.getByRole('button', { name: 'Confirm acceptance' }).click();
    await expect(review).toContainText(
      'The brief was accepted for its permitted internal workflow use.',
    );
    await expect(review.getByRole('status')).toBeFocused();
    await expect(review).toContainText('No further review decision is currently available');
    expect(reviewRequests).toEqual(['POST']);

    const disclosure = page.locator('details').filter({ hasText: 'How this was prepared' });
    await disclosure.locator('summary').click();
    await expect(disclosure).toContainText('Human review recorded');
    await expect(disclosure).toContainText('advisor_e2e');
    await expect(disclosure).toContainText('2026-04-21T03:22:00Z');
    await expect(disclosure).toContainText('Not approved for client use');

    const supportDetails = page.locator('details').filter({
      hasText: 'Technical support details',
    });
    await expect(supportDetails).not.toHaveAttribute('open', '');

    for (const width of [1440, 1024, 720, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      await review.scrollIntoViewIfNeeded();
      await expect(review).toBeVisible();
      const overflow = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(overflow.scrollWidth - overflow.clientWidth).toBeLessThanOrEqual(2);
    }

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await page.screenshot({
      path: 'output/playwright/issue-697-advisor-brief-reviewed-narrow.png',
      fullPage: true,
    });
    await runtime.assertStylesAreHeadManaged();
    expect(runtime.snapshot()).toEqual([]);
  });

  test('analysis contribution module renders live position detail cleanly', async ({ page, request }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPerformanceWorkbench(page, request);
    test.skip(!session.available, 'Performance upstream unavailable in standalone smoke environment.');

    const analysisTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Performance Analysis/i });
    await expect(analysisTab).toBeVisible();
    await analysisTab.click();
    await expect(analysisTab).toHaveAttribute('aria-current', 'page');

    const contributionModule = page.locator('#performance-drivers');
    await expect(contributionModule).toBeVisible({ timeout: 15000 });
    await contributionModule.scrollIntoViewIfNeeded();
    await expect(
      contributionModule.getByRole('heading', { name: /^Performance Drivers$/i })
    ).toBeVisible();
    await expect(contributionModule.getByLabel('Top / Bottom Contributors panel')).toHaveCount(0);
    await expect(contributionModule.getByLabel('Contribution Detail panel')).toHaveCount(0);
    await expect(contributionModule.getByText('Top / Bottom Contributors')).toHaveCount(0);
    await expect(contributionModule.getByText('Contributor Ranking')).toHaveCount(0);
    const missingContributionDetail = contributionModule.getByText(
      'Contribution detail is marked available, but no position or segment contribution rows were returned for the current selection.'
    );
    const positionContributionTable = contributionModule.getByLabel('Position contribution table');
    const segmentContributionTable = contributionModule.getByLabel(/Asset Class contribution table/i);
    await expect.poll(
      async () =>
        (await positionContributionTable.isVisible()) ||
        (await segmentContributionTable.isVisible()) ||
        (await missingContributionDetail.isVisible()),
      { timeout: 30000 },
    ).toBe(true);
    if (await missingContributionDetail.isVisible()) {
      await expect(missingContributionDetail).toBeVisible();
      return;
    }
    if (await segmentContributionTable.isVisible()) {
      await expect(segmentContributionTable).toBeVisible();
      const aggregateFrame = await measureTableFrame(
        segmentContributionTable.locator('..')
      );
      expect(aggregateFrame.scrollWidth - aggregateFrame.clientWidth).toBeLessThanOrEqual(12);
      return;
    }
    await expect(positionContributionTable).toBeVisible();
    await expect(contributionModule.getByRole('tab', { name: /^Positions/i })).toBeVisible();
    await expect(segmentContributionTable).not.toBeVisible();
    await expect(
      contributionModule
        .getByRole('tab', { name: /^Positions/i })
    ).toHaveAttribute('aria-selected', 'true');
    const segmentSummaryTab = contributionModule.getByRole('tab', { name: /^Segment Summary/i });
    await expect(segmentSummaryTab).toHaveAttribute('aria-selected', 'false');
    const positionsTab = contributionModule.getByRole('tab', { name: /^Positions/i });
    const positionPanel = contributionModule.getByRole('tabpanel');
    await expect(positionsTab).toHaveAttribute('aria-controls', await positionPanel.getAttribute('id') ?? '');
    await expect(positionPanel).toHaveAttribute('aria-labelledby', await positionsTab.getAttribute('id') ?? '');

    const positionHeaders = await contributionModule
      .locator('table[aria-label="Position contribution table"] thead th')
      .allTextContents();
    expect(positionHeaders.slice(0, 4)).toEqual([
      'Position',
      'Contribution',
      'Average Weight',
      'Return',
    ]);
    const positionRows = contributionModule.locator(
      'table[aria-label="Position contribution table"] tbody tr'
    );
    await expect(positionRows.first()).toBeVisible();
    expect(await positionRows.count()).toBeGreaterThan(0);

    const positionFrame = await measureTableFrame(
      contributionModule.getByLabel('Position contribution table').locator('..')
    );
    expect(positionFrame.scrollWidth - positionFrame.clientWidth).toBeLessThanOrEqual(12);

    if (await segmentSummaryTab.isDisabled()) {
      await expect(segmentSummaryTab).toBeDisabled();
      await expect(positionsTab).toHaveAttribute('aria-selected', 'true');
      await expect(positionPanel).toBeVisible();
    } else {
      await positionsTab.focus();
      await page.keyboard.press('ArrowRight');
      await expect(segmentSummaryTab).toHaveAttribute('aria-selected', 'true');
      await expect(segmentSummaryTab).toBeFocused();
      await expect(positionContributionTable).not.toBeVisible();
      await expect(segmentContributionTable).toBeVisible();
      await expect(contributionModule.getByText('Equity')).toBeVisible();
      await expect(
        contributionModule.locator('table[aria-label*="Asset Class contribution"] tbody tr').first(),
      ).toBeVisible();

      const aggregateFrame = await measureTableFrame(
        segmentContributionTable.locator('..')
      );
      expect(aggregateFrame.scrollWidth - aggregateFrame.clientWidth).toBeLessThanOrEqual(12);
    }

    const moduleMetrics = await measureElement(contributionModule);
    expect(moduleMetrics.width).toBeGreaterThan(1000);
    expect(moduleMetrics.height).toBeLessThan(1200);
  });

  test('evidence mode renders the backed contract posture', async ({ page, request }) => {
    test.setTimeout(60000);
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPerformanceWorkbench(page, request);
    if (!session.available || !session.portfolioId) {
      test.skip(true, 'Performance upstream unavailable in standalone smoke environment.');
      return;
    }
    const posture = await loadSummaryPosture(request, session.portfolioId);

    const evidenceTab = page
      .getByLabel('Performance surface navigation')
      .getByRole('button', { name: /^Evidence/i });
    if (posture.capabilities.evidence === 'unavailable') {
      await expect(evidenceTab).toBeDisabled();
      await expect(evidenceTab).toContainText('Unavailable');
      await expect(page.locator('.performance-evidence-module')).toHaveCount(0);
      return;
    }
    await expect(evidenceTab).toBeEnabled();
    await evidenceTab.click();
    await expect(evidenceTab).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('.performance-evidence-module')).toBeVisible({ timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /^Evidence and Calculation Context$/i })
    ).toBeVisible({ timeout: 15000 });
    await expect(
      page
        .getByText('Evidence posture')
        .or(page.getByText('Evidence partially available')),
    ).toBeVisible();
  });
});
