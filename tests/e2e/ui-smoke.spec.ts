import { test, expect, type Page } from '@playwright/test';

function getPortfolioReviewPageHeading(page: Page) {
  return page.getByRole('heading', {
    level: 1,
    name: 'Portfolio Review',
    exact: true,
  });
}

function getPortfolioFoundationPageHeading(page: Page) {
  return page.getByRole('heading', {
    name: /^Portfolio$|^Portfolio Review$|^Portfolio context unavailable$/i,
  });
}

function getPortfolioUnavailableHeading(page: Page) {
  return page.getByRole('heading', {
    name: /^Portfolio unavailable$|^Portfolio context unavailable$/i,
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('UI smoke checks', () => {
  const mobileOverflowChecks = [
    {
      path: '/portfolios',
      assertReady: async (page: Page) => {
        await expect(getPortfolioFoundationPageHeading(page)).toBeVisible({ timeout: 60000 });
      },
    },
    {
      path: '/intake',
      assertReady: async (page: Page) => {
        await expect(
          page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })
        ).toBeVisible({ timeout: 60000 });
      },
    },
    {
      path: '/portfolio?portfolioId=PB_SG_GLOBAL_BAL_001',
      assertReady: async (page: Page) => {
        const unavailableHeading = getPortfolioUnavailableHeading(page);
        const unavailableVisible = await unavailableHeading.isVisible().catch(() => false);
        if (unavailableVisible) {
          await expect(unavailableHeading).toBeVisible({ timeout: 60000 });
          return;
        }

        await expect(getPortfolioReviewPageHeading(page)).toBeVisible({
          timeout: 60000,
        });
      },
    },
  ] as const;

  test('portfolio page identity remains unique beside a ready decision heading', async ({ page }) => {
    await page.setContent(`
      <main>
        <h1>Portfolio Review</h1>
        <section aria-label="Portfolio decision review">
          <h3>Portfolio review is ready</h3>
        </section>
      </main>
    `);

    await expect(page.getByRole('heading')).toHaveCount(2);
    await expect(getPortfolioReviewPageHeading(page)).toHaveCount(1);
    await expect(getPortfolioReviewPageHeading(page)).toBeVisible();
  });

  test('portfolio foundation page renders core sections', async ({ page }) => {
    await page.goto('/portfolios', { waitUntil: 'domcontentloaded' });
    await expect(getPortfolioFoundationPageHeading(page)).toBeVisible();
  });

  test('legacy Suite entry follows canonical Home without fabricated business state', async ({ page }) => {
    for (const viewport of [
      { width: 1366, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/suite', { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveURL(/\/portfolio$/);
      await expect(getPortfolioFoundationPageHeading(page)).toBeVisible({ timeout: 60000 });
      await expect(page.getByRole('heading', { name: 'Command Center', exact: true })).toHaveCount(0);
      await expect(page.getByText('Apex Family Office', { exact: true })).toHaveCount(0);
      await expect(page.getByText('lotus-core Policy Diagnostics', { exact: true })).toHaveCount(0);
      await expect(page.getByText('tenant.default.consumers.UI', { exact: true })).toHaveCount(0);

      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(hasOverflow, `horizontal overflow detected after /suite at ${viewport.width}px`).toBeFalsy();
    }
  });

  test('portfolio intake tabs are reachable and render expected workspaces', async ({ page }) => {
    await page.goto('/intake', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Portfolio Intake Operations Console/i })).toBeVisible();
    const operationTabs = page.getByRole('tablist', { name: /Intake operation/i });

    await operationTabs.getByRole('tab', { name: /^Create Portfolio$/i }).click();
    await expect(page.getByRole('heading', { name: /Create Portfolio Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Positions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Positions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Transactions$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Transactions Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Instruments$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Instruments Workspace/i })).toBeVisible();

    await operationTabs.getByRole('tab', { name: /^Add Market Data$/i }).click();
    await expect(page.getByRole('heading', { name: /Add Market Data Workspace/i })).toBeVisible();
  });

  test('workbench page renders shell and message', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/workbench/DEMO_ADV_USD_001', { waitUntil: 'commit', timeout: 60000 });
    await expect(
      page.getByRole('heading', { name: /^Manage Overview$|^Manage Workspace$/i })
    ).toBeVisible({ timeout: 60000 });
  });

  test('portfolio review navigation prioritizes the selected workspace when stacked', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 519, height: 900 });
    await page.goto('/income?portfolioId=PB_SG_GLOBAL_BAL_001', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });

    const currentView = page.getByRole('button', { name: /Current view Income/i });
    const navigation = page.getByRole('navigation', { name: 'Workbench screen navigation' });
    const workspaceHeading = page.getByRole('heading', { name: /^Income & Activity$/i });

    await expect(currentView).toBeVisible({ timeout: 60000 });
    await expect(currentView).toHaveAttribute('aria-expanded', 'false');
    await expect(navigation).toBeHidden();
    await expect(workspaceHeading).toBeVisible();
    const headingBox = await workspaceHeading.boundingBox();
    expect(headingBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(900);

    await currentView.click();
    await expect(navigation).toBeVisible();
    const activeIncomeLink = navigation.getByRole('link', { name: /Income Income and activity/i });
    await expect(activeIncomeLink).toHaveAttribute('aria-current', 'page');
    await activeIncomeLink.focus();
    await activeIncomeLink.press('Escape');
    await expect(navigation).toBeHidden();
    await expect(currentView).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(currentView).toBeVisible();
    await expect(navigation).toBeHidden();

    await page.setViewportSize({ width: 1366, height: 900 });
    await expect(currentView).toBeHidden();
    await expect(navigation).toBeVisible();
  });

  test('mobile layout has no horizontal overflow on key pages', async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const { path, assertReady } of mobileOverflowChecks) {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await assertReady(page);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(hasOverflow, `horizontal overflow detected on ${path}`).toBeFalsy();
    }
  });
});
