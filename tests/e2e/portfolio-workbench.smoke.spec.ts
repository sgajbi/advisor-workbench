import { test, expect } from '@playwright/test';
import {
  measureGrid,
} from './workbench-smoke-helpers';
import {
  startPortfolioFixtureGateway,
  type PortfolioFixtureGateway,
} from './portfolio-fixture-gateway';

test.describe.configure({ mode: 'default' });

let fixtureGateway: PortfolioFixtureGateway | null = null;

test.beforeAll(async () => {
  if (process.env.PORTFOLIO_E2E_FIXTURE !== 'cashflow') {
    return;
  }
  const port = Number(process.env.PORTFOLIO_E2E_FIXTURE_PORT ?? '18120');
  const expectedGateway = `http://127.0.0.1:${port}`;
  if (
    process.env.BFF_BASE_URL !== expectedGateway ||
    process.env.WORKBENCH_E2E_FIXTURE_GATEWAY !== 'portfolio'
  ) {
    throw new Error(`Portfolio fixture proof requires the owned gateway at ${expectedGateway}.`);
  }
  fixtureGateway = await startPortfolioFixtureGateway({ port });
});

test.afterAll(async () => {
  await fixtureGateway?.close();
  fixtureGateway = null;
});

async function resolveSmokePortfolioId(request: import('@playwright/test').APIRequestContext) {
  const response = await request.get('/api/bff/api/v1/foundation/portfolios', {
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

async function openPortfolioReview(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
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

  await expect(page.getByRole('heading', { name: /^Portfolio Review$/i })).toBeVisible({ timeout: 15000 });

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

async function openAllocationPortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/allocation', { waitUntil: 'domcontentloaded' });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/allocation?portfolioId=${portfolioId}`, { waitUntil: 'domcontentloaded' });
  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio records unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Allocation$/i })).toBeVisible({
    timeout: 15000,
  });
  return { portfolioId, available: true };
}

async function openPositionsPortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/positions', { waitUntil: 'domcontentloaded' });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/positions?portfolioId=${portfolioId}`, { waitUntil: 'domcontentloaded' });
  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio records unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Positions$/i })).toBeVisible({
    timeout: 15000,
  });
  return { portfolioId, available: true };
}

async function openTransactionsPortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/transactions', { waitUntil: 'domcontentloaded' });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/transactions?portfolioId=${portfolioId}`, {
    waitUntil: 'domcontentloaded',
  });
  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio records unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Transactions$/i })).toBeVisible({
    timeout: 15000,
  });
  return { portfolioId, available: true };
}

async function openCashflowPortfolio(
  page: import('@playwright/test').Page,
  request: import('@playwright/test').APIRequestContext
) {
  const portfolioId = await resolveSmokePortfolioId(request);
  if (!portfolioId) {
    await page.goto('/cashflow', { waitUntil: 'domcontentloaded' });
    return { portfolioId: null, available: false };
  }

  await page.goto(`/cashflow?portfolioId=${portfolioId}`, {
    waitUntil: 'domcontentloaded',
  });
  const unavailableHeading = page.getByRole('heading', { name: /^Portfolio records unavailable$/i });
  const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
  if (unavailableVisible) {
    return { portfolioId, available: false };
  }

  await expect(page.getByRole('heading', { name: /^Cashflow$/i })).toBeVisible({
    timeout: 15000,
  });
  return { portfolioId, available: true };
}

test.describe('Portfolio workbench smoke', () => {
  test('record navigation preserves one selected portfolio across all five business tasks', async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPositionsPortfolio(page, request);
    test.skip(!session.available, 'Portfolio records upstream unavailable in standalone smoke environment.');

    const destinations = [
      { label: 'Allocation', route: '/allocation', heading: /^Allocation$/i },
      { label: 'Transactions', route: '/transactions', heading: /^Transactions$/i },
      { label: 'Income', route: '/income', heading: /^Income & Activity$/i },
      { label: 'Cashflow', route: '/cashflow', heading: /^Cashflow$/i },
      { label: 'Positions', route: '/positions', heading: /^Positions$/i },
    ];

    for (const destination of destinations) {
      await page
        .getByRole('navigation', { name: 'Workbench screen navigation' })
        .getByRole('link', { name: new RegExp(`^${destination.label}`) })
        .click();
      await expect(page).toHaveURL(
        new RegExp(`${destination.route}\\?portfolioId=${session.portfolioId}$`)
      );
      await expect(page.getByRole('heading', { name: destination.heading }).first()).toBeVisible();
      await expect(page.getByText(session.portfolioId!, { exact: true }).first()).toBeVisible();
    }
  });

  test('portfolio review stays decision-focused and keeps detail work on dedicated screens', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPortfolioReview(page, request);
    test.skip(!session.available, 'Portfolio foundation upstream unavailable in standalone smoke environment.');

    await expect(page.getByText('MTD Return')).toBeVisible();
    await expect(page.getByText('QTD Return')).toBeVisible();
    await expect(page.getByText('YTD Return')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Portfolio decision review' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Income/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Filters/i })).toHaveCount(0);

    if (process.env.PORTFOLIO_E2E_FIXTURE === 'cashflow') {
      await expect(page.getByRole('button', { name: 'AUM: 12,500,000 USD' })).toBeVisible();
      await expect(
        page.getByRole('heading', { name: 'Performance evidence is qualified' })
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Source Limitations' })).toBeVisible();
      await expect(page.getByText('MTD performance unavailable')).toBeVisible();
      await expect(
        page.getByText('MTD valuation history is incomplete; no return is shown.')
      ).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Portfolio review is ready' })).toHaveCount(0);
    }

    await expect(page.getByRole('heading', { name: /Asset Allocation/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Top Holdings/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Cashflow Forecast/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Liquidity and Projected Cash/i })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Performance Snapshot/i })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^Summary$/i })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: /^Detailed$/i })).toHaveCount(0);
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

    for (const viewport of [
      { width: 1024, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('heading', { name: /^Portfolio Review$/i })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Portfolio decision review' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Export portfolio data/i })).toBeVisible();
      const pageWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.clientWidth + 1);
    }
  });

  test('historical review preserves valuation scope and replaces complete dated evidence atomically', async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PORTFOLIO_E2E_FIXTURE !== 'cashflow',
      'Historical source-to-render proof requires the owned portfolio fixture.'
    );
    await page.setViewportSize({ width: 1280, height: 1000 });
    const session = await openPortfolioReview(page, request);
    test.skip(!session.available, 'Portfolio foundation upstream unavailable in standalone smoke environment.');

    await expect(page.getByRole('button', { name: 'AUM: 12,500,000 USD' })).toBeVisible();
    await page.getByLabel('As of').fill('2026-04-01');

    await expect(page.getByText('Review date 01 Apr 2026')).toBeVisible();
    await expect(page.getByText('Valuation as of 10 Apr 2026')).toBeVisible();
    await expect(page.getByText('Valuation as of 01 Apr 2026')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'AUM: 12,500,000 USD' })).toBeVisible();

    await page.getByLabel('As of').fill('2026-03-31');

    await expect(page.getByText('Review date 31 Mar 2026')).toBeVisible();
    await expect(page.getByText('Valuation as of 31 Mar 2026')).toBeVisible();
    await expect(page.getByRole('button', { name: 'AUM: 0 USD' })).toBeVisible();
    const decisionReview = page.getByRole('region', { name: 'Portfolio decision review' });
    await expect(decisionReview.getByLabel('Status Partial')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Portfolio review is ready' })).toHaveCount(0);
  });

  test('income route renders the dedicated income and activity workspace', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openIncomePortfolio(page, request);
    test.skip(!session.available, 'Portfolio income upstream unavailable in standalone smoke environment.');

    await expect(page.getByText('Booked income', { exact: true })).toBeVisible();
    await expect(page.getByText('Booked cash movements', { exact: true })).toBeVisible();
    await expect(page.locator('.portfolio-income-activity-workspace')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Booked income by type' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Booked cash movements by type' })).toBeVisible();
    await expect(page.getByText('Current cash weight')).toBeVisible();
    await expect(page.getByText('Booked records only')).toBeVisible();
    await expect(page.getByText('Net cash movement').first()).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Booked income by type' }).getByText('Ready')
    ).toHaveCount(0);

    const incomeMetricStrip = await measureGrid(page.locator('.portfolio-income-activity-metrics').first());
    expect(incomeMetricStrip.childCount).toBe(4);
    expect(incomeMetricStrip.width).toBeGreaterThan(900);
  });

  test('cashflow route keeps projection identity and movement semantics explicit', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 1000 });
    const session = await openCashflowPortfolio(page, request);
    test.skip(!session.available, 'Portfolio cashflow upstream unavailable in standalone smoke environment.');

    await expect(page.getByRole('heading', { name: /^Projected cash movement$/i })).toBeVisible();
    await expect(page.getByLabel('Projected cash movement summary')).toBeVisible();
    await expect(page.getByLabel('Projected cashflow summary')).toHaveCount(0);
    await expect(page.getByRole('img', { name: /Projected cashflow chart in USD/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: '10D' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('radio', { name: '30D' })).toBeVisible();
    await expect(page.getByRole('radio', { name: '90D' })).toBeVisible();
    await expect(page.getByLabel('Projection scope')).toContainText('Projection as of');
    await expect(page.getByLabel('Projection scope')).toContainText('Projection basis');
    await expect(page.getByText('Ending Cumulative')).toHaveCount(0);
    await expect(page.getByText(/liquidity forecast/i)).toHaveCount(0);

    await page.getByRole('radio', { name: '10D' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('radio', { name: '30D' })).toBeFocused();
    await expect(
      page.getByText(/30-day projection(?: returned for a 30-day request)? · /i)
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('radio', { name: '30D' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText(/10-day projection · /i)).toHaveCount(0);

    const projectionHorizon = page.getByRole('radiogroup', { name: 'Projection horizon' });
    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    for (const width of [1440, 1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await projectionHorizon.scrollIntoViewIfNeeded();
      await expect(projectionHorizon).toBeVisible();
      await expect(page.getByLabel('Projected cash movement summary')).toBeVisible();
      await expect(page.getByRole('table', { name: 'Projected cash movement schedule' })).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
      if (evidenceDirectory && (width === 1440 || width === 519)) {
        await page.screenshot({
          path: `${evidenceDirectory}/cashflow-${width}px.png`,
          fullPage: true,
        });
      }
    }
  });

  test('allocation route connects direct exposures to contributing booked holdings', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openAllocationPortfolio(page, request);
    test.skip(!session.available, 'Portfolio allocation upstream unavailable in standalone smoke environment.');

    await expect(page.getByText('Portfolio exposure', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Booked holdings$/i })).toBeVisible();
    await expect(page.getByText('Exposure Views')).toBeVisible();
    await expect(page.getByText('Target allocation', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Allocation drift', { exact: true })).toHaveCount(0);

    const firstDirectExposure = page.locator('.portfolio-allocation-ranked-row').first();
    await expect(firstDirectExposure).toBeEnabled();
    await firstDirectExposure.focus();
    await firstDirectExposure.press('Enter');

    await expect(page.getByRole('heading', { name: /^Contributing holdings$/i })).toBeVisible();
    await expect(page.locator('.portfolio-grid-toolbar-copy')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Clear filter$/i })).toBeVisible();

    await page.getByRole('button', { name: /^Clear filter$/i }).click();
    await expect(page.getByRole('heading', { name: /^Booked holdings$/i })).toBeVisible();

    const lookThroughToggle = page.getByRole('button', { name: /^Look-through off$/i });
    if ((await lookThroughToggle.count()) > 0) {
      await expect(lookThroughToggle).toBeEnabled();
      await lookThroughToggle.click();
      await expect(page.getByRole('button', { name: /^Look-through on$/i })).toContainText(
        'Expanded exposure'
      );
      await expect(page.locator('.portfolio-allocation-ranked-row').first()).toBeDisabled();
      await expect(
        page.getByText(/Expanded exposure contributors require source-backed look-through detail/i)
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('button', { name: /^Look-through unavailable for current portfolio snapshot$/i })
      ).toBeDisabled();
    }
  });

  test('positions route exposes complete booked holdings and keyboard review', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openPositionsPortfolio(page, request);
    test.skip(!session.available, 'Portfolio positions upstream unavailable in standalone smoke environment.');

    const headerKpis = page.locator('.portfolio-record-standalone-kpis');
    await expect(headerKpis.getByText('Invested', { exact: true })).toBeVisible();
    await expect(headerKpis.getByText('Cash', { exact: true })).toBeVisible();
    await expect(headerKpis.getByText('Window', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /^Booked holdings$/i })).toBeVisible();
    await expect(page.getByLabel('Portfolio holdings grid')).toBeVisible();
    await expect(page.getByRole('button', { name: /Filter holdings/i })).toHaveCount(0);
    await expect(page.locator('.ag-selection-checkbox, .ag-header-select-all')).toHaveCount(0);

    const reviewActions = page.locator('.portfolio-instrument-review');
    await expect(reviewActions.first()).toBeVisible();
    expect(await reviewActions.count()).toBeGreaterThan(1);
    const holdingIdentifiers = await page.locator('.portfolio-instrument-cell span').allTextContents();
    expect(new Set(holdingIdentifiers).size).toBe(holdingIdentifiers.length);
    await expect(
      page.locator('.portfolio-instrument-review').filter({ hasText: /Cash/i }).first()
    ).toBeVisible();

    await reviewActions.first().focus();
    await reviewActions.first().press('Enter');
    await expect(page.locator('.portfolio-detail-drawer')).toBeVisible();
    await page.getByRole('tab', { name: /^Recent Activity$/i }).click();
    await expect(
      page.getByText(/Recent booked activity supplied with the portfolio review as of/i)
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /^Open transactions$/i })).toHaveAttribute(
      'href',
      new RegExp(`/transactions\\?portfolioId=${session.portfolioId}`)
    );
  });

  test('transactions route preserves currency semantics and opens related booked activity', async ({ page, request }) => {
    await page.setViewportSize({ width: 1800, height: 1400 });
    const session = await openTransactionsPortfolio(page, request);
    test.skip(!session.available, 'Portfolio transactions upstream unavailable in standalone smoke environment.');

    const headerKpis = page.locator('.portfolio-record-standalone-kpis');
    await expect(headerKpis.getByText('Portfolio Currency', { exact: true })).toBeVisible();
    await expect(headerKpis.getByText('Latest Booking', { exact: true })).toBeVisible();
    await expect(headerKpis.getByText('30D Entries', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /^Booked activity$/i })).toBeVisible();
    await expect(page.getByLabel('Portfolio transactions grid')).toBeVisible();
    await expect(page.getByText('Gross Amount', { exact: true })).toBeVisible();
    await expect(page.getByText('Net Cost (USD)', { exact: true })).toBeVisible();
    await expect(page.getByText('Settlement Status', { exact: true })).toBeVisible();
    await expect(page.getByText('4 loaded entries need settlement review', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Book first transaction$/i })).toHaveCount(0);

    await page.getByLabel('Transaction start date').fill('2025-04-01');
    await page.getByLabel('Search transactions').fill('SIEMENS-2031');
    await expect(page.getByText('73,912.5 EUR', { exact: true })).toBeVisible();
    await expect(page.getByText('80,097.93 USD', { exact: true })).toBeVisible();

    await page.getByLabel('Search transactions').fill('TXN-INT-UST-001');
    await page.getByRole('button', { name: /^Review transaction TXN-INT-UST-001$/i }).click();
    await expect(page.locator('.portfolio-detail-drawer')).toBeVisible();
    await page.getByRole('tab', { name: /^Related Activity$/i }).click();
    await expect(page.getByRole('button', { name: /^Open Related Group Transactions$/i })).toBeVisible();
    await page.getByRole('button', { name: /^Open Related Group Transactions$/i }).click();

    await expect(page.getByText(/Related booking group LTG-PB_SG_GLOBAL_BAL_001-INT-UST-001/i)).toBeVisible();
    await expect(page.getByText('2 matching transactions in the selected period', { exact: true })).toBeVisible();
  });
});
