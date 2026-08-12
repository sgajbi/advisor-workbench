import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { test, expect } from '@playwright/test';
import {
  measureGrid,
} from './workbench-smoke-helpers';
import {
  collectFocusableDomOrder,
  measureViewportEvidence,
  traverseSequentialKeyboardFocus,
} from './workbench-accessibility-evidence';
import {
  startPortfolioFixtureGateway,
  type PortfolioFixtureScenario,
  type PortfolioFixtureGateway,
} from './portfolio-fixture-gateway';

test.describe.configure({ mode: 'default' });

let fixtureGateway: PortfolioFixtureGateway | null = null;

test.beforeAll(async () => {
  const scenario = process.env.PORTFOLIO_E2E_FIXTURE;
  if (
    scenario !== 'cashflow' &&
    scenario !== 'income-activity' &&
    scenario !== 'shell-unavailable' &&
    scenario !== 'positions-status' &&
    scenario !== 'transactions-status'
  ) {
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
  fixtureGateway = await startPortfolioFixtureGateway({
    port,
    scenario: scenario as PortfolioFixtureScenario,
  });
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
  test('selected shell failure reaches one truthful terminal recovery state', async ({
    page,
  }) => {
    test.skip(
      process.env.PORTFOLIO_E2E_FIXTURE !== 'shell-unavailable',
      'Selected-shell failure proof requires the owned unavailable fixture.'
    );
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto(`/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(page.getByTestId('portfolio-shell-unavailable')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('heading', { name: 'Selected portfolio unavailable' })).toBeVisible();
    await expect(page.getByText(/no other portfolio has been substituted/i)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open My book' }).first()).toHaveAttribute(
      'href',
      '/book'
    );
    await expect(page.getByText('Preparing portfolio review')).toHaveCount(0);

    await expect
      .poll(() => fixtureGateway?.getWorkspaceRequestCount(), {
        message: 'one server read and one bounded client recovery read should reach the fixture',
      })
      .toBe(2);
    await page.waitForTimeout(300);
    expect(fixtureGateway?.getWorkspaceRequestCount()).toBe(2);

    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    if (evidenceDirectory) {
      await page.screenshot({
        path: `${evidenceDirectory}/selected-shell-unavailable.png`,
        fullPage: true,
      });
    }
  });

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
      await expect(page.getByRole('heading', { name: 'Recommended Actions' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Open Performance' })).toBeVisible();
      await expect(page.getByText('BMK_GLOBAL_BALANCED_60_40', { exact: true })).toBeVisible();
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

    const viewportEvidence = [];
    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    const capturesIssue649Evidence =
      process.env.PORTFOLIO_E2E_PROOF_SCENARIO === 'review-matrix' && Boolean(evidenceDirectory);

    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 1024, height: 1000 },
      { width: 768, height: 1024 },
      { width: 721, height: 1000 },
      { width: 720, height: 1000 },
      { width: 561, height: 900 },
      { width: 519, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('heading', { name: /^Portfolio Review$/i })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Portfolio decision review' })).toBeVisible();
      await expect(page.getByRole('button', { name: /Export portfolio data/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Book Context' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Review Evidence' })).toBeVisible();
      await expect(page.getByText(session.portfolioId!, { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Valuation date', { exact: true })).toBeVisible();
      await expect(page.getByText('Benchmark', { exact: true })).toBeVisible();

      const measurements = await measureViewportEvidence(page);
      expect(measurements.document.scrollWidth).toBeLessThanOrEqual(
        measurements.document.clientWidth + 1
      );

      const railHeader = page.getByTestId('portfolio-screen-rail-header');
      const railHeaderRegions = await railHeader.evaluate((element) =>
        Array.from(element.children, (child) => {
          const bounds = child.getBoundingClientRect();
          const style = getComputedStyle(child);
          return {
            display: style.display,
            fits: child.scrollWidth <= child.clientWidth + 1,
            left: Math.round(bounds.left),
            top: Math.round(bounds.top),
          };
        })
      );
      expect(railHeaderRegions.filter((region) => region.display !== 'none').every((region) => region.fits)).toBe(true);

      if (viewport.width <= 1200) {
        const visibleHeaderRegions = railHeaderRegions.filter((region) => region.display !== 'none');
        expect(visibleHeaderRegions).toHaveLength(3);
        if (viewport.width <= 720) {
          expect(visibleHeaderRegions[0].top).toBeLessThan(visibleHeaderRegions[1].top);
          expect(visibleHeaderRegions[1].top).toBeLessThan(visibleHeaderRegions[2].top);
        } else {
          expect(visibleHeaderRegions[0].left).toBeLessThan(visibleHeaderRegions[1].left);
          expect(visibleHeaderRegions[1].left).toBeLessThan(visibleHeaderRegions[2].left);
        }

        const disclosure = page.getByRole('button', { name: /Current view Portfolio Review/ });
        await disclosure.focus();
        const focusIndicator = await disclosure.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
          };
        });
        expect(focusIndicator.outlineStyle).not.toBe('none');
        expect(focusIndicator.outlineWidth).not.toBe('0px');
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('navigation', { name: 'Workbench screen navigation' })
        ).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(disclosure).toBeFocused();
      }

      const focusableDomOrder = await collectFocusableDomOrder(page.locator('body'));
      expect(focusableDomOrder.length).toBeGreaterThan(8);
      expect(focusableDomOrder.every((element) => element.name.length > 0)).toBe(true);

      let keyboardEvidence = null;
      if (viewport.width === 519) {
        keyboardEvidence = await traverseSequentialKeyboardFocus(page, focusableDomOrder.length);
        expect(keyboardEvidence).toHaveLength(focusableDomOrder.length);
        expect(keyboardEvidence.every((element) => element.focusVisible)).toBe(true);
        expect(keyboardEvidence.every((element) => element.notObscured)).toBe(true);
        expect(keyboardEvidence.every((element) => element.withinViewport)).toBe(true);

        const primaryActionIndex = keyboardEvidence.findIndex(
          (element) => element.name === 'Open Performance'
        );
        const adjacentPerformanceIndex = keyboardEvidence.findIndex(
          (element, index) => index > primaryActionIndex && element.name === 'Performance'
        );
        expect(primaryActionIndex).toBeGreaterThan(-1);
        expect(adjacentPerformanceIndex).toBeGreaterThan(primaryActionIndex);
      }

      viewportEvidence.push({
        scenario: process.env.PORTFOLIO_E2E_FIXTURE ?? 'canonical',
        portfolioId: session.portfolioId,
        measurements,
        railHeaderRegions,
        focusableDomOrder,
        keyboardEvidence,
      });

      if (capturesIssue649Evidence && evidenceDirectory) {
        await page.evaluate(() => {
          (document.activeElement as HTMLElement | null)?.blur();
          window.scrollTo(0, 0);
        });
        await mkdir(evidenceDirectory, { recursive: true });
        await page.screenshot({
          path: resolve(
            evidenceDirectory,
            `diagnostic-degraded-portfolio-review-${viewport.width}.png`
          ),
          fullPage: true,
        });
      }
    }

    if (capturesIssue649Evidence && evidenceDirectory) {
      await writeFile(
        resolve(evidenceDirectory, 'portfolio-review-accessibility-evidence.json'),
        `${JSON.stringify(
          {
            generatedAtUtc: new Date().toISOString(),
            proofType: 'owned degraded-state fixture',
            decision: 'Performance evidence remains qualified and the source-owned action precedes adjacent workflows.',
            viewports: viewportEvidence,
          },
          null,
          2
        )}\n`,
        'utf8'
      );
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
    await expect(page.getByTestId('income-activity-workspace')).toBeVisible();
    await expect(page.getByRole('table', { name: 'Booked income by type' })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Booked cash movements by type' })).toBeVisible();
    await expect(page.getByText('Current cash weight')).toBeVisible();
    await expect(page.getByText('Booked records only')).toBeVisible();
    await expect(page.getByText('Net cash movement').first()).toBeVisible();
    await expect(
      page.getByRole('table', { name: 'Booked income by type' }).getByText('Ready')
    ).toHaveCount(0);

    const incomeMetricStrip = await measureGrid(page.getByLabel('Booked income summary'));
    expect(incomeMetricStrip.childCount).toBe(4);
    expect(incomeMetricStrip.width).toBeGreaterThan(900);
  });

  test('income and activity keeps booked cash evidence truthful across governed viewports', async ({
    page,
    request,
  }) => {
    test.skip(
      process.env.PORTFOLIO_E2E_PROOF_SCENARIO !== 'income-activity',
      'This deterministic booked-cash review runs only in its owned proof scenario.',
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    const session = await openIncomePortfolio(page, request);
    expect(session).toEqual({ portfolioId: 'PB_SG_GLOBAL_BAL_001', available: true });

    await expect(page.getByText('Booked records only')).toBeVisible();
    const incomeSummary = page.getByLabel('Booked income summary');
    await expect(incomeSummary.getByText('12,000 USD', { exact: true })).toBeVisible();
    await expect(incomeSummary.getByText('1,500 USD', { exact: true })).toBeVisible();
    await expect(incomeSummary.getByText('10,500 USD', { exact: true })).toBeVisible();
    await expect(incomeSummary.getByText('26,500 USD', { exact: true })).toBeVisible();

    const incomeTable = page.getByRole('table', { name: 'Booked income by type' });
    await expect(incomeTable.getByText('Dividend income', { exact: true })).toBeVisible();
    await expect(incomeTable.getByText('Interest income', { exact: true })).toBeVisible();

    const movementSummary = page.getByLabel('Booked cash movement summary');
    await expect(movementSummary.getByText('100,000 USD', { exact: true })).toBeVisible();
    await expect(movementSummary.getByText('26,500 USD', { exact: true })).toBeVisible();
    await expect(movementSummary.getByText('73,500 USD', { exact: true })).toBeVisible();
    await expect(movementSummary.getByText('6.00%', { exact: true })).toBeVisible();

    const movementTable = page.getByRole('table', { name: 'Booked cash movements by type' });
    await expect(movementTable.getByText('Subscriptions and transfers in')).toBeVisible();
    await expect(movementTable.getByText('Withdrawals and transfers out')).toBeVisible();
    await expect(movementTable.getByText('-25,000 USD', { exact: true })).toBeVisible();
    await expect(movementTable.getByText('Other activity · Corporate Actions')).toBeVisible();
    await expect(movementTable.getByText('Excluded from net')).toBeVisible();
    await expect(page.getByText('Classification review')).toBeVisible();
    for (const sourceCode of ['INFLOWS', 'OUTFLOWS', 'FEES', 'TAXES', 'CORPORATE_ACTIONS']) {
      await expect(page.getByText(sourceCode, { exact: true })).toHaveCount(0);
    }

    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: resolve(evidenceDirectory, 'diagnostic-income-activity-booked-cash.png'),
        fullPage: true,
      });
    }

    const viewportEvidence = [];
    for (const viewport of [
      { width: 1440, height: 1100, expectedMetricColumns: 4 },
      { width: 1024, height: 1000, expectedMetricColumns: 4 },
      { width: 768, height: 1024, expectedMetricColumns: 3 },
      { width: 519, height: 900, expectedMetricColumns: 2 },
    ]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('heading', { name: /^Income & Activity$/i })).toBeVisible();
      await expect(page.getByRole('table', { name: 'Booked income by type' })).toBeVisible();
      await expect(page.getByRole('table', { name: 'Booked cash movements by type' })).toBeVisible();
      for (const metricStrip of [incomeSummary, movementSummary]) {
        const metricLayout = await measureGrid(metricStrip);
        expect(metricLayout.childCount).toBe(4);
        expect(metricLayout.columns.split(' ').filter(Boolean)).toHaveLength(
          viewport.expectedMetricColumns,
        );
        expect(metricLayout.childWidths.every((width) => width > 100)).toBe(true);
      }
      const measurements = await measureViewportEvidence(page);
      expect(measurements.document.scrollWidth).toBeLessThanOrEqual(
        measurements.document.clientWidth + 1,
      );

      let keyboardEvidence = null;
      if (viewport.width === 519) {
        const focusableDomOrder = await collectFocusableDomOrder(page.locator('body'));
        expect(focusableDomOrder.length).toBeGreaterThan(8);
        expect(focusableDomOrder.every((element) => element.name.length > 0)).toBe(true);

        keyboardEvidence = await traverseSequentialKeyboardFocus(page, focusableDomOrder.length);
        // Chromium includes horizontally scrollable table regions in sequential focus even though
        // they are not matched by the explicit focusable-selector inventory.
        expect(keyboardEvidence.length).toBeGreaterThanOrEqual(focusableDomOrder.length);
        expect(keyboardEvidence.every((element) => element.name.length > 0)).toBe(true);
        expect(keyboardEvidence.every((element) => element.focusVisible)).toBe(true);
        expect(keyboardEvidence.every((element) => element.notObscured)).toBe(true);
        expect(keyboardEvidence.every((element) => element.withinViewport)).toBe(true);
      }

      viewportEvidence.push({ viewport, measurements, keyboardEvidence });
    }

    await page.setViewportSize({ width: 1440, height: 1100 });
    if (evidenceDirectory) {
      await writeFile(
        resolve(evidenceDirectory, 'income-activity-proof.json'),
        `${JSON.stringify(
          {
            portfolioId: session.portfolioId,
            reportingCurrency: 'USD',
            grossIncome: 12_000,
            netIncome: 10_500,
            classifiedNetMovement: 73_500,
            excludedMovement: 2_000,
            rawSourceCodesVisible: false,
            viewports: viewportEvidence,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }
  });

  test("cashflow route keeps projection identity and movement semantics explicit", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1280, height: 1000 });
    const session = await openCashflowPortfolio(page, request);
    test.skip(
      !session.available,
      "Portfolio cashflow upstream unavailable in standalone smoke environment.",
    );

    await expect(
      page.getByRole("heading", { name: /^Projected cash movement$/i }),
    ).toBeVisible();
    await expect(
      page.getByLabel("Projected cash movement summary"),
    ).toBeVisible();
    await expect(page.getByLabel("Projected cashflow summary")).toHaveCount(0);
    await expect(
      page.getByRole("img", {
        name: /Projected cash movement chart in USD; bars show dated movement and the line shows cumulative movement/i,
      }),
    ).toBeVisible();
    await expect(page.getByRole("radio", { name: "10D" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByRole("radio", { name: "30D" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "90D" })).toBeVisible();
    await expect(page.getByLabel("Projection scope")).toContainText(
      "Projection as of",
    );
    await expect(page.getByLabel("Projection scope")).toContainText(
      "Projection basis",
    );
    await expect(page.getByText("Ending Cumulative")).toHaveCount(0);
    await expect(page.getByText(/liquidity forecast/i)).toHaveCount(0);

    await page.getByRole("radio", { name: "10D" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("radio", { name: "30D" })).toBeFocused();
    await expect(
      page.getByText(
        /30-day projection(?: returned for a 30-day request)? · /i,
      ),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("radio", { name: "30D" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(page.getByText(/10-day projection · /i)).toHaveCount(0);
    const projectionEvidence = page
      .locator(".portfolio-record-source-item")
      .filter({ hasText: "Projection Basis" });
    await expect(projectionEvidence).toContainText("30 days");
    await expect(projectionEvidence).toContainText("2 inflows and 1 outflow");
    await expect(projectionEvidence).not.toContainText("10 days");
    await expect(
      page.getByText("Cash Position", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Reporting Snapshot", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Cash movement chart key")).toContainText(
      "Bars: dated movementLine: cumulative movement",
    );

    const projectionHorizon = page.getByRole("radiogroup", {
      name: "Projection horizon",
    });
    const movementSummary = page.getByLabel("Projected cash movement summary");
    const scrollableSchedule = page.getByRole("region", {
      name: "Projected cash movement schedule, horizontally scrollable",
    });
    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    const viewportEvidence: Array<{
      width: number;
      metricColumns: number;
      pageOverflow: number;
      scheduleOverflow: number;
      scheduleFocusable: boolean;
    }> = [];
    for (const width of [1440, 1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await projectionHorizon.scrollIntoViewIfNeeded();
      await expect(projectionHorizon).toBeVisible();
      await expect(
        page.getByLabel("Projected cash movement summary"),
      ).toBeVisible();
      await expect(
        page.getByRole("table", { name: "Projected cash movement schedule" }),
      ).toBeVisible();
      const layout = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(layout.scrollWidth - layout.clientWidth).toBeLessThanOrEqual(2);
      const metricColumns = await movementSummary.evaluate(
        (element) =>
          getComputedStyle(element)
            .gridTemplateColumns.split(" ")
            .filter(Boolean).length,
      );
      expect(metricColumns).toBe(width === 1440 ? 4 : 2);
      await scrollableSchedule.focus();
      await expect(scrollableSchedule).toBeFocused();
      const scheduleLayout = await scrollableSchedule.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));
      if (width === 519) {
        expect(scheduleLayout.scrollWidth).toBeGreaterThan(
          scheduleLayout.clientWidth,
        );
        await expect(
          page.getByText(
            "Swipe, or focus the schedule and use the arrow keys, to compare every column.",
          ),
        ).toBeVisible();
      }
      viewportEvidence.push({
        width,
        metricColumns,
        pageOverflow: layout.scrollWidth - layout.clientWidth,
        scheduleOverflow:
          scheduleLayout.scrollWidth - scheduleLayout.clientWidth,
        scheduleFocusable: await scrollableSchedule.evaluate(
          (element) => document.activeElement === element,
        ),
      });
      if (evidenceDirectory && (width === 1440 || width === 519)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `${evidenceDirectory}/cashflow-${width}px.png`,
          fullPage: true,
        });
      }
    }
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await writeFile(
        resolve(evidenceDirectory, "cashflow-proof.json"),
        `${JSON.stringify(
          {
            portfolioId: session.portfolioId,
            selectedHorizonDays: 30,
            projectionPointCount: 3,
            inflowCount: 2,
            outflowCount: 1,
            evidenceRailHorizonDays: 30,
            chartSemantics: {
              bars: "dated movement",
              line: "cumulative movement",
            },
            viewportEvidence,
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
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

  test('positions keep source status truthful across screen, export, and evidence', async ({ page, request }) => {
    test.skip(
      process.env.PORTFOLIO_E2E_PROOF_SCENARIO !== 'positions-status',
      'This deterministic source-status matrix runs only in its owned proof scenario.',
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    const session = await openPositionsPortfolio(page, request);
    expect(session).toEqual({ portfolioId: 'PB_SG_GLOBAL_BAL_001', available: true });

    const positionStates = page.locator('.portfolio-position-status');
    await expect(positionStates).toHaveCount(5);
    const displayedStates = await positionStates.allTextContents();
    expect(displayedStates).toEqual([
      'Current',
      'Review required',
      'Review required',
      'Not reported',
      'Not applicable',
    ]);
    await expect(page.getByText('STALE_PRICE', { exact: true })).toHaveCount(0);
    await expect(page.getByText('FUTURE_SOURCE_STATE', { exact: true })).toHaveCount(0);

    const readinessCard = page
      .locator('.portfolio-record-evidence-card')
      .filter({ hasText: 'Data Readiness' });
    await expect(readinessCard.getByText('Partial', { exact: true })).toBeVisible();
    const statusEvidence = page
      .locator('.portfolio-record-source-item')
      .filter({ hasText: 'Position Status' });
    await expect(statusEvidence.getByText('Review required', { exact: true })).toBeVisible();
    await expect(
      statusEvidence.getByText(
        '2 positions require review; 1 position status not reported; 1 source key stale; 1 position status current',
        { exact: true },
      ),
    ).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export holdings' }).click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    const csv = await readFile(downloadedPath!, 'utf8');
    expect(csv).toContain('Current');
    expect(csv).toContain('Review required');
    expect(csv).toContain('Not reported');
    expect(csv).toContain('Not applicable');
    expect(csv).not.toContain('STALE_PRICE');
    expect(csv).not.toContain('FUTURE_SOURCE_STATE');

    for (const width of [1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.getByRole('heading', { name: /^Positions$/i })).toBeVisible();
      await expect(page.getByText('Review required', { exact: true }).first()).toBeVisible();
      const pageWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(pageWidth.scrollWidth - pageWidth.clientWidth).toBeLessThanOrEqual(2);
    }

    await page.setViewportSize({ width: 1440, height: 1100 });

    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: resolve(evidenceDirectory, 'diagnostic-positions-status-matrix.png'),
        fullPage: true,
      });
      await writeFile(
        resolve(evidenceDirectory, 'positions-status-proof.json'),
        `${JSON.stringify(
          {
            portfolioId: session.portfolioId,
            overallReadiness: 'Partial',
            displayedStates,
            csvStates: ['Current', 'Review required', 'Not reported', 'Not applicable'],
            rawSourceCodesVisible: false,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }
  });

  test('transactions keep settlement applicability truthful across screen, detail, export, and evidence', async ({ page, request }) => {
    test.skip(
      process.env.PORTFOLIO_E2E_PROOF_SCENARIO !== 'transactions-status',
      'This deterministic settlement-applicability matrix runs only in its owned proof scenario.',
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    const session = await openTransactionsPortfolio(page, request);
    expect(session).toEqual({ portfolioId: 'PB_SG_GLOBAL_BAL_001', available: true });

    const settlementStates = page.locator('.portfolio-position-status');
    await expect(settlementStates).toHaveCount(4);
    const displayedStates = await settlementStates.allTextContents();
    expect(displayedStates).toEqual([
      'Settled',
      'Review required',
      'Not reported',
      'Not applicable',
    ]);
    await expect(page.getByText('FUTURE_SOURCE_STATE', { exact: true })).toHaveCount(0);
    await expect(
      page.getByText(
        '1 settlement status requires review; 1 settlement status not reported; 1 settlement status settled; 1 ledger entry not applicable',
        { exact: true },
      ).first(),
    ).toBeVisible();

    const settlementEvidence = page
      .locator('.portfolio-record-source-item')
      .filter({ hasText: 'Settlement' });
    await expect(settlementEvidence.getByText('Review required', { exact: true })).toBeVisible();
    await expect(
      settlementEvidence.getByText(
        '1 settlement status requires review; 1 settlement status not reported; 1 settlement status settled; 1 ledger entry not applicable',
        { exact: true },
      ),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Review transaction TX_NOT_REPORTED' }).click();
    const drawer = page.locator('.portfolio-detail-drawer');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByText('Settlement status', { exact: true }).first()).toBeVisible();
    await expect(drawer.getByText('Not reported', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /Close/i }).first().click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export transactions' }).click();
    const download = await downloadPromise;
    const downloadedPath = await download.path();
    expect(downloadedPath).not.toBeNull();
    const csv = await readFile(downloadedPath!, 'utf8');
    expect(csv).toContain('Settlement Status');
    for (const state of displayedStates) {
      expect(csv).toContain(state);
    }
    expect(csv).not.toContain('FUTURE_SOURCE_STATE');

    for (const width of [1024, 768, 519]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.getByRole('heading', { name: /^Transactions$/i })).toBeVisible();
      await expect(page.getByText('Review required', { exact: true }).first()).toBeVisible();
      const pageWidth = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));
      expect(pageWidth.scrollWidth - pageWidth.clientWidth).toBeLessThanOrEqual(2);
    }

    await page.setViewportSize({ width: 1440, height: 1100 });
    const evidenceDirectory = process.env.PORTFOLIO_E2E_EVIDENCE_DIR;
    if (evidenceDirectory) {
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({
        path: resolve(evidenceDirectory, 'diagnostic-transactions-settlement-matrix.png'),
        fullPage: true,
      });
      await writeFile(
        resolve(evidenceDirectory, 'transactions-settlement-proof.json'),
        `${JSON.stringify(
          {
            portfolioId: session.portfolioId,
            displayedStates,
            settlementEvidence: 'Review required',
            rawSourceCodesVisible: false,
            csvUsesBusinessStates: true,
          },
          null,
          2,
        )}\n`,
        'utf8',
      );
    }
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
    await expect(page.getByText(/settlement status/i).first()).toBeVisible();
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
